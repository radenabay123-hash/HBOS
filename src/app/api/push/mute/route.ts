import { db } from "@/lib/db";
import { ok, err, handleApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// POST — toggle mute/unmute for the calling device's subscription
// Body: { endpoint, muted }  OR  { muted } to apply to ALL user's subscriptions
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { endpoint, muted } = body;
    if (typeof muted !== "boolean") return err("muted (boolean) required", 400);

    if (endpoint) {
      const r = await db.pushSubscription.updateMany({
        where: { userId: user.id, endpoint },
        data: { muted, updatedAt: new Date() },
      });
      return ok({ updated: r.count, muted });
    } else {
      // Apply to ALL this user's devices
      const r = await db.pushSubscription.updateMany({
        where: { userId: user.id },
        data: { muted, updatedAt: new Date() },
      });
      return ok({ updated: r.count, muted });
    }
  });
}

// GET — return mute state for the user's subscriptions (true if ALL are muted)
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const subs = await db.pushSubscription.findMany({
      where: { userId: user.id },
      select: { muted: true },
    });

    if (subs.length === 0) return ok({ muted: false, count: 0, allMuted: false });

    const allMuted = subs.every((s) => s.muted);
    return ok({ muted: allMuted, count: subs.length, allMuted });
  });
}
