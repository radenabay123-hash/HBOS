"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText, Plus, Download, Edit3, Trash2, RefreshCw, X, Eye,
  Building2, Calendar, User, CreditCard, FileCheck, AlertCircle, Search, CheckSquare,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/constants";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { fetchLayoutSettings, loadImageAsDataURL } from "@/lib/layout-helper";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { Pagination } from "@/components/shared/pagination";
import { SelectCheckbox } from "@/components/shared/filter-bar";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = { PENDING: "Pending", PAID: "Lunas", CANCELLED: "Dibatalkan" };
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  PAID: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
};

interface InvoiceItem {
  description: string;
  qty: number;
  price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  clientAddress?: string;
  city?: string;
  description?: string;
  items: string; // JSON
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: string;
  paymentInstruction?: string;
  terms?: string;
  note?: string;
  bankName?: string;
  bankAccount?: string;
  accountName?: string;
  createdAt: string;
}

export function InvoiceModule({ user }: { user: SafeUser }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; invoice: Invoice | null }>({ open: false, invoice: null });
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; invoice: Invoice | null }>({ open: false, invoice: null });
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [companySettings, setCompanySettings] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    invoiceNumber: "", issueDate: new Date().toISOString().slice(0, 10),
    clientName: "", clientAddress: "", city: "Jombang", description: "",
    items: [{ description: "", qty: 1, price: 0, total: 0 }] as InvoiceItem[],
    discount: 0, tax: 0, status: "PENDING",
    paymentInstruction: "Transfer ke Bank Mandiri 1234567890 a.n PT Hafara Aqiba Nusantara",
    terms: "1. Pembayaran DP sebesar 50% sebelum kegiatan.\n2. Pelunasan maksimal H+3 setelah training selesai.",
    note: "", bankName: "Bank Mandiri", bankAccount: "1234567890", accountName: "PT Hafara Aqiba Nusantara",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, settings] = await Promise.all([
        api<{ invoices: Invoice[] }>("/api/invoice"),
        api<{ settings: any[] }>("/api/settings").catch(() => ({ settings: [] })),
      ]);
      setInvoices(d.invoices || []);
      const sMap: Record<string, string> = {};
      for (const s of settings.settings || []) {
        sMap[s.key] = s.value;
      }
      setCompanySettings(sMap);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Generate auto invoice number
  function generateInvoiceNumber() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const romanMonth = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][month - 1];
    const seq = String(invoices.length + 1).padStart(3, "0");
    return `${seq}/INV/HAN/${romanMonth}/${now.getFullYear()}`;
  }

  function handleAddItem() {
    setForm({ ...form, items: [...form.items, { description: "", qty: 1, price: 0, total: 0 }] });
  }

  function handleRemoveItem(index: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  }

  function handleItemChange(index: number, field: keyof InvoiceItem, value: any) {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].total = newItems[index].qty * newItems[index].price;
    setForm({ ...form, items: newItems });
  }

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const totalAmount = subtotal - (Number(form.discount) || 0) + (Number(form.tax) || 0);

  async function handleSave() {
    if (!form.invoiceNumber || !form.clientName) {
      toast.error("Nomor invoice dan nama klien wajib diisi");
      return;
    }
    try {
      const payload = {
        ...form,
        items: form.items,
        subtotal,
        totalAmount,
      };
      if (dialog.invoice) {
        await api(`/api/invoice/${dialog.invoice.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Invoice diperbarui");
      } else {
        await api("/api/invoice", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Invoice dibuat");
      }
      setDialog({ open: false, invoice: null });
      // Reset form
      setForm({
        ...form,
        invoiceNumber: "", clientName: "", clientAddress: "", description: "",
        items: [{ description: "", qty: 1, price: 0, total: 0 }],
        discount: 0, tax: 0, note: "",
      });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus invoice ini?")) return;
    try { await api(`/api/invoice/${id}`, { method: "DELETE" }); toast.success("Dihapus"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedCount} invoice terpilih?`)) return;
    let success = 0;
    let failed = 0;
    for (const id of selectedArray) {
      try {
        await api(`/api/invoice/${id}`, { method: "DELETE" });
        success++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    setBulkMode(false);
    await load();
    if (failed === 0) {
      toast.success(`${success} invoice berhasil dihapus`);
    } else {
      toast.error(`${success} dihapus, ${failed} gagal`);
    }
  }

  async function handleDownloadPDF(inv: Invoice) {
    const items = JSON.parse(inv.items || "[]");
    // Fetch layout settings - ALL design comes from here
    let layoutSettings: any = null;
    let logoUrl = "";
    try {
      const ld = await fetchLayoutSettings("INVOICE");
      layoutSettings = ld.layout;
      logoUrl = ld.appSettings?.companyLogo || companySettings.company_logo || "";
    } catch {}
    // Load logo image as data URL for jsPDF
    const logoImageData = await loadImageAsDataURL(logoUrl);
    // CLEAN: only pass content data, all design comes from layout settings
    downloadInvoicePDF({
      invoiceNumber: inv.invoiceNumber,
      issueDate: formatDate(inv.issueDate),
      clientName: inv.clientName,
      clientAddress: inv.clientAddress || "",
      city: inv.city || "",
      description: inv.description || "",
      items,
      subtotal: inv.subtotal,
      discount: inv.discount,
      tax: inv.tax,
      totalAmount: inv.totalAmount,
      status: inv.status,
      paymentInstruction: inv.paymentInstruction || "",
      terms: inv.terms || "",
      bankName: inv.bankName || "",
      bankAccount: inv.bankAccount || "",
      accountName: inv.accountName || "",
      directorName: companySettings.director_name,
      directorTitle: companySettings.director_title,
      logoImageData,
      layout: layoutSettings,
    });
    toast.success("Invoice PDF diunduh");
  }

  function openCreate() {
    setForm({
      invoiceNumber: generateInvoiceNumber(),
      issueDate: new Date().toISOString().slice(0, 10),
      clientName: "", clientAddress: "", city: "Jombang", description: "",
      items: [{ description: "", qty: 1, price: 0, total: 0 }],
      discount: 0, tax: 0, status: "PENDING",
      paymentInstruction: "Transfer ke Bank Mandiri 1234567890 a.n PT Hafara Aqiba Nusantara",
      terms: "1. Pembayaran DP sebesar 50% sebelum kegiatan.\n2. Pelunasan maksimal H+3 setelah training selesai.",
      note: "", bankName: "Bank Mandiri", bankAccount: "1234567890", accountName: "PT Hafara Aqiba Nusantara",
    });
    setDialog({ open: true, invoice: null });
  }

  function openEdit(inv: Invoice) {
    const items = JSON.parse(inv.items || "[]");
    setForm({
      invoiceNumber: inv.invoiceNumber,
      issueDate: new Date(inv.issueDate).toISOString().slice(0, 10),
      clientName: inv.clientName,
      clientAddress: inv.clientAddress || "",
      city: inv.city || "Jombang",
      description: inv.description || "",
      items: items.length > 0 ? items : [{ description: "", qty: 1, price: 0, total: 0 }],
      discount: inv.discount,
      tax: inv.tax,
      status: inv.status,
      paymentInstruction: inv.paymentInstruction || "",
      terms: inv.terms || "",
      note: inv.note || "",
      bankName: inv.bankName || "",
      bankAccount: inv.bankAccount || "",
      accountName: inv.accountName || "",
    });
    setDialog({ open: true, invoice: inv });
  }

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const text = [i.invoiceNumber, i.clientName, i.description, i.city]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, filterStatus, search]);

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
  } = useBulkSelect({ getId: (i: Invoice) => i.id });

  // Reset selection + go to page 1 when filters change
  useEffect(() => {
    resetSelection();
    resetPage();
  }, [search, filterStatus, resetSelection, resetPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" /> Invoice
          </h1>
          <p className="text-sm text-slate-500 mt-1">Buat dan kelola invoice profesional</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Lunas</SelectItem>
              <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Buat Invoice
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-slate-500">Total Invoice</p><p className="text-lg font-bold text-slate-900">{invoices.length}</p></div>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-slate-500">Pending</p><p className="text-lg font-bold text-slate-900">{invoices.filter((i) => i.status === "PENDING").length}</p></div>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><FileCheck className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-slate-500">Lunas</p><p className="text-lg font-bold text-slate-900">{invoices.filter((i) => i.status === "PAID").length}</p></div>
        </CardContent></Card>
      </div>

      {/* Filter Bar (search + bulk-select toggle) */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor invoice, klien, deskripsi..."
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
              confirmText: `Hapus ${selectedCount} invoice terpilih? Tindakan ini tidak dapat dibatalkan.`,
            },
          ]}
          onClearSelection={clearSelection}
        />
      )}

      {/* Invoice list */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Belum ada invoice</p>
              <p className="text-xs text-slate-400 mt-1">Klik "Buat Invoice" untuk membuat baru</p>
            </div>
          ) : (
            <>
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b text-left text-xs text-slate-500">
                    {bulkMode && <th className="py-3 px-3 w-[40px]"><SelectCheckbox checked={isAllSelected(paginatedItems)} onChange={() => toggleAll(paginatedItems)} /></th>}
                    <th className="py-3 px-4 font-medium">Nomor Invoice</th>
                    <th className="py-3 px-3 font-medium">Klien</th>
                    <th className="py-3 px-3 font-medium">Tanggal</th>
                    <th className="py-3 px-3 font-medium text-right">Total</th>
                    <th className="py-3 px-3 font-medium text-center">Status</th>
                    {!bulkMode && <th className="py-3 px-3 font-medium text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                      {bulkMode && <td className="py-2.5 px-3"><SelectCheckbox checked={isSelected(inv)} onChange={() => toggle(inv)} /></td>}
                      <td className="py-2.5 px-4 font-medium text-slate-900 text-xs">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">{inv.clientName}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">{formatDate(inv.issueDate)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 text-xs">{formatCurrency(inv.totalAmount)}</td>
                      <td className="py-2.5 px-3 text-center"><Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[inv.status])}>{STATUS_LABELS[inv.status]}</Badge></td>
                      {!bulkMode && (
                        <td className="py-2.5 px-3">
                          <div className="flex gap-0.5 justify-center">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600" title="Preview" onClick={() => setPreviewDialog({ open: true, invoice: inv })}><Eye className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600" title="Download PDF" onClick={() => handleDownloadPDF(inv)}><Download className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" onClick={() => openEdit(inv)}><Edit3 className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500" title="Hapus" onClick={() => handleDelete(inv.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, invoice: dialog.invoice })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-900">Buat Invoice Baru</DialogTitle>
            <DialogDescription>Isi data uang masuk atau uang keluar</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {/* Invoice info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Nomor Invoice</Label>
                <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} className="bg-white" placeholder="001/INV/HAN/VII/2026" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Tanggal Terbit</Label>
                <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Ditagihkan Ke</Label>
                <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="bg-white" placeholder="e.g. PT Maju Jaya" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Kota Penerbitan</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-white" placeholder="Jombang" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Alamat Klien</Label>
              <Textarea value={form.clientAddress} onChange={(e) => setForm({ ...form, clientAddress: e.target.value })} className="bg-white resize-none" rows={2} placeholder="Alamat lengkap klien..." />
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-blue-900 mb-1.5">RINCIAN PRODUK / JASA</p>
              <div className="space-y-1.5">
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white" placeholder="e.g. Leadership Training – Batch 1" />
              </div>

              {/* Items table */}
              <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="py-2 px-2 text-left text-[10px] font-bold">DESKRIPSI</th>
                      <th className="py-2 px-2 text-center text-[10px] font-bold w-16">JUMLAH</th>
                      <th className="py-2 px-2 text-right text-[10px] font-bold w-32">HARGA SATUAN</th>
                      <th className="py-2 px-2 text-right text-[10px] font-bold w-32">TOTAL</th>
                      <th className="py-2 px-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-1"><Input value={item.description} onChange={(e) => handleItemChange(i, "description", e.target.value)} className="h-8 bg-white border-0" placeholder="Deskripsi item" /></td>
                        <td className="p-1"><Input type="number" value={item.qty} onChange={(e) => handleItemChange(i, "qty", Number(e.target.value))} className="h-8 bg-white border-0 text-center" /></td>
                        <td className="p-1"><Input type="number" value={item.price} onChange={(e) => handleItemChange(i, "price", Number(e.target.value))} className="h-8 bg-white border-0 text-right" /></td>
                        <td className="p-1 text-right font-bold text-blue-900 text-xs px-2">{formatCurrency(item.total)}</td>
                        <td className="p-1 text-center">{form.items.length > 1 && <button onClick={() => handleRemoveItem(i)} className="text-rose-400 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button size="sm" variant="outline" onClick={handleAddItem} className="mt-1.5 bg-white text-xs">
                <Plus className="w-3 h-3 mr-1" /> Tambah Item
              </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Diskon (Rp)</Label>
                <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Pajak (Rp)</Label>
                <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} className="bg-white" />
              </div>
            </div>

            {/* Total preview */}
            <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-blue-900">TOTAL PEMBAYARAN</span>
              <span className="text-xl font-bold text-blue-700">{formatCurrency(totalAmount)}</span>
            </div>

            {/* Status & Note */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Status Pembayaran</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Lunas</SelectItem>
                    <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Catatan Internal</Label>
                <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="bg-white" placeholder="e.g. Pembayaran DP masuk 50%" />
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Instruksi Pembayaran</Label>
              <Textarea value={form.paymentInstruction} onChange={(e) => setForm({ ...form, paymentInstruction: e.target.value })} className="bg-white resize-none" rows={2} />
            </div>

            {/* Bank info */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5"><Label className="text-xs">Bank</Label><Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="bg-white" /></div>
              <div className="space-y-1.5"><Label className="text-xs">No. Rekening</Label><Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} className="bg-white" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Atas Nama</Label><Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="bg-white" /></div>
            </div>

            {/* Terms */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Syarat & Ketentuan</Label>
              <Textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className="bg-white resize-none" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, invoice: null })}>Batal</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">{dialog.invoice ? "Update" : "Simpan"} Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(o) => setPreviewDialog({ open: o, invoice: previewDialog.invoice })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600" /> Preview Invoice</DialogTitle>
          </DialogHeader>
          {previewDialog.invoice && (() => {
            const inv = previewDialog.invoice;
            const items = JSON.parse(inv.items || "[]");
            return (
              <div className="space-y-3">
                {/* Company header */}
                <div className="border-b-2 border-blue-600 pb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg relative">
                      H
                      <div className="absolute inset-0 rounded-full bg-blue-600 opacity-50" style={{ clipPath: "circle(60% at 60% 60%)" }} />
                    </div>
                    <div>
                      <p className="font-bold text-blue-900">PT. HAFARA AQIBA NUSANTARA</p>
                      <p className="text-[10px] text-slate-500">{`Email: info@hafaragroup.com | Web: www.HafaraGroup.com | Telp: 081324511570`}</p>
                      <p className="text-[10px] text-slate-500">New Head Office: Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur</p>
                    </div>
                  </div>
                </div>

                {/* Invoice title */}
                <p className="text-center font-bold text-blue-900 text-2xl">INVOICE</p>

                {/* Invoice info */}
                <div className="flex justify-end text-xs text-slate-500 space-y-0.5">
                  <div className="text-right">
                    <p>Nomor Invoice: {inv.invoiceNumber}</p>
                    <p>Tanggal: {formatDate(inv.issueDate)}</p>
                  </div>
                </div>

                {/* Client */}
                <div>
                  <p className="text-xs font-bold text-blue-900">DITAGIHKAN KEPADA:</p>
                  <p className="font-bold text-blue-900">{inv.clientName}</p>
                  <p className="text-xs text-slate-500">{inv.clientAddress}</p>
                </div>

                {/* Items table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="py-2 px-2 text-left">DESKRIPSI PRODUK / LAYANAN</th>
                        <th className="py-2 px-2 text-center w-16">JUMLAH</th>
                        <th className="py-2 px-2 text-center w-32">HARGA SATUAN</th>
                        <th className="py-2 px-2 text-right w-32">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: InvoiceItem, i: number) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="py-2 px-2">{item.description}</td>
                          <td className="py-2 px-2 text-center">{item.qty}</td>
                          <td className="py-2 px-2 text-center">{formatCurrency(item.price)}</td>
                          <td className="py-2 px-2 text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Subtotal:</span><span>{formatCurrency(inv.subtotal)}</span></div>
                    {inv.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Diskon:</span><span>- {formatCurrency(inv.discount)}</span></div>}
                    {inv.tax > 0 && <div className="flex justify-between"><span className="text-slate-500">Pajak:</span><span>{formatCurrency(inv.tax)}</span></div>}
                    <div className="flex justify-between font-bold text-blue-900 border-t border-slate-200 pt-1"><span>TOTAL PEMBAYARAN:</span><span>{formatCurrency(inv.totalAmount)}</span></div>
                    <div className={cn("rounded px-2 py-1 text-center font-bold", STATUS_COLORS[inv.status])}>STATUS: {STATUS_LABELS[inv.status]}</div>
                  </div>
                </div>

                {/* Payment instructions */}
                {inv.paymentInstruction && (
                  <div>
                    <p className="text-xs font-bold text-blue-900">INSTRUKSI PEMBAYARAN:</p>
                    <p className="text-xs text-slate-600">{inv.paymentInstruction}</p>
                  </div>
                )}

                {/* Terms */}
                {inv.terms && (
                  <div>
                    <p className="text-xs font-bold text-blue-900">SYARAT & KETENTUAN:</p>
                    <p className="text-xs text-slate-500 whitespace-pre-wrap">{inv.terms}</p>
                  </div>
                )}

                <Button onClick={() => handleDownloadPDF(inv)} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
