"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

export function KanbanModule({ user }: { user: SafeUser }) {
  const isOwner = user.role === ROLES.OWNER;
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; card: KanbanCard | null }>({ open: false, card: null });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [form, setForm] = useState({
    title: "", description: "", status: "TODO", priority: "MEDIUM", category: "", dueDate: "", assigneeId: "",
  });

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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const cardId = String(active.id);
    const targetColumn = String(over.id); // column id or card id

    // Find the card
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    // Determine target status
    let newStatus = targetColumn;
    // If dropped on another card, get that card's column
    if (!COLUMNS.find((c) => c.id === targetColumn)) {
      const targetCard = cards.find((c) => c.id === targetColumn);
      if (targetCard) newStatus = targetCard.status;
    }

    if (card.status === newStatus) return;

    // Optimistic update
    const oldStatus = card.status;
    const isCompleting = newStatus === "DONE" && oldStatus !== "DONE";
    setCards((prev) => prev.map((c) =>
      c.id === cardId
        ? { ...c, status: newStatus, completedAt: isCompleting ? new Date().toISOString() : newStatus === "DONE" ? c.completedAt : null }
        : c
    ));

    // Auto-save to backend
    try {
      await api(`/api/kanban/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (isCompleting) {
        toast.success(`✅ Pekerjaan "${card.title}" selesai & tersimpan otomatis!`);
      }
    } catch (e: any) {
      toast.error("Gagal menyimpan: " + e.message);
      // Revert
      setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, status: oldStatus } : c));
    }
  }

  async function handleSave() {
    if (!form.title) { toast.error("Judul wajib diisi"); return; }
    try {
      const payload = { ...form, dueDate: form.dueDate || null, category: form.category || null };
      if (dialog.card) {
        await api(`/api/kanban/${dialog.card.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Card diperbarui");
      } else {
        await api("/api/kanban", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Card ditambahkan");
      }
      setDialog({ open: false, card: null });
      setForm({ title: "", description: "", status: "TODO", priority: "MEDIUM", category: "", dueDate: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus card ini?")) return;
    try { await api(`/api/kanban/${id}`, { method: "DELETE" }); toast.success("Dihapus"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  function openCreate(status?: string) {
    setForm({
      title: "", description: "", status: status || "TODO", priority: "MEDIUM", category: "", dueDate: "",
      assigneeId: isOwner ? "" : user.id,
    });
    setDialog({ open: true, card: null });
  }

  function openEdit(card: KanbanCard) {
    setForm({
      title: card.title, description: card.description || "",
      status: card.status, priority: card.priority,
      category: card.category || "", dueDate: card.dueDate ? card.dueDate.slice(0, 10) : "",
      assigneeId: card.assigneeId || "",
    });
    setDialog({ open: true, card });
  }

  function handleDownloadReport(period: string) {
    window.open(`/api/kanban/report?period=${period}`, "_blank");
    toast.success("Laporan PDF diunduh");
  }

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDownloadReport("all")} className="bg-white">
            <Download className="w-4 h-4 mr-1" /> Laporan PDF
          </Button>
          <Button size="sm" onClick={() => openCreate()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Tambah Pekerjaan
          </Button>
        </div>
      </div>

      {/* Owner: User filter + Team summary */}
      {isOwner && teamUsers.length > 0 && (
        <>
          {/* User filter */}
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

          {/* Team summary cards (only when viewing all) */}
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
              <KanbanColumn key={col.id} column={col} cards={colCards} onAdd={() => openCreate(col.id)} onEdit={openEdit} onDelete={handleDelete} />
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, card: dialog.card })}>
        <DialogContent className="max-w-lg">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, card: null })}>Batal</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-1" /> Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Kanban Column Component =====
function KanbanColumn({ column, cards, onAdd, onEdit, onDelete }: {
  column: { id: string; label: string; color: string; headerColor: string; icon: any };
  cards: KanbanCard[];
  onAdd: () => void;
  onEdit: (card: KanbanCard) => void;
  onDelete: (id: string) => void;
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
          <KanbanCardItem key={card.id} card={card} onEdit={() => onEdit(card)} onDelete={() => onDelete(card.id)} />
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
function KanbanCardItem({ card, onEdit, onDelete, isOverlay }: {
  card: KanbanCard;
  onEdit?: () => void;
  onDelete?: () => void;
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
      className={cn(
        "bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow group",
        isDragging && "opacity-50",
        card.status === "DONE" && "border-l-4 border-l-green-500"
      )}
    >
      {/* Drag handle + priority */}
      <div className="flex items-start justify-between mb-1.5">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 mt-0.5"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Badge variant="outline" className={cn("text-[9px]", PRIORITY_COLORS[card.priority])}>
          <Flag className="w-2.5 h-2.5 mr-0.5" /> {PRIORITY_LABELS[card.priority]}
        </Badge>
      </div>

      {/* Title */}
      <p className={cn("text-sm font-medium text-slate-900 mb-1", card.status === "DONE" && "line-through text-slate-400")}>
        {card.title}
      </p>

      {/* Description */}
      {card.description && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{card.description}</p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        {card.category && (
          <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-600 border-slate-200">{card.category}</Badge>
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
      {!isOverlay && onEdit && onDelete && (
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={onEdit}><Edit3 className="w-3 h-3 mr-0.5" /> Edit</Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-rose-500" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
        </div>
      )}
    </div>
  );
}
