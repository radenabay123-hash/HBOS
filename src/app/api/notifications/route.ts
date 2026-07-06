import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");

    // Owner can see all broadcast notifications (sent by them) with ?all=true
    if (all === "true" && user.role === ROLES.OWNER) {
      const notifications = await db.notification.findMany({
        where: { senderId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: { select: { name: true, role: true } } },
      });
      const unread = 0;
      return ok({ notifications, unread });
    }

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const unread = notifications.filter((n) => !n.read).length;
    return ok({ notifications, unread });
  });
}

// Mark all read
export async function PUT() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return ok({ success: true });
  });
}
