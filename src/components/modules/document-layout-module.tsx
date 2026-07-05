"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Receipt, Wallet, Save, RefreshCw, Palette,
  Layout, Type, AlignLeft, Image as ImageIcon, Upload, Check, Eye,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DOC_TYPES = [
  { key: "SURAT", label: "Surat Resmi", icon: FileText, color: "blue" },
  { key: "INVOICE", label: "Invoice", icon: Receipt, color: "violet" },
  { key: "SLIP_GAJI", label: "Slip Gaji", icon: Wallet, color: "green" },
];

const PAPER_SIZES = [
  { value: "A4", label: "A4 (210 × 297 mm)" },
  { value: "Letter", label: "Letter (216 × 279 mm)" },
  { value: "Legal", label: "Legal (216 × 356 mm)" },
  { value: "F4", label: "F4/Folio (215 × 330 mm)" },
  { value: "A5", label: "A5 (148 × 210 mm)" },
];

const FONT_FAMILIES = ["Arial", "Times New Roman", "Courier New", "Georgia", "Verdana", "Calibri", "Tahoma"];
const POSITIONS = [
  { value: "left", label: "Kiri" },
  { value: "center", label: "Tengah" },
  { value: "right", label: "Kanan" },
];
const LINE_STYLES = [
  { value: "solid", label: "Garis Solid" },
  { value: "dashed", label: "Garis Putus-putus" },
  { value: "none", label: "Tanpa Garis" },
];

