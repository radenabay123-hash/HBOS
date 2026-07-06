import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// GET — room details (must be a member)
export async function GET(_req: Request, ctx: { params: Promise<{ roomId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { roomId } = await ctx.params;

    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) return err("Anda bukan anggota room ini", 403);

    const room = await db.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true, avatar: true, isActive: true, position: true } } } },
      },
    });
    if (!room) return err("Room tidak ditemukan", 404);

    return ok({ room, myMembership: member });
  });
}

// PUT — update room (group: rename, avatar, description) — admin only
export async function PUT(req: Request, ctx: { params: Promise<{ roomId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { roomId } = await ctx.params;

    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) return err("Anda bukan anggota", 403);
    if (member.role !== "ADMIN") return err("Hanya admin yang bisa mengubah room", 403);

    const body = await req.json();
    const { name, description, avatar } = body;
    const room = await db.chatRoom.update({
      where: { id: roomId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        updatedAt: new Date(),
      },
    });
    return ok({ room });
  });
}

// DELETE — leave room (or delete if owner leaving & group)
export async function DELETE(_req: Request, ctx: { params: Promise<{ roomId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { roomId } = await ctx.params;

    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) return err("Anda bukan anggota", 403);

    const room = await db.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) return err("Room tidak ditemukan", 404);

    // Remove member
    await db.chatMember.delete({ where: { id: member.id } });

    // System message that user left (group only)
    if (room.type === "GROUP") {
      await db.chatMessage.create({
        data: { roomId, userId: user.id, content: `${user.name} keluar dari grup`, type: "SYSTEM" },
      });
    }

    // If no members left → delete room
    const remainingCount = await db.chatMember.count({ where: { roomId } });
    if (remainingCount === 0) {
      await db.chatRoom.delete({ where: { id: roomId } });
    } else if (room.type === "DIRECT") {
      // DIRECT with only 1 member → also delete
      await db.chatRoom.delete({ where: { id: roomId } });
    }

    return ok({ left: true });
  });
}
