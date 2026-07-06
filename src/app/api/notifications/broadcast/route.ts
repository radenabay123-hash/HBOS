import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// POST — Owner broadcasts notification to team members
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { title, message, type, priority, targetRole, targetUserId, actionUrl } = body;
    if (!title || !message) return err("Title dan message wajib diisi", 400);

    // Determine recipients
    let recipients: { id: string }[] = [];
    if (targetUserId) {
      // Send to specific user
      recipients = [{ id: targetUserId }];
    } else if (targetRole && targetRole !== "ALL") {
      // Send to all users with specific role
      recipients = await db.user.findMany({ where: { role: targetRole, isActive: true }, select: { id: true } });
    } else {
      // Send to ALL team members (excluding owner)
      recipients = await db.user.findMany({ where: { isActive: true, role: { not: ROLES.OWNER } }, select: { id: true } });
    }

    if (recipients.length === 0) return err("Tidak ada penerima ditemukan", 400);

    // Create notification for each recipient
    const notifications = [];
    for (const r of recipients) {
      const n = await db.notification.create({
        data: {
          userId: r.id,
          title: String(title).trim(),
          message: String(message).trim(),
          type: type || "ANNOUNCEMENT",
          priority: priority || "normal",
          actionUrl: actionUrl || null,
          senderId: user.id,
          read: false,
        },
      });
      notifications.push(n);
    }

    return ok({ sent: notifications.length, notifications });
  });
}
