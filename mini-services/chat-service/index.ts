/**
 * HBOS Chat Socket.io Service
 * --------------------------------
 * Realtime chat microservice for the HBOS Next.js project.
 *
 * Port: 3001 (hardcoded — matches Caddy gateway XTransformPort rule)
 * Path: "/" (REQUIRED — Caddy routes by Host/path, default socket.io path)
 *
 * Frontend connects with:
 *   io("/?XTransformPort=3001", { withCredentials: true })
 *
 * Auth: read `hbos_session` cookie from handshake → look up Session table →
 *       attach socket.data.userId / socket.data.user.
 *       Alternative explicit `auth` event also supported.
 */

import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { PrismaClient, Session, User } from '@prisma/client'

// ---------------------------------------------------------------------------
// Prisma client (separate Bun process → its own client instance)
// ---------------------------------------------------------------------------
const DATABASE_URL = process.env.DATABASE_URL || 'file:/home/z/my-project/db/custom.db'
process.env.DATABASE_URL = DATABASE_URL

const db = new PrismaClient({
  log: ['error', 'warn'],
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SocketUser {
  id: string
  name: string
  role: string
  avatar: string | null
}

interface SendMessagePayload {
  roomId: string
  content: string
  type?: string // TEXT | IMAGE | FILE | SYSTEM | VOICE  (defaults to TEXT)
  replyToId?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
}

interface OnlineMap {
  // roomId -> Set<userId>
  [roomId: string]: Set<string>
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------
// Per-room online user tracking.
const onlineByRoom: OnlineMap = {}
// Per-socket: which rooms this socket has joined (so we can broadcast offline on disconnect)
const socketRooms: Map<string, Set<string>> = new Map() // socket.id -> Set<roomId>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse the `hbos_session` cookie value out of a raw Cookie header string. */
function extractSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';')
  for (const raw of parts) {
    const [k, ...rest] = raw.split('=')
    if (k && k.trim() === 'hbos_session') {
      return decodeURIComponent(rest.join('=').trim())
    }
  }
  return null
}

/** Validate a session token against the DB. Returns (user|null). */
async function resolveUserFromToken(token: string): Promise<SocketUser | null> {
  if (!token) return null
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) return null
  if (!session.user.isActive) return null
  return {
    id: session.user.id,
    name: session.user.name,
    role: session.user.role,
    avatar: session.user.avatar,
  }
}

/** Attach auth state to a socket. Returns true on success. */
async function authenticateSocket(socket: Socket, user: SocketUser): Promise<boolean> {
  socket.data.userId = user.id
  socket.data.user = user
  return true
}

/** Mark user as online in a room (idempotent). */
function addOnline(roomId: string, userId: string) {
  if (!onlineByRoom[roomId]) onlineByRoom[roomId] = new Set()
  onlineByRoom[roomId].add(userId)
}

/** Mark user as offline in a room. */
function removeOnline(roomId: string, userId: string) {
  const set = onlineByRoom[roomId]
  if (!set) return
  set.delete(userId)
  if (set.size === 0) delete onlineByRoom[roomId]
}

/** Get list of online userIds in a room. */
function getOnline(roomId: string): string[] {
  const set = onlineByRoom[roomId]
  return set ? Array.from(set) : []
}

/** Verify that a user is a member of a chat room. */
async function isMember(roomId: string, userId: string): Promise<boolean> {
  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { id: true },
  })
  return !!member
}

