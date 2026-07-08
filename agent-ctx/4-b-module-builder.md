# Task 4-b: Tasks/Content/Articles Modules

## Agent
Module Builder (Frontend - Tasks, Content, Articles)

## Scope
Build 3 React module components for HBOS Next.js 16 app, rendered inside AppShell. Backend API routes already exist.

## Files Created
1. `/home/z/my-project/src/components/modules/tasks-module.tsx`
   - Daily Task Management (Tugas Harian)
   - Date filter + owner-only user filter
   - 4 stat cards (Total, Selesai, Sedang, Belum)
   - Table with progress bars, status badges, permission-aware edit/delete
   - Add/Edit dialog with Slider for percentage, time/date inputs
   - Excel + PDF export

2. `/home/z/my-project/src/components/modules/content-module.tsx`
   - Content Management with ACC workflow (Tugas Konten)
   - 5 stat cards
   - Filters (kategori, statusACC) + Tabs (Semua/Menunggu/ACC/Revisi)
   - Responsive CARD GRID (1/2/3 cols) instead of table
   - Owner ACC/Revisi buttons + revisi dialog
   - Publish checkbox when ACC'd
   - catatanRevisi in rose box
   - Full metrik fields in dialog (reach, views, watchTime, share, save, comment, followerGrowth)
   - JSON parse/serialize for metrikKonten

3. `/home/z/my-project/src/components/modules/articles-module.tsx`
   - SEO Article Management with ACC workflow (Data Artikel)
   - 4 stat cards
   - Filters (website, statusACC, status)
   - Table with inline catatanRevisi for REVISI_ADMIN
   - Owner ACC/Revisi Admin buttons
   - Publish button only when ACC'd
   - Website select with custom "Lainnya" option

## Shared Resources Used
- `@/lib/constants`: ROLES, TASK_STATUS_*, CONTENT_CATEGORIES, PRODUCTION_STATUS_*, EDITING_STATUS, PUBLISH_STATUS, ACC_STATUS_*, WEBSITE_OPTIONS, ARTICLE_ACC_STATUS, ARTICLE_STATUS, formatDate, formatNumber
- `@/lib/api-client`: api()
- `@/lib/export-utils`: exportToExcel, exportToPDF
- `@/components/shared/stat-card`: StatCard, SectionHeader
- shadcn/ui: Button, Badge, Card, Input, Textarea, Label, Slider, Select, Dialog, Table, Tabs, Checkbox
- Icons: lucide-react
- Toast: sonner
- Auth type: SafeUser from @/lib/auth

## API Endpoints Used
- GET/POST /api/tasks (with date/userId query)
- PUT/DELETE /api/tasks/[id]
- GET /api/users (owner-only, for user filter)
- GET/POST /api/content-ideas (with statusACC/kategori query)
- PUT/DELETE /api/content-ideas/[id]
- POST /api/content-ideas/[id]/acc (owner-only, body: {statusACC, catatanRevisi})
- GET/POST /api/articles (with statusACC/status query)
- PUT/DELETE /api/articles/[id]
- POST /api/articles/[id]/acc (owner-only, body: {statusACC, catatanRevisi})

## Quality
- `bun run lint` exit 0 - no errors/warnings
- All "use client"
- Emerald theme (no blue/indigo); rose for revisi/destructive; amber for pending; teal for published
- Mobile-first responsive
- Loading states with Loader2 spinner
- Error handling via sonner toast
- Refresh data after every mutation
- All text Bahasa Indonesia
- Permission-aware (owner any, team own)

## Notes
- dev.log shows Module not found errors for OTHER parallel-agent files (team-dashboard, owner-dashboard, crm-module, events-module, finance-module, etc.) - these are NOT in scope of this task and will be resolved by their respective agents.
- Constants file has typo `ASSISTANT_TRAINTER` but task description references `ASSISTANT_TRAINER` - I used ROLES from constants.ts to avoid breaking changes.
