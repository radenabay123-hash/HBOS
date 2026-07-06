"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ListTodo, Plus, Pencil, Trash2, FileSpreadsheet, FileText,
  Loader2, CalendarDays, CheckCircle2, Clock, CircleDashed, Filter,
  Search, CheckSquare, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  formatDate, formatNumber,
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
    <div className="space-y-5">
      <SectionHeader
        title="Tugas Harian"
        description="Catat dan pantau tugas harian tim. Owner melihat semua, tim melihat tugas sendiri."
        action={
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Tambah Tugas
          </Button>
        }
      />

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Tanggal
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-9 flex-1"
                  disabled={!dateFilter}
                />
                <Button
                  variant={dateFilter ? "outline" : "default"}
                  size="sm"
                  className="h-9 whitespace-nowrap"
                  onClick={() => setDateFilter(dateFilter ? "" : todayStr())}
                >
                  {dateFilter ? "Semua Tanggal" : "Hari Ini"}
                </Button>
              </div>
            </div>
            {isOwner && (
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Anggota Tim
                </Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Semua Anggota" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Anggota</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9">
                <FileText className="w-4 h-4" /> PDF
              </Button>
            </div>
          </div>

          {/* Search + Status filter + Bulk select toggle */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mt-3 pt-3 border-t border-slate-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari tugas atau progress..."
                className="pl-9 h-9 bg-white text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="min-w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Semua Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {TASK_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={bulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBulkMode(!bulkMode);
                if (bulkMode) clearSelection();
              }}
              className={cn("h-9 text-xs", bulkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white")}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {bulkMode ? "Selesai Pilih" : "Pilih Beberapa"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {bulkMode && selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          actions={[
            {
              label: "Hapus Terpilih",
              icon: Trash2,
              onClick: handleBulkDelete,
              variant: "destructive",
              confirmText: `Hapus ${selectedCount} tugas terpilih? Tindakan ini tidak dapat dibatalkan.`,
            },
          ]}
          onClearSelection={clearSelection}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Hari Ini"
          value={formatNumber(stats.total)}
          icon={ListTodo}
          indicator="neutral"
          accent="bg-slate-100 text-slate-600"
          subtitle={formatDate(dateFilter)}
        />
        <StatCard
          title="Selesai"
          value={formatNumber(stats.selesai)}
          icon={CheckCircle2}
          indicator="green"
          accent="bg-blue-50 text-blue-600"
          subtitle={`${stats.total ? Math.round((stats.selesai / stats.total) * 100) : 0}% selesai`}
        />
        <StatCard
          title="Sedang Dikerjakan"
          value={formatNumber(stats.sedang)}
          icon={Clock}
          indicator="yellow"
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Belum Dikerjakan"
          value={formatNumber(stats.belum)}
          icon={CircleDashed}
          indicator="red"
          accent="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <ListTodo className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-700 font-medium">Belum ada tugas</p>
              <p className="text-sm text-slate-500 mt-1">
                Tidak ada tugas tercatat pada tanggal {formatDate(dateFilter)}.
              </p>
              <Button onClick={openAdd} className="mt-4 bg-blue-600 hover:bg-blue-700" size="sm">
                <Plus className="w-4 h-4" /> Tambah Tugas
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Search className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-700 font-medium">Tidak ada tugas yang cocok</p>
              <p className="text-sm text-slate-500 mt-1">
                Coba ubah kata kunci atau filter status.
              </p>
            </div>
          ) : (
            <>
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50 z-10">
                  <TableRow>
                    {bulkMode && (
                      <TableHead className="w-[40px]">
                        <SelectCheckbox
                          checked={isAllSelected(paginatedItems)}
                          onChange={() => toggleAll(paginatedItems)}
                        />
                      </TableHead>
                    )}
                    <TableHead className="min-w-[200px]">Tugas</TableHead>
                    {isOwner && <TableHead>User</TableHead>}
                    <TableHead>Progress</TableHead>
                    <TableHead className="min-w-[140px]">% Selesai</TableHead>
                    <TableHead className="min-w-[160px]">Hambatan</TableHead>
                    <TableHead>Mulai</TableHead>
                    <TableHead>Selesai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((t) => {
                    const canEdit = isOwner || t.userId === user.id;
                    return (
                      <TableRow key={t.id} className="hover:bg-slate-50">
                        {bulkMode && (
                          <TableCell>
                            <SelectCheckbox
                              checked={isSelected(t)}
                              onChange={() => toggle(t)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-slate-900 align-top">
                          {t.taskHariIni}
                        </TableCell>
                        {isOwner && (
                          <TableCell className="align-top">
                            <span className="text-sm text-slate-700">{t.user?.name || "-"}</span>
                          </TableCell>
                        )}
                        <TableCell className="align-top text-sm text-slate-600 max-w-[200px]">
                          {t.progress || <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  t.persentaseSelesai >= 100 ? "bg-blue-500"
                                    : t.persentaseSelesai >= 60 ? "bg-amber-500" : "bg-rose-500"
                                )}
                                style={{ width: `${Math.min(t.persentaseSelesai ?? 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 w-9 text-right">
                              {t.persentaseSelesai ?? 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-slate-600 max-w-[220px]">
                          {t.hambatan || <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell className="align-top text-sm text-slate-600 tabular-nums">
                          {t.jamMulai || "-"}
                        </TableCell>
                        <TableCell className="align-top text-sm text-slate-600 tabular-nums">
                          {t.jamSelesai || "-"}
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="outline" className={TASK_STATUS_COLORS[t.status]}>
                            {TASK_STATUS_LABELS[t.status] || t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => openEdit(t)}
                              disabled={!canEdit}
                              title={canEdit ? "Edit" : "Tidak dapat mengedit tugas orang lain"}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(t)}
                              disabled={!canEdit}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
        </CardContent>
      </Card>

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
    </div>
  );
}
