"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ListTodo, Plus, Pencil, Trash2, FileSpreadsheet, FileText,
  Loader2, CalendarDays, CheckCircle2, Clock, CircleDashed, Filter,
  Search, CheckSquare, X, Eye, User, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import {
  ROLES, TASK_STATUS, TASK_STATUS_LABELS, TASK_STATUS_COLORS,
  formatDate, formatNumber, formatDateTime,
} from "@/lib/constants";
import type { SafeUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { Pagination } from "@/components/shared/pagination";
import { SelectCheckbox } from "@/components/shared/filter-bar";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";

interface TaskUser { id: string; name: string; role: string; }
interface Task {
  id: string;
  userId: string;
  taskHariIni: string;
  progress: string | null;
  persentaseSelesai: number;
  hambatan: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
  status: string;
  tanggal: string;
  user: TaskUser;
  createdAt?: string;
}

interface TeamMember { id: string; name: string; role: string; }

const todayStr = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  taskHariIni: "",
  progress: "",
  persentaseSelesai: 0,
  hambatan: "",
  jamMulai: "",
  jamSelesai: "",
  status: "BELUM",
  tanggal: todayStr(),
};

export function TasksModule({ user }: { user: SafeUser }) {
  const isOwner = user.role === ROLES.OWNER;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>(""); // empty = Semua Tanggal (show all by default)
  const [userFilter, setUserFilter] = useState<string>("all");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bulkMode, setBulkMode] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; item: Task | null }>({ open: false, item: null });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      if (isOwner && userFilter !== "all") params.set("userId", userFilter);
      const data = await api<{ tasks: Task[] }>(`/api/tasks?${params.toString()}`);
      setTasks(data.tasks || []);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat tugas");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, userFilter, isOwner]);

  const loadTeam = useCallback(async () => {
    if (!isOwner) return;
    try {
      const data = await api<{ users: any[] }>("/api/users");
      setTeamMembers(data.users.map((u) => ({ id: u.id, name: u.name, role: u.role })));
    } catch {}
  }, [isOwner]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { loadTeam(); }, [loadTeam]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const selesai = tasks.filter((t) => t.status === "SELESAI").length;
    const sedang = tasks.filter((t) => t.status === "SEDANG").length;
    const belum = tasks.filter((t) => t.status === "BELUM").length;
    return { total, selesai, sedang, belum };
  }, [tasks]);

  // Client-side search + status filter (on top of backend date/user filter)
  const filtered = useMemo(() => {
    let r = tasks;
    if (statusFilter !== "all") r = r.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter((t) =>
        (t.taskHariIni || "").toLowerCase().includes(q) ||
        (t.progress || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [tasks, search, statusFilter]);

  // Pagination (max 15 per page)
  const {
    paginatedItems, goToPage, nextPage, prevPage, pageInfo, resetPage,
  } = usePagination(filtered, { pageSize: 15 });

  // Bulk selection
  const {
    selectedArray, selectedCount, isSelected, toggle, toggleAll,
    clearSelection, resetSelection, isAllSelected,
  } = useBulkSelect({ getId: (t: Task) => t.id });

  // Reset selection + page when client-side filters change
  useEffect(() => {
    resetSelection();
    resetPage();
  }, [search, statusFilter, resetSelection, resetPage]);

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedCount} tugas terpilih?`)) return;
    let success = 0;
    let failed = 0;
    for (const id of selectedArray) {
      try {
        await api(`/api/tasks/${id}`, { method: "DELETE" });
        success++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    setBulkMode(false);
    await loadTasks();
    if (failed === 0) {
      toast.success(`${success} tugas berhasil dihapus`);
    } else {
      toast.error(`${success} dihapus, ${failed} gagal`);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, tanggal: dateFilter || todayStr() });
    setDialogOpen(true);
  }

  function openEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      taskHariIni: task.taskHariIni || "",
      progress: task.progress || "",
      persentaseSelesai: task.persentaseSelesai ?? 0,
      hambatan: task.hambatan || "",
      jamMulai: task.jamMulai || "",
      jamSelesai: task.jamSelesai || "",
      status: task.status || "BELUM",
      tanggal: task.tanggal ? new Date(task.tanggal).toISOString().split("T")[0] : todayStr(),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.taskHariIni.trim()) {
      toast.error("Task hari ini wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        taskHariIni: form.taskHariIni,
        progress: form.progress,
        persentaseSelesai: Number(form.persentaseSelesai) || 0,
        hambatan: form.hambatan,
        jamMulai: form.jamMulai || null,
        jamSelesai: form.jamSelesai || null,
        status: form.status,
        tanggal: form.tanggal,
      };
      if (editingId) {
        await api(`/api/tasks/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Tugas diperbarui");
      } else {
        await api("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Tugas ditambahkan");
      }
      setDialogOpen(false);
      loadTasks();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan tugas");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Hapus tugas "${task.taskHariIni.slice(0, 40)}${task.taskHariIni.length > 40 ? "..." : ""}"?`)) return;
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      toast.success("Tugas dihapus");
      loadTasks();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus tugas");
    }
  }

  function handleExportExcel() {
    if (!tasks.length) { toast.error("Tidak ada data untuk diekspor"); return; }
    const rows = tasks.map((t) => ({
      Tanggal: formatDate(t.tanggal),
      "Task Hari Ini": t.taskHariIni,
      User: t.user?.name || "-",
      Progress: t.progress || "-",
      "Persentase Selesai (%)": t.persentaseSelesai ?? 0,
      Hambatan: t.hambatan || "-",
      "Jam Mulai": t.jamMulai || "-",
      "Jam Selesai": t.jamSelesai || "-",
      Status: TASK_STATUS_LABELS[t.status] || t.status,
    }));
    exportToExcel(rows, `Tugas_Harian_${dateFilter || "all"}`, "Tugas Harian");
    toast.success("Excel diunduh");
  }

  function handleExportPDF() {
    if (!tasks.length) { toast.error("Tidak ada data untuk diekspor"); return; }
    const columns = isOwner
      ? ["Tanggal", "Task", "User", "%", "Status", "Jam Mulai", "Jam Selesai"]
      : ["Tanggal", "Task", "%", "Status", "Jam Mulai", "Jam Selesai"];
    const rows = tasks.map((t) => {
      const base = [
        formatDate(t.tanggal),
        t.taskHariIni,
        ...(isOwner ? [t.user?.name || "-"] : []),
        `${t.persentaseSelesai ?? 0}%`,
        TASK_STATUS_LABELS[t.status] || t.status,
        t.jamMulai || "-",
        t.jamSelesai || "-",
      ];
      return base;
    });
    exportToPDF(
      "Laporan Tugas Harian",
      columns,
      rows as any,
      `Tugas_Harian_${dateFilter || "all"}`,
      `Tanggal: ${dateFilter || "Semua"}`
    );
    toast.success("PDF diunduh");
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Tugas Harian"
        description="Catat dan pantau tugas harian tim. Owner melihat semua, tim melihat tugas sendiri."
        action={
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Tambah Tugas
          </Button>
        }
      />

      {/* Stats — compact inline */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><ListTodo className="w-4 h-4 text-slate-500" /></div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900">{stats.total}</p>
            <p className="text-[10px] text-slate-500 truncate">Total</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-green-600" /></div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-green-700">{stats.selesai}</p>
            <p className="text-[10px] text-slate-500 truncate">Selesai {stats.total ? `(${Math.round((stats.selesai / stats.total) * 100)}%)` : ""}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-amber-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-amber-600" /></div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-amber-700">{stats.sedang}</p>
            <p className="text-[10px] text-slate-500 truncate">Sedang</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-rose-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0"><CircleDashed className="w-4 h-4 text-rose-600" /></div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-rose-700">{stats.belum}</p>
            <p className="text-[10px] text-slate-500 truncate">Belum</p>
          </div>
        </div>
      </div>

      {/* Filter bar — single row, clean */}
      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* Date */}
            <div className="flex gap-2 sm:w-auto">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 w-full sm:w-[140px] text-xs"
                disabled={!dateFilter}
              />
              <Button
                variant={dateFilter ? "outline" : "default"}
                size="sm"
                className="h-9 whitespace-nowrap text-xs"
                onClick={() => setDateFilter(dateFilter ? "" : todayStr())}
              >
                {dateFilter ? "Semua" : "Hari Ini"}
              </Button>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            {/* Team filter */}
            {isOwner && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[160px] text-xs"><SelectValue placeholder="Semua Tim" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tim</SelectItem>
                  {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {/* Search */}
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tugas..." className="pl-8 h-9 text-xs bg-white" />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-3.5 h-3.5" /></button>}
            </div>
            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[130px] text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {TASK_STATUS.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Actions */}
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 text-xs bg-white"><FileSpreadsheet className="w-3.5 h-3.5" /></Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 text-xs bg-white"><FileText className="w-3.5 h-3.5" /></Button>
              <Button
                variant={bulkMode ? "default" : "outline"} size="sm"
                onClick={() => { setBulkMode(!bulkMode); if (bulkMode) clearSelection(); }}
                className={cn("h-9 text-xs", bulkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white")}
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {bulkMode && selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          actions={[{ label: "Hapus Terpilih", icon: Trash2, onClick: handleBulkDelete, variant: "destructive", confirmText: `Hapus ${selectedCount} tugas terpilih?` }]}
          onClearSelection={clearSelection}
        />
      )}

      {/* Task list — card-based layout (no table) */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tasks.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3"><ListTodo className="w-7 h-7 text-slate-400" /></div>
            <p className="text-slate-700 font-medium">Belum ada tugas</p>
            <p className="text-sm text-slate-500 mt-1">{dateFilter ? `Tidak ada tugas pada ${formatDate(dateFilter)}` : "Belum ada tugas tercatat"}</p>
            <Button onClick={openAdd} className="mt-4 bg-blue-600 hover:bg-blue-700" size="sm"><Plus className="w-4 h-4" /> Tambah Tugas</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3"><Search className="w-7 h-7 text-slate-400" /></div>
            <p className="text-slate-700 font-medium">Tidak ada tugas yang cocok</p>
            <p className="text-sm text-slate-500 mt-1">Coba ubah kata kunci atau filter.</p>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-2">
          {paginatedItems.map((t) => {
            const canEdit = isOwner || t.userId === user.id;
            return (
              <Card key={t.id} className="border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Checkbox (bulk mode) */}
                    {bulkMode && (
                      <div className="pt-1"><SelectCheckbox checked={isSelected(t)} onChange={() => toggle(t)} /></div>
                    )}
                    {/* Progress ring/bar */}
                    <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: t.status === "SELESAI" ? "#dcfce7" : t.status === "SEDANG" ? "#fef9c3" : "#f1f5f9" }}>
                      {t.status === "SELESAI" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : t.status === "SEDANG" ? <Clock className="w-5 h-5 text-amber-600" /> : <CircleDashed className="w-5 h-5 text-slate-400" />}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{t.taskHariIni}</p>
                          {t.progress && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.progress}</p>}
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", TASK_STATUS_COLORS[t.status])}>
                          {TASK_STATUS_LABELS[t.status] || t.status}
                        </Badge>
                      </div>
                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 flex-wrap">
                        {isOwner && t.user?.name && (
                          <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{t.user.name}</span>
                        )}
                        {t.jamMulai && (
                          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{t.jamMulai}{t.jamSelesai ? ` - ${t.jamSelesai}` : ""}</span>
                        )}
                        {t.persentaseSelesai != null && t.persentaseSelesai > 0 && (
                          <span className="font-semibold text-slate-600">{t.persentaseSelesai}%</span>
                        )}
                        {t.hambatan && (
                          <span className="flex items-center gap-1 text-amber-500 truncate max-w-[200px]"><AlertCircle className="w-2.5 h-2.5" />{t.hambatan}</span>
                        )}
                      </div>
                      {/* Progress bar */}
                      {t.persentaseSelesai != null && t.persentaseSelesai > 0 && (
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", t.persentaseSelesai >= 100 ? "bg-green-500" : t.persentaseSelesai >= 60 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${Math.min(t.persentaseSelesai, 100)}%` }} />
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    {!bulkMode && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => setPreviewDialog({ open: true, item: t })} title="Preview"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(t)} disabled={!canEdit} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(t)} disabled={!canEdit} title="Hapus"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Pagination
          currentPage={pageInfo.currentPage}
          totalPages={pageInfo.totalPages}
          totalItems={pageInfo.totalItems}
          startIndex={pageInfo.startIndex}
          endIndex={pageInfo.endIndex}
          hasNext={pageInfo.hasNext}
          hasPrev={pageInfo.hasPrev}
          onPageChange={goToPage}
          onNext={nextPage}
          onPrev={prevPage}
        />
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Tugas" : "Tambah Tugas"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Perbarui informasi tugas harian." : "Catat tugas harian Anda."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5">Task Hari Ini <span className="text-rose-500">*</span></Label>
              <Textarea
                value={form.taskHariIni}
                onChange={(e) => setForm({ ...form, taskHariIni: e.target.value })}
                placeholder="Deskripsikan tugas yang dikerjakan hari ini..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Progress</Label>
                <Input
                  value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: e.target.value })}
                  placeholder="Mis: sedang menyusun draft..."
                />
              </div>
              <div>
                <Label className="mb-1.5">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Persentase Selesai</Label>
                <span className="text-sm font-semibold text-blue-700">{form.persentaseSelesai}%</span>
              </div>
              <Slider
                value={[form.persentaseSelesai]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setForm({ ...form, persentaseSelesai: v[0] })}
                className="[&_[role=slider]]:bg-blue-600"
              />
            </div>

            <div>
              <Label className="mb-1.5">Hambatan</Label>
              <Textarea
                value={form.hambatan}
                onChange={(e) => setForm({ ...form, hambatan: e.target.value })}
                placeholder="Kendala atau hambatan yang dihadapi (opsional)..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="mb-1.5">Jam Mulai</Label>
                <Input
                  type="time"
                  value={form.jamMulai}
                  onChange={(e) => setForm({ ...form, jamMulai: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5">Jam Selesai</Label>
                <Input
                  type="time"
                  value={form.jamSelesai}
                  onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5">Tanggal</Label>
                <Input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingId ? "Simpan Perubahan" : "Tambah Tugas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(o) => setPreviewDialog({ open: o, item: previewDialog.item })}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-600" /> Preview Tugas Harian</DialogTitle>
          </DialogHeader>
          {previewDialog.item && (() => {
            const t = previewDialog.item;
            return (
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Tanggal</p>
                    <p className="text-sm text-slate-700">{formatDate(t.tanggal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">User</p>
                    <p className="text-sm text-slate-700">{t.user?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Jam Mulai</p>
                    <p className="text-sm text-slate-700">{t.jamMulai || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Jam Selesai</p>
                    <p className="text-sm text-slate-700">{t.jamSelesai || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Persentase Selesai</p>
                    <p className="text-sm text-slate-700">{t.persentaseSelesai ?? 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Status</p>
                    <Badge variant="outline" className={TASK_STATUS_COLORS[t.status]}>
                      {TASK_STATUS_LABELS[t.status] || t.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Dibuat Pada</p>
                    <p className="text-sm text-slate-700">{t.createdAt ? formatDateTime(t.createdAt) : "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Task Hari Ini</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.taskHariIni || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Progress</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.progress || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Hambatan</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.hambatan || "-"}</p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialog({ open: false, item: null })}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
