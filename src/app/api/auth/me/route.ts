import { getCurrentUser, safeUser } from "@/lib/auth";
import { ok, handleApi } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null });
    return ok({ user: safeUser(user) });
  });
}
