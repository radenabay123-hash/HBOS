"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import { api } from "@/lib/api-client";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import {
  ROLES,
  DOCUMENT_TYPES,
  formatDate,
  formatDateTime,
} from "@/lib/constants";
import type { SafeUser } from "@/lib/auth";
import { toast } from "sonner";
import {
  FileStack,
  Plus,
  FileText,
  FileSpreadsheet,
  Pencil,
  Trash2,
  ExternalLink,
  Inbox,
  Loader2,
  Receipt,
  FileSignature,
  ScrollText,
  Search,
  CheckSquare,
  X,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { Pagination } from "@/components/shared/pagination";
import { SelectCheckbox } from "@/components/shared/filter-bar";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";

interface DocumentItem {
  id: string;
  clientId?: string | null;
  documentType: string;
  documentName: string;
  documentNumber?: string | null;
  link: string;
  description?: string | null;
  uploadedById: string;
  client?: { id: string; namaKlien: string } | null;
  uploadedBy?: { id: string; name: string } | null;
  createdAt: string;
}

interface ClientOption {
  id: string;
  namaKlien: string;
  instansi?: string | null;
}

interface DocumentsModuleProps {
  user: SafeUser;
}

const DOC_TYPE_COLORS: Record<string, string> = {
  INVOICE: "bg-blue-100 text-blue-700 border-blue-200",
  SPK: "bg-violet-100 text-violet-700 border-violet-200",
  SURAT: "bg-amber-100 text-amber-700 border-amber-200",
  KONTRAK: "bg-cyan-100 text-cyan-700 border-cyan-200",
  KWITANSI: "bg-pink-100 text-pink-700 border-pink-200",
  LAINNYA: "bg-slate-100 text-slate-700 border-slate-200",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  SURAT: "Surat",
  INVOICE: "Invoice",
  SPK: "SPK",
  KONTRAK: "Kontrak",
  KWITANSI: "Kwitansi",
  LAINNYA: "Lainnya",
};

function docTypeLabel(t: string): string {
  return DOC_TYPE_LABELS[t] || t;
}

function docTypeColor(t: string): string {
  return DOC_TYPE_COLORS[t] || DOC_TYPE_COLORS.LAINNYA;
}

const EMPTY_FORM = {
  documentType: "SURAT",
  customType: "",
  documentName: "",
  documentNumber: "",
  clientId: "",
  link: "",
  description: "",
};

export function DocumentsModule({ user }: DocumentsModuleProps) {
  const canManage =
    user.role === ROLES.OWNER ||
    user.role === ROLES.PROJECT_MANAGER ||
    user.role === ROLES.FINANCE;
  const canDelete =
    user.role === ROLES.OWNER || user.role === ROLES.PROJECT_MANAGER;

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [clientFilter, setClientFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [monthFilter, setMonthFilter] = useState("0"); // "0" = Semua Bulan
  const [yearFilter, setYearFilter] = useState("0"); // "0" = Semua Tahun

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; item: DocumentItem | null }>({ open: false, item: null });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ documents: DocumentItem[] }>("/api/documents");
      setDocuments(data.documents || []);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat dokumen");
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

  useEffect(() => {
    loadDocuments();
    loadClients();
  }, [loadDocuments, loadClients]);

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (typeFilter !== "ALL" && d.documentType !== typeFilter) return false;
      if (clientFilter !== "ALL") {
        if (clientFilter === "__none__") {
          if (d.clientId) return false;
        } else if (d.clientId !== clientFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        if (
          !(d.documentName || "").toLowerCase().includes(q) &&
          !(d.documentType || "").toLowerCase().includes(q) &&
          !(docTypeLabel(d.documentType) || "").toLowerCase().includes(q) &&
          !(d.documentNumber || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      // Year/Month filter by createdAt
      if (d.createdAt) {
        const dt = new Date(d.createdAt);
        if (!isNaN(dt.getTime())) {
          if (yearFilter !== "0" && dt.getFullYear() !== Number(yearFilter)) return false;
          if (monthFilter !== "0" && (dt.getMonth() + 1) !== Number(monthFilter)) return false;
        } else if (yearFilter !== "0" || monthFilter !== "0") {
          return false;
        }
      } else if (yearFilter !== "0" || monthFilter !== "0") {
        return false;
      }
      return true;
    });
  }, [documents, typeFilter, clientFilter, search, yearFilter, monthFilter]);

  // Pagination (max 15 per page)
  const {
    paginatedItems: paginatedDocs,
    goToPage: goToDocPage,
    nextPage: nextDocPage,
    prevPage: prevDocPage,
    pageInfo: docPageInfo,
    resetPage: resetDocPage,
  } = usePagination(filtered, { pageSize: 15 });

  // Bulk selection (only users with delete permission can use bulk mode)
  const {
    selectedArray: selectedDocArray,
    selectedCount: selectedDocCount,
    isSelected: isDocSelected,
    toggle: toggleDoc,
    toggleAll: toggleAllDocs,
    clearSelection: clearDocSelection,
    resetSelection: resetDocSelection,
    isAllSelected: isAllDocsSelected,
  } = useBulkSelect({ getId: (d: DocumentItem) => d.id });

  // Reset selection + page when client-side filters change
  useEffect(() => {
    resetDocSelection();
    resetDocPage();
  }, [search, typeFilter, clientFilter, yearFilter, monthFilter, resetDocSelection, resetDocPage]);

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedDocCount} dokumen terpilih?`)) return;
    let success = 0;
    let failed = 0;
    for (const id of selectedDocArray) {
      try {
        await api(`/api/documents/${id}`, { method: "DELETE" });
        success++;
      } catch {
        failed++;
      }
    }
    clearDocSelection();
    setBulkMode(false);
    await loadDocuments();
    if (failed === 0) {
      toast.success(`${success} dokumen berhasil dihapus`);
    } else {
      toast.error(`${success} dihapus, ${failed} gagal`);
    }
  }

  const stats = useMemo(() => {
    const total = documents.length;
    const invoice = documents.filter((d) => d.documentType === "INVOICE").length;
    const spk = documents.filter((d) => d.documentType === "SPK").length;
    const surat = documents.filter((d) => d.documentType === "SURAT").length;
    return { total, invoice, spk, surat };
  }, [documents]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(d: DocumentItem) {
    setEditing(d);
    const isCustom = !DOCUMENT_TYPES.includes(d.documentType as any);
    setForm({
      documentType: isCustom ? "LAINNYA" : d.documentType,
      customType: isCustom ? d.documentType : "",
      documentName: d.documentName || "",
      documentNumber: d.documentNumber || "",
      clientId: d.clientId || "",
      link: d.link || "",
      description: d.description || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.documentName.trim()) {
      toast.error("Nama dokumen wajib diisi");
      return;
    }
    if (!form.link.trim()) {
      toast.error("Link dokumen wajib diisi");
      return;
    }
    const finalType =
      form.documentType === "LAINNYA" && form.customType.trim()
        ? form.customType.trim().toUpperCase().replace(/\s+/g, "_")
        : form.documentType;
    if (!finalType) {
      toast.error("Tipe dokumen wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        documentType: finalType,
        documentName: form.documentName.trim(),
        documentNumber: form.documentNumber.trim() || null,
        clientId: form.clientId || null,
        link: form.link.trim(),
        description: form.description.trim() || null,
      };
      if (editing) {
        await api(`/api/documents/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Dokumen berhasil diperbarui");
      } else {
        await api("/api/documents", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Dokumen baru ditambahkan");
      }
      setDialogOpen(false);
      await loadDocuments();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan dokumen");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api(`/api/documents/${deleteId}`, { method: "DELETE" });
      toast.success("Dokumen berhasil dihapus");
      setDeleteId(null);
      await loadDocuments();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus dokumen");
    } finally {
      setDeleting(false);
    }
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const rows = filtered.map((d) => ({
      "Nama Dokumen": d.documentName || "",
      Tipe: docTypeLabel(d.documentType),
      "Nomor": d.documentNumber || "",
      "Klien": d.client?.namaKlien || "-",
      "Link": d.link || "",
      "Keterangan": d.description || "",
      "Diunggah Oleh": d.uploadedBy?.name || "-",
      "Tanggal": formatDate(d.createdAt),
    }));
    exportToExcel(rows, `Dokumen-${new Date().toISOString().slice(0, 10)}`, "Dokumen");
    toast.success("Excel berhasil diekspor");
  }

  function handleExportPDF() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const columns = [
      "Nama Dokumen", "Tipe", "Nomor", "Klien", "Keterangan", "Diunggah Oleh", "Tanggal",
    ];
    const rows = filtered.map((d) => [
      d.documentName || "-",
      docTypeLabel(d.documentType),
      d.documentNumber || "-",
      d.client?.namaKlien || "-",
      d.description || "-",
      d.uploadedBy?.name || "-",
      formatDate(d.createdAt),
    ]);
    exportToPDF(
      "Dokumen & Administrasi",
      columns,
      rows,
      `Dokumen-${new Date().toISOString().slice(0, 10)}.pdf`,
      `Total: ${filtered.length} dokumen`
    );
    toast.success("PDF berhasil diekspor");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dokumen & Administrasi"
        description="Kelola surat, invoice, SPK, dan dokumen administrasi lainnya beserta link dan keterangan."
        action={
          canManage ? (
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Tambah Dokumen
            </Button>
          ) : undefined
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Dokumen"
          value={stats.total}
          icon={FileStack}
          indicator="neutral"
          subtitle="Seluruh dokumen"
          accent="bg-slate-100 text-slate-600"
        />
        <StatCard
          title="Total Invoice"
          value={stats.invoice}
          icon={Receipt}
          indicator="green"
          subtitle="Dokumen tagihan"
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Total SPK"
          value={stats.spk}
          icon={FileSignature}
          indicator="neutral"
          subtitle="Surat Perintah Kerja"
          accent="bg-violet-50 text-violet-600"
        />
        <StatCard
          title="Total Surat"
          value={stats.surat}
          icon={ScrollText}
          indicator="yellow"
          subtitle="Dokumen surat"
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Tipe</SelectItem>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {docTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Semua Klien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Klien</SelectItem>
                <SelectItem value="__none__">— Tanpa Klien —</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.namaKlien}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={handleExportPDF} className="flex-1 sm:flex-none">
                <FileText className="w-4 h-4" /> PDF
              </Button>
              <Button variant="outline" onClick={handleExportExcel} className="flex-1 sm:flex-none">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
            </div>
          </div>

          {/* Search + Year/Month + bulk-select toggle */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mt-3 pt-3 border-t border-slate-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, tipe, atau nomor dokumen..."
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
            {canDelete && (
              <Button
                variant={bulkMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setBulkMode(!bulkMode);
                  if (bulkMode) clearDocSelection();
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
      {bulkMode && selectedDocCount > 0 && (
        <BulkActionBar
          selectedCount={selectedDocCount}
          actions={[
            {
              label: "Hapus Terpilih",
              icon: Trash2,
              onClick: handleBulkDelete,
              variant: "destructive",
              confirmText: `Hapus ${selectedDocCount} dokumen terpilih? Tindakan ini tidak dapat dibatalkan.`,
            },
          ]}
          onClearSelection={clearDocSelection}
        />
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">Belum ada dokumen</p>
              <p className="text-sm text-slate-400 mt-1">
                {canManage
                  ? "Klik tombol Tambah Dokumen untuk menambah dokumen baru."
                  : "Belum ada dokumen yang tersedia."}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">Tidak ada dokumen yang cocok</p>
              <p className="text-sm text-slate-400 mt-1">
                Coba ubah kata kunci, tipe, atau klien.
              </p>
            </div>
          ) : (
            <>
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    {bulkMode && (
                      <TableHead className="w-[40px]">
                        <SelectCheckbox
                          checked={isAllDocsSelected(paginatedDocs)}
                          onChange={() => toggleAllDocs(paginatedDocs)}
                        />
                      </TableHead>
                    )}
                    <TableHead className="min-w-[200px]">Nama Dokumen</TableHead>
                    <TableHead className="min-w-[120px]">Tipe</TableHead>
                    <TableHead className="min-w-[140px]">Nomor</TableHead>
                    <TableHead className="min-w-[160px]">Klien</TableHead>
                    <TableHead className="text-center min-w-[80px]">Link</TableHead>
                    <TableHead className="min-w-[200px]">Keterangan</TableHead>
                    <TableHead className="min-w-[140px]">Diunggah Oleh</TableHead>
                    <TableHead className="min-w-[120px]">Tanggal</TableHead>
                    {!bulkMode && <TableHead className="text-center min-w-[100px]">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDocs.map((d) => (
                    <TableRow key={d.id} className="hover:bg-slate-50/50">
                      {bulkMode && (
                        <TableCell>
                          <SelectCheckbox
                            checked={isDocSelected(d)}
                            onChange={() => toggleDoc(d)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="font-medium text-slate-900">{d.documentName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={docTypeColor(d.documentType)}>
                          {docTypeLabel(d.documentType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700">{d.documentNumber || "-"}</TableCell>
                      <TableCell className="text-slate-700">
                        {d.client?.namaKlien || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <a
                            href={d.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Buka dokumen"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-[240px]">
                        <div className="truncate" title={d.description || ""}>
                          {d.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {d.uploadedBy?.name || "-"}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {formatDate(d.createdAt)}
                      </TableCell>
                      {canDelete && !bulkMode && (
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => setPreviewDialog({ open: true, item: d })}
                              title="Preview Dokumen"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-blue-600"
                              onClick={() => openEdit(d)}
                              title="Edit Dokumen"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-rose-600"
                              onClick={() => setDeleteId(d.id)}
                              title="Hapus Dokumen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      {!canDelete && !bulkMode && (
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => setPreviewDialog({ open: true, item: d })}
                              title="Preview Dokumen"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <Pagination
              currentPage={docPageInfo.currentPage}
              totalPages={docPageInfo.totalPages}
              totalItems={docPageInfo.totalItems}
              startIndex={docPageInfo.startIndex}
              endIndex={docPageInfo.endIndex}
              hasNext={docPageInfo.hasNext}
              hasPrev={docPageInfo.hasPrev}
              onPageChange={goToDocPage}
              onNext={nextDocPage}
              onPrev={prevDocPage}
            />
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Dokumen" : "Tambah Dokumen Baru"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui informasi dokumen administrasi."
                : "Lengkapi data dokumen dan tautan aksesnya."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="documentType">Tipe Dokumen *</Label>
                <Select
                  value={form.documentType}
                  onValueChange={(v) => setForm({ ...form, documentType: v })}
                >
                  <SelectTrigger id="documentType" className="w-full">
                    <SelectValue placeholder="Pilih tipe dokumen" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {docTypeLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.documentType === "LAINNYA" && (
                <div className="space-y-1.5">
                  <Label htmlFor="customType">Tipe Kustom</Label>
                  <Input
                    id="customType"
                    value={form.customType}
                    onChange={(e) => setForm({ ...form, customType: e.target.value })}
                    placeholder="Contoh: MOU, NDA, dll."
                  />
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="documentName">Nama Dokumen *</Label>
                <Input
                  id="documentName"
                  value={form.documentName}
                  onChange={(e) => setForm({ ...form, documentName: e.target.value })}
                  required
                  placeholder="Invoice Pelatihan Leadership Batch 1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="documentNumber">Nomor Dokumen</Label>
                <Input
                  id="documentNumber"
                  value={form.documentNumber}
                  onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                  placeholder="INV/2025/001"
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
                        {c.namaKlien}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="link">Link Dokumen *</Label>
                <Input
                  id="link"
                  type="url"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  required
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Keterangan</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Catatan tambahan terkait dokumen..."
                  rows={3}
                />
              </div>
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
                  "Tambah Dokumen"
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
            <AlertDialogTitle>Hapus Dokumen?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data dokumen akan dihapus permanen.
              Pastikan tautan asli dokumen tidak hilang.
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
            <DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-600" /> Preview Dokumen</DialogTitle>
          </DialogHeader>
          {previewDialog.item && (() => {
            const d = previewDialog.item;
            return (
              <div className="space-y-3 py-2">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Nama Dokumen</p>
                  <p className="text-sm text-slate-700 font-medium">{d.documentName || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Tipe Dokumen</p>
                    <Badge variant="outline" className={docTypeColor(d.documentType)}>
                      {docTypeLabel(d.documentType)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Nomor Dokumen</p>
                    <p className="text-sm text-slate-700">{d.documentNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Klien</p>
                    <p className="text-sm text-slate-700">{d.client?.namaKlien || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Diunggah Oleh</p>
                    <p className="text-sm text-slate-700">{d.uploadedBy?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Dibuat Pada</p>
                    <p className="text-sm text-slate-700">{formatDateTime(d.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Link Dokumen</p>
                  {d.link ? (
                    <a
                      href={d.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800 hover:underline break-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> {d.link}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-700">-</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Keterangan</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{d.description || "-"}</p>
                </div>
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
