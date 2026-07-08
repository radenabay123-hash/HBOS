import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { getNeraca } from "@/lib/finance-engine";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") || now.getFullYear());
    const month = Number(searchParams.get("month") || (now.getMonth() + 1));

    const neraca = await getNeraca(year, month);
    return ok({ neraca, year, month });
  });
}
