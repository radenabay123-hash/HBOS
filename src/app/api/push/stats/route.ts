import { db } from "@/lib/db";
import { ok, err, handleApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET — total active push subscriptions & count by role (owner view)
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const subs = await db.pushSubscription.findMany({
      where: { muted: false },
      select: { userId: true },
    });

    // Unique user IDs
    const userIds = Array.from(new Set(subs.map((s) => s.userId)));
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true },
    });

    const byRole: Record<string, number> = {};
    for (const u of users) {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    }

    return ok({ total: users.length, byRole });
  });
}
