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
  Layout, Type, AlignLeft, Image as ImageIcon, Upload, Check, Eye, Move,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DocumentCanvasEditor } from "@/components/shared/document-canvas-editor";
import { getDefaultLayout, type DocumentLayoutData } from "@/lib/document-elements";

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
const INFO_POSITIONS = [
  { value: "inside", label: "Di Dalam Kotak Navy" },
  { value: "above", label: "Di Atas Kotak Navy" },
  { value: "below", label: "Di Bawah Kotak Navy" },
];

const DEFAULT_SETTINGS: Record<string, any> = {
  SURAT: {
    paperSize: "A4",
    headerBgColor: "#0f234b", headerGradient: false, headerTextColor: "#ffffff", headerHeight: 28,
    companyNameText: "PT. HAFARA AQIBA NUSANTARA", companyNameColor: "#ffffff", companyNameFontSize: 13, companyNameBold: true,
    companyAddressText: "New Head Office: Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur", companyAddressColor: "#dce6f5", companyAddressFontSize: 7.5,
    companyContactText: "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570", companyContactColor: "#b4c8e6", companyContactFontSize: 7,
    logoPosition: "left", logoSize: 14, logoColor: "#ff8000", logoText: "H", logoSubText: "", logoSubTextColor: "#8da8c8", companyInfoPosition: "inside",
    accentLineColor: "#ff8000", accentLineHeight: 1.5,
    docTitleText: "Surat Penawaran", docTitlePosition: "left", docTitleFontSize: 10, docTitleColor: "#0f234b", docTitleShow: true,
    bodyFontSize: 10.5, bodyFontFamily: "Arial", bodyTextColor: "#2d3748", bodyLineHeight: 1.6,
    sigPosition: "right", sigNameColor: "#0f234b", sigNameFontSize: 10, sigLineStyle: "dashed", sigLineColor: "#d1d5db",
    stampEnabled: true, stampColor: "#0f234b",
    footerBgColor: "#0f234b", footerHeight: 14, footerShowText: true, footerText: "Terima Kasih!", footerSubText: "Atas dedikasi & kontribusi Anda kepada Hafara Group.", footerTextColor: "#ffffff",
  },
  INVOICE: {
    paperSize: "A4",
    headerBgColor: "#1e3a8a", headerGradient: false, headerTextColor: "#ffffff", headerHeight: 28,
    companyNameText: "PT. HAFARA AQIBA NUSANTARA", companyNameColor: "#ffffff", companyNameFontSize: 13, companyNameBold: true,
    companyAddressText: "New Head Office: Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur", companyAddressColor: "#dce6f5", companyAddressFontSize: 7.5,
    companyContactText: "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570", companyContactColor: "#b4c8e6", companyContactFontSize: 7,
    logoPosition: "left", logoSize: 16, logoColor: "#f97316", logoText: "HF", logoSubText: "", logoSubTextColor: "#8da8c8", companyInfoPosition: "inside",
    accentLineColor: "#1e3a8a", accentLineHeight: 1.5,
    docTitleText: "INVOICE", docTitlePosition: "left", docTitleFontSize: 18, docTitleColor: "#1e3a8a", docTitleShow: true,
    tableHeaderBgColor: "#1e3a8a", tableHeaderTextColor: "#ffffff", tableRowAltColor: "#eff6ff",
    bodyFontSize: 8, bodyFontFamily: "Arial", bodyTextColor: "#334155",
    totalLabelColor: "#1e3a8a", totalFontSize: 10,
    statusBadgePending: "#fbbf24", statusBadgePaid: "#22c55e", statusBadgeCancelled: "#ef4444",
    sigPosition: "right", sigNameColor: "#1e3a8a",
    footerBgColor: "#1e3a8a", footerHeight: 14, footerShowText: true, footerText: "Thank You!", footerSubText: "Atas dedikasi & kontribusi Anda kepada Hafara Group.", footerTextColor: "#ffffff",
  },
  SLIP_GAJI: {
    paperSize: "A4",
    headerBgColor: "#1e3a8a", headerGradient: false, headerTextColor: "#ffffff", headerHeight: 28,
    companyNameText: "PT. HAFARA AQIBA NUSANTARA", companyNameColor: "#ffffff", companyNameFontSize: 13, companyNameBold: true,
    companyAddressText: "New Head Office: Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur", companyAddressColor: "#dce6f5", companyAddressFontSize: 7.5,
    companyContactText: "Info@hafaragroup.com | www.HafaraGroup.com | Phone: 081324511570", companyContactColor: "#b4c8e6", companyContactFontSize: 7,
    logoPosition: "left", logoSize: 16, logoColor: "#1e3a8a", logoText: "HF", logoSubText: "", logoSubTextColor: "#8da8c8", companyInfoPosition: "inside",
    accentLineColor: "#2563eb", accentLineHeight: 1.5,
    docTitleText: "SLIP GAJI", docTitlePosition: "center", docTitleFontSize: 14, docTitleColor: "#1e3a8a", docTitleShow: true,
    sectionHeaderBgColor: "#eff6ff", sectionHeaderTextColor: "#1e3a8a",
    bodyFontSize: 8, bodyFontFamily: "Arial", bodyTextColor: "#334155",
    earningsColor: "#16a34a", deductionsColor: "#ef4444",
    netSalaryBgColor: "#1e3a8a", netSalaryTextColor: "#ffffff", netSalaryFontSize: 13,
    footerBgColor: "#1e3a8a", footerHeight: 14, footerShowText: true, footerText: "Terima Kasih!", footerSubText: "Atas dedikasi & kontribusi Anda kepada Hafara Group.", footerTextColor: "#ffffff",
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
  const [editorMode, setEditorMode] = useState<"form" | "canvas">("form");

  // Get or create canvas layout data for active doc type
  const getCanvasLayout = (): DocumentLayoutData => {
    const current = layouts[activeDoc];
    if (current?.elements && Array.isArray(current.elements)) {
      return { paperSize: "A4", elements: current.elements };
    }
    return getDefaultLayout(activeDoc);
  };

  // Save canvas layout data
  const saveCanvasLayout = async (data: DocumentLayoutData) => {
    setSaving(true);
    try {
      const merged = { ...layouts[activeDoc], elements: data.elements, paperSize: data.paperSize };
      await api("/api/doc-layout", { method: "PUT", body: JSON.stringify({ docType: activeDoc, settings: merged }) });
      setLayouts({ ...layouts, [activeDoc]: merged });
      toast.success(`Layout ${activeDoc} (Drag & Drop) disimpan!`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

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

      {/* Mode Toggle: Form vs Drag & Drop */}
      <div className="flex items-center gap-2">
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setEditorMode("form")}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
              editorMode === "form" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600")}
          >
            <Palette className="w-3.5 h-3.5" /> Pengaturan Form
          </button>
          <button
            onClick={() => setEditorMode("canvas")}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
              editorMode === "canvas" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600")}
          >
            <Move className="w-3.5 h-3.5" /> Drag & Drop Editor
          </button>
        </div>
        <span className="text-xs text-slate-400">
          {editorMode === "canvas" ? "🔒 Preview = Download, dijamin sama" : "Pengaturan manual via form input"}
        </span>
      </div>

      {/* ===== CANVAS EDITOR MODE ===== */}
      {editorMode === "canvas" && (
        <div className="space-y-4">
          {/* Doc type selector for canvas */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Edit layout:</span>
            <div className="flex gap-1">
              {DOC_TYPES.map((dt) => (
                <button
                  key={dt.key}
                  onClick={() => setActiveDoc(dt.key)}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors",
                    activeDoc === dt.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}
                >
                  <dt.icon className="w-3.5 h-3.5" /> {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Editor */}
          <DocumentCanvasEditor
            docType={activeDoc}
            docLabel={DOC_TYPES.find((d) => d.key === activeDoc)?.label || activeDoc}
            layoutData={getCanvasLayout()}
            onSave={saveCanvasLayout}
            logoUrl={appSettings.companyLogo}
          />
        </div>
      )}

      {/* ===== FORM SETTINGS MODE (existing) ===== */}
      {editorMode === "form" && (
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
                      <SelectField label="Posisi Info Perusahaan" value={s.companyInfoPosition || "above"} options={INFO_POSITIONS} onChange={(v) => updateSetting(dt.key, "companyInfoPosition", v)} />
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
      )}
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

  const headerBg = s.headerBgColor; // SOLID color, no gradient (avoids two-bar effect)

  const infoPos = s.companyInfoPosition || "inside"; // inside, above, below
  const showAbove = infoPos === "above";
  const showBelow = infoPos === "below";
  const showInside = infoPos === "inside";

  // Company info block (reusable)
  const companyInfoBlock = (onDark: boolean) => {
    const nameColor = onDark ? "#ffffff" : s.companyNameColor;
    const addrColor = onDark ? "#dce6f5" : s.companyAddressColor;
    const contactColor = onDark ? "#b4c8e6" : s.companyContactColor;
    return (
      <div style={{ padding: onDark ? "0 14px" : "8px 14px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%" }}>
        {/* Logo */}
        {s.logoPosition !== "right" && (
          <div className="shrink-0" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxWidth: `${logoSizePx * 2}px`, maxHeight: `${logoSizePx}px`, objectFit: "contain", borderRadius: "4px" }} />
            ) : (
              <div style={{ width: `${logoSizePx}px`, height: `${logoSizePx}px`, borderRadius: "50%", backgroundColor: s.logoColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "11px" }}>{s.logoText}</div>
            )}
          </div>
        )}
        {/* Info */}
        <div className="flex-1 min-w-0" style={{ textAlign: nameAlign }}>
          <p style={{ color: nameColor, fontWeight: s.companyNameBold ? "bold" : "normal", fontSize: `${s.companyNameFontSize}px`, lineHeight: "1.3" }}>{s.companyNameText}</p>
          <p style={{ color: addrColor, fontSize: `${s.companyAddressFontSize}px`, lineHeight: "1.3", marginTop: "1px", textAlign: addrAlign }}>{s.companyAddressText}</p>
          <p style={{ color: contactColor, fontSize: `${s.companyContactFontSize}px`, lineHeight: "1.3", marginTop: "1px", textAlign: contactAlign }}>{s.companyContactText}</p>
        </div>
        {/* Logo RIGHT */}
        {s.logoPosition === "right" && (
          <div className="shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxWidth: `${logoSizePx * 2}px`, maxHeight: `${logoSizePx}px`, objectFit: "contain", borderRadius: "4px" }} />
            ) : (
              <div style={{ width: `${logoSizePx}px`, height: `${logoSizePx}px`, borderRadius: "50%", backgroundColor: s.logoColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "11px" }}>{s.logoText}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden mx-auto shadow-md" style={{ minHeight: "500px", display: "flex", flexDirection: "column" }}>
      {/* ===== INFO INSIDE NAVY HEADER (default - most professional) ===== */}
      {showInside && (
        <>
          <div style={{ background: headerBg, minHeight: `${s.headerHeight || 28}px`, padding: "0 14px", display: "flex", alignItems: "center" }}>
            {companyInfoBlock(true)}
          </div>
          {/* Accent line below header */}
          <div style={{ height: `${s.accentLineHeight || 1.5}px`, backgroundColor: s.accentLineColor }}></div>
        </>
      )}

      {/* ===== INFO ABOVE + thin navy accent bar ===== */}
      {showAbove && (
        <>
          {companyInfoBlock(false)}
          <div style={{ height: "3px", backgroundColor: headerBg }}></div>
          <div style={{ height: `${s.accentLineHeight || 1.5}px`, backgroundColor: s.accentLineColor }}></div>
        </>
      )}

      {/* ===== INFO BELOW: thin navy bar first, then info below ===== */}
      {showBelow && (
        <>
          <div style={{ height: "3px", backgroundColor: headerBg }}></div>
          <div style={{ height: `${s.accentLineHeight || 1.5}px`, backgroundColor: s.accentLineColor }}></div>
          {companyInfoBlock(false)}
        </>
      )}

      {/* ===== BODY ===== */}
      <div style={{ fontFamily: s.bodyFontFamily, fontSize: `${s.bodyFontSize}pt`, color: s.bodyTextColor, lineHeight: s.bodyLineHeight || 1.6, padding: "8mm 14px 12px", flex: 1 }}>
        {s.docTitleShow && (
          <p style={{ textAlign: s.docTitlePosition, color: s.docTitleColor, fontWeight: "bold", marginBottom: "8px" }}>
            {docType === "SURAT" ? (
              <span style={{ display: "inline-block", backgroundColor: s.docTitleColor, color: "#fff", padding: "3px 12px", borderRadius: "10px", fontSize: `${s.docTitleFontSize}pt` }}>{s.docTitleText}</span>
            ) : (
              <span style={{ fontSize: `${s.docTitleFontSize}pt` }}>{s.docTitleText}</span>
            )}
          </p>
        )}
        {docType === "SURAT" && <SuratPreview s={s} directorName={directorName} directorTitle={directorTitle} sigUrl={sigUrl} />}
        {docType === "INVOICE" && <InvoicePreview s={s} directorName={directorName} directorTitle={directorTitle} sigUrl={sigUrl} />}
        {docType === "SLIP_GAJI" && <SlipGajiPreview s={s} />}
      </div>

      {/* ===== FOOTER (uses footerBgColor, not headerBg) ===== */}
      {s.footerShowText ? (
        <div style={{ background: s.footerBgColor || headerBg, padding: "8px 14px", textAlign: "center" }}>
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
      {/* Invoice info + client info — 2 column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
        {/* Left: Ditagihkan kepada */}
        <div style={{ fontSize: "9px" }}>
          <p style={{ fontWeight: "bold", color: s.totalLabelColor, fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Ditagihkan Kepada</p>
          <p style={{ fontWeight: "bold", fontSize: "10px" }}>PT Maju Jaya</p>
          <p style={{ color: "#64748b" }}>Jl. Sudirman No. 45</p>
          <p style={{ color: "#64748b" }}>Jakarta Selatan</p>
        </div>
        {/* Right: Invoice details */}
        <div style={{ fontSize: "9px", textAlign: "right" }}>
          <div style={{ marginBottom: "4px" }}>
            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "7px", fontWeight: "bold", color: "#fff", backgroundColor: s.statusBadgePending }}>PENDING</span>
          </div>
          <p><span style={{ color: "#94a3b8" }}>No. Invoice:</span> <strong>001/INV/HAN/VII/2026</strong></p>
          <p><span style={{ color: "#94a3b8" }}>Tanggal:</span> 05 Juli 2026</p>
          <p><span style={{ color: "#94a3b8" }}>Jatuh Tempo:</span> 15 Juli 2026</p>
        </div>
      </div>

      {/* Items table — modern with rounded corners */}
      <div style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: "8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
          <thead>
            <tr style={{ backgroundColor: s.tableHeaderBgColor, color: s.tableHeaderTextColor }}>
              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: "bold", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.3px" }}>Deskripsi</th>
              <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: "bold", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.3px", width: "40px" }}>Qty</th>
              <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.3px", width: "70px" }}>Harga</th>
              <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.3px", width: "70px" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: s.tableRowAltColor, borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "6px 8px", fontWeight: "500" }}>Leadership Training Batch 1</td>
              <td style={{ padding: "6px 8px", textAlign: "center", color: "#64748b" }}>1</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "#64748b" }}>Rp 25.000.000</td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>Rp 25.000.000</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "6px 8px", fontWeight: "500" }}>Coaching Session</td>
              <td style={{ padding: "6px 8px", textAlign: "center", color: "#64748b" }}>1</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "#64748b" }}>Rp 5.000.000</td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>Rp 5.000.000</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary — right aligned with modern styling */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
        <div style={{ width: "160px", fontSize: "9px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#64748b" }}>
            <span>Subtotal</span><span>Rp 30.000.000</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#64748b" }}>
            <span>Diskon</span><span>- Rp 0</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", marginTop: "2px", borderRadius: "4px", backgroundColor: s.totalLabelColor, color: "#fff" }}>
            <span style={{ fontWeight: "bold" }}>TOTAL</span><span style={{ fontWeight: "bold", fontSize: `${s.totalFontSize}px` }}>Rp 30.000.000</span>
          </div>
        </div>
      </div>

      {/* Payment info — modern card */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 8px", marginBottom: "8px", fontSize: "8px", backgroundColor: "#f8fafc" }}>
        <p style={{ fontWeight: "bold", color: s.totalLabelColor, marginBottom: "2px" }}>Pembayaran via Transfer:</p>
        <p>Bank Mandiri — 1234567890 — PT Hafara Aqiba Nusantara</p>
      </div>

      {/* Signature */}
      <div style={{ textAlign: s.sigPosition, marginTop: "8px" }}>
        <p style={{ fontSize: "9px" }}>Hormat kami,</p>
        <div style={{ height: "30px" }}>{sigUrl && <img src={sigUrl} alt="TTD" style={{ height: "25px" }} />}</div>
        {s.sigLineStyle !== "none" && <div style={{ width: "40%", marginLeft: s.sigPosition === "right" ? "auto" : "0", borderTop: s.sigLineStyle === "dashed" ? "1px dashed" : "1px solid", borderColor: s.sigLineColor, marginBottom: "2px" }} />}
        <p style={{ fontWeight: "bold", color: s.sigNameColor, fontSize: "9px" }}>{directorName}</p>
        <p style={{ fontSize: "8px", color: "#888" }}>{directorTitle}</p>
      </div>
    </div>
  );
}

function SlipGajiPreview({ s }: any) {
  return (
    <div>
      {/* Employee info — modern card */}
      <div style={{ borderRadius: "6px", border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ backgroundColor: s.sectionHeaderBgColor, color: s.sectionHeaderTextColor, padding: "5px 8px", fontSize: "8px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Informasi Karyawan</div>
        <div style={{ padding: "6px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "9px" }}>
          <div><span style={{ color: "#94a3b8" }}>Nama:</span> <strong>Ahmad Fauzi</strong></div>
          <div><span style={{ color: "#94a3b8" }}>Periode:</span> <strong>Juli 2026</strong></div>
          <div><span style={{ color: "#94a3b8" }}>Jabatan:</span> Assistant Trainer</div>
          <div><span style={{ color: "#94a3b8" }}>Status:</span> Tetap</div>
        </div>
      </div>

      {/* Earnings & Deductions — modern side-by-side cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
        {/* Earnings card */}
        <div style={{ borderRadius: "6px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ backgroundColor: s.earningsColor, color: "#fff", padding: "4px 8px", fontSize: "8px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.3px" }}>Pendapatan</div>
          <div style={{ padding: "5px 8px", fontSize: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Gaji Pokok</span><span style={{ fontWeight: "500" }}>Rp 5.500.000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Tunjangan Makan</span><span style={{ fontWeight: "500" }}>Rp 300.000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Tunjangan Transport</span><span style={{ fontWeight: "500" }}>Rp 200.000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0 1px", marginTop: "2px" }}>
              <span style={{ fontWeight: "bold", color: s.earningsColor }}>Total</span><span style={{ fontWeight: "bold", color: s.earningsColor }}>Rp 6.000.000</span>
            </div>
          </div>
        </div>
        {/* Deductions card */}
        <div style={{ borderRadius: "6px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ backgroundColor: s.deductionsColor, color: "#fff", padding: "4px 8px", fontSize: "8px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.3px" }}>Potongan</div>
          <div style={{ padding: "5px 8px", fontSize: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>BPJS</span><span style={{ fontWeight: "500" }}>Rp 300.000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Pajak (PPh)</span><span style={{ fontWeight: "500" }}>Rp 350.000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#64748b" }}>Potongan Absensi</span><span style={{ fontWeight: "500" }}>Rp 0</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0 1px", marginTop: "2px" }}>
              <span style={{ fontWeight: "bold", color: s.deductionsColor }}>Total</span><span style={{ fontWeight: "bold", color: s.deductionsColor }}>Rp 650.000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net salary — modern highlight box */}
      <div style={{ borderRadius: "6px", overflow: "hidden", marginBottom: "6px" }}>
        <div style={{ backgroundColor: s.netSalaryBgColor, color: s.netSalaryTextColor, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "8px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Gaji Bersih Diterima</p>
            <p style={{ fontSize: `${s.netSalaryFontSize}px`, fontWeight: "bold" }}>Rp 5.350.000</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "7px", opacity: 0.6 }}>Lima Juta Tiga Ratus Lima Puluh Ribu Rupiah</p>
          </div>
        </div>
      </div>

      {/* Payment info — small card */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "5px 8px", fontSize: "8px", backgroundColor: "#f8fafc" }}>
        <p style={{ fontWeight: "bold", color: s.sectionHeaderTextColor, marginBottom: "1px" }}>Transfer ke:</p>
        <p style={{ color: "#64748b" }}>Bank Mandiri — 1234567890 — PT Hafara Aqiba Nusantara</p>
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
