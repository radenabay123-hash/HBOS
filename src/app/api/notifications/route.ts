import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
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