const DEFAULT_SETTINGS: Record<string, any> = {
  SURAT: {
    paperSize: "A4",
    headerBgColor: "#0f234b", headerGradient: true, headerTextColor: "#ffffff", headerHeight: 42,
    companyNameText: "PT. HAFARA AQIBA NUSANTARA", companyNameColor: "#ffffff", companyNameFontSize: 13, companyNameBold: true,
    companyAddressText: "New Head Office: Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur", companyAddressColor: "#dce6f5", companyAddressFontSize: 7.5,
    companyContactText: "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570", companyContactColor: "#b4c8e6", companyContactFontSize: 7,
    logoPosition: "left", logoSize: 14, logoColor: "#ff8000", logoText: "H", logoSubText: "hafaragroup consulting", logoSubTextColor: "#8da8c8",
    accentLineColor: "#ff8000", accentLineHeight: 1.5,
    docTitleText: "Surat Penawaran", docTitlePosition: "left", docTitleFontSize: 9, docTitleColor: "#0f234b", docTitleShow: true,
    bodyFontSize: 10.5, bodyFontFamily: "Arial", bodyTextColor: "#2d3748", bodyLineHeight: 1.6,
    sigPosition: "right", sigNameColor: "#0f234b", sigNameFontSize: 10, sigLineStyle: "dashed", sigLineColor: "#d1d5db",
    stampEnabled: true, stampColor: "#0f234b",
    footerBgColor: "#0f234b", footerHeight: 8, footerShowCompany: false, footerShowContact: false,
  },
  INVOICE: {
    paperSize: "A4",
    headerBgColor: "#1e3a8a", headerGradient: false, headerTextColor: "#ffffff", headerHeight: 38,
    companyNameText: "PT. HAFARA AQIBA NUSANTARA", companyNameColor: "#ffffff", companyNameFontSize: 13, companyNameBold: true,
    companyAddressText: "New Head Office: Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur", companyAddressColor: "#dce6f5", companyAddressFontSize: 7.5,
    companyContactText: "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570", companyContactColor: "#b4c8e6", companyContactFontSize: 7,
    logoPosition: "left", logoSize: 16, logoColor: "#f97316", logoText: "HF",
    accentLineColor: "#1e3a8a", accentLineHeight: 1.5,
    docTitleText: "INVOICE", docTitlePosition: "center", docTitleFontSize: 16, docTitleColor: "#1e3a8a", docTitleShow: true,
    tableHeaderBgColor: "#1e3a8a", tableHeaderTextColor: "#ffffff", tableRowAltColor: "#eff6ff",
    bodyFontSize: 8, bodyFontFamily: "Arial", bodyTextColor: "#334155",
    totalLabelColor: "#1e3a8a", totalFontSize: 9,
    statusBadgePending: "#fbbf24", statusBadgePaid: "#22c55e", statusBadgeCancelled: "#ef4444",
    sigPosition: "right", sigNameColor: "#1e3a8a",
    footerBgColor: "#1e3a8a", footerHeight: 8, footerShowCompany: false, footerShowContact: false,
  },
  SLIP_GAJI: {
    paperSize: "A4",
    headerBgColor: "#1e3a8a", headerGradient: false, headerTextColor: "#ffffff", headerHeight: 38,
    companyNameText: "PT. HAFARA AQIBA NUSANTARA", companyNameColor: "#ffffff", companyNameFontSize: 15, companyNameBold: true,
    companyAddressText: "New Head Office: Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur", companyAddressColor: "#dce6f5", companyAddressFontSize: 7.5,
    companyContactText: "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570", companyContactColor: "#b4c8e6", companyContactFontSize: 7,
    logoPosition: "left", logoSize: 16, logoColor: "#1e3a8a", logoText: "HF",
    accentLineColor: "#2563eb", accentLineHeight: 1.5,
    docTitleText: "SLIP GAJI", docTitlePosition: "center", docTitleFontSize: 14, docTitleColor: "#1e3a8a", docTitleShow: true,
    sectionHeaderBgColor: "#eff6ff", sectionHeaderTextColor: "#1e3a8a",
    bodyFontSize: 8, bodyFontFamily: "Arial", bodyTextColor: "#334155",
    earningsColor: "#16a34a", deductionsColor: "#ef4444",
    netSalaryBgColor: "#1e3a8a", netSalaryTextColor: "#ffffff", netSalaryFontSize: 13,
    footerBgColor: "#1e3a8a", footerHeight: 8, footerShowCompany: false, footerShowContact: false,
  },
};

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0xff) + Math.round(2.55 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function DocumentLayoutModule() {
  const [activeDoc, setActiveDoc] = useState("SURAT");
  const [layouts, setLayouts] = useState<Record<string, any>>({});
  const [appSettings, setAppSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ layouts: Record<string, any>; appSettings: any }>("/api/doc-layout");
      const merged: Record<string, any> = {};
      for (const dt of DOC_TYPES) {
        merged[dt.key] = { ...DEFAULT_SETTINGS[dt.key], ...(d.layouts?.[dt.key] || {}) };
      }
      setLayouts(merged);
      setAppSettings(d.appSettings || {});
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(docType: string) {
    setSaving(true);
    try {
      await api("/api/doc-layout", { method: "PUT", body: JSON.stringify({ docType, settings: layouts[docType] }) });
      toast.success(`Pengaturan ${DOC_TYPES.find((d) => d.key === docType)?.label} disimpan`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  function handleReset(docType: string) {
    setLayouts({ ...layouts, [docType]: { ...DEFAULT_SETTINGS[docType] } });
    toast.info("Direset ke default (klik Simpan untuk menyimpan)");
  }

  function updateSetting(docType: string, key: string, value: any) {
    setLayouts({ ...layouts, [docType]: { ...layouts[docType], [key]: value } });
  }

  async function handleUploadImage(key: string, file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const d = await api<{ url: string }>("/api/doc-layout", { method: "POST", body: JSON.stringify({ key, base64Data: base64, fileName: file.name }) });
        setAppSettings({ ...appSettings, [key === "company_logo" ? "companyLogo" : "companySignature"]: d.url });
        toast.success("Gambar berhasil diupload");
      } catch (e: any) { toast.error(e.message); }
    };
    reader.readAsDataURL(file);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Layout className="w-6 h-6 text-blue-600" /> Pengaturan Layout Dokumen
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Kustomisasi tata letak dengan live preview. Header: Nama Perusahaan → Alamat → Kontak. Footer kosong.
        </p>
      </div>

      {/* Logo & Signature */}
      <Card className="shadow-sm border-blue-200">
        <CardHeader className="pb-3 bg-blue-50/50">
          <CardTitle className="text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-600" /> Logo Perusahaan & Tanda Tangan Digital</CardTitle>
          <p className="text-xs text-slate-500">Otomatis digunakan di semua dokumen. Terhubung dengan Pengaturan Aplikasi.</p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadField label="Logo Perusahaan" value={appSettings.companyLogo} onChange={(file) => handleUploadImage("company_logo", file)} />
            <ImageUploadField label="Tanda Tangan Digital" value={appSettings.companySignature} onChange={(file) => handleUploadImage("company_signature", file)} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeDoc} onValueChange={setActiveDoc}>
        <TabsList className="flex-wrap h-auto gap-1">
          {DOC_TYPES.map((dt) => (
            <TabsTrigger key={dt.key} value={dt.key} className="text-xs"><dt.icon className="w-3.5 h-3.5 mr-1" /> {dt.label}</TabsTrigger>
          ))}
        </TabsList>

        {DOC_TYPES.map((dt) => {
          const s = layouts[dt.key] || {};
          return (
            <TabsContent key={dt.key} value={dt.key} className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ===== LEFT: Settings ===== */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Atur layout untuk <strong>{dt.label}</strong></p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleReset(dt.key)} className="bg-white text-xs"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset</Button>
                      <Button size="sm" onClick={() => handleSave(dt.key)} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />} Simpan</Button>
                    </div>
                  </div>

                  {/* Paper Size */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Layout className="w-4 h-4 text-blue-600" /> Ukuran Kertas</CardTitle></CardHeader>
                    <CardContent>
                      <SelectField label="Ukuran Kertas" value={s.paperSize || "A4"} options={PAPER_SIZES} onChange={(v) => updateSetting(dt.key, "paperSize", v)} />
                    </CardContent>
                  </Card>

                  {/* Header & Logo */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-600" /> Header (Nama → Alamat → Kontak)</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <ColorField label="Warna BG Header" value={s.headerBgColor} onChange={(v) => updateSetting(dt.key, "headerBgColor", v)} />
                        <div className="space-y-1"><Label className="text-xs">Tinggi Header (mm)</Label><Input type="number" value={s.headerHeight} onChange={(e) => updateSetting(dt.key, "headerHeight", Number(e.target.value))} className="bg-white h-8" /></div>
                      </div>
                      <div className="flex items-center gap-2"><Switch checked={s.headerGradient} onCheckedChange={(v) => updateSetting(dt.key, "headerGradient", v)} /><Label className="text-xs">Gradient Background</Label></div>
                      <ColorField label="Warna Teks Header" value={s.headerTextColor} onChange={(v) => updateSetting(dt.key, "headerTextColor", v)} />
                      <Separator className="my-2" />
                      <p className="text-xs font-semibold text-slate-500">ISI HEADER (urutan: Nama → Alamat → Kontak)</p>
                      <div className="space-y-1"><Label className="text-xs">Teks Nama Perusahaan</Label><Input value={s.companyNameText} onChange={(e) => updateSetting(dt.key, "companyNameText", e.target.value)} className="bg-white h-8" /></div>
                      <div className="grid grid-cols-3 gap-2">
                        <ColorField label="Warna Nama" value={s.companyNameColor} onChange={(v) => updateSetting(dt.key, "companyNameColor", v)} />
                        <div className="space-y-1"><Label className="text-xs">Ukuran Font</Label><Input type="number" step="0.5" value={s.companyNameFontSize} onChange={(e) => updateSetting(dt.key, "companyNameFontSize", Number(e.target.value))} className="bg-white h-8" /></div>
                        <SelectField label="Rata Teks" value={s.companyNameAlign || "right"} options={POSITIONS} onChange={(v) => updateSetting(dt.key, "companyNameAlign", v)} />
                      </div>
                      <div className="flex items-center gap-2"><Switch checked={s.companyNameBold} onCheckedChange={(v) => updateSetting(dt.key, "companyNameBold", v)} /><Label className="text-xs">Nama Perusahaan Bold</Label></div>
                      <div className="space-y-1"><Label className="text-xs">Teks Alamat</Label><Input value={s.companyAddressText} onChange={(e) => updateSetting(dt.key, "companyAddressText", e.target.value)} className="bg-white h-8" /></div>
                      <div className="grid grid-cols-3 gap-2">
                        <ColorField label="Warna Alamat" value={s.companyAddressColor} onChange={(v) => updateSetting(dt.key, "companyAddressColor", v)} />
                        <div className="space-y-1"><Label className="text-xs">Ukuran Font</Label><Input type="number" step="0.5" value={s.companyAddressFontSize} onChange={(e) => updateSetting(dt.key, "companyAddressFontSize", Number(e.target.value))} className="bg-white h-8" /></div>
                        <SelectField label="Rata Teks" value={s.companyAddressAlign || "right"} options={POSITIONS} onChange={(v) => updateSetting(dt.key, "companyAddressAlign", v)} />
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Teks Kontak (Email | Web | Telp)</Label><Input value={s.companyContactText} onChange={(e) => updateSetting(dt.key, "companyContactText", e.target.value)} className="bg-white h-8" /></div>
                      <div className="grid grid-cols-3 gap-2">
                        <ColorField label="Warna Kontak" value={s.companyContactColor} onChange={(v) => updateSetting(dt.key, "companyContactColor", v)} />
                        <div className="space-y-1"><Label className="text-xs">Ukuran Font</Label><Input type="number" step="0.5" value={s.companyContactFontSize} onChange={(e) => updateSetting(dt.key, "companyContactFontSize", Number(e.target.value))} className="bg-white h-8" /></div>
                        <SelectField label="Rata Teks" value={s.companyContactAlign || "right"} options={POSITIONS} onChange={(v) => updateSetting(dt.key, "companyContactAlign", v)} />
                      </div>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-3 gap-2">
                        <SelectField label="Posisi Logo" value={s.logoPosition} options={POSITIONS} onChange={(v) => updateSetting(dt.key, "logoPosition", v)} />
                        <div className="space-y-1"><Label className="text-xs">Ukuran Logo (mm)</Label><Input type="number" value={s.logoSize} onChange={(e) => updateSetting(dt.key, "logoSize", Number(e.target.value))} className="bg-white h-8" /></div>
                        <ColorField label="Warna Logo" value={s.logoColor} onChange={(v) => updateSetting(dt.key, "logoColor", v)} />
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Teks Logo</Label><Input value={s.logoText} onChange={(e) => updateSetting(dt.key, "logoText", e.target.value)} className="bg-white h-8" /></div>
                    </CardContent>
                  </Card>

                  {/* Document Title */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Type className="w-4 h-4 text-blue-600" /> Judul Dokumen</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2"><Switch checked={s.docTitleShow} onCheckedChange={(v) => updateSetting(dt.key, "docTitleShow", v)} /><Label className="text-xs">Tampilkan Judul Dokumen</Label></div>
                      <div className="space-y-1"><Label className="text-xs">Teks Judul</Label><Input value={s.docTitleText} onChange={(e) => updateSetting(dt.key, "docTitleText", e.target.value)} className="bg-white h-8" /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <SelectField label="Posisi Judul" value={s.docTitlePosition} options={POSITIONS} onChange={(v) => updateSetting(dt.key, "docTitlePosition", v)} />
                        <div className="space-y-1"><Label className="text-xs">Ukuran Font Judul</Label><Input type="number" step="0.5" value={s.docTitleFontSize} onChange={(e) => updateSetting(dt.key, "docTitleFontSize", Number(e.target.value))} className="bg-white h-8" /></div>
                      </div>
                      <ColorField label="Warna Judul" value={s.docTitleColor} onChange={(v) => updateSetting(dt.key, "docTitleColor", v)} />
                    </CardContent>
                  </Card>

                  {/* Body & Accent */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Type className="w-4 h-4 text-blue-600" /> Isi & Garis Aksen</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label className="text-xs">Ukuran Font Isi</Label><Input type="number" step="0.5" value={s.bodyFontSize} onChange={(e) => updateSetting(dt.key, "bodyFontSize", Number(e.target.value))} className="bg-white h-8" /></div>
                        <SelectField label="Jenis Font" value={s.bodyFontFamily} options={FONT_FAMILIES.map(f => ({ value: f, label: f }))} onChange={(v) => updateSetting(dt.key, "bodyFontFamily", v)} />
                      </div>
                      <ColorField label="Warna Teks Isi" value={s.bodyTextColor} onChange={(v) => updateSetting(dt.key, "bodyTextColor", v)} />
                      {s.bodyLineHeight !== undefined && <div className="space-y-1"><Label className="text-xs">Line Height</Label><Input type="number" step="0.1" value={s.bodyLineHeight} onChange={(e) => updateSetting(dt.key, "bodyLineHeight", Number(e.target.value))} className="bg-white h-8" /></div>}
                      <Separator className="my-2" />
                      <ColorField label="Warna Garis Aksen" value={s.accentLineColor} onChange={(v) => updateSetting(dt.key, "accentLineColor", v)} />
                      <div className="space-y-1"><Label className="text-xs">Tebal Garis (mm)</Label><Input type="number" step="0.5" value={s.accentLineHeight} onChange={(e) => updateSetting(dt.key, "accentLineHeight", Number(e.target.value))} className="bg-white h-8" /></div>
                      {s.tableHeaderBgColor && (<><Separator className="my-2" /><p className="text-xs font-semibold text-slate-500">Tabel (Invoice)</p><div className="grid grid-cols-2 gap-2"><ColorField label="BG Header Tabel" value={s.tableHeaderBgColor} onChange={(v) => updateSetting(dt.key, "tableHeaderBgColor", v)} /><ColorField label="Teks Header Tabel" value={s.tableHeaderTextColor} onChange={(v) => updateSetting(dt.key, "tableHeaderTextColor", v)} /></div><ColorField label="Baris Alternatif" value={s.tableRowAltColor} onChange={(v) => updateSetting(dt.key, "tableRowAltColor", v)} /></>)}
                      {s.sectionHeaderBgColor && (<><Separator className="my-2" /><p className="text-xs font-semibold text-slate-500">Section (Slip Gaji)</p><div className="grid grid-cols-2 gap-2"><ColorField label="BG Section" value={s.sectionHeaderBgColor} onChange={(v) => updateSetting(dt.key, "sectionHeaderBgColor", v)} /><ColorField label="Teks Section" value={s.sectionHeaderTextColor} onChange={(v) => updateSetting(dt.key, "sectionHeaderTextColor", v)} /></div><div className="grid grid-cols-2 gap-2"><ColorField label="Warna Pendapatan" value={s.earningsColor} onChange={(v) => updateSetting(dt.key, "earningsColor", v)} /><ColorField label="Warna Potongan" value={s.deductionsColor} onChange={(v) => updateSetting(dt.key, "deductionsColor", v)} /></div><div className="grid grid-cols-2 gap-2"><ColorField label="BG Gaji Bersih" value={s.netSalaryBgColor} onChange={(v) => updateSetting(dt.key, "netSalaryBgColor", v)} /><ColorField label="Teks Gaji Bersih" value={s.netSalaryTextColor} onChange={(v) => updateSetting(dt.key, "netSalaryTextColor", v)} /></div></>)}
                      {s.statusBadgePending && (<><Separator className="my-2" /><p className="text-xs font-semibold text-slate-500">Status Badge (Invoice)</p><div className="grid grid-cols-3 gap-2"><ColorField label="Pending" value={s.statusBadgePending} onChange={(v) => updateSetting(dt.key, "statusBadgePending", v)} /><ColorField label="Paid" value={s.statusBadgePaid} onChange={(v) => updateSetting(dt.key, "statusBadgePaid", v)} /><ColorField label="Cancelled" value={s.statusBadgeCancelled} onChange={(v) => updateSetting(dt.key, "statusBadgeCancelled", v)} /></div></>)}
                    </CardContent>
                  </Card>

                  {/* Signature & Footer */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><AlignLeft className="w-4 h-4 text-blue-600" /> Tanda Tangan & Footer</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <SelectField label="Posisi Tanda Tangan" value={s.sigPosition} options={POSITIONS} onChange={(v) => updateSetting(dt.key, "sigPosition", v)} />
                      <ColorField label="Warna Nama Penandatangan" value={s.sigNameColor} onChange={(v) => updateSetting(dt.key, "sigNameColor", v)} />
                      {s.sigLineStyle && (<><SelectField label="Gaya Garis TTD" value={s.sigLineStyle} options={LINE_STYLES} onChange={(v) => updateSetting(dt.key, "sigLineStyle", v)} /><ColorField label="Warna Garis TTD" value={s.sigLineColor} onChange={(v) => updateSetting(dt.key, "sigLineColor", v)} /></>)}
                      {s.stampEnabled !== undefined && <div className="flex items-center gap-2"><Switch checked={s.stampEnabled} onCheckedChange={(v) => updateSetting(dt.key, "stampEnabled", v)} /><Label className="text-xs">Tampilkan Stempel</Label></div>}
                      <Separator className="my-2" />
                      <p className="text-xs font-semibold text-slate-500">FOOTER</p>
                      <div className="flex items-center gap-2"><Switch checked={s.footerShowText} onCheckedChange={(v) => updateSetting(dt.key, "footerShowText", v)} /><Label className="text-xs">Tampilkan Teks di Footer</Label></div>
                      {s.footerShowText && (
                        <>
                          <div className="space-y-1"><Label className="text-xs">Teks Footer (judul)</Label><Input value={s.footerText} onChange={(e) => updateSetting(dt.key, "footerText", e.target.value)} className="bg-white h-8" placeholder="Terima Kasih!" /></div>
                          <div className="space-y-1"><Label className="text-xs">Sub-teks Footer</Label><Input value={s.footerSubText} onChange={(e) => updateSetting(dt.key, "footerSubText", e.target.value)} className="bg-white h-8" placeholder="Atas dedikasi & kontribusi Anda..." /></div>
                          <ColorField label="Warna Teks Footer" value={s.footerTextColor} onChange={(v) => updateSetting(dt.key, "footerTextColor", v)} />
                        </>
                      )}
                      <ColorField label="Warna BG Footer" value={s.footerBgColor} onChange={(v) => updateSetting(dt.key, "footerBgColor", v)} />
                      <div className="space-y-1"><Label className="text-xs">Tinggi Footer (mm)</Label><Input type="number" value={s.footerHeight} onChange={(e) => updateSetting(dt.key, "footerHeight", Number(e.target.value))} className="bg-white h-8" /></div>
                    </CardContent>
                  </Card>
                </div>

                {/* ===== RIGHT: Live Preview ===== */}
                <div className="space-y-4">
                  <Card className="shadow-sm sticky top-4">
                    <CardHeader className="pb-2 bg-slate-50">
                      <CardTitle className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Live Preview — {dt.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <LivePreview docType={dt.key} settings={s} appSettings={appSettings} />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

// ===== LIVE PREVIEW =====
function LivePreview({ docType, settings, appSettings }: { docType: string; settings: any; appSettings: any }) {
  const s = settings;
  const logoUrl = appSettings.companyLogo;
  const sigUrl = appSettings.companySignature;
  const directorName = appSettings.directorName || "M. Aqil Baihaqi";
  const directorTitle = appSettings.directorTitle || "Direktur Utama";
  const logoSizePx = (s.logoSize || 12) * 2.5;

  const alignMap: Record<string, string> = { left: "left", center: "center", right: "right" };
  const nameAlign = alignMap[s.companyNameAlign] || "right";
  const addrAlign = alignMap[s.companyAddressAlign] || "right";
  const contactAlign = alignMap[s.companyContactAlign] || "right";

  // Header background: gradient or solid
  const headerBg = s.headerGradient
    ? `linear-gradient(135deg, ${s.headerBgColor} 0%, ${shadeColor(s.headerBgColor, 15)} 50%, ${s.headerBgColor} 100%)`
    : s.headerBgColor;

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden mx-auto shadow-md" style={{ minHeight: "500px", display: "flex", flexDirection: "column" }}>
      {/* ===== BOXED HEADER (navy background, logo + company info inside) ===== */}
      <div style={{ background: headerBg, padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", minHeight: `${s.headerHeight || 32}px` }}>
          {/* Logo LEFT */}
          {s.logoPosition !== "right" && (
            <div className="shrink-0" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: `${logoSizePx}px`, height: `${logoSizePx}px`, objectFit: "contain", borderRadius: "50%" }} />
              ) : (
                <div style={{ width: `${logoSizePx}px`, height: `${logoSizePx}px`, borderRadius: "50%", backgroundColor: s.logoColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "11px" }}>{s.logoText}</div>
              )}
              {s.logoSubText && <p style={{ color: s.logoSubTextColor, fontSize: "7px", marginTop: "2px", textAlign: "center", fontWeight: "bold" }}>{s.logoSubText}</p>}
            </div>
          )}

          {/* Company info: Name → Address → Contact (inside navy box) */}
          <div className="flex-1 min-w-0" style={{ textAlign: nameAlign }}>
            <p style={{ color: s.companyNameColor, fontWeight: s.companyNameBold ? "bold" : "normal", fontSize: `${s.companyNameFontSize}px`, lineHeight: "1.3" }}>{s.companyNameText}</p>
            <p style={{ color: s.companyAddressColor, fontSize: `${s.companyAddressFontSize}px`, lineHeight: "1.3", marginTop: "1px", textAlign: addrAlign }}>{s.companyAddressText}</p>
            <p style={{ color: s.companyContactColor, fontSize: `${s.companyContactFontSize}px`, lineHeight: "1.3", marginTop: "1px", textAlign: contactAlign }}>{s.companyContactText}</p>
          </div>

          {/* Logo RIGHT */}
          {s.logoPosition === "right" && (
            <div className="shrink-0" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: `${logoSizePx}px`, height: `${logoSizePx}px`, objectFit: "contain", borderRadius: "50%" }} />
              ) : (
                <div style={{ width: `${logoSizePx}px`, height: `${logoSizePx}px`, borderRadius: "50%", backgroundColor: s.logoColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "11px" }}>{s.logoText}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== ACCENT LINE (thin colored line below header) ===== */}
      <div style={{ height: `${s.accentLineHeight || 1.5}px`, backgroundColor: s.accentLineColor }}></div>

      {/* ===== BODY ===== */}
      <div style={{ fontFamily: s.bodyFontFamily, fontSize: `${s.bodyFontSize}pt`, color: s.bodyTextColor, lineHeight: s.bodyLineHeight || 1.6, padding: "10px 14px", flex: 1 }}>
        {/* Document Title */}
        {s.docTitleShow && (
          <p style={{ textAlign: s.docTitlePosition, fontSize: `${s.docTitleFontSize}pt`, color: s.docTitleColor, fontWeight: "bold", marginBottom: "6px" }}>
            {docType === "SURAT" ? (
              <span style={{ display: "inline-block", backgroundColor: s.docTitleColor, color: "#fff", padding: "2px 10px", borderRadius: "10px", fontSize: "9px" }}>{s.docTitleText}</span>
            ) : s.docTitleText}
          </p>
        )}

        {docType === "SURAT" && <SuratPreview s={s} directorName={directorName} directorTitle={directorTitle} sigUrl={sigUrl} />}
        {docType === "INVOICE" && <InvoicePreview s={s} directorName={directorName} directorTitle={directorTitle} sigUrl={sigUrl} />}
        {docType === "SLIP_GAJI" && <SlipGajiPreview s={s} />}
      </div>

      {/* ===== FOOTER (navy background with text) ===== */}
      {s.footerShowText ? (
        <div style={{ background: s.footerGradient ? `linear-gradient(135deg, ${s.footerBgColor} 0%, ${shadeColor(s.footerBgColor, 10)} 100%)` : s.footerBgColor, padding: "8px 14px", textAlign: "center" }}>
          <p style={{ color: s.footerTextColor, fontWeight: "bold", fontSize: "11px" }}>{s.footerText || "Terima Kasih!"}</p>
          {s.footerSubText && <p style={{ color: s.footerTextColor, fontSize: "7px", opacity: 0.8, marginTop: "1px" }}>{s.footerSubText}</p>}
        </div>
      ) : (
        <div style={{ backgroundColor: s.footerBgColor, height: `${s.footerHeight || 6}px` }}></div>
      )}
    </div>
  );
}

function SuratPreview({ s, directorName, directorTitle, sigUrl }: any) {
  return (
    <div>
      <div style={{ fontSize: "10px", marginBottom: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Nomor: 001/SP/HAN/VII/2026</span>
          <span style={{ color: "#888" }}>Jombang, 05 Juli 2026</span>
        </div>
        <span>Perihal: Penawaran Kerjasama Training</span>
      </div>
      <div style={{ fontSize: "10px", marginBottom: "6px" }}>
        <p>Kepada Yth,</p>
        <p style={{ fontWeight: "bold" }}>Bapak Budi Santoso</p>
        <p>PT Maju Jaya</p>
      </div>
      <div style={{ fontSize: "10px", marginBottom: "12px" }}>
        <p>Sehubungan dengan adanya permintaan PT Maju Jaya kepada PT Hafara Aqiba Nusantara untuk menyediakan Motivator...</p>
      </div>
      <div style={{ textAlign: s.sigPosition, marginTop: "16px" }}>
        <p style={{ fontSize: "10px" }}>Hormat kami,</p>
        <div style={{ height: "35px" }}>{sigUrl && <img src={sigUrl} alt="TTD" style={{ height: "30px", objectFit: "contain" }} />}</div>
        {s.sigLineStyle !== "none" && <div style={{ width: "40%", marginLeft: s.sigPosition === "right" ? "auto" : s.sigPosition === "center" ? "auto" : "0", borderTop: s.sigLineStyle === "dashed" ? "1px dashed" : "1px solid", borderColor: s.sigLineColor, marginBottom: "3px" }} />}
        <p style={{ fontWeight: "bold", color: s.sigNameColor, fontSize: `${s.sigNameFontSize}px` }}>{directorName}</p>
        <p style={{ fontSize: "9px", color: "#888" }}>{directorTitle}</p>
      </div>
    </div>
  );
}

function InvoicePreview({ s, directorName, directorTitle, sigUrl }: any) {
  return (
    <div>
      <div style={{ fontSize: "10px", marginBottom: "6px", textAlign: "right" }}>
        <p>Nomor: 001/INV/HAN/VII/2026</p>
        <p>Tanggal: 05 Juli 2026</p>
      </div>
      <div style={{ fontSize: "10px", marginBottom: "6px" }}><p>DITAGIHKAN KEPADA:</p><p style={{ fontWeight: "bold" }}>PT Maju Jaya</p></div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", fontSize: "9px" }}>
        <thead><tr style={{ backgroundColor: s.tableHeaderBgColor, color: s.tableHeaderTextColor }}>
          <th style={{ padding: "4px", textAlign: "left" }}>DESKRIPSI</th><th style={{ padding: "4px", textAlign: "center" }}>JUMLAH</th><th style={{ padding: "4px", textAlign: "right" }}>TOTAL</th>
        </tr></thead>
        <tbody><tr style={{ backgroundColor: s.tableRowAltColor }}>
          <td style={{ padding: "4px" }}>Leadership Training</td><td style={{ padding: "4px", textAlign: "center" }}>1</td><td style={{ padding: "4px", textAlign: "right" }}>Rp 25.000.000</td>
        </tr></tbody>
      </table>
      <div style={{ textAlign: "right", fontSize: "10px", marginBottom: "6px" }}>
        <p>Subtotal: Rp 25.000.000</p>
        <p style={{ fontWeight: "bold", color: s.totalLabelColor }}>TOTAL: Rp 25.000.000</p>
        <span style={{ backgroundColor: s.statusBadgePending, color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "8px" }}>PENDING</span>
      </div>
      <div style={{ textAlign: s.sigPosition, marginTop: "12px" }}>
        <p style={{ fontSize: "9px" }}>Hormat kami,</p>
        <div style={{ height: "30px" }}>{sigUrl && <img src={sigUrl} alt="TTD" style={{ height: "25px" }} />}</div>
        <p style={{ fontWeight: "bold", color: s.sigNameColor, fontSize: "9px" }}>{directorName}</p>
        <p style={{ fontSize: "8px", color: "#888" }}>{directorTitle}</p>
      </div>
    </div>
  );
}

function SlipGajiPreview({ s }: any) {
  return (
    <div>
      <div style={{ backgroundColor: s.sectionHeaderBgColor, color: s.sectionHeaderTextColor, padding: "4px 8px", fontSize: "9px", fontWeight: "bold", marginBottom: "4px", borderRadius: "3px" }}>KARYAWAN</div>
      <div style={{ fontSize: "9px", marginBottom: "6px" }}>
        <p>Nama: <strong>Ahmad Fauzi</strong></p>
        <p>Jabatan: Assistant Trainer</p>
        <p>Periode: Juli 2026</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "5px" }}>
          <p style={{ fontSize: "8px", fontWeight: "bold", color: s.earningsColor, marginBottom: "2px" }}>PENDAPATAN</p>
          <p style={{ fontSize: "8px" }}>Gaji Pokok: Rp 5.500.000</p>
          <p style={{ fontSize: "8px", fontWeight: "bold" }}>Total: Rp 6.000.000</p>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "5px" }}>
          <p style={{ fontSize: "8px", fontWeight: "bold", color: s.deductionsColor, marginBottom: "2px" }}>POTONGAN</p>
          <p style={{ fontSize: "8px" }}>BPJS: Rp 300.000</p>
          <p style={{ fontSize: "8px", fontWeight: "bold" }}>Total: Rp 650.000</p>
        </div>
      </div>
      <div style={{ backgroundColor: s.netSalaryBgColor, color: s.netSalaryTextColor, padding: "8px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "10px" }}>GAJI BERSIH</span>
        <span style={{ fontSize: `${s.netSalaryFontSize}px`, fontWeight: "bold" }}>Rp 5.350.000</span>
      </div>
    </div>
  );
}

// ===== HELPER COMPONENTS =====
function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (file: File) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
        {value ? <img src={value} alt={label} className="w-full h-full object-contain" /> : <ImageIcon className="w-8 h-8 text-slate-300" />}
      </div>
      <div className="flex-1">
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} className="hidden" id={`upload-${label}`} />
        <Button variant="outline" className="bg-white" onClick={() => document.getElementById(`upload-${label}`)?.click()}><Upload className="w-4 h-4 mr-2" /> Upload {label}</Button>
        <p className="text-[10px] text-slate-400 mt-1">Format: JPG, PNG. Maks 2MB.</p>
        {value && <div className="flex items-center gap-1 mt-1"><Check className="w-3 h-3 text-green-600" /><p className="text-[10px] text-green-600">Terhubung ke semua dokumen</p></div>}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded border border-slate-200 cursor-pointer shrink-0" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-white h-8 text-xs font-mono" />
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}><SelectTrigger className="bg-white h-8"><SelectValue /></SelectTrigger><SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
    </div>
  );
}
