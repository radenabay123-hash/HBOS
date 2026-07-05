import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { KPI_TARGETS, KPI_SCORE_WEIGHTS, KPI_CATEGORIES } from "@/lib/kpi-targets";
import { computeKpiScore } from "@/lib/kpi-score";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET KPI score for current user (or owner can query any user)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");

    let targetUserId = user.id;
    let targetRole = user.role;
    let targetName = user.name;

    if (user.role === "OWNER" && userId) {
      const u = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
      if (!u) return err("User tidak ditemukan", 404);
      targetUserId = u.id;
      targetRole = u.role;
      targetName = u.name;
    }

    const ref = date ? new Date(date) : new Date();
    const score = await computeKpiScore(targetUserId, targetRole, targetName, ref);
    return ok({ score });
  });
}
