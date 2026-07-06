import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// GET — paginated messages for a room (newest at bottom, but we return oldest-first for rendering)
export async function GET(req: Request, ctx: { params: Promise<{ roomId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { roomId } = await ctx.params;

    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) return err("Anda bukan anggota room ini", 403);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
    const before = searchParams.get("before"); // message id for pagination

    let cursor: string | undefined;
    if (before) {
      const beforeMsg = await db.chatMessage.findUnique({ where: { id: before }, select: { createdAt: true } });
      if (beforeMsg) cursor = beforeMsg.id;
    }

    const messages = await db.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, role: true, avatar: true } },
        replyTo: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    // Reverse to oldest-first
    messages.reverse();

    return ok({
      messages: messages.map((m) => ({
        id: m.id,
        roomId: m.roomId,
        userId: m.userId,
        userName: m.user.name,
        userRole: m.user.role,
        userAvatar: m.user.avatar,
        content: m.content,
        type: m.type,
        fileName: m.fileName,
        fileSize: m.fileSize,
        mimeType: m.mimeType,
        replyToId: m.replyToId,
        replyTo: m.replyTo
          ? { id: m.replyTo.id, content: m.replyTo.content, type: m.replyTo.type, userName: m.replyTo.user.name, fileName: m.replyTo.fileName }
          : null,
        editedAt: m.editedAt,
        deletedAt: m.deletedAt,
        createdAt: m.createdAt,
        isOwn: m.userId === user.id,
      })),
    });
  });
}

// POST — send message via HTTP (fallback if socket not connected; normally socket handles this)
export async function POST(req: Request, ctx: { params: Promise<{ roomId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { roomId } = await ctx.params;

    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) return err("Anda bukan anggota room ini", 403);

    const body = await req.json();
    const { content, type, replyToId, fileName, fileSize, mimeType } = body;
    if (!content && type !== "FILE" && type !== "IMAGE") return err("content wajib", 400);

    const message = await db.chatMessage.create({
      data: {
        roomId,
        userId: user.id,
        content: String(content || ""),
        type: type || "TEXT",
        replyToId: replyToId || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
      },
      include: {
        user: { select: { id: true, name: true, role: true, avatar: true } },
        replyTo: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    // Bump room.updatedAt so it sorts to top in sidebar
    await db.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });

    return ok({
      message: {
        id: message.id,
        roomId: message.roomId,
        userId: message.userId,
        userName: message.user.name,
        userRole: message.user.role,
        userAvatar: message.user.avatar,
        content: message.content,
        type: message.type,
        fileName: message.fileName,
        fileSize: message.fileSize,
        mimeType: message.mimeType,
        replyToId: message.replyToId,
        replyTo: message.replyTo
          ? { id: message.replyTo.id, content: message.replyTo.content, type: message.replyTo.type, userName: message.replyTo.user.name, fileName: message.replyTo.fileName }
          : null,
        editedAt: message.editedAt,
        deletedAt: message.deletedAt,
        createdAt: message.createdAt,
        isOwn: true,
      },
    });
  });
}
