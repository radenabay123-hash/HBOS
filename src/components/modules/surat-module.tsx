"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/constants";
import { downloadSuratPDF } from "@/lib/surat-pdf";
import { fetchLayoutSettings } from "@/lib/layout-helper";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
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

  // Form state
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
    logoWidth: "144",
    headerContact: "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570",
    headerAddress1: "New Head Office : Jl. Tanjung Sariloyo Sambongdukuh,",
    headerAddress2: "Kab. Jombang, Jawa Timur",
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
      if (sMap.header_contact) setForm((f) => ({ ...f, headerContact: sMap.header_contact }));
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
      logoWidth: "144",
      headerContact: companySettings.header_contact || "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570",
      headerAddress1: companySettings.company_address ? companySettings.company_address.split(",")[0] : "New Head Office : Jl. Tanjung Sariloyo Sambongdukuh,",
      headerAddress2: companySettings.company_address ? companySettings.company_address.split(",").slice(1).join(",").trim() : "Kab. Jombang, Jawa Timur",
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
      logoWidth: String(s.logoWidth || 144),
      headerContact: s.headerContact || "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570",
      headerAddress1: s.headerAddress1 || "New Head Office : Jl. Tanjung Sariloyo Sambongdukuh,",
      headerAddress2: s.headerAddress2 || "Kab. Jombang, Jawa Timur",
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

  async function handleDownloadPDF(s: any) {
    let layoutSettings: any = null;
    try {
      const ld = await fetchLayoutSettings("SURAT");
      layoutSettings = ld.layout;
    } catch {}
    downloadSuratPDF({
      ...s,
      issueDate: formatDate(s.issueDate),
      companyName: companySettings.company_name || "PT. HAFARA AQIBA NUSANTARA",
      companyLogo: companySettings.company_logo || "",
      companySignature: companySettings.company_signature || "",
      layout: layoutSettings,
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

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {surats.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada surat</p>
                <p className="text-xs text-slate-400 mt-1">Klik "Surat Resmi Baru" untuk membuat</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b text-left text-xs text-slate-500">
                      <th className="py-3 px-4 font-medium">Nomor Surat</th>
                      <th className="py-3 px-3 font-medium">Jenis</th>
                      <th className="py-3 px-3 font-medium">Perihal</th>
                      <th className="py-3 px-3 font-medium">Tanggal</th>
                      <th className="py-3 px-3 font-medium text-center">Status</th>
                      <th className="py-3 px-3 font-medium text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surats.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                        <td className="py-2.5 px-4 font-medium text-slate-900 text-xs">{s.suratNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600 text-xs">{s.suratType}</td>
                        <td className="py-2.5 px-3 text-slate-600 text-xs max-w-[200px] truncate">{s.perihal || "-"}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs">{formatDate(s.issueDate)}</td>
                        <td className="py-2.5 px-3 text-center"><Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[s.status])}>{STATUS_LABELS[s.status] || s.status}</Badge></td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-0.5 justify-center">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600" title="Download PDF" onClick={() => handleDownloadPDF(s)}><Download className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" onClick={() => openEdit(s)}><Edit3 className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500" title="Hapus" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

            {/* Kustomisasi Header & Logo */}
            <p className="text-xs font-semibold text-blue-900 uppercase">Kustomisasi Header & Logo Surat</p>
            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1"><Label className="text-[10px]">Lebar Logo (Pixel)</Label><Input type="number" value={form.logoWidth} onChange={(e) => setForm({ ...form, logoWidth: e.target.value })} className="bg-white h-8 text-sm" placeholder="144" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Kontak Header</Label><Input value={form.headerContact} onChange={(e) => setForm({ ...form, headerContact: e.target.value })} className="bg-white h-8 text-sm" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Alamat Header Baris 1</Label><Input value={form.headerAddress1} onChange={(e) => setForm({ ...form, headerAddress1: e.target.value })} className="bg-white h-8 text-sm" /></div>
              <div className="space-y-1"><Label className="text-[10px]">Alamat Header Baris 2</Label><Input value={form.headerAddress2} onChange={(e) => setForm({ ...form, headerAddress2: e.target.value })} className="bg-white h-8 text-sm" /></div>
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

        {/* ===== RIGHT: Realtime Preview (A4 Portrait - Modern) ===== */}
        <Card className="shadow-sm self-start sticky top-4">
          <CardHeader className="pb-2 bg-slate-50">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Realtime Layout Preview (A4 Portrait)
            </CardTitle>
            <p className="text-[10px] text-slate-400">Modern Corporate Style</p>
          </CardHeader>
          <CardContent className="p-4">
            {/* A4 Preview container - modern */}
            <div className="bg-white border-2 border-slate-200 rounded-lg mx-auto overflow-hidden shadow-md" style={{ maxWidth: "210px", minHeight: "297px" }}>
              {/* ===== NAVY BLUE HEADER (gradient effect) ===== */}
              <div className="relative" style={{ background: "linear-gradient(135deg, #0f234b 0%, #1b3769 50%, #0f234b 100%)", padding: "8px 10px" }}>
                <div className="flex items-start justify-between">
                  {/* Logo (LEFT) */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold relative shrink-0" style={{ backgroundColor: "#ff8000" }}>
                      H
                      <div className="absolute inset-0 rounded-full" style={{ backgroundColor: "#0f234b", opacity: 0.35, clipPath: "circle(50% at 65% 65%)" }} />
                    </div>
                    <div className="shrink-0">
                      <p className="text-white font-bold text-[8px] leading-none tracking-tight">hafaragroup</p>
                      <p className="text-[5px] leading-none mt-0.5" style={{ color: "#8da8c8" }}>consulting</p>
                    </div>
                  </div>
                  {/* Contact + address (RIGHT) */}
                  <div className="text-right max-w-[55%]">
                    <p className="text-white text-[4.5px] leading-tight opacity-80">{form.headerContact}</p>
                    <p className="text-white text-[4.5px] leading-tight mt-0.5 opacity-70">{form.headerAddress1}</p>
                    <p className="text-white text-[4.5px] leading-tight opacity-70">{form.headerAddress2}</p>
                  </div>
                </div>
              </div>

              {/* Orange accent line */}
              <div style={{ height: "1.5px", background: "linear-gradient(90deg, #ff8000 0%, #ff8000 100%)" }}></div>

              {/* ===== BODY CONTENT ===== */}
              <div className="px-3 py-2.5">
                {/* Document type badge (modern pill) */}
                <div className="inline-block px-2 py-0.5 rounded-full mb-2" style={{ backgroundColor: "#0f234b" }}>
                  <p className="text-white text-[5px] font-bold">{form.suratType || "Surat Penawaran"}</p>
                </div>

                {/* Nomor / Lampiran / Perihal (LEFT) + Tanggal (RIGHT) */}
                <div className="space-y-0.5 mb-2">
                  <div className="flex justify-between">
                    <p className="text-slate-700 text-[5.5px]">Nomor&nbsp;&nbsp;&nbsp;: {form.suratNumber || "—"}</p>
                    <p className="text-slate-500 text-[5.5px]">{form.city}, {formatDate(form.issueDate)}</p>
                  </div>
                  {form.lampiran && <p className="text-slate-700 text-[5.5px]">Lampiran : {form.lampiran}</p>}
                  <p className="text-slate-700 text-[5.5px]">Perihal&nbsp;&nbsp;: {form.perihal || "—"}</p>
                </div>

                {/* Kepada Yth */}
                <div className="space-y-0.5 mb-2">
                  <p className="text-slate-700 text-[5.5px]">Kepada Yth,</p>
                  {form.recipientName && <p className="text-slate-800 text-[5.5px] font-bold">{form.recipientName}</p>}
                  {form.recipientInstansi && <p className="text-slate-700 text-[5.5px]">{form.recipientInstansi}</p>}
                  {form.recipientAddress && <p className="text-slate-600 text-[5.5px]">{form.recipientAddress}</p>}
                </div>

                {/* Isi Surat - render HTML */}
                <div
                  className="text-slate-700 text-[5.5px] leading-relaxed mb-2"
                  dangerouslySetInnerHTML={{ __html: form.body || '<p style="color:#cbd5e1;font-style:italic">Silakan tulis isi surat resmi Anda di form sebelah kiri...</p>' }}
                />

                {/* Detail Kegiatan */}
                {form.includeActivity && (
                  <div className="mt-1 space-y-0.5 mb-2">
                    {form.activityDate && <p className="text-slate-700 text-[5.5px]">Tanggal&nbsp;&nbsp;&nbsp;: {form.activityDate}</p>}
                    {form.activityLocation && <p className="text-slate-700 text-[5.5px]">Lokasi&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {form.activityLocation}</p>}
                    {form.activityTime && <p className="text-slate-700 text-[5.5px]">Waktu&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {form.activityTime}</p>}
                  </div>
                )}

                {/* Tanda Tangan (RIGHT - modern with dashed line) */}
                <div className="mt-3 text-right">
                  <p className="text-slate-700 text-[5.5px]">Hormat kami,</p>
                  <div className="h-7"></div>
                  {/* Dashed signature line */}
                  <div className="border-t border-dashed border-slate-300 mb-1 ml-auto" style={{ width: "45%" }}></div>
                  <p className="text-[5.5px] font-bold" style={{ color: "#0f234b" }}>{form.signatoryName}</p>
                  <p className="text-slate-500 text-[5px]">{form.signatoryTitle}</p>
                </div>
              </div>

              {/* ===== MODERN FOOTER (Navy blue) ===== */}
              <div className="mt-auto">
                <div style={{ height: "1px", background: "#ff8000" }}></div>
                <div style={{ backgroundColor: "#0f234b", padding: "5px 10px" }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white text-[4px] font-bold opacity-80">{companySettings.company_name || "PT. HAFARA AQIBA NUSANTARA"}</p>
                      <p className="text-white text-[3.5px] opacity-50">hafaragroup consulting</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-[3.5px] opacity-60">{form.headerContact}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
