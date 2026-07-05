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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Receipt, Wallet, TrendingUp, TrendingDown, Clock, Award, FileText,
  RefreshCw, Download, CheckCircle2, DollarSign, Settings, Zap, Printer,
  Trash2, Eye, Plus, Building2,
} from "lucide-react";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, formatCurrency, formatDate } from "@/lib/constants";
import { exportToExcel } from "@/lib/export-utils";
import { downloadSlipGajiPDF, type SlipGajiData } from "@/lib/slip-gaji-pdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

interface Payroll {
  id?: string;
  userId: string;
  userName?: string;
  role?: string;
  user?: { id: string; name: string; role: string; position: string; phone: string };
  month: number;
  year: number;
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  kpiScore: number;
  kpiBonus: number;
  attendanceDeduction: number;
  bpjs: number;
  tax: number;
  otherDeduction: number;
  grossSalary: number;
  totalDeduction: number;
  netSalary: number;
  status: string;
  paidAt: string | null;
  note?: string;
  isManual?: boolean;
  nik?: string;
  jabatan?: string;
  bankName?: string;
  bankAccount?: string;
  accountName?: string;
  periodeLabel?: string;
  companyName?: string;
}

const STATUS_LABELS: Record<string, string> = { DRAFT: "Draft", APPROVED: "Disetujui", PAID: "Dibayar" };
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  APPROVED: "bg-amber-100 text-amber-700 border-amber-200",
  PAID: "bg-blue-100 text-blue-700 border-blue-200",
};

