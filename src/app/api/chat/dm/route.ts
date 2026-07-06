import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// POST — get-or-create a DIRECT room with a specific user
// Body: { userId } → returns existing DIRECT room or creates new one
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { userId: otherUserId } = body;
    if (!otherUserId) return err("userId wajib", 400);
    if (otherUserId === user.id) return err("Tidak bisa chat dengan diri sendiri", 400);

    const other = await db.user.findUnique({ where: { id: otherUserId } });
    if (!other) return err("User tidak ditemukan", 404);

    // Find existing DIRECT room with both members
    const existing = await db.chatRoom.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId: user.id } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true, avatar: true, isActive: true } } } },
      },
    });

    if (existing) {
      return ok({ room: { ...existing, alreadyExisted: true } });
    }

    // Create new DIRECT room
    const room = await db.chatRoom.create({
      data: {
        type: "DIRECT",
        createdBy: user.id,
        members: {
          create: [
            { userId: user.id, role: "ADMIN" },
            { userId: otherUserId, role: "MEMBER" },
          ],
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true, avatar: true, isActive: true } } } },
      },
    });

    return ok({ room: { ...room, alreadyExisted: false } });
  });
}
