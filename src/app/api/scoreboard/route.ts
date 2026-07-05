import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, TEAM_ROLES, ROLE_LABELS } from "@/lib/constants";
import { computeKpiScore } from "@/lib/kpi-score";

export const runtime = "nodejs";

// Scoreboard - ranking of team members based on productivity & discipline
// Visible to ALL roles (transparency on KPI productivity)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // month, year, all
    const now = new Date();
    let gte: Date | null = null;
    if (period === "month") {
      gte = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "year") {
      gte = new Date(now.getFullYear(), 0, 1);
    }

    // Build per-model date filters (each model uses a different date field name)
    const scoreWhere = gte ? { date: { gte } } : {};
    const taskWhere = gte ? { tanggal: { gte } } : {};
    const contentWhere = gte ? { tanggal: { gte } } : {};
    const articleWhere = gte ? { createdAt: { gte } } : {};

    const teamUsers = await db.user.findMany({
      where: { role: { in: TEAM_ROLES }, isActive: true },
      select: { id: true, name: true, role: true, position: true, avatar: true },
    });

    // Aggregate scores
    const scores = await db.scoreLog.groupBy({
      by: ["targetUserId"],
      where: scoreWhere,
      _sum: { points: true },
    });
    const scoreMap = new Map(scores.map((s) => [s.targetUserId, s._sum.points || 0]));

    // Task completion stats
    const tasks = await db.dailyTask.groupBy({
      by: ["userId"],
      where: taskWhere,
      _count: { _all: true },
    });
    const taskMap = new Map(tasks.map((t) => [t.userId, t._count._all]));

    const completedTasks = await db.dailyTask.groupBy({
      by: ["userId"],
      where: { ...taskWhere, status: "SELESAI" },
      _count: { _all: true },
    });
    const completedMap = new Map(completedTasks.map((t) => [t.userId, t._count._all]));

    // Content production count
    const contents = await db.contentIdea.groupBy({
      by: ["userId"],
      where: { ...contentWhere, statusPublish: "PUBLISHED" },
      _count: { _all: true },
    });
    const contentMap = new Map(contents.map((c) => [c.userId, c._count._all]));

    // Articles published
    const articles = await db.article.groupBy({
      by: ["userId"],
      where: { ...articleWhere, status: "PUBLISHED" },
      _count: { _all: true },
    });
    const articleMap = new Map(articles.map((a) => [a.userId, a._count._all]));

    // Compute KPI scores for each team member (always for current month)
    const kpiScores = await Promise.all(
      teamUsers.map((u) => computeKpiScore(u.id, u.role, u.name, now).catch(() => null))
    );
    const kpiMap = new Map(kpiScores.filter(Boolean).map((s: any) => [s.userId, s]));

    const ranking = teamUsers.map((u) => {
      const score = scoreMap.get(u.id) || 0;
      const totalTasks = taskMap.get(u.id) || 0;
      const doneTasks = completedMap.get(u.id) || 0;
      const disciplineRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const contentProduced = contentMap.get(u.id) || 0;
      const articlesPublished = articleMap.get(u.id) || 0;
      const kpi = kpiMap.get(u.id);
      // Composite productivity score: weighted KPI score is primary
      const productivityScore = kpi ? kpi.weightedScore : (score + doneTasks * 3 + contentProduced * 5 + articlesPublished * 4);
      return {
        ...u,
        roleLabel: ROLE_LABELS[u.role] || u.role,
        score,
        totalTasks,
        doneTasks,
        disciplineRate,
        contentProduced,
        articlesPublished,
        productivityScore,
        kpiScore: kpi ? kpi.weightedScore : null,
        kpiCategory: kpi ? kpi.category : null,
        kpiDaily: kpi ? kpi.daily.achievementRate : null,
        kpiWeekly: kpi ? kpi.weekly.achievementRate : null,
        kpiMonthly: kpi ? kpi.monthly.achievementRate : null,
      };
    });

    // Sort by KPI score (primary), then productivity score
    ranking.sort((a, b) => (b.kpiScore || 0) - (a.kpiScore || 0) || b.productivityScore - a.productivityScore);

    return ok({ ranking, period });
  });
}
