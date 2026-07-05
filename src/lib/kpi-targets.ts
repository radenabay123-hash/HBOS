// KPI Targets per Role - Daily / Weekly / Monthly
// HAFARA BUSINESS OPERATING SYSTEM (HBOS)

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

export interface RoleKpiConfig {
  scheduleNote: string;
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
  { label: "Excellent", minScore: 90, color: "bg-emerald-100 text-emerald-700 border-emerald-200", bgColor: "from-emerald-500 to-teal-600" },
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
