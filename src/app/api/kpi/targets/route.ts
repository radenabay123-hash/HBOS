import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import {
  KPI_TARGETS, KPI_SCORE_WEIGHTS, KPI_CATEGORIES,
  type RoleKpiConfig,
} from "@/lib/kpi-targets";
import {
  getEffectiveKpiTargets, getKpiTargetOverrides, saveKpiTargetOverride,
  deleteKpiTargetOverride,
} from "@/lib/kpi-targets-server";

export const runtime = "nodejs";

// GET KPI target config for current user's role (or owner can specify role)
// Returns base config merged with any owner overrides (effective targets).
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || user.role;

    const cfg: RoleKpiConfig | null = await getEffectiveKpiTargets(role);
    if (!cfg) return ok({ config: null, weights: KPI_SCORE_WEIGHTS, categories: KPI_CATEGORIES });

    const overrides = await getKpiTargetOverrides();

    return ok({
      config: cfg,
      baseConfig: KPI_TARGETS[role] || null,
      overrides: overrides[role] || { daily: {}, weekly: {}, monthly: {} },
      weights: KPI_SCORE_WEIGHTS,
      categories: KPI_CATEGORIES,
      role,
    });
  });
}

// PUT: owner can override any target value (save to AppSetting as JSON)
// Body: { role, period, key, target }
// period: "daily" | "weekly" | "monthly"
// key: metricKey
// target: new target value (number). Pass null/undefined to reset to base.
export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { role, period, key, target } = body;
    if (!role || !period || !key) return err("role, period, key wajib diisi", 400);
    if (!["daily", "weekly", "monthly"].includes(period)) return err("period tidak valid", 400);
    if (!KPI_TARGETS[role]) return err("Role tidak ditemukan", 400);

    // If target is null/undefined → reset to base (delete override)
    if (target == null) {
      await deleteKpiTargetOverride(role, period as "daily" | "weekly" | "monthly", key);
      const cfg = await getEffectiveKpiTargets(role);
      return ok({ ok: true, reset: true, config: cfg });
    }

    const numTarget = Number(target);
    if (isNaN(numTarget) || numTarget < 0) return err("target harus angka positif", 400);

    await saveKpiTargetOverride(role, period as "daily" | "weekly" | "monthly", key, numTarget);
    const cfg = await getEffectiveKpiTargets(role);
    return ok({ ok: true, config: cfg });
  });
}
