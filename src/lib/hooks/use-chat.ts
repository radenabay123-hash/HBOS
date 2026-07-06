"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { api } from "@/lib/api-client";
import type { SafeUser } from "@/lib/auth";

export type ChatRoom = {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  avatar: string | null;
  description?: string | null;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    name: string;
    userRole: string;
    avatar: string | null;
    isActive: boolean;
    muted?: boolean;
    position?: string | null;
    phone?: string | null;
    joinedAt?: string;
  }>;
  lastMessage: {
    id: string;
    content: string;
    type: string;
    fileName?: string | null;
    senderName: string;
    senderId: string;
    createdAt: string;
    deletedAt: string | null;
  } | null;
  unread: number;
  lastReadAt: string;
  muted: boolean;
  updatedAt: string;
  createdAt: string;
  isMember?: boolean;
  alreadyExisted?: boolean;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userRole: string;
  userAvatar: string | null;
  content: string;
  type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM" | "VOICE";
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  replyToId?: string | null;
  replyTo: {
    id: string;
    content: string;
    type: string;
    userName: string;
    fileName?: string | null;
  } | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  isOwn: boolean;
};

type TypingState = Record<string, { userId: string; name: string; timestamp: number }[]>;

/**
 * useChat — React hook for realtime chat over socket.io (port 3001 via gateway)
 *
 * - Auto-connects socket on mount using session cookie auth
 * - Joins all rooms the user is a member of
 * - Receives realtime `message-received`, `user-typing`, `read-receipt`,
 *   `message-edited`, `message-deleted`, `online-users` events
 * - Falls back to HTTP API for initial load & when socket is unavailable
 */
