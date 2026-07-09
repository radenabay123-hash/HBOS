"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import {
  Plus, Download, Trash2, Edit3, GripVertical, CheckCircle2, Clock,
  AlertCircle, Loader2, KanbanSquare, Calendar, Flag, Save, Users, User as UserIcon,
  ClipboardList, FileText, Search, Eye, Clock3, Target, AlertTriangle, Lightbulb, NotebookPen,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, formatDate } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

const COLUMNS = [
  { id: "TODO", label: "To Do", color: "bg-slate-100 border-slate-300", headerColor: "bg-slate-500", icon: Clock },
  { id: "IN_PROGRESS", label: "Sedang Dikerjakan", color: "bg-amber-50 border-amber-300", headerColor: "bg-amber-500", icon: Loader2 },
  { id: "REVIEW", label: "Review", color: "bg-violet-50 border-violet-300", headerColor: "bg-violet-500", icon: AlertCircle },
  { id: "DONE", label: "Selesai", color: "bg-green-50 border-green-300", headerColor: "bg-green-500", icon: CheckCircle2 },
];

const PRIORITY_LABELS: Record<string, string> = { LOW: "Rendah", MEDIUM: "Sedang", HIGH: "Tinggi", URGENT: "Mendesak" };
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
  MEDIUM: "bg-blue-100 text-blue-700 border-blue-200",
  HIGH: "bg-amber-100 text-amber-700 border-amber-200",
  URGENT: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "Belum Dimulai",
  IN_PROGRESS: "Sedang Dikerjakan",
  REVIEW: "Review",
  DONE: "Selesai",
};
const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
  REVIEW: "bg-violet-100 text-violet-700 border-violet-200",
  DONE: "bg-green-100 text-green-700 border-green-200",
};

interface KanbanCard {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  dueDate: string | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  assigneeId: string | null;
  assignee?: { id: string; name: string; role: string; position: string | null } | null;
  completedBy?: { id: string; name: string } | null;
  // Daily work log fields (merged from Tugas Harian)
  tanggal: string;
  persentaseSelesai: number;
  hambatan: string | null;
  strategi: string | null;
  evaluasi: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
}

