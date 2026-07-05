import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { KPI_TARGETS, KPI_SCORE_WEIGHTS, KPI_CATEGORIES } from "@/lib/kpi-targets";

export const runtime = "nodejs";

// GET KPI target config for current user's role (or owner can specify role)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || user.role;

    const cfg = KPI_TARGETS[role];
    if (!cfg) return ok({ config: null, weights: KPI_SCORE_WEIGHTS, categories: KPI_CATEGORIES });

    return ok({
      config: cfg,
      weights: KPI_SCORE_WEIGHTS,
      categories: KPI_CATEGORIES,
      role,
    });
  });
}
