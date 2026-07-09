"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarClock, Plus, MapPin, Video, Phone, User, Clock, CheckCircle2,
  X, ChevronLeft, ChevronRight, FileText, FileSpreadsheet, Trash2, Edit3,
  CalendarDays, ListChecks, AlertCircle, Loader2, ExternalLink, MessageCircle,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const TIPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; dot: string }> = {
  BRIEFING: { label: "Briefing", icon: ListChecks, color: "text-blue-700", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  MEETING: { label: "Meeting", icon: MessageCircle, color: "text-green-700", bg: "bg-green-50 border-green-200", dot: "bg-green-500" },
  EVENT: { label: "Event", icon: CalendarDays, color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  KUNJUNGAN: { label: "Kunjungan", icon: MapPin, color: "text-purple-700", bg: "bg-purple-50 border-purple-200", dot: "bg-purple-500" },
  LAINNYA: { label: "Lainnya", icon: CalendarClock, color: "text-slate-700", bg: "bg-slate-50 border-slate-200", dot: "bg-slate-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  UPCOMING: { label: "Upcoming", color: "text-slate-700", bg: "bg-slate-100" },
  IN_PROGRESS: { label: "Berlangsung", color: "text-blue-700", bg: "bg-blue-100" },
  DONE: { label: "Selesai", color: "text-green-700", bg: "bg-green-100" },
  CANCELLED: { label: "Batal", color: "text-red-700", bg: "bg-red-100" },
};

interface Agenda {
  id: string;
  tipe: string;
  judul: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string | null;
  linkMeeting: string | null;
  isOnline: boolean;
  clientId: string | null;
  picNama: string | null;
  picTelepon: string | null;
  trainerId: string | null;
  eventId: string | null;
  catatan: string | null;
  checklist: string | null;
  status: string;
  reminder: string | null;
  client?: { id: string; namaKlien: string; instansi: string | null; pic: string | null; nomorWA: string | null } | null;
  event?: { id: string; namaEvent: string; lokasi: string | null; trainer: string | null; tanggal: string } | null;
  trainer?: { id: string; name: string; role: string; phone: string | null } | null;
}

interface AgendaModuleProps {
  user: SafeUser;
}

export function AgendaModule({ user }: AgendaModuleProps) {
  const [tab, setTab] = useState("today");
  const [todayAgendas, setTodayAgendas] = useState<Agenda[]>([]);
  const [listAgendas, setListAgendas] = useState<Agenda[]>([]);
  const [calendarData, setCalendarData] = useState<Record<string, Agenda[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; agenda: Agenda | null }>({ open: false, agenda: null });
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; agenda: Agenda | null }>({ open: false, agenda: null });
  const [filterTipe, setFilterTipe] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [listMonth, setListMonth] = useState(new Date().getMonth() + 1);
  const [listYear, setListYear] = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, listRes, calRes] = await Promise.all([
        api<{ agendas: Agenda[] }>("/api/agenda/today"),
        api<{ agendas: Agenda[] }>(`/api/agenda?bulan=${listMonth}&tahun=${listYear}`),
        api<{ byDate: Record<string, Agenda[]> }>(`/api/agenda/calendar?bulan=${calMonth + 1}&tahun=${calYear}`),
      ]);
      setTodayAgendas(todayRes.agendas || []);
      setListAgendas(listRes.agendas || []);
      setCalendarData(calRes.byDate || {});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [listMonth, listYear, calMonth, calYear]);

  useEffect(() => { load(); }, [load]);

  // Stats
  const todayCount = todayAgendas.length;
  const todayDone = todayAgendas.filter(a => a.status === "DONE").length;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekCount = listAgendas.filter(a => {
    const d = new Date(a.tanggal);
    return d >= weekStart && d <= weekEnd;
  }).length;
  const monthMeetingCount = listAgendas.filter(a => a.tipe === "MEETING").length;
  const monthDoneCount = listAgendas.filter(a => a.status === "DONE").length;

  async function handleStatusChange(id: string, status: string) {
    try {
      await api(`/api/agenda/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      toast.success(status === "DONE" ? "Agenda diselesaikan" : status === "CANCELLED" ? "Agenda dibatalkan" : "Status diperbarui");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus agenda ini?")) return;
    try {
      await api(`/api/agenda/${id}`, { method: "DELETE" });
      toast.success("Agenda dihapus");
      setDetailDialog({ open: false, agenda: null });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleExport(format: "pdf" | "excel") {
    try {
      window.open(`/api/agenda/export?format=${format}&bulan=${listMonth}&tahun=${listYear}`, "_blank");
      toast.success(`Mengekspor ${format.toUpperCase()}...`);
    } catch (e: any) { toast.error(e.message); }
  }

  // Filtered list
  const filteredList = useMemo(() => {
    let r = listAgendas;
    if (filterTipe !== "all") r = r.filter(a => a.tipe === filterTipe);
    if (filterStatus !== "all") r = r.filter(a => a.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(a =>
        a.judul.toLowerCase().includes(q) ||
        (a.lokasi || "").toLowerCase().includes(q) ||
        (a.picNama || "").toLowerCase().includes(q) ||
        (a.catatan || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [listAgendas, filterTipe, filterStatus, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-blue-600" /> Agenda Pak Aqil
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola jadwal meeting, event, dan kunjungan harian Anda</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} className="bg-white">
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")} className="bg-white">
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => setDialog({ open: true, agenda: null })} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Tambah Agenda
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <CalendarClock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{todayCount}</p>
                <p className="text-xs text-slate-500">Agenda Hari Ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{weekCount}</p>
                <p className="text-xs text-slate-500">Agenda Minggu Ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{monthMeetingCount}</p>
                <p className="text-xs text-slate-500">Meeting Bulan Ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{monthDoneCount}</p>
                <p className="text-xs text-slate-500">Selesai Bulan Ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="today">Hari Ini</TabsTrigger>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
          <TabsTrigger value="list">Daftar</TabsTrigger>
        </TabsList>

        {/* === TODAY VIEW === */}
        <TabsContent value="today" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h2>
              <p className="text-xs text-slate-500">
                {todayCount > 0 ? `${todayCount} agenda · ${todayDone} selesai` : "Tidak ada agenda hari ini"}
              </p>
            </div>
          </div>

          {todayAgendas.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-12 text-center">
                <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada agenda untuk hari ini</p>
                <Button size="sm" onClick={() => setDialog({ open: true, agenda: null })} className="bg-blue-600 hover:bg-blue-700 mt-3">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Agenda
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayAgendas.map((a) => {
                const tc = TIPE_CONFIG[a.tipe] || TIPE_CONFIG.LAINNYA;
                const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.UPCOMING;
                const TipeIcon = tc.icon;
                const checklist = a.checklist ? JSON.parse(a.checklist) : [];
                const checklistDone = checklist.filter((c: any) => c.done).length;
                return (
                  <Card key={a.id} className={cn("shadow-sm border-l-4", a.status === "DONE" ? "opacity-60" : "")} style={{ borderLeftColor: tc.dot.replace("bg-", "") }}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Time column */}
                        <div className="flex flex-col items-center min-w-[60px] pt-1">
                          <span className="text-sm font-bold text-slate-900">{a.jamMulai}</span>
                          <div className="w-px h-4 bg-slate-200 my-0.5" />
                          <span className="text-xs text-slate-400">{a.jamSelesai}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={cn("text-[10px]", tc.bg, tc.color)}>
                                  <TipeIcon className="w-3 h-3 mr-0.5" /> {tc.label}
                                </Badge>
                                <Badge variant="outline" className={cn("text-[10px]", sc.bg, sc.color)}>
                                  {sc.label}
                                </Badge>
                                {a.isOnline && (
                                  <Badge variant="outline" className="text-[10px] bg-cyan-50 text-cyan-700 border-cyan-200">
                                    <Video className="w-3 h-3 mr-0.5" /> Online
                                  </Badge>
                                )}
                              </div>
                              <h3 className={cn("font-semibold text-slate-900 mt-1", a.status === "DONE" && "line-through text-slate-400")}>
                                {a.judul}
                              </h3>
                              {/* Details */}
                              <div className="mt-1.5 space-y-0.5">
                                {a.lokasi && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 shrink-0" /> {a.lokasi}
                                  </p>
                                )}
                                {a.linkMeeting && (
                                  <a href={a.linkMeeting} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> {a.linkMeeting}
                                  </a>
                                )}
                                {(a.picNama || a.client?.pic) && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3 shrink-0" /> {a.picNama || a.client?.pic}
                                    {(a.picTelepon || a.client?.nomorWA) && ` · ${a.picTelepon || a.client?.nomorWA}`}
                                  </p>
                                )}
                                {a.trainer && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3 shrink-0" /> Trainer: {a.trainer.name}
                                  </p>
                                )}
                                {checklist.length > 0 && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <ListChecks className="w-3 h-3 shrink-0" /> Checklist: {checklistDone}/{checklist.length}
                                  </p>
                                )}
                                {a.catatan && (
                                  <p className="text-xs text-slate-400 italic line-clamp-2">{a.catatan}</p>
                                )}
                              </div>
                            </div>
                            {/* Actions */}
                            <div className="flex flex-col gap-1">
                              {a.status !== "DONE" && a.status !== "CANCELLED" && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(a.id, "DONE")}>
                                    <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:bg-red-50" onClick={() => handleStatusChange(a.id, "CANCELLED")}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:bg-slate-100" onClick={() => setDetailDialog({ open: true, agenda: a })}>
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* === CALENDAR VIEW === */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(calYear, calMonth - 1, 1);
                setCalMonth(d.getMonth());
                setCalYear(d.getFullYear());
              }} className="bg-white"><ChevronLeft className="w-4 h-4" /></Button>
              <h2 className="text-lg font-bold text-slate-900 min-w-[160px] text-center">
                {monthNames[calMonth]} {calYear}
              </h2>
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(calYear, calMonth + 1, 1);
                setCalMonth(d.getMonth());
                setCalYear(d.getFullYear());
              }} className="bg-white"><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setCalMonth(new Date().getMonth()); setCalYear(new Date().getFullYear()); }} className="bg-white">
              Hari Ini
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              {(() => {
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                const today = new Date();
                const isToday = (d: number) => today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === d;
                const cells: any[] = [];
                for (let i = 0; i < firstDay; i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) {
                  const key = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  cells.push({ day: d, agendas: calendarData[key] || [] });
                }
                return (
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((cell, i) => (
                      <div key={i} className={cn(
                        "min-h-[60px] rounded-lg p-1 border text-xs",
                        cell === null ? "border-transparent" : isToday(cell.day) ? "border-blue-400 bg-blue-50" : "border-slate-100 hover:bg-slate-50",
                        cell && cell.agendas.length > 0 && "cursor-pointer"
                      )} onClick={() => {
                        if (cell && cell.agendas.length > 0) {
                          setDetailDialog({ open: true, agenda: cell.agendas[0] });
                        }
                      }}>
                        {cell && (
                          <>
                            <div className={cn("font-semibold", isToday(cell.day) ? "text-blue-700" : "text-slate-700")}>
                              {cell.day}
                            </div>
                            <div className="mt-0.5 space-y-0.5">
                              {cell.agendas.slice(0, 3).map((a: Agenda, j: number) => {
                                const tc = TIPE_CONFIG[a.tipe] || TIPE_CONFIG.LAINNYA;
                                return (
                                  <div key={j} className={cn("rounded px-1 py-0.5 text-[9px] truncate", tc.bg, tc.color)}>
                                    {a.jamMulai} {a.judul}
                                  </div>
                                );
                              })}
                              {cell.agendas.length > 3 && (
                                <div className="text-[9px] text-slate-400 text-center">+{cell.agendas.length - 3} lagi</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                {Object.entries(TIPE_CONFIG).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-full", v.dot)} />
                    <span className="text-[10px] text-slate-500">{v.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === LIST VIEW === */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterTipe} onValueChange={setFilterTipe}>
              <SelectTrigger className="w-[130px] h-9 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="BRIEFING">Briefing</SelectItem>
                <SelectItem value="MEETING">Meeting</SelectItem>
                <SelectItem value="EVENT">Event</SelectItem>
                <SelectItem value="KUNJUNGAN">Kunjungan</SelectItem>
                <SelectItem value="LAINNYA">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                <SelectItem value="IN_PROGRESS">Berlangsung</SelectItem>
                <SelectItem value="DONE">Selesai</SelectItem>
                <SelectItem value="CANCELLED">Batal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(listMonth)} onValueChange={(v) => setListMonth(Number(v))}>
              <SelectTrigger className="w-[120px] h-9 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(listYear)} onValueChange={(v) => setListYear(Number(v))}>
              <SelectTrigger className="w-[90px] h-9 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2026, 2025, 2024, 2023].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[150px]">
              <Input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari agenda..." className="h-9 bg-white pl-3 text-sm" />
            </div>
          </div>

          {/* Table */}
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {filteredList.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">Tidak ada agenda yang cocok</p>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b text-left text-xs text-slate-500">
                        <th className="py-3 px-4 font-medium">Tanggal</th>
                        <th className="py-3 px-3 font-medium">Jam</th>
                        <th className="py-3 px-3 font-medium">Tipe</th>
                        <th className="py-3 px-3 font-medium">Judul</th>
                        <th className="py-3 px-3 font-medium">Lokasi</th>
                        <th className="py-3 px-3 font-medium">PIC</th>
                        <th className="py-3 px-3 font-medium">Status</th>
                        <th className="py-3 px-3 font-medium text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredList.map((a) => {
                        const tc = TIPE_CONFIG[a.tipe] || TIPE_CONFIG.LAINNYA;
                        const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.UPCOMING;
                        const d = new Date(a.tanggal);
                        return (
                          <tr key={a.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                            <td className="py-2.5 px-4 text-slate-600 text-xs">
                              {d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-xs">{a.jamMulai}-{a.jamSelesai}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className={cn("text-[10px]", tc.bg, tc.color)}>{tc.label}</Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-900 text-xs font-medium max-w-[200px] truncate">{a.judul}</td>
                            <td className="py-2.5 px-3 text-slate-600 text-xs">{a.lokasi || (a.isOnline ? "Online" : "-")}</td>
                            <td className="py-2.5 px-3 text-slate-600 text-xs">{a.picNama || a.client?.pic || "-"}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className={cn("text-[10px]", sc.bg, sc.color)}>{sc.label}</Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex gap-0.5 justify-center">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailDialog({ open: true, agenda: a })}>
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500" onClick={() => handleDelete(a.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === CREATE/EDIT DIALOG === */}
      {dialog.open && (
        <AgendaFormDialog
          open={dialog.open}
          agenda={dialog.agenda}
          user={user}
          onOpenChange={(o) => setDialog({ open: o, agenda: dialog.agenda })}
          onSaved={() => { setDialog({ open: false, agenda: null }); load(); }}
        />
      )}

      {/* === DETAIL/EDIT DIALOG === */}
      {detailDialog.open && detailDialog.agenda && (
        <AgendaDetailDialog
          open={detailDialog.open}
          agenda={detailDialog.agenda}
          user={user}
          onOpenChange={(o) => setDetailDialog({ open: o, agenda: detailDialog.agenda })}
          onEdit={() => {
            setDialog({ open: true, agenda: detailDialog.agenda });
            setDetailDialog({ open: false, agenda: null });
          }}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onChecklistToggle={load}
        />
      )}
    </div>
  );
}

// ============================================================
// AGENDA FORM DIALOG (Create/Edit)
// ============================================================
function AgendaFormDialog({ open, agenda, user, onOpenChange, onSaved }: {
  open: boolean;
  agenda: Agenda | null;
  user: SafeUser;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    tipe: agenda?.tipe || "MEETING",
    judul: agenda?.judul || "",
    tanggal: agenda ? new Date(agenda.tanggal).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    jamMulai: agenda?.jamMulai || "08:00",
    jamSelesai: agenda?.jamSelesai || "09:00",
    lokasi: agenda?.lokasi || "",
    linkMeeting: agenda?.linkMeeting || "",
    isOnline: agenda?.isOnline || false,
    clientId: agenda?.clientId || "",
    picNama: agenda?.picNama || "",
    picTelepon: agenda?.picTelepon || "",
    trainerId: agenda?.trainerId || "",
    eventId: agenda?.eventId || "",
    catatan: agenda?.catatan || "",
    reminder: agenda?.reminder || "1JAM",
  });
  const [checklist, setChecklist] = useState<{ item: string; done: boolean }[]>(() => {
    if (agenda?.checklist) { try { return JSON.parse(agenda.checklist); } catch { return []; } }
    return [];
  });
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      api("/api/clients").then((d: any) => setClients(d.clients || [])).catch(() => {});
      api("/api/team-structure").then((d: any) => setUsers(d.users || [])).catch(() => {});
      api("/api/events").then((d: any) => setEvents(d.events || [])).catch(() => {});
    }
  }, [open]);

  function addChecklist() {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, { item: newChecklistItem, done: false }]);
    setNewChecklistItem("");
  }

  function removeChecklist(i: number) {
    setChecklist(checklist.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!form.judul.trim()) { toast.error("Judul wajib diisi"); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        clientId: form.clientId || null,
        trainerId: form.trainerId || null,
        eventId: form.eventId || null,
        checklist,
      };
      if (agenda) {
        await api(`/api/agenda/${agenda.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("Agenda diperbarui");
      } else {
        await api("/api/agenda", { method: "POST", body: JSON.stringify(body) });
        toast.success("Agenda ditambahkan");
      }
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agenda ? "Edit Agenda" : "Tambah Agenda Baru"}</DialogTitle>
          <DialogDescription>Isi detail agenda harian Anda</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Tipe */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">TIPE AGENDA</Label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(TIPE_CONFIG).map(([k, v]) => {
                const Icon = v.icon;
                return (
                  <button key={k} type="button" onClick={() => setForm({ ...form, tipe: k })}
                    className={cn("flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all",
                      form.tipe === k ? cn("border-current", v.bg, v.color) : "border-slate-200 hover:border-slate-300")}>
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-medium">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Judul */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">JUDUL AGENDA *</Label>
            <Input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} placeholder="Contoh: Meeting dengan klien" className="bg-white" />
          </div>

          {/* Tanggal & Jam */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">TANGGAL *</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="bg-white" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">JAM MULAI *</Label>
              <Input type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} className="bg-white" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">JAM SELESAI *</Label>
              <Input type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} className="bg-white" />
            </div>
          </div>

          {/* Online toggle */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
            <Switch checked={form.isOnline} onCheckedChange={(c) => setForm({ ...form, isOnline: c })} />
            <Label className="text-xs text-slate-600 cursor-pointer">Meeting Online (Zoom/Meet)</Label>
          </div>

          {/* Lokasi / Link */}
          <div className="grid grid-cols-1 gap-2">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">LOKASI</Label>
              <Input type="text" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} placeholder="Alamat atau nama tempat" className="bg-white" />
            </div>
            {form.isOnline && (
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">LINK MEETING (Zoom/Meet)</Label>
                <Input type="text" value={form.linkMeeting} onChange={(e) => setForm({ ...form, linkMeeting: e.target.value })} placeholder="https://zoom.us/j/..." className="bg-white" />
              </div>
            )}
          </div>

          {/* Peserta */}
          <div className="border-t pt-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">KETERANGAN PESERTA</p>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">KLIENTERKAIT</Label>
                <Select value={form.clientId || "none"} onValueChange={(v) => {
                  const c = clients.find(c => c.id === v);
                  setForm({ ...form, clientId: v === "none" ? "" : v, picNama: c?.pic || form.picNama, picTelepon: c?.nomorWA || form.picTelepon });
                }}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih klien (opsional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.namaKlien} {c.instansi ? `(${c.instansi})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">PIC / KONTAK</Label>
                  <Input type="text" value={form.picNama} onChange={(e) => setForm({ ...form, picNama: e.target.value })} placeholder="Nama PIC" className="bg-white" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">NO. TELEPON/WA</Label>
                  <Input type="text" value={form.picTelepon} onChange={(e) => setForm({ ...form, picTelepon: e.target.value })} placeholder="0812-xxxx-xxxx" className="bg-white" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">TRAINERTERKAIT</Label>
                <Select value={form.trainerId || "none"} onValueChange={(v) => setForm({ ...form, trainerId: v === "none" ? "" : v })}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih trainer (opsional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {users.filter(u => u.role === ROLES.OWNER || u.role === ROLES.PROJECT_MANAGER || u.role === ROLES.ASSISTANT_TRAINER).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role] || u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Event terkait */}
          <div className="border-t pt-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">EVENTTERKAIT</p>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">LINK KE EVENT</Label>
              <Select value={form.eventId || "none"} onValueChange={(v) => {
                const ev = events.find(e => e.id === v);
                setForm({ ...form, eventId: v === "none" ? "" : v, lokasi: ev?.lokasi || form.lokasi, judul: form.judul || ev?.namaEvent || "" });
              }}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih event (opsional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak ada —</SelectItem>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.namaEvent} ({new Date(e.tanggal).toLocaleDateString("id-ID")})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Catatan */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">CATATAN</Label>
            <Textarea value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Catatan tambahan..." className="bg-white min-h-[60px]" />
          </div>

          {/* Checklist */}
          <div className="border-t pt-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">CHECKLIST PERSIAPAN</p>
            <div className="space-y-1.5">
              {checklist.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox checked={c.done} onCheckedChange={(v) => setChecklist(checklist.map((x, idx) => idx === i ? { ...x, done: !!v } : x))} />
                  <span className={cn("text-sm flex-1", c.done && "line-through text-slate-400")}>{c.item}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-rose-400" onClick={() => removeChecklist(i)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <Input type="text" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklist(); } }} placeholder="Tambah checklist item..." className="bg-white h-8 text-sm" />
                <Button size="sm" variant="outline" onClick={addChecklist} className="bg-white h-8"><Plus className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>

          {/* Reminder */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">PENGINGAT</Label>
            <Select value={form.reminder || "none"} onValueChange={(v) => setForm({ ...form, reminder: v === "none" ? "" : v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tidak ada</SelectItem>
                <SelectItem value="1HARI">1 Hari sebelum</SelectItem>
                <SelectItem value="1JAM">1 Jam sebelum</SelectItem>
                <SelectItem value="30MENIT">30 Menit sebelum</SelectItem>
                <SelectItem value="15MENIT">15 Menit sebelum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-white">Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {agenda ? "Simpan Perubahan" : "Simpan Agenda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// AGENDA DETAIL DIALOG
// ============================================================
function AgendaDetailDialog({ open, agenda, user, onOpenChange, onEdit, onStatusChange, onDelete, onChecklistToggle }: {
  open: boolean;
  agenda: Agenda;
  user: SafeUser;
  onOpenChange: (o: boolean) => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onChecklistToggle: () => void;
}) {
  // Parse checklist from agenda using "adjust state during render" pattern
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [checklist, setChecklist] = useState<{ item: string; done: boolean }[]>(() => {
    try { return agenda.checklist ? JSON.parse(agenda.checklist) : []; } catch { return []; }
  });
  const [lastAgendaId, setLastAgendaId] = useState(agenda.id);
  if (agenda.id !== lastAgendaId) {
    setLastAgendaId(agenda.id);
    try { setChecklist(agenda.checklist ? JSON.parse(agenda.checklist) : []); } catch { setChecklist([]); }
  }

  async function toggleChecklist(i: number) {
    const newCl = checklist.map((c, idx) => idx === i ? { ...c, done: !c.done } : c);
    setChecklist(newCl);
    try {
      await api(`/api/agenda/${agenda.id}/checklist`, { method: "PUT", body: JSON.stringify({ checklist: newCl }) });
      onChecklistToggle();
    } catch (e: any) { toast.error(e.message); }
  }

  const tc = TIPE_CONFIG[agenda.tipe] || TIPE_CONFIG.LAINNYA;
  const sc = STATUS_CONFIG[agenda.status] || STATUS_CONFIG.UPCOMING;
  const TipeIcon = tc.icon;
  const d = new Date(agenda.tanggal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={cn("text-[10px]", tc.bg, tc.color)}>
              <TipeIcon className="w-3 h-3 mr-0.5" /> {tc.label}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", sc.bg, sc.color)}>{sc.label}</Badge>
          </div>
          <DialogTitle className="text-xl">{agenda.judul}</DialogTitle>
          <DialogDescription>
            {d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {agenda.jamMulai} - {agenda.jamSelesai}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Location */}
          {agenda.lokasi && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Lokasi</p>
                <p className="text-sm text-slate-900">{agenda.lokasi}</p>
              </div>
            </div>
          )}

          {/* Link Meeting */}
          {agenda.linkMeeting && (
            <a href={agenda.linkMeeting} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 transition-colors">
              <Video className="w-4 h-4 text-cyan-600 shrink-0" />
              <span className="text-sm text-cyan-700 flex-1 truncate">{agenda.linkMeeting}</span>
              <ExternalLink className="w-3 h-3 text-cyan-600" />
            </a>
          )}

          {/* PIC */}
          {(agenda.picNama || agenda.client?.pic) && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50">
              <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">PIC / Kontak</p>
                <p className="text-sm text-slate-900">{agenda.picNama || agenda.client?.pic}</p>
                {(agenda.picTelepon || agenda.client?.nomorWA) && (
                  <a href={`https://wa.me/${(agenda.picTelepon || agenda.client?.nomorWA || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {agenda.picTelepon || agenda.client?.nomorWA} (WhatsApp)
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Trainer */}
          {agenda.trainer && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50">
              <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Trainer</p>
                <p className="text-sm text-slate-900">{agenda.trainer.name}</p>
              </div>
            </div>
          )}

          {/* Event link */}
          {agenda.event && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50">
              <CalendarDays className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-amber-600">Event Terkait</p>
                <p className="text-sm text-slate-900">{agenda.event.namaEvent}</p>
              </div>
            </div>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Checklist Persiapan ({checklist.filter(c => c.done).length}/{checklist.length})</p>
              <div className="space-y-1.5">
                {checklist.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Checkbox checked={c.done} onCheckedChange={() => toggleChecklist(i)} />
                    <span className={cn("text-sm", c.done ? "line-through text-slate-400" : "text-slate-700")}>{c.item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catatan */}
          {agenda.catatan && (
            <div className="border-t pt-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Catatan</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{agenda.catatan}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {agenda.status !== "DONE" && agenda.status !== "CANCELLED" && (
            <>
              <Button variant="outline" size="sm" onClick={() => onStatusChange(agenda.id, "DONE")} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Selesai
              </Button>
              <Button variant="outline" size="sm" onClick={() => onStatusChange(agenda.id, "CANCELLED")} className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
                <X className="w-4 h-4 mr-1" /> Batalkan
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onDelete.bind(null, agenda.id)} className="bg-white text-rose-500 hover:bg-rose-50">
            <Trash2 className="w-4 h-4 mr-1" /> Hapus
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="bg-white">
            <Edit3 className="w-4 h-4 mr-1" /> Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