// ---------------------------------------------------------------------------
// HTTP + Socket.io server
// ---------------------------------------------------------------------------
const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path — Caddy uses it to route to this port.
  path: '/',
  cors: {
    origin: true, // reflect request origin → allows credentials (cookies)
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

const PORT = 3001

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------
io.on('connection', (socket: Socket) => {
  // ---- Handshake auth (cookie-based) ----
  const cookieHeader = socket.handshake.headers.cookie as string | undefined
  const token = extractSessionToken(cookieHeader)

  // Async auth kick-off (don't block event loop)
  ;(async () => {
    if (!token) {
      // No cookie → wait for client to emit `auth` event with explicit token.
      // Give them a short window; disconnect if not authed.
      socket.emit('auth-required', { message: 'Send `auth` event with a session token.' })
      const authTimeout = setTimeout(() => {
        if (!socket.data.userId) {
          console.log('[chat] disconnecting unauthenticated socket:', socket.id)
          socket.disconnect()
        }
      }, 10000)
      socket.data._authTimeout = authTimeout
      return
    }

    const user = await resolveUserFromToken(token)
    if (!user) {
      console.log('[chat] invalid session cookie, disconnecting:', socket.id)
      socket.emit('auth-error', { message: 'Invalid or expired session.' })
      socket.disconnect()
      return
    }
    await authenticateSocket(socket, user)
    console.log(`[chat] user connected: ${user.name} (${user.id})`)
    socket.emit('auth-ok', { user })
  })()

  // -----------------------------------------------------------------------
  // Explicit auth event (alternative to cookie)
  // -----------------------------------------------------------------------
  socket.on('auth', async (payload: { token: string }, ack?: (r: any) => void) => {
    try {
      const user = await resolveUserFromToken(payload?.token || '')
      if (!user) {
        if (ack) ack({ ok: false, error: 'invalid-token' })
        socket.emit('auth-error', { message: 'Invalid or expired session.' })
        return
      }
      await authenticateSocket(socket, user)
      if (socket.data._authTimeout) {
        clearTimeout(socket.data._authTimeout)
        socket.data._authTimeout = null
      }
      console.log(`[chat] user authenticated via auth event: ${user.name} (${user.id})`)
      socket.emit('auth-ok', { user })
      if (ack) ack({ ok: true, user })
    } catch (err) {
      console.error('[chat] auth error:', err)
      if (ack) ack({ ok: false, error: 'server-error' })
    }
  })

  // -----------------------------------------------------------------------
  // join-room
  // -----------------------------------------------------------------------
  socket.on('join-room', async (payload: { roomId: string }, ack?: (r: any) => void) => {
    try {
      const userId: string | undefined = socket.data.userId
      const user: SocketUser | undefined = socket.data.user
      if (!userId || !user) {
        if (ack) ack({ ok: false, error: 'not-authenticated' })
        return
      }
      const { roomId } = payload || {}
      if (!roomId) {
        if (ack) ack({ ok: false, error: 'missing-roomId' })
        return
      }
      const ok = await isMember(roomId, userId)
      if (!ok) {
        if (ack) ack({ ok: false, error: 'not-a-member' })
        return
      }
      socket.join(roomId)
      // Track per-socket room membership
      if (!socketRooms.has(socket.id)) socketRooms.set(socket.id, new Set())
      socketRooms.get(socket.id)!.add(roomId)
      // Online tracking
      const wasOnline = getOnline(roomId).includes(userId)
      addOnline(roomId, userId)
      // Notify
      socket.emit('room-joined', { roomId, userId })
      // Broadcast user-online to others only if newly online
      if (!wasOnline) {
        socket.to(roomId).emit('user-online', { roomId, userId, name: user.name })
      }
      // Send current online roster to the joining socket
      socket.emit('online-users', { roomId, userIds: getOnline(roomId) })
      if (ack) ack({ ok: true, online: getOnline(roomId) })
      console.log(`[chat] ${user.name} joined room ${roomId}`)
    } catch (err) {
      console.error('[chat] join-room error:', err)
      if (ack) ack({ ok: false, error: 'server-error' })
    }
  })

  // -----------------------------------------------------------------------
  // leave-room
  // -----------------------------------------------------------------------
  socket.on('leave-room', (payload: { roomId: string }, ack?: (r: any) => void) => {
    try {
      const userId: string | undefined = socket.data.userId
      const user: SocketUser | undefined = socket.data.user
      const { roomId } = payload || {}
      if (!roomId) {
        if (ack) ack({ ok: false, error: 'missing-roomId' })
        return
      }
      socket.leave(roomId)
      socketRooms.get(socket.id)?.delete(roomId)
      // Only mark offline if this user has no other socket in the room
      const stillOnline = Array.from(io.sockets.adapter.rooms.get(roomId) || []).some(
        (sid) => io.sockets.sockets.get(sid)?.data?.userId === userId
      )
      if (!stillOnline) {
        removeOnline(roomId, userId as string)
        socket.to(roomId).emit('user-offline', { roomId, userId })
      }
      if (ack) ack({ ok: true })
      if (user) console.log(`[chat] ${user.name} left room ${roomId}`)
    } catch (err) {
      console.error('[chat] leave-room error:', err)
      if (ack) ack({ ok: false, error: 'server-error' })
    }
  })

  // -----------------------------------------------------------------------
  // send-message
  // -----------------------------------------------------------------------
  socket.on(
    'send-message',
    async (payload: SendMessagePayload, ack?: (r: any) => void) => {
      try {
        const userId: string | undefined = socket.data.userId
        const user: SocketUser | undefined = socket.data.user
        if (!userId || !user) {
          if (ack) ack({ ok: false, error: 'not-authenticated' })
          return
        }
        const { roomId, content } = payload || {}
        if (!roomId || !content) {
          if (ack) ack({ ok: false, error: 'missing-fields' })
          return
        }
        const ok = await isMember(roomId, userId)
        if (!ok) {
          if (ack) ack({ ok: false, error: 'not-a-member' })
          return
        }
        const type = payload.type || 'TEXT'
        const msg = await db.chatMessage.create({
          data: {
            roomId,
            userId,
            content,
            type,
            fileName: payload.fileName || null,
            fileSize: payload.fileSize || null,
            mimeType: payload.mimeType || null,
            replyToId: payload.replyToId || null,
          },
          include: {
            user: { select: { id: true, name: true, role: true, avatar: true } },
          },
        })
        // Broadcast to everyone in the room (sender included, for confirmation)
        io.to(roomId).emit('message-received', msg)
        if (ack) ack({ ok: true, message: msg })
        console.log(
          `[chat] message ${msg.id} in ${roomId} from ${user.name}: ${content.slice(0, 60)}`
        )
      } catch (err) {
        console.error('[chat] send-message error:', err)
        if (ack) ack({ ok: false, error: 'server-error' })
      }
    }
  )

  // -----------------------------------------------------------------------
  // typing
  // -----------------------------------------------------------------------
  socket.on('typing', (payload: { roomId: string; isTyping: boolean }) => {
    const userId: string | undefined = socket.data.userId
    const user: SocketUser | undefined = socket.data.user
    if (!userId || !user) return
    const { roomId, isTyping } = payload || {}
    if (!roomId) return
    // Broadcast to everyone ELSE in the room (not the sender)
    socket.to(roomId).emit('user-typing', {
      roomId,
      userId,
      name: user.name,
      isTyping: !!isTyping,
    })
  })

  // -----------------------------------------------------------------------
  // mark-read
  // -----------------------------------------------------------------------
  socket.on('mark-read', async (payload: { roomId: string }, ack?: (r: any) => void) => {
    try {
      const userId: string | undefined = socket.data.userId
      if (!userId) {
        if (ack) ack({ ok: false, error: 'not-authenticated' })
        return
      }
      const { roomId } = payload || {}
      if (!roomId) {
        if (ack) ack({ ok: false, error: 'missing-roomId' })
        return
      }
      await db.chatMember.updateMany({
        where: { roomId, userId },
        data: { lastReadAt: new Date() },
      })
      io.to(roomId).emit('read-receipt', { roomId, userId })
      if (ack) ack({ ok: true })
    } catch (err) {
      console.error('[chat] mark-read error:', err)
      if (ack) ack({ ok: false, error: 'server-error' })
    }
  })

  // -----------------------------------------------------------------------
  // edit-message
  // -----------------------------------------------------------------------
  socket.on(
    'edit-message',
    async (payload: { messageId: string; content: string }, ack?: (r: any) => void) => {
      try {
        const userId: string | undefined = socket.data.userId
        if (!userId) {
          if (ack) ack({ ok: false, error: 'not-authenticated' })
          return
        }
        const { messageId, content } = payload || {}
        if (!messageId || !content) {
          if (ack) ack({ ok: false, error: 'missing-fields' })
          return
        }
        const existing = await db.chatMessage.findUnique({ where: { id: messageId } })
        if (!existing) {
          if (ack) ack({ ok: false, error: 'not-found' })
          return
        }
        if (existing.userId !== userId) {
          if (ack) ack({ ok: false, error: 'not-owner' })
          return
        }
        const updated = await db.chatMessage.update({
          where: { id: messageId },
          data: { content, editedAt: new Date() },
        })
        io.to(existing.roomId).emit('message-edited', {
          messageId,
          roomId: existing.roomId,
          content,
          editedAt: updated.editedAt,
        })
        if (ack) ack({ ok: true, message: updated })
      } catch (err) {
        console.error('[chat] edit-message error:', err)
        if (ack) ack({ ok: false, error: 'server-error' })
      }
    }
  )

  // -----------------------------------------------------------------------
  // delete-message
  // -----------------------------------------------------------------------
  socket.on('delete-message', async (payload: { messageId: string }, ack?: (r: any) => void) => {
    try {
      const userId: string | undefined = socket.data.userId
      if (!userId) {
        if (ack) ack({ ok: false, error: 'not-authenticated' })
        return
      }
      const { messageId } = payload || {}
      if (!messageId) {
        if (ack) ack({ ok: false, error: 'missing-fields' })
        return
      }
      const existing = await db.chatMessage.findUnique({ where: { id: messageId } })
      if (!existing) {
        if (ack) ack({ ok: false, error: 'not-found' })
        return
      }
      if (existing.userId !== userId) {
        if (ack) ack({ ok: false, error: 'not-owner' })
        return
      }
      await db.chatMessage.update({
        where: { id: messageId },
        data: { deletedAt: new Date() },
      })
      io.to(existing.roomId).emit('message-deleted', {
        messageId,
        roomId: existing.roomId,
      })
      if (ack) ack({ ok: true })
    } catch (err) {
      console.error('[chat] delete-message error:', err)
      if (ack) ack({ ok: false, error: 'server-error' })
    }
  })

  // -----------------------------------------------------------------------
  // get-online-users
  // -----------------------------------------------------------------------
  socket.on('get-online-users', (payload: { roomId: string }, ack?: (r: any) => void) => {
    const { roomId } = payload || {}
    if (!roomId) {
      if (ack) ack({ ok: false, error: 'missing-roomId' })
      return
    }
    const userIds = getOnline(roomId)
    socket.emit('online-users', { roomId, userIds })
    if (ack) ack({ ok: true, userIds })
  })

  // -----------------------------------------------------------------------
  // disconnect
  // -----------------------------------------------------------------------
  socket.on('disconnect', () => {
    const user: SocketUser | undefined = socket.data.user
    const userId: string | undefined = socket.data.userId
    if (socket.data._authTimeout) clearTimeout(socket.data._authTimeout)

    const rooms = socketRooms.get(socket.id)
    if (rooms && userId) {
      for (const roomId of rooms) {
        // Check if user still has any other socket in this room
        const stillOnline = Array.from(io.sockets.adapter.rooms.get(roomId) || []).some(
          (sid) => sid !== socket.id && io.sockets.sockets.get(sid)?.data?.userId === userId
        )
        if (!stillOnline) {
          removeOnline(roomId, userId)
          socket.to(roomId).emit('user-offline', { roomId, userId })
        }
      }
    }
    socketRooms.delete(socket.id)

    if (user) {
      console.log(`[chat] disconnected: ${user.name}`)
    } else {
      console.log(`[chat] disconnected: ${socket.id} (unauthenticated)`)
    }
  })

  socket.on('error', (err: Error) => {
    console.error(`[chat] socket error (${socket.id}):`, err.message)
  })
})

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`Chat socket.io service running on port ${PORT}`)
  console.log(`  → path: /   (Caddy gateway will forward /?XTransformPort=${PORT} to here)`)
  console.log(`  → DATABASE_URL: ${DATABASE_URL}`)
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal: string) {
  console.log(`[chat] received ${signal}, shutting down...`)
  io.close(() => {
    httpServer.close(() => {
      db.$disconnect()
        .catch(() => {})
        .finally(() => {
          console.log('[chat] closed')
          process.exit(0)
        })
    })
  })
  // Force exit after 5s if graceful close hangs
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
