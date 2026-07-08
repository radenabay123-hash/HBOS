import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { sendPushToUsers } from "@/lib/web-push";

export const runtime = "nodejs";

// POST — Owner broadcasts notification to team members.
// Creates in-app notifications AND sends Web Push to recipients' devices,
// so they get notified even when the app is NOT open.
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

    const notifType = type || "ANNOUNCEMENT";
    const notifPriority = priority || "normal";
    const actionUrlFinal = actionUrl || null;

    // Create notification for each recipient
    const notifications = [];
    for (const r of recipients) {
      const n = await db.notification.create({
        data: {
          userId: r.id,
          title: String(title).trim(),
          message: String(message).trim(),
          type: notifType,
          priority: notifPriority,
          actionUrl: actionUrlFinal,
          senderId: user.id,
          read: false,
        },
      });
      notifications.push(n);
    }

    // Send Web Push to all recipients (background delivery)
    // Non-blocking — failures don't break the in-app notification.
    let pushResult = { sent: 0, failed: 0, removedStale: 0, reachedUsers: 0 };
    try {
      pushResult = await sendPushToUsers(
        recipients.map((r) => r.id),
        {
          title: String(title).trim(),
          message: String(message).trim(),
          type: notifType,
          priority: notifPriority as "normal" | "high" | "urgent",
          actionUrl: actionUrlFinal || "/",
        }
      );
    } catch (e) {
      // Push failed but in-app notif already saved — log silently
      console.error("[broadcast] push send failed:", e);
    }

    return ok({
      sent: notifications.length,
      notifications,
      push: pushResult,
    });
  });
}
