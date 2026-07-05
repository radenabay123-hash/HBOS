// KPI Score Calculation Engine
// Computes weighted KPI score based on Daily/Weekly/Monthly achievement + deadline + quality
import { db } from "./db";
import {
  KPI_TARGETS, KPI_SCORE_WEIGHTS, getKpiCategory,
  type KpiTarget,
} from "./kpi-targets";

export interface KpiPeriodResult {
  period: "daily" | "weekly" | "monthly";
  items: {
    key: string;
    label: string;
    target: number;
    actual: number;
    unit: string;
    achievement: number; // 0-100
  }[];
  totalTarget: number;
  totalActual: number;
  achievementRate: number; // 0-100, weighted avg of item achievement
}

export interface KpiScoreResult {
  userId: string;
  userName: string;
  role: string;
  roleLabel: string;
  date: Date;
  daily: KpiPeriodResult;
  weekly: KpiPeriodResult;
  monthly: KpiPeriodResult;
  deadlineScore: number;     // 0-100
  qualityScore: number;      // 0-100
  weightedScore: number;     // 0-100 final
  category: string;          // Excellent/Good/Need Coaching/Warning
  categoryColor: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  PROJECT_MANAGER: "Project Manager",
  ASSISTANT_TRAINER: "Assistant Trainer",
  CONTENT_CREATIVE: "Content Creative",
  DIGITAL_MARKETING_IT: "Digital Marketing & IT",
  FINANCE: "Finance",
};

// Get date range for a period
function getPeriodRange(period: "daily" | "weekly" | "monthly", ref: Date) {
  if (period === "daily") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1);
    return { start, end };
  }
  if (period === "weekly") {
    // Current week (Mon-Sun)
    const day = ref.getDay() || 7; // 0=Sun → 7
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    return { start: monday, end: sunday };
  }
  // monthly
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return { start, end };
}

// Compute achievement rate for a period from KpiLog values
async function computePeriod(
  userId: string,
  role: string,
  period: "daily" | "weekly" | "monthly",
  ref: Date
): Promise<KpiPeriodResult> {
  const cfg = KPI_TARGETS[role];
  if (!cfg) {
    return { period, items: [], totalTarget: 0, totalActual: 0, achievementRate: 0 };
  }
  const targets: KpiTarget[] = cfg[period];
  const { start, end } = getPeriodRange(period, ref);

  // Fetch KpiLog entries for this user in date range, grouped by metricKey
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

  // Weighted achievement: average of item achievements (each item weighted equally)
  const achievementRate = items.length > 0
    ? Math.round(items.reduce((s, i) => s + i.achievement, 0) / items.length)
    : 0;
  const totalTarget = items.reduce((s, i) => s + i.target, 0);
  const totalActual = items.reduce((s, i) => s + i.actual, 0);

  return { period, items, totalTarget, totalActual, achievementRate };
}

// Compute deadline score: based on daily task completion on time this month
// Higher % of tasks completed (SELESAI) = higher deadline score
async function computeDeadlineScore(userId: string, ref: Date): Promise<number> {
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

// Compute quality score: based on owner approval rate of content + articles this month
// ACC = full credit, REVISI = partial, PENDING = 0
async function computeQualityScore(userId: string, ref: Date): Promise<number> {
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

  const all = [
    ...contents.map((c) => c.statusACC),
    ...articles.map((a) => a.statusACC),
  ];

  if (all.length === 0) return 100; // No submissions = neutral (full, will be lowered if there are pending)
  // Check pending too
  const [pendingContents, pendingArticles] = await Promise.all([
    db.contentIdea.count({ where: { userId, tanggal: { gte: start, lt: end }, statusACC: "PENDING" } }),
    db.article.count({ where: { userId, createdAt: { gte: start, lt: end }, statusACC: "PENDING" } }),
  ]);

  const totalReviewed = all.length;
  const accCount = all.filter((s) => s === "ACC").length;
  const revisiCount = all.filter((s) => s === "REVISI" || s === "REVISI_ADMIN").length;
  const pendingCount = pendingContents + pendingArticles;

  // Score: ACC = 100, REVISI = 50, PENDING = 0
  const totalAll = totalReviewed + pendingCount;
  if (totalAll === 0) return 100;
  const score = ((accCount * 100) + (revisiCount * 50) + (pendingCount * 0)) / totalAll;
  return Math.round(score);
}

// Main: compute full KPI score for a user
export async function computeKpiScore(
  userId: string,
  role: string,
  userName: string,
  ref: Date = new Date()
): Promise<KpiScoreResult> {
  const [daily, weekly, monthly, deadlineScore, qualityScore] = await Promise.all([
    computePeriod(userId, role, "daily", ref),
    computePeriod(userId, role, "weekly", ref),
    computePeriod(userId, role, "monthly", ref),
    computeDeadlineScore(userId, ref),
    computeQualityScore(userId, ref),
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
    userId,
    userName,
    role,
    roleLabel: ROLE_LABELS[role] || role,
    date: ref,
    daily,
    weekly,
    monthly,
    deadlineScore,
    qualityScore,
    weightedScore,
    category: cat.label,
    categoryColor: cat.color,
  };
}

// Compute KPI scores for all team members
export async function computeAllKpiScores(ref: Date = new Date()): Promise<KpiScoreResult[]> {
  const TEAM_ROLES = ["PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"];
  const users = await db.user.findMany({
    where: { role: { in: TEAM_ROLES }, isActive: true },
    select: { id: true, name: true, role: true },
  });
  const results = await Promise.all(
    users.map((u) => computeKpiScore(u.id, u.role, u.name, ref))
  );
  return results.sort((a, b) => b.weightedScore - a.weightedScore);
}
