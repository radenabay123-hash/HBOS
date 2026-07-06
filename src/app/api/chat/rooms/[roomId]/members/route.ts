import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// GET — list members of a room
export async function GET(_req: Request, ctx: { params: Promise<{ roomId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { roomId } = await ctx.params;

    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) return err("Anda bukan anggota", 403);

    const members = await db.chatMember.findMany({
      where: { roomId },
      include: { user: { select: { id: true, name: true, role: true, avatar: true, isActive: true, position: true, phone: true } } },
      orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    });

    return ok({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        name: m.user.name,
        userRole: m.user.role,
        avatar: m.user.avatar,
        isActive: m.user.isActive,
        position: m.user.position,
        phone: m.user.phone,
        joinedAt: m.joinedAt,
        muted: m.muted,
      })),
    });
  });
}

// POST — add member to group (admin only)
export async function POST(req: Request, ctx: { params: Promise<{ roomId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { roomId } = await ctx.params;

    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) return err("Anda bukan anggota", 403);
    if (member.role !== "ADMIN") return err("Hanya admin yang bisa menambah anggota", 403);

    const body = await req.json();
    const { userId: newUserId } = body;
    if (!newUserId) return err("userId wajib", 400);

    // Check if already member
    const existing = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: newUserId } },
    });
    if (existing) return err("User sudah anggota", 400);

    const newMember = await db.chatMember.create({
      data: { roomId, userId: newUserId, role: "MEMBER" },
    });

    // System message
    const newUser = await db.user.findUnique({ where: { id: newUserId }, select: { name: true } });
    await db.chatMessage.create({
      data: {
        roomId,
        userId: user.id,
        content: `${user.name} menambahkan ${newUser?.name || "user"} ke grup`,
        type: "SYSTEM",
      },
    });

    return ok({ member: newMember });
  });
}

// DELETE — remove member from group (admin or self-leave)
export async function DELETE(req: Request, ctx: { params: Promise<{ roomId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { roomId } = await ctx.params;

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) return err("userId query required", 400);

    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) return err("Anda bukan anggota", 403);

    // Self can always leave; otherwise must be admin
    if (targetUserId !== user.id && member.role !== "ADMIN") {
      return err("Hanya admin yang bisa mengeluarkan anggota", 403);
    }

    const target = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
    if (!target) return err("Target bukan anggota", 404);

    await db.chatMember.delete({ where: { id: target.id } });

    const targetUser = await db.user.findUnique({ where: { id: targetUserId }, select: { name: true } });
    await db.chatMessage.create({
      data: {
        roomId,
        userId: user.id,
        content:
          targetUserId === user.id
            ? `${user.name} keluar dari grup`
            : `${user.name} mengeluarkan ${targetUser?.name || "user"} dari grup`,
        type: "SYSTEM",
      },
    });

    return ok({ removed: true });
  });
}
