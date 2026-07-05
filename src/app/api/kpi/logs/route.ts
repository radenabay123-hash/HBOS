import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { KPI_TARGETS } from "@/lib/kpi-targets";

export const runtime = "nodejs";

// GET KPI logs for current user (or owner can query any user)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily"; // daily, weekly, monthly
    const date = searchParams.get("date"); // specific date reference
    const userId = searchParams.get("userId");

    const targetUserId = (user.role === ROLES.OWNER && userId) ? userId : user.id;
    const role = (user.role === ROLES.OWNER && userId)
      ? (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role
      : user.role;

    if (!role) return err("User role tidak ditemukan", 404);

    const cfg = KPI_TARGETS[role];
    if (!cfg) return ok({ targets: [], logs: [], period });

    const targets = cfg[period as "daily" | "weekly" | "monthly"] || [];

    // Compute date range
    const ref = date ? new Date(date) : new Date();
    let start: Date, end: Date;
    if (period === "daily") {
      start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
      end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1);
    } else if (period === "weekly") {
      const day = ref.getDay() || 7;
      start = new Date(ref);
      start.setDate(ref.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
    } else {
      start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    }

    const logs = await db.kpiLog.findMany({
      where: { userId: targetUserId, date: { gte: start, lt: end } },
      orderBy: { date: "desc" },
    });

    // Group by metricKey, sum values
    const actualMap = new Map<string, number>();
    for (const l of logs) {
      actualMap.set(l.metricKey, (actualMap.get(l.metricKey) || 0) + l.value);
    }

    const items = targets.map((t) => {
      const actual = actualMap.get(t.key) || 0;
      const achievement = t.target > 0 ? Math.min(100, Math.round((actual / t.target) * 100)) : 0;
      return { ...t, actual, achievement };
    });

    const achievementRate = items.length > 0
      ? Math.round(items.reduce((s, i) => s + i.achievement, 0) / items.length)
      : 0;

    return ok({
      period,
      role,
      targets: items,
      logs,
      achievementRate,
      dateRange: { start, end },
    });
  });
}

// POST: log/update a KPI metric value for current user
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { metricKey, value, date, note } = body;
    if (!metricKey || value == null) return err("metricKey dan value wajib diisi", 400);

    // Validate metricKey belongs to user's role targets
    const cfg = KPI_TARGETS[user.role];
    if (!cfg) return err("Role tidak punya KPI target", 400);
    const allKeys = [...cfg.daily, ...cfg.weekly, ...cfg.monthly].map((t) => t.key);
    if (!allKeys.includes(metricKey)) return err("metricKey tidak valid untuk role ini", 400);

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(10, 0, 0, 0);

    // Upsert (unique on userId+metricKey+date)
    const log = await db.kpiLog.upsert({
      where: { userId_metricKey_date: { userId: user.id, metricKey, date: logDate } },
      update: { value: Number(value), note: note || null, updatedAt: new Date() },
      create: { userId: user.id, metricKey, value: Number(value), date: logDate, note: note || null },
    });

    return ok({ log });
  });
}
