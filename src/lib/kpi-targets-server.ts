// Server-only KPI target helpers that depend on the database.
// This file MUST NOT be imported from client components.
import { db } from "./db";
import {
  KPI_TARGETS, KPI_OVERRIDE_SETTING_KEY,
  type RoleKpiConfig, type KpiOverrideMap,
} from "./kpi-targets";

// Fetch overrides from DB (returns empty map if none/error)
export async function getKpiTargetOverrides(): Promise<KpiOverrideMap> {
  try {
    const row = await db.appSetting.findUnique({ where: { key: KPI_OVERRIDE_SETTING_KEY } });
    if (!row?.value) return {};
    return JSON.parse(row.value) as KpiOverrideMap;
  } catch {
    return {};
  }
}

// Merge base KPI_TARGETS with overrides for a role. Returns a deep-cloned
// config so callers can mutate freely without affecting the shared base.
export async function getEffectiveKpiTargets(role: string): Promise<RoleKpiConfig | null> {
  const base = KPI_TARGETS[role];
  if (!base) return null;
  const overrides = await getKpiTargetOverrides();
  const roleOverrides = overrides[role];
  if (!roleOverrides) {
    return {
      ...base,
      daily: base.daily.map((t) => ({ ...t })),
      weekly: base.weekly.map((t) => ({ ...t })),
      monthly: base.monthly.map((t) => ({ ...t })),
      dailySchedule: base.dailySchedule.map((s) => ({ ...s })),
      uploadSchedule: base.uploadSchedule?.map((s) => ({ ...s })),
      monthlySocial: base.monthlySocial ? { ...base.monthlySocial } : undefined,
    };
  }
  const merge = (period: "daily" | "weekly" | "monthly") =>
    base[period].map((t) => {
      const ov = roleOverrides[period]?.[t.key];
      return ov != null ? { ...t, target: Number(ov) } : { ...t };
    });
  return {
    ...base,
    dailySchedule: base.dailySchedule.map((s) => ({ ...s })),
    uploadSchedule: base.uploadSchedule?.map((s) => ({ ...s })),
    monthlySocial: base.monthlySocial ? { ...base.monthlySocial } : undefined,
    daily: merge("daily"),
    weekly: merge("weekly"),
    monthly: merge("monthly"),
  };
}

// Save a single target override (merges with existing overrides map)
export async function saveKpiTargetOverride(
  role: string,
  period: "daily" | "weekly" | "monthly",
  key: string,
  newTarget: number
): Promise<void> {
  if (!KPI_TARGETS[role]) throw new Error("Role tidak ditemukan");
  if (isNaN(newTarget) || newTarget < 0) throw new Error("Target harus angka positif");
  const current = await getKpiTargetOverrides();
  if (!current[role]) current[role] = { daily: {}, weekly: {}, monthly: {} };
  if (!current[role]![period]) current[role]![period] = {};
  current[role]![period]![key] = Number(newTarget);
  await db.appSetting.upsert({
    where: { key: KPI_OVERRIDE_SETTING_KEY },
    update: { value: JSON.stringify(current), type: "JSON", category: "KPI" },
    create: {
      key: KPI_OVERRIDE_SETTING_KEY,
      value: JSON.stringify(current),
      type: "JSON",
      category: "KPI",
      description: "KPI target overrides per role/period/metricKey",
    },
  });
}

// Delete a single target override (revert to base). Returns true if removed.
export async function deleteKpiTargetOverride(
  role: string,
  period: "daily" | "weekly" | "monthly",
  key: string
): Promise<boolean> {
  const current = await getKpiTargetOverrides();
  if (!current[role]?.[period]?.[key]) return false;
  delete current[role]![period]![key];
  await db.appSetting.upsert({
    where: { key: KPI_OVERRIDE_SETTING_KEY },
    update: { value: JSON.stringify(current), type: "JSON", category: "KPI" },
    create: {
      key: KPI_OVERRIDE_SETTING_KEY,
      value: JSON.stringify(current),
      type: "JSON",
      category: "KPI",
      description: "KPI target overrides per role/period/metricKey",
    },
  });
  return true;
}
