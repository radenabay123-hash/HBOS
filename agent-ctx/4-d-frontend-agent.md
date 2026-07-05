# Task 4-d: Team Management & Reports Modules

**Agent:** Frontend Agent (Z.ai Code)
**Task ID:** 4-d
**Files created:**
- `/home/z/my-project/src/components/modules/team-management-module.tsx`
- `/home/z/my-project/src/components/modules/reports-module.tsx`

## Summary

Built two OWNER-only feature modules for the HBOS Next.js 16 app. Both are pure frontend React (client components) that consume existing backend API routes. No backend changes were made.

### 1. team-management-module.tsx

**Exports:** `TeamManagementModule` (no props)

Features implemented:
- SectionHeader "Manajemen Tim" + description + "Tambah Anggota" button + Export PDF/Excel buttons in header action.
- Stat cards: Total Anggota, Aktif (indicator), Nonaktif (red indicator), Per Role breakdown (badges colored with `ROLE_COLORS`).
- Filter & search: text search (name/email/position) + Select role filter (Semua Role + `TEAM_ROLES`).
- Users table (sticky header, `overflow-x-auto`, `max-h-[70vh] overflow-y-auto`) with columns: Nama, Email, Role (badge colored), Posisi, Telepon, Status (Aktif/Nonaktif badge), Tugas count, Konten count, Artikel count, Bergabung (date), Aksi.
- Action buttons: Edit (Pencil), Toggle Active (Power), Delete (Trash2).
- Add dialog: form with name, email, password (required), role (Select with `TEAM_ROLES` — NOT OWNER), phone, position. Validation + toast.
- Edit dialog: same form + isActive Switch; password optional (leave blank to keep).
- Delete confirmation via AlertDialog with ShieldAlert icon; disabled state during deletion.
- Empty state with Users icon and CTA (or "no match" message when filtered).
- Loading skeleton for cards + table rows.
- Toast error handling via sonner.
- All text Bahasa Indonesia. Emerald accents.

### 2. reports-module.tsx

**Exports:** `ReportsModule` (no props)

Features implemented:
- SectionHeader "Laporan & Reporting" + description + "Download Laporan Lengkap (PDF)" button (calls `exportReportPDF` with 6 sections).
- Period selector Card: year Select (`currentYear-2 .. currentYear+1`) + month Select (includes "Semua Bulan" option value=0).
- Period label: "Bulan Tahun" or "Tahun" when Semua Bulan.
- "Semua Bulan" handling: when month=0, dashboard API is called with current month as placeholder (since API requires valid month), and UI aggregates annual totals from `monthlyData`. Effective KPIs computed via `useMemo`.
- 5-tab Tabs interface: Ringkasan Bisnis | CRM & Penjualan | Konten & Artikel | Keuangan | Tim.
- **Ringkasan Bisnis tab:** 8 KPI StatCards (Pendapatan w/ progress, Profit, Deal, Conversion, Konten, Artikel, Event, Reach), Bar chart (Pendapatan vs Pengeluaran bulanan), Bar chart (Profit bulanan), Line chart (Deal/Konten/Artikel tren), Bar chart (yearly 5-year), Monthly detail table. Export PDF (3 sections) + Excel (monthly data).
- **CRM & Penjualan tab:** 6 pipeline stage cards, 3 metric cards (Total Klien, Conversion, Revenue Deal), pipeline bar chart, deal clients with documents table (Invoice/SPK/Surat status with checkmark icons + total docs count). Export PDF + Excel.
- **Konten & Artikel tab:** 8 content KPI cards, 2 PieCharts (Konten per Kategori + Artikel per Website computed from articles list), Pending ACC lists for content & articles (scrollable, max-h-72), Published lists for both. Lazy-loads `/api/content-ideas` + `/api/articles` only when tab opened. Export PDF + Excel.
- **Keuangan tab:** 4 KPI cards (Pendapatan, Pengeluaran, Profit, Estimasi Profit/Bln with progress), Bar chart (revenue vs expense bulanan), Pie chart (Pengeluaran per Kategori computed from txns), Monthly finance table with margin badges, Transactions detail table (max 200 rows, scrollable). Lazy-loads `/api/finance?year=&month=`. Export PDF (5 sections) + Excel (transactions).
- **Tim tab:** 4 productivity cards, team productivity table with Progress bar + completion % badge colored by threshold. Export PDF + Excel.
- Loading skeleton, error toasts, all Bahasa Indonesia, emerald primary color.
- All exports use `exportToExcel` / `exportReportPDF` from `@/lib/export-utils`.
- All numbers formatted via `formatCurrency` / `formatNumber` / `formatDate`.

## Lint Status
`bun run lint` → exit 0, no errors. (Unused `FileStack` import removed.)

## Integration
- Both modules are imported in `/src/app/page.tsx` (already present):
  - `TeamManagementModule` → `case "team"`
  - `ReportsModule` → `case "reports"`
- Both routes registered in `app-shell.tsx` MENU (OWNER-only) — already present.

## Dependencies used (all pre-existing)
- `@/lib/api-client` → `api()`
- `@/lib/export-utils` → `exportToExcel`, `exportReportPDF`
- `@/lib/constants` → `ROLES, ROLE_LABELS, ROLE_COLORS, TEAM_ROLES, formatCurrency, formatNumber, formatDate`
- `@/components/shared/stat-card` → `StatCard`, `SectionHeader`
- `@/components/shared/charts` → `BarChartCard`, `LineChartCard`, `PieChartCard`
- shadcn/ui: button, input, label, badge, switch, card, skeleton, progress, table, tabs, dialog, alert-dialog, select.
- Icons: `lucide-react`. Toasts: `sonner`.

## Dev log note
The dev.log currently shows `Module not found` errors for `team-dashboard`, `crm-module`, `events-module`, `tasks-module`, `content-module`, `articles-module`, `finance-module`, `documents-module`, `scoreboard-module`, `owner-dashboard`. These are NOT my modules — they are being built by other agents (tasks 4-a, 4-b, 4-c, etc.). My two modules (`team-management-module` and `reports-module`) compile cleanly and produce no errors in dev.log.
