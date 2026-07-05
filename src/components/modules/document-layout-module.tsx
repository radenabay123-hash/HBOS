"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Settings, FileText, Receipt, Wallet, Save, RefreshCw, Palette,
  Layout, Type, AlignLeft, Image as ImageIcon, Check,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DOC_TYPES = [
  { key: "SURAT", label: "Surat Resmi", icon: FileText, color: "blue" },
  { key: "INVOICE", label: "Invoice", icon: Receipt, color: "violet" },
  { key: "SLIP_GAJI", label: "Slip Gaji", icon: Wallet, color: "green" },
];

const DEFAULT_SETTINGS: Record<string, any> = {
  SURAT: {
    headerBgColor: "#0f234b", headerGradient: true, headerTextColor: "#ffffff", headerHeight: 38,
    logoPosition: "left", logoSize: 14, logoColor: "#ff8000", logoText: "H",
    companyNameText: "hafaragroup", companySubText: "consulting",
    companyNameColor: "#ffffff", companySubTextColor: "#8da8c8", companyNameFontSize: 13,
    contactPosition: "right", contactFontSize: 7, contactColor: "#dce6f5",
    accentLineColor: "#ff8000", accentLineHeight: 1.5,
    bodyFontSize: 10.5, bodyFontFamily: "Arial", bodyTextColor: "#2d3748", bodyLineHeight: 1.6,
    numberLabelColor: "#2d3748",
    sigPosition: "right", sigNameColor: "#0f234b", sigNameFontSize: 10,
    sigLineStyle: "dashed", sigLineColor: "#d1d5db",
    stampEnabled: true, stampColor: "#0f234b",
    footerBgColor: "#0f234b", footerTextColor: "#c8d2e1", footerHeight: 18,
    footerShowCompany: true, footerShowContact: true,
  },
  INVOICE: {
    headerBgColor: "#1e3a8a", headerGradient: false, headerTextColor: "#ffffff", headerHeight: 32,
    logoPosition: "left", logoSize: 16, logoColor: "#f97316", logoText: "HF",
    companyNameText: "PT. HAFARA AQIBA NUSANTARA",
    companyNameColor: "#1e3a8a", companyNameFontSize: 13,
    contactPosition: "right", contactFontSize: 7, contactColor: "#64748b",
    accentLineColor: "#1e3a8a", accentLineHeight: 1.5,
    tableHeaderBgColor: "#1e3a8a", tableHeaderTextColor: "#ffffff", tableRowAltColor: "#eff6ff",
    bodyFontSize: 8, bodyFontFamily: "Arial", bodyTextColor: "#334155",
    totalLabelColor: "#1e3a8a", totalFontSize: 9,
    statusBadgePending: "#fbbf24", statusBadgePaid: "#22c55e", statusBadgeCancelled: "#ef4444",
    sigPosition: "right", sigNameColor: "#1e3a8a",
    footerBgColor: "#1e3a8a", footerTextColor: "#ffffff", footerText: "Thank You!", footerHeight: 12,
  },
  SLIP_GAJI: {
    headerBgColor: "#1e3a8a", headerGradient: false, headerTextColor: "#ffffff", headerHeight: 32,
    logoPosition: "left", logoSize: 16, logoColor: "#1e3a8a", logoText: "HF",
    companyNameText: "PT. HAFARA AQIBA NUSANTARA",
    companyNameColor: "#1e3a8a", companyNameFontSize: 15,
    contactPosition: "right", contactFontSize: 7.5, contactColor: "#64748b",
    accentLineColor: "#2563eb", accentLineHeight: 1.5,
    sectionHeaderBgColor: "#eff6ff", sectionHeaderTextColor: "#1e3a8a",
    bodyFontSize: 8, bodyFontFamily: "Arial", bodyTextColor: "#334155",
    earningsColor: "#16a34a", deductionsColor: "#ef4444",
    netSalaryBgColor: "#1e3a8a", netSalaryTextColor: "#ffffff", netSalaryFontSize: 13,
    footerBgColor: "#1e3a8a", footerTextColor: "#ffffff", footerHeight: 12,
  },
};

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

