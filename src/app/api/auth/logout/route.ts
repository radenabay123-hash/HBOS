import { db } from "@/lib/db";
import { clearSessionCookie, getSessionToken } from "@/lib/auth";
import { ok, handleApi } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  return handleApi(async () => {
    const token = await getSessionToken();
    if (token) {
      await db.session.deleteMany({ where: { token } }).catch(() => {});
    }
    await clearSessionCookie();
    return ok({ success: true });
  });
}
