"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, Target, PiggyBank,
  Plus, Settings, Pencil, Trash2, FileSpreadsheet, FileText, Loader2,
  Banknote, BarChart3, CalendarDays, Filter,
} from "lucide-react";
import { toast } from "sonner";
import type { SafeUser } from "@/lib/auth";
import {
  FINANCE_TYPES, formatCurrency, formatDate, getIndicatorColor,
} from "@/lib/constants";
import { api } from "@/lib/api-client";
import { exportToExcel, exportToPDF, exportReportPDF } from "@/lib/export-utils";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import {
  BarChartCard, PieChartCard, AreaChartCard,
} from "@/components/shared/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TxnType = "PEMASUKAN" | "PENGELUARAN";

interface Transaction {
  id: string;
  type: TxnType;
  amount: number;
  description?: string | null;
  category?: string | null;
  date: string;
  userId: string;
  clientId?: string | null;
  user?: { id: string; name: string } | null;
  client?: { id: string; namaKlien: string } | null;
}

interface Client {
  id: string;
  namaKlien: string;
  instansi?: string | null;
}

interface FinanceSetting {
  targetRevenue: number;
  targetProfit: number;
  month: number;
  year: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const MONTH_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const CATEGORIES = [
  "Pendapatan Training",
  "Pendapatan Konsultasi",
  "Gaji",
  "Operasional",
  "Marketing",
  "Event",
  "IT",
  "Piutang",
  "Hutang",
  "Lainnya",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Pendapatan Training": "#2563eb",
  "Pendapatan Konsultasi": "#0d9488",
  "Gaji": "#dc2777",
  "Operasional": "#ea580c",
  "Marketing": "#ca8a04",
  "Event": "#7c3aed",
  "IT": "#0891b2",
  "Piutang": "#16a34a",
  "Hutang": "#e11d48",
  "Lainnya": "#475569",
};

function formatY(v: number) {
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(0) + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + "K";
  return String(v);
}

export function FinanceModule({ user: _user }: { user: SafeUser }) {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1)); // 1-12 or "all"
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [setting, setSetting] = useState<FinanceSetting | null>(null);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [settingOpen, setSettingOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const emptyForm = {
    type: "PEMASUKAN" as TxnType,
    amount: "",
    description: "",
    category: "Pendapatan Training",
    date: new Date().toISOString().slice(0, 10),
    clientId: "",
  };
  const [form, setForm] = useState(emptyForm);

  // setting form
  const [settingForm, setSettingForm] = useState({
    targetRevenue: "",
    targetProfit: "",
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  });

  const fetchClients = useCallback(async () => {
    try {
      const data = await api<{ clients: Client[] }>("/api/clients");
      setClients(data.clients || []);
    } catch {
      // ignore - clients are optional
    }
  }, []);

  const fetchSetting = useCallback(async () => {
    try {
      const m = month === "all" ? String(now.getMonth() + 1) : month;
      const data = await api<{ setting: FinanceSetting }>(
        `/api/finance/settings?year=${year}&month=${m}`
      );
      setSetting(data.setting);
      setSettingForm({
        targetRevenue: String(data.setting.targetRevenue || ""),
        targetProfit: String(data.setting.targetProfit || ""),
        month: m,
        year: String(year),
      });
    } catch (e: any) {
      toast.error("Gagal memuat setting: " + (e?.message || ""));
    }
  }, [year, month, now]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (month !== "all") params.set("month", month);
      const data = await api<{ transactions: Transaction[] }>(
        `/api/finance?${params.toString()}`
      );
      setTransactions(data.transactions || []);
    } catch (e: any) {
      toast.error("Gagal memuat transaksi: " + (e?.message || ""));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchTransactions();
    fetchSetting();
  }, [fetchTransactions, fetchSetting]);

  // ===== Computed =====
  const stats = useMemo(() => {
    const revenue = transactions
      .filter((t) => t.type === "PEMASUKAN")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions
      .filter((t) => t.type === "PENGELUARAN")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const profit = revenue - expense;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    // piutang / hutang from categories
    const piutang = transactions
      .filter((t) => t.type === "PEMASUKAN" && t.category === "Piutang")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const hutang = transactions
      .filter((t) => t.type === "PENGELUARAN" && t.category === "Hutang")
      .reduce((s, t) => s + (t.amount || 0), 0);
    return { revenue, expense, profit, margin, piutang, hutang };
  }, [transactions]);

  // Monthly chart data (always 12 months for selected year)
  const monthlyData = useMemo(() => {
    const map: Record<number, { revenue: number; expense: number; profit: number }> = {};
    for (let i = 0; i < 12; i++) map[i] = { revenue: 0, expense: 0, profit: 0 };
    for (const t of transactions) {
      const d = new Date(t.date);
      if (d.getFullYear() !== year) continue;
      const m = d.getMonth();
      if (t.type === "PEMASUKAN") map[m].revenue += t.amount || 0;
      else map[m].expense += t.amount || 0;
    }
    for (let i = 0; i < 12; i++) map[i].profit = map[i].revenue - map[i].expense;
    return Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_NAMES[i],
      revenue: map[i].revenue,
      expense: map[i].expense,
      profit: map[i].profit,
    }));
  }, [transactions, year]);

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "PENGELUARAN") continue;
      const cat = t.category || "Lainnya";
      map.set(cat, (map.get(cat) || 0) + (t.amount || 0));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Forecast: avg monthly profit * remaining months in year
  const forecast = useMemo(() => {
    const totalProfit = monthlyData.reduce((s, m) => s + m.profit, 0);
    const elapsedMonths = now.getFullYear() === year ? now.getMonth() + 1 : 12;
    const avg = elapsedMonths > 0 ? totalProfit / elapsedMonths : 0;
    const remaining = Math.max(0, 12 - elapsedMonths);
    return Math.round(avg * remaining);
  }, [monthlyData, year, now]);

  const targetRevenue = setting?.targetRevenue || 0;
  const targetProfit = setting?.targetProfit || 0;
  const revenueIndicator = getIndicatorColor(stats.revenue, targetRevenue) as any;
  const profitIndicator = getIndicatorColor(stats.profit, targetProfit) as any;
  const marginIndicator =
    stats.margin >= 25 ? "green" : stats.margin >= 10 ? "yellow" : "red";

  // ===== Handlers =====
  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }
  function openEdit(t: Transaction) {
    setEditing(t);
    setForm({
      type: t.type,
      amount: String(t.amount),
      description: t.description || "",
      category: t.category || "Lainnya",
      date: new Date(t.date).toISOString().slice(0, 10),
      clientId: t.clientId || "",
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
        category: form.category,
        date: form.date,
        clientId: form.clientId || null,
      };
      if (editing) {
        await api(`/api/finance/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Transaksi diperbarui");
      } else {
        await api("/api/finance", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Transaksi ditambahkan");
      }
      setFormOpen(false);
      fetchTransactions();
    } catch (e: any) {
      toast.error("Gagal menyimpan: " + (e?.message || ""));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await api(`/api/finance/${deleteId}`, { method: "DELETE" });
      toast.success("Transaksi dihapus");
      setDeleteId(null);
      fetchTransactions();
    } catch (e: any) {
      toast.error("Gagal menghapus: " + (e?.message || ""));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveSetting(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        targetRevenue: Number(settingForm.targetRevenue || 0),
        targetProfit: Number(settingForm.targetProfit || 0),
        month: Number(settingForm.month),
        year: Number(settingForm.year),
      };
      await api("/api/finance/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      toast.success("Target disimpan");
      setSettingOpen(false);
      fetchSetting();
    } catch (e: any) {
      toast.error("Gagal menyimpan target: " + (e?.message || ""));
    } finally {
      setSubmitting(false);
    }
  }

  function handleExportExcel() {
    if (transactions.length === 0) {
      toast.error("Tidak ada transaksi untuk diekspor");
      return;
    }
    const rows = transactions.map((t, i) => ({
      No: i + 1,
      Tanggal: formatDate(t.date),
      Tipe: t.type,
      Jumlah: t.amount,
      Kategori: t.category || "-",
      Deskripsi: t.description || "-",
      Klien: t.client?.namaKlien || "-",
      DiinputOleh: t.user?.name || "-",
    }));
    exportToExcel(rows, `Keuangan_${year}_${month === "all" ? "Semua" : MONTH_NAMES[Number(month) - 1]}`);
    toast.success("Excel diekspor");
  }

  function handleExportPDF() {
    if (transactions.length === 0) {
      toast.error("Tidak ada transaksi untuk diekspor");
      return;
    }
    const periodLabel =
      month === "all" ? `Tahun ${year}` : `${MONTH_FULL[Number(month) - 1]} ${year}`;
    exportReportPDF(
      `Laporan Keuangan - ${periodLabel}`,
      [
        {
          heading: "Ringkasan Keuangan",
          columns: ["Metrik", "Nilai"],
          rows: [
            ["Total Pemasukan", formatCurrency(stats.revenue)],
            ["Total Pengeluaran", formatCurrency(stats.expense)],
            ["Laba Bersih", formatCurrency(stats.profit)],
            ["Margin", `${stats.margin.toFixed(1)}%`],
            ["Target Revenue", formatCurrency(targetRevenue)],
            ["Target Profit", formatCurrency(targetProfit)],
            ["Piutang", formatCurrency(stats.piutang)],
            ["Hutang", formatCurrency(stats.hutang)],
            ["Forecast Sisa Tahun", formatCurrency(forecast)],
          ],
        },
        {
          heading: "Grafik Bulanan (Revenue / Expense / Profit)",
          columns: ["Bulan", "Revenue", "Expense", "Profit"],
          rows: monthlyData.map((m) => [
            m.month,
            formatCurrency(m.revenue),
            formatCurrency(m.expense),
            formatCurrency(m.profit),
          ]),
        },
        {
          heading: "Pengeluaran per Kategori",
          columns: ["Kategori", "Jumlah"],
          rows:
            expenseByCategory.length > 0
              ? expenseByCategory.map((c) => [c.name, formatCurrency(c.value)])
              : [["-", "-"]],
        },
        {
          heading: "Daftar Transaksi",
          columns: ["Tanggal", "Tipe", "Jumlah", "Kategori", "Deskripsi", "Klien", "Oleh"],
          rows: transactions.map((t) => [
            formatDate(t.date),
            t.type,
            formatCurrency(t.amount),
            t.category || "-",
            t.description || "-",
            t.client?.namaKlien || "-",
            t.user?.name || "-",
          ]),
        },
      ],
      `Laporan_Keuangan_${year}_${month === "all" ? "Semua" : MONTH_NAMES[Number(month) - 1]}`
    );
    toast.success("PDF diekspor");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Keuangan"
        description="Kelola transaksi pemasukan & pengeluaran, target, serta laporan keuangan perusahaan."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingOpen(true)}>
              <Settings className="w-4 h-4" /> Target & Setting
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Tambah Transaksi
            </Button>
          </div>
        }
      />

      {/* Period Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays className="w-4 h-4" /> Periode:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {MONTH_FULL.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pemasukan"
          value={formatCurrency(stats.revenue)}
          icon={TrendingUp}
          indicator={revenueIndicator}
          subtitle={`Target: ${formatCurrency(targetRevenue)}`}
          progress={targetRevenue > 0 ? Math.min(100, Math.round((stats.revenue / targetRevenue) * 100)) : undefined}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Pengeluaran"
          value={formatCurrency(stats.expense)}
          icon={TrendingDown}
          indicator="neutral"
          subtitle={`${transactions.filter((t) => t.type === "PENGELUARAN").length} transaksi`}
          accent="bg-rose-50 text-rose-600"
        />
        <StatCard
          title="Laba Bersih"
          value={formatCurrency(stats.profit)}
          icon={Wallet}
          indicator={profitIndicator}
          subtitle={`Target: ${formatCurrency(targetProfit)}`}
          progress={targetProfit > 0 ? Math.min(100, Math.round((stats.profit / targetProfit) * 100)) : undefined}
          accent="bg-sky-50 text-sky-600"
        />
        <StatCard
          title="Margin"
          value={`${stats.margin.toFixed(1)}%`}
          icon={BarChart3}
          indicator={marginIndicator as any}
          subtitle={stats.margin >= 0 ? "Profit positif" : "Defisit"}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Stat Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Target Revenue"
          value={formatCurrency(targetRevenue)}
          icon={Target}
          subtitle={`${MONTH_FULL[(Number(settingForm.month) || 1) - 1]} ${settingForm.year}`}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Target Profit"
          value={formatCurrency(targetProfit)}
          icon={PiggyBank}
          subtitle="Target laba bulan ini"
          accent="bg-sky-50 text-sky-600"
        />
        <StatCard
          title="Cash Flow"
          value={formatCurrency(stats.profit)}
          icon={Banknote}
          indicator={stats.profit >= 0 ? "green" : "red"}
          subtitle={stats.profit >= 0 ? "Arus kas positif" : "Arus kas negatif"}
          accent="bg-cyan-50 text-cyan-600"
        />
        <StatCard
          title="Forecast Sisa Tahun"
          value={formatCurrency(forecast)}
          icon={DollarSign}
          subtitle="Proyeksi laba sisa bulan"
          accent="bg-violet-50 text-violet-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BarChartCard
            title="Revenue vs Expense vs Profit (Bulanan)"
            data={monthlyData}
            keys={[
              { key: "revenue", label: "Revenue", color: "#2563eb" },
              { key: "expense", label: "Expense", color: "#e11d48" },
              { key: "profit", label: "Profit", color: "#0d9488" },
            ]}
            formatY={formatY}
            height={280}
          />
        </div>
        <PieChartCard
          title="Pengeluaran per Kategori"
          data={expenseByCategory.length > 0 ? expenseByCategory : [{ name: "Belum ada data", value: 1 }]}
          height={280}
        />
      </div>

      <AreaChartCard
        title="Tren Revenue"
        data={monthlyData}
        keys={[{ key: "revenue", label: "Revenue", color: "#2563eb" }]}
        formatY={formatY}
        height={240}
      />

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Daftar Transaksi</h3>
              <p className="text-sm text-slate-500">
                {transactions.length} transaksi pada periode ini
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              {month === "all" ? `Tahun ${year}` : `${MONTH_FULL[Number(month) - 1]} ${year}`}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState onAdd={openAdd} />
          ) : (
            <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 custom-scroll">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50 z-10">
                  <TableRow>
                    <TableHead className="w-28">Tanggal</TableHead>
                    <TableHead className="w-28">Tipe</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="w-36">Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="w-36">Klien</TableHead>
                    <TableHead className="w-32">Diinput Oleh</TableHead>
                    <TableHead className="w-24 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm text-slate-700 whitespace-nowrap">
                        {formatDate(t.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            t.type === "PEMASUKAN"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }
                        >
                          {t.type === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={
                          "text-right font-semibold whitespace-nowrap " +
                          (t.type === "PEMASUKAN" ? "text-blue-600" : "text-rose-600")
                        }
                      >
                        {t.type === "PEMASUKAN" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[t.category || "Lainnya"] || "#475569",
                            }}
                          />
                          {t.category || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                        {t.description || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 truncate">
                        {t.client?.namaKlien || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {t.user?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-rose-50"
                            onClick={() => setDeleteId(t.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui data transaksi keuangan."
                : "Isi detail transaksi pemasukan atau pengeluaran."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type">Tipe</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as TxnType })}
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="any"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client">Klien (opsional)</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm({ ...form, clientId: v === "none" ? "" : v })}
              >
                <SelectTrigger id="client" className="w-full">
                  <SelectValue placeholder="Pilih klien (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">- Tanpa Klien -</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.namaKlien}
                      {c.instansi ? ` (${c.instansi})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Catatan transaksi..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Simpan Perubahan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Setting Dialog */}
      <Dialog open={settingOpen} onOpenChange={setSettingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Target & Setting</DialogTitle>
            <DialogDescription>
              Atur target revenue dan profit bulanan sebagai KPI keuangan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSetting} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-month">Bulan</Label>
                <Select
                  value={settingForm.month}
                  onValueChange={(v) => setSettingForm({ ...settingForm, month: v })}
                >
                  <SelectTrigger id="s-month" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_FULL.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-year">Tahun</Label>
                <Select
                  value={settingForm.year}
                  onValueChange={(v) => setSettingForm({ ...settingForm, year: v })}
                >
                  <SelectTrigger id="s-year" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2023, 2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-revenue">Target Revenue (Rp)</Label>
              <Input
                id="s-revenue"
                type="number"
                min="0"
                step="any"
                value={settingForm.targetRevenue}
                onChange={(e) =>
                  setSettingForm({ ...settingForm, targetRevenue: e.target.value })
                }
                placeholder="500000000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-profit">Target Profit (Rp)</Label>
              <Input
                id="s-profit"
                type="number"
                min="0"
                step="any"
                value={settingForm.targetProfit}
                onChange={(e) =>
                  setSettingForm({ ...settingForm, targetProfit: e.target.value })
                }
                placeholder="150000000"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan Target
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Transaksi akan dihapus permanen dari catatan keuangan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
        <Wallet className="w-8 h-8 text-blue-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-700">Belum ada transaksi</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        Belum ada transaksi pada periode ini. Tambahkan transaksi pertama untuk mulai mencatat keuangan.
      </p>
      <Button size="sm" className="mt-4" onClick={onAdd}>
        <Plus className="w-4 h-4" /> Tambah Transaksi
      </Button>
    </div>
  );
}
