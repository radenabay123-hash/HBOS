"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings, Building2, Upload, Save, RefreshCw, Image as ImageIcon,
  CreditCard, Palette, Receipt, CheckCircle2, AlertCircle, FileSignature,
  User, Phone, Mail, Globe, MapPin, Hash, Banknote,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  COMPANY: "Informasi Perusahaan",
  FINANCE: "Rekening & Keuangan",
  APPEARANCE: "Tampilan Aplikasi",
  TAX: "Pengaturan Pajak",
  GENERAL: "Umum",
};

const CATEGORY_ICONS: Record<string, any> = {
  COMPANY: Building2,
  FINANCE: Banknote,
  APPEARANCE: Palette,
  TAX: Receipt,
  GENERAL: Settings,
};

export function PengaturanModule() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("COMPANY");
  const [uploading, setUploading] = useState<string | null>(null);

  // Local form state
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ grouped: Record<string, any[]>; settings: any[] }>("/api/settings");
      setGrouped(d.grouped || {});
      // Flatten to form
      const flat: Record<string, string> = {};
      for (const s of d.settings || []) {
        flat[s.key] = s.value;
      }
      setForm(flat);
      setSettings(flat);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(key: string) {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ key, value: form[key] }),
      });
      toast.success("Pengaturan disimpan");
      setSettings({ ...settings, [key]: form[key] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAll(category: string) {
    setSaving(true);
    try {
      const items = grouped[category] || [];
      await Promise.all(
        items.map((item) =>
          api("/api/settings", {
            method: "PUT",
            body: JSON.stringify({ key: item.key, value: form[item.key] || "" }),
          })
        )
      );
      toast.success(`Semua pengaturan ${CATEGORY_LABELS[category]} disimpan`);
      const newSettings = { ...settings };
      for (const item of items) {
        newSettings[item.key] = form[item.key] || "";
      }
      setSettings(newSettings);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadImage(key: string, file: File) {
    setUploading(key);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const d = await api<{ url: string }>("/api/settings", {
            method: "POST",
            body: JSON.stringify({ key, base64Data: base64, fileName: file.name }),
          });
          setForm({ ...form, [key]: d.url });
          setSettings({ ...settings, [key]: d.url });
          toast.success("Gambar berhasil diupload");
        } catch (e: any) {
          toast.error(e.message);
        } finally {
          setUploading(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      toast.error(e.message);
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const categories = Object.keys(grouped);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" /> Pengaturan Aplikasi
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola semua konfigurasi aplikasi: logo perusahaan, tanda tangan digital, info perusahaan, rekening, tema, dan pajak
        </p>
      </div>

      {/* Warning */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <strong>Perhatian:</strong> Perubahan pengaturan akan langsung berlaku di seluruh aplikasi termasuk dokumen PDF (invoice, slip gaji, SPT). Pastikan data yang dimasukkan benar.
          </p>
        </CardContent>
      </Card>

      {/* Tabs by category */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || Settings;
            return (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                <Icon className="w-3.5 h-3.5 mr-1" /> {CATEGORY_LABELS[cat] || cat}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] || Settings;
          const items = grouped[cat] || [];
          return (
            <TabsContent key={cat} value={cat} className="mt-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-5 h-5 text-blue-600" /> {CATEGORY_LABELS[cat] || cat}
                  </CardTitle>
                  <Button size="sm" onClick={() => handleSaveAll(cat)} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Simpan Semua
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => {
                    const isImage = item.type === "IMAGE";
                    const hasChange = form[item.key] !== settings[item.key];

                    return (
                      <div key={item.key} className={cn(
                        "border rounded-lg p-4 transition-colors",
                        hasChange ? "border-amber-300 bg-amber-50/30" : "border-slate-200"
                      )}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Label className="text-sm font-semibold text-slate-700">{item.key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Label>
                            {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                          </div>
                          {hasChange && <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Belum disimpan</Badge>}
                          {isImage && form[item.key] && (
                            <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Uploaded</Badge>
                          )}
                        </div>

                        {isImage ? (
                          <ImageUploadField
                            label={item.description || item.key}
                            value={form[item.key] || ""}
                            onChange={(file) => handleUploadImage(item.key, file)}
                            uploading={uploading === item.key}
                          />
                        ) : item.type === "NUMBER" ? (
                          <Input
                            type="number"
                            value={form[item.key] || ""}
                            onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                            className="bg-white"
                            placeholder="0"
                          />
                        ) : (
                          <Input
                            value={form[item.key] || ""}
                            onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                            className="bg-white"
                            placeholder={`Masukkan ${item.description || item.key}`}
                          />
                        )}

                        {hasChange && !isImage && (
                          <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => handleSave(item.key)} disabled={saving}>
                            <Save className="w-3 h-3 mr-1" /> Simpan
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Preview */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-600" /> Preview Header Dokumen</CardTitle></CardHeader>
        <CardContent>
          <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-600">
              {form.company_logo ? (
                <img src={form.company_logo} alt="Logo" className="w-14 h-14 rounded-lg object-contain border border-slate-200" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  {(form.company_name || "HF").split(" ").slice(0, 2).map((w: string) => w[0]).join("")}
                </div>
              )}
              <div>
                <p className="font-bold text-lg text-blue-900">{form.company_name || "PT. HAFARA AQIBA NUSANTARA"}</p>
                <p className="text-xs text-slate-600">{form.company_address}</p>
                <p className="text-xs text-slate-600">Telp: {form.company_phone} | Email: {form.company_email} | Web: {form.company_website}</p>
                <p className="text-xs text-slate-600">NPWP: {form.company_npwp}</p>
              </div>
            </div>
            {form.company_signature && (
              <div className="mt-3 flex items-end justify-between">
                <div></div>
                <div className="text-center">
                  <img src={form.company_signature} alt="Tanda Tangan" className="h-16 object-contain mb-1" />
                  <div className="border-t border-slate-400 pt-1">
                    <p className="text-sm font-bold text-slate-900">{form.director_name}</p>
                    <p className="text-xs text-slate-500">{form.director_title}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Image upload field component
function ImageUploadField({ label, value, onChange, uploading }: { label: string; value: string; onChange: (file: File) => void; uploading: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
        {value ? (
          <img src={value} alt={label} className="w-full h-full object-contain" />
        ) : (
          <ImageIcon className="w-8 h-8 text-slate-300" />
        )}
      </div>
      <div className="flex-1">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(file);
          }}
          className="hidden"
          id={`upload-${label}`}
        />
        <Button
          variant="outline"
          className="bg-white"
          disabled={uploading}
          onClick={() => document.getElementById(`upload-${label}`)?.click()}
        >
          {uploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {uploading ? "Uploading..." : value ? "Ganti Gambar" : "Upload Gambar"}
        </Button>
        <p className="text-[10px] text-slate-400 mt-1">Format: JPG, PNG. Maks 2MB.</p>
        {value && <p className="text-[10px] text-green-600 mt-0.5 truncate">{value}</p>}
      </div>
    </div>
  );
}
