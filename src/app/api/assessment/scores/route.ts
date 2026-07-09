import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

const DEFAULT_BONUS_PER_POINT = 100_000;
const SETTING_KEY = "assessment_bonus_per_point";

async function getBonusMultiplier(): Promise<number> {
  const s = await db.appSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!s) return DEFAULT_BONUS_PER_POINT;
  const n = Number(s.value);
  return isNaN(n) ? DEFAULT_BONUS_PER_POINT : n;
}

function calcTotalScore(items: { weight: number; score: number }[]): number {
  const totalWeight = items.reduce((s, i) => s + (i.weight || 0), 0);
  if (totalWeight <= 0) return 0;
  const weighted = items.reduce((s, i) => s + (i.score || 0) * (i.weight || 0), 0);
  return Math.round((weighted / totalWeight) * 100) / 100;
}

// GET — query ?period=YYYY-MM → return all assessments for that period grouped by user
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || defaultPeriod();

    const bonusMultiplier = await getBonusMultiplier();

    // All team members (excluding owner) — assessments only apply to team
    const TEAM_ROLES = [
      "PROJECT_MANAGER",
      "ASSISTANT_TRAINER",
      "CONTENT_CREATIVE",
      "DIGITAL_MARKETING_IT",
      "FINANCE",
    ];
    const users = await db.user.findMany({
      where: { role: { in: TEAM_ROLES }, isActive: true },
      select: { id: true, name: true, role: true, position: true, avatar: true },
    });

    const criteria = await db.assessmentCriteria.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    const assessments = await db.teamAssessment.findMany({
      where: { period },
      include: { criteria: true },
    });

    // Group scores by userId
    const byUser = new Map<string, typeof assessments>();
    for (const a of assessments) {
      const arr = byUser.get(a.userId) || [];
      arr.push(a);
      byUser.set(a.userId, arr);
    }

    const scores = users.map((u) => {
      const userAssessments = byUser.get(u.id) || [];
      const criteriaRows = criteria.map((c) => {
        const a = userAssessments.find((x) => x.criteriaId === c.id);
        return {
          criteriaId: c.id,
          name: c.name,
          description: c.description,
          weight: c.weight,
          dataSource: c.dataSource,
          score: a ? a.score : 0,
          isAuto: a ? a.isAuto : c.dataSource !== "MANUAL",
          note: a?.note || null,
        };
      });
      const totalScore = calcTotalScore(criteriaRows.map((r) => ({ weight: r.weight, score: r.score })));
      const bonusAmount = Math.round(totalScore * bonusMultiplier);
      return {
        userId: u.id,
        userName: u.name,
        role: u.role,
        position: u.position,
        avatar: u.avatar,
        criteria: criteriaRows,
        totalScore,
        bonusAmount,
      };
    });

    return ok({ scores, period, bonusMultiplier });
  });
}

// POST — save/update scores for a user in a period
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { userId, period, scores } = body;
    if (!userId) return err("userId wajib diisi", 400);
    if (!period) return err("period wajib diisi (YYYY-MM)", 400);
    if (!Array.isArray(scores)) return err("scores harus berupa array", 400);

    // Validate user exists & is team member
    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) return err("User tidak ditemukan", 404);

    const bonusMultiplier = await getBonusMultiplier();

    // Upsert each score (unique: userId+criteriaId+period)
    let savedCount = 0;
    for (const s of scores) {
      const { criteriaId, score, note, isAuto } = s;
      if (!criteriaId) continue;
      const sc = Math.min(100, Math.max(0, Number(score) || 0));
      const criteria = await db.assessmentCriteria.findUnique({ where: { id: criteriaId } });
      const auto = isAuto != null ? Boolean(isAuto) : (criteria?.dataSource !== "MANUAL");
      await db.teamAssessment.upsert({
        where: {
          userId_criteriaId_period: { userId, criteriaId, period },
        },
        update: { score: sc, note: note ? String(note) : null, isAuto: auto },
        create: {
          userId,
          criteriaId,
          period,
          score: sc,
          note: note ? String(note) : null,
          isAuto: auto,
        },
      });
      savedCount++;
    }

    // Recompute totals for this user
    const allRows = await db.teamAssessment.findMany({
      where: { userId, period },
      include: { criteria: true },
    });
    const totalScore = calcTotalScore(
      allRows.map((r) => ({ weight: r.criteria?.weight || 0, score: r.score }))
    );
    const bonusAmount = Math.round(totalScore * bonusMultiplier);

    return ok({ saved: savedCount, totalScore, bonusAmount, period });
  });
}

function defaultPeriod(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
