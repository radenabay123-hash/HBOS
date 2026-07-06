"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import { api } from "@/lib/api-client";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import {
  ROLES,
  EVENT_PREP_STATUS,
  EVENT_PREP_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/constants";
import type { SafeUser } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Plus,
  FileText,
  FileSpreadsheet,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarCheck2,
  Clock,
  CheckCircle2,
  Inbox,
  Loader2,
  X,
  PlusCircle,
  ListChecks,
  Search,
  CheckSquare,
  Eye,
} from "lucide-react";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { Pagination } from "@/components/shared/pagination";
import { SelectCheckbox } from "@/components/shared/filter-bar";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";

interface EventItem {
  id: string;
  namaEvent: string;
  clientId?: string | null;
  tanggal: string;
  lokasi?: string | null;
  trainer?: string | null;
  assistantTrainerId?: string | null;
  statusPersiapan: string;
  checklist?: string | null;
  client?: { id: string; namaKlien: string; instansi?: string | null } | null;
  assistantTrainer?: { id: string; name: string } | null;
  createdAt: string;
}

interface ClientOption {
  id: string;
  namaKlien: string;
  instansi?: string | null;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

interface ChecklistItem {
  item: string;
  done: boolean;
}

interface EventsModuleProps {
  user: SafeUser;
}

const ASSISTANT_TRAINER_ROLE = "ASSISTANT_TRAINER";

const EVENT_PREP_BADGE_COLORS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
  READY: "bg-cyan-100 text-cyan-700 border-cyan-200",
  COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
};

const EMPTY_FORM = {
  namaEvent: "",
  clientId: "",
  tanggal: "",
  lokasi: "",
  trainer: "",
  assistantTrainerId: "",
  statusPersiapan: "PENDING",
};

