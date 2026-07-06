import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// PUT — edit message content (own messages only)
export async function PUT(req: Request, ctx: { params: Promise<{ messageId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { messageId } = await ctx.params;

    const message = await db.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) return err("Pesan tidak ditemukan", 404);
    if (message.userId !== user.id) return err("Hanya bisa edit pesan sendiri", 403);

    const body = await req.json();
    const { content } = body;
    if (!content || !content.trim()) return err("content wajib", 400);

    const updated = await db.chatMessage.update({
      where: { id: messageId },
      data: { content: String(content).trim(), editedAt: new Date() },
    });

    return ok({ message: updated });
  });
}

// DELETE — soft-delete message (own messages only, or admin of room)
export async function DELETE(_req: Request, ctx: { params: Promise<{ messageId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { messageId } = await ctx.params;

    const message = await db.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) return err("Pesan tidak ditemukan", 404);

    // Owner of message OR admin of room
    if (message.userId !== user.id) {
      const member = await db.chatMember.findUnique({
        where: { roomId_userId: { roomId: message.roomId, userId: user.id } },
      });
      if (!member || member.role !== "ADMIN") {
        return err("Tidak ada izin menghapus pesan ini", 403);
      }
    }

    const updated = await db.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: "" },
    });

    return ok({ deleted: true, message: updated });
  });
}