export function useChat(user: SafeUser) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string[]>>({}); // roomId → userIds
  const [typing, setTyping] = useState<TypingState>({}); // roomId → typing users
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const activeRoomIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => { activeRoomIdRef.current = activeRoomId; }, [activeRoomId]);

  // ===================== SOCKET CONNECTION =====================
  useEffect(() => {
    if (!user) return;

    // Connect via gateway with XTransformPort.
    // CRITICAL: path must match server's path ("/") — default "/socket.io" won't work.
    // Polling-only through Caddy gateway (WebSocket upgrade may not proxy correctly with query-based routing).
    const socket = io("/?XTransformPort=3001", {
      path: "/",
      withCredentials: true,
      transports: ["polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError(null);
      // Re-join all rooms after reconnect
      for (const roomId of joinedRoomsRef.current) {
        socket.emit("join-room", { roomId });
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (err: any) => {
      setConnected(false);
      setError(`Koneksi socket gagal: ${err?.message || "unknown"}`);
    });

    // ===================== INCOMING EVENTS =====================

    socket.on("message-received", (msg: ChatMessage) => {
      // Add to messages if it's the active room
      if (msg.roomId === activeRoomIdRef.current) {
        setMessages((prev) => {
          // Deduplicate by id
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Auto mark-read since user is viewing
        socket.emit("mark-read", { roomId: msg.roomId });
      }
      // Update sidebar preview + unread count
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id !== msg.roomId) return r;
          const isViewing = msg.roomId === activeRoomIdRef.current;
          return {
            ...r,
            lastMessage: {
              id: msg.id,
              content: msg.content,
              type: msg.type,
              fileName: msg.fileName,
              senderName: msg.userName,
              senderId: msg.userId,
              createdAt: msg.createdAt,
              deletedAt: msg.deletedAt,
            },
            unread: isViewing ? 0 : r.unread + (msg.userId === user.id ? 0 : 1),
            updatedAt: msg.createdAt,
          };
        })
      );
    });

    socket.on("user-typing", (data: { roomId: string; userId: string; name: string; isTyping: boolean }) => {
      setTyping((prev) => {
        const roomTyping = (prev[data.roomId] || []).filter((t) => t.userId !== data.userId);
        if (data.isTyping) {
          roomTyping.push({ userId: data.userId, name: data.name, timestamp: Date.now() });
        }
        return { ...prev, [data.roomId]: roomTyping };
      });
    });

    socket.on("message-edited", (data: { messageId: string; roomId: string; content: string; editedAt: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, content: data.content, editedAt: data.editedAt }
            : m
        )
      );
      // Update sidebar preview if needed
      setRooms((prev) =>
        prev.map((r) =>
          r.id === data.roomId && r.lastMessage?.id === data.messageId
            ? { ...r, lastMessage: { ...r.lastMessage, content: data.content } }
            : r
        )
      );
    });

    socket.on("message-deleted", (data: { messageId: string; roomId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, content: "", deletedAt: new Date().toISOString() }
            : m
        )
      );
    });

    socket.on("read-receipt", (data: { roomId: string; userId: string }) => {
      // Could show "seen" indicator — for now just clear unread for that user
    });

    socket.on("online-users", (data: { roomId: string; userIds: string[] }) => {
      setOnlineUsers((prev) => ({ ...prev, [data.roomId]: data.userIds }));
    });

    socket.on("user-online", (data: { roomId: string; userId: string }) => {
      setOnlineUsers((prev) => {
        const cur = prev[data.roomId] || [];
        if (cur.includes(data.userId)) return prev;
        return { ...prev, [data.roomId]: [...cur, data.userId] };
      });
    });

    socket.on("user-offline", (data: { roomId: string; userId: string }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [data.roomId]: (prev[data.roomId] || []).filter((id) => id !== data.userId),
      }));
    });

    socket.on("room-joined", (data: { roomId: string }) => {
      joinedRoomsRef.current.add(data.roomId);
      // Ask for online users list
      socket.emit("get-online-users", { roomId: data.roomId });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // ===================== LOAD ROOMS =====================
  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const d = await api<{ rooms: ChatRoom[] }>("/api/chat/rooms");
      setRooms(d.rooms || []);
      // Auto-join all rooms on socket
      if (socketRef.current?.connected) {
        for (const r of d.rooms || []) {
          socketRef.current.emit("join-room", { roomId: r.id });
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // ===================== SELECT ROOM =====================
  const selectRoom = useCallback(async (roomId: string | null) => {
    setActiveRoomId(roomId);
    setMessages([]);
    if (!roomId) return;

    setLoadingMessages(true);
    try {
      // Join socket room
      if (socketRef.current?.connected) {
        socketRef.current.emit("join-room", { roomId });
      }
      // Load history via HTTP
      const d = await api<{ messages: ChatMessage[] }>(`/api/chat/rooms/${roomId}/messages?limit=100`);
      setMessages(d.messages || []);
      // Mark read
      if (socketRef.current?.connected) {
        socketRef.current.emit("mark-read", { roomId });
      } else {
        await api(`/api/chat/rooms/${roomId}/read`, { method: "POST" }).catch(() => {});
      }
      // Clear unread count
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, unread: 0 } : r))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ===================== SEND MESSAGE =====================
  const sendMessage = useCallback(
    async (payload: {
      content?: string;
      type?: "TEXT" | "IMAGE" | "FILE";
      replyToId?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    }) => {
      if (!activeRoomId) return;
      const roomId = activeRoomId;

      // Try socket first
      if (socketRef.current?.connected) {
        return new Promise<void>((resolve) => {
          socketRef.current!.emit("send-message", {
            roomId,
            content: payload.content || "",
            type: payload.type || "TEXT",
            replyToId: payload.replyToId || null,
            fileName: payload.fileName || null,
            fileSize: payload.fileSize || null,
            mimeType: payload.mimeType || null,
          }, (_ack: any) => {
            // ack received; message-received event will fire separately
            resolve();
          });
        });
      }

      // Fallback: HTTP POST
      try {
        await api(`/api/chat/rooms/${roomId}/messages`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await loadRooms();
      } catch (e: any) {
        setError(e.message);
      }
    },
    [activeRoomId, loadRooms]
  );

  // ===================== TYPING =====================
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeRoomId || !socketRef.current?.connected) return;
      socketRef.current.emit("typing", { roomId: activeRoomId, isTyping });
    },
    [activeRoomId]
  );

  // Debounced typing-stop helper
  const notifyTyping = useCallback(() => {
    if (!activeRoomId) return;
    emitTyping(true);
    if (typingTimeoutRef.current[activeRoomId]) {
      clearTimeout(typingTimeoutRef.current[activeRoomId]);
    }
    typingTimeoutRef.current[activeRoomId] = setTimeout(() => {
      emitTyping(false);
    }, 2500);
  }, [activeRoomId, emitTyping]);

  // ===================== EDIT / DELETE =====================
  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("edit-message", { messageId, content });
    } else {
      await api(`/api/chat/messages/${messageId}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("delete-message", { messageId });
    } else {
      await api(`/api/chat/messages/${messageId}`, { method: "DELETE" });
    }
  }, []);

  // ===================== CREATE / MANAGE ROOMS =====================
  const createDirectRoom = useCallback(async (otherUserId: string) => {
    const d = await api<{ room: ChatRoom }>("/api/chat/dm", {
      method: "POST",
      body: JSON.stringify({ userId: otherUserId }),
    });
    if (!d.room.alreadyExisted) {
      setRooms((prev) => [
        {
          ...d.room,
          lastMessage: null,
          unread: 0,
          lastReadAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-room", { roomId: d.room.id });
    }
    await selectRoom(d.room.id);
    return d.room;
  }, [selectRoom]);

  const createGroupRoom = useCallback(async (data: {
    name: string;
    description?: string;
    memberIds: string[];
    avatar?: string;
  }) => {
    const d = await api<{ room: ChatRoom }>("/api/chat/rooms", {
      method: "POST",
      body: JSON.stringify({ type: "GROUP", ...data }),
    });
    setRooms((prev) => [
      {
        ...d.room,
        lastMessage: null,
        unread: 0,
        lastReadAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-room", { roomId: d.room.id });
    }
    await selectRoom(d.room.id);
    return d.room;
  }, [selectRoom]);

  const leaveRoom = useCallback(async (roomId: string) => {
    await api(`/api/chat/rooms/${roomId}`, { method: "DELETE" });
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (activeRoomId === roomId) {
      setActiveRoomId(null);
      setMessages([]);
    }
    joinedRoomsRef.current.delete(roomId);
  }, [activeRoomId]);

  const refreshRooms = useCallback(() => loadRooms(), [loadRooms]);

  return {
    // State
    rooms,
    activeRoomId,
    messages,
    connected,
    loadingRooms,
    loadingMessages,
    onlineUsers,
    typing,
    error,
    // Actions
    selectRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    setTyping: notifyTyping,
    createDirectRoom,
    createGroupRoom,
    leaveRoom,
    refreshRooms,
  };
}
