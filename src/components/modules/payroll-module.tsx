"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Receipt, Wallet, TrendingUp, TrendingDown, Clock, Award, FileText,
  RefreshCw, Download, CheckCircle2, DollarSign, Settings, Zap, Printer,
  Trash2, Eye, Building2, User, Calendar, Banknote, FileSpreadsheet,
  ChevronRight, Sparkles, Plus,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, formatCurrency, formatDate } from "@/lib/constants";
import { exportToExcel } from "@/lib/export-utils";
import { downloadSlipGajiPDF, type SlipGajiData } from "@/lib/slip-gaji-pdf";
import { fetchLayoutSettings } from "@/lib/layout-helper";
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
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
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
    baseSalary: "",
    tunjangan: "",
    potongan: "",
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
      setGenForm({ ...genForm, baseSalary: "", tunjangan: "", potongan: "", note: "", bankAccount: "", accountName: "", nik: "" });
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

  async function handleDownloadSlip(p: Payroll) {
    const u = p.user || { name: p.userName || "", role: p.role || "", position: "", phone: "" };
    // Fetch layout settings - ALL design comes from here
    let layoutSettings: any = null;
    try {
      const ld = await fetchLayoutSettings("SLIP_GAJI");
      layoutSettings = ld.layout;
    } catch {}
    // CLEAN: only pass content data, all design comes from layout settings
    const slipData: SlipGajiData = {
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
      layout: layoutSettings,
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

  const previewNet = (Number(genForm.baseSalary) || 0) + (Number(genForm.tunjangan) || 0) - (Number(genForm.potongan) || 0);

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Slip Gaji Saya</h1>
          <p className="text-sm text-slate-500 mt-1">Rincian gaji bulanan Anda</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px] h-9 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-9 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{[now.getFullYear(), now.getFullYear() - 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {!p ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">Belum ada slip gaji untuk periode {monthNames[month - 1]} {year}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Status banner */}
            <Card className={cn("border-2", p.status === "PAID" ? "border-blue-300 bg-blue-50/50" : "border-amber-200 bg-amber-50/50")}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", p.status === "PAID" ? "bg-blue-600 text-white" : "bg-amber-500 text-white")}>
                    {p.status === "PAID" ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Periode: {monthNames[p.month - 1]} {p.year}</p>
                    <p className="text-sm text-slate-600">{p.status === "PAID" ? `Dibayar pada ${p.paidAt ? formatDate(p.paidAt) : "-"}` : "Draft - belum disetujui"}</p>
                  </div>
                </div>
                <Badge className={cn("text-sm px-3 py-1", STATUS_COLORS[p.status])}>{STATUS_LABELS[p.status] || p.status}</Badge>
              </CardContent>
            </Card>

            {/* Net salary hero card */}
            <Card className="border-0 shadow-lg shadow-blue-600/20 overflow-hidden">
              <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className="text-blue-100 text-sm font-medium">Gaji Bersih Diterima</span>
                  </div>
                  <Sparkles className="w-5 h-5 text-blue-200" />
                </div>
                <p className="text-4xl font-bold tracking-tight">{formatCurrency(p.netSalary)}</p>
                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/20">
                  <div>
                    <p className="text-blue-200 text-xs mb-0.5">Gross</p>
                    <p className="font-semibold text-sm">{formatCurrency(p.grossSalary)}</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs mb-0.5">Potongan</p>
                    <p className="font-semibold text-sm">{formatCurrency(p.totalDeduction)}</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs mb-0.5">KPI Score</p>
                    <p className="font-semibold text-sm">{p.kpiScore || "-"}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Breakdown cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                    <span className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-green-600" /></span>
                    Pendapatan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-0">
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
                  <Separator className="my-1" />
                  <Row label="Total Gross" value={formatCurrency(p.grossSalary)} bold />
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                    <span className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center"><TrendingDown className="w-4 h-4 text-rose-600" /></span>
                    Potongan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-0">
                  {p.isManual ? (
                    <Row label="Potongan" value={formatCurrency(p.otherDeduction)} negative />
                  ) : (
                    <>
                      <Row label="Potongan Kehadiran" value={formatCurrency(p.attendanceDeduction)} negative />
                      <Row label="BPJS" value={formatCurrency(p.bpjs)} negative />
                      <Row label="Pajak (PPh)" value={formatCurrency(p.tax)} negative />
                    </>
                  )}
                  <Separator className="my-1" />
                  <Row label="Total Potongan" value={formatCurrency(p.totalDeduction)} bold negative />
                </CardContent>
              </Card>
            </div>

            <Button onClick={() => handleDownloadSlip(p)} className="w-full bg-blue-600 hover:bg-blue-700 h-11">
              <Download className="w-4 h-4 mr-2" /> Download Slip Gaji (PDF)
            </Button>
          </>
        )}
      </div>
    );
  }

  // ===== OWNER VIEW =====
  const totalGross = archive.reduce((s, p) => s + p.grossSalary, 0);
  const totalNet = archive.reduce((s, p) => s + p.netSalary, 0);
  const paidCount = archive.filter((p) => p.status === "PAID").length;
  const draftCount = archive.filter((p) => p.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll & Gaji</h1>
          <p className="text-sm text-slate-500 mt-1">Generator slip gaji manual & arsip penggajian tim</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="bg-white">
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={Receipt} label="Total Slip" value={String(archive.length)} accent="blue" />
        <SummaryCard icon={CheckCircle2} label="Sudah Dibayar" value={String(paidCount)} accent="green" />
        <SummaryCard icon={DollarSign} label="Total Gaji Bruto" value={formatCurrency(totalGross)} accent="violet" />
        <SummaryCard icon={Wallet} label="Total Gaji Bersih" value={formatCurrency(totalNet)} accent="blue" />
      </div>

      {/* Main content: Generator + Arsip */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ===== GENERATOR (left, 2 cols) ===== */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 self-start sticky top-20">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 rounded-t-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Generator Gaji Bulanan</h3>
                <p className="text-blue-100 text-xs">Buat slip gaji manual</p>
              </div>
            </div>
          </div>
          <CardContent className="p-5 space-y-4">
            {/* Karyawan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <User className="w-3 h-3" /> PILIH KARYAWAN
              </Label>
              <Select value={genForm.userId} onValueChange={(v) => {
                const u = users.find((x) => x.id === v);
                setGenForm({ ...genForm, userId: v, jabatan: u?.position || ROLE_LABELS[u?.role || ""] || "", accountName: u?.name || "" });
              }}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="-- Pilih Karyawan --" /></SelectTrigger>
                <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role]})</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Periode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> BULAN</Label>
                <Select value={genForm.month} onValueChange={(v) => setGenForm({ ...genForm, month: v })}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> TAHUN</Label>
                <Input value={genForm.year} onChange={(e) => setGenForm({ ...genForm, year: e.target.value })} className="bg-white" />
              </div>
            </div>

            <Separator />

            {/* Nominal inputs */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> GAJI POKOK (IDR)</Label>
                <Input type="number" value={genForm.baseSalary} onChange={(e) => setGenForm({ ...genForm, baseSalary: e.target.value })} placeholder="0" className="bg-white text-right font-medium" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> TOTAL TUNJANGAN (IDR)</Label>
                <Input type="number" value={genForm.tunjangan} onChange={(e) => setGenForm({ ...genForm, tunjangan: e.target.value })} placeholder="0" className="bg-white text-right font-medium" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><TrendingDown className="w-3 h-3" /> TOTAL POTONGAN (IDR)</Label>
                <Input type="number" value={genForm.potongan} onChange={(e) => setGenForm({ ...genForm, potongan: e.target.value })} placeholder="0" className="bg-white text-right font-medium" />
              </div>
            </div>

            {/* Preview net */}
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Preview Gaji Bersih</span>
                <span className="text-xl font-bold text-blue-700">{formatCurrency(previewNet)}</span>
              </div>
            </div>

            <Separator />

            {/* Info Transfer (collapsible feel) */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Banknote className="w-3 h-3" /> INFO TRANSFER (opsional)</p>
              <Input placeholder="Nama Bank (BCA/BNI/BSI/Mandiri)" value={genForm.bankName} onChange={(e) => setGenForm({ ...genForm, bankName: e.target.value })} className="bg-white text-sm h-9" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="No. Rekening" value={genForm.bankAccount} onChange={(e) => setGenForm({ ...genForm, bankAccount: e.target.value })} className="bg-white text-sm h-9" />
                <Input placeholder="NIK Karyawan" value={genForm.nik} onChange={(e) => setGenForm({ ...genForm, nik: e.target.value })} className="bg-white text-sm h-9" />
              </div>
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">KETERANGAN / NOTES</Label>
              <Textarea value={genForm.note} onChange={(e) => setGenForm({ ...genForm, note: e.target.value })} placeholder="e.g. Gaji bulanan terstruktur" rows={2} className="bg-white text-sm resize-none" />
            </div>

            <Button onClick={handleGenerateManual} disabled={generating || !genForm.userId} className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-medium">
              {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
              {generating ? "Memproses..." : "GENERATE SLIP GAJI"}
            </Button>
          </CardContent>
        </Card>

        {/* ===== ARSIP (right, 3 cols) ===== */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="shadow-sm border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Arsip Slip Gaji</h3>
                  <p className="text-slate-500 text-xs">Daftar penggajian bulanan seluruh staf</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50">{archive.length} data</Badge>
            </div>
            <CardContent className="p-0">
              {archive.length === 0 ? (
                <div className="py-16 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Belum ada slip gaji</p>
                  <p className="text-xs text-slate-400 mt-1">Generate slip gaji di form sebelah kiri</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b border-slate-200 text-left">
                        <th className="py-3 px-4 font-semibold text-xs text-slate-500 uppercase tracking-wide w-10">#</th>
                        <th className="py-3 px-3 font-semibold text-xs text-slate-500 uppercase tracking-wide">Karyawan</th>
                        <th className="py-3 px-3 font-semibold text-xs text-slate-500 uppercase tracking-medium">Periode</th>
                        <th className="py-3 px-3 font-semibold text-xs text-slate-500 uppercase tracking-wide text-right">Gaji Bersih</th>
                        <th className="py-3 px-3 font-semibold text-xs text-slate-500 uppercase tracking-wide text-center">Status</th>
                        <th className="py-3 px-3 font-semibold text-xs text-slate-500 uppercase tracking-wide text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archive.map((p, i) => {
                        const tunj = p.isManual ? p.transportAllowance : (p.mealAllowance + p.transportAllowance + p.kpiBonus);
                        const pot = p.isManual ? p.otherDeduction : (p.attendanceDeduction + p.bpjs + p.tax + p.otherDeduction);
                        return (
                          <tr key={p.id || i} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                            <td className="py-3 px-4 text-slate-400 text-xs font-medium">{i + 1}</td>
                            <td className="py-3 px-3">
                              <p className="font-medium text-slate-900 text-sm">{p.user?.name || p.userName}</p>
                              <p className="text-[10px] text-slate-400">{ROLE_LABELS[p.user?.role || p.role || ""]}</p>
                            </td>
                            <td className="py-3 px-3 text-slate-600 text-xs">{monthNames[p.month - 1].slice(0, 3)} {p.year}</td>
                            <td className="py-3 px-3 text-right">
                              <p className="font-bold text-slate-900">{formatCurrency(p.netSalary)}</p>
                              <p className="text-[10px] text-slate-400">{formatCurrency(p.baseSalary)} + {formatCurrency(tunj)} - {formatCurrency(pot)}</p>
                            </td>
                            <td className="py-3 px-3 text-center"><Badge variant="outline" className={cn("text-[10px] font-medium", STATUS_COLORS[p.status])}>{STATUS_LABELS[p.status] || p.status}</Badge></td>
                            <td className="py-3 px-3">
                              <div className="flex gap-0.5 justify-center">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="Preview" onClick={() => setPayslipDialog({ open: true, payroll: p })}>
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="Download PDF" onClick={() => handleDownloadSlip(p)}>
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                                {p.status === "DRAFT" && (
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50" title="Setujui" onClick={() => handleUpdateStatus(p.id!, "APPROVED")}>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {p.status === "APPROVED" && (
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="Tandai Lunas" onClick={() => handleUpdateStatus(p.id!, "PAID")}>
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50" title="Hapus" onClick={() => handleDelete(p.id!)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            {archive.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50 flex items-center justify-between text-xs">
                <span className="text-slate-500">Menampilkan {archive.length} dari {archive.length} data</span>
                <span className="text-slate-500">Total: <span className="font-bold text-blue-700">{formatCurrency(totalNet)}</span></span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ===== Payslip Detail Dialog ===== */}
      <Dialog open={payslipDialog.open} onOpenChange={(o) => setPayslipDialog({ open: o, payroll: payslipDialog.payroll })}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {payslipDialog.payroll && (() => {
            const p = payslipDialog.payroll;
            const tunj = p.isManual ? p.transportAllowance : (p.mealAllowance + p.transportAllowance + p.kpiBonus);
            const pot = p.isManual ? p.otherDeduction : (p.attendanceDeduction + p.bpjs + p.tax + p.otherDeduction);
            return (
              <>
                <DialogHeader className="sr-only">
                  <DialogTitle>Detail Slip Gaji</DialogTitle>
                </DialogHeader>
                {/* Company header */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-5 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-lg">PT. HAFARA AIQBA NUSANTARA</p>
                      <p className="text-xs text-blue-100 mt-1">Jl. Tanjung Sariloyo Sambongdukuh, Kab. Jombang, Jawa Timur</p>
                      <p className="text-xs text-blue-100">Info@hafaragroup.com | www.HafaraGroup.com | 081324511570</p>
                    </div>
                    <Badge className="bg-white/15 text-white border-white/20 text-xs">SLIP GAJI</Badge>
                  </div>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Employee & periode */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-2">Karyawan</p>
                      <p className="text-sm"><span className="text-slate-400">Nama</span><br /><span className="font-semibold text-slate-900">{p.user?.name}</span></p>
                      <p className="text-sm mt-1.5"><span className="text-slate-400">NIK</span> <span className="text-slate-700">{p.nik || p.userId.slice(-4).toUpperCase()}</span></p>
                      <p className="text-sm"><span className="text-slate-400">Jabatan</span> <span className="text-slate-700">{p.jabatan || p.user?.position || "-"}</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-2">Periode & Transfer</p>
                      <p className="text-sm"><span className="text-slate-400">Periode</span><br /><span className="font-semibold text-slate-900">{p.periodeLabel || `${monthNames[p.month - 1]} ${p.year}`}</span></p>
                      <p className="text-sm mt-1.5"><span className="text-slate-400">Bank</span> <span className="text-slate-700">{p.bankName || "-"}</span></p>
                      <p className="text-sm"><span className="text-slate-400">No. Rek</span> <span className="text-slate-700">{p.bankAccount || "-"}</span></p>
                    </div>
                  </div>

                  {/* Earnings & Deductions */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-green-700 mb-2.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500" /> PENDAPATAN
                      </p>
                      <Row label="Gaji Pokok" value={formatCurrency(p.baseSalary)} />
                      <Row label="Tunjangan & Bonus" value={formatCurrency(tunj)} />
                      <Separator className="my-1.5" />
                      <Row label="Total Pendapatan" value={formatCurrency(p.grossSalary)} bold />
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-rose-700 mb-2.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> POTONGAN
                      </p>
                      <Row label="Potongan" value={formatCurrency(pot)} negative />
                      <Separator className="my-1.5" />
                      <Row label="Total Potongan" value={formatCurrency(pot)} bold negative />
                    </div>
                  </div>

                  {/* Note */}
                  {p.note && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-amber-600 uppercase mb-1">Catatan</p>
                      <p className="text-xs text-slate-600">{p.note}</p>
                    </div>
                  )}
                </div>

                {/* Net + action footer */}
                <div className="border-t border-slate-100">
                  <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs">TAKE HOME PAY (GAJI BERSIH)</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(p.netSalary)}</p>
                    </div>
                    <Badge className={cn("text-sm px-3 py-1.5", STATUS_COLORS[p.status])}>{p.status === "PAID" ? "LUNAS / PAID" : STATUS_LABELS[p.status]}</Badge>
                  </div>
                  <div className="p-4 flex gap-2">
                    <Button onClick={() => handleDownloadSlip(p)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                    <Button variant="outline" onClick={() => setPayslipDialog({ open: false, payroll: null })}>Tutup</Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Helper components =====
function Row({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-slate-600", bold && "font-semibold text-slate-900")}>{label}</span>
      <span className={cn(bold ? "font-bold" : "font-medium", negative ? "text-rose-600" : "text-slate-800")}>{value}</span>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "blue" | "green" | "violet" }) {
  const accentMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accentMap[accent])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900 truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
