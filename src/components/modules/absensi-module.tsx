"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock, LogIn, LogOut, Calendar, CheckCircle2, AlertCircle, Users,
  RefreshCw, FileText, Timer, CalendarDays, TrendingUp,
} from "lucide-react";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, formatDateTime, formatDate } from "@/lib/constants";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

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
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; record: AttendanceRecord | null }>({ open: false, record: null });
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [editStatus, setEditStatus] = useState("");
  const [editNote, setEditNote] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [monthData, todayData] = await Promise.all([
        api<{ attendance: AttendanceRecord[] }>(`/api/attendance?month=${month}&year=${year}`),
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
    exportToExcel(rows, `Absensi-${monthNames[month - 1]}-${year}`, "Absensi");
    toast.success("Excel diunduh");
  }

  function handleExportPDF() {
    const filtered = filterUserId === "all" ? records : records.filter((r) => r.userId === filterUserId);
    exportToPDF(
      `Laporan Absensi - ${monthNames[month - 1]} ${year}`,
      ["Tanggal", "Nama", "Jabatan", "Check In", "Check Out", "Jam Kerja", "Status", "Catatan"],
      filtered.map((r) => [
        formatDate(r.date), r.user.name, ROLE_LABELS[r.user.role] || r.user.role,
        r.checkIn ? new Date(r.checkIn).toLocaleTimeString("id-ID") : "-",
        r.checkOut ? new Date(r.checkOut).toLocaleTimeString("id-ID") : "-",
        r.workHours || 0, STATUS_LABELS[r.status] || r.status, r.note || "-",
      ]),
      `Absensi-${monthNames[month - 1]}-${year}`
    );
    toast.success("PDF diunduh");
  }

  const filtered = filterUserId === "all" ? records : records.filter((r) => r.userId === filterUserId);
  const hadir = filtered.filter((r) => r.status === "HADIR").length;
  const terlambat = filtered.filter((r) => r.status === "TERLAMBAT").length;
  const izinSakit = filtered.filter((r) => ["IZIN", "SAKIT", "CUTI"].includes(r.status)).length;
  const alpha = filtered.filter((r) => r.status === "ALPHA").length;
  const totalJam = filtered.reduce((s, r) => s + (r.workHours || 0), 0);

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
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{[now.getFullYear(), now.getFullYear() - 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Filter:</span>
          <Select value={filterUserId} onValueChange={setFilterUserId}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tim</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-400 ml-auto">Total jam kerja: <span className="font-semibold text-slate-700">{Math.round(totalJam)} jam</span></span>
        </div>
      )}

      {/* Attendance history table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4 text-blue-600" /> Riwayat Absensi {monthNames[month - 1]} {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data absensi</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-xs text-slate-500">
                    <th className="py-2 pr-2 font-medium">Tanggal</th>
                    {isOwner && <th className="py-2 px-2 font-medium">Nama</th>}
                    <th className="py-2 px-2 font-medium">Check In</th>
                    <th className="py-2 px-2 font-medium">Check Out</th>
                    <th className="py-2 px-2 font-medium">Jam</th>
                    <th className="py-2 px-2 font-medium">Status</th>
                    {isOwner && <th className="py-2 pl-2 font-medium">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 pr-2 font-medium text-slate-700">{formatDate(r.date)}</td>
                      {isOwner && <td className="py-2 px-2 text-slate-600">{r.user.name}</td>}
                      <td className="py-2 px-2 text-slate-600">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                      <td className="py-2 px-2 text-slate-600">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                      <td className="py-2 px-2 text-slate-600">{r.workHours ? `${r.workHours}j` : "-"}</td>
                      <td className="py-2 px-2"><Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status] || r.status}</Badge></td>
                      {isOwner && <td className="py-2 pl-2"><Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleEdit(r)}>Edit</Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
