// Role & status constants for HBOS

export const ROLES = {
  OWNER: "OWNER",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  ASSISTANT_TRAINER: "ASSISTANT_TRAINER",
  CONTENT_CREATIVE: "CONTENT_CREATIVE",
  DIGITAL_MARKETING_IT: "DIGITAL_MARKETING_IT",
  FINANCE: "FINANCE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  PROJECT_MANAGER: "Project Manager",
  ASSISTANT_TRAINER: "Assistant Trainer",
  CONTENT_CREATIVE: "Content Creative",
  DIGITAL_MARKETING_IT: "Digital Marketing & IT",
  FINANCE: "Finance",
};

export const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-blue-100 text-blue-700 border-blue-200",
  PROJECT_MANAGER: "bg-violet-100 text-violet-700 border-violet-200",
  ASSISTANT_TRAINER: "bg-amber-100 text-amber-700 border-amber-200",
  CONTENT_CREATIVE: "bg-pink-100 text-pink-700 border-pink-200",
  DIGITAL_MARKETING_IT: "bg-cyan-100 text-cyan-700 border-cyan-200",
  FINANCE: "bg-sky-100 text-sky-700 border-sky-200",
};

// All non-owner roles
export const TEAM_ROLES = [
  ROLES.PROJECT_MANAGER,
  ROLES.ASSISTANT_TRAINER,
  ROLES.CONTENT_CREATIVE,
  ROLES.DIGITAL_MARKETING_IT,
  ROLES.FINANCE,
];

export const CLIENT_STATUS = [
  "LEAD",
  "FOLLOW_UP",
  "PROPOSAL",
  "NEGOTIATION",
  "DEAL",
  "LOST",
] as const;

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead",
  FOLLOW_UP: "Follow Up",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  DEAL: "Deal",
  LOST: "Lost",
};

export const CLIENT_STATUS_COLORS: Record<string, string> = {
  LEAD: "bg-slate-100 text-slate-700 border-slate-200",
  FOLLOW_UP: "bg-blue-100 text-blue-700 border-blue-200",
  PROPOSAL: "bg-amber-100 text-amber-700 border-amber-200",
  NEGOTIATION: "bg-violet-100 text-violet-700 border-violet-200",
  DEAL: "bg-blue-100 text-blue-700 border-blue-200",
  LOST: "bg-rose-100 text-rose-700 border-rose-200",
};

export const TASK_STATUS = ["BELUM", "SEDANG", "SELESAI"] as const;
export const TASK_STATUS_LABELS: Record<string, string> = {
  BELUM: "Belum Dikerjakan",
  SEDANG: "Sedang Dikerjakan",
  SELESAI: "Selesai",
};
export const TASK_STATUS_COLORS: Record<string, string> = {
  BELUM: "bg-slate-100 text-slate-700 border-slate-200",
  SEDANG: "bg-amber-100 text-amber-700 border-amber-200",
  SELESAI: "bg-blue-100 text-blue-700 border-blue-200",
};

export const EVENT_PREP_STATUS = [
  "PENDING",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
] as const;
export const EVENT_PREP_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  COMPLETED: "Completed",
};

export const CONTENT_CATEGORIES = [
  "Instagram M. Aqil Baihaqi",
  "TikTok Aqil Baihaqi",
  "Hafara Group",
  "MentorSkill",
] as const;

export const PRODUCTION_STATUS = ["IDE", "PRODUKSI", "EDITING", "SIAP_PUBLISH", "PUBLISHED"] as const;
export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  IDE: "Ide",
  PRODUKSI: "Produksi",
  EDITING: "Editing",
  SIAP_PUBLISH: "Siap Publish",
  PUBLISHED: "Published",
};

export const EDITING_STATUS = ["PENDING", "IN_PROGRESS", "DONE"] as const;
export const PUBLISH_STATUS = ["PENDING", "PUBLISHED"] as const;

export const ACC_STATUS = ["PENDING", "ACC", "REVISI"] as const;
export const ACC_STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu ACC",
  ACC: "ACC",
  REVISI: "Revisi",
};
export const ACC_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ACC: "bg-blue-100 text-blue-700 border-blue-200",
  REVISI: "bg-rose-100 text-rose-700 border-rose-200",
};

export const ARTICLE_ACC_STATUS = ["PENDING", "ACC", "REVISI_ADMIN"] as const;
export const ARTICLE_STATUS = ["DRAFT", "PUBLISHED"] as const;

export const FINANCE_TYPES = ["PEMASUKAN", "PENGELUARAN"] as const;

export const DOCUMENT_TYPES = [
  "SURAT",
  "INVOICE",
  "SPK",
  "KONTRAK",
  "KWITANSI",
  "LAINNYA",
] as const;

export const WEBSITE_OPTIONS = [
  "hafaragroup.com",
  "mentorskill.id",
  "aqilbaihaqi.com",
  "Lainnya",
] as const;

// Helper: status indicator color (green/yellow/red)
export function getIndicatorColor(value: number, target: number): string {
  if (target <= 0) return "neutral";
  const ratio = value / target;
  if (ratio >= 1) return "green";
  if (ratio >= 0.6) return "yellow";
  return "red";
}

export function getIndicatorBadge(value: number, target: number) {
  const c = getIndicatorColor(value, target);
  if (c === "green") return "bg-blue-100 text-blue-700 border-blue-200";
  if (c === "yellow") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

export function formatCurrency(n: number): string {
  if (n == null || isNaN(n)) n = 0;
  return "Rp " + n.toLocaleString("id-ID");
}

export function formatNumber(n: number): string {
  if (n == null || isNaN(n)) n = 0;
  return n.toLocaleString("id-ID");
}

export function formatDate(d: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
