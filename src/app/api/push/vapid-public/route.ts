import { ok, err, handleApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getVapidPublicKey } from "@/lib/web-push";

export const runtime = "nodejs";

// GET — return VAPID public key (safe to expose) + browser support info
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const publicKey = getVapidPublicKey();
    if (!publicKey) return err("VAPID keys not configured", 500);

    return ok({
      publicKey,
      userId: user.id,
      // Hint to client about whether SW is supported in this environment
      supported: true,
    });
  });
}