export function DocumentLayoutModule() {
  const [activeDoc, setActiveDoc] = useState("SURAT");
  const [layouts, setLayouts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ layouts: Record<string, any> }>("/api/doc-layout");
      const merged: Record<string, any> = {};
      for (const dt of DOC_TYPES) {
        merged[dt.key] = { ...DEFAULT_SETTINGS[dt.key], ...(d.layouts?.[dt.key] || {}) };
      }
      setLayouts(merged);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(docType: string) {
    setSaving(true);
    try {
      await api("/api/doc-layout", {
        method: "PUT",
        body: JSON.stringify({ docType, settings: layouts[docType] }),
      });
      toast.success(`Pengaturan ${DOC_TYPES.find((d) => d.key === docType)?.label} disimpan`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  function handleReset(docType: string) {
    setLayouts({ ...layouts, [docType]: { ...DEFAULT_SETTINGS[docType] } });
    toast.info("Direset ke default (klik Simpan untuk menyimpan)");
  }

  function updateSetting(docType: string, key: string, value: any) {
    setLayouts({
      ...layouts,
      [docType]: { ...layouts[docType], [key]: value },
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Layout className="w-6 h-6 text-blue-600" /> Pengaturan Layout Dokumen
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Kustomisasi tata letak logo, font, warna header, footer untuk Surat Resmi, Invoice, dan Slip Gaji
        </p>
      </div>

      <Tabs value={activeDoc} onValueChange={setActiveDoc}>
        <TabsList className="flex-wrap h-auto gap-1">
          {DOC_TYPES.map((dt) => (
            <TabsTrigger key={dt.key} value={dt.key} className="text-xs">
              <dt.icon className="w-3.5 h-3.5 mr-1" /> {dt.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {DOC_TYPES.map((dt) => {
          const s = layouts[dt.key] || {};
          return (
            <TabsContent key={dt.key} value={dt.key} className="mt-4 space-y-4">
              {/* Action bar */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Atur layout untuk <strong>{dt.label}</strong></p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleReset(dt.key)} className="bg-white text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Default
                  </Button>
                  <Button size="sm" onClick={() => handleSave(dt.key)} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Simpan
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ===== HEADER SETTINGS ===== */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-600" /> Header & Logo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <ColorField label="Warna Background Header" value={s.headerBgColor} onChange={(v) => updateSetting(dt.key, "headerBgColor", v)} />
                      <div className="space-y-1">
                        <Label className="text-xs">Tinggi Header (mm)</Label>
                        <Input type="number" value={s.headerHeight} onChange={(e) => updateSetting(dt.key, "headerHeight", Number(e.target.value))} className="bg-white h-8" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={s.headerGradient} onCheckedChange={(v) => updateSetting(dt.key, "headerGradient", v)} />
                      <Label className="text-xs">Gradient Background</Label>
                    </div>
                    <ColorField label="Warna Teks Header" value={s.headerTextColor} onChange={(v) => updateSetting(dt.key, "headerTextColor", v)} />

                    <Separator className="my-2" />

                    <div className="grid grid-cols-3 gap-2">
                      <SelectField label="Posisi Logo" value={s.logoPosition} options={POSITIONS} onChange={(v) => updateSetting(dt.key, "logoPosition", v)} />
                      <div className="space-y-1">
                        <Label className="text-xs">Ukuran Logo (mm)</Label>
                        <Input type="number" value={s.logoSize} onChange={(e) => updateSetting(dt.key, "logoSize", Number(e.target.value))} className="bg-white h-8" />
                      </div>
                      <ColorField label="Warna Logo" value={s.logoColor} onChange={(v) => updateSetting(dt.key, "logoColor", v)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Teks Logo (huruf dalam logo)</Label>
                      <Input value={s.logoText} onChange={(e) => updateSetting(dt.key, "logoText", e.target.value)} className="bg-white h-8" />
                    </div>

                    <Separator className="my-2" />

                    <div className="space-y-1">
                      <Label className="text-xs">Teks Nama Perusahaan</Label>
                      <Input value={s.companyNameText} onChange={(e) => updateSetting(dt.key, "companyNameText", e.target.value)} className="bg-white h-8" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <ColorField label="Warna Nama Perusahaan" value={s.companyNameColor} onChange={(v) => updateSetting(dt.key, "companyNameColor", v)} />
                      <div className="space-y-1">
                        <Label className="text-xs">Ukuran Font Nama</Label>
                        <Input type="number" step="0.5" value={s.companyNameFontSize} onChange={(e) => updateSetting(dt.key, "companyNameFontSize", Number(e.target.value))} className="bg-white h-8" />
                      </div>
                    </div>
                    {s.companySubText !== undefined && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Sub-teks Perusahaan</Label>
                          <Input value={s.companySubText} onChange={(e) => updateSetting(dt.key, "companySubText", e.target.value)} className="bg-white h-8" />
                        </div>
                        <ColorField label="Warna Sub-teks" value={s.companySubTextColor} onChange={(v) => updateSetting(dt.key, "companySubTextColor", v)} />
                      </div>
                    )}

                    <Separator className="my-2" />

                    <div className="grid grid-cols-2 gap-2">
                      <SelectField label="Posisi Kontak" value={s.contactPosition} options={POSITIONS} onChange={(v) => updateSetting(dt.key, "contactPosition", v)} />
                      <div className="space-y-1">
                        <Label className="text-xs">Ukuran Font Kontak</Label>
                        <Input type="number" step="0.5" value={s.contactFontSize} onChange={(e) => updateSetting(dt.key, "contactFontSize", Number(e.target.value))} className="bg-white h-8" />
                      </div>
                    </div>
                    <ColorField label="Warna Teks Kontak" value={s.contactColor} onChange={(v) => updateSetting(dt.key, "contactColor", v)} />
                  </CardContent>
                </Card>

                {/* ===== BODY & ACCENT ===== */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Type className="w-4 h-4 text-blue-600" /> Isi & Garis Aksen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Ukuran Font Isi</Label>
                        <Input type="number" step="0.5" value={s.bodyFontSize} onChange={(e) => updateSetting(dt.key, "bodyFontSize", Number(e.target.value))} className="bg-white h-8" />
                      </div>
                      <SelectField label="Jenis Font Isi" value={s.bodyFontFamily} options={FONT_FAMILIES.map(f => ({ value: f, label: f }))} onChange={(v) => updateSetting(dt.key, "bodyFontFamily", v)} />
                    </div>
                    <ColorField label="Warna Teks Isi" value={s.bodyTextColor} onChange={(v) => updateSetting(dt.key, "bodyTextColor", v)} />
                    {s.bodyLineHeight !== undefined && (
                      <div className="space-y-1">
                        <Label className="text-xs">Line Height (spasi baris)</Label>
                        <Input type="number" step="0.1" value={s.bodyLineHeight} onChange={(e) => updateSetting(dt.key, "bodyLineHeight", Number(e.target.value))} className="bg-white h-8" />
                      </div>
                    )}

                    <Separator className="my-2" />

                    <ColorField label="Warna Garis Aksen" value={s.accentLineColor} onChange={(v) => updateSetting(dt.key, "accentLineColor", v)} />
                    <div className="space-y-1">
                      <Label className="text-xs">Tebal Garis Aksen (mm)</Label>
                      <Input type="number" step="0.5" value={s.accentLineHeight} onChange={(e) => updateSetting(dt.key, "accentLineHeight", Number(e.target.value))} className="bg-white h-8" />
                    </div>

                    {s.tableHeaderBgColor && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-xs font-semibold text-slate-500">Tabel (Invoice)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <ColorField label="Warna Header Tabel" value={s.tableHeaderBgColor} onChange={(v) => updateSetting(dt.key, "tableHeaderBgColor", v)} />
                          <ColorField label="Warna Teks Header Tabel" value={s.tableHeaderTextColor} onChange={(v) => updateSetting(dt.key, "tableHeaderTextColor", v)} />
                        </div>
                        <ColorField label="Warna Baris Alternatif" value={s.tableRowAltColor} onChange={(v) => updateSetting(dt.key, "tableRowAltColor", v)} />
                      </>
                    )}

                    {s.sectionHeaderBgColor && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-xs font-semibold text-slate-500">Section Header (Slip Gaji)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <ColorField label="Warna BG Section" value={s.sectionHeaderBgColor} onChange={(v) => updateSetting(dt.key, "sectionHeaderBgColor", v)} />
                          <ColorField label="Warna Teks Section" value={s.sectionHeaderTextColor} onChange={(v) => updateSetting(dt.key, "sectionHeaderTextColor", v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <ColorField label="Warna Pendapatan" value={s.earningsColor} onChange={(v) => updateSetting(dt.key, "earningsColor", v)} />
                          <ColorField label="Warna Potongan" value={s.deductionsColor} onChange={(v) => updateSetting(dt.key, "deductionsColor", v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <ColorField label="BG Gaji Bersih" value={s.netSalaryBgColor} onChange={(v) => updateSetting(dt.key, "netSalaryBgColor", v)} />
                          <ColorField label="Warna Teks Gaji Bersih" value={s.netSalaryTextColor} onChange={(v) => updateSetting(dt.key, "netSalaryTextColor", v)} />
                        </div>
                      </>
                    )}

                    {s.statusBadgePending && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-xs font-semibold text-slate-500">Status Badge (Invoice)</p>
                        <div className="grid grid-cols-3 gap-2">
                          <ColorField label="Pending" value={s.statusBadgePending} onChange={(v) => updateSetting(dt.key, "statusBadgePending", v)} />
                          <ColorField label="Paid" value={s.statusBadgePaid} onChange={(v) => updateSetting(dt.key, "statusBadgePaid", v)} />
                          <ColorField label="Cancelled" value={s.statusBadgeCancelled} onChange={(v) => updateSetting(dt.key, "statusBadgeCancelled", v)} />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* ===== SIGNATURE ===== */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><AlignLeft className="w-4 h-4 text-blue-600" /> Tanda Tangan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <SelectField label="Posisi Tanda Tangan" value={s.sigPosition} options={POSITIONS} onChange={(v) => updateSetting(dt.key, "sigPosition", v)} />
                    <ColorField label="Warna Nama Penandatangan" value={s.sigNameColor} onChange={(v) => updateSetting(dt.key, "sigNameColor", v)} />
                    {s.sigNameFontSize !== undefined && (
                      <div className="space-y-1">
                        <Label className="text-xs">Ukuran Font Nama</Label>
                        <Input type="number" step="0.5" value={s.sigNameFontSize} onChange={(e) => updateSetting(dt.key, "sigNameFontSize", Number(e.target.value))} className="bg-white h-8" />
                      </div>
                    )}
                    {s.sigLineStyle && (
                      <>
                        <SelectField label="Gaya Garis Tanda Tangan" value={s.sigLineStyle} options={LINE_STYLES} onChange={(v) => updateSetting(dt.key, "sigLineStyle", v)} />
                        <ColorField label="Warna Garis Tanda Tangan" value={s.sigLineColor} onChange={(v) => updateSetting(dt.key, "sigLineColor", v)} />
                      </>
                    )}
                    {s.stampEnabled !== undefined && (
                      <div className="flex items-center gap-2">
                        <Switch checked={s.stampEnabled} onCheckedChange={(v) => updateSetting(dt.key, "stampEnabled", v)} />
                        <Label className="text-xs">Tampilkan Stempel</Label>
                      </div>
                    )}
                    {s.stampColor && <ColorField label="Warna Stempel" value={s.stampColor} onChange={(v) => updateSetting(dt.key, "stampColor", v)} />}
                  </CardContent>
                </Card>

                {/* ===== FOOTER ===== */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Layout className="w-4 h-4 text-blue-600" /> Footer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ColorField label="Warna Background Footer" value={s.footerBgColor} onChange={(v) => updateSetting(dt.key, "footerBgColor", v)} />
                    <ColorField label="Warna Teks Footer" value={s.footerTextColor} onChange={(v) => updateSetting(dt.key, "footerTextColor", v)} />
                    <div className="space-y-1">
                      <Label className="text-xs">Tinggi Footer (mm)</Label>
                      <Input type="number" value={s.footerHeight} onChange={(e) => updateSetting(dt.key, "footerHeight", Number(e.target.value))} className="bg-white h-8" />
                    </div>
                    {s.footerText !== undefined && (
                      <div className="space-y-1">
                        <Label className="text-xs">Teks Footer</Label>
                        <Input value={s.footerText} onChange={(e) => updateSetting(dt.key, "footerText", e.target.value)} className="bg-white h-8" placeholder="Thank You!" />
                      </div>
                    )}
                    {s.footerShowCompany !== undefined && (
                      <div className="flex items-center gap-2">
                        <Switch checked={s.footerShowCompany} onCheckedChange={(v) => updateSetting(dt.key, "footerShowCompany", v)} />
                        <Label className="text-xs">Tampilkan Nama Perusahaan di Footer</Label>
                      </div>
                    )}
                    {s.footerShowContact !== undefined && (
                      <div className="flex items-center gap-2">
                        <Switch checked={s.footerShowContact} onCheckedChange={(v) => updateSetting(dt.key, "footerShowContact", v)} />
                        <Label className="text-xs">Tampilkan Kontak di Footer</Label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

// ===== Helper Components =====
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-slate-200 cursor-pointer shrink-0"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-white h-8 text-xs font-mono" />
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
