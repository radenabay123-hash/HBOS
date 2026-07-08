import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  KPI_SCORE_WEIGHTS,
  getKpiCategory,
} from "@/lib/kpi-targets";
import { getEffectiveKpiTargets } from "@/lib/kpi-targets-server";

export const runtime = "nodejs";

// GET all team KPI scores (owner only) using EFFECTIVE targets (with overrides).
// Returns per-user daily/weekly/monthly achievement, total score, category,
// target vs realisasi, and rankings (productivity + business impact).
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const ref = date ? new Date(date) : new Date();

    const TEAM_ROLES = ["PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"];
    const users = await db.user.findMany({
      where: { role: { in: TEAM_ROLES }, isActive: true },
      select: { id: true, name: true, role: true, position: true },
    });

    // Pre-load effective targets per role (cached)
    const roleConfigs = new Map<string, Awaited<ReturnType<typeof getEffectiveKpiTargets>>>();
    for (const r of TEAM_ROLES) {
      roleConfigs.set(r, await getEffectiveKpiTargets(r));
    }

    const ROLE_LABELS: Record<string, string> = {
      OWNER: "Owner",
      PROJECT_MANAGER: "Project Manager",
      ASSISTANT_TRAINER: "Assistant Trainer",
      CONTENT_CREATIVE: "Content Creative",
      DIGITAL_MARKETING_IT: "Digital Marketing & IT",
      FINANCE: "Finance",
    };

    function getPeriodRange(period: "daily" | "weekly" | "monthly", refDate: Date) {
      if (period === "daily") {
        return {
          start: new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()),
          end: new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + 1),
        };
      }
      if (period === "weekly") {
        const day = refDate.getDay() || 7;
        const monday = new Date(refDate);
        monday.setDate(refDate.getDate() - day + 1);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 7);
        return { start: monday, end: sunday };
      }
      return {
        start: new Date(refDate.getFullYear(), refDate.getMonth(), 1),
        end: new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1),
      };
    }

    async function computePeriod(userId: string, role: string, period: "daily" | "weekly" | "monthly") {
      const cfg = roleConfigs.get(role);
      if (!cfg) return { period, items: [], totalTarget: 0, totalActual: 0, achievementRate: 0 };
      const targets = cfg[period];
      const { start, end } = getPeriodRange(period, ref);
      const logs = await db.kpiLog.findMany({
        where: { userId, date: { gte: start, lt: end } },
        select: { metricKey: true, value: true },
      });
      const actualMap = new Map<string, number>();
      for (const l of logs) {
        actualMap.set(l.metricKey, (actualMap.get(l.metricKey) || 0) + l.value);
      }
      const items = targets.map((t) => {
        const actual = actualMap.get(t.key) || 0;
        const achievement = t.target > 0 ? Math.min(100, Math.round((actual / t.target) * 100)) : 0;
        return { key: t.key, label: t.label, target: t.target, actual, unit: t.unit, achievement };
      });
      const achievementRate = items.length > 0
        ? Math.round(items.reduce((s, i) => s + i.achievement, 0) / items.length)
        : 0;
      const totalTarget = items.reduce((s, i) => s + i.target, 0);
      const totalActual = items.reduce((s, i) => s + i.actual, 0);
      return { period, items, totalTarget, totalActual, achievementRate };
    }

    async function computeDeadlineScore(userId: string): Promise<number> {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
      const total = await db.dailyTask.count({
        where: { userId, tanggal: { gte: start, lt: end } },
      });
      if (total === 0) return 0;
      const done = await db.dailyTask.count({
        where: { userId, status: "SELESAI", tanggal: { gte: start, lt: end } },
      });
      return Math.round((done / total) * 100);
    }

    async function computeQualityScore(userId: string): Promise<number> {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
      const [contents, articles] = await Promise.all([
        db.contentIdea.findMany({
          where: { userId, tanggal: { gte: start, lt: end }, statusACC: { in: ["ACC", "REVISI"] } },
          select: { statusACC: true },
        }),
        db.article.findMany({
          where: { userId, createdAt: { gte: start, lt: end }, statusACC: { in: ["ACC", "REVISI_ADMIN"] } },
          select: { statusACC: true },
        }),
      ]);
      const all = [...contents.map((c) => c.statusACC), ...articles.map((a) => a.statusACC)];
      if (all.length === 0) return 100;
      const [pendingContents, pendingArticles] = await Promise.all([
        db.contentIdea.count({ where: { userId, tanggal: { gte: start, lt: end }, statusACC: "PENDING" } }),
        db.article.count({ where: { userId, createdAt: { gte: start, lt: end }, statusACC: "PENDING" } }),
      ]);
      const accCount = all.filter((s) => s === "ACC").length;
      const revisiCount = all.filter((s) => s === "REVISI" || s === "REVISI_ADMIN").length;
      const pendingCount = pendingContents + pendingArticles;
      const totalAll = all.length + pendingCount;
      if (totalAll === 0) return 100;
      const score = ((accCount * 100) + (revisiCount * 50) + (pendingCount * 0)) / totalAll;
      return Math.round(score);
    }

    // Business impact: client wins + revenue contribution from clients
    async function computeBusinessImpact(userId: string): Promise<{ deals: number; dealRevenue: number }> {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
      const deals = await db.client.count({
        where: { assignedToId: userId, status: "DEAL", updatedAt: { gte: start, lt: end } },
      });
      const dealAgg = await db.client.aggregate({
        where: { assignedToId: userId, status: "DEAL", updatedAt: { gte: start, lt: end } },
        _sum: { budget: true },
      });
      return { deals, dealRevenue: dealAgg._sum?.budget || 0 };
    }

    // Build per-user records
    const records = await Promise.all(users.map(async (u) => {
      const [daily, weekly, monthly, deadlineScore, qualityScore, business] = await Promise.all([
        computePeriod(u.id, u.role, "daily"),
        computePeriod(u.id, u.role, "weekly"),
        computePeriod(u.id, u.role, "monthly"),
        computeDeadlineScore(u.id),
        computeQualityScore(u.id),
        computeBusinessImpact(u.id),
      ]);

      const weightedScore = Math.round(
        daily.achievementRate * KPI_SCORE_WEIGHTS.daily +
        weekly.achievementRate * KPI_SCORE_WEIGHTS.weekly +
        monthly.achievementRate * KPI_SCORE_WEIGHTS.monthly +
        deadlineScore * KPI_SCORE_WEIGHTS.deadline +
        qualityScore * KPI_SCORE_WEIGHTS.quality
      );

      const cat = getKpiCategory(weightedScore);

      return {
        userId: u.id,
        userName: u.name,
        role: u.role,
        roleLabel: ROLE_LABELS[u.role] || u.role,
        position: u.position || null,
        daily,
        weekly,
        monthly,
        deadlineScore,
        qualityScore,
        weightedScore,
        category: cat.label,
        categoryColor: cat.color,
        // Target vs Realisasi summary
        targetVsRealisasi: {
          daily: { target: daily.totalTarget, actual: daily.totalActual },
          weekly: { target: weekly.totalTarget, actual: weekly.totalActual },
          monthly: { target: monthly.totalTarget, actual: monthly.totalActual },
        },
        business,
      };
    }));

    // Ranking by productivity (weightedScore)
    const productivityRanking = [...records]
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .map((r, i) => ({ rank: i + 1, userId: r.userId, userName: r.userName, roleLabel: r.roleLabel, weightedScore: r.weightedScore, category: r.category }));

    // Ranking by business impact (deals, then dealRevenue)
    const businessRanking = [...records]
      .sort((a, b) => b.business.deals - a.business.deals || b.business.dealRevenue - a.business.dealRevenue)
      .map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        userName: r.userName,
        roleLabel: r.roleLabel,
        deals: r.business.deals,
        dealRevenue: r.business.dealRevenue,
      }));

    return ok({
      scores: records,
      productivityRanking,
      businessRanking,
      weights: KPI_SCORE_WEIGHTS,
      date: ref,
    });
  });
}
