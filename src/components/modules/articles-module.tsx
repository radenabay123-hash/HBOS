"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText, Plus, Pencil, Trash2, FileSpreadsheet, FileText as FilePdf,
  Loader2, CheckCircle2, Clock, AlertCircle, Globe, ExternalLink,
  Check, X, MessageSquare,
  Search, CheckSquare, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  ROLES, WEBSITE_OPTIONS, ARTICLE_ACC_STATUS, ARTICLE_STATUS,
  formatDate, formatNumber, formatDateTime,
} from "@/lib/constants";
import type { SafeUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { Pagination } from "@/components/shared/pagination";
import { SelectCheckbox } from "@/components/shared/filter-bar";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";

interface ArticleUser { id: string; name: string; role: string; }
interface Article {
  id: string;
  userId: string;
  judulArtikel: string;
  keyword: string | null;
  websiteTujuan: string | null;
  tanggalPublish: string | null;
  linkArtikel: string | null;
  statusACC: string;
  catatanRevisi: string | null;
  accAt: string | null;
  accById: string | null;
  status: string;
  createdAt?: string;
  user: ArticleUser;
}

const ACC_LABELS: Record<string, string> = {
  PENDING: "Menunggu ACC",
  ACC: "ACC",
  REVISI_ADMIN: "Revisi Admin",
};
const ACC_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ACC: "bg-blue-100 text-blue-700 border-blue-200",
  REVISI_ADMIN: "bg-rose-100 text-rose-700 border-rose-200",
};

const emptyForm = {
  judulArtikel: "",
  keyword: "",
  websiteTujuan: WEBSITE_OPTIONS[0] as string,
  websiteCustom: "",
  tanggalPublish: "",
  linkArtikel: "",
  status: "DRAFT",
};