function toDateTimeInput(d?: string | null): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${hh}:${mm}`;
  } catch {
    return "";
  }
}

function parseChecklist(raw?: string | null): ChecklistItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        item: String(x.item ?? ""),
        done: Boolean(x.done),
      }));
  } catch {
    return [];
  }
}

function checklistProgress(items: ChecklistItem[]): { done: number; total: number; pct: number } {
  const total = items.length;
  if (total === 0) return { done: 0, total: 0, pct: 0 };
  const done = items.filter((i) => i.done).length;
  return { done, total, pct: Math.round((done / total) * 100) };
}

const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_LABELS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function EventsModule({ user }: EventsModuleProps) {
  const canManage = user.role === ROLES.OWNER || user.role === ROLES.PROJECT_MANAGER;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; item: EventItem | null }>({ open: false, item: null });

  // Client-side search + status + month filters (for the list tab)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [bulkMode, setBulkMode] = useState(false);

  const assistantTrainerOptions = useMemo(
    () => users.filter((u) => u.role === ASSISTANT_TRAINER_ROLE),
    [users]
  );

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ events: EventItem[] }>("/api/events");
      setEvents(data.events || []);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat data event");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const data = await api<{ clients: ClientOption[] }>("/api/clients");
      setClients(data.clients || []);
    } catch {
      // ignore
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (!canManage) return;
    try {
      const data = await api<{ users: UserOption[] }>("/api/users");
      setUsers(data.users || []);
    } catch {
      // Owner-only endpoint; silently ignore (PM cannot fetch users)
    }
  }, [canManage]);

  useEffect(() => {
    loadEvents();
    loadClients();
    loadUsers();
  }, [loadEvents, loadClients, loadUsers]);

  // Stats: this month
  const stats = useMemo(() => {
    const now = new Date();
    const monthEvents = events.filter((e) => {
      try {
        const d = new Date(e.tanggal);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      } catch {
        return false;
      }
    });
    const totalThisMonth = monthEvents.length;
    const completed = monthEvents.filter((e) => e.statusPersiapan === "COMPLETED").length;
    const pending = monthEvents.filter((e) => e.statusPersiapan === "PENDING").length;
    const ready = monthEvents.filter((e) => e.statusPersiapan === "READY").length;
    return { totalThisMonth, completed, pending, ready };
  }, [events]);

  // Calendar grid: events grouped by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of events) {
      try {
        const d = new Date(e.tanggal);
        if (isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const arr = map.get(key) || [];
        arr.push(e);
        map.set(key, arr);
      } catch {}
    }
    return map;
  }, [events]);

  const calendarCells = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: Date | null; key: string | null }[] = [];
    // leading blanks
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: null, key: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ date, key });
    }
    // trailing blanks to fill weeks (multiple of 7)
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, key: null });
    }
    return cells;
  }, [calendarMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsByDate.get(selectedDay) || [];
  }, [selectedDay, eventsByDate]);

  function prevMonth() {
    setCalendarMonth((prev) => {
      const m = prev.month - 1;
      if (m < 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: m };
    });
  }

  function nextMonth() {
    setCalendarMonth((prev) => {
      const m = prev.month + 1;
      if (m > 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: m };
    });
  }

  function goToday() {
    const d = new Date();
    setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setChecklist([]);
    setNewChecklistItem("");
    setDialogOpen(true);
  }

  function openEdit(e: EventItem) {
    setEditing(e);
    setForm({
      namaEvent: e.namaEvent || "",
      clientId: e.clientId || "",
      tanggal: toDateTimeInput(e.tanggal),
      lokasi: e.lokasi || "",
      trainer: e.trainer || "",
      assistantTrainerId: e.assistantTrainerId || "",
      statusPersiapan: e.statusPersiapan || "PENDING",
    });
    setChecklist(parseChecklist(e.checklist));
    setNewChecklistItem("");
    setDialogOpen(true);
  }

  function addChecklistItem() {
    const val = newChecklistItem.trim();
    if (!val) return;
    setChecklist((prev) => [...prev, { item: val, done: false }]);
    setNewChecklistItem("");
  }

  function removeChecklistItem(idx: number) {
    setChecklist((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleChecklistItem(idx: number) {
    setChecklist((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, done: !it.done } : it))
    );
  }

  function updateChecklistItemText(idx: number, text: string) {
    setChecklist((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, item: text } : it))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.namaEvent.trim()) {
      toast.error("Nama event wajib diisi");
      return;
    }
    if (!form.tanggal) {
      toast.error("Tanggal event wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        namaEvent: form.namaEvent.trim(),
        clientId: form.clientId || null,
        tanggal: form.tanggal,
        lokasi: form.lokasi.trim() || null,
        trainer: form.trainer.trim() || null,
        assistantTrainerId: form.assistantTrainerId || null,
        statusPersiapan: form.statusPersiapan,
        checklist: checklist.filter((c) => c.item.trim() !== "").map((c) => ({ item: c.item.trim(), done: c.done })),
      };

      if (editing) {
        await api(`/api/events/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Event berhasil diperbarui");
      } else {
        await api("/api/events", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Event baru ditambahkan");
      }
      setDialogOpen(false);
      await loadEvents();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan event");
    } finally {
      setSubmitting(false);
    }
  }

  // Client-side search + status + month filter for the list view
  const filteredEvents = useMemo(() => {
    let r = events;
    if (statusFilter !== "all") r = r.filter((e) => e.statusPersiapan === statusFilter);
    if (monthFilter !== "all") {
      r = r.filter((e) => {
        try {
          const d = new Date(e.tanggal);
          if (isNaN(d.getTime())) return false;
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return ym === monthFilter;
        } catch {
          return false;
        }
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter((e) =>
        (e.namaEvent || "").toLowerCase().includes(q) ||
        (e.lokasi || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [events, search, statusFilter, monthFilter]);

  // Pagination (max 15 per page)
  const {
    paginatedItems: paginatedEvents,
    goToPage: goToEventPage,
    nextPage: nextEventPage,
    prevPage: prevEventPage,
    pageInfo: eventPageInfo,
    resetPage: resetEventPage,
  } = usePagination(filteredEvents, { pageSize: 15 });

  // Bulk selection
  const {
    selectedArray: selectedEventArray,
    selectedCount: selectedEventCount,
    isSelected: isEventSelected,
    toggle: toggleEvent,
    toggleAll: toggleAllEvents,
    clearSelection: clearEventSelection,
    resetSelection: resetEventSelection,
    isAllSelected: isAllEventsSelected,
  } = useBulkSelect({ getId: (e: EventItem) => e.id });

  // Reset selection + page when client-side filters change
  useEffect(() => {
    resetEventSelection();
    resetEventPage();
  }, [search, statusFilter, monthFilter, resetEventSelection, resetEventPage]);

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedEventCount} event terpilih?`)) return;
    let success = 0;
    let failed = 0;
    for (const id of selectedEventArray) {
      try {
        await api(`/api/events/${id}`, { method: "DELETE" });
        success++;
      } catch {
        failed++;
      }
    }
    clearEventSelection();
    setBulkMode(false);
    await loadEvents();
    if (failed === 0) {
      toast.success(`${success} event berhasil dihapus`);
    } else {
      toast.error(`${success} dihapus, ${failed} gagal`);
    }
  }

  // List of available months (YYYY-MM) from current events, descending
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      try {
        const d = new Date(e.tanggal);
        if (isNaN(d.getTime())) continue;
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        set.add(ym);
      } catch {}
    }
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [events]);

  function formatMonthLabel(ym: string): string {
    const [y, m] = ym.split("-");
    const idx = Number(m) - 1;
    if (idx < 0 || idx > 11) return ym;
    return `${MONTH_LABELS[idx]} ${y}`;
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api(`/api/events/${deleteId}`, { method: "DELETE" });
      toast.success("Event berhasil dihapus");
      setDeleteId(null);
      await loadEvents();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus event");
    } finally {
      setDeleting(false);
    }
  }

  function handleExportExcel() {
    if (events.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const rows = events.map((e) => {
      const cl = parseChecklist(e.checklist);
      const prog = checklistProgress(cl);
      return {
        "Nama Event": e.namaEvent || "",
        Klien: e.client?.namaKlien || "-",
        Tanggal: e.tanggal ? formatDateTime(e.tanggal) : "-",
        Lokasi: e.lokasi || "-",
        Trainer: e.trainer || "-",
        "Asst Trainer": e.assistantTrainer?.name || "-",
        "Status Persiapan": EVENT_PREP_LABELS[e.statusPersiapan] || e.statusPersiapan,
        "Checklist Selesai": `${prog.done}/${prog.total}`,
        "Progress (%)": prog.pct,
      };
    });
    exportToExcel(rows, `Events-${new Date().toISOString().slice(0, 10)}`, "Events");
    toast.success("Excel berhasil diekspor");
  }

  function handleExportPDF() {
    if (events.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const columns = [
      "Nama Event", "Klien", "Tanggal", "Lokasi", "Trainer",
      "Status", "Checklist",
    ];
    const rows = events.map((e) => {
      const cl = parseChecklist(e.checklist);
      const prog = checklistProgress(cl);
      return [
        e.namaEvent || "-",
        e.client?.namaKlien || "-",
        e.tanggal ? formatDate(e.tanggal) : "-",
        e.lokasi || "-",
        e.trainer || "-",
        EVENT_PREP_LABELS[e.statusPersiapan] || e.statusPersiapan,
        `${prog.done}/${prog.total} (${prog.pct}%)`,
      ];
    });
    exportToPDF(
      "Event Management",
      columns,
      rows,
      `Events-${new Date().toISOString().slice(0, 10)}.pdf`,
      `Total: ${events.length} event`
    );
    toast.success("PDF berhasil diekspor");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Event Management"
        description="Kelola jadwal event training, persiapan, checklist, dan penugasan trainer."
        action={
          canManage ? (
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Tambah Event
            </Button>
          ) : undefined
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Event Bulan Ini"
          value={stats.totalThisMonth}
          icon={CalendarDays}
          indicator="neutral"
          subtitle="Total event bulan berjalan"
          accent="bg-slate-100 text-slate-600"
        />
        <StatCard
          title="Event Selesai"
          value={stats.completed}
          icon={CheckCircle2}
          indicator="green"
          subtitle="Status: Completed"
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Event Pending"
          value={stats.pending}
          icon={Clock}
          indicator="yellow"
          subtitle="Belum diproses"
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Event Siap"
          value={stats.ready}
          icon={CalendarCheck2}
          indicator="neutral"
          subtitle="Siap pelaksanaan"
          accent="bg-cyan-50 text-cyan-600"
        />
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <TabsList>
            <TabsTrigger value="calendar">
              <CalendarDays className="w-4 h-4" /> Kalender
            </TabsTrigger>
            <TabsTrigger value="list">
              <ListChecks className="w-4 h-4" /> Daftar Event
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF} size="sm">
              <FileText className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel} size="sm">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Calendar header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Bulan sebelumnya">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Bulan berikutnya">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <h3 className="text-lg font-semibold text-slate-900 ml-2">
                        {MONTH_LABELS[calendarMonth.month]} {calendarMonth.year}
                      </h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={goToday}>
                      Hari Ini
                    </Button>
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_LABELS.map((d) => (
                      <div
                        key={d}
                        className="text-center text-xs font-semibold text-slate-500 py-2"
                      >
                        {d}
                      </div>
                    ))}
                    {calendarCells.map((cell, idx) => {
                      if (!cell.date || !cell.key) {
                        return <div key={`b-${idx}`} className="min-h-[80px] sm:min-h-[100px] rounded-md bg-slate-50/40" />;
                      }
                      const dayEvents = eventsByDate.get(cell.key) || [];
                      const isToday =
                        cell.date.toDateString() === new Date().toDateString();
                      const isSelected = selectedDay === cell.key;
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          onClick={() => setSelectedDay(isSelected ? null : cell.key)}
                          className={cn(
                            "min-h-[80px] sm:min-h-[100px] rounded-md border p-1.5 text-left transition-colors flex flex-col gap-1",
                            isSelected
                              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                              : isToday
                              ? "border-blue-300 bg-blue-50/30"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          )}
                        >
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              isToday ? "text-blue-700" : "text-slate-700"
                            )}
                          >
                            {cell.date.getDate()}
                          </span>
                          <div className="space-y-0.5 overflow-hidden">
                            {dayEvents.slice(0, 3).map((e) => (
                              <div
                                key={e.id}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  if (canManage) {
                                    openEdit(e);
                                  } else {
                                    setSelectedDay(isSelected ? null : cell.key);
                                  }
                                }}
                                className={cn(
                                  "text-[10px] truncate px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity",
                                  e.statusPersiapan === "COMPLETED"
                                    ? "bg-blue-100 text-blue-700"
                                    : e.statusPersiapan === "READY"
                                    ? "bg-cyan-100 text-cyan-700"
                                    : e.statusPersiapan === "IN_PROGRESS"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                )}
                                title={canManage ? `Klik untuk edit: ${e.namaEvent}` : e.namaEvent}
                              >
                                {e.namaEvent}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-slate-500 px-1">
                                +{dayEvents.length - 3} lainnya
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected day events */}
                  {selectedDay && (
                    <div className="mt-2 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900">
                          Event pada {formatDate(selectedDay)}
                        </h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedDay(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {selectedDayEvents.length === 0 ? (
                        <p className="text-sm text-slate-500 py-2">
                          Tidak ada event pada tanggal ini.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedDayEvents.map((e) => {
                            const prog = checklistProgress(parseChecklist(e.checklist));
                            return (
                              <div
                                key={e.id}
                                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md bg-white border border-slate-200"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 truncate">
                                    {e.namaEvent}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {e.client?.namaKlien || "Tanpa klien"} • {e.lokasi || "-"} •{" "}
                                    {formatDateTime(e.tanggal)}
                                  </p>
                                  {prog.total > 0 && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Checklist: {prog.done}/{prog.total} selesai
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={EVENT_PREP_BADGE_COLORS[e.statusPersiapan] || "bg-slate-100 text-slate-700 border-slate-200"}
                                  >
                                    {EVENT_PREP_LABELS[e.statusPersiapan] || e.statusPersiapan}
                                  </Badge>
                                  {canManage && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                        onClick={() => openEdit(e)}
                                        title="Edit Event"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                                        onClick={() => setDeleteId(e.id)}
                                        title="Hapus Event"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          {/* Filter + bulk-select bar for the list view */}
          <Card className="border-slate-200 mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama event atau lokasi..."
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
                      {EVENT_PREP_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>{EVENT_PREP_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[180px]">
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Bulan</SelectItem>
                      {monthOptions.map((ym) => (
                        <SelectItem key={ym} value={ym}>{formatMonthLabel(ym)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canManage && (
                  <Button
                    variant={bulkMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBulkMode(!bulkMode);
                      if (bulkMode) clearEventSelection();
                    }}
                    className={cn("h-9 text-xs", bulkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white")}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {bulkMode ? "Selesai Pilih" : "Pilih Beberapa"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bulk Action Bar */}
          {bulkMode && selectedEventCount > 0 && (
            <BulkActionBar
              selectedCount={selectedEventCount}
              actions={[
                {
                  label: "Hapus Terpilih",
                  icon: Trash2,
                  onClick: handleBulkDelete,
                  variant: "destructive",
                  confirmText: `Hapus ${selectedEventCount} event terpilih? Tindakan ini tidak dapat dibatalkan.`,
                },
              ]}
              onClearSelection={clearEventSelection}
            />
          )}

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium">Belum ada event</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {canManage ? "Klik tombol Tambah Event untuk membuat event baru." : "Belum ada event yang tersedia."}
                  </p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium">Tidak ada event yang cocok</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Coba ubah kata kunci, status, atau bulan.
                  </p>
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        {bulkMode && (
                          <TableHead className="w-[40px] sticky left-0 bg-slate-50/50 z-10">
                            <SelectCheckbox
                              checked={isAllEventsSelected(paginatedEvents)}
                              onChange={() => toggleAllEvents(paginatedEvents)}
                            />
                          </TableHead>
                        )}
                        <TableHead className="min-w-[180px]">Nama Event</TableHead>
                        <TableHead className="min-w-[120px]">Klien</TableHead>
                        <TableHead className="min-w-[110px]">Tanggal</TableHead>
                        <TableHead className="min-w-[100px]">Lokasi</TableHead>
                        <TableHead className="min-w-[100px]">Trainer</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Checklist</TableHead>
                        <TableHead className="text-center min-w-[80px] sticky right-0 bg-slate-50/50 z-10">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEvents.map((e) => {
                        const cl = parseChecklist(e.checklist);
                        const prog = checklistProgress(cl);
                        return (
                          <TableRow key={e.id} className="hover:bg-slate-50/50">
                            {bulkMode && (
                              <TableCell className="sticky left-0 bg-white z-10">
                                <SelectCheckbox
                                  checked={isEventSelected(e)}
                                  onChange={() => toggleEvent(e)}
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="font-medium text-slate-900">{e.namaEvent}</div>
                              {e.assistantTrainer?.name && <div className="text-xs text-slate-500">Asst: {e.assistantTrainer.name}</div>}
                            </TableCell>
                            <TableCell className="text-slate-700 text-sm">
                              {e.client?.namaKlien || "-"}
                            </TableCell>
                            <TableCell className="text-slate-700 text-xs whitespace-nowrap">
                              {formatDateTime(e.tanggal)}
                            </TableCell>
                            <TableCell className="text-slate-700 text-sm">{e.lokasi || "-"}</TableCell>
                            <TableCell className="text-slate-700 text-sm">{e.trainer || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={EVENT_PREP_BADGE_COLORS[e.statusPersiapan] || "bg-slate-100 text-slate-700 border-slate-200"}
                              >
                                {EVENT_PREP_LABELS[e.statusPersiapan] || e.statusPersiapan}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {prog.total === 0 ? (
                                <span className="text-xs text-slate-400">Belum ada</span>
                              ) : (
                                <div className="space-y-1 min-w-[100px]">
                                  <div className="flex justify-between text-xs text-slate-600">
                                    <span>{prog.done}/{prog.total}</span>
                                    <span>{prog.pct}%</span>
                                  </div>
                                  <Progress
                                    value={prog.pct}
                                    className={cn(
                                      "h-1.5",
                                      prog.pct >= 100 && "[&>[data-slot=progress-indicator]]:bg-blue-500"
                                    )}
                                  />
                                </div>
                              )}
                            </TableCell>
                            {canManage && (
                              <TableCell className="sticky right-0 bg-white z-10">
                                <div className="flex items-center justify-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => setPreviewDialog({ open: true, item: e })}
                                    title="Preview Event"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                    onClick={() => openEdit(e)}
                                    title="Edit Event"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                                    onClick={() => setDeleteId(e.id)}
                                    title="Hapus Event"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                            {!canManage && (
                              <TableCell className="sticky right-0 bg-white z-10">
                                <div className="flex items-center justify-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => setPreviewDialog({ open: true, item: e })}
                                    title="Preview Event"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <Pagination
                  currentPage={eventPageInfo.currentPage}
                  totalPages={eventPageInfo.totalPages}
                  totalItems={eventPageInfo.totalItems}
                  startIndex={eventPageInfo.startIndex}
                  endIndex={eventPageInfo.endIndex}
                  hasNext={eventPageInfo.hasNext}
                  hasPrev={eventPageInfo.hasPrev}
                  onPageChange={goToEventPage}
                  onNext={nextEventPage}
                  onPrev={prevEventPage}
                />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Event" : "Tambah Event Baru"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui informasi event dan checklist persiapan."
                : "Lengkapi data event dan checklist persiapan."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="namaEvent">Nama Event *</Label>
                <Input
                  id="namaEvent"
                  value={form.namaEvent}
                  onChange={(e) => setForm({ ...form, namaEvent: e.target.value })}
                  required
                  placeholder="Leadership Training Batch 1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientId">Klien</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => setForm({ ...form, clientId: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger id="clientId" className="w-full">
                    <SelectValue placeholder="Pilih klien (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa klien —</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.namaKlien}{c.instansi ? ` (${c.instansi})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tanggal">Tanggal & Jam *</Label>
                <Input
                  id="tanggal"
                  type="datetime-local"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lokasi">Lokasi</Label>
                <Input
                  id="lokasi"
                  value={form.lokasi}
                  onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                  placeholder="Hotel Bidakara, Jakarta"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trainer">Trainer</Label>
                <Input
                  id="trainer"
                  value={form.trainer}
                  onChange={(e) => setForm({ ...form, trainer: e.target.value })}
                  placeholder="Nama trainer utama"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assistantTrainerId">Assistant Trainer</Label>
                {assistantTrainerOptions.length > 0 ? (
                  <Select
                    value={form.assistantTrainerId}
                    onValueChange={(v) =>
                      setForm({ ...form, assistantTrainerId: v === "__none__" ? "" : v })
                    }
                  >
                    <SelectTrigger id="assistantTrainerId" className="w-full">
                      <SelectValue placeholder="Pilih assistant trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Tidak ada —</SelectItem>
                      {assistantTrainerOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="assistantTrainerId"
                    value={form.assistantTrainerId ? form.assistantTrainerId : ""}
                    onChange={(e) => setForm({ ...form, assistantTrainerId: e.target.value })}
                    placeholder="ID assistant trainer (opsional)"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="statusPersiapan">Status Persiapan</Label>
                <Select
                  value={form.statusPersiapan}
                  onValueChange={(v) => setForm({ ...form, statusPersiapan: v })}
                >
                  <SelectTrigger id="statusPersiapan" className="w-full">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_PREP_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {EVENT_PREP_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checklist Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Checklist Persiapan</Label>
                <span className="text-xs text-slate-500">
                  {checklistProgress(checklist).done}/{checklist.length} selesai
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Tambah item checklist..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addChecklistItem}
                  disabled={!newChecklistItem.trim()}
                >
                  <PlusCircle className="w-4 h-4" /> Tambah
                </Button>
              </div>
              {checklist.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {checklist.map((it, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md border",
                        it.done ? "bg-blue-50/50 border-blue-100" : "bg-white border-slate-200"
                      )}
                    >
                      <Checkbox
                        checked={it.done}
                        onCheckedChange={() => toggleChecklistItem(idx)}
                      />
                      <Input
                        value={it.item}
                        onChange={(e) => updateChecklistItemText(idx, e.target.value)}
                        className={cn(
                          "h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-1",
                          it.done && "line-through text-slate-400"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600 shrink-0"
                        onClick={() => removeChecklistItem(idx)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">
                  Belum ada item checklist. Tambahkan untuk melacak persiapan event.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : editing ? (
                  "Simpan Perubahan"
                ) : (
                  "Tambah Event"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data event akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menghapus...
                </>
              ) : (
                "Ya, Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(o) => setPreviewDialog({ open: o, item: previewDialog.item })}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-600" /> Preview Event</DialogTitle>
          </DialogHeader>
          {previewDialog.item && (() => {
            const e = previewDialog.item;
            const cl = parseChecklist(e.checklist);
            const prog = checklistProgress(cl);
            return (
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400 font-semibold uppercase">Nama Event</p>
                    <p className="text-sm text-slate-700 font-medium">{e.namaEvent || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Klien</p>
                    <p className="text-sm text-slate-700">{e.client?.namaKlien || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Tanggal & Jam</p>
                    <p className="text-sm text-slate-700">{formatDateTime(e.tanggal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Lokasi</p>
                    <p className="text-sm text-slate-700">{e.lokasi || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Trainer</p>
                    <p className="text-sm text-slate-700">{e.trainer || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Assistant Trainer</p>
                    <p className="text-sm text-slate-700">{e.assistantTrainer?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Status Persiapan</p>
                    <Badge variant="outline" className={EVENT_PREP_BADGE_COLORS[e.statusPersiapan] || "bg-slate-100 text-slate-700 border-slate-200"}>
                      {EVENT_PREP_LABELS[e.statusPersiapan] || e.statusPersiapan}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Checklist Progress</p>
                    <p className="text-sm text-slate-700">{prog.done} / {prog.total} ({prog.pct}%)</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Dibuat Pada</p>
                    <p className="text-sm text-slate-700">{formatDateTime(e.createdAt)}</p>
                  </div>
                </div>
                {cl.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Daftar Checklist</p>
                    <div className="space-y-1">
                      {cl.map((it, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          {it.done ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          )}
                          <span className={it.done ? "text-slate-700 line-through" : "text-slate-700"}>{it.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
