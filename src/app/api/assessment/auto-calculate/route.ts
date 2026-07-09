import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// POST — auto-calculate scores from data sources
// Body: { userId, period }
// ATTENDANCE: on-time percentage from Attendance table
// KPI: get KPI score from team-scores API
// SOCIAL_MEDIA: sum of likes+shares+comments from ContentIdea metrikKonten
// VIRAL: count of content with views > 10000
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { userId, period } = body;
    if (!userId) return err("userId wajib diisi", 400);
    if (!period) return err("period wajib diisi (YYYY-MM)", 400);

    // Validate period format YYYY-MM
    const m = /^(\d{4})-(\d{2})$/.exec(period);
    if (!m) return err("Period harus YYYY-MM", 400);
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) return err("Bulan tidak valid", 400);

    // Get active criteria for auto sources
    const criteria = await db.assessmentCriteria.findMany({
      where: {
        isActive: true,
        dataSource: { in: ["ATTENDANCE", "KPI", "SOCIAL_MEDIA", "VIRAL"] },
      },
      orderBy: [{ order: "asc" }],
    });

    const [start, end] = [new Date(year, month - 1, 1), new Date(year, month, 1)];

    const results: Array<{
      criteriaId: string;
      name: string;
      dataSource: string;
      score: number;
      note: string;
      raw: any;
    }> = [];

    for (const c of criteria) {
      let score = 0;
      let note = "";
      let raw: any = null;

      if (c.dataSource === "ATTENDANCE") {
        const records = await db.attendance.findMany({
          where: { userId, date: { gte: start, lt: end } },
          select: { status: true },
        });
        raw = { totalDays: records.length };
        if (records.length === 0) {
          score = 0;
          note = "Tidak ada data absensi";
        } else {
          // "On-time" = HADIR (not TERLAMBAT, ALPHA, etc.)
          const onTime = records.filter((r) => r.status === "HADIR").length;
          score = Math.round((onTime / records.length) * 100);
          note = `${onTime}/${records.length} hari hadir tepat waktu`;
          raw.onTime = onTime;
        }
      } else if (c.dataSource === "KPI") {
        // Get KPI score from team-scores logic directly (compute locally)
        const kpiScore = await computeKpiScore(userId, start, end);
        score = kpiScore.score;
        note = kpiScore.note;
        raw = kpiScore.raw;
      } else if (c.dataSource === "SOCIAL_MEDIA") {
        const contents = await db.contentIdea.findMany({
          where: {
            userId,
            tanggal: { gte: start, lt: end },
            metrikKonten: { not: null },
          },
          select: { metrikKonten: true },
        });
        let totalEngagement = 0;
        for (const cnt of contents) {
          const metrik = parseMetrik(cnt.metrikKonten);
          totalEngagement +=
            (metrik.likes || 0) +
            (metrik.share || 0) +
            (metrik.comment || 0) +
            (metrik.save || 0);
        }
        raw = { totalEngagement, contentCount: contents.length };
        // Score: scale — 1000 engagements = 100 points (capped at 100)
        score = Math.min(100, Math.round((totalEngagement / 1000) * 100));
        note = `${totalEngagement} engagement dari ${contents.length} konten`;
      } else if (c.dataSource === "VIRAL") {
        const contents = await db.contentIdea.findMany({
          where: {
            userId,
            tanggal: { gte: start, lt: end },
            metrikKonten: { not: null },
          },
          select: { metrikKonten: true },
        });
        let viralCount = 0;
        let totalViews = 0;
        for (const cnt of contents) {
          const metrik = parseMetrik(cnt.metrikKonten);
          const views = metrik.views || metrik.view || 0;
          totalViews += views;
          if (views > 10000) viralCount++;
        }
        raw = { viralCount, totalViews, contentCount: contents.length };
        // Score: 1 viral = 20 points, 5+ viral = 100 points
        score = Math.min(100, viralCount * 20);
        note = `${viralCount} konten viral (>10K views) dari ${contents.length} konten`;
      }

      // Upsert the auto score
      await db.teamAssessment.upsert({
        where: {
          userId_criteriaId_period: { userId, criteriaId: c.id, period },
        },
        update: { score, note, isAuto: true },
        create: { userId, criteriaId: c.id, period, score, note, isAuto: true },
      });

      results.push({
        criteriaId: c.id,
        name: c.name,
        dataSource: c.dataSource,
        score,
        note,
        raw,
      });
    }

    return ok({ results, userId, period });
  });
}

