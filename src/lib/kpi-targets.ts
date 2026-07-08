// KPI Targets per Role - Daily / Weekly / Monthly
// HAFARA BUSINESS OPERATING SYSTEM (HBOS)
// NOTE: This file is PURE (no DB imports) so it can be imported from client components.
// Server-only functions live in kpi-targets-server.ts.

export interface KpiTarget {
  key: string;
  label: string;
  target: number;
  unit: string;
  // Optional: auto-derived from existing data model
  derivedFrom?: "articles" | "contentIdeas" | "clients" | "tasks";
  description?: string;
}

export interface KpiMonthlySocial {
  engagement: number;
  like: number;
  share: number;
  view: number;
  platform: string;
}

export interface ScheduleSlot {
  time: string;     // "09.00–09.15"
  activity: string; // "Daily Planning & Review CRM"
}

export interface RoleKpiConfig {
  scheduleNote: string;
  dailySchedule: ScheduleSlot[];  // NEW: daily activity timeline
  uploadSchedule?: { time: string; content: string }[];
  daily: KpiTarget[];
  weekly: KpiTarget[];
  monthly: KpiTarget[];
  monthlySocial?: KpiMonthlySocial;
}

export const KPI_TARGETS: Record<string, RoleKpiConfig> = {
  // ============================================================
  // 1. PROJECT MANAGER
  // ============================================================
  PROJECT_MANAGER: {
    scheduleNote: "Senin–Jumat, 09.00–16.00",
    dailySchedule: [
      { time: "09.00–09.15", activity: "Daily Planning & Review CRM" },
      { time: "09.15–11.15", activity: "Publish 30 Artikel Kota (3 Judul x 10 Kota)" },
      { time: "11.15–12.00", activity: "Cari 5 Database Prospek Baru" },
      { time: "12.00–13.00", activity: "Istirahat" },
      { time: "13.00–14.30", activity: "Follow Up Klien & Penawaran" },
      { time: "14.30–15.30", activity: "Update CRM & Pipeline" },
      { time: "15.30–16.00", activity: "Input KPI & Work Log" },
    ],
    daily: [
      { key: "pm_artikel_kota", label: "Publish Artikel Kota", target: 30, unit: "artikel" },
      { key: "pm_judul_artikel", label: "Judul Artikel Baru", target: 3, unit: "judul" },
      { key: "pm_prospek_baru", label: "Database Prospek Baru", target: 5, unit: "prospek" },
      { key: "pm_penawaran", label: "Penawaran Terkirim", target: 5, unit: "penawaran" },
      { key: "pm_follow_up", label: "Follow Up Klien", target: 10, unit: "follow up" },
      { key: "pm_crm_update", label: "Update CRM", target: 100, unit: "%" },
    ],
    weekly: [
      { key: "pm_w_artikel_kota", label: "Artikel Kota", target: 150, unit: "artikel" },
      { key: "pm_w_judul_artikel", label: "Judul Artikel", target: 15, unit: "judul" },
      { key: "pm_w_prospek_baru", label: "Prospek Baru", target: 25, unit: "prospek" },
      { key: "pm_w_penawaran", label: "Penawaran", target: 25, unit: "penawaran" },
      { key: "pm_w_follow_up", label: "Follow Up", target: 50, unit: "follow up" },
      { key: "pm_w_konten_magang", label: "Konten Magang (Reels/Carousel)", target: 2, unit: "konten" },
      { key: "pm_w_brosur", label: "Brosur Promosi", target: 3, unit: "brosur" },
      { key: "pm_w_sekolah", label: "Sekolah Ditawarkan Program Magang", target: 5, unit: "sekolah" },
    ],
    monthly: [
      { key: "pm_m_artikel_kota", label: "Artikel Kota", target: 600, unit: "artikel" },
      { key: "pm_m_prospek_baru", label: "Prospek Baru", target: 100, unit: "prospek" },
      { key: "pm_m_penawaran", label: "Penawaran", target: 100, unit: "penawaran" },
      { key: "pm_m_follow_up", label: "Follow Up", target: 200, unit: "follow up" },
      { key: "pm_m_sekolah", label: "Sekolah Ditawarkan Program Magang", target: 20, unit: "sekolah" },
      { key: "pm_m_konten_magang", label: "Konten Magang", target: 8, unit: "konten" },
      { key: "pm_m_brosur", label: "Brosur Promosi", target: 12, unit: "brosur" },
    ],
    monthlySocial: {
      platform: "Instagram Magang",
      engagement: 10000,
      like: 1000,
      share: 1000,
      view: 10000,
    },
  },

  // ============================================================
  // 2. ASSISTANT TRAINER (INSTAGRAM AQIL BAIHAQI)
  // ============================================================
  ASSISTANT_TRAINER: {
    scheduleNote: "Senin–Jumat, 09.00–16.00",
    dailySchedule: [
      { time: "09.00–09.40", activity: "Riset 5 Ide Konten Viral" },
      { time: "09.40–11.00", activity: "Produksi Konten" },
      { time: "11.00–12.00", activity: "Thumbnail & Caption" },
      { time: "12.00–13.00", activity: "Istirahat" },
      { time: "13.00–14.30", activity: "Editing & Scheduling" },
      { time: "14.30–15.30", activity: "Kolaborasi / Persiapan Shooting" },
      { time: "15.30–16.00", activity: "Input KPI & Work Log" },
    ],
    uploadSchedule: [
      { time: "09.00", content: "Carousel" },
      { time: "16.00", content: "Video Random" },
      { time: "20.00", content: "Video Motivasi" },
    ],
    daily: [
      { key: "at_ide_konten", label: "Ide Konten Viral", target: 5, unit: "ide" },
      { key: "at_konten_produksi", label: "Konten Diproduksi", target: 5, unit: "konten" },
      { key: "at_thumbnail", label: "Thumbnail", target: 5, unit: "thumbnail" },
      { key: "at_caption", label: "Caption Hook", target: 5, unit: "caption" },
      { key: "at_konten_jadwal", label: "Konten Terjadwal", target: 3, unit: "konten" },
    ],
    weekly: [
      { key: "at_w_ide_konten", label: "Ide Konten", target: 25, unit: "ide" },
      { key: "at_w_konten", label: "Konten", target: 25, unit: "konten" },
      { key: "at_w_thumbnail", label: "Thumbnail", target: 25, unit: "thumbnail" },
      { key: "at_w_caption", label: "Caption", target: 25, unit: "caption" },
      { key: "at_w_shooting", label: "Jadwal Shooting", target: 1, unit: "jadwal" },
      { key: "at_w_kolaborasi", label: "Kolaborasi Creator", target: 1, unit: "kolaborasi" },
    ],
    monthly: [
      { key: "at_m_ide_konten", label: "Ide Konten", target: 100, unit: "ide" },
      { key: "at_m_konten", label: "Konten", target: 100, unit: "konten" },
      { key: "at_m_thumbnail", label: "Thumbnail", target: 100, unit: "thumbnail" },
      { key: "at_m_caption", label: "Caption", target: 100, unit: "caption" },
      { key: "at_m_kolaborasi", label: "Kolaborasi Creator", target: 4, unit: "kolaborasi" },
      { key: "at_m_shooting", label: "Jadwal Shooting", target: 4, unit: "jadwal" },
    ],
    monthlySocial: {
      platform: "Instagram Aqil Baihaqi",
      engagement: 300000,
      like: 3000,
      share: 3000,
      view: 300000,
    },
  },

  // ============================================================
  // 3. CONTENT CREATIVE (TIKTOK)
  // ============================================================
  CONTENT_CREATIVE: {
    scheduleNote: "Senin–Jumat, 09.00–16.00",
    dailySchedule: [
      { time: "09.00–09.40", activity: "Riset 5 Ide Viral" },
      { time: "09.40–11.30", activity: "Produksi Konten" },
      { time: "11.30–12.00", activity: "Thumbnail" },
      { time: "12.00–13.00", activity: "Istirahat" },
      { time: "13.00–14.30", activity: "Editing" },
      { time: "14.30–15.30", activity: "Caption & Upload" },
      { time: "15.30–16.00", activity: "Input KPI & Work Log" },
    ],
    uploadSchedule: [
      { time: "09.00", content: "Carousel" },
      { time: "16.00", content: "Video Random" },
      { time: "20.00", content: "Video Motivasi" },
    ],
    daily: [
      { key: "cc_ide_viral", label: "Ide Viral", target: 5, unit: "ide" },
      { key: "cc_konten", label: "Konten", target: 5, unit: "konten" },
      { key: "cc_thumbnail", label: "Thumbnail", target: 5, unit: "thumbnail" },
      { key: "cc_caption", label: "Caption", target: 5, unit: "caption" },
    ],
    weekly: [
      { key: "cc_w_ide_viral", label: "Ide Viral", target: 25, unit: "ide" },
      { key: "cc_w_konten", label: "Konten", target: 25, unit: "konten" },
      { key: "cc_w_thumbnail", label: "Thumbnail", target: 25, unit: "thumbnail" },
      { key: "cc_w_caption", label: "Caption", target: 25, unit: "caption" },
      { key: "cc_w_batch", label: "Batch Produksi 7 Konten dalam 2 Jam", target: 1, unit: "batch" },
    ],
    monthly: [
      { key: "cc_m_ide_viral", label: "Ide Viral", target: 100, unit: "ide" },
      { key: "cc_m_konten", label: "Konten", target: 100, unit: "konten" },
      { key: "cc_m_thumbnail", label: "Thumbnail", target: 100, unit: "thumbnail" },
      { key: "cc_m_caption", label: "Caption", target: 100, unit: "caption" },
      { key: "cc_m_batch", label: "Konten Batch Production", target: 28, unit: "konten" },
    ],
    monthlySocial: {
      platform: "TikTok Aqil Baihaqi",
      engagement: 300000,
      like: 3000,
      share: 3000,
      view: 300000,
    },
  },

  // ============================================================
  // 4. DIGITAL MARKETING & IT
  // ============================================================
  DIGITAL_MARKETING_IT: {
    scheduleNote: "Senin–Jumat, 09.00–16.00",
    dailySchedule: [
      { time: "09.00–10.00", activity: "Riset Kebutuhan SDM Perusahaan" },
      { time: "10.00–11.00", activity: "Analisa Kompetitor" },
      { time: "11.00–12.00", activity: "Ide & Produksi Konten Hafara" },
      { time: "12.00–13.00", activity: "Istirahat" },
      { time: "13.00–14.00", activity: "Upload & Distribusi Konten" },
      { time: "14.00–15.00", activity: "SEO & Website Optimization" },
      { time: "15.00–16.00", activity: "KPI, Work Log & Monitoring" },
    ],
    daily: [
      { key: "dm_riset_sdm", label: "Riset SDM Perusahaan", target: 1, unit: "riset" },
      { key: "dm_analisa_kompetitor", label: "Analisa Kompetitor", target: 1, unit: "analisa" },
      { key: "dm_konten_hafara", label: "Konten Hafara Group", target: 3, unit: "konten" },
      { key: "dm_optimasi_website", label: "Optimasi Website", target: 1, unit: "optimasi" },
      { key: "dm_ide_campaign", label: "Ide Campaign Marketing", target: 1, unit: "ide" },
    ],
    weekly: [
      { key: "dm_w_konten_hafara", label: "Konten Hafara", target: 15, unit: "konten" },
      { key: "dm_w_reels_viral", label: "Reels Viral Dunia Kerja", target: 3, unit: "reels" },
      { key: "dm_w_video_testimoni", label: "Video Testimoni", target: 1, unit: "video" },
      { key: "dm_w_analisa_kompetitor", label: "Analisa Kompetitor Lengkap", target: 1, unit: "analisa" },
      { key: "dm_w_laporan_tren", label: "Laporan Tren SDM", target: 1, unit: "laporan" },
      { key: "dm_w_dokumentasi_event", label: "Dokumentasi Event Upload (H+5)", target: 1, unit: "dokumentasi" },
    ],
    monthly: [
      { key: "dm_m_konten_hafara", label: "Konten Hafara", target: 60, unit: "konten" },
      { key: "dm_m_reels_viral", label: "Reels Viral", target: 12, unit: "reels" },
      { key: "dm_m_video_testimoni", label: "Video Testimoni", target: 4, unit: "video" },
      { key: "dm_m_analisa_kompetitor", label: "Analisa Kompetitor", target: 4, unit: "analisa" },
      { key: "dm_m_laporan_tren", label: "Laporan Tren SDM", target: 4, unit: "laporan" },
      { key: "dm_m_dokumentasi_event", label: "Dokumentasi Event Terupload Tepat Waktu", target: 1, unit: "dokumentasi" },
    ],
    monthlySocial: {
      platform: "Hafara Group",
      engagement: 20000,
      like: 1000,
      share: 1000,
      view: 30000,
    },
  },

  // ============================================================
  // 5. FINANCE (mengikuti target finance yang sudah ada)
  // ============================================================
  FINANCE: {
    scheduleNote: "Senin–Jumat, 09.00–16.00",
    dailySchedule: [
      { time: "09.00–10.00", activity: "Cek & Input Pemasukan" },
      { time: "10.00–11.00", activity: "Cek & Input Pengeluaran" },
      { time: "11.00–12.00", activity: "Rekap Invoice & Piutang" },
      { time: "12.00–13.00", activity: "Istirahat" },
      { time: "13.00–14.00", activity: "Monitor Arus Kas" },
      { time: "14.00–15.00", activity: "Laporan Keuangan Harian" },
      { time: "15.00–16.00", activity: "Input KPI & Work Log" },
    ],
    daily: [
      { key: "fn_input_pemasukan", label: "Input Pemasukan", target: 1, unit: "input" },
      { key: "fn_input_pengeluaran", label: "Input Pengeluaran", target: 1, unit: "input" },
      { key: "fn_rekap_invoice", label: "Rekap Invoice", target: 1, unit: "rekap" },
      { key: "fn_monitor_piutang", label: "Monitor Piutang", target: 1, unit: "monitor" },
    ],
    weekly: [
      { key: "fn_w_laporan_cashflow", label: "Laporan Cashflow Mingguan", target: 1, unit: "laporan" },
      { key: "fn_w_rekap_invoice", label: "Rekap Invoice", target: 5, unit: "rekap" },
      { key: "fn_w_follow_up_piutang", label: "Follow Up Piutang", target: 5, unit: "follow up" },
    ],
    monthly: [
      { key: "fn_m_laporan_keuangan", label: "Laporan Keuangan Bulanan", target: 1, unit: "laporan" },
      { key: "fn_m_forecast", label: "Forecast Bulanan", target: 1, unit: "forecast" },
      { key: "fn_m_rekap_invoice", label: "Rekap Invoice", target: 20, unit: "rekap" },
      { key: "fn_m_target_revenue", label: "Target Revenue Tercapai", target: 100, unit: "%" },
    ],
  },
};

