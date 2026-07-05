"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  User, Save, RefreshCw, CheckCircle2, AlertCircle, FileText, Wallet,
  Calendar, MapPin, Phone, GraduationCap, Building2, Hash, Banknote,
  Users, Search, Edit3, Lock,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, formatCurrency, formatDate } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

const PTKP_OPTIONS = [
  { value: "TK0", label: "TK0 - Tidak Kawin, 0 Tanggungan" },
  { value: "TK1", label: "TK1 - Tidak Kawin, 1 Tanggungan" },
  { value: "TK2", label: "TK2 - Tidak Kawin, 2 Tanggungan" },
  { value: "TK3", label: "TK3 - Tidak Kawin, 3 Tanggungan" },
  { value: "K0", label: "K0 - Kawin, 0 Tanggungan" },
  { value: "K1", label: "K1 - Kawin, 1 Tanggungan" },
  { value: "K2", label: "K2 - Kawin, 2 Tanggungan" },
  { value: "K3", label: "K3 - Kawin, 3 Tanggungan" },
];

export function BiodataModule({ user }: { user: SafeUser }) {
  const isOwner = user.role === ROLES.OWNER;
  const [view, setView] = useState<"my" | "all">(isOwner ? "all" : "my");
  const [profile, setProfile] = useState<any>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editSalaryUser, setEditSalaryUser] = useState<string | null>(null);
  const [salaryForm, setSalaryForm] = useState({ gajiPokok: "", tunjanganMakan: "", tunjanganTransport: "", statusKaryawan: "", tanggalMasuk: "" });

  const [form, setForm] = useState<Record<string, any>>({});

  const loadOwn = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ profile: any; user: any }>("/api/employee-profile");
      setProfile(d.profile);
      setForm(d.profile || {});
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ profiles: any[] }>("/api/employee-profile/all");
      setAllProfiles(d.profiles || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (view === "my") loadOwn();
    else loadAll();
  }, [view, loadOwn, loadAll]);

  async function handleSave() {
    setSaving(true);
    try {
      await api("/api/employee-profile", { method: "PUT", body: JSON.stringify(form) });
      toast.success("Biodata tersimpan");
      loadOwn();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleSaveSalary(userId: string) {
    setSaving(true);
    try {
      await api("/api/employee-profile/all", { method: "PUT", body: JSON.stringify({ userId, ...salaryForm }) });
      toast.success("Data gaji & status diperbarui");
      setEditSalaryUser(null);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  function openEditSalary(p: any) {
    setSalaryForm({
      gajiPokok: p.gajiPokok ? String(p.gajiPokok) : "",
      tunjanganMakan: p.tunjanganMakan ? String(p.tunjanganMakan) : "",
      tunjanganTransport: p.tunjanganTransport ? String(p.tunjanganTransport) : "",
      statusKaryawan: p.statusKaryawan || "",
      tanggalMasuk: p.tanggalMasuk ? new Date(p.tanggalMasuk).toISOString().slice(0, 10) : "",
    });
    setEditSalaryUser(p.userId);
  }

  function updateForm(key: string, value: any) {
    setForm({ ...form, [key]: value });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  // ===== OWNER: VIEW ALL =====
  if (isOwner && view === "all") {
    const filtered = allProfiles.filter((p) => {
      const q = search.toLowerCase();
      return !q || p.user?.name?.toLowerCase().includes(q) || p.npwp?.includes(q) || p.nik?.includes(q);
    });

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" /> Biodata Karyawan</h1>
            <p className="text-sm text-slate-500 mt-1">Pantau biodata, NPWP, dan data pajak seluruh karyawan</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setView("my")} className="bg-white"><User className="w-4 h-4 mr-1" /> Biodata Saya</Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NPWP, NIK..." className="pl-9 bg-white" />
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total Karyawan" value={String(allProfiles.length)} icon={Users} color="blue" />
          <SummaryCard label="Biodata Lengkap" value={String(allProfiles.filter((p) => p.isComplete).length)} icon={CheckCircle2} color="green" />
          <SummaryCard label="Belum Lengkap" value={String(allProfiles.filter((p) => !p.isComplete).length)} icon={AlertCircle} color="amber" />
          <SummaryCard label="Punya NPWP" value={String(allProfiles.filter((p) => p.npwp).length)} icon={Hash} color="violet" />
        </div>

        {/* Profile cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {p.user?.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{p.user?.name}</p>
                      <p className="text-xs text-slate-500">{ROLE_LABELS[p.user?.role] || p.user?.role}</p>
                    </div>
                  </div>
                  {p.isComplete ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Lengkap</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]"><AlertCircle className="w-3 h-3 mr-0.5" /> Belum Lengkap</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <InfoRow label="NIK" value={p.nik || "-"} />
                  <InfoRow label="NPWP" value={p.npwp || "-"} />
                  <InfoRow label="PTKP" value={p.ptkpStatus || "-"} />
                  <InfoRow label="Bank" value={p.bankName ? `${p.bankName} (${p.bankAccount})` : "-"} />
                  <InfoRow label="Gaji Pokok" value={p.gajiPokok ? formatCurrency(p.gajiPokok) : "-"} />
                  <InfoRow label="Status" value={p.statusKaryawan || "-"} />
                </div>

                {p.npwp && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-blue-600">
                    <FileText className="w-3 h-3" />
                    <span>NPWP terhubung ke sistem pajak & payroll PPh 21</span>
                  </div>
                )}

                <Button size="sm" variant="outline" className="w-full mt-3 text-xs bg-white" onClick={() => openEditSalary(p)}>
                  <Edit3 className="w-3 h-3 mr-1" /> Edit Gaji & Status
                </Button>

                {/* Edit salary dialog inline */}
                {editSalaryUser === p.userId && (
                  <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50/30 space-y-2">
                    <p className="text-xs font-semibold text-blue-900">Edit Gaji & Status: {p.user?.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-[10px]">Gaji Pokok</Label><Input type="number" value={salaryForm.gajiPokok} onChange={(e) => setSalaryForm({ ...salaryForm, gajiPokok: e.target.value })} className="bg-white h-8 text-xs" /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Tunjangan Makan</Label><Input type="number" value={salaryForm.tunjanganMakan} onChange={(e) => setSalaryForm({ ...salaryForm, tunjanganMakan: e.target.value })} className="bg-white h-8 text-xs" /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Tunjangan Transport</Label><Input type="number" value={salaryForm.tunjanganTransport} onChange={(e) => setSalaryForm({ ...salaryForm, tunjanganTransport: e.target.value })} className="bg-white h-8 text-xs" /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Status Karyawan</Label>
                        <Select value={salaryForm.statusKaryawan} onValueChange={(v) => setSalaryForm({ ...salaryForm, statusKaryawan: v })}>
                          <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="TETAP">Tetap</SelectItem><SelectItem value="KONTRAK">Kontrak</SelectItem><SelectItem value="PROBATION">Probation</SelectItem><SelectItem value="MAGANG">Magang</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs flex-1" onClick={() => handleSaveSalary(p.userId)} disabled={saving}>Simpan</Button>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditSalaryUser(null)}>Batal</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ===== TEAM: OWN BIODATA =====
  const completeness = profile?.isComplete;
  const requiredFields = ["nik", "tempatLahir", "tanggalLahir", "jenisKelamin", "alamatKtp", "npwp", "ptkpStatus", "bankName", "bankAccount", "bankAccountName"];
  const filledCount = requiredFields.filter((f) => form[f]).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><User className="w-6 h-6 text-blue-600" /> Biodata Saya</h1>
          <p className="text-sm text-slate-500 mt-1">Lengkapi data Anda. NPWP & PTKP terhubung otomatis ke sistem pajak & payroll.</p>
        </div>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => setView("all")} className="bg-white"><Users className="w-4 h-4 mr-1" /> Lihat Semua Karyawan</Button>
        )}
      </div>

      {/* Completion status */}
      <Card className={cn("border-2", completeness ? "border-green-300 bg-green-50/30" : "border-amber-300 bg-amber-50/30")}>
        <CardContent className="p-4 flex items-center gap-3">
          {completeness ? <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" /> : <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />}
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{completeness ? "Biodata Lengkap!" : "Biodata Belum Lengkap"}</p>
            <p className="text-xs text-slate-500">{filledCount}/{requiredFields.length} field wajib terisi. {completeness ? "Data Anda siap untuk payroll & pelaporan pajak." : "Lengkapi semua field wajib untuk mengaktifkan integrasi pajak."}</p>
          </div>
          <div className="w-24">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", completeness ? "bg-green-500" : "bg-amber-500")} style={{ width: `${(filledCount / requiredFields.length) * 100}%` }} />
            </div>
            <p className="text-[10px] text-center text-slate-500 mt-1">{Math.round((filledCount / requiredFields.length) * 100)}%</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="personal" className="text-xs"><User className="w-3.5 h-3.5 mr-1" /> Data Pribadi</TabsTrigger>
          <TabsTrigger value="address" className="text-xs"><MapPin className="w-3.5 h-3.5 mr-1" /> Alamat</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs"><Hash className="w-3.5 h-3.5 mr-1" /> NPWP & Pajak</TabsTrigger>
          <TabsTrigger value="bank" className="text-xs"><Banknote className="w-3.5 h-3.5 mr-1" /> Bank</TabsTrigger>
          <TabsTrigger value="education" className="text-xs"><GraduationCap className="w-3.5 h-3.5 mr-1" /> Pendidikan</TabsTrigger>
        </TabsList>

        {/* Data Pribadi */}
        <TabsContent value="personal" className="mt-4">
          <Card className="shadow-sm"><CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="NIK (16 digit)" required value={form.nik} onChange={(v) => updateForm("nik", v)} placeholder="1234567890123456" />
              <Field label="Tempat Lahir" required value={form.tempatLahir} onChange={(v) => updateForm("tempatLahir", v)} placeholder="Jombang" />
              <DateField label="Tanggal Lahir" required value={form.tanggalLahir ? new Date(form.tanggalLahir).toISOString().slice(0, 10) : ""} onChange={(v) => updateForm("tanggalLahir", v)} />
              <SelectField label="Jenis Kelamin" required value={form.jenisKelamin} onChange={(v) => updateForm("jenisKelamin", v)} options={[{ value: "LAKI_LAKI", label: "Laki-laki" }, { value: "PEREMPUAN", label: "Perempuan" }]} />
              <SelectField label="Golongan Darah" value={form.golonganDarah} onChange={(v) => updateForm("golonganDarah", v)} options={[{ value: "A", label: "A" }, { value: "B", label: "B" }, { value: "AB", label: "AB" }, { value: "O", label: "O" }]} />
              <SelectField label="Agama" value={form.agama} onChange={(v) => updateForm("agama", v)} options={[{ value: "Islam", label: "Islam" }, { value: "Kristen", label: "Kristen" }, { value: "Katolik", label: "Katolik" }, { value: "Hindu", label: "Hindu" }, { value: "Buddha", label: "Buddha" }, { value: "Konghucu", label: "Konghucu" }]} />
              <SelectField label="Status Pernikahan" value={form.statusPernikahan} onChange={(v) => updateForm("statusPernikahan", v)} options={[{ value: "BELUM_KAWIN", label: "Belum Kawin" }, { value: "KAWIN", label: "Kawin" }, { value: "CERAI", label: "Cerai" }]} />
              <Field label="Kewarganegaraan" value={form.kewarganegaraan || "WNI"} onChange={(v) => updateForm("kewarganegaraan", v)} />
            </div>
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-slate-500">Kontak Darurat</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Nama Kontak Darurat" value={form.kontakDaruratNama} onChange={(v) => updateForm("kontakDaruratNama", v)} placeholder="Nama keluarga" />
              <Field label="Hubungan" value={form.kontakDaruratHubungan} onChange={(v) => updateForm("kontakDaruratHubungan", v)} placeholder="Suami/Istri/Anak" />
              <Field label="No. HP" value={form.kontakDaruratPhone} onChange={(v) => updateForm("kontakDaruratPhone", v)} placeholder="0812xxxx" />
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Alamat */}
        <TabsContent value="address" className="mt-4">
          <Card className="shadow-sm"><CardContent className="p-5 space-y-3">
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Alamat KTP <span className="text-rose-500">*</span></Label><Textarea value={form.alamatKtp || ""} onChange={(e) => updateForm("alamatKtp", e.target.value)} className="bg-white resize-none" rows={2} placeholder="Alamat sesuai KTP" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Alamat Domisili</Label><Textarea value={form.alamatDomisili || ""} onChange={(e) => updateForm("alamatDomisili", e.target.value)} className="bg-white resize-none" rows={2} placeholder="Alamat tempat tinggal saat ini" /></div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Provinsi" value={form.provinsi} onChange={(v) => updateForm("provinsi", v)} placeholder="Jawa Timur" />
              <Field label="Kota" value={form.kota} onChange={(v) => updateForm("kota", v)} placeholder="Jombang" />
              <Field label="Kode Pos" value={form.kodePos} onChange={(v) => updateForm("kodePos", v)} placeholder="61411" />
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* NPWP & Pajak */}
        <TabsContent value="tax" className="mt-4 space-y-4">
          <Card className="shadow-sm border-blue-200"><CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2"><Hash className="w-5 h-5 text-blue-600" /><p className="text-sm font-semibold text-blue-900">Data NPWP & Pajak</p></div>
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
              <FileText className="w-4 h-4 shrink-0 mt-0.5" />
              <p>NPWP & PTKP Anda akan <strong>otomatis terhubung</strong> ke sistem Payroll (perhitungan PPh 21), Kalkulator Pajak, dan pelaporan SPT Badan. Pastikan data benar.</p>
            </div>
            <Field label="NPWP (15 digit)" required value={form.npwp} onChange={(v) => updateForm("npwp", v)} placeholder="01.234.567.8-091.000" />
            <SelectField label="Status PTKP" required value={form.ptkpStatus} onChange={(v) => updateForm("ptkpStatus", v)} options={PTKP_OPTIONS} />
            <div className="grid grid-cols-1 gap-3">
              <Field label="Jumlah Tanggungan" value={String(form.jumlahTanggungan || 0)} onChange={(v) => updateForm("jumlahTanggungan", Number(v))} placeholder="0" type="number" />
            </div>
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-slate-500">BPJS</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="BPJS Kesehatan" value={form.noBPJSKesehatan} onChange={(v) => updateForm("noBPJSKesehatan", v)} placeholder="0001xxxx" />
              <Field label="BPJS Tenaga Kerja" value={form.noBPJSTenagaKerja} onChange={(v) => updateForm("noBPJSTenagaKerja", v)} placeholder="0001xxxx" />
              <Field label="BPJS Pensiun" value={form.noBPJSPensiun} onChange={(v) => updateForm("noBPJSPensiun", v)} placeholder="0001xxxx" />
            </div>
          </CardContent></Card>

          {/* Integration info */}
          {form.npwp && form.ptkpStatus && (
            <Card className="shadow-sm border-green-200 bg-green-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-5 h-5 text-green-600" /><p className="text-sm font-semibold text-green-800">Integrasi Pajak Aktif</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2 border border-green-100"><p className="text-slate-400">Payroll PPh 21</p><p className="font-semibold text-green-700">✓ Terhubung</p><p className="text-[10px] text-slate-500">PTKP: {form.ptkpStatus}</p></div>
                  <div className="bg-white rounded-lg p-2 border border-green-100"><p className="text-slate-400">Kalkulator Pajak</p><p className="font-semibold text-green-700">✓ Terhubung</p><p className="text-[10px] text-slate-500">NPWP: {form.npwp?.slice(0, 8)}...</p></div>
                  <div className="bg-white rounded-lg p-2 border border-green-100"><p className="text-slate-400">Slip Gaji</p><p className="font-semibold text-green-700">✓ Terhubung</p><p className="text-[10px] text-slate-500">Auto potong PPh 21</p></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bank */}
        <TabsContent value="bank" className="mt-4">
          <Card className="shadow-sm"><CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2"><Banknote className="w-5 h-5 text-blue-600" /><p className="text-sm font-semibold text-blue-900">Rekening Bank untuk Pembayaran Gaji</p></div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Nama Bank" required value={form.bankName} onChange={(v) => updateForm("bankName", v)} placeholder="Bank Mandiri" />
              <Field label="Nomor Rekening" required value={form.bankAccount} onChange={(v) => updateForm("bankAccount", v)} placeholder="1234567890" />
              <Field label="Atas Nama" required value={form.bankAccountName} onChange={(v) => updateForm("bankAccountName", v)} placeholder="Nama Sesuai Buku" />
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* Pendidikan */}
        <TabsContent value="education" className="mt-4">
          <Card className="shadow-sm"><CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Pendidikan Terakhir" value={form.pendidikanTerakhir} onChange={(v) => updateForm("pendidikanTerakhir", v)} options={[{ value: "SD", label: "SD" }, { value: "SMP", label: "SMP" }, { value: "SMA/SMK", label: "SMA/SMK" }, { value: "D3", label: "Diploma (D3)" }, { value: "S1", label: "Sarjana (S1)" }, { value: "S2", label: "Magister (S2)" }, { value: "S3", label: "Doktor (S3)" }]} />
              <Field label="Institusi Pendidikan" value={form.institusiPendidikan} onChange={(v) => updateForm("institusiPendidikan", v)} placeholder="Universitas..." />
            </div>
            <Field label="Jurusan" value={form.jurusan} onChange={(v) => updateForm("jurusan", v)} placeholder="Manajemen / Teknik / dll" />
            <SelectField label="Status Karyawan" value={form.statusKaryawan} onChange={(v) => updateForm("statusKaryawan", v)} options={[{ value: "TETAP", label: "Karyawan Tetap" }, { value: "KONTRAK", label: "Karyawan Kontrak" }, { value: "PROBATION", label: "Probation" }, { value: "MAGANG", label: "Magang" }]} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Salary info (read-only for team, editable for owner) */}
      {!isOwner && profile?.gajiPokok != null && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="w-4 h-4 text-slate-400" /> Informasi Gaji (Read-only)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Gaji Pokok</p><p className="font-bold text-slate-700">{formatCurrency(profile.gajiPokok || 0)}</p></div>
              <div><p className="text-xs text-slate-400">Tunjangan Makan</p><p className="font-bold text-slate-700">{formatCurrency(profile.tunjanganMakan || 0)}</p></div>
              <div><p className="text-xs text-slate-400">Tunjangan Transport</p><p className="font-bold text-slate-700">{formatCurrency(profile.tunjanganTransport || 0)}</p></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Data gaja diatur oleh Owner. NPWP & PTKP Anda otomatis digunakan untuk perhitungan PPh 21 pada slip gaji.</p>
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Menyimpan..." : "Simpan Biodata"}
        </Button>
      </div>
    </div>
  );
}

// ===== Helper Components =====
function Field({ label, value, onChange, placeholder, required, type }: { label: string; value: any; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</Label>
      <Input type={type || "text"} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-white h-8 text-sm" />
    </div>
  );
}

function DateField({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</Label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="bg-white h-8 text-sm" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: any; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="bg-white h-8 text-sm"><SelectValue placeholder="Pilih..." /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-xs font-medium text-slate-700 truncate">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600",
  };
  return (
    <Card className="shadow-sm"><CardContent className="p-3 flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", colorMap[color])}><Icon className="w-4.5 h-4.5" /></div>
      <div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold text-slate-900">{value}</p></div>
    </CardContent></Card>
  );
}
