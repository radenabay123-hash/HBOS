"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Receipt, Wallet, TrendingUp, TrendingDown, Clock, Award, FileText,
  RefreshCw, Download, CheckCircle2, DollarSign, Settings, Zap,
} from "lucide-react";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, formatCurrency, formatNumber, formatDate } from "@/lib/constants";
import { exportToExcel, exportToPDF, exportReportPDF } from "@/lib/export-utils";
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
}

interface SalaryConfig {
  id: string;
  userId: string;
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  bonusTarget: number;
  penaltyPerAbsent: number;
  bpjs: number;
  tax: number;
  user: { id: string; name: string; role: string; position: string };
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
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [myPayroll, setMyPayroll] = useState<Payroll | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [configDialog, setConfigDialog] = useState<{ open: boolean; config: SalaryConfig | null }>({ open: false, config: null });
  const [payslipDialog, setPayslipDialog] = useState<{ open: boolean; payroll: Payroll | null }>({ open: false, payroll: null });
  const [configForm, setConfigForm] = useState({ baseSalary: 0, mealAllowance: 0, transportAllowance: 0, bonusTarget: 0, penaltyPerAbsent: 0, bpjs: 0, tax: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<any>(`/api/payroll?month=${month}&year=${year}`);
      if (isOwner) {
        setPayrolls(data.payrolls || []);
        setSaved(data.saved || false);
        const cfg = await api<{ configs: SalaryConfig[] }>("/api/salary-config").catch(() => ({ configs: [] }));
        setConfigs(cfg.configs || []);
      } else {
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

  async function handleGenerate() {
    setGenerating(true);
    try {
      await api("/api/payroll/generate", { method: "POST", body: JSON.stringify({ month, year }) });
      toast.success(`Payroll ${monthNames[month - 1]} ${year} berhasil dibuat`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal generate payroll");
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateStatus(payrollId: string, status: string) {
    try {
      await api(`/api/payroll/${payrollId}`, { method: "PUT", body: JSON.stringify({ status }) });
      toast.success(status === "PAID" ? "Gaji ditandai sudah dibayar" : status === "APPROVED" ? "Payroll disetujui" : "Status diperbarui");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal update status");
    }
  }

  function openConfig(config: SalaryConfig) {
    setConfigDialog({ open: true, config });
    setConfigForm({
      baseSalary: config.baseSalary, mealAllowance: config.mealAllowance,
      transportAllowance: config.transportAllowance, bonusTarget: config.bonusTarget,
      penaltyPerAbsent: config.penaltyPerAbsent, bpjs: config.bpjs, tax: config.tax,
    });
  }

  async function handleSaveConfig() {
    if (!configDialog.config) return;
    try {
      await api("/api/salary-config", {
        method: "POST",
        body: JSON.stringify({ userId: configDialog.config.userId, ...configForm }),
      });
      toast.success("Konfigurasi gaji disimpan");
      setConfigDialog({ open: false, config: null });
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    }
  }

  function handleExportPayslipPDF(p: Payroll) {
    const u = p.user || { name: p.userName || "", role: p.role || "", position: "", phone: "" };
    exportReportPDF(
      `Slip Gaji - ${u.name} - ${monthNames[p.month - 1]} ${p.year}`,
      [
        { heading: "Informasi Karyawan", columns: ["Field", "Nilai"], rows: [
          ["Nama", u.name], ["Jabatan", ROLE_LABELS[u.role] || u.role], ["Posisi", u.position || "-"],
          ["Periode", `${monthNames[p.month - 1]} ${p.year}`], ["Status", STATUS_LABELS[p.status] || p.status],
        ]},
        { heading: "Pendapatan", columns: ["Komponen", "Jumlah"], rows: [
          ["Gaji Pokok", formatCurrency(p.baseSalary)],
          ["Tunjangan Makan", formatCurrency(p.mealAllowance)],
          ["Tunjangan Transport", formatCurrency(p.transportAllowance)],
          ["Bonus KPI", formatCurrency(p.kpiBonus)],
          ["Total Pendapatan (Gross)", formatCurrency(p.grossSalary)],
        ]},
        { heading: "Potongan", columns: ["Komponen", "Jumlah"], rows: [
          ["Potongan Kehadiran", formatCurrency(p.attendanceDeduction)],
          ["BPJS", formatCurrency(p.bpjs)],
          ["Pajak (PPh)", formatCurrency(p.tax)],
          ["Potongan Lainnya", formatCurrency(p.otherDeduction)],
          ["Total Potongan", formatCurrency(p.totalDeduction)],
        ]},
        { heading: "Ringkasan Absensi & KPI", columns: ["Metrik", "Nilai"], rows: [
          ["Hari Kerja", String(p.workingDays)], ["Hadir", String(p.presentDays)],
          ["Terlambat", String(p.lateDays)], ["Tidak Hadir (Alpha)", String(p.absentDays)],
          ["Izin/Sakit/Cuti", String(p.leaveDays)],
          ["KPI Score", String(p.kpiScore)],
        ]},
        { heading: "Gaji Diterima", columns: ["", "Jumlah"], rows: [["GAJI BERSIH (NET)", formatCurrency(p.netSalary)]] },
      ],
      `Slip-Gaji-${u.name}-${monthNames[p.month - 1]}-${p.year}`
    );
    toast.success("Slip gaji PDF diunduh");
  }

  function handleExportExcel() {
    const rows = payrolls.map((p) => ({
      Nama: p.user?.name || p.userName, Jabatan: ROLE_LABELS[p.user?.role || p.role || ""] || "",
      Periode: `${monthNames[p.month - 1]} ${p.year}`,
      "Gaji Pokok": p.baseSalary, "Tunjangan Makan": p.mealAllowance,
      "Tunjangan Transport": p.transportAllowance, "Bonus KPI": p.kpiBonus,
      "Gross": p.grossSalary,
      "Potongan Kehadiran": p.attendanceDeduction, BPJS: p.bpjs, Pajak: p.tax,
      "Total Potongan": p.totalDeduction, "Gaji Bersih": p.netSalary,
      "KPI Score": p.kpiScore, "Hadir": p.presentDays, "Alpha": p.absentDays,
      Status: STATUS_LABELS[p.status] || p.status,
    }));
    exportToExcel(rows, `Payroll-${monthNames[month - 1]}-${year}`, "Payroll");
    toast.success("Excel diunduh");
  }

  function handleExportSummaryPDF() {
    exportToPDF(
      `Ringkasan Payroll - ${monthNames[month - 1]} ${year}`,
      ["Nama", "Jabatan", "Gross", "Potongan", "Gaji Bersih", "KPI", "Status"],
      payrolls.map((p) => [
        p.user?.name || p.userName || "", ROLE_LABELS[p.user?.role || p.role || ""] || "",
        formatCurrency(p.grossSalary), formatCurrency(p.totalDeduction),
        formatCurrency(p.netSalary), String(p.kpiScore), STATUS_LABELS[p.status] || p.status,
      ]),
      `Ringkasan-Payroll-${monthNames[month - 1]}-${year}`
    );
    toast.success("PDF diunduh");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // ===== TEAM VIEW (own payslip) =====
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
            {/* Status banner */}
            <Card className={cn("border-2", p.status === "PAID" ? "border-blue-300 bg-blue-50" : p.status === "APPROVED" ? "border-amber-300 bg-amber-50" : "border-slate-200")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {p.status === "PAID" ? <CheckCircle2 className="w-6 h-6 text-blue-600" /> : <Clock className="w-6 h-6 text-amber-600" />}
                  <div>
                    <p className="font-semibold text-slate-900">Periode: {monthNames[p.month - 1]} {p.year}</p>
                    <p className="text-sm text-slate-600">
                      {p.status === "PAID" ? `Dibayar pada ${p.paidAt ? formatDate(p.paidAt) : "-"}` : p.status === "APPROVED" ? "Disetujui, menunggu pembayaran" : "Draft - belum disetujui"}
                    </p>
                  </div>
                </div>
                <Badge className={cn("text-sm", STATUS_COLORS[p.status])}>{STATUS_LABELS[p.status] || p.status}</Badge>
              </CardContent>
            </Card>

            {/* Net salary hero */}
            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0">
              <CardContent className="p-6">
                <p className="text-blue-100 text-sm">Gaji Bersih Diterima</p>
                <p className="text-4xl font-bold mt-1">{formatCurrency(p.netSalary)}</p>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
                  <div><p className="text-blue-100 text-xs">Gross</p><p className="font-semibold">{formatCurrency(p.grossSalary)}</p></div>
                  <div><p className="text-blue-100 text-xs">Potongan</p><p className="font-semibold">{formatCurrency(p.totalDeduction)}</p></div>
                  <div><p className="text-blue-100 text-xs">KPI Score</p><p className="font-semibold">{p.kpiScore}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Detail breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Pendapatan</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Gaji Pokok" value={formatCurrency(p.baseSalary)} />
                  <Row label="Tunjangan Makan" value={formatCurrency(p.mealAllowance)} />
                  <Row label="Tunjangan Transport" value={formatCurrency(p.transportAllowance)} />
                  <Row label="Bonus KPI" value={formatCurrency(p.kpiBonus)} highlight />
                  <div className="border-t pt-2 mt-2"><Row label="Total Gross" value={formatCurrency(p.grossSalary)} bold /></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-rose-600" /> Potongan</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Potongan Kehadiran" value={formatCurrency(p.attendanceDeduction)} negative />
                  <Row label="BPJS" value={formatCurrency(p.bpjs)} negative />
                  <Row label="Pajak (PPh)" value={formatCurrency(p.tax)} negative />
                  {p.otherDeduction > 0 && <Row label="Potongan Lainnya" value={formatCurrency(p.otherDeduction)} negative />}
                  <div className="border-t pt-2 mt-2"><Row label="Total Potongan" value={formatCurrency(p.totalDeduction)} bold negative /></div>
                </CardContent>
              </Card>
            </div>

            {/* Attendance & KPI summary */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /> Ringkasan Absensi & KPI</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  <Mini label="Hari Kerja" value={p.workingDays} />
                  <Mini label="Hadir" value={p.presentDays} color="text-blue-600" />
                  <Mini label="Terlambat" value={p.lateDays} color="text-amber-600" />
                  <Mini label="Alpha" value={p.absentDays} color="text-rose-600" />
                  <Mini label="Izin/Sakit" value={p.leaveDays} color="text-cyan-600" />
                  <Mini label="KPI Score" value={p.kpiScore} color="text-violet-600" />
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => handleExportPayslipPDF(p)} className="w-full bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" /> Download Slip Gaji (PDF)
            </Button>
          </>
        )}
      </div>
    );
  }

  // ===== OWNER VIEW =====
  const totalGross = payrolls.reduce((s, p) => s + p.grossSalary, 0);
  const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);
  const totalDeduction = payrolls.reduce((s, p) => s + p.totalDeduction, 0);
  const totalBonus = payrolls.reduce((s, p) => s + p.kpiBonus, 0);
  const paidCount = payrolls.filter((p) => p.status === "PAID").length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Payroll & Gaji"
        description="Kelola gaji bulanan tim, hitung otomatis dari absensi & KPI"
        action={
          <div className="flex flex-wrap gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{[now.getFullYear(), now.getFullYear() - 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportExcel}><FileText className="w-4 h-4 mr-1" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={handleExportSummaryPDF}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
            <Button size="sm" onClick={handleGenerate} disabled={generating} className="bg-blue-600 hover:bg-blue-700">
              <Zap className="w-4 h-4 mr-1" /> {generating ? "Memproses..." : saved ? "Update" : "Generate"}
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Gaji Bruto" value={formatCurrency(totalGross)} icon={Wallet} indicator="neutral" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Total Potongan" value={formatCurrency(totalDeduction)} icon={TrendingDown} indicator="neutral" accent="bg-rose-50 text-rose-600" />
        <StatCard title="Total Gaji Bersih" value={formatCurrency(totalNet)} icon={DollarSign} indicator="green" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Sudah Dibayar" value={`${paidCount}/${payrolls.length}`} icon={CheckCircle2} indicator={paidCount === payrolls.length ? "green" : "yellow"} accent="bg-amber-50 text-amber-600" />
      </div>

      <Tabs defaultValue="payroll">
        <TabsList>
          <TabsTrigger value="payroll"><Receipt className="w-4 h-4 mr-1" /> Payroll</TabsTrigger>
          <TabsTrigger value="config"><Settings className="w-4 h-4 mr-1" /> Konfigurasi Gaji</TabsTrigger>
        </TabsList>

        {/* Payroll table */}
        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Daftar Payroll - {monthNames[month - 1]} {year}</CardTitle>
              {!saved && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Preview - belum disimpan. Klik Generate untuk menyimpan.</Badge>}
            </CardHeader>
            <CardContent>
              {payrolls.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Belum ada data. Klik Generate untuk membuat payroll.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-slate-500">
                        <th className="py-2 pr-2 font-medium">Nama</th>
                        <th className="py-2 px-2 font-medium text-right">Gross</th>
                        <th className="py-2 px-2 font-medium text-right">Potongan</th>
                        <th className="py-2 px-2 font-medium text-right">Gaji Bersih</th>
                        <th className="py-2 px-2 font-medium text-center">KPI</th>
                        <th className="py-2 px-2 font-medium text-center">Hadir</th>
                        <th className="py-2 px-2 font-medium text-center">Status</th>
                        <th className="py-2 pl-2 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrolls.map((p) => (
                        <tr key={p.id || p.userId} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 pr-2">
                            <p className="font-medium text-slate-900">{p.user?.name || p.userName}</p>
                            <p className="text-[10px] text-slate-500">{ROLE_LABELS[p.user?.role || p.role || ""] || ""}</p>
                          </td>
                          <td className="py-2 px-2 text-right text-slate-700">{formatCurrency(p.grossSalary)}</td>
                          <td className="py-2 px-2 text-right text-rose-600">{formatCurrency(p.totalDeduction)}</td>
                          <td className="py-2 px-2 text-right font-bold text-blue-700">{formatCurrency(p.netSalary)}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={cn("font-semibold", p.kpiScore >= 90 ? "text-blue-600" : p.kpiScore >= 80 ? "text-cyan-600" : p.kpiScore >= 70 ? "text-amber-600" : "text-rose-600")}>{p.kpiScore}</span>
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600">{p.presentDays}/{p.workingDays}{p.absentDays > 0 && <span className="text-rose-500"> ({p.absentDays}α)</span>}</td>
                          <td className="py-2 px-2 text-center"><Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[p.status] || "bg-slate-100")}>{STATUS_LABELS[p.status] || p.status || "Draft"}</Badge></td>
                          <td className="py-2 pl-2">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPayslipDialog({ open: true, payroll: p })}>Detail</Button>
                              {saved && p.id && p.status === "DRAFT" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600" onClick={() => handleUpdateStatus(p.id!, "APPROVED")}>Approve</Button>}
                              {saved && p.id && p.status === "APPROVED" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-600" onClick={() => handleUpdateStatus(p.id!, "PAID")}>Bayar</Button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 font-bold">
                        <td className="py-2 pr-2">TOTAL</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(totalGross)}</td>
                        <td className="py-2 px-2 text-right text-rose-600">{formatCurrency(totalDeduction)}</td>
                        <td className="py-2 px-2 text-right text-blue-700">{formatCurrency(totalNet)}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Config tab */}
        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Konfigurasi Gaji Karyawan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {configs.map((c) => (
                  <div key={c.id} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:shadow-sm">
                    <div>
                      <p className="font-medium text-slate-900">{c.user.name}</p>
                      <p className="text-xs text-slate-500">{ROLE_LABELS[c.user.role]} · {c.user.position || "-"}</p>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-sm">
                      <div><p className="text-[10px] text-slate-400">Gaji Pokok</p><p className="font-semibold">{formatCurrency(c.baseSalary)}</p></div>
                      <div><p className="text-[10px] text-slate-400">Tunjangan</p><p className="font-semibold">{formatCurrency(c.mealAllowance + c.transportAllowance)}</p></div>
                      <div><p className="text-[10px] text-slate-400">Bonus KPI</p><p className="font-semibold text-blue-600">{formatCurrency(c.bonusTarget)}</p></div>
                      <div><p className="text-[10px] text-slate-400">Penalty/Alpha</p><p className="font-semibold text-rose-600">{formatCurrency(c.penaltyPerAbsent)}</p></div>
                      <div className="flex items-end"><Button size="sm" variant="outline" className="h-7" onClick={() => openConfig(c)}><Settings className="w-3 h-3 mr-1" /> Edit</Button></div>
                    </div>
                  </div>
                ))}
                {configs.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Belum ada konfigurasi gaji</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <Dialog open={configDialog.open} onOpenChange={(o) => setConfigDialog({ open: o, config: configDialog.config })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfigurasi Gaji - {configDialog.config?.user.name}</DialogTitle>
            <DialogDescription>{ROLE_LABELS[configDialog.config?.user.role || ""]}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Field label="Gaji Pokok" value={configForm.baseSalary} onChange={(v) => setConfigForm({ ...configForm, baseSalary: v })} />
            <Field label="Tunjangan Makan" value={configForm.mealAllowance} onChange={(v) => setConfigForm({ ...configForm, mealAllowance: v })} />
            <Field label="Tunjangan Transport" value={configForm.transportAllowance} onChange={(v) => setConfigForm({ ...configForm, transportAllowance: v })} />
            <Field label="Bonus Target KPI" value={configForm.bonusTarget} onChange={(v) => setConfigForm({ ...configForm, bonusTarget: v })} />
            <Field label="Penalty per Alpha" value={configForm.penaltyPerAbsent} onChange={(v) => setConfigForm({ ...configForm, penaltyPerAbsent: v })} />
            <Field label="BPJS" value={configForm.bpjs} onChange={(v) => setConfigForm({ ...configForm, bpjs: v })} />
            <Field label="Pajak (PPh)" value={configForm.tax} onChange={(v) => setConfigForm({ ...configForm, tax: v })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog({ open: false, config: null })}>Batal</Button>
            <Button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Detail Dialog */}
      <Dialog open={payslipDialog.open} onOpenChange={(o) => setPayslipDialog({ open: o, payroll: payslipDialog.payroll })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Slip Gaji</DialogTitle>
            <DialogDescription>{payslipDialog.payroll?.user?.name} - {payslipDialog.payroll ? monthNames[payslipDialog.payroll.month - 1] : ""} {payslipDialog.payroll?.year}</DialogDescription>
          </DialogHeader>
          {payslipDialog.payroll && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="bg-blue-600 text-white rounded-lg p-4 text-center">
                <p className="text-blue-100 text-sm">Gaji Bersih</p>
                <p className="text-3xl font-bold">{formatCurrency(payslipDialog.payroll.netSalary)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">PENDAPATAN</p>
                  <Row label="Gaji Pokok" value={formatCurrency(payslipDialog.payroll.baseSalary)} />
                  <Row label="T. Makan" value={formatCurrency(payslipDialog.payroll.mealAllowance)} />
                  <Row label="T. Transport" value={formatCurrency(payslipDialog.payroll.transportAllowance)} />
                  <Row label="Bonus KPI" value={formatCurrency(payslipDialog.payroll.kpiBonus)} />
                  <div className="border-t mt-2 pt-2"><Row label="Gross" value={formatCurrency(payslipDialog.payroll.grossSalary)} bold /></div>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">POTONGAN</p>
                  <Row label="Kehadiran" value={formatCurrency(payslipDialog.payroll.attendanceDeduction)} negative />
                  <Row label="BPJS" value={formatCurrency(payslipDialog.payroll.bpjs)} negative />
                  <Row label="Pajak" value={formatCurrency(payslipDialog.payroll.tax)} negative />
                  <div className="border-t mt-2 pt-2"><Row label="Total" value={formatCurrency(payslipDialog.payroll.totalDeduction)} bold negative /></div>
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">ABSENSI & KPI</p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <Mini label="Hadir" value={`${payslipDialog.payroll.presentDays}/${payslipDialog.payroll.workingDays}`} />
                  <Mini label="Terlambat" value={payslipDialog.payroll.lateDays} />
                  <Mini label="Alpha" value={payslipDialog.payroll.absentDays} />
                  <Mini label="KPI" value={payslipDialog.payroll.kpiScore} />
                </div>
              </div>
              <Button onClick={() => handleExportPayslipPDF(payslipDialog.payroll)} className="w-full bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" /> Download Slip Gaji PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-slate-600", bold && "font-semibold text-slate-900")}>{label}</span>
      <span className={cn(bold ? "font-bold" : "font-medium", negative ? "text-rose-600" : "text-slate-800")}>{value}</span>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <p className={cn("text-lg font-bold", color || "text-slate-800")}>{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-9" />
    </div>
  );
}