export function ArticlesModule({ user }: { user: SafeUser }) {
  const isOwner = user.role === ROLES.OWNER;

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [websiteFilter, setWebsiteFilter] = useState<string>("all");
  const [accFilter, setAccFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [monthFilter, setMonthFilter] = useState("0"); // "0" = Semua Bulan
  const [yearFilter, setYearFilter] = useState("0"); // "0" = Semua Tahun

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [revisiOpen, setRevisiOpen] = useState(false);
  const [revisiTarget, setRevisiTarget] = useState<Article | null>(null);
  const [catatanRevisi, setCatatanRevisi] = useState("");
  const [accLoading, setAccLoading] = useState(false);

  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; item: Article | null }>({ open: false, item: null });

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (websiteFilter !== "all") params.set("websiteTujuan", websiteFilter);
      if (accFilter !== "all") params.set("statusACC", accFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const data = await api<{ articles: Article[] }>(`/api/articles?${params.toString()}`);
      setArticles(data.articles || []);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat artikel");
    } finally {
      setLoading(false);
    }
  }, [websiteFilter, accFilter, statusFilter]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  // Client-side search (on top of backend website/acc/status filters)
  const filtered = useMemo(() => {
    let r = articles;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter((a) =>
        (a.judulArtikel || "").toLowerCase().includes(q) ||
        (a.keyword || "").toLowerCase().includes(q)
      );
    }
    // Year/Month filter — use tanggalPublish, fall back to createdAt
    if (yearFilter !== "0" || monthFilter !== "0") {
      r = r.filter((a) => {
        const dateField = a.tanggalPublish || a.createdAt;
        if (!dateField) return false;
        const d = new Date(dateField);
        if (isNaN(d.getTime())) return false;
        if (yearFilter !== "0" && d.getFullYear() !== Number(yearFilter)) return false;
        if (monthFilter !== "0" && (d.getMonth() + 1) !== Number(monthFilter)) return false;
        return true;
      });
    }
    return r;
  }, [articles, search, yearFilter, monthFilter]);

  // Pagination (max 15 per page)
  const {
    paginatedItems, goToPage, nextPage, prevPage, pageInfo, resetPage,
  } = usePagination(filtered, { pageSize: 15 });

  // Bulk selection
  const {
    selectedArray, selectedCount, isSelected, toggle, toggleAll,
    clearSelection, resetSelection, isAllSelected,
  } = useBulkSelect({ getId: (a: Article) => a.id });

  // Reset selection + page when client-side filters change
  useEffect(() => {
    resetSelection();
    resetPage();
  }, [search, yearFilter, monthFilter, resetSelection, resetPage]);

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedCount} artikel terpilih?`)) return;
    let success = 0;
    let failed = 0;
    for (const id of selectedArray) {
      try {
        await api(`/api/articles/${id}`, { method: "DELETE" });
        success++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    setBulkMode(false);
    await loadArticles();
    if (failed === 0) {
      toast.success(`${success} artikel berhasil dihapus`);
    } else {
      toast.error(`${success} dihapus, ${failed} gagal`);
    }
  }

  const stats = useMemo(() => {
    const total = articles.length;
    const pending = articles.filter((a) => a.statusACC === "PENDING").length;
    const acc = articles.filter((a) => a.statusACC === "ACC").length;
    const published = articles.filter((a) => a.status === "PUBLISHED").length;
    return { total, pending, acc, published };
  }, [articles]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(a: Article) {
    const isCustomWebsite = a.websiteTujuan && !WEBSITE_OPTIONS.includes(a.websiteTujuan as any);
    setEditingId(a.id);
    setForm({
      judulArtikel: a.judulArtikel || "",
      keyword: a.keyword || "",
      websiteTujuan: isCustomWebsite ? "Lainnya" : (a.websiteTujuan || (WEBSITE_OPTIONS[0] as string)),
      websiteCustom: isCustomWebsite ? (a.websiteTujuan || "") : "",
      tanggalPublish: a.tanggalPublish ? new Date(a.tanggalPublish).toISOString().split("T")[0] : "",
      linkArtikel: a.linkArtikel || "",
      status: a.status || "DRAFT",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.judulArtikel.trim()) { toast.error("Judul artikel wajib diisi"); return; }
    setSaving(true);
    try {
      const website = form.websiteTujuan === "Lainnya" ? form.websiteCustom.trim() : form.websiteTujuan;
      if (form.websiteTujuan === "Lainnya" && !website) {
        toast.error("Website tujuan wajib diisi");
        setSaving(false);
        return;
      }
      const payload = {
        judulArtikel: form.judulArtikel,
        keyword: form.keyword || null,
        websiteTujuan: website,
        tanggalPublish: form.tanggalPublish || null,
        linkArtikel: form.linkArtikel || null,
        status: form.status,
      };
      if (editingId) {
        await api(`/api/articles/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Artikel diperbarui");
      } else {
        await api("/api/articles", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Artikel ditambahkan");
      }
      setDialogOpen(false);
      loadArticles();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Article) {
    if (!confirm(`Hapus artikel "${a.judulArtikel}"?`)) return;
    try {
      await api(`/api/articles/${a.id}`, { method: "DELETE" });
      toast.success("Artikel dihapus");
      loadArticles();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus");
    }
  }

  async function handleAcc(a: Article) {
    setAccLoading(true);
    try {
      await api(`/api/articles/${a.id}/acc`, {
        method: "POST",
        body: JSON.stringify({ statusACC: "ACC" }),
      });
      toast.success(`Artikel "${a.judulArtikel}" di-ACC`);
      loadArticles();
    } catch (e: any) {
      toast.error(e?.message || "Gagal ACC");
    } finally {
      setAccLoading(false);
    }
  }

  function openRevisi(a: Article) {
    setRevisiTarget(a);
    setCatatanRevisi("");
    setRevisiOpen(true);
  }

  async function handleRevisiSubmit() {
    if (!revisiTarget) return;
    if (!catatanRevisi.trim()) { toast.error("Catatan revisi wajib diisi"); return; }
    setAccLoading(true);
    try {
      await api(`/api/articles/${revisiTarget.id}/acc`, {
        method: "POST",
        body: JSON.stringify({ statusACC: "REVISI_ADMIN", catatanRevisi }),
      });
      toast.success("Catatan revisi terkirim");
      setRevisiOpen(false);
      loadArticles();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengirim revisi");
    } finally {
      setAccLoading(false);
    }
  }

  async function handlePublish(a: Article) {
    try {
      await api(`/api/articles/${a.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      toast.success("Artikel dipublikasikan");
      loadArticles();
    } catch (e: any) {
      toast.error(e?.message || "Gagal publish artikel");
    }
  }

  function handleExportExcel() {
    if (!articles.length) { toast.error("Tidak ada data"); return; }
    const rows = articles.map((a) => ({
      "Judul Artikel": a.judulArtikel,
      Keyword: a.keyword || "-",
      "Website Tujuan": a.websiteTujuan || "-",
      "Tanggal Publish": a.tanggalPublish ? formatDate(a.tanggalPublish) : "-",
      "Link Artikel": a.linkArtikel || "-",
      "Status ACC": ACC_LABELS[a.statusACC] || a.statusACC,
      "Catatan Revisi": a.catatanRevisi || "-",
      Status: a.status,
      Penulis: a.user?.name || "-",
    }));
    exportToExcel(rows, "Data_Artikel", "Artikel");
    toast.success("Excel diunduh");
  }

  function handleExportPDF() {
    if (!articles.length) { toast.error("Tidak ada data"); return; }
    const columns = ["Judul", "Keyword", "Website", "Tanggal", "ACC", "Status", "Penulis"];
    const rows = articles.map((a) => [
      a.judulArtikel,
      a.keyword || "-",
      a.websiteTujuan || "-",
      a.tanggalPublish ? formatDate(a.tanggalPublish) : "-",
      ACC_LABELS[a.statusACC] || a.statusACC,
      a.status,
      a.user?.name || "-",
    ]);
    exportToPDF("Laporan Data Artikel", columns, rows as any, "Data_Artikel");
    toast.success("PDF diunduh");
  }

  const websiteBadgeColor = (w: string | null) => {
    if (!w) return "bg-slate-100 text-slate-700 border-slate-200";
    if (w.includes("hafaragroup")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (w.includes("mentorskill")) return "bg-sky-100 text-sky-700 border-sky-200";
    if (w.includes("aqilbaihaqi")) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Data Artikel"
        description="Kelola artikel SEO. Owner akan ACC atau meminta revisi. Jika ACC, artikel dapat di-publish."
        action={
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Tambah Artikel
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Artikel" value={formatNumber(stats.total)} icon={FileText} indicator="neutral" accent="bg-slate-100 text-slate-600" />
        <StatCard title="Pending ACC" value={formatNumber(stats.pending)} icon={Clock} indicator="yellow" accent="bg-amber-50 text-amber-600" />
        <StatCard title="ACC" value={formatNumber(stats.acc)} icon={CheckCircle2} indicator="green" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Published" value={formatNumber(stats.published)} icon={Globe} indicator="green" accent="bg-sky-50 text-sky-600" />
      </div>

      {/* Filters + Export */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Website</Label>
              <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Semua Website" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Website</SelectItem>
                  {WEBSITE_OPTIONS.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Status ACC</Label>
              <Select value={accFilter} onValueChange={setAccFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="PENDING">Menunggu ACC</SelectItem>
                  <SelectItem value="ACC">ACC</SelectItem>
                  <SelectItem value="REVISI_ADMIN">Revisi Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 flex-1">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 flex-1">
                <FilePdf className="w-4 h-4" /> PDF
              </Button>
            </div>
          </div>

          {/* Search + Year/Month + Bulk select toggle */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mt-3 pt-3 border-t border-slate-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul atau keyword..."
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
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Bulan</option>
              {["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((m, i) => <option key={i} value={String(i+1)}>{m}</option>)}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Tahun</option>
              {[2026, 2025, 2024, 2023, 2022].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
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
              confirmText: `Hapus ${selectedCount} artikel terpilih? Tindakan ini tidak dapat dibatalkan.`,
            },
          ]}
          onClearSelection={clearSelection}
        />
      )}

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-700 font-medium">Belum ada artikel</p>
              <p className="text-sm text-slate-500 mt-1">
                {websiteFilter !== "all" || accFilter !== "all" || statusFilter !== "all"
                  ? "Tidak ada artikel yang cocok dengan filter."
                  : "Mulai tambahkan artikel SEO pertama."}
              </p>
              <Button onClick={openAdd} className="mt-4 bg-blue-600 hover:bg-blue-700" size="sm">
                <Plus className="w-4 h-4" /> Tambah Artikel
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Search className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-700 font-medium">Tidak ada artikel yang cocok</p>
              <p className="text-sm text-slate-500 mt-1">
                Coba ubah kata kunci pencarian.
              </p>
            </div>
          ) : (
            <>
            <div className="max-h-[700px] overflow-auto">
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
                    <TableHead className="min-w-[240px]">Judul Artikel</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Tanggal Publish</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Status ACC</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Penulis</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((a) => {
                    const canEdit = isOwner || a.userId === user.id;
                    const isAccd = a.statusACC === "ACC";
                    const isPublished = a.status === "PUBLISHED";
                    return (
                      <TableRow key={a.id} className="hover:bg-slate-50 align-top">
                        {bulkMode && (
                          <TableCell>
                            <SelectCheckbox
                              checked={isSelected(a)}
                              onChange={() => toggle(a)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-slate-900">
                          <div className="max-w-xs">
                            <p className="line-clamp-2">{a.judulArtikel}</p>
                            {a.statusACC === "REVISI_ADMIN" && a.catatanRevisi && (
                              <div className="mt-1.5 rounded-md border border-rose-200 bg-rose-50 p-2">
                                <p className="text-[10px] font-semibold text-rose-700 flex items-center gap-1 mb-0.5">
                                  <MessageSquare className="w-3 h-3" /> Catatan Revisi
                                </p>
                                <p className="text-[11px] text-rose-800 line-clamp-2">{a.catatanRevisi}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {a.keyword ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-xs">{a.keyword}</span>
                          ) : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={websiteBadgeColor(a.websiteTujuan)}>
                            {a.websiteTujuan || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                          {a.tanggalPublish ? formatDate(a.tanggalPublish) : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell>
                          {a.linkArtikel ? (
                            <a
                              href={a.linkArtikel} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" /> Buka
                            </a>
                          ) : <span className="text-slate-400 text-xs">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ACC_COLORS[a.statusACC]}>
                            {ACC_LABELS[a.statusACC] || a.statusACC}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            isPublished
                              ? "bg-sky-100 text-sky-700 border-sky-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          )}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{a.user?.name || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-1 items-end">
                            <div className="flex gap-1 justify-end">
                              {isOwner && a.statusACC === "PENDING" && (
                                <>
                                  <Button
                                    size="sm" variant="ghost"
                                    className="h-7 px-2 text-blue-700 hover:bg-blue-50"
                                    onClick={() => handleAcc(a)} disabled={accLoading}
                                    title="ACC Artikel"
                                  >
                                    <Check className="w-3.5 h-3.5" /> ACC
                                  </Button>
                                  <Button
                                    size="sm" variant="ghost"
                                    className="h-7 px-2 text-rose-700 hover:bg-rose-50"
                                    onClick={() => openRevisi(a)} disabled={accLoading}
                                    title="Minta Revisi"
                                  >
                                    <X className="w-3.5 h-3.5" /> Revisi
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="icon" variant="ghost"
                                className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => setPreviewDialog({ open: true, item: a })}
                                title="Preview Artikel"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {isAccd && !isPublished && canEdit && (
                                <Button
                                  size="sm" variant="outline"
                                  className="h-7 px-2 border-sky-200 text-sky-700 hover:bg-sky-50"
                                  onClick={() => handlePublish(a)}
                                  title="Publish Artikel"
                                >
                                  <Globe className="w-3.5 h-3.5" /> Publish
                                </Button>
                              )}
                              {canEdit && (
                                <>
                                  <Button
                                    size="icon" variant="ghost" className="h-7 w-7"
                                    onClick={() => openEdit(a)} title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="icon" variant="ghost"
                                    className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => handleDelete(a)} title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
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
            <DialogTitle>{editingId ? "Edit Artikel" : "Tambah Artikel"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Perbarui informasi artikel." : "Tambahkan artikel SEO baru."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5">Judul Artikel <span className="text-rose-500">*</span></Label>
              <Input
                value={form.judulArtikel}
                onChange={(e) => setForm({ ...form, judulArtikel: e.target.value })}
                placeholder="Judul artikel SEO..."
              />
            </div>

            <div>
              <Label className="mb-1.5">Keyword</Label>
              <Input
                value={form.keyword}
                onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                placeholder="Kata kunci utama (mis: pelatihan public speaking)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Website Tujuan</Label>
                <Select value={form.websiteTujuan} onValueChange={(v) => setForm({ ...form, websiteTujuan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEBSITE_OPTIONS.map((w) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.websiteTujuan === "Lainnya" && (
                <div>
                  <Label className="mb-1.5">Website Lainnya <span className="text-rose-500">*</span></Label>
                  <Input
                    value={form.websiteCustom}
                    onChange={(e) => setForm({ ...form, websiteCustom: e.target.value })}
                    placeholder="masukkan nama website..."
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Tanggal Publish</Label>
                <Input
                  type="date"
                  value={form.tanggalPublish}
                  onChange={(e) => setForm({ ...form, tanggalPublish: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARTICLE_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Link Artikel</Label>
              <Input
                value={form.linkArtikel}
                onChange={(e) => setForm({ ...form, linkArtikel: e.target.value })}
                placeholder="https://... URL artikel jika sudah publish"
                type="url"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingId ? "Simpan Perubahan" : "Tambah Artikel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revisi Dialog */}
      <Dialog open={revisiOpen} onOpenChange={setRevisiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" /> Minta Revisi Artikel
            </DialogTitle>
            <DialogDescription>
              {revisiTarget && (
                <>Berikan catatan revisi untuk <span className="font-medium text-slate-700">"{revisiTarget.judulArtikel}"</span>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-1.5">Catatan Revisi <span className="text-rose-500">*</span></Label>
            <Textarea
              value={catatanRevisi}
              onChange={(e) => setCatatanRevisi(e.target.value)}
              placeholder="Tuliskan catatan revisi untuk penulis..."
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

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(o) => setPreviewDialog({ open: o, item: previewDialog.item })}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-600" /> Preview Artikel</DialogTitle>
          </DialogHeader>
          {previewDialog.item && (() => {
            const a = previewDialog.item;
            return (
              <div className="space-y-3 py-2">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Judul Artikel</p>
                  <p className="text-sm text-slate-700 font-medium">{a.judulArtikel || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Keyword</p>
                    <p className="text-sm text-slate-700">{a.keyword || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Website Tujuan</p>
                    <Badge variant="outline" className={websiteBadgeColor(a.websiteTujuan)}>
                      {a.websiteTujuan || "-"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Tanggal Publish</p>
                    <p className="text-sm text-slate-700">{a.tanggalPublish ? formatDate(a.tanggalPublish) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Status ACC</p>
                    <Badge variant="outline" className={ACC_COLORS[a.statusACC]}>
                      {ACC_LABELS[a.statusACC] || a.statusACC}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Status</p>
                    <Badge variant="outline" className={cn(
                      a.status === "PUBLISHED"
                        ? "bg-sky-100 text-sky-700 border-sky-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {a.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Dibuat Pada</p>
                    <p className="text-sm text-slate-700">{a.createdAt ? formatDateTime(a.createdAt) : "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Link Artikel</p>
                  {a.linkArtikel ? (
                    <a
                      href={a.linkArtikel} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800 hover:underline break-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> {a.linkArtikel}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-700">-</p>
                  )}
                </div>
                {a.catatanRevisi && (
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Catatan Revisi</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.catatanRevisi}</p>
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
