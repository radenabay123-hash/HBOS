import { db } from "@/lib/db";
import { ok, err, handleApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// POST — save push subscription for current user (called by client after pushManager.subscribe)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { endpoint, keys, userAgent, muted } = body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return err("Invalid subscription payload", 400);
    }

    // Upsert — same user+endpoint stays single row
    const sub = await db.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId: user.id, endpoint },
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        muted: muted === true,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        muted: muted === true,
      },
    });

    return ok({ success: true, id: sub.id });
  });
}

// GET — list current user's subscriptions (for management UI)
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const subs = await db.pushSubscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        muted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok({ subscriptions: subs, count: subs.length });
  });
}
