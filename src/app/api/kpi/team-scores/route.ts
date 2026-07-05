import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { computeAllKpiScores } from "@/lib/kpi-score";

export const runtime = "nodejs";

// GET all team KPI scores (owner only)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const ref = date ? new Date(date) : new Date();

    const scores = await computeAllKpiScores(ref);
    return ok({ scores, date: ref });
  });
}