// Helper: parse metrikKonten (could be JSON string or already an object)
function parseMetrik(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== "object") return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) {
      const n = Number(v);
      if (!isNaN(n)) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

// Compute KPI score (0-100) for a user within a period using existing KpiLog data.
// Mirrors the logic in /api/kpi/team-scores but simpler: average of achievement rates
// across daily + weekly + monthly targets for the user's role.
async function computeKpiScore(
  userId: string,
  start: Date,
  end: Date
): Promise<{ score: number; note: string; raw: any }> {
  // Lazy-load KPI target config (server-side) to avoid circular imports
  const { getEffectiveKpiTargets } = await import("@/lib/kpi-targets-server");
  const { KPI_SCORE_WEIGHTS, getKpiCategory } = await import("@/lib/kpi-targets");

  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });
  if (!targetUser) return { score: 0, note: "User tidak ditemukan", raw: null };

  const cfg = await getEffectiveKpiTargets(targetUser.role);
  if (!cfg) return { score: 0, note: "Belum ada target KPI", raw: null };
  const safeCfg = cfg;

  // Period = monthly range (start..end)
  function getRange(period: "daily" | "weekly" | "monthly") {
    if (period === "daily") return { start, end };
    if (period === "weekly") return { start, end };
    return { start, end };
  }

  async function computePeriod(period: "daily" | "weekly" | "monthly") {
    const targets = safeCfg[period];
    if (!targets || targets.length === 0) return 0;
    const { start: s, end: e } = getRange(period);
    const logs = await db.kpiLog.findMany({
      where: { userId, date: { gte: s, lt: e } },
      select: { metricKey: true, value: true },
    });
    const actualMap = new Map<string, number>();
    for (const l of logs) {
      actualMap.set(l.metricKey, (actualMap.get(l.metricKey) || 0) + l.value);
    }
    const items = targets.map((t) => {
      const actual = actualMap.get(t.key) || 0;
      const achievement = t.target > 0 ? Math.min(100, Math.round((actual / t.target) * 100)) : 0;
      return achievement;
    });
    return items.length > 0
      ? Math.round(items.reduce((s, a) => s + a, 0) / items.length)
      : 0;
  }

  const [daily, weekly, monthly] = await Promise.all([
    computePeriod("daily"),
    computePeriod("weekly"),
    computePeriod("monthly"),
  ]);

  // Deadline score: percentage of SELESAI tasks in the period
  const total = await db.dailyTask.count({
    where: { userId, tanggal: { gte: start, lt: end } },
  });
  const done = await db.dailyTask.count({
    where: { userId, status: "SELESAI", tanggal: { gte: start, lt: end } },
  });
  const deadlineScore = total > 0 ? Math.round((done / total) * 100) : 0;

  // Quality score: ACC content / total content (PENDING + ACC + REVISI)
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
  const allStatuses = [...contents.map((c) => c.statusACC), ...articles.map((a) => a.statusACC)];
  const accCount = allStatuses.filter((s) => s === "ACC").length;
  const revisiCount = allStatuses.filter((s) => s === "REVISI" || s === "REVISI_ADMIN").length;
  const qualityScore = allStatuses.length > 0
    ? Math.round(((accCount * 100) + (revisiCount * 50)) / allStatuses.length)
    : 100;

  const weighted = Math.round(
    daily * KPI_SCORE_WEIGHTS.daily +
    weekly * KPI_SCORE_WEIGHTS.weekly +
    monthly * KPI_SCORE_WEIGHTS.monthly +
    deadlineScore * KPI_SCORE_WEIGHTS.deadline +
    qualityScore * KPI_SCORE_WEIGHTS.quality
  );

  const cat = getKpiCategory(weighted);
  return {
    score: weighted,
    note: `Kategori: ${cat.label} (D:${daily} W:${weekly} M:${monthly} DL:${deadlineScore} Q:${qualityScore})`,
    raw: { daily, weekly, monthly, deadlineScore, qualityScore, weighted, category: cat.label },
  };
}
