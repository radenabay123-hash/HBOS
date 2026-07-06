"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock, LogIn, LogOut, Calendar, CheckCircle2, AlertCircle, Users,
  RefreshCw, FileText, Timer, CalendarDays, TrendingUp,
  Trash2, Search, CheckSquare, X,
} from "lucide-react";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, formatDateTime, formatDate } from "@/lib/constants";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { Pagination } from "@/components/shared/pagination";
import { SelectCheckbox } from "@/components/shared/filter-bar";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number | null;
  note: string | null;
  user: { id: string; name: string; role: string; position: string };
}

const STATUS_LABELS: Record<string, string> = {
  HADIR: "Hadir", TERLAMBAT: "Terlambat", IZIN: "Izin", SAKIT: "Sakit", ALPHA: "Alpha", CUTI: "Cuti",
};
const STATUS_COLORS: Record<string, string> = {
  HADIR: "bg-blue-100 text-blue-700 border-blue-200",
  TERLAMBAT: "bg-amber-100 text-amber-700 border-amber-200",
  IZIN: "bg-cyan-100 text-cyan-700 border-cyan-200",
  SAKIT: "bg-violet-100 text-violet-700 border-violet-200",
  ALPHA: "bg-rose-100 text-rose-700 border-rose-200",
  CUTI: "bg-slate-100 text-slate-700 border-slate-200",
};

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function AbsensiModule({ user }: { user: SafeUser }) {
  const isOwner = user.role === ROLES.OWNER;
  const now = new Date();
  // year=0 = "Semua Tahun"; month=0 = "Semua Bulan" (default = show all)
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(0);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; record: AttendanceRecord | null }>({ open: false, record: null });
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [editStatus, setEditStatus] = useState("");
  const [editNote, setEditNote] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bulkMode, setBulkMode] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Build query — only send month/year when > 0 (so 0 means "no filter / all")
      const qs = new URLSearchParams();
      if (month > 0) qs.set("month", String(month));
      if (year > 0) qs.set("year", String(year));
      const attendanceUrl = `/api/attendance${qs.toString() ? `?${qs.toString()}` : ""}`;
      const [monthData, todayData] = await Promise.all([
        api<{ attendance: AttendanceRecord[] }>(attendanceUrl),
        api<{ attendance: AttendanceRecord[] }>(`/api/attendance?date=${now.toISOString().split("T")[0]}`),
      ]);
      setRecords(monthData.attendance || []);
      setTodayRecord(todayData.attendance?.[0] || null);
      if (isOwner) {
        const u = await api<{ users: any[] }>("/api/users").catch(() => ({ users: [] }));
        setUsers(u.users.filter((x) => x.role !== "OWNER"));
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat absensi");
    } finally {
      setLoading(false);
    }
  }, [month, year, isOwner]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCheckIn() {
    setActionLoading(true);
    try {
      await api("/api/attendance/check-in", { method: "POST" });
      toast.success("Berhasil check-in!");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal check-in");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    setActionLoading(true);
    try {
      await api("/api/attendance/check-out", { method: "POST" });
      toast.success("Berhasil check-out!");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal check-out");
    } finally {
      setActionLoading(false);
    }
  }

  function handleEdit(record: AttendanceRecord) {
    setEditDialog({ open: true, record });
    setEditStatus(record.status);
    setEditNote(record.note || "");
  }

  async function handleSaveEdit() {
    if (!editDialog.record) return;
    try {
      await api(`/api/attendance/${editDialog.record.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: editStatus, note: editNote }),
      });
      toast.success("Absensi diperbarui");
      setEditDialog({ open: false, record: null });
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    }
  }

  function handleExportExcel() {
    const filtered = filterUserId === "all" ? records : records.filter((r) => r.userId === filterUserId);
    const periodLabel = month > 0 ? `${monthNames[month - 1]}-${year}` : `Tahun-${year}`;
    const rows = filtered.map((r) => ({
      Tanggal: formatDate(r.date),
      Nama: r.user.name,
      Jabatan: ROLE_LABELS[r.user.role] || r.user.role,
      CheckIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString("id-ID") : "-",
      CheckOut: r.checkOut ? new Date(r.checkOut).toLocaleTimeString("id-ID") : "-",
      JamKerja: r.workHours || 0,
      Status: STATUS_LABELS[r.status] || r.status,
      Catatan: r.note || "-",
    }));
    exportToExcel(rows, `Absensi-${periodLabel}`, "Absensi");
    toast.success("Excel diunduh");
  }

  function handleExportPDF() {
    const filtered = filterUserId === "all" ? records : records.filter((r) => r.userId === filterUserId);
    const periodLabel = month > 0 ? `${monthNames[month - 1]} ${year}` : `Tahun ${year}`;
    exportToPDF(
      `Laporan Absensi - ${periodLabel}`,
      ["Tanggal", "Nama", "Jabatan", "Check In", "Check Out", "Jam Kerja", "Status", "Catatan"],
      filtered.map((r) => [
        formatDate(r.date), r.user.name, ROLE_LABELS[r.user.role] || r.user.role,
        r.checkIn ? new Date(r.checkIn).toLocaleTimeString("id-ID") : "-",
        r.checkOut ? new Date(r.checkOut).toLocaleTimeString("id-ID") : "-",
        r.workHours || 0, STATUS_LABELS[r.status] || r.status, r.note || "-",
      ]),
      `Absensi-${month > 0 ? `${monthNames[month - 1]}-${year}` : `Tahun-${year}`}`
    );
    toast.success("PDF diunduh");
  }

  const filtered = useMemo(() => {
    let r = filterUserId === "all" ? records : records.filter((r) => r.userId === filterUserId);
    if (statusFilter !== "all") r = r.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter((r) =>
        (r.user?.name || "").toLowerCase().includes(q) ||
        (r.note || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [records, filterUserId, statusFilter, search]);
  const hadir = filtered.filter((r) => r.status === "HADIR").length;
  const terlambat = filtered.filter((r) => r.status === "TERLAMBAT").length;
  const izinSakit = filtered.filter((r) => ["IZIN", "SAKIT", "CUTI"].includes(r.status)).length;
  const alpha = filtered.filter((r) => r.status === "ALPHA").length;
  const totalJam = filtered.reduce((s, r) => s + (r.workHours || 0), 0);

  // Pagination (max 15 per page)
  const {
    paginatedItems, goToPage, nextPage, prevPage, pageInfo, resetPage,
  } = usePagination(filtered, { pageSize: 15 });

  // Bulk selection (Owner-only feature)
  const {
    selectedArray, selectedCount, isSelected, toggle, toggleAll,
    clearSelection, resetSelection, isAllSelected,
  } = useBulkSelect<AttendanceRecord>({ getId: (r) => r.id });

  // Reset selection + page when client-side filters change
  useEffect(() => {
    resetSelection();
    resetPage();
  }, [search, statusFilter, filterUserId, resetSelection, resetPage]);

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedCount} data absensi terpilih?`)) return;
    let success = 0;
    let failed = 0;
    for (const id of selectedArray) {
      try {
        await api(`/api/attendance/${id}`, { method: "DELETE" });
        success++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    setBulkMode(false);
    await loadData();
    if (failed === 0) {
      toast.success(`${success} data absensi berhasil dihapus`);
    } else {
      toast.error(`${success} dihapus, ${failed} gagal`);
    }
  }

  const nowTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const isCheckedIn = todayRecord?.checkIn && !todayRecord?.checkOut;
  const isDone = todayRecord?.checkIn && todayRecord?.checkOut;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Absensi"
        description={isOwner ? "Pantau kehadiran seluruh tim" : "Catat kehadiran harian Anda"}
        action={
          <div className="flex flex-wrap gap-2">
            <select
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Bulan</option>
              {monthNames.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
            <select
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Tahun</option>
              {[2026, 2025, 2024, 2023, 2022].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={handleExportExcel}><FileText className="w-4 h-4 mr-1" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
          </div>
        }
      />

      {/* Check-in/out card for team members */}
      {!isOwner && (
        <Card className={cn("border-2 overflow-hidden shadow-sm",
          isDone ? "border-blue-300" : isCheckedIn ? "border-amber-300" : "border-blue-200")}>
          <div className={cn("px-6 py-5",
            isDone ? "bg-gradient-to-r from-blue-600 to-blue-700" :
            isCheckedIn ? "bg-gradient-to-r from-amber-500 to-orange-500" :
            "bg-gradient-to-r from-blue-600 to-blue-700")}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                  {isDone ? <CheckCircle2 className="w-8 h-8 text-white" /> : <Clock className="w-8 h-8 text-white" />}
                </div>
                <div className="text-white">
                  <p className="text-white/80 text-sm">Absensi Hari Ini</p>
                  <p className="text-xl font-bold">{formatDate(new Date().toISOString())}</p>
                  <p className="text-white/90 text-sm">Jam: <span className="font-semibold">{nowTime} WIB</span></p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {!todayRecord?.checkIn ? (
                  <Button onClick={handleCheckIn} disabled={actionLoading} size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold flex-1 sm:flex-none">
                    <LogIn className="w-5 h-5 mr-2" /> {actionLoading ? "Memproses..." : "Check In"}
                  </Button>
                ) : !todayRecord?.checkOut ? (
                  <Button onClick={handleCheckOut} disabled={actionLoading} size="lg" className="bg-white text-rose-600 hover:bg-rose-50 font-semibold flex-1 sm:flex-none">
                    <LogOut className="w-5 h-5 mr-2" /> {actionLoading ? "Memproses..." : "Check Out"}
                  </Button>
                ) : (
                  <Badge className="bg-white/20 text-white border-white/30 text-sm px-4 py-2">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Selesai Hari Ini
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {todayRecord && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100">
              <div className="bg-white p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Check In</p>
                <p className="font-bold text-blue-700 text-lg">{todayRecord.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
              </div>
              <div className="bg-white p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Check Out</p>
                <p className="font-bold text-rose-600 text-lg">{todayRecord.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
              </div>
              <div className="bg-white p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Jam Kerja</p>
                <p className="font-bold text-slate-700 text-lg">{todayRecord.workHours ? `${todayRecord.workHours}j` : "-"}</p>
              </div>
              <div className="bg-white p-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Status</p>
                <Badge variant="outline" className={cn("text-[10px] mt-1", STATUS_COLORS[todayRecord.status])}>{STATUS_LABELS[todayRecord.status] || todayRecord.status}</Badge>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Hadir" value={hadir} icon={CheckCircle2} indicator="green" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Terlambat" value={terlambat} icon={AlertCircle} indicator={terlambat > 0 ? "yellow" : "green"} accent="bg-amber-50 text-amber-600" />
        <StatCard title="Izin/Sakit/Cuti" value={izinSakit} icon={Calendar} indicator="neutral" accent="bg-cyan-50 text-cyan-600" />
        <StatCard title="Alpha" value={alpha} icon={AlertCircle} indicator={alpha > 0 ? "red" : "green"} accent="bg-rose-50 text-rose-600" />
      </div>

      {/* Owner filter */}
      {isOwner && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Filter:</span>
            <Select value={filterUserId} onValueChange={setFilterUserId}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tim</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9 bg-white"><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau catatan..."
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
        </div>
      )}

      {/* Owner: total jam kerja summary line */}
      {isOwner && (
        <div className="text-sm text-slate-400">Total jam kerja (filter aktif): <span className="font-semibold text-slate-700">{Math.round(totalJam)} jam</span></div>
      )}

      {/* Bulk Action Bar (Owner-only) */}
      {isOwner && bulkMode && selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          actions={[
            {
              label: "Hapus Terpilih",
              icon: Trash2,
              onClick: handleBulkDelete,
              variant: "destructive",
              confirmText: `Hapus ${selectedCount} data absensi terpilih? Tindakan ini tidak dapat dibatalkan.`,
            },
          ]}
          onClearSelection={clearSelection}
        />
      )}

      {/* Attendance history table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4 text-blue-600" /> Riwayat Absensi {month > 0 ? `${monthNames[month - 1]} ${year}` : `Tahun ${year}`}</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data absensi</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Tidak ada absensi yang cocok</p>
              <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci atau filter status</p>
            </div>
          ) : (
            <>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-xs text-slate-500">
                    {isOwner && bulkMode && <th className="py-2 px-2 w-10"></th>}
                    <th className="py-2 pr-2 font-medium">Tanggal</th>
                    {isOwner && <th className="py-2 px-2 font-medium">Nama</th>}
                    <th className="py-2 px-2 font-medium">Check In</th>
                    <th className="py-2 px-2 font-medium">Check Out</th>
                    <th className="py-2 px-2 font-medium">Jam</th>
                    <th className="py-2 px-2 font-medium">Status</th>
                    {isOwner && !bulkMode && <th className="py-2 pl-2 font-medium">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                      {isOwner && bulkMode && (
                        <td className="py-2 px-2">
                          <SelectCheckbox
                            checked={isSelected(r)}
                            onChange={() => toggle(r)}
                          />
                        </td>
                      )}
                      <td className="py-2 pr-2 font-medium text-slate-700">{formatDate(r.date)}</td>
                      {isOwner && <td className="py-2 px-2 text-slate-600">{r.user.name}</td>}
                      <td className="py-2 px-2 text-slate-600">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                      <td className="py-2 px-2 text-slate-600">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                      <td className="py-2 px-2 text-slate-600">{r.workHours ? `${r.workHours}j` : "-"}</td>
                      <td className="py-2 px-2"><Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status] || r.status}</Badge></td>
                      {isOwner && !bulkMode && <td className="py-2 pl-2"><Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleEdit(r)}>Edit</Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* Edit dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => setEditDialog({ open: o, record: editDialog.record })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Absensi - {editDialog.record?.user.name}</DialogTitle>
            <DialogDescription>{editDialog.record ? formatDate(editDialog.record.date) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Catatan (opsional)" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, record: null })}>Batal</Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
