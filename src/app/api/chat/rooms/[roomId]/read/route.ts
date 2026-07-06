import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// POST — mark all messages in room as read (update lastReadAt to now)
export async function POST(_req: Request, ctx: { params: Promise<{ roomId: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { roomId } = await ctx.params;

    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) return err("Anda bukan anggota room ini", 403);

    const updated = await db.chatMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });

    return ok({ success: true, lastReadAt: updated.lastReadAt });
  });
}