// Helper: format current date as YYYY-MM-DD (local time)
function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLong(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const EMPTY_FORM = {
  title: "", description: "", status: "TODO", priority: "MEDIUM", category: "", dueDate: "",
  assigneeId: "",
  tanggal: todayStr(),
  jamMulai: "",
  jamSelesai: "",
  persentaseSelesai: 0,
  hambatan: "",
  strategi: "",
  evaluasi: "",
};

export function KanbanModule({ user }: { user: SafeUser }) {
  const isOwner = user.role === ROLES.OWNER;
  const isLeader = isOwner || user.role === ROLES.PROJECT_MANAGER;
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; card: KanbanCard | null }>({ open: false, card: null });
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; card: KanbanCard | null }>({ open: false, card: null });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"board" | "today">("board");
  const [summaries, setSummaries] = useState<any[]>([]);
  const [summaryFilterUser, setSummaryFilterUser] = useState<string>("");
  const [summaryDateFrom, setSummaryDateFrom] = useState<string>("");
  const [summaryDateTo, setSummaryDateTo] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Hari Ini state
  const [todayFilterDate, setTodayFilterDate] = useState<string>(todayStr());
  const [todaySearch, setTodaySearch] = useState<string>("");
  const [todayFilterUser, setTodayFilterUser] = useState<string>("all");
  const [todayCards, setTodayCards] = useState<KanbanCard[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = isOwner && filterUserId !== "all"
        ? `/api/kanban?userId=${filterUserId}`
        : "/api/kanban";
      const d = await api<{ cards: KanbanCard[]; teamUsers?: any[] }>(url);
      setCards(d.cards || []);
      if (d.teamUsers) setTeamUsers(d.teamUsers);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [isOwner, filterUserId]);

  useEffect(() => { load(); }, [load]);

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    try {
      const params = new URLSearchParams();
      if (todayFilterDate) params.set("date", todayFilterDate);
      if (isOwner && todayFilterUser !== "all") params.set("userId", todayFilterUser);
      const d = await api<{ cards: KanbanCard[] }>(`/api/kanban?${params.toString()}`);
      setTodayCards(d.cards || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingToday(false); }
  }, [isOwner, todayFilterDate, todayFilterUser]);

  useEffect(() => {
    if (viewMode === "today") loadToday();
  }, [viewMode, loadToday]);

  const loadSummaries = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const params = new URLSearchParams();
      if (isLeader && summaryFilterUser) params.set("userId", summaryFilterUser);
      if (summaryDateFrom) params.set("startDate", summaryDateFrom);
      if (summaryDateTo) params.set("endDate", summaryDateTo);
      const url = `/api/kanban/daily-summary${params.toString() ? "?" + params.toString() : ""}`;
      const d = await api<{ summaries: any[] }>(url);
      setSummaries(d.summaries || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingSummary(false); }
  }, [isLeader, summaryFilterUser, summaryDateFrom, summaryDateTo]);


  function handleDownloadSummaryPDF() {
    const params = new URLSearchParams();
    if (isLeader && summaryFilterUser) params.set("userId", summaryFilterUser);
    if (summaryDateFrom) params.set("startDate", summaryDateFrom);
    if (summaryDateTo) params.set("endDate", summaryDateTo);
    const url = `/api/kanban/daily-summary/pdf${params.toString() ? "?" + params.toString() : ""}`;
    window.open(url, "_blank");
    toast.success("Laporan ringkasan harian PDF diunduh");
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const cardId = String(active.id);
    const targetColumn = String(over.id);

    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    let newStatus = targetColumn;
    if (!COLUMNS.find((c) => c.id === targetColumn)) {
      const targetCard = cards.find((c) => c.id === targetColumn);
      if (targetCard) newStatus = targetCard.status;
    }

    if (card.status === newStatus) return;

    const oldStatus = card.status;
    const isCompleting = newStatus === "DONE" && oldStatus !== "DONE";
    setCards((prev) => prev.map((c) =>
      c.id === cardId
        ? { ...c, status: newStatus, completedAt: isCompleting ? new Date().toISOString() : newStatus === "DONE" ? c.completedAt : null }
        : c
    ));

    try {
      await api(`/api/kanban/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (isCompleting) {
        toast.success(`✅ "${card.title}" selesai! Tersimpan otomatis.`);
      }
    } catch (e: any) {
      toast.error("Gagal menyimpan: " + e.message);
      setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, status: oldStatus } : c));
    }
  }

  async function handleSave() {
    if (!form.title) { toast.error("Judul wajib diisi"); return; }
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate || null,
        category: form.category || null,
        tanggal: form.tanggal || null,
        jamMulai: form.jamMulai || null,
        jamSelesai: form.jamSelesai || null,
        persentaseSelesai: Number(form.persentaseSelesai) || 0,
        hambatan: form.hambatan || null,
        strategi: form.strategi || null,
        evaluasi: form.evaluasi || null,
      };
      if (dialog.card) {
        await api(`/api/kanban/${dialog.card.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Card diperbarui");
      } else {
        await api("/api/kanban", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Card ditambahkan");
      }
      setDialog({ open: false, card: null });
      setForm({ ...EMPTY_FORM });
      load();
      if (viewMode === "today") loadToday();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus card ini?")) return;
    try { await api(`/api/kanban/${id}`, { method: "DELETE" }); toast.success("Dihapus"); load(); if (viewMode === "today") loadToday(); setPreviewDialog({ open: false, card: null }); }
    catch (e: any) { toast.error(e.message); }
  }

  function openCreate(status?: string, defaultTanggal?: string) {
    setForm({
      ...EMPTY_FORM,
      status: status || "TODO",
      assigneeId: isOwner ? "" : user.id,
      tanggal: defaultTanggal || todayStr(),
    });
    setDialog({ open: true, card: null });
  }

  function openEdit(card: KanbanCard) {
    setForm({
      title: card.title, description: card.description || "",
      status: card.status, priority: card.priority,
      category: card.category || "", dueDate: card.dueDate ? card.dueDate.slice(0, 10) : "",
      assigneeId: card.assigneeId || "",
      tanggal: card.tanggal ? card.tanggal.slice(0, 10) : todayStr(),
      jamMulai: card.jamMulai || "",
      jamSelesai: card.jamSelesai || "",
      persentaseSelesai: card.persentaseSelesai || 0,
      hambatan: card.hambatan || "",
      strategi: card.strategi || "",
      evaluasi: card.evaluasi || "",
    });
    setDialog({ open: true, card });
    setPreviewDialog({ open: false, card: null });
  }

  function openPreview(card: KanbanCard) {
    setPreviewDialog({ open: true, card });
  }

  function handleDownloadReport(period: string) {
    window.open(`/api/kanban/report?period=${period}`, "_blank");
    toast.success("Laporan PDF diunduh");
  }

  // Filtered today cards (client-side search)
  const filteredTodayCards = useMemo(() => {
    if (!todaySearch) return todayCards;
    const q = todaySearch.toLowerCase();
    return todayCards.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q) ||
      (c.category || "").toLowerCase().includes(q) ||
      (c.hambatan || "").toLowerCase().includes(q) ||
      (c.strategi || "").toLowerCase().includes(q) ||
      (c.evaluasi || "").toLowerCase().includes(q)
    );
  }, [todayCards, todaySearch]);

  // Today stats
  const todayStats = useMemo(() => ({
    total: todayCards.length,
    done: todayCards.filter((c) => c.status === "DONE").length,
    inProgress: todayCards.filter((c) => c.status === "IN_PROGRESS").length,
    todo: todayCards.filter((c) => c.status === "TODO").length,
  }), [todayCards]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  const completedCount = cards.filter((c) => c.status === "DONE").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <KanbanSquare className="w-6 h-6 text-blue-600" /> Kanban Board
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isOwner ? "Pantau pekerjaan semua tim. Pekerjaan selesai otomatis tersimpan." : "Kelola pekerjaan Anda dengan drag & drop. Pekerjaan selesai otomatis tersimpan."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {viewMode === "board" && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleDownloadReport("all")} className="bg-white">
                <Download className="w-4 h-4 mr-1" /> Laporan PDF
              </Button>
              <Button size="sm" onClick={() => openCreate()} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" /> Tambah Pekerjaan
              </Button>
            </>
          )}
          {viewMode === "today" && (
            <Button size="sm" onClick={() => openCreate("TODO", todayFilterDate)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" /> Tambah Tugas
            </Button>
          )}
          {viewMode === "summary" && (
            <Button variant="outline" size="sm" onClick={handleDownloadSummaryPDF} className="bg-white">
              <FileText className="w-4 h-4 mr-1" /> Download PDF Evaluasi
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="board" className="text-xs">
            <KanbanSquare className="w-3.5 h-3.5" /> Board
          </TabsTrigger>
          <TabsTrigger value="today" className="text-xs">
            <Calendar className="w-3.5 h-3.5" /> Hari Ini
          </TabsTrigger>
        </TabsList>

        {/* ===== BOARD TAB ===== */}
        <TabsContent value="board" className="space-y-4">
          {/* Info banner: auto-summary */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-900">
              <strong>Auto-save:</strong> Setiap pekerjaan yang dipindah ke kolom "Selesai" akan otomatis tersimpan dengan tanggal & jam. Lihat di tab <strong>Hari Ini</strong> untuk detail pekerjaan harian.
            </p>
          </div>

          {/* Owner: User filter + Team summary */}
          {isOwner && teamUsers.length > 0 && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-600" /> Lihat Pekerjaan:
                </span>
                <Select value={filterUserId} onValueChange={setFilterUserId}>
                  <SelectTrigger className="w-[200px] h-9 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📋 Semua Tim</SelectItem>
                    {teamUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterUserId !== "all" && (
                  <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => setFilterUserId("all")}>
                    Reset Filter
                  </Button>
                )}
              </div>

              {filterUserId === "all" && (
                <Card className="shadow-sm border-blue-200">
                  <CardHeader className="pb-2 bg-blue-50/50">
                    <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> Ringkasan Pekerjaan Per Anggota Tim
                    </p>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {teamUsers.map((u) => {
                        const userCards = cards.filter((c) => c.assigneeId === u.id);
                        const inProgress = userCards.filter((c) => c.status === "IN_PROGRESS").length;
                        const todo = userCards.filter((c) => c.status === "TODO").length;
                        const review = userCards.filter((c) => c.status === "REVIEW").length;
                        const done = userCards.filter((c) => c.status === "DONE").length;
                        return (
                          <button
                            key={u.id}
                            onClick={() => setFilterUserId(u.id)}
                            className="text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                {u.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                                <p className="text-[10px] text-slate-500">{ROLE_LABELS[u.role]}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-center">
                              <div className="bg-slate-50 rounded p-1">
                                <p className="text-[9px] text-slate-400">Todo</p>
                                <p className="text-sm font-bold text-slate-600">{todo}</p>
                              </div>
                              <div className="bg-amber-50 rounded p-1">
                                <p className="text-[9px] text-amber-500">Progress</p>
                                <p className="text-sm font-bold text-amber-600">{inProgress}</p>
                              </div>
                              <div className="bg-violet-50 rounded p-1">
                                <p className="text-[9px] text-violet-500">Review</p>
                                <p className="text-sm font-bold text-violet-600">{review}</p>
                              </div>
                              <div className="bg-green-50 rounded p-1">
                                <p className="text-[9px] text-green-500">Done</p>
                                <p className="text-sm font-bold text-green-600">{done}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3">
            {COLUMNS.map((col) => {
              const count = cards.filter((c) => c.status === col.id).length;
              return (
                <Card key={col.id} className={cn("border-l-4 shadow-sm", col.color)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{col.label}</p>
                      <p className="text-xl font-bold text-slate-900">{count}</p>
                    </div>
                    <col.icon className={cn("w-5 h-5", col.id === "DONE" ? "text-green-600" : col.id === "IN_PROGRESS" ? "text-amber-600" : col.id === "REVIEW" ? "text-violet-600" : "text-slate-400")} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Report filters */}
          {completedCount > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Download laporan pekerjaan selesai:</span>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleDownloadReport("week")}>7 Hari Terakhir</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleDownloadReport("month")}>Bulan Ini</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleDownloadReport("all")}>Semua</Button>
            </div>
          )}

          {/* Kanban Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {COLUMNS.map((col) => {
                const colCards = cards.filter((c) => c.status === col.id).sort((a, b) => a.position - b.position);
                return (
                  <KanbanColumn key={col.id} column={col} cards={colCards} onAdd={() => openCreate(col.id)} onEdit={openEdit} onDelete={handleDelete} onPreview={openPreview} />
                );
              })}
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="opacity-80 rotate-2">
                  {(() => {
                    const card = cards.find((c) => c.id === activeId);
                    return card ? <KanbanCardItem card={card} isOverlay /> : null;
                  })()}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* ===== HARI INI TAB ===== */}
        <TabsContent value="today" className="space-y-4">
          {/* Filters */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Tanggal</Label>
                    <Input
                      type="date"
                      value={todayFilterDate}
                      onChange={(e) => setTodayFilterDate(e.target.value)}
                      className="bg-white h-9"
                    />
                  </div>
                  {isOwner && teamUsers.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Anggota Tim</Label>
                      <Select value={todayFilterUser} onValueChange={setTodayFilterUser}>
                        <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Tim</SelectItem>
                          {teamUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role]})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Cari Tugas</Label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        type="text"
                        value={todaySearch}
                        onChange={(e) => setTodaySearch(e.target.value)}
                        placeholder="Cari judul, deskripsi, kendala..."
                        className="bg-white h-9 pl-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setTodayFilterDate(todayStr()); setTodaySearch(""); setTodayFilterUser("all"); }} className="bg-white">
                    Reset
                  </Button>
                  <Button variant="outline" size="sm" onClick={loadToday} className="bg-white">
                    <Loader2 className="w-3.5 h-3.5 mr-1" /> Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date heading */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              {todayFilterDate === todayStr() ? "Hari Ini, " : ""}
              {formatDateLong(todayFilterDate + "T00:00:00")}
            </h2>
            {todayFilterDate !== todayStr() && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setTodayFilterDate(todayStr())}>
                Kembali ke Hari Ini
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Tugas</p>
                  <p className="text-xl font-bold text-slate-900">{todayStats.total}</p>
                </div>
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-slate-400 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Belum Dimulai</p>
                  <p className="text-xl font-bold text-slate-900">{todayStats.todo}</p>
                </div>
                <Clock className="w-5 h-5 text-slate-500" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Sedang Dikerjakan</p>
                  <p className="text-xl font-bold text-slate-900">{todayStats.inProgress}</p>
                </div>
                <Loader2 className="w-5 h-5 text-amber-600" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Selesai</p>
                  <p className="text-xl font-bold text-slate-900">{todayStats.done}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </CardContent>
            </Card>
          </div>

          {/* Today cards grid */}
          {loadingToday ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredTodayCards.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada tugas pada tanggal ini</p>
                <p className="text-xs text-slate-400 mt-1">Klik "Tambah Tugas" untuk menambahkan tugas harian</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTodayCards.map((card) => (
                <TodayCardItem
                  key={card.id}
                  card={card}
                  onEdit={() => openEdit(card)}
                  onDelete={() => handleDelete(card.id)}
                  onPreview={() => openPreview(card)}
                />
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, card: dialog.card })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.card ? "Edit Pekerjaan" : "Tambah Pekerjaan Baru"}</DialogTitle>
            <DialogDescription>Isi detail pekerjaan untuk kanban board</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Judul Pekerjaan</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white" placeholder="e.g. Buat materi training leadership" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white resize-none" rows={3} placeholder="Detail pekerjaan..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Prioritas</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Kategori</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-white" placeholder="e.g. Training" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Deadline</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="bg-white" />
              </div>
            </div>
            {/* Assignee (Owner only) */}
            {isOwner && teamUsers.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Ditugaskan Kepada</Label>
                <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih anggota tim" /></SelectTrigger>
                  <SelectContent>
                    {teamUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Daily work log fields (merged from Tugas Harian) */}
            <div className="pt-2 mt-2 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                <NotebookPen className="w-3.5 h-3.5 text-blue-600" /> Log Pekerjaan Harian
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Tanggal</Label>
                    <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Jam Mulai</Label>
                    <Input type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} className="bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Jam Selesai</Label>
                    <Input type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} className="bg-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-blue-600" /> Persentase Selesai
                    </Label>
                    <span className="text-xs font-bold text-blue-700">{form.persentaseSelesai}%</span>
                  </div>
                  <Slider
                    value={[form.persentaseSelesai]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(v) => setForm({ ...form, persentaseSelesai: v[0] })}
                  />
                  <Progress value={form.persentaseSelesai} className="h-1.5" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Hambatan
                  </Label>
                  <Textarea value={form.hambatan} onChange={(e) => setForm({ ...form, hambatan: e.target.value })} className="bg-white resize-none" rows={2} placeholder="Kendala yang dihadapi..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-600" /> Strategi
                  </Label>
                  <Textarea value={form.strategi} onChange={(e) => setForm({ ...form, strategi: e.target.value })} className="bg-white resize-none" rows={2} placeholder="Strategi yang digunakan..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <NotebookPen className="w-3.5 h-3.5 text-violet-600" /> Evaluasi & Rencana Selanjutnya
                  </Label>
                  <Textarea value={form.evaluasi} onChange={(e) => setForm({ ...form, evaluasi: e.target.value })} className="bg-white resize-none" rows={2} placeholder="Evaluasi & rencana selanjutnya..." />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, card: null })}>Batal</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-1" /> Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(o) => setPreviewDialog({ open: o, card: previewDialog.card })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KanbanSquare className="w-5 h-5 text-blue-600" /> Detail Pekerjaan
            </DialogTitle>
          </DialogHeader>
          {previewDialog.card && (
            <PreviewCardDetails card={previewDialog.card} />
          )}
          {previewDialog.card && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewDialog({ open: false, card: null })}>Tutup</Button>
              <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleDelete(previewDialog.card!.id)}>
                <Trash2 className="w-4 h-4 mr-1" /> Hapus
              </Button>
              <Button onClick={() => previewDialog.card && openEdit(previewDialog.card)} className="bg-blue-600 hover:bg-blue-700">
                <Edit3 className="w-4 h-4 mr-1" /> Edit
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Kanban Column Component =====
function KanbanColumn({ column, cards, onAdd, onEdit, onDelete, onPreview }: {
  column: { id: string; label: string; color: string; headerColor: string; icon: any };
  cards: KanbanCard[];
  onAdd: () => void;
  onEdit: (card: KanbanCard) => void;
  onDelete: (id: string) => void;
  onPreview: (card: KanbanCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className={cn("rounded-xl border-2 transition-colors min-h-[400px]", isOver ? "border-blue-400 bg-blue-50/50" : column.color)}>
      {/* Column header */}
      <div className={cn("rounded-t-lg px-3 py-2 flex items-center justify-between", column.headerColor)}>
        <div className="flex items-center gap-2">
          <column.icon className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-semibold">{column.label}</span>
        </div>
        <Badge className="bg-white/20 text-white border-0 text-xs">{cards.length}</Badge>
      </div>

      {/* Cards container */}
      <div ref={setNodeRef} className="p-2 space-y-2 min-h-[300px]">
        {cards.map((card) => (
          <KanbanCardItem key={card.id} card={card} onEdit={() => onEdit(card)} onDelete={() => onDelete(card.id)} onPreview={() => onPreview(card)} />
        ))}
        {cards.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">
            <p>Kosong</p>
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="p-2 border-t border-slate-200/50">
        <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-blue-600" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
        </Button>
      </div>
    </div>
  );
}

// ===== Kanban Card Item Component =====
function KanbanCardItem({ card, onEdit, onDelete, onPreview, isOverlay }: {
  card: KanbanCard;
  onEdit?: () => void;
  onDelete?: () => void;
  onPreview?: () => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group",
        isDragging && "opacity-50",
        card.status === "DONE" && "border-l-4 border-l-green-500"
      )}
    >
      {/* Priority badge */}
      <div className="flex items-start justify-between mb-1.5">
        <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 mt-0.5" />
        <div className="flex items-center gap-1">
          {card.hambatan && (
            <span title="Ada hambatan" className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          )}
          <Badge variant="outline" className={cn("text-[9px]", PRIORITY_COLORS[card.priority])}>
            <Flag className="w-2.5 h-2.5 mr-0.5" /> {PRIORITY_LABELS[card.priority]}
          </Badge>
        </div>
      </div>

      {/* Title */}
      <p className={cn("text-sm font-medium text-slate-900 mb-1", card.status === "DONE" && "line-through text-slate-400")}>
        {card.title}
      </p>

      {/* Description */}
      {card.description && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{card.description}</p>
      )}

      {/* Progress bar */}
      {card.persentaseSelesai != null && card.persentaseSelesai > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-slate-400">Progress</span>
            <span className="text-[9px] font-bold text-blue-600">{card.persentaseSelesai}%</span>
          </div>
          <Progress value={card.persentaseSelesai} className="h-1" />
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        {card.category && (
          <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-600 border-slate-200">{card.category}</Badge>
        )}
        {(card.jamMulai || card.jamSelesai) && (
          <span className="text-[10px] text-slate-500 flex items-center gap-0.5" title="Jam kerja">
            <Clock3 className="w-2.5 h-2.5" /> {card.jamMulai || "--:--"}→{card.jamSelesai || "--:--"}
          </span>
        )}
        {card.dueDate && (
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" /> {formatDate(card.dueDate)}
          </span>
        )}
        {card.completedAt && (
          <span className="text-[10px] text-green-600 flex items-center gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> {formatDate(card.completedAt)}
          </span>
        )}
      </div>

      {/* Assignee */}
      {card.assignee && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-700">
            {card.assignee.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <span className="text-[10px] text-slate-500">{card.assignee.name}</span>
        </div>
      )}

      {/* Actions (hover) */}
      {!isOverlay && onEdit && onDelete && onPreview && (
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onPointerDown={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={onPreview}><Eye className="w-3 h-3 mr-0.5" /> Lihat</Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={onEdit}><Edit3 className="w-3 h-3 mr-0.5" /> Edit</Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-rose-500" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
        </div>
      )}
    </div>
  );
}

// ===== Today Card Item Component =====
function TodayCardItem({ card, onEdit, onDelete, onPreview }: {
  card: KanbanCard;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow border-l-4",
      card.status === "DONE" ? "border-l-green-500" :
      card.status === "IN_PROGRESS" ? "border-l-amber-500" :
      card.status === "REVIEW" ? "border-l-violet-500" : "border-l-slate-400"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header: title + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold text-slate-900", card.status === "DONE" && "line-through text-slate-400")}>
              {card.title}
            </p>
            {card.category && (
              <Badge variant="outline" className="text-[9px] mt-1 bg-slate-50 text-slate-600 border-slate-200">{card.category}</Badge>
            )}
          </div>
          <Badge variant="outline" className={cn("text-[9px] shrink-0", STATUS_COLORS[card.status])}>
            {STATUS_LABELS[card.status] || card.status}
          </Badge>
        </div>

        {/* Description */}
        {card.description && (
          <p className="text-xs text-slate-500 line-clamp-2">{card.description}</p>
        )}

        {/* Priority + Assignee */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-[9px]", PRIORITY_COLORS[card.priority])}>
            <Flag className="w-2.5 h-2.5 mr-0.5" /> {PRIORITY_LABELS[card.priority]}
          </Badge>
          {card.assignee && (
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-700">
                {card.assignee.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <span className="text-[10px] text-slate-500">{card.assignee.name}</span>
            </div>
          )}
        </div>

        {/* Jam kerja */}
        {(card.jamMulai || card.jamSelesai) && (
          <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
            <Clock3 className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">{card.jamMulai || "--:--"}</span>
            <span className="text-slate-400">→</span>
            <span className="font-medium">{card.jamSelesai || "--:--"}</span>
          </div>
        )}

        {/* Progress */}
        {card.persentaseSelesai != null && card.persentaseSelesai > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Target className="w-3 h-3" /> Persentase Selesai
              </span>
              <span className="text-xs font-bold text-blue-700">{card.persentaseSelesai}%</span>
            </div>
            <Progress value={card.persentaseSelesai} className="h-1.5" />
          </div>
        )}

        {/* Hambatan */}
        {card.hambatan && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2">
            <p className="text-[10px] font-semibold text-amber-800 flex items-center gap-1 mb-0.5">
              <AlertTriangle className="w-3 h-3" /> Hambatan
            </p>
            <p className="text-xs text-amber-900">{card.hambatan}</p>
          </div>
        )}

        {/* Strategi */}
        {card.strategi && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-2">
            <p className="text-[10px] font-semibold text-yellow-800 flex items-center gap-1 mb-0.5">
              <Lightbulb className="w-3 h-3" /> Strategi
            </p>
            <p className="text-xs text-yellow-900">{card.strategi}</p>
          </div>
        )}

        {/* Evaluasi */}
        {card.evaluasi && (
          <div className="rounded-md bg-violet-50 border border-violet-200 p-2">
            <p className="text-[10px] font-semibold text-violet-800 flex items-center gap-1 mb-0.5">
              <NotebookPen className="w-3 h-3" /> Evaluasi
            </p>
            <p className="text-xs text-violet-900">{card.evaluasi}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-1 border-t border-slate-100">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs flex-1" onClick={onPreview}>
            <Eye className="w-3.5 h-3.5 mr-1" /> Detail
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs flex-1" onClick={onEdit}>
            <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-rose-500" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Preview Card Details Component =====
function PreviewCardDetails({ card }: { card: KanbanCard }) {
  return (
    <div className="space-y-3 py-2">
      {/* Title + status */}
      <div className="flex items-start justify-between gap-2">
        <h3 className={cn("text-lg font-bold text-slate-900", card.status === "DONE" && "line-through text-slate-500")}>
          {card.title}
        </h3>
        <Badge variant="outline" className={cn("text-xs shrink-0", STATUS_COLORS[card.status])}>
          {STATUS_LABELS[card.status] || card.status}
        </Badge>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={cn("text-[10px]", PRIORITY_COLORS[card.priority])}>
          <Flag className="w-3 h-3 mr-0.5" /> {PRIORITY_LABELS[card.priority]}
        </Badge>
        {card.category && (
          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">{card.category}</Badge>
        )}
      </div>

      {/* Description */}
      {card.description && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Deskripsi</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{card.description}</p>
        </div>
      )}

      {/* Assignee + dates */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {card.assignee && (
          <div>
            <p className="font-semibold text-slate-500 mb-1">Ditugaskan Kepada</p>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                {card.assignee.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <p className="font-medium text-slate-800">{card.assignee.name}</p>
                <p className="text-[10px] text-slate-500">{ROLE_LABELS[card.assignee.role]}{card.assignee.position ? ` • ${card.assignee.position}` : ""}</p>
              </div>
            </div>
          </div>
        )}
        {card.dueDate && (
          <div>
            <p className="font-semibold text-slate-500 mb-1">Deadline</p>
            <p className="text-slate-700">{formatDate(card.dueDate)}</p>
          </div>
        )}
        {card.completedAt && (
          <div>
            <p className="font-semibold text-slate-500 mb-1">Selesai Pada</p>
            <p className="text-green-700">{formatDate(card.completedAt)}</p>
            {card.completedBy && <p className="text-[10px] text-slate-500">oleh {card.completedBy.name}</p>}
          </div>
        )}
      </div>

      {/* Daily work log */}
      <div className="pt-2 mt-2 border-t border-slate-200 space-y-3">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <NotebookPen className="w-3.5 h-3.5 text-blue-600" /> Log Pekerjaan Harian
        </p>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="font-semibold text-slate-500 mb-1">Tanggal</p>
            <p className="text-slate-700">{card.tanggal ? formatDate(card.tanggal) : "-"}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-500 mb-1">Jam Mulai</p>
            <p className="text-slate-700">{card.jamMulai || "-"}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-500 mb-1">Jam Selesai</p>
            <p className="text-slate-700">{card.jamSelesai || "-"}</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Target className="w-3 h-3" /> Persentase Selesai
            </p>
            <span className="text-sm font-bold text-blue-700">{card.persentaseSelesai || 0}%</span>
          </div>
          <Progress value={card.persentaseSelesai || 0} className="h-2" />
        </div>

        {/* Hambatan */}
        {card.hambatan && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Hambatan
            </p>
            <p className="text-sm text-amber-900 whitespace-pre-wrap">{card.hambatan}</p>
          </div>
        )}

        {/* Strategi */}
        {card.strategi && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-2.5">
            <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1 mb-1">
              <Lightbulb className="w-3.5 h-3.5" /> Strategi
            </p>
            <p className="text-sm text-yellow-900 whitespace-pre-wrap">{card.strategi}</p>
          </div>
        )}

        {/* Evaluasi */}
        {card.evaluasi && (
          <div className="rounded-md bg-violet-50 border border-violet-200 p-2.5">
            <p className="text-xs font-semibold text-violet-800 flex items-center gap-1 mb-1">
              <NotebookPen className="w-3.5 h-3.5" /> Evaluasi & Rencana Selanjutnya
            </p>
            <p className="text-sm text-violet-900 whitespace-pre-wrap">{card.evaluasi}</p>
          </div>
        )}

        {/* Empty state for daily log */}
        {!card.hambatan && !card.strategi && !card.evaluasi && (!card.persentaseSelesai || card.persentaseSelesai === 0) && !card.jamMulai && !card.jamSelesai && (
          <p className="text-xs text-slate-400 italic text-center py-2">Belum ada log pekerjaan harian. Klik "Edit" untuk menambahkan.</p>
        )}
      </div>
    </div>
  );
}
