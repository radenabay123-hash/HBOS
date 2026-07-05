# Task 4-c — Finance & Scoreboard Modules

## Agent
Z.ai Code (subagent for task 4-c)

## Scope
Build TWO frontend-only module components for the HBOS Next.js 16 app:
1. `src/components/modules/finance-module.tsx` — Finance Management
2. `src/components/modules/scoreboard-module.tsx` — Employee Scoreboard

Backend API routes already existed; only React components were created.

## Files Created

### 1. `/home/z/my-project/src/components/modules/finance-module.tsx`
**Exports:** `FinanceModule({ user }: { user: SafeUser })`

**Features implemented:**
- SectionHeader with title "Keuangan" + 4 actions: `Target & Setting` (opens dialog), `PDF`, `Excel`, `Tambah Transaksi`.
- Period selector: year Select (2023–2026) + month Select (Jan–Des + "Semua Bulan").
- Two rows of StatCards:
  - Row 1: Pemasukan (with target subtitle + progress), Pengeluaran, Laba Bersih (with target subtitle + progress), Margin %.
  - Row 2: Target Revenue, Target Profit, Cash Flow, Forecast Sisa Tahun (avg monthly profit × remaining months).
- Indicator colors wired via `getIndicatorColor()` for revenue/profit; margin uses green/yellow/red thresholds (25/10).
- Three charts (all computed client-side from fetched transactions):
  - `BarChartCard` — Revenue vs Expense vs Profit (12 months of selected year).
  - `PieChartCard` — Pengeluaran per Kategori (with category color legend dots).
  - `AreaChartCard` — Tren Revenue (12 months, gradient fill).
- Transactions table (`max-h-[28rem] overflow-y-auto`, sticky header, custom-scroll): Tanggal, Tipe (green/red badge), Jumlah (green/red with +/- prefix), Kategori (with color dot), Deskripsi, Klien, Diinput Oleh, Aksi (Edit/Delete).
- Add/Edit Dialog: type (PEMASUKAN/PENGELUARAN), amount, category (select with 10 common categories), date, clientId (select from `/api/clients`, optional), description.
- Target & Setting Dialog: targetRevenue, targetProfit, month, year → `PUT /api/finance/settings`.
- Delete confirm via `AlertDialog`.
- Export:
  - `exportToExcel` — full transaction list (No, Tanggal, Tipe, Jumlah, Kategori, Deskripsi, Klien, DiinputOleh).
  - `exportReportPDF` — multi-section report: Ringkasan Keuangan, Grafik Bulanan, Pengeluaran per Kategori, Daftar Transaksi.
- Empty state with CTA.
- Loading spinners, sonner toast for errors/success, refresh after every mutation.

**API endpoints consumed:**
- `GET /api/finance?year=&month=` (all = omit month)
- `POST /api/finance`, `PUT /api/finance/[id]`, `DELETE /api/finance/[id]`
- `GET /api/finance/settings?year=&month=`, `PUT /api/finance/settings`
- `GET /api/clients` (for dropdown)

### 2. `/home/z/my-project/src/components/modules/scoreboard-module.tsx`
**Exports:** `ScoreboardModule(_props?: Record<string, never>)` — no props needed (called as `<ScoreboardModule />` in page.tsx).

**Features implemented:**
- SectionHeader "Scoreboard Karyawan" + description "Ranking produktivitas tim berdasarkan skor otomatis. Transparan untuk seluruh divisi."
- Period selector: 3 buttons — Bulan Ini / Tahun Ini / Semua.
- Summary StatCards: Total Skor Tim, Tugas Selesai, Rata-rata Disiplin (with indicator), Konten + Artikel.
- Top-3 Podium with 2nd/1st/3rd ordering (1st gold/emerald centered & raised), medal emojis 🥇🥈🥉, Crown/Medal/Award icons, avatar with badge, role badge using `ROLE_COLORS`, productivity score + discipline progress bar.
- Full ranking table — desktop (Table) + mobile (cards). Columns: Rank, Nama (avatar), Role (colored badge), Skor, Tugas (done/total), Disiplin (progress bar + colored badge, green≥80/yellow≥50/red<50), Konten, Artikel, Produktivitas. Sorted desc by `productivityScore`.
- Export:
  - `exportToExcel` — full ranking (Peringkat, Nama, Jabatan, Posisi, Skor, TugasSelesai, TotalTugas, Disiplin, KontenDiproduksi, ArtikelDipublish, Produktivitas).
  - `exportToPDF` — landscape single-table PDF.
- Empty state.
- Loading spinner.

**API endpoint consumed:** `GET /api/scoreboard?period=month|year|all`

## Quality Checks
- All `"use client"` components, all text in Bahasa Indonesia.
- Emerald/teal primary theme throughout; no indigo/blue used.
- Responsive: mobile-first, stat-card grid collapses to 1→2→4 columns; tables switch to mobile cards on small screens.
- Long lists use `max-h-[28rem] overflow-y-auto custom-scroll` with sticky headers.
- Loading + error states + toast notifications via sonner.
- After mutations (add/edit/delete/setting), `fetchTransactions()` or `fetchSetting()` is re-invoked.
- Lint: `bun run lint` — **0 errors, 0 warnings** after fixing a single `@typescript-eslint/no-empty-object-type` lint error (changed `_: {} = {}` to `_props?: Record<string, never>`).

## Dev log
Existing dev.log errors refer to other modules (`owner-dashboard`, `team-dashboard`, `crm-module`, `events-module`, `tasks-module`, etc.) that are owned by other agents and have not yet been created — they are not related to the finance or scoreboard modules. After creating both files, no new compile errors were introduced for these two modules.

## Stage Summary
- Finance module gives OWNER + FINANCE roles a complete keuangan workspace: CRUD transactions, monthly/period charts, target KPIs, forecast, and Excel/PDF export.
- Scoreboard module gives ALL roles a transparent productivity ranking with podium + full table + export.
- Both ready to be wired via `<FinanceModule user={user} />` and `<ScoreboardModule />` in `src/app/page.tsx` (already wired).
