"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Plus, Download, Edit3, Trash2, RefreshCw, X, Eye, Save,
  Calendar, MapPin, User, Building2, FileSignature, Settings as SettingsIcon,
  Search, CheckSquare,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/constants";
import { downloadSuratPDF } from "@/lib/surat-pdf";
import { fetchLayoutSettings, loadImageAsDataURL } from "@/lib/layout-helper";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { Pagination } from "@/components/shared/pagination";
import { SelectCheckbox } from "@/components/shared/filter-bar";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

const SURAT_TYPES = [
  "Surat Penawaran", "Surat Perjanjian Kerjasama", "Surat Tugas",
  "Surat Keterangan", "Surat Undangan", "Surat Pemberitahuan",
  "Surat Pengantar", "Surat Permohonan", "Surat Edaran", "Surat Lainnya",
];

const STATUS_LABELS: Record<string, string> = { DRAFT: "Draft", FINAL: "Final", ARCHIVED: "Arsip" };
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  FINAL: "bg-blue-100 text-blue-700 border-blue-200",
  ARCHIVED: "bg-amber-100 text-amber-700 border-amber-200",
};

export function SuratModule({ user }: { user: SafeUser }) {
  const [view, setView] = useState<"list" | "form">("list");
  const [surats, setSurats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<Record<string, string>>({});
  const [layoutSettings, setLayoutSettings] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [bulkMode, setBulkMode] = useState(false);
  const [monthFilter, setMonthFilter] = useState("0"); // "0" = Semua Bulan
  const [yearFilter, setYearFilter] = useState("0"); // "0" = Semua Tahun

  // Form state - OLD header fields (logoWidth, headerContact, headerAddress1, headerAddress2) REMOVED
  // Header design now comes entirely from Layout Dokumen settings
  const [form, setForm] = useState({
    suratType: "Surat Penawaran",
    suratNumber: "",
    issueDate: new Date().toISOString().slice(0, 10),
    city: "Jombang",
    perihal: "",
    lampiran: "",
    recipientName: "",
    recipientInstansi: "",
    recipientAddress: "",
    body: "",
    includeActivity: false,
    activityDate: "",
    activityLocation: "",
    activityTime: "",
    includePayment: false,
    paymentAmount: "",
    paymentAmountText: "",
    bookingAmount: "",
    bookingAmountText: "",
    bankName: "",
    bankAccount: "",
    accountName: "",
    signatoryName: "M. Aqil Baihaqi",
    signatoryTitle: "Direktur Utama",
    status: "DRAFT",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, settings] = await Promise.all([
        api<{ surats: any[] }>("/api/surat").catch(() => ({ surats: [] })),
        api<{ settings: any[] }>("/api/settings").catch(() => ({ settings: [] })),
      ]);
      setSurats(d.surats || []);
      const sMap: Record<string, string> = {};
      for (const s of settings.settings || []) sMap[s.key] = s.value;
      setCompanySettings(sMap);
      if (sMap.director_name) setForm((f) => ({ ...f, signatoryName: sMap.director_name }));
      if (sMap.director_title) setForm((f) => ({ ...f, signatoryTitle: sMap.director_title }));
      // Fetch layout settings for preview
      try {
        const ld = await fetchLayoutSettings("SURAT");
        setLayoutSettings(ld.layout);
      } catch {}
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function generateSuratNumber() {
    const now = new Date();
    const romanMonths = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
    const seq = String(surats.length + 1).padStart(3, "0");
    return `${seq}/SP/HAN/${romanMonths[now.getMonth()]}/${now.getFullYear()}`;
  }

  function openCreate() {
    setForm({
      suratType: "Surat Penawaran",
      suratNumber: generateSuratNumber(),
      issueDate: new Date().toISOString().slice(0, 10),
      city: "Jombang",
      perihal: "", lampiran: "", recipientName: "", recipientInstansi: "", recipientAddress: "",
      body: "", includeActivity: false, activityDate: "", activityLocation: "", activityTime: "",
      includePayment: false, paymentAmount: "", paymentAmountText: "", bookingAmount: "", bookingAmountText: "",
      bankName: "", bankAccount: "", accountName: "",
      signatoryName: companySettings.director_name || "M. Aqil Baihaqi",
      signatoryTitle: companySettings.director_title || "Direktur Utama",
      status: "DRAFT",
    });
    setEditId(null);
    setView("form");
  }

  function openEdit(s: any) {
    setForm({
      suratType: s.suratType || "Surat Penawaran",
      suratNumber: s.suratNumber || "",
      issueDate: new Date(s.issueDate).toISOString().slice(0, 10),
      city: s.city || "Jombang",
      perihal: s.perihal || "",
      lampiran: s.lampiran || "",
      recipientName: s.recipientName || "",
      recipientInstansi: s.recipientInstansi || "",
      recipientAddress: s.recipientAddress || "",
      body: s.body || "",
      includeActivity: s.includeActivity || false,
      activityDate: s.activityDate || "",
      activityLocation: s.activityLocation || "",
      activityTime: s.activityTime || "",
      includePayment: s.includePayment || false,
      paymentAmount: s.paymentAmount ? String(s.paymentAmount) : "",
      paymentAmountText: s.paymentAmountText || "",
      bookingAmount: s.bookingAmount ? String(s.bookingAmount) : "",
      bookingAmountText: s.bookingAmountText || "",
      bankName: s.bankName || "",
      bankAccount: s.bankAccount || "",
      accountName: s.accountName || "",
      signatoryName: s.signatoryName || "M. Aqil Baihaqi",
      signatoryTitle: s.signatoryTitle || "Direktur Utama",
      status: s.status || "DRAFT",
    });
    setEditId(s.id);
    setView("form");
  }

  async function handleSave() {
    if (!form.suratNumber || !form.perihal) { toast.error("Nomor surat dan perihal wajib diisi"); return; }
    try {
      if (editId) {
        await api(`/api/surat/${editId}`, { method: "PUT", body: JSON.stringify(form) });
        toast.success("Surat diperbarui");
      } else {
        await api("/api/surat", { method: "POST", body: JSON.stringify(form) });
        toast.success("Surat disimpan ke arsip");
      }
      setView("list");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus surat ini?")) return;
    try { await api(`/api/surat/${id}`, { method: "DELETE" }); toast.success("Dihapus"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedCount} surat terpilih?`)) return;
    let success = 0;
    let failed = 0;
    for (const id of selectedArray) {
      try {
        await api(`/api/surat/${id}`, { method: "DELETE" });
        success++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    setBulkMode(false);
    await load();
    if (failed === 0) {
      toast.success(`${success} surat berhasil dihapus`);
    } else {
      toast.error(`${success} dihapus, ${failed} gagal`);
    }
  }

  // Search + filter (list view only)
  const filtered = useMemo(() => {
    return surats.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const text = [s.suratNumber, s.perihal, s.suratType, s.recipientName, s.recipientInstansi]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      // Year/Month filter by issueDate
      if (s.issueDate) {
        const d = new Date(s.issueDate);
        if (!isNaN(d.getTime())) {
          if (yearFilter !== "0" && d.getFullYear() !== Number(yearFilter)) return false;
          if (monthFilter !== "0" && (d.getMonth() + 1) !== Number(monthFilter)) return false;
        } else if (yearFilter !== "0" || monthFilter !== "0") {
          return false;
        }
      } else if (yearFilter !== "0" || monthFilter !== "0") {
        return false;
      }
      return true;
    });
  }, [surats, search, filterStatus, yearFilter, monthFilter]);

  // Pagination (max 15 per page)
  const {
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    pageInfo,
    resetPage,
  } = usePagination(filtered, { pageSize: 15 });

  // Bulk selection
  const {
    selectedArray,
    selectedCount,
    isSelected,
    toggle,
    toggleAll,
    clearSelection,
    resetSelection,
    isAllSelected,
  } = useBulkSelect({ getId: (s: any) => s.id });

  // Reset selection + go to page 1 when filters change
  useEffect(() => {
    resetSelection();
    resetPage();
  }, [search, filterStatus, yearFilter, monthFilter, resetSelection, resetPage]);

  async function handleDownloadPDF(s: any) {
    let lSettings: any = null;
    let logoUrl = "";
    try {
      const ld = await fetchLayoutSettings("SURAT");
      lSettings = ld.layout;
      logoUrl = ld.appSettings?.companyLogo || companySettings.company_logo || "";
    } catch {}
    // Load logo image as data URL for jsPDF
    const logoImageData = await loadImageAsDataURL(logoUrl);
    // CLEAN: only pass content data, all design comes from layout settings
    downloadSuratPDF({
      suratType: s.suratType,
      suratNumber: s.suratNumber,
      issueDate: formatDate(s.issueDate),
      city: s.city,
      perihal: s.perihal,
      lampiran: s.lampiran,
      recipientName: s.recipientName,
      recipientInstansi: s.recipientInstansi,
      recipientAddress: s.recipientAddress,
      body: s.body,
      includeActivity: s.includeActivity,
      activityDate: s.activityDate,
      activityLocation: s.activityLocation,
      activityTime: s.activityTime,
      includePayment: s.includePayment,
      paymentAmount: Number(s.paymentAmount) || 0,
      paymentAmountText: s.paymentAmountText,
      bookingAmount: Number(s.bookingAmount) || 0,
      bookingAmountText: s.bookingAmountText,
      bankName: s.bankName,
      bankAccount: s.bankAccount,
      accountName: s.accountName,
      signatoryName: s.signatoryName,
      signatoryTitle: s.signatoryTitle,
      logoImageData,
      layout: lSettings,
    });
    toast.success("Surat PDF diunduh");
  }

  if (loading && view === "list") {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  // ===== LIST VIEW =====
  if (view === "list") {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileText className="w-6 h-6 text-blue-600" /> Surat Resmi</h1>
            <p className="text-sm text-slate-500 mt-1">Buat dan kelola surat resmi perusahaan</p>
          </div>
          <Button size="sm" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Surat Resmi Baru</Button>
        </div>

        {/* Filter Bar (search + status filter + bulk-select toggle) */}
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nomor surat, perihal, jenis..."
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
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="FINAL">Final</SelectItem>
                  <SelectItem value="ARCHIVED">Arsip</SelectItem>
                </SelectContent>
              </Select>
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
                className={cn("h-9 text-xs", bulkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white")}
                onClick={() => {
                  setBulkMode(!bulkMode);
                  if (bulkMode) clearSelection();
                }}
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1" />
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
                confirmText: `Hapus ${selectedCount} surat terpilih? Tindakan ini tidak dapat dibatalkan.`,
              },
            ]}
            onClearSelection={clearSelection}
          />
        )}

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {surats.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada surat</p>
                <p className="text-xs text-slate-400 mt-1">Klik "Surat Resmi Baru" untuk membuat</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Tidak ada surat yang cocok</p>
                <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci atau filter status</p>
              </div>
            ) : (
              <>
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b text-left text-xs text-slate-500">
                      {bulkMode && <th className="py-3 px-3 w-[40px]"><SelectCheckbox checked={isAllSelected(paginatedItems)} onChange={() => toggleAll(paginatedItems)} /></th>}
                      <th className="py-3 px-4 font-medium">Nomor Surat</th>
                      <th className="py-3 px-3 font-medium">Jenis</th>
                      <th className="py-3 px-3 font-medium">Perihal</th>
                      <th className="py-3 px-3 font-medium">Tanggal</th>
                      <th className="py-3 px-3 font-medium text-center">Status</th>
                      {!bulkMode && <th className="py-3 px-3 font-medium text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                        {bulkMode && <td className="py-2.5 px-3"><SelectCheckbox checked={isSelected(s)} onChange={() => toggle(s)} /></td>}
                        <td className="py-2.5 px-4 font-medium text-slate-900 text-xs">{s.suratNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600 text-xs">{s.suratType}</td>
                        <td className="py-2.5 px-3 text-slate-600 text-xs max-w-[200px] truncate">{s.perihal || "-"}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs">{formatDate(s.issueDate)}</td>
                        <td className="py-2.5 px-3 text-center"><Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[s.status])}>{STATUS_LABELS[s.status] || s.status}</Badge></td>
                        {!bulkMode && (
                          <td className="py-2.5 px-3">
                            <div className="flex gap-0.5 justify-center">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600" title="Download PDF" onClick={() => handleDownloadPDF(s)}><Download className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" onClick={() => openEdit(s)}><Edit3 className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500" title="Hapus" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </td>
                        )}
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
      </div>
    );
  }

  // ===== FORM VIEW (2-column: form left + preview right) =====
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setView("list")} className="bg-white">
            <X className="w-4 h-4 mr-1" /> Kembali
          </Button>
          <h1 className="text-xl font-bold text-blue-900">Surat Resmi Baru</h1>
        </div>
        <Button size="sm" onClick={handleSave} className="bg-blue-900 hover:bg-blue-800">
          <Save className="w-4 h-4 mr-1" /> Simpan Surat Ke Arsip
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== LEFT: Form ===== */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
            {/* Jenis Surat + Tanggal */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Jenis Surat</Label>
                <Select value={form.suratType} onValueChange={(v) => setForm({ ...form, suratType: v })}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{SURAT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Tanggal Surat</Label>
                <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="bg-white" />
              </div>
            </div>

            {/* Kota + Nomor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Kota Penerbitan</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-white" placeholder="Jombang" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Nomor Surat (Otomatis/Edit)</Label>
                <Input value={form.suratNumber} onChange={(e) => setForm({ ...form, suratNumber: e.target.value })} className="bg-white" placeholder="116/SP/HAN/VII/2026" />
              </div>
            </div>

            {/* Perihal + Lampiran */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Perihal</Label>
                <Input value={form.perihal} onChange={(e) => setForm({ ...form, perihal: e.target.value })} className="bg-white" placeholder="e.g. Penawaran Kerjasama Training" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Lampiran</Label>
                <Input value={form.lampiran} onChange={(e) => setForm({ ...form, lampiran: e.target.value })} className="bg-white" placeholder="1 Berkas" />
              </div>
            </div>

            {/* Kepada Yth + Instansi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Kepada Yth. (Nama Orang)</Label>
                <Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} className="bg-white" placeholder="e.g. Bapak Budi Santoso" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Nama Instansi / Perusahaan</Label>
                <Input value={form.recipientInstansi} onChange={(e) => setForm({ ...form, recipientInstansi: e.target.value })} className="bg-white" placeholder="e.g. PT Maju Jaya" />
              </div>
            </div>

            {/* Alamat Instansi */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Alamat Instansi</Label>
              <Input value={form.recipientAddress} onChange={(e) => setForm({ ...form, recipientAddress: e.target.value })} className="bg-white" placeholder="e.g. Jl. Jenderal Sudirman No. 45, Jakarta" />
            </div>

            {/* Isi Surat - Rich Text Editor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Isi Surat / Pesan Utama</Label>
              <RichTextEditor
                value={form.body}
                onChange={(html) => setForm({ ...form, body: html })}
                placeholder="Tulis isi surat resmi di sini..."
                minHeight={180}
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox id="activity" checked={form.includeActivity} onCheckedChange={(v) => setForm({ ...form, includeActivity: !!v })} />
                <Label htmlFor="activity" className="text-xs font-semibold text-blue-900 cursor-pointer">SERTAKAN DETAIL KEGIATAN</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="payment" checked={form.includePayment} onCheckedChange={(v) => setForm({ ...form, includePayment: !!v })} />
                <Label htmlFor="payment" className="text-xs font-semibold text-blue-900 cursor-pointer">SERTAKAN INFORMASI PEMBAYARAN</Label>
              </div>
            </div>

            {/* Detail Kegiatan */}
            {form.includeActivity && (
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-500 uppercase">Detail Kegiatan</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-1"><Label className="text-[10px]">Tanggal Kegiatan</Label><Input value={form.activityDate} onChange={(e) => setForm({ ...form, activityDate: e.target.value })} className="bg-white h-8 text-sm" placeholder="e.g. 4/11/18 Juli 2026" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Lokasi</Label><Input value={form.activityLocation} onChange={(e) => setForm({ ...form, activityLocation: e.target.value })} className="bg-white h-8 text-sm" placeholder="e.g. Zoom Meet" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Waktu</Label><Input value={form.activityTime} onChange={(e) => setForm({ ...form, activityTime: e.target.value })} className="bg-white h-8 text-sm" placeholder="e.g. 08.00 – 14.00 WITA" /></div>
                </div>
              </div>
            )}

            {/* Informasi Pembayaran */}
            {form.includePayment && (
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-500 uppercase">Informasi Pembayaran</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-[10px]">Total Biaya (Rp)</Label><Input type="number" value={form.paymentAmount} onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })} className="bg-white h-8 text-sm" placeholder="8000000" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Terbilang</Label><Input value={form.paymentAmountText} onChange={(e) => setForm({ ...form, paymentAmountText: e.target.value })} className="bg-white h-8 text-sm" placeholder="Delapan Juta Rupiah" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Booking (Rp)</Label><Input type="number" value={form.bookingAmount} onChange={(e) => setForm({ ...form, bookingAmount: e.target.value })} className="bg-white h-8 text-sm" placeholder="3000000" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Terbilang</Label><Input value={form.bookingAmountText} onChange={(e) => setForm({ ...form, bookingAmountText: e.target.value })} className="bg-white h-8 text-sm" placeholder="Tiga Juta Rupiah" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Bank</Label><Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="bg-white h-8 text-sm" placeholder="BNI" /></div>
                  <div className="space-y-1"><Label className="text-[10px]">No. Rekening</Label><Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} className="bg-white h-8 text-sm" placeholder="3023555310" /></div>
                  <div className="space-y-1 col-span-2"><Label className="text-[10px]">Atas Nama</Label><Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="bg-white h-8 text-sm" placeholder="PT HAFARA AQIBA NUSANTARA" /></div>
                </div>
              </div>
            )}

            <Separator />

            {/* Info: Header design comes from Layout Dokumen */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex items-start gap-2">
              <SettingsIcon className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-900">
                <p className="font-semibold">Header &amp; Footer dikelola via Layout Dokumen</p>
                <p className="text-blue-700 mt-0.5">Nama perusahaan, alamat, kontak, logo, warna header, dan footer sudah diatur di menu <strong>Layout Dokumen</strong>. Desain PDF otomatis mengikuti pengaturan tersebut.</p>
              </div>
            </div>

            {/* Penandatangan + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Penandatangan</Label>
                <Input value={form.signatoryName} onChange={(e) => setForm({ ...form, signatoryName: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Jabatan Penandatangan</Label>
                <Input value={form.signatoryTitle} onChange={(e) => setForm({ ...form, signatoryTitle: e.target.value })} className="bg-white" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Status Dokumen</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="FINAL">Final</SelectItem>
                  <SelectItem value="ARCHIVED">Arsip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ===== RIGHT: Realtime Preview (uses Layout Dokumen settings) ===== */}
        <Card className="shadow-sm self-start sticky top-4">
          <CardHeader className="pb-2 bg-slate-50">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Preview (Mengikuti Layout Dokumen)
            </CardTitle>
            <p className="text-[10px] text-slate-400">Desain header &amp; footer dari pengaturan Layout Dokumen</p>
          </CardHeader>
          <CardContent className="p-4">
            <SuratLayoutPreview form={form} layout={layoutSettings} companySettings={companySettings} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===== Layout-driven Preview Component (matches PDF output) =====
function SuratLayoutPreview({ form, layout, companySettings }: { form: any; layout: any; companySettings: any }) {
  const s = layout || {};
  const infoPos = s.companyInfoPosition || "inside";
  const headerBg = s.headerBgColor || "#0f234b";
  const accentLine = s.accentLineColor || "#ff8000";
  const footerBg = s.footerBgColor || "#0f234b";
  const docTitleColor = s.docTitleColor || "#0f234b";
  const footerTextColor = s.footerTextColor || "#ffffff";
  const logoColor = s.logoColor || "#ff8000";
  const logoUrl = companySettings.company_logo || "";

  const companyNameText = s.companyNameText || companySettings.company_name || "PT. HAFARA AQIBA NUSANTARA";
  const companyAddressText = s.companyAddressText || "";
  const companyContactText = s.companyContactText || "";

  // Company info block renderer (function, not component - to avoid lint error)
  const renderCompanyInfo = (onDark: boolean) => {
    const nameColor = onDark ? "#ffffff" : (s.companyNameColor || "#0f234b");
    const addrColor = onDark ? "#dce6f5" : (s.companyAddressColor || "#64748b");
    const contactColor = onDark ? "#b4c8e6" : (s.companyContactColor || "#94a3b8");
    const nameAlign = s.companyNameAlign === "left" ? "left" : s.companyNameAlign === "center" ? "center" : "right";
    const addrAlign = s.companyAddressAlign === "left" ? "left" : s.companyAddressAlign === "center" ? "center" : "right";
    const contactAlign = s.companyContactAlign === "left" ? "left" : s.companyContactAlign === "center" ? "center" : "right";
    return (
      <div className="flex items-center gap-1.5 px-2 py-1">
        {/* Logo - use uploaded image if available, otherwise circle fallback */}
        <div className="shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ maxHeight: "16px", maxWidth: "40px", objectFit: "contain" }} />
          ) : (
            <div className="rounded-full flex items-center justify-center text-white font-bold relative" style={{ width: "16px", height: "16px", backgroundColor: logoColor, fontSize: "8px" }}>
              {s.logoText || "H"}
              <div className="absolute inset-0 rounded-full" style={{ backgroundColor: headerBg, opacity: 0.35, clipPath: "circle(50% at 65% 65%)" }} />
            </div>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p style={{ color: nameColor, fontWeight: s.companyNameBold ? "bold" : "normal", fontSize: "8px", lineHeight: "1.3", textAlign: nameAlign }}>{companyNameText}</p>
          <p style={{ color: addrColor, fontSize: "5px", lineHeight: "1.3", textAlign: addrAlign }}>{companyAddressText}</p>
          <p style={{ color: contactColor, fontSize: "4.5px", lineHeight: "1.3", textAlign: contactAlign }}>{companyContactText}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg mx-auto overflow-hidden shadow-md flex flex-col" style={{ maxWidth: "210px", minHeight: "297px" }}>
      {/* 1. INFO INSIDE NAVY HEADER (default - professional) */}
      {infoPos === "inside" && (
        <>
          <div style={{ background: headerBg, minHeight: "24px", padding: "0 6px", display: "flex", alignItems: "center" }}>
            {renderCompanyInfo(true)}
          </div>
          <div style={{ height: `${s.accentLineHeight || 1.5}px`, backgroundColor: accentLine }}></div>
        </>
      )}

      {/* 2. INFO ABOVE + thin navy bar */}
      {infoPos === "above" && (
        <>
          {renderCompanyInfo(false)}
          <div style={{ height: "2px", backgroundColor: headerBg }}></div>
          <div style={{ height: `${s.accentLineHeight || 1.5}px`, backgroundColor: accentLine }}></div>
        </>
      )}

      {/* 3. INFO BELOW: thin navy bar first, then info */}
      {infoPos === "below" && (
        <>
          <div style={{ height: "2px", backgroundColor: headerBg }}></div>
          <div style={{ height: `${s.accentLineHeight || 1.5}px`, backgroundColor: accentLine }}></div>
          {renderCompanyInfo(false)}
        </>
      )}

      {/* 5. BODY */}
      <div className="px-2.5 flex-1" style={{ fontFamily: s.bodyFontFamily || "Arial", fontSize: "5.5px", color: s.bodyTextColor || "#2d3748", lineHeight: 1.6, paddingTop: "4mm" }}>
        {/* Document title (pill badge) */}
        {s.docTitleShow !== false && (
          <div className="mb-1.5" style={{ textAlign: s.docTitlePosition || "left" }}>
            <span style={{ display: "inline-block", backgroundColor: docTitleColor, color: "#fff", padding: "1px 6px", borderRadius: "8px", fontSize: "5px", fontWeight: "bold" }}>
              {s.docTitleText || form.suratType || "Surat Penawaran"}
            </span>
          </div>
        )}

        {/* Nomor / Lampiran / Perihal */}
        <div className="space-y-0.5 mb-2">
          <div className="flex justify-between">
            <p>Nomor&nbsp;&nbsp;&nbsp;: {form.suratNumber || "—"}</p>
            <p className="text-slate-500">{form.city}, {formatDate(form.issueDate)}</p>
          </div>
          {form.lampiran && <p>Lampiran : {form.lampiran}</p>}
          <p>Perihal&nbsp;&nbsp;: {form.perihal || "—"}</p>
        </div>

        {/* Kepada Yth */}
        <div className="space-y-0.5 mb-2">
          <p>Kepada Yth,</p>
          {form.recipientName && <p className="font-bold">{form.recipientName}</p>}
          {form.recipientInstansi && <p>{form.recipientInstansi}</p>}
          {form.recipientAddress && <p className="text-slate-600">{form.recipientAddress}</p>}
        </div>

        {/* Isi Surat */}
        <div
          className="leading-relaxed mb-2"
          dangerouslySetInnerHTML={{ __html: form.body || '<p style="color:#cbd5e1;font-style:italic">Silakan tulis isi surat resmi Anda di form sebelah kiri...</p>' }}
        />

        {/* Detail Kegiatan */}
        {form.includeActivity && (
          <div className="mt-1 space-y-0.5 mb-2">
            {form.activityDate && <p>Tanggal&nbsp;&nbsp;&nbsp;: {form.activityDate}</p>}
            {form.activityLocation && <p>Lokasi&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {form.activityLocation}</p>}
            {form.activityTime && <p>Waktu&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {form.activityTime}</p>}
          </div>
        )}

        {/* Tanda Tangan */}
        <div className="mt-3" style={{ textAlign: s.sigPosition || "right" }}>
          <p>Hormat kami,</p>
          <div className="h-6"></div>
          {s.sigLineStyle !== "none" && (
            <div style={{
              width: "45%",
              marginLeft: s.sigPosition === "right" ? "auto" : s.sigPosition === "center" ? "auto" : "0",
              borderTop: s.sigLineStyle === "dashed" ? "1px dashed" : "1px solid",
              borderColor: s.sigLineColor || "#d1d5db",
              marginBottom: "2px",
            }} />
          )}
          <p className="font-bold" style={{ color: s.sigNameColor || "#0f234b" }}>{form.signatoryName}</p>
          <p className="text-slate-500" style={{ fontSize: "4.5px" }}>{form.signatoryTitle}</p>
        </div>
      </div>

      {/* 6. FOOTER */}
      {s.footerShowText ? (
        <div style={{ background: footerBg, padding: "4px 8px", textAlign: "center" }}>
          <p style={{ color: footerTextColor, fontWeight: "bold", fontSize: "6px" }}>{s.footerText || "Terima Kasih!"}</p>
          {s.footerSubText && <p style={{ color: footerTextColor, fontSize: "4px", opacity: 0.8 }}>{s.footerSubText}</p>}
        </div>
      ) : (
        <div style={{ backgroundColor: footerBg, height: `${s.footerHeight || 6}px` }}></div>
      )}
    </div>
  );
}

