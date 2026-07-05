"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Film, Plus, Pencil, Trash2, FileSpreadsheet, FileText,
  Loader2, CheckCircle2, Clock, AlertCircle, Globe, Link2,
  Check, X, MessageSquare, Eye, BarChart3, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import {
  ROLES, CONTENT_CATEGORIES, PRODUCTION_STATUS, PRODUCTION_STATUS_LABELS,
  EDITING_STATUS, PUBLISH_STATUS, ACC_STATUS, ACC_STATUS_LABELS, ACC_STATUS_COLORS,
  formatDate, formatNumber,
} from "@/lib/constants";
import type { SafeUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface ContentUser { id: string; name: string; role: string; }
interface MetrikKonten {
  reach?: number; views?: number; watchTime?: number;
  share?: number; save?: number; comment?: number; followerGrowth?: number;
}
interface ContentIdea {
  id: string;
  userId: string;
  kategori: string;
  judul: string;
  link: string | null;
  ideKonten: string | null;
  script: string | null;
  caption: string | null;
  statusProduksi: string;
  statusEditing: string;
  statusPublish: string;
  linkKonten: string | null;
  metrikKonten: string | null;
  statusACC: string;
  catatanRevisi: string | null;
  accAt: string | null;
  accById: string | null;
  tanggal: string;
  user: ContentUser;
}

const emptyMetrik: MetrikKonten = {
  reach: 0, views: 0, watchTime: 0, share: 0, save: 0, comment: 0, followerGrowth: 0,
};

const emptyForm = {
  kategori: CONTENT_CATEGORIES[0] as string,
  judul: "",
  link: "",
  ideKonten: "",
  script: "",
  caption: "",
  statusProduksi: "IDE",
  statusEditing: "PENDING",
  statusPublish: "PENDING",
  linkKonten: "",
  metrik: { ...emptyMetrik },
};

function parseMetrik(s: string | null): MetrikKonten {
  if (!s) return { ...emptyMetrik };
  try {
    const parsed = JSON.parse(s);
    return { ...emptyMetrik, ...parsed };
  } catch {
    return { ...emptyMetrik };
  }
}

export function ContentModule({ user }: { user: SafeUser }) {
  const isOwner = user.role === ROLES.OWNER;

  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategoriFilter, setKategoriFilter] = useState<string>("all");
  const [accFilter, setAccFilter] = useState<string>("all");
  const [tab, setTab] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Revisi dialog
  const [revisiOpen, setRevisiOpen] = useState(false);
  const [revisiTarget, setRevisiTarget] = useState<ContentIdea | null>(null);
  const [catatanRevisi, setCatatanRevisi] = useState("");
  const [accLoading, setAccLoading] = useState(false);

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (kategoriFilter !== "all") params.set("kategori", kategoriFilter);
      if (accFilter !== "all") params.set("statusACC", accFilter);
      const data = await api<{ ideas: ContentIdea[] }>(`/api/content-ideas?${params.toString()}`);
      setIdeas(data.ideas || []);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat konten");
    } finally {
      setLoading(false);
    }
  }, [kategoriFilter, accFilter]);

  useEffect(() => { loadIdeas(); }, [loadIdeas]);

  const filtered = useMemo(() => {
    if (tab === "all") return ideas;
    return ideas.filter((i) => i.statusACC === tab);
  }, [ideas, tab]);

  const stats = useMemo(() => {
    const total = ideas.length;
    const pending = ideas.filter((i) => i.statusACC === "PENDING").length;
    const acc = ideas.filter((i) => i.statusACC === "ACC").length;
    const revisi = ideas.filter((i) => i.statusACC === "REVISI").length;
    const published = ideas.filter((i) => i.statusPublish === "PUBLISHED").length;
    return { total, pending, acc, revisi, published };
  }, [ideas]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, metrik: { ...emptyMetrik } });
    setDialogOpen(true);
  }

  function openEdit(idea: ContentIdea) {
    const m = parseMetrik(idea.metrikKonten);
    setEditingId(idea.id);
    setForm({
      kategori: idea.kategori,
      judul: idea.judul || "",
      link: idea.link || "",
      ideKonten: idea.ideKonten || "",
      script: idea.script || "",
      caption: idea.caption || "",
      statusProduksi: idea.statusProduksi || "IDE",
      statusEditing: idea.statusEditing || "PENDING",
      statusPublish: idea.statusPublish || "PENDING",
      linkKonten: idea.linkKonten || "",
      metrik: m,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.judul.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!form.kategori) { toast.error("Kategori wajib dipilih"); return; }
    setSaving(true);
    try {
      const payload = {
        kategori: form.kategori,
        judul: form.judul,
        link: form.link || null,
        ideKonten: form.ideKonten || null,
        script: form.script || null,
        caption: form.caption || null,
        statusProduksi: form.statusProduksi,
        statusEditing: form.statusEditing,
        statusPublish: form.statusPublish,
        linkKonten: form.linkKonten || null,
        metrikKonten: JSON.stringify(form.metrik),
      };
      if (editingId) {
        await api(`/api/content-ideas/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Ide konten diperbarui");
      } else {
        await api("/api/content-ideas", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Ide konten ditambahkan");
      }
      setDialogOpen(false);
      loadIdeas();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(idea: ContentIdea) {
    if (!confirm(`Hapus ide konten "${idea.judul}"?`)) return;
    try {
      await api(`/api/content-ideas/${idea.id}`, { method: "DELETE" });
      toast.success("Ide konten dihapus");
      loadIdeas();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus");
    }
  }

  async function handleAcc(idea: ContentIdea) {
    setAccLoading(true);
    try {
      await api(`/api/content-ideas/${idea.id}/acc`, {
        method: "POST",
        body: JSON.stringify({ statusACC: "ACC" }),
      });
      toast.success(`Konten "${idea.judul}" di-ACC`);
      loadIdeas();
    } catch (e: any) {
      toast.error(e?.message || "Gagal ACC");
    } finally {
      setAccLoading(false);
    }
  }

  function openRevisi(idea: ContentIdea) {
    setRevisiTarget(idea);
    setCatatanRevisi("");
    setRevisiOpen(true);
  }

  async function handleRevisiSubmit() {
    if (!revisiTarget) return;
    if (!catatanRevisi.trim()) { toast.error("Catatan revisi wajib diisi"); return; }
    setAccLoading(true);
    try {
      await api(`/api/content-ideas/${revisiTarget.id}/acc`, {
        method: "POST",
        body: JSON.stringify({ statusACC: "REVISI", catatanRevisi }),
      });
      toast.success("Catatan revisi terkirim");
      setRevisiOpen(false);
      loadIdeas();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengirim revisi");
    } finally {
      setAccLoading(false);
    }
  }

  async function handlePublishToggle(idea: ContentIdea, publish: boolean) {
    try {
      await api(`/api/content-ideas/${idea.id}`, {
        method: "PUT",
        body: JSON.stringify({
          statusPublish: publish ? "PUBLISHED" : "PENDING",
          statusProduksi: publish ? "PUBLISHED" : "SIAP_PUBLISH",
        }),
      });
      toast.success(publish ? "Konten dipublikasikan" : "Konten dibatalkan publish");
      loadIdeas();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengubah status publish");
    }
  }

  function handleExportExcel() {
    if (!ideas.length) { toast.error("Tidak ada data"); return; }
    const rows = ideas.map((i) => {
      const m = parseMetrik(i.metrikKonten);
      return {
        Judul: i.judul,
        Kategori: i.kategori,
        "Diajukan Oleh": i.user?.name || "-",
        Tanggal: formatDate(i.tanggal),
        Produksi: PRODUCTION_STATUS_LABELS[i.statusProduksi] || i.statusProduksi,
        Editing: i.statusEditing,
        Publish: i.statusPublish,
        "Status ACC": ACC_STATUS_LABELS[i.statusACC] || i.statusACC,
        "Catatan Revisi": i.catatanRevisi || "-",
        Reach: m.reach || 0,
        Views: m.views || 0,
        "Watch Time": m.watchTime || 0,
        Share: m.share || 0,
        Save: m.save || 0,
        Comment: m.comment || 0,
        "Follower Growth": m.followerGrowth || 0,
        "Link Konten": i.linkKonten || "-",
      };
    });
    exportToExcel(rows, "Tugas_Konten", "Tugas Konten");
    toast.success("Excel diunduh");
  }

  function handleExportPDF() {
    if (!ideas.length) { toast.error("Tidak ada data"); return; }
    const columns = ["Judul", "Kategori", "Pengaju", "ACC", "Publish", "Reach", "Views"];
    const rows = ideas.map((i) => {
      const m = parseMetrik(i.metrikKonten);
      return [
        i.judul,
        i.kategori,
        i.user?.name || "-",
        ACC_STATUS_LABELS[i.statusACC] || i.statusACC,
        i.statusPublish,
        formatNumber(m.reach || 0),
        formatNumber(m.views || 0),
      ];
    });
    exportToPDF("Laporan Tugas Konten", columns, rows as any, "Tugas_Konten");
    toast.success("PDF diunduh");
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Tugas Konten"
        description="Ajukan ide konten & judul. Owner akan ACC atau memberi catatan revisi. Jika ACC, akan muncul checklist publish di dashboard Anda."
        action={
          <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Tambah Ide Konten
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Total Ide" value={formatNumber(stats.total)} icon={Film} indicator="neutral" accent="bg-slate-100 text-slate-600" />
        <StatCard title="Pending ACC" value={formatNumber(stats.pending)} icon={Clock} indicator="yellow" accent="bg-amber-50 text-amber-600" />
        <StatCard title="ACC" value={formatNumber(stats.acc)} icon={CheckCircle2} indicator="green" accent="bg-emerald-50 text-emerald-600" />
        <StatCard title="Revisi" value={formatNumber(stats.revisi)} icon={AlertCircle} indicator="red" accent="bg-rose-50 text-rose-600" />
        <StatCard title="Published" value={formatNumber(stats.published)} icon={Globe} indicator="green" accent="bg-teal-50 text-teal-600" />
      </div>

      {/* Filters + Export */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-slate-500 mb-1.5 block">Kategori</Label>
              <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {CONTENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-slate-500 mb-1.5 block">Status ACC</Label>
              <Select value={accFilter} onValueChange={setAccFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Semua Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="PENDING">Menunggu ACC</SelectItem>
                  <SelectItem value="ACC">ACC</SelectItem>
                  <SelectItem value="REVISI">Revisi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9">
                <FileText className="w-4 h-4" /> PDF
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-4 max-w-md h-9">
              <TabsTrigger value="all" className="text-xs">Semua</TabsTrigger>
              <TabsTrigger value="PENDING" className="text-xs">Menunggu</TabsTrigger>
              <TabsTrigger value="ACC" className="text-xs">ACC</TabsTrigger>
              <TabsTrigger value="REVISI" className="text-xs">Revisi</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Film className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-700 font-medium">Belum ada ide konten</p>
            <p className="text-sm text-slate-500 mt-1">
              {tab !== "all" || kategoriFilter !== "all" || accFilter !== "all"
                ? "Tidak ada konten yang cocok dengan filter."
                : "Mulai ajukan ide konten pertama Anda."}
            </p>
            <Button onClick={openAdd} className="mt-4 bg-emerald-600 hover:bg-emerald-700" size="sm">
              <Plus className="w-4 h-4" /> Tambah Ide Konten
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[700px] overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((idea) => {
              const m = parseMetrik(idea.metrikKonten);
              const canEdit = isOwner || idea.userId === user.id;
              const isPublished = idea.statusPublish === "PUBLISHED";
              return (
                <Card key={idea.id} className="border-slate-200 hover:shadow-md transition-shadow flex flex-col">
                  <CardContent className="p-4 flex flex-col gap-3 flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                          {idea.kategori}
                        </Badge>
                        <Badge variant="outline" className={ACC_STATUS_COLORS[idea.statusACC]}>
                          {ACC_STATUS_LABELS[idea.statusACC] || idea.statusACC}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[10px]",
                        idea.statusProduksi === "PUBLISHED"
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      )}>
                        {PRODUCTION_STATUS_LABELS[idea.statusProduksi] || idea.statusProduksi}
                      </Badge>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">{idea.judul}</h3>
                      {idea.ideKonten && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{idea.ideKonten}</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(idea.tanggal)}
                      </span>
                      <span>•</span>
                      <span>oleh <span className="font-medium text-slate-700">{idea.user?.name || "-"}</span></span>
                    </div>

                    {/* Link */}
                    {(idea.link || idea.linkKonten) && (
                      <div className="flex flex-wrap gap-2">
                        {idea.link && (
                          <a
                            href={idea.link} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 hover:underline"
                          >
                            <Link2 className="w-3 h-3" /> Referensi
                          </a>
                        )}
                        {idea.linkKonten && (
                          <a
                            href={idea.linkKonten} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 hover:underline"
                          >
                            <Globe className="w-3 h-3" /> Konten Published
                          </a>
                        )}
                      </div>
                    )}

                    {/* Script/Caption preview */}
                    {(idea.script || idea.caption) && (
                      <div className="text-xs text-slate-500 bg-slate-50 rounded-md p-2 space-y-1">
                        {idea.script && (
                          <p><span className="font-medium text-slate-600">Script:</span> <span className="line-clamp-2">{idea.script}</span></p>
                        )}
                        {idea.caption && (
                          <p><span className="font-medium text-slate-600">Caption:</span> <span className="line-clamp-2">{idea.caption}</span></p>
                        )}
                      </div>
                    )}

                    {/* Catatan Revisi */}
                    {idea.statusACC === "REVISI" && idea.catatanRevisi && (
                      <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5">
                        <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 mb-1">
                          <MessageSquare className="w-3.5 h-3.5" /> Catatan Revisi Owner
                        </p>
                        <p className="text-xs text-rose-800">{idea.catatanRevisi}</p>
                      </div>
                    )}

                    {/* Metrik */}
                    {isPublished && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-2.5">
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 mb-1.5">
                          <BarChart3 className="w-3.5 h-3.5" /> Metrik Konten
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Reach</span><span className="font-medium text-slate-700">{formatNumber(m.reach || 0)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Views</span><span className="font-medium text-slate-700">{formatNumber(m.views || 0)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Watch</span><span className="font-medium text-slate-700">{formatNumber(m.watchTime || 0)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Share</span><span className="font-medium text-slate-700">{formatNumber(m.share || 0)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Save</span><span className="font-medium text-slate-700">{formatNumber(m.save || 0)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Comment</span><span className="font-medium text-slate-700">{formatNumber(m.comment || 0)}</span></div>
                          <div className="flex justify-between col-span-2"><span className="text-slate-500">Follower Growth</span><span className="font-medium text-emerald-700">+{formatNumber(m.followerGrowth || 0)}</span></div>
                        </div>
                      </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Owner ACC actions */}
                    {isOwner && idea.statusACC === "PENDING" && (
                      <div className="flex gap-2 pt-1 border-t border-slate-100">
                        <Button
                          size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAcc(idea)} disabled={accLoading}
                        >
                          <Check className="w-3.5 h-3.5" /> ACC
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          onClick={() => openRevisi(idea)} disabled={accLoading}
                        >
                          <X className="w-3.5 h-3.5" /> Revisi
                        </Button>
                      </div>
                    )}

                    {/* Publish toggle (when ACC) */}
                    {idea.statusACC === "ACC" && canEdit && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <Label htmlFor={`pub-${idea.id}`} className="text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer">
                          <Globe className="w-3.5 h-3.5" /> Publish Konten
                        </Label>
                        <Checkbox
                          id={`pub-${idea.id}`}
                          checked={isPublished}
                          onCheckedChange={(v) => handlePublishToggle(idea, !!v)}
                        />
                      </div>
                    )}

                    {/* Edit/Delete */}
                    {canEdit && (
                      <div className="flex justify-end gap-1 pt-1 border-t border-slate-100">
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(idea)}>
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(idea)}>
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Ide Konten" : "Tambah Ide Konten"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Perbarui detail ide konten." : "Ajukan ide konten baru untuk di-ACC owner."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Kategori <span className="text-rose-500">*</span></Label>
                <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Judul <span className="text-rose-500">*</span></Label>
                <Input
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  placeholder="Judul konten..."
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Link Referensi</Label>
              <Input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </div>

            <div>
              <Label className="mb-1.5">Ide Konten</Label>
              <Textarea
                value={form.ideKonten}
                onChange={(e) => setForm({ ...form, ideKonten: e.target.value })}
                placeholder="Deskripsikan ide konten..."
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-1.5">Script</Label>
              <Textarea
                value={form.script}
                onChange={(e) => setForm({ ...form, script: e.target.value })}
                placeholder="Script video/konten..."
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-1.5">Caption</Label>
              <Textarea
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="Caption posting..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="mb-1.5">Status Produksi</Label>
                <Select value={form.statusProduksi} onValueChange={(v) => setForm({ ...form, statusProduksi: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCTION_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>{PRODUCTION_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Status Editing</Label>
                <Select value={form.statusEditing} onValueChange={(v) => setForm({ ...form, statusEditing: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EDITING_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Status Publish</Label>
                <Select value={form.statusPublish} onValueChange={(v) => setForm({ ...form, statusPublish: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PUBLISH_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Link Konten (Published)</Label>
              <Input
                value={form.linkKonten}
                onChange={(e) => setForm({ ...form, linkKonten: e.target.value })}
                placeholder="https://... (URL konten yang sudah publish)"
                type="url"
              />
            </div>

            {/* Metrik */}
            <div className="rounded-lg border border-slate-200 p-3 space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> Metrik Konten
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: "reach", label: "Reach" },
                  { key: "views", label: "Views" },
                  { key: "watchTime", label: "Watch Time" },
                  { key: "share", label: "Share" },
                  { key: "save", label: "Save" },
                  { key: "comment", label: "Comment" },
                  { key: "followerGrowth", label: "Follower Growth" },
                ].map((f) => (
                  <div key={f.key}>
                    <Label className="text-xs text-slate-500 mb-1 block">{f.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={(form.metrik as any)[f.key] ?? 0}
                      onChange={(e) => setForm({
                        ...form,
                        metrik: { ...form.metrik, [f.key]: Number(e.target.value) || 0 },
                      })}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingId ? "Simpan Perubahan" : "Ajukan Ide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revisi Dialog */}
      <Dialog open={revisiOpen} onOpenChange={setRevisiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" /> Minta Revisi Konten
            </DialogTitle>
            <DialogDescription>
              {revisiTarget && (
                <>Berikan catatan revisi untuk <span className="font-medium text-slate-700">"{revisiTarget.judul}"</span>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-1.5">Catatan Revisi <span className="text-rose-500">*</span></Label>
            <Textarea
              value={catatanRevisi}
              onChange={(e) => setCatatanRevisi(e.target.value)}
              placeholder="Tuliskan catatan revisi untuk anggota tim..."
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisiOpen(false)} disabled={accLoading}>Batal</Button>
            <Button
              onClick={handleRevisiSubmit}
              disabled={accLoading}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {accLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Kirim Revisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