// ============================================================
// KPI SCORE WEIGHTS (untuk Dashboard Owner)
// ============================================================
export const KPI_SCORE_WEIGHTS = {
  daily: 0.30,      // Target Harian Tercapai: 30%
  weekly: 0.25,     // Target Mingguan Tercapai: 25%
  monthly: 0.25,    // Target Bulanan Tercapai: 25%
  deadline: 0.10,   // Ketepatan Deadline: 10%
  quality: 0.10,    // Kualitas Hasil (Approval Owner): 10%
};

export interface KpiCategory {
  label: string;
  color: string;       // tailwind classes for badge
  bgColor: string;     // card bg
  minScore: number;
}

export const KPI_CATEGORIES: KpiCategory[] = [
  { label: "Excellent", minScore: 90, color: "bg-blue-100 text-blue-700 border-blue-200", bgColor: "from-blue-500 to-sky-600" },
  { label: "Good", minScore: 80, color: "bg-cyan-100 text-cyan-700 border-cyan-200", bgColor: "from-cyan-500 to-blue-500" },
  { label: "Need Coaching", minScore: 70, color: "bg-amber-100 text-amber-700 border-amber-200", bgColor: "from-amber-500 to-orange-500" },
  { label: "Warning", minScore: 0, color: "bg-rose-100 text-rose-700 border-rose-200", bgColor: "from-rose-500 to-red-600" },
];

