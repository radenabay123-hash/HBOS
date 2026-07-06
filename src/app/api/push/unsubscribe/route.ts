import { db } from "@/lib/db";
import { ok, err, handleApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// POST — remove a push subscription (called when user disables push or browser unsubscribes)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { endpoint } = body;
    if (!endpoint) return err("endpoint required", 400);

    const r = await db.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint },
    });

    return ok({ success: true, removed: r.count });
  });
}