export function PayrollModule({ user }: { user: SafeUser }) {
  const isOwner = user.role === ROLES.OWNER;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [archive, setArchive] = useState<Payroll[]>([]);
  const [myPayroll, setMyPayroll] = useState<Payroll | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payslipDialog, setPayslipDialog] = useState<{ open: boolean; payroll: Payroll | null }>({ open: false, payroll: null });
  const [users, setUsers] = useState<{ id: string; name: string; role: string; position: string }[]>([]);

  // Manual generator form state
  const [genForm, setGenForm] = useState({
    userId: "",
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    baseSalary: "0",
    tunjangan: "0",
    potongan: "0",
    note: "",
    bankName: "Bank Syariah Indonesia (BSI)",
    bankAccount: "",
    accountName: "",
    nik: "",
    jabatan: "",
  });
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isOwner) {
        const [archData, previewData] = await Promise.all([
          api<{ payrolls: Payroll[] }>("/api/payroll/manual").catch(() => ({ payrolls: [] })),
          api<any>(`/api/payroll?month=${month}&year=${year}`).catch(() => ({ payrolls: [], saved: false })),
        ]);
        setArchive(archData.payrolls || []);
        setSaved(previewData.saved || false);
        const u = await api<{ users: any[] }>("/api/users").catch(() => ({ users: [] }));
        setUsers(u.users.filter((x: any) => x.role !== "OWNER"));
      } else {
        const data = await api<any>(`/api/payroll?month=${month}&year=${year}`);
        setMyPayroll(data.payroll || null);
        setSaved(data.saved || false);
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat payroll");
    } finally {
      setLoading(false);
    }
  }, [month, year, isOwner]);

  useEffect(() => { loadData(); }, [loadData]);

  // ===== Generate manual slip gaji =====
  async function handleGenerateManual() {
    if (!genForm.userId) { toast.error("Pilih karyawan dulu"); return; }
    setGenerating(true);
    try {
      await api("/api/payroll/manual", {
        method: "POST",
        body: JSON.stringify({
          userId: genForm.userId,
          month: Number(genForm.month),
          year: Number(genForm.year),
          baseSalary: Number(genForm.baseSalary) || 0,
          tunjangan: Number(genForm.tunjangan) || 0,
          potongan: Number(genForm.potongan) || 0,
          note: genForm.note,
          bankName: genForm.bankName,
          bankAccount: genForm.bankAccount,
          accountName: genForm.accountName,
          nik: genForm.nik,
          jabatan: genForm.jabatan,
          status: "DRAFT",
        }),
      });
      toast.success("Slip gaji berhasil dibuat!");
      // Reset form
      setGenForm({ ...genForm, baseSalary: "0", tunjangan: "0", potongan: "0", note: "", bankAccount: "", accountName: "", nik: "" });
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal generate");
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateStatus(payrollId: string, status: string) {
    try {
      await api(`/api/payroll/${payrollId}`, { method: "PUT", body: JSON.stringify({ status }) });
      toast.success(status === "PAID" ? "Gaji ditandai LUNAS" : status === "APPROVED" ? "Payroll disetujui" : "Status diperbarui");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal update status");
    }
  }

  async function handleDelete(payrollId: string) {
    if (!confirm("Hapus slip gaji ini?")) return;
    try {
      await api(`/api/payroll/${payrollId}`, { method: "DELETE" });
      toast.success("Slip gaji dihapus");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal hapus");
    }
  }

  // ===== Download slip gaji PDF (template baru) =====
  function handleDownloadSlip(p: Payroll) {
    const u = p.user || { name: p.userName || "", role: p.role || "", position: "", phone: "" };
    const slipData: SlipGajiData = {
      companyName: p.companyName || "PT. HAFARA AIQBA NUSANTARA",
      companyEmail: "Info@hafaragroup.com",
      companyWebsite: "www.HafaraGroup.com",
      companyPhone: "081324511570",
      companyAddress: "New Head Office: Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur",
      employeeName: u.name,
      nik: p.nik || p.userId.slice(-4).toUpperCase(),
      jabatan: p.jabatan || u.position || ROLE_LABELS[u.role] || "-",
      periode: p.periodeLabel || `${monthNames[p.month - 1]} ${p.year}`,
      bankName: p.bankName || "Bank Syariah Indonesia (BSI)",
      bankAccount: p.bankAccount || "-",
      accountName: p.accountName || u.name,
      gajiPokok: p.baseSalary,
      tunjanganBonus: p.isManual ? p.transportAllowance : (p.mealAllowance + p.transportAllowance + p.kpiBonus),
      potongan: p.isManual ? p.otherDeduction : (p.attendanceDeduction + p.bpjs + p.tax + p.otherDeduction),
      note: p.note || "",
      status: p.status,
      paidAt: p.paidAt ? formatDate(p.paidAt) : null,
    };
    downloadSlipGajiPDF(slipData);
    toast.success("Slip gaji PDF diunduh");
  }

  function handleExportExcel() {
    const rows = archive.map((p, i) => ({
      No: i + 1,
      Nama: p.user?.name || p.userName,
      "Bulan/Tahun": `${monthNames[p.month - 1]} ${p.year}`,
      "Gaji Pokok": p.baseSalary,
      Tunjangan: p.isManual ? p.transportAllowance : (p.mealAllowance + p.transportAllowance + p.kpiBonus),
      Potongan: p.isManual ? p.otherDeduction : (p.attendanceDeduction + p.bpjs + p.tax),
      "Gaji Bersih": p.netSalary,
      Status: STATUS_LABELS[p.status] || p.status,
    }));
    exportToExcel(rows, "Arsip-Slip-Gaji", "Slip Gaji");
    toast.success("Excel diunduh");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // ===== TEAM VIEW =====
  if (!isOwner) {
    const p = myPayroll;
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Slip Gaji Saya"
          description="Rincian gaji bulanan Anda"
          action={
            <div className="flex gap-2">
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{[now.getFullYear(), now.getFullYear() - 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          }
        />
        {!p ? (
          <Card><CardContent className="py-12 text-center text-slate-400">Belum ada slip gaji untuk periode {monthNames[month - 1]} {year}</CardContent></Card>
        ) : (
          <>
            <Card className={cn("border-2", p.status === "PAID" ? "border-blue-300 bg-blue-50" : "border-slate-200")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {p.status === "PAID" ? <CheckCircle2 className="w-6 h-6 text-blue-600" /> : <Clock className="w-6 h-6 text-amber-600" />}
                  <div>
                    <p className="font-semibold text-slate-900">Periode: {monthNames[p.month - 1]} {p.year}</p>
                    <p className="text-sm text-slate-600">{p.status === "PAID" ? `Dibayar pada ${p.paidAt ? formatDate(p.paidAt) : "-"}` : "Draft - belum disetujui"}</p>
                  </div>
                </div>
                <Badge className={cn("text-sm", STATUS_COLORS[p.status])}>{STATUS_LABELS[p.status] || p.status}</Badge>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0">
              <CardContent className="p-6">
                <p className="text-blue-100 text-sm">Gaji Bersih Diterima</p>
                <p className="text-4xl font-bold mt-1">{formatCurrency(p.netSalary)}</p>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
                  <div><p className="text-blue-100 text-xs">Gross</p><p className="font-semibold">{formatCurrency(p.grossSalary)}</p></div>
                  <div><p className="text-blue-100 text-xs">Potongan</p><p className="font-semibold">{formatCurrency(p.totalDeduction)}</p></div>
                  <div><p className="text-blue-100 text-xs">KPI Score</p><p className="font-semibold">{p.kpiScore || "-"}</p></div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Pendapatan</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Gaji Pokok" value={formatCurrency(p.baseSalary)} />
                  {p.isManual ? (
                    <Row label="Tunjangan & Bonus" value={formatCurrency(p.transportAllowance)} />
                  ) : (
                    <>
                      <Row label="Tunjangan Makan" value={formatCurrency(p.mealAllowance)} />
                      <Row label="Tunjangan Transport" value={formatCurrency(p.transportAllowance)} />
                      <Row label="Bonus KPI" value={formatCurrency(p.kpiBonus)} />
                    </>
                  )}
                  <div className="border-t pt-2 mt-2"><Row label="Total Gross" value={formatCurrency(p.grossSalary)} bold /></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-rose-600" /> Potongan</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {p.isManual ? (
                    <Row label="Potongan" value={formatCurrency(p.otherDeduction)} negative />
                  ) : (
                    <>
                      <Row label="Potongan Kehadiran" value={formatCurrency(p.attendanceDeduction)} negative />
                      <Row label="BPJS" value={formatCurrency(p.bpjs)} negative />
                      <Row label="Pajak (PPh)" value={formatCurrency(p.tax)} negative />
                    </>
                  )}
                  <div className="border-t pt-2 mt-2"><Row label="Total Potongan" value={formatCurrency(p.totalDeduction)} bold negative /></div>
                </CardContent>
              </Card>
            </div>

            <Button onClick={() => handleDownloadSlip(p)} className="w-full bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" /> Download Slip Gaji (PDF)
            </Button>
          </>
        )}
      </div>
    );
  }

  // ===== OWNER VIEW =====
  const previewNet = (Number(genForm.baseSalary) || 0) + (Number(genForm.tunjangan) || 0) - (Number(genForm.potongan) || 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Payroll & Gaji"
        description="Generator slip gaji manual & arsip penggajian"
        action={
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileText className="w-4 h-4 mr-1" /> Export Excel
          </Button>
        }
      />

      {/* Two-column layout: Generator + Arsip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== GENERATOR GAJI BULANAN (Form) ===== */}
        <Card className="border-blue-200">
          <CardHeader className="pb-3 bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Zap className="w-4 h-4" /> GENERATOR GAJI BULANAN
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600">PILIH KARYAWAN</Label>
              <Select value={genForm.userId} onValueChange={(v) => {
                const u = users.find((x) => x.id === v);
                setGenForm({ ...genForm, userId: v, jabatan: u?.position || ROLE_LABELS[u?.role || ""] || "", accountName: u?.name || "" });
              }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="-- Pilih Karyawan --" /></SelectTrigger>
                <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role]})</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600">BULAN</Label>
                <Select value={genForm.month} onValueChange={(v) => setGenForm({ ...genForm, month: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">TAHUN</Label>
                <Input value={genForm.year} onChange={(e) => setGenForm({ ...genForm, year: e.target.value })} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">GAJI POKOK (IDR)</Label>
              <Input type="number" value={genForm.baseSalary} onChange={(e) => setGenForm({ ...genForm, baseSalary: e.target.value })} className="mt-1" placeholder="0" />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">TOTAL TUNJANGAN (IDR)</Label>
              <Input type="number" value={genForm.tunjangan} onChange={(e) => setGenForm({ ...genForm, tunjangan: e.target.value })} className="mt-1" placeholder="0" />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">TOTAL POTONGAN (IDR)</Label>
              <Input type="number" value={genForm.potongan} onChange={(e) => setGenForm({ ...genForm, potongan: e.target.value })} className="mt-1" placeholder="0" />
            </div>

            {/* Transfer info */}
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-slate-600 mb-2">INFO TRANSFER (opsional)</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Bank (BSI/BNI/Mandiri)" value={genForm.bankName} onChange={(e) => setGenForm({ ...genForm, bankName: e.target.value })} className="text-sm" />
                <Input placeholder="No. Rekening" value={genForm.bankAccount} onChange={(e) => setGenForm({ ...genForm, bankAccount: e.target.value })} className="text-sm" />
                <Input placeholder="NIK Karyawan" value={genForm.nik} onChange={(e) => setGenForm({ ...genForm, nik: e.target.value })} className="text-sm" />
                <Input placeholder="Jabatan" value={genForm.jabatan} onChange={(e) => setGenForm({ ...genForm, jabatan: e.target.value })} className="text-sm" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">KETERANGAN / NOTES</Label>
              <Textarea value={genForm.note} onChange={(e) => setGenForm({ ...genForm, note: e.target.value })} placeholder="e.g. Gaji bulanan terstruktur" rows={2} className="mt-1 text-sm" />
            </div>

            {/* Preview net */}
            <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Preview Gaji Bersih:</span>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(previewNet)}</span>
            </div>

            <Button onClick={handleGenerateManual} disabled={generating || !genForm.userId} className="w-full bg-blue-600 hover:bg-blue-700">
              {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
              {generating ? "Memproses..." : "GENERATE SLIP GAJI"}
            </Button>
          </CardContent>
        </Card>

        {/* ===== ARSIP SLIP GAJI (Table) ===== */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 bg-slate-800 text-white rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Receipt className="w-4 h-4" /> ARSIP SLIP GAJI
            </CardTitle>
            <p className="text-xs text-slate-300 mt-1">Daftar penggajian bulanan seluruh staf</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {archive.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Belum ada slip gaji. Generate di form sebelah.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 px-2 font-medium">No.</th>
                      <th className="py-2 px-2 font-medium">Nama</th>
                      <th className="py-2 px-2 font-medium">Periode</th>
                      <th className="py-2 px-2 font-medium text-right">Gaji Pokok</th>
                      <th className="py-2 px-2 font-medium text-right">Tunjangan</th>
                      <th className="py-2 px-2 font-medium text-right">Potongan</th>
                      <th className="py-2 px-2 font-medium text-right">Gaji Bersih</th>
                      <th className="py-2 px-2 font-medium text-center">Status</th>
                      <th className="py-2 px-2 font-medium text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archive.map((p, i) => {
                      const tunj = p.isManual ? p.transportAllowance : (p.mealAllowance + p.transportAllowance + p.kpiBonus);
                      const pot = p.isManual ? p.otherDeduction : (p.attendanceDeduction + p.bpjs + p.tax + p.otherDeduction);
                      return (
                        <tr key={p.id || i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-2 text-slate-400">{i + 1}</td>
                          <td className="py-2 px-2 font-medium text-slate-900">{p.user?.name || p.userName}</td>
                          <td className="py-2 px-2 text-slate-600">{monthNames[p.month - 1]} {p.year}</td>
                          <td className="py-2 px-2 text-right text-slate-700">{formatCurrency(p.baseSalary)}</td>
                          <td className="py-2 px-2 text-right text-blue-600">{formatCurrency(tunj)}</td>
                          <td className="py-2 px-2 text-right text-rose-600">{formatCurrency(pot)}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-900">{formatCurrency(p.netSalary)}</td>
                          <td className="py-2 px-2 text-center"><Badge variant="outline" className={cn("text-[9px]", STATUS_COLORS[p.status])}>{STATUS_LABELS[p.status] || p.status}</Badge></td>
                          <td className="py-2 px-2">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-blue-600" title="Preview Slip" onClick={() => setPayslipDialog({ open: true, payroll: p })}><Eye className="w-3 h-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-blue-600" title="Download PDF" onClick={() => handleDownloadSlip(p)}><Download className="w-3 h-3" /></Button>
                              {p.status === "DRAFT" && <Button size="sm" variant="ghost" className="h-6 px-1.5 text-amber-600" title="Approve" onClick={() => handleUpdateStatus(p.id!, "APPROVED")}><CheckCircle2 className="w-3 h-3" /></Button>}
                              {p.status === "APPROVED" && <Button size="sm" variant="ghost" className="h-6 px-1.5 text-blue-600" title="Tandai Lunas" onClick={() => handleUpdateStatus(p.id!, "PAID")}><DollarSign className="w-3 h-3" /></Button>}
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-rose-600" title="Hapus" onClick={() => handleDelete(p.id!)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan {archive.length} data</span>
              <span>Total: <span className="font-bold text-blue-700">{formatCurrency(archive.reduce((s, p) => s + p.netSalary, 0))}</span></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Slip Gaji" value={archive.length} icon={Receipt} indicator="neutral" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Sudah Dibayar" value={archive.filter((p) => p.status === "PAID").length} icon={CheckCircle2} indicator="green" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Total Gaji Bruto" value={formatCurrency(archive.reduce((s, p) => s + p.grossSalary, 0))} icon={Wallet} indicator="neutral" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Total Gaji Bersih" value={formatCurrency(archive.reduce((s, p) => s + p.netSalary, 0))} icon={DollarSign} indicator="green" accent="bg-blue-50 text-blue-600" />
      </div>

      {/* ===== Payslip Detail Dialog ===== */}
      <Dialog open={payslipDialog.open} onOpenChange={(o) => setPayslipDialog({ open: o, payroll: payslipDialog.payroll })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600" /> Detail Slip Gaji</DialogTitle>
            <DialogDescription>{payslipDialog.payroll?.user?.name} - {payslipDialog.payroll ? monthNames[payslipDialog.payroll.month - 1] : ""} {payslipDialog.payroll?.year}</DialogDescription>
          </DialogHeader>
          {payslipDialog.payroll && (() => {
            const p = payslipDialog.payroll;
            const tunj = p.isManual ? p.transportAllowance : (p.mealAllowance + p.transportAllowance + p.kpiBonus);
            const pot = p.isManual ? p.otherDeduction : (p.attendanceDeduction + p.bpjs + p.tax + p.otherDeduction);
            return (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {/* Company header */}
                <div className="bg-blue-900 text-white rounded-lg p-4">
                  <p className="font-bold text-lg">PT. HAFARA AIQBA NUSANTARA</p>
                  <p className="text-xs text-blue-100 mt-1">Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur</p>
                  <p className="text-xs text-blue-100">Info@hafaragroup.com | www.HafaraGroup.com | 081324511570</p>
                </div>
                {/* Employee & periode */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-2">KARYAWAN</p>
                    <p className="text-sm"><span className="text-slate-500">Nama:</span> <span className="font-medium">{p.user?.name}</span></p>
                    <p className="text-sm"><span className="text-slate-500">NIK:</span> {p.nik || p.userId.slice(-4).toUpperCase()}</p>
                    <p className="text-sm"><span className="text-slate-500">Jabatan:</span> {p.jabatan || p.user?.position || "-"}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-2">PERIODE & TRANSFER</p>
                    <p className="text-sm"><span className="text-slate-500">Periode:</span> {p.periodeLabel || `${monthNames[p.month - 1]} ${p.year}`}</p>
                    <p className="text-sm"><span className="text-slate-500">Bank:</span> {p.bankName || "-"}</p>
                    <p className="text-sm"><span className="text-slate-500">No. Rek:</span> {p.bankAccount || "-"}</p>
                  </div>
                </div>
                {/* Earnings & Deductions */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> PENDAPATAN</p>
                    <Row label="Gaji Pokok" value={formatCurrency(p.baseSalary)} />
                    <Row label="Tunjangan & Bonus" value={formatCurrency(tunj)} />
                    <div className="border-t pt-1 mt-1"><Row label="Total Pendapatan" value={formatCurrency(p.grossSalary)} bold /></div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-xs font-semibold text-rose-700 mb-2 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> POTONGAN</p>
                    <Row label="Potongan" value={formatCurrency(pot)} negative />
                    <div className="border-t pt-1 mt-1"><Row label="Total Potongan" value={formatCurrency(pot)} bold negative /></div>
                  </div>
                </div>
                {/* Net + Status */}
                <div className="bg-blue-900 text-white rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">TAKE HOME PAY (GAJI BERSIH)</p>
                    <p className="text-2xl font-bold">{formatCurrency(p.netSalary)}</p>
                  </div>
                  <Badge className={cn("text-sm", STATUS_COLORS[p.status])}>{p.status === "PAID" ? "LUNAS / PAID" : STATUS_LABELS[p.status]}</Badge>
                </div>
                {p.note && <p className="text-xs text-slate-500 italic">Catatan: {p.note}</p>}
                <Button onClick={() => handleDownloadSlip(p)} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" /> Download Slip Gaji PDF
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={cn("text-slate-600", bold && "font-semibold text-slate-900")}>{label}</span>
      <span className={cn(bold ? "font-bold" : "font-medium", negative ? "text-rose-600" : "text-slate-800")}>{value}</span>
    </div>
  );
}