export function getKpiCategory(score: number): KpiCategory {
  for (const c of KPI_CATEGORIES) {
    if (score >= c.minScore) return c;
  }
  return KPI_CATEGORIES[KPI_CATEGORIES.length - 1];
}

export function getKpiCategoryColor(score: number): string {
  if (score >= 90) return "green";
  if (score >= 80) return "blue";
  if (score >= 70) return "yellow";
  return "red";
}

// Get targets for a role
export function getKpiTargets(role: string): RoleKpiConfig | null {
  return KPI_TARGETS[role] || null;
}

// All keys for a role's period
export function getKpiKeys(role: string, period: "daily" | "weekly" | "monthly"): string[] {
  const cfg = KPI_TARGETS[role];
  if (!cfg) return [];
  return cfg[period].map((t) => t.key);
}

// ============================================================
// KPI TARGET OVERRIDES (Owner can edit target values per role)
// Stored in AppSetting with key "kpi_targets_override" as JSON
// Shape: { [role]: { [period]: { [metricKey]: number } } }
// ============================================================

export const KPI_OVERRIDE_SETTING_KEY = "kpi_targets_override";

export type KpiOverrideMap = Record<string, Record<"daily" | "weekly" | "monthly", Record<string, number>>>;

// Parse "09.00–09.15" or "09.00-09.15" into start/end minutes from midnight
export function parseTimeRange(time: string): { startMin: number; endMin: number } | null {
  const parts = time.split(/[–—-]/).map((s) => s.trim());
  if (parts.length !== 2) return null;
  const toMin = (s: string): number | null => {
    const m = s.match(/^(\d{1,2})\.(\d{2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const startMin = toMin(parts[0]);
  const endMin = toMin(parts[1]);
  if (startMin == null || endMin == null) return null;
  return { startMin, endMin };
}

// Find current schedule slot index based on current time
export function findCurrentScheduleSlot(schedule: ScheduleSlot[], now: Date = new Date()): number {
  const curMin = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < schedule.length; i++) {
    const r = parseTimeRange(schedule[i].time);
    if (!r) continue;
    if (curMin >= r.startMin && curMin < r.endMin) return i;
  }
  return -1;
}
