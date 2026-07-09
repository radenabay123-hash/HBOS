"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { generateNeracaPDF, generateLabaRugiPDF, generateBuktiPotongPDF, generateSSPPDF, COMPANY_INFO } from "@/lib/spt-pdf";
import { generateLabaRugiSesuaiFormat, formatRupiahID } from "@/lib/laba-rugi-pdf";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Wallet, TrendingUp, TrendingDown, Clock, AlertCircle, FileText, RefreshCw,
  Download, CheckCircle2, DollarSign, Settings, Zap, Bot, Send, Receipt,
  Banknote, PiggyBank, Landmark, Smartphone, Tag, Plus, Edit3, Trash2,
  Building2, Package, Calendar, Calculator, Sparkles, ArrowUpRight, ArrowDownRight,
  AlertTriangle, QrCode, MapPin, User, Wrench, BarChart3, PieChart, FileSpreadsheet, ChevronRight, Printer, Camera,
  Search, CheckSquare, X,
} from "lucide-react";
import { BarChartCard, LineChartCard, PieChartCard, AreaChartCard, ChartCard } from "@/components/shared/charts";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, formatCurrency, formatNumber, formatDate } from "@/lib/constants";
import { exportToExcel, exportToPDF, exportReportPDF } from "@/lib/export-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { Pagination } from "@/components/shared/pagination";
import { SelectCheckbox } from "@/components/shared/filter-bar";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function FinanceModule({ user, initialView }: { user: SafeUser; initialView?: string }) {
  const [view, setView] = useState(initialView && initialView !== "menu" ? initialView : "menu");
  const [year, setYear] = useState(2026); // default to current year
  const [month, setMonth] = useState(0); // 0 = Semua Bulan (show all months by default)

  const menus = [
    { key: "dashboard", label: "Dashboard Keuangan", desc: "Ringkasan saldo, laba, grafik & AI insight", icon: Zap, color: "blue" },
    { key: "aruskas", label: "Arus Kas", desc: "Input uang masuk & keluar, transfer antar akun", icon: Banknote, color: "cyan" },
    { key: "kategori", label: "Kategori", desc: "Kelola kategori pemasukan & pengeluaran", icon: Tag, color: "violet" },
    { key: "neraca", label: "Neraca", desc: "Laporan posisi keuangan otomatis (Aset, Hutang, Modal)", icon: BarChart3, color: "green" },
    { key: "inventaris", label: "Inventaris Aset", desc: "Daftar aset perusahaan & penyusutan otomatis", icon: Package, color: "amber" },
    { key: "pajak", label: "Pajak", desc: "Perhitungan pajak, kalender, AI Tax Consultant", icon: Receipt, color: "rose" },
    { key: "kalkulator", label: "Kalkulator Pajak", desc: "Hitung PPh 21/23/Badan/PPN dengan PTKP", icon: Calculator, color: "indigo" },
    { key: "laporan", label: "Laporan & SPT", desc: "Laporan keuangan + dokumen SPT Badan (PDF)", icon: FileText, color: "blue" },
    { key: "spt", label: "Dokumen SPT Badan", desc: "Neraca, Laba Rugi, Bukti Potong, SSP (PDF kop surat)", icon: FileSpreadsheet, color: "indigo" },
    { key: "taxconfig", label: "Pengaturan Pajak", desc: "Ubah tarif pajak sesuai regulasi terbaru", icon: Settings, color: "slate" },
    { key: "ai", label: "AI Finance Assistant", desc: "Tanya jawab keuangan dengan AI", icon: Bot, color: "violet" },
  ];

  function renderView() {
    switch (view) {
      case "dashboard": return <FinanceDashboard year={year} month={month} />;
      case "aruskas": return <ArusKas year={year} month={month} />;
      case "kategori": return <KategoriModule />;
      case "neraca": return <NeracaModule year={year} month={month} />;
      case "inventaris": return <InventarisModule />;
      case "pajak": return <PajakModule year={year} month={month} />;
      case "kalkulator": return <KalkulatorPajakModule />;
      case "laporan": return <LaporanModule year={year} month={month} />;
      case "spt": return <SptBadanModule year={year} month={month} />;
      case "taxconfig": return <TaxConfigModule />;
      case "ai": return <AIAssistantModule />;
      default: return null;
    }
  }

  const activeMenu = menus.find((m) => m.key === view);

  // ===== MENU VIEW (dashboard cards) =====
  if (view === "menu") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" /> Sistem Keuangan
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manajemen keuangan terpadu PT. Hafara Aqiba Nusantara</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((m) => {
            const colorMap: Record<string, string> = {
              blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
              cyan: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100",
              violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
              green: "bg-green-50 text-green-600 group-hover:bg-green-100",
              amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
              rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
              indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
              slate: "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
            };
            return (
              <button
                key={m.key}
                onClick={() => setView(m.key)}
                className="group text-left bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors", colorMap[m.color])}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-1">
                      {m.label}
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all ml-auto" />
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== MODULE VIEW (with back button) =====
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setView("menu")} className="bg-white">
            <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Menu
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {activeMenu && <activeMenu.icon className="w-5 h-5 text-blue-600" />}
              {activeMenu?.label}
            </h1>
            <p className="text-xs text-slate-500">{activeMenu?.desc}</p>
          </div>
        </div>
        {(view === "dashboard" || view === "aruskas" || view === "neraca" || view === "laporan" || view === "pajak" || view === "spt") && (
          <div className="flex gap-2">
            <select
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Bulan</option>
              {monthNames.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
            <select
              value={String(year)}
              onChange={(e) => {
                const newYear = Number(e.target.value);
                setYear(newYear);
                if (newYear === 0) setMonth(0); // Reset month to "Semua Bulan" when "Semua Tahun" selected
              }}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Tahun</option>
              {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        )}
      </div>
      {renderView()}
    </div>
  );
}

// ============================================================
// DASHBOARD FINANCE
// ============================================================
function FinanceDashboard({ year, month }: { year: number; month: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
     
    setLoading(true);
    try {
      const d = await api(`/api/finance/dashboard?year=${year}&month=${month}`);
      setData(d);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <Loading />;

  return (
    <div className="space-y-5">
      {/* AI Insight */}
      <AIInsightCard year={year} month={month} />

      {/* Saldo cards */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Saldo</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FinanceCard icon={PiggyBank} label="Total Saldo" value={formatCurrency(data.totalSaldo)} accent="blue" />
          <FinanceCard icon={Wallet} label="Kas" value={formatCurrency(data.kasSaldo)} accent="green" />
          <FinanceCard icon={Landmark} label="Bank" value={formatCurrency(data.bankSaldo)} accent="violet" />
          <FinanceCard icon={Smartphone} label="Dompet Digital" value={formatCurrency(data.ewalletSaldo)} accent="cyan" />
        </div>
      </div>

      {/* Bulan ini cards */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          {year === 0 ? "Semua Tahun (Akumulasi)" : month === 0 ? `Tahun ${year}` : `Bulan ${monthNames[month - 1]} ${year}`}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FinanceCard icon={ArrowUpRight} label="Pendapatan" value={formatCurrency(data.monthPemasukan)} accent="green" />
          <FinanceCard icon={ArrowDownRight} label="Pengeluaran" value={formatCurrency(data.monthPengeluaran)} accent="rose" />
          <FinanceCard icon={DollarSign} label="Laba Bersih" value={formatCurrency(data.monthLaba)} accent={data.monthLaba >= 0 ? "blue" : "rose"} />
          <FinanceCard icon={Receipt} label="Pajak Terutang" value={formatCurrency(data.taxDue)} accent="amber" />
        </div>
      </div>

      {/* Piutang & Hutang */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FinanceCard icon={TrendingUp} label="Piutang (Klien Belum Bayar)" value={formatCurrency(data.totalPiutang)} accent="cyan" full />
        <FinanceCard icon={TrendingDown} label="Hutang (Belum Bayar Vendor)" value={formatCurrency(data.totalHutang)} accent="amber" full />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartCard title="Cash Flow Bulanan" data={data.monthlyData} keys={[
          { key: "pemasukan", label: "Pemasukan", color: "#2563eb" },
          { key: "pengeluaran", label: "Pengeluaran", color: "#f43f5e" },
          { key: "laba", label: "Laba", color: "#0891b2" },
        ]} formatY={(v) => `${(v / 1000000).toFixed(0)}M`} />
        <LineChartCard title="Tren Laba" data={data.monthlyData} keys={[{ key: "laba", label: "Laba", color: "#2563eb" }]} formatY={(v) => `${(v / 1000000).toFixed(0)}M`} />
      </div>

      {/* Expense & Income pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieChartCard title="Pengeluaran per Kategori" data={Object.entries(data.expenseByCat).map(([name, value]: any) => ({ name, value }))} />
        <PieChartCard title="Pendapatan per Kategori" data={Object.entries(data.incomeByCat).map(([name, value]: any) => ({ name, value }))} />
      </div>

      {/* Forecast */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-600" /> Forecast (Prediksi)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-slate-500">Estimasi Kas Akhir Bulan</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(data.forecast.cashFlow)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-slate-500">Estimasi Laba</p>
              <p className="text-lg font-bold text-cyan-700">{formatCurrency(data.forecast.profit)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-slate-500">Estimasi Pajak (PPh Badan)</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(data.forecast.tax)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReminderCard title="Reminder Pajak" items={data.reminders.upcomingTax.map((t: any) => ({ label: `${t.taxType} ${t.masaPajak}`, date: t.dueDate, amount: t.taxDue }))} icon={Receipt} accent="amber" />
        <ReminderCard title="Reminder Piutang" items={data.reminders.upcomingPiutang.map((t: any) => ({ label: t.description || "Piutang", date: t.dueDate, amount: t.amount }))} icon={TrendingUp} accent="cyan" />
        <ReminderCard title="Reminder Hutang" items={data.reminders.upcomingHutang.map((t: any) => ({ label: t.description || "Hutang", date: t.dueDate, amount: t.amount }))} icon={TrendingDown} accent="rose" />
      </div>
    </div>
  );
}

// ============================================================
// AI INSIGHT CARD
// ============================================================
function AIInsightCard({ year, month }: { year: number; month: number }) {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
     
    Promise.resolve().then(() => setLoading(true));
    api<{ insight: string }>(`/api/finance/ai-insight?year=${year}&month=${month}`)
      .then((d) => { if (active) setInsight(d.insight); })
      .catch(() => { if (active) setInsight("Gagal memuat insight."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year, month]);

  return (
    <Card className="border-blue-200 shadow-sm">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 rounded-t-lg flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">AI Insight Hari Ini</h3>
          <p className="text-blue-100 text-xs">Analisis otomatis kondisi keuangan</p>
        </div>
      </div>
      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> AI sedang menganalisis data...
          </div>
        ) : (
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{insight}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// ARUS KAS
// ============================================================
function ArusKas({ year, month }: { year: number; month: number }) {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; txn: any }>({ open: false, txn: null });
  const [filterType, setFilterType] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [ppnActive, setPpnActive] = useState(true);
  const [form, setForm] = useState({
    type: "PEMASUKAN", amount: "", description: "", category: "", accountType: "BANK", accountName: "",
    date: new Date().toISOString().slice(0, 10), vendorName: "", isPaid: true, dueDate: "", attachmentUrl: "",
    kontakName: "", projectName: "", trainerName: "", invoiceNumber: "", receiptNumber: "",
    isTaxable: false, taxType: "", taxAmount: "", taxIncluded: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year > 0) params.set("year", String(year));
      if (year > 0 && month > 0) params.set("month", String(month));
      const [d, cats, cls, taxCfg] = await Promise.all([
        api(`/api/finance${params.toString() ? "?" + params.toString() : ""}`),
        api("/api/finance/categories"),
        api("/api/clients").catch(() => ({ clients: [] })),
        api("/api/finance/tax-config").catch(() => ({ configs: [] })),
      ]);
      setTxns(d.transactions || []);
      setCategories(cats.categories || []);
      setClients(cls.clients || []);
      // Check PPN active status
      const ppnCfg = (taxCfg.configs || []).find((c: any) => c.taxType === "PPN");
      setPpnActive(ppnCfg ? ppnCfg.isActive : true);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.amount) { toast.error("Nominal wajib diisi"); return; }
    try {
      if (dialog.txn) {
        await api(`/api/finance/${dialog.txn.id}`, { method: "PUT", body: JSON.stringify(form) });
        toast.success("Transaksi diperbarui");
      } else {
        await api("/api/finance", { method: "POST", body: JSON.stringify(form) });
        toast.success("Transaksi ditambahkan");
      }
      setDialog({ open: false, txn: null });
      setForm({
        type: "PEMASUKAN", amount: "", description: "", category: "", accountType: "BANK", accountName: "",
        date: new Date().toISOString().slice(0, 10), vendorName: "", isPaid: true, dueDate: "", attachmentUrl: "",
        kontakName: "", projectName: "", trainerName: "", invoiceNumber: "", receiptNumber: "",
        isTaxable: false, taxType: "", taxAmount: "", taxIncluded: false,
      });
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    try { await api(`/api/finance/${id}`, { method: "DELETE" }); toast.success("Dihapus"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  function handleExportExcel() {
    exportToExcel(txns.map((t) => ({
      Tanggal: formatDate(t.date), Tipe: t.type, Jumlah: t.amount,
      Kategori: t.category || "-", Akun: t.accountType, Deskripsi: t.description || "-",
      Vendor: t.vendorName || "-", Status: t.isPaid ? "Lunas" : "Belum Bayar",
    })), `Arus-Kas-${month}-${year}`, "Arus Kas");
    toast.success("Excel diunduh");
  }

  // Client-side search + existing type/account filter
  const filtered = useMemo(() => {
    let r = txns.filter((t) => (filterType === "all" || t.type === filterType) && (filterAccount === "all" || t.accountType === filterAccount));
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter((t) =>
        (t.description || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        (t.vendorName || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [txns, filterType, filterAccount, search]);
  const totalIn = filtered.filter((t) => t.type === "PEMASUKAN" && t.isPaid).reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.type === "PENGELUARAN" && t.isPaid).reduce((s, t) => s + t.amount, 0);

  // Pagination (max 15 per page)
  const {
    paginatedItems, goToPage, nextPage, prevPage, pageInfo, resetPage,
  } = usePagination(filtered, { pageSize: 15 });

  // Bulk selection
  const {
    selectedArray, selectedCount, isSelected, toggle, toggleAll,
    clearSelection, resetSelection, isAllSelected,
  } = useBulkSelect<any>({ getId: (t) => t.id as string });

  // Reset selection + page when client-side filters change
  useEffect(() => {
    resetSelection();
    resetPage();
  }, [search, filterType, filterAccount, resetSelection, resetPage]);

  async function handleBulkDelete() {
    if (!confirm(`Hapus ${selectedCount} transaksi terpilih?`)) return;
    let success = 0;
    let failed = 0;
    for (const id of selectedArray) {
      try {
        await api(`/api/finance/${id}`, { method: "DELETE" });
        success++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    setBulkMode(false);
    await load();
    if (failed === 0) {
      toast.success(`${success} transaksi berhasil dihapus`);
    } else {
      toast.error(`${success} dihapus, ${failed} gagal`);
    }
  }

  // Filter categories by transaction type
  const formCategories = categories.filter((c) => c.type === (form.type === "PEMASUKAN" ? "PEMASUKAN" : "PENGELUARAN"));

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <FinanceCard icon={ArrowUpRight} label="Total Uang Masuk" value={formatCurrency(totalIn)} accent="green" />
        <FinanceCard icon={ArrowDownRight} label="Total Uang Keluar" value={formatCurrency(totalOut)} accent="rose" />
        <FinanceCard icon={PiggyBank} label="Selisih" value={formatCurrency(totalIn - totalOut)} accent="blue" />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-9 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="PEMASUKAN">Uang Masuk</SelectItem>
            <SelectItem value="PENGELUARAN">Uang Keluar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-[140px] h-9 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Akun</SelectItem>
            <SelectItem value="KAS">Kas</SelectItem>
            <SelectItem value="BANK">Bank</SelectItem>
            <SelectItem value="EWALLET">Dompet Digital</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => window.open(`/api/finance/export-pdf?year=${year}&month=${month}`, "_blank")} className="bg-white"><Download className="w-4 h-4 mr-1" /> PDF</Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="bg-white"><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</Button>
        <Button
          variant={bulkMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setBulkMode(!bulkMode);
            if (bulkMode) clearSelection();
          }}
          className={cn("h-9 text-xs", bulkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white")}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          {bulkMode ? "Selesai Pilih" : "Pilih Beberapa"}
        </Button>
        <Button size="sm" onClick={() => { setForm({ ...form, type: "PEMASUKAN" }); setDialog({ open: true, txn: null }); }} className="bg-blue-600 hover:bg-blue-700 ml-auto">
          <Plus className="w-4 h-4 mr-1" /> Input Uang Masuk
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setForm({ ...form, type: "PENGELUARAN" }); setDialog({ open: true, txn: null }); }} className="bg-white">
          <Plus className="w-4 h-4 mr-1" /> Uang Keluar
        </Button>
      </div>

      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari deskripsi, kategori, atau vendor..."
            className="pl-9 h-9 bg-white text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {bulkMode && selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          actions={[
            {
              label: "Hapus Terpilih",
              icon: Trash2,
              onClick: handleBulkDelete,
              variant: "destructive",
              confirmText: `Hapus ${selectedCount} transaksi terpilih? Tindakan ini tidak dapat dibatalkan.`,
            },
          ]}
          onClearSelection={clearSelection}
        />
      )}

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {txns.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">Belum ada transaksi</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Tidak ada transaksi yang cocok</p>
              <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci atau filter</p>
            </div>
          ) : (
            <>
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b text-left text-xs text-slate-500">
                    {bulkMode && (
                      <th className="py-3 px-3 w-10">
                        <SelectCheckbox
                          checked={isAllSelected(paginatedItems)}
                          onChange={() => toggleAll(paginatedItems)}
                        />
                      </th>
                    )}
                    <th className="py-3 px-4 font-medium">Tanggal</th>
                    <th className="py-3 px-3 font-medium">Tipe</th>
                    <th className="py-3 px-3 font-medium">Deskripsi</th>
                    <th className="py-3 px-3 font-medium">Kategori</th>
                    <th className="py-3 px-3 font-medium">Akun</th>
                    <th className="py-3 px-3 font-medium text-right">Jumlah</th>
                    {!bulkMode && <th className="py-3 px-3 font-medium text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                      {bulkMode && (
                        <td className="py-2.5 px-3">
                          <SelectCheckbox
                            checked={isSelected(t)}
                            onChange={() => toggle(t)}
                          />
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-slate-600 text-xs">{formatDate(t.date)}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className={cn("text-[10px]", t.type === "PEMASUKAN" ? "bg-green-50 text-green-700 border-green-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
                          {t.type === "PEMASUKAN" ? "Masuk" : "Keluar"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 text-xs max-w-[200px] truncate">{t.description || t.vendorName || "-"}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">{t.category || "-"}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">{t.accountType}</td>
                      <td className={cn("py-2.5 px-3 text-right font-semibold text-xs", t.type === "PEMASUKAN" ? "text-green-600" : "text-rose-600")}>
                        {t.type === "PEMASUKAN" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                      {!bulkMode && (
                        <td className="py-2.5 px-3">
                          <div className="flex gap-0.5 justify-center">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setForm({ type: t.type, amount: String(t.amount), description: t.description || "", category: t.category || "", accountType: t.accountType, accountName: t.accountName || "", date: new Date(t.date).toISOString().slice(0, 10), vendorName: t.vendorName || "", isPaid: t.isPaid, dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "", attachmentUrl: t.attachmentUrl || "" }); setDialog({ open: true, txn: t }); }}><Edit3 className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500" onClick={() => handleDelete(t.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={pageInfo.currentPage}
              totalPages={pageInfo.totalPages}
              totalItems={pageInfo.totalItems}
              startIndex={pageInfo.startIndex}
              endIndex={pageInfo.endIndex}
              hasNext={pageInfo.hasNext}
              hasPrev={pageInfo.hasPrev}
              onPageChange={goToPage}
              onNext={nextPage}
              onPrev={prevPage}
            />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, txn: dialog.txn })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaksi Baru</DialogTitle>
            <DialogDescription>Isi data uang masuk atau uang keluar</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {/* Tipe Transaksi - card selection */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">TIPE TRANSAKSI</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "PEMASUKAN" })}
                  className={cn("flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    form.type === "PEMASUKAN" ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-green-300")}
                >
                  <ArrowDownRight className={cn("w-5 h-5", form.type === "PEMASUKAN" ? "text-green-600" : "text-slate-400")} />
                  <span className={cn("text-sm font-medium", form.type === "PEMASUKAN" ? "text-green-700" : "text-slate-600")}>Uang Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "PENGELUARAN" })}
                  className={cn("flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    form.type === "PENGELUARAN" ? "border-rose-500 bg-rose-50" : "border-slate-200 hover:border-rose-300")}
                >
                  <ArrowUpRight className={cn("w-5 h-5", form.type === "PENGELUARAN" ? "text-rose-600" : "text-slate-400")} />
                  <span className={cn("text-sm font-medium", form.type === "PENGELUARAN" ? "text-rose-700" : "text-slate-600")}>Uang Keluar</span>
                </button>
              </div>
            </div>

            {/* Nominal + OCR */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Nominal (Rp)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="bg-white text-right font-medium" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">OCR Bukti</Label>
                <Button variant="outline" className="w-full bg-white" type="button">
                  <Camera className="w-4 h-4 mr-1.5" /> Scan Foto
                </Button>
              </div>
            </div>

            {/* Tanggal + Akun */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Tanggal</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Akun</Label>
                <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KAS">Kas</SelectItem>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="EWALLET">Dompet Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Deskripsi</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mis: Honor Training Leadership PT X" className="bg-white" />
            </div>

            {/* Kategori + Kontak */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {formCategories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Kontak <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <Select value={form.kontakName} onValueChange={(v) => setForm({ ...form, kontakName: v })}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Tanpa kontak" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.namaKlien}>{c.namaKlien}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pajak */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Pajak <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <Select value={form.taxType} onValueChange={(v) => setForm({ ...form, taxType: v, isTaxable: !!v })}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Tanpa Pajak" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PPH21">PPh 21</SelectItem>
                    <SelectItem value="PPH23">PPh 23</SelectItem>
                    <SelectItem value="PPH_BADAN">PPh Badan</SelectItem>
                    {ppnActive && <SelectItem value="PPN">PPN</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <input type="checkbox" id="taxIncluded" checked={form.taxIncluded} onChange={(e) => setForm({ ...form, taxIncluded: e.target.checked })} className="rounded" />
                <Label htmlFor="taxIncluded" className="text-xs text-slate-600 cursor-pointer">Termasuk dalam nominal</Label>
              </div>
            </div>

            {/* Proyek + Trainer */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Proyek <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <Input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="Mis: TRN-001" className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Trainer/Konsultan <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <Input value={form.trainerName} onChange={(e) => setForm({ ...form, trainerName: e.target.value })} placeholder="Nama trainer" className="bg-white" />
              </div>
            </div>

            {/* No Invoice + No Kwitansi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">No. Invoice <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="Mis: INV/2026/001" className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">No. Kwitansi <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <Input value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} placeholder="Mis: KWT/2026/001" className="bg-white" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, txn: null })}>Batal</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Simpan Transaksi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// KATEGORI
// ============================================================
function KategoriModule() {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; cat: any }>({ open: false, cat: null });
  const [form, setForm] = useState({ name: "", type: "PEMASUKAN", icon: "Tag", color: "blue" });

  const load = useCallback(async () => {
     
    setLoading(true);
    try { const d = await api("/api/finance/categories"); setCats(d.categories || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.name) { toast.error("Nama wajib diisi"); return; }
    try {
      if (dialog.cat) {
        await api(`/api/finance/categories/${dialog.cat.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/api/finance/categories", { method: "POST", body: JSON.stringify(form) });
      }
      toast.success("Kategori disimpan"); setDialog({ open: false, cat: null }); setForm({ name: "", type: "PEMASUKAN", icon: "Tag", color: "blue" }); load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus kategori?")) return;
    try { await api(`/api/finance/categories/${id}`, { method: "DELETE" }); toast.success("Dihapus"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Loading />;
  const pemasukan = cats.filter((c) => c.type === "PEMASUKAN");
  const pengeluaran = cats.filter((c) => c.type === "PENGELUARAN");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setForm({ name: "", type: "PEMASUKAN", icon: "Tag", color: "blue" }); setDialog({ open: true, cat: null }); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" /> Tambah Kategori
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-green-600" /> Kategori Pemasukan</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {pemasukan.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full", `bg-${c.color}-500`)} /><span className="text-sm">{c.name}</span></div>
                  <div className="flex gap-0.5">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setForm({ name: c.name, type: c.type, icon: c.icon || "Tag", color: c.color || "blue" }); setDialog({ open: true, cat: c }); }}><Edit3 className="w-3 h-3" /></Button>
                    {!c.isDefault && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500" onClick={() => handleDelete(c.id)}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ArrowDownRight className="w-4 h-4 text-rose-600" /> Kategori Pengeluaran</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {pengeluaran.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full", `bg-${c.color}-500`)} /><span className="text-sm">{c.name}</span></div>
                  <div className="flex gap-0.5">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setForm({ name: c.name, type: c.type, icon: c.icon || "Tag", color: c.color || "blue" }); setDialog({ open: true, cat: c }); }}><Edit3 className="w-3 h-3" /></Button>
                    {!c.isDefault && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500" onClick={() => handleDelete(c.id)}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, cat: dialog.cat })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.cat ? "Edit" : "Tambah"} Kategori</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Nama Kategori</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tipe</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PEMASUKAN">Pemasukan</SelectItem><SelectItem value="PENGELUARAN">Pengeluaran</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog({ open: false, cat: null })}>Batal</Button><Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// NERACA
// ============================================================
function NeracaModule({ year, month }: { year: number; month: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
     
    Promise.resolve().then(() => setLoading(true));
    api(`/api/finance/neraca?year=${year}&month=${month}`)
      .then((d) => { if (active) setData(d.neraca); })
      .catch((e) => { if (active) toast.error(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year, month]);

  if (loading || !data) return <Loading />;

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <Bot className="w-5 h-5 text-blue-600" />
          <p className="text-sm text-slate-600">Neraca dibuat <strong>otomatis</strong> dari seluruh transaksi. Tidak perlu input manual jurnal.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ASET */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 bg-green-50/50"><CardTitle className="text-sm flex items-center gap-2 text-green-700"><PiggyBank className="w-4 h-4" /> ASET</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm pt-3">
            <NeracaRow label="Kas" value={data.aset.kas} />
            <NeracaRow label="Bank" value={data.aset.bank} />
            <NeracaRow label="Dompet Digital" value={data.aset.ewallet} />
            <NeracaRow label="Piutang" value={data.aset.piutang} />
            <Separator className="my-1" />
            <NeracaRow label="Total Aset Lancar" value={data.aset.totalAsetLancar} bold />
            <NeracaRow label="Inventaris (nilai buku)" value={data.aset.inventaris} />
            <NeracaRow label="Akum. Penyusutan" value={-data.aset.akumulasiPenyusutan} />
            <NeracaRow label="Total Aset Tetap" value={data.aset.totalAsetTetap} />
            <Separator className="my-1" />
            <NeracaRow label="TOTAL ASET" value={data.aset.totalAset} bold highlight />
          </CardContent>
        </Card>

        {/* KEWAJIBAN */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 bg-amber-50/50"><CardTitle className="text-sm flex items-center gap-2 text-amber-700"><TrendingDown className="w-4 h-4" /> KEWAJIBAN</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm pt-3">
            <NeracaRow label="Hutang" value={data.kewajiban.hutang} />
            <NeracaRow label="Pajak Terutang" value={data.kewajiban.pajakTerutang} />
            <Separator className="my-1" />
            <NeracaRow label="TOTAL KEWAJIBAN" value={data.kewajiban.totalKewajiban} bold highlight />
          </CardContent>
        </Card>

        {/* MODAL */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 bg-blue-50/50"><CardTitle className="text-sm flex items-center gap-2 text-blue-700"><DollarSign className="w-4 h-4" /> MODAL</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm pt-3">
            <NeracaRow label="Laba Ditahan" value={data.modal.labaDitahan} />
            <Separator className="my-1" />
            <NeracaRow label="TOTAL MODAL" value={data.modal.totalModal} bold highlight />
          </CardContent>
        </Card>
      </div>

      <Card className={cn("border-2", data.balanced ? "border-green-300 bg-green-50/50" : "border-amber-300 bg-amber-50/50")}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {data.balanced ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
            <span className="text-sm font-medium">Total Aset = Kewajiban + Modal</span>
          </div>
          <span className="font-bold">{formatCurrency(data.totalEkuitas)}</span>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// INVENTARIS
// ============================================================
function InventarisModule() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [form, setForm] = useState({ name: "", category: "LAPTOP", location: "", pic: "", purchaseDate: new Date().toISOString().slice(0, 10), purchasePrice: "", usefulLife: "5", notes: "" });

  const load = useCallback(async () => {
     
    setLoading(true);
    try { const d = await api("/api/finance/inventory"); setItems(d.inventory || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    try {
      if (dialog.item) {
        await api(`/api/finance/inventory/${dialog.item.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/api/finance/inventory", { method: "POST", body: JSON.stringify(form) });
      }
      toast.success("Aset disimpan"); setDialog({ open: false, item: null }); load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus aset?")) return;
    try { await api(`/api/finance/inventory/${id}`, { method: "DELETE" }); toast.success("Dihapus"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <Loading />;

  const totalValue = items.reduce((s, i) => s + i.currentValue, 0);
  const totalCost = items.reduce((s, i) => s + i.purchasePrice, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <FinanceCard icon={Package} label="Total Aset" value={String(items.length)} accent="blue" />
        <FinanceCard icon={DollarSign} label="Nilai Buku" value={formatCurrency(totalValue)} accent="green" />
        <FinanceCard icon={TrendingDown} label="Harga Beli" value={formatCurrency(totalCost)} accent="violet" />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialog({ open: true, item: null })} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Tambah Aset</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600" /></div>
                <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
              </div>
              <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
              <div className="space-y-1 mt-2 text-xs text-slate-500">
                <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location || "-"}</p>
                <p className="flex items-center gap-1"><User className="w-3 h-3" /> {item.pic || "-"}</p>
                <p className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(item.purchaseDate)}</p>
              </div>
              <Separator className="my-2" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-slate-400">Harga Beli</p><p className="font-semibold text-slate-700">{formatCurrency(item.purchasePrice)}</p></div>
                <div><p className="text-slate-400">Nilai Buku</p><p className="font-semibold text-green-600">{formatCurrency(item.currentValue)}</p></div>
                <div><p className="text-slate-400">Penyusutan</p><p className="font-semibold text-rose-600">{formatCurrency(item.accumulatedDepreciation)}</p></div>
                <div><p className="text-slate-400">Umur</p><p className="font-semibold text-slate-700">{item.usefulLife} thn</p></div>
              </div>
              <div className="flex gap-1 mt-2">
                <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => { setForm({ name: item.name, category: item.category, location: item.location || "", pic: item.pic || "", purchaseDate: new Date(item.purchaseDate).toISOString().slice(0, 10), purchasePrice: String(item.purchasePrice), usefulLife: String(item.usefulLife), notes: item.notes || "" }); setDialog({ open: true, item }); }}><Edit3 className="w-3 h-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-rose-500" onClick={() => handleDelete(item.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, item: dialog.item })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.item ? "Edit" : "Tambah"} Aset</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5 col-span-2"><Label className="text-xs">Nama Aset</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Kategori</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent>{["LAPTOP", "KAMERA", "PRINTER", "MOBIL", "MOTOR", "MEJA", "KURSI", "PROYEKTOR", "MONITOR", "LAINNYA"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Lokasi</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">PIC</Label><Input value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tanggal Beli</Label><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Harga Beli (Rp)</Label><Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Umur Ekonomis (tahun)</Label><Input type="number" value={form.usefulLife} onChange={(e) => setForm({ ...form, usefulLife: e.target.value })} className="bg-white" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog({ open: false, item: null })}>Batal</Button><Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// PAJAK
// ============================================================
function PajakModule({ year, month }: { year: number; month: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taxChat, setTaxChat] = useState<{ open: boolean }>({ open: false });
  const [ppnActive, setPpnActive] = useState(true);

  const load = useCallback(async () => {
     
    setLoading(true);
    try {
      const [d, taxCfg] = await Promise.all([
        api(`/api/finance/tax?year=${year}`),
        api("/api/finance/tax-config").catch(() => ({ configs: [] })),
      ]);
      setData(d);
      const ppnCfg = (taxCfg.configs || []).find((c: any) => c.taxType === "PPN");
      setPpnActive(ppnCfg ? ppnCfg.isActive : true);
    }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [year]);
  useEffect(() => { load(); }, [load]);

  async function handleStatus(id: string, status: string) {
    try { await api(`/api/finance/tax/${id}`, { method: "PUT", body: JSON.stringify({ status }) }); toast.success("Status diperbarui"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  if (loading || !data) return <Loading />;

  const STATUS_LABELS: any = { TERUTANG: "Terutang", DIBAYAR: "Dibayar", DILAPORKAN: "Dilaporkan" };
  const STATUS_COLORS: any = { TERUTANG: "bg-rose-100 text-rose-700 border-rose-200", DIBAYAR: "bg-green-100 text-green-700 border-green-200", DILAPORKAN: "bg-amber-100 text-amber-700 border-amber-200" };

  return (
    <div className="space-y-4">
      {/* AI Tax Consultant button */}
      <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><Bot className="w-5 h-5 text-violet-600" /></div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">AI Tax Consultant</p>
              <p className="text-xs text-slate-500">Tanya pajak dengan bahasa sederhana</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setTaxChat({ open: true })} className="bg-violet-600 hover:bg-violet-700"><Bot className="w-4 h-4 mr-1" /> Tanya AI</Button>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FinanceCard icon={AlertTriangle} label="Pajak Terutang" value={formatCurrency(data.summary.totalTerutang)} accent="rose" />
        <FinanceCard icon={CheckCircle2} label="Sudah Dibayar" value={formatCurrency(data.summary.totalDibayar)} accent="green" />
        <FinanceCard icon={FileText} label="Dilaporkan" value={formatCurrency(data.summary.totalDilaporkan)} accent="amber" />
        <FinanceCard icon={Receipt} label="Total Transaksi" value={String(data.summary.count)} accent="blue" />
      </div>

      {/* Tax Calendar / Upcoming */}
      {data.upcoming.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-600" /> Pajak Jatuh Tempo</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.upcoming.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.taxType} - {p.masaPajak}</p>
                    <p className="text-xs text-slate-500">Jatuh tempo: {formatDate(p.dueDate)}</p>
                  </div>
                  <span className="font-bold text-amber-700">{formatCurrency(p.taxDue - p.taxPaid)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Daftar Pajak</CardTitle>
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/finance/tax/export-pdf?year=${year}`, "_blank")} className="bg-white text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="py-3 px-4 font-medium">Jenis</th>
                  <th className="py-3 px-3 font-medium">Masa Pajak</th>
                  <th className="py-3 px-3 font-medium text-right">Dasar Pajak</th>
                  <th className="py-3 px-3 font-medium text-right">Pajak Terutang</th>
                  <th className="py-3 px-3 font-medium">Jatuh Tempo</th>
                  <th className="py-3 px-3 font-medium text-center">Status</th>
                  <th className="py-3 px-3 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                    <td className="py-2.5 px-4"><Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">{p.taxType}</Badge></td>
                    <td className="py-2.5 px-3 text-slate-600 text-xs">{p.masaPajak}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 text-xs">{formatCurrency(p.taxableAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 text-xs">{formatCurrency(p.taxDue)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">{formatDate(p.dueDate)}</td>
                    <td className="py-2.5 px-3 text-center"><Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[p.status])}>{STATUS_LABELS[p.status]}</Badge></td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-0.5 justify-center">
                        {p.status === "TERUTANG" && <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => handleStatus(p.id, "DIBAYAR")}>Bayar</Button>}
                        {p.status === "DIBAYAR" && <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600" onClick={() => handleStatus(p.id, "DILAPORKAN")}>Lapor</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tax types info */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calculator className="w-4 h-4 text-blue-600" /> Jenis Pajak yang Didukung</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="font-semibold text-slate-900">PPh 21 - Pajak Karyawan</p>
              <p className="text-xs text-slate-500 mt-1">Tarif progresif 5%-35%. PTKP TK/0=54jt/thn. Untuk gaji karyawan.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="font-semibold text-slate-900">PPh 23 - Pajak Jasa</p>
              <p className="text-xs text-slate-500 mt-1">Tarif 2% atas jasa profesional/consulting. Dipotong oleh pemberi kerja.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="font-semibold text-slate-900">PPh Badan</p>
              <p className="text-xs text-slate-500 mt-1">Tarif 22% dari laba perusahaan (UU HPP 2022).</p>
            </div>
            <div className={cn("p-3 rounded-lg border", ppnActive ? "bg-slate-50 border-slate-100" : "bg-slate-50/50 border-slate-100 opacity-50")}>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">PPN</p>
                {!ppnActive && <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-500 border-slate-200">Nonaktif</Badge>}
              </div>
              <p className="text-xs text-slate-500 mt-1">Tarif 11% (UU HPP 2022). Pajak pertambahan nilai atas penjualan.{!ppnActive && " (Dinonaktifkan — tidak berlaku di sistem)"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {taxChat.open && <AIChatDialog title="AI Tax Consultant" apiEndpoint="/api/finance/ai-tax" open={taxChat.open} onOpenChange={(o) => setTaxChat({ open: o })} />}
    </div>
  );
}

// ============================================================
// LAPORAN
// ============================================================
function LaporanModule({ year, month }: { year: number; month: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState("BULANAN");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => setLoading(true));
    const params = new URLSearchParams({ year: String(year), month: String(month), periodType });
    if (periodType === "CUSTOM" && customStart && customEnd) {
      params.set("customStart", customStart);
      params.set("customEnd", customEnd);
    }
    api(`/api/finance/laporan?${params}`)
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) toast.error(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year, month, periodType, customStart, customEnd]);

  if (loading || !data) return <Loading />;

  const lr = data.labaRugi;

  function handleExportLabaRugiPDF() {
    const doc = generateLabaRugiSesuaiFormat({
      periodeLabel: lr.periodeLabel,
      pendapatanItems: lr.pendapatanItems,
      totalPendapatan: lr.totalPendapatan,
      biayaItems: lr.biayaItems,
      totalBiaya: lr.totalBiaya,
      labaSebelumPajak: lr.labaSebelumPajak,
      pajakPenghasilan: lr.pajakPenghasilan,
      pphBadanRate: lr.pphBadanRate,
      pajakNote: lr.pajakNote,
      labaBersih: lr.labaBersih,
    });
    doc.save(`Laporan-Laba-Rugi-${lr.periodeLabel.replace(/\s/g, "-")}.pdf`);
    toast.success("Laporan Laba Rugi PDF diunduh");
  }

  function handleExportLabaRugiExcel() {
    const rows = [
      ...lr.pendapatanItems.map((p: any) => ({ Kategori: "Pendapatan", "Akun": p.akun, "Jumlah": p.jumlah })),
      { Kategori: "Total Pendapatan", Akun: "", Jumlah: lr.totalPendapatan },
      ...lr.biayaItems.map((b: any) => ({ Kategori: "Biaya", "Akun": b.akun, "Jumlah": -b.jumlah })),
      { Kategori: "Total Biaya", Akun: "", Jumlah: -lr.totalBiaya },
      { Kategori: "Laba Sebelum Pajak", Akun: "", Jumlah: lr.labaSebelumPajak },
      { Kategori: `Pajak PPh Badan (${lr.pphBadanRate}%)`, Akun: "", Jumlah: -lr.pajakPenghasilan },
      { Kategori: "LABA BERSIH", Akun: "", Jumlah: lr.labaBersih },
    ];
    exportToExcel(rows, `Laba-Rugi-${lr.periodeLabel.replace(/\s/g, "-")}`, "Laba Rugi");
    toast.success("Excel diunduh");
  }

  function handleExportNeraca() {
    const n = data.neraca;
    exportReportPDF(`Neraca - ${monthNames[month - 1]} ${year}`, [
      { heading: "Aset Lancar", columns: ["Item", "Jumlah"], rows: [["Kas", formatRupiahID(n.aset.kas)], ["Bank", formatRupiahID(n.aset.bank)], ["Dompet Digital", formatRupiahID(n.aset.ewallet)], ["Piutang", formatRupiahID(n.aset.piutang)], ["Total Aset Lancar", formatRupiahID(n.aset.totalAsetLancar)]] },
      { heading: "Aset Tetap", columns: ["Item", "Jumlah"], rows: [["Inventaris", formatRupiahID(n.aset.inventaris)], ["Akum. Penyusutan", formatRupiahID(-n.aset.akumulasiPenyusutan)], ["Total Aset Tetap", formatRupiahID(n.aset.totalAsetTetap)], ["TOTAL ASET", formatRupiahID(n.aset.totalAset)]] },
      { heading: "Kewajiban & Modal", columns: ["Item", "Jumlah"], rows: [["Hutang", formatRupiahID(n.kewajiban.hutang)], ["Pajak Terutang", formatRupiahID(n.kewajiban.pajakTerutang)], ["Total Kewajiban", formatRupiahID(n.kewajiban.totalKewajiban)], ["Laba Ditahan", formatRupiahID(n.modal.labaDitahan)], ["Total Modal", formatRupiahID(n.modal.totalModal)]] },
    ], `Neraca-${month}-${year}`);
    toast.success("PDF diunduh");
  }

  return (
    <div className="space-y-4">
      {/* Period Filter */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 mr-1">Periode:</span>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger className="w-[140px] h-9 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BULANAN">Bulanan</SelectItem>
                <SelectItem value="TRIWULAN">Triwulan</SelectItem>
                <SelectItem value="SEMESTER">Semester</SelectItem>
                <SelectItem value="TAHUNAN">Tahunan</SelectItem>
                <SelectItem value="CUSTOM">Custom Periode</SelectItem>
              </SelectContent>
            </Select>
            {periodType === "CUSTOM" && (
              <>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-[150px] h-9 bg-white" />
                <span className="text-slate-400 text-sm">s/d</span>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-[150px] h-9 bg-white" />
              </>
            )}
            {periodType !== "CUSTOM" && (
              <Select value={String(month)} onValueChange={() => {}}>
                <SelectTrigger className="w-[130px] h-9 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={String(year)} onValueChange={() => {}}>
              <SelectTrigger className="w-[90px] h-9 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{[2026, 2025, 2024].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Laba Rugi Report */}
      <Card className="shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 rounded-t-lg flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">LAPORAN LABA RUGI</h3>
            <p className="text-blue-100 text-xs">Periode: {lr.periodeLabel}</p>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" onClick={handleExportLabaRugiPDF} className="bg-white text-blue-700 hover:bg-blue-50">
              <Download className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={handleExportLabaRugiExcel} className="bg-white text-green-700 hover:bg-green-50">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
            </Button>
            <Button size="sm" variant="secondary" onClick={() => window.print()} className="bg-white text-slate-700 hover:bg-slate-50">
              <Printer className="w-3.5 h-3.5 mr-1" /> Print
            </Button>
          </div>
        </div>
        <CardContent className="p-6">
          {/* PENDAPATAN USAHA */}
          <div className="mb-1">
            <p className="font-bold text-blue-700 text-sm mb-2">PENDAPATAN USAHA</p>
            <div className="space-y-1 pl-4">
              {lr.pendapatanItems.map((item: any, i: number) => (
                <LRRow key={i} label={item.akun} value={item.jumlah} />
              ))}
            </div>
            <div className="border-t border-slate-300 mt-2 pt-1">
              <LRRow label="TOTAL PENDAPATAN USAHA" value={lr.totalPendapatan} bold />
            </div>
            <div className="border-t-2 border-slate-400 mt-1" />
          </div>

          {/* BIAYA OPERASIONAL */}
          <div className="mt-4 mb-1">
            <p className="font-bold text-rose-700 text-sm mb-2">BIAYA OPERASIONAL</p>
            <div className="space-y-1 pl-4">
              {lr.biayaItems.map((item: any, i: number) => (
                <LRRow key={i} label={item.akun} value={-item.jumlah} />
              ))}
            </div>
            <div className="border-t border-slate-300 mt-2 pt-1">
              <LRRow label="TOTAL BIAYA OPERASIONAL" value={-lr.totalBiaya} bold />
            </div>
            <div className="border-t-2 border-slate-400 mt-1" />
          </div>

          {/* LABA SEBELUM PAJAK */}
          <div className="mt-4">
            <div className="border-t border-slate-300 pt-2">
              <LRRow label="LABA SEBELUM PAJAK" value={lr.labaSebelumPajak} bold />
            </div>
            <div className="border-t border-slate-300 mt-1" />
            <div className="pt-2">
              <LRRow label={`Pajak Penghasilan Badan (${lr.pphBadanRate}%)`} value={-lr.pajakPenghasilan} bold />
            </div>
            <p className="text-[10px] text-slate-400 italic mt-1 pl-4">* {lr.pajakNote}</p>
          </div>

          {/* LABA BERSIH */}
          <div className="mt-4 border-t-2 border-slate-400 pt-3">
            <div className={cn("rounded-lg p-3 flex justify-between items-center", lr.labaBersih >= 0 ? "bg-blue-50" : "bg-rose-50")}>
              <span className="font-bold text-slate-900 text-base">LABA BERSIH</span>
              <span className={cn("font-bold text-xl", lr.labaBersih >= 0 ? "text-blue-700" : "text-rose-700")}>{formatRupiahID(lr.labaBersih)}</span>
            </div>
            <div className="border-t-2 border-slate-400 mt-3" />
          </div>
        </CardContent>
      </Card>

      {/* Other reports */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={handleExportNeraca}>
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-2"><BarChart3 className="w-6 h-6 text-blue-600" /></div>
            <p className="text-sm font-medium text-slate-900">Neraca</p>
            <p className="text-xs text-slate-400 mt-0.5">Export PDF</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LRRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className={cn("text-slate-600", bold ? "font-bold text-slate-900" : "")}>{label}</span>
      <span className={cn(bold ? "font-bold" : "font-medium", value < 0 ? "text-rose-600" : "text-slate-800")}>{formatRupiahID(value)}</span>
    </div>
  );
}

// ============================================================
// AI ASSISTANT
// ============================================================
function AIAssistantModule() {
  return <AIChatDialog title="AI Finance Assistant" apiEndpoint="/api/finance/ai-assistant" open={true} onOpenChange={() => {}} embedded />;
}

// ============================================================
// KALKULATOR PAJAK
// ============================================================
function KalkulatorPajakModule() {
  const [taxTypes, setTaxTypes] = useState<any[]>([]);
  const [ptkpOptions, setPtkpOptions] = useState<any[]>([]);
  const [form, setForm] = useState({ taxType: "PPH21", amount: "", ptkpStatus: "TK0", isMonthly: true });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [ppnActive, setPpnActive] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ taxTypes: any[]; ptkpOptions: any[] }>("/api/finance/tax-calculator"),
      api("/api/finance/tax-config").catch(() => ({ configs: [] })),
    ]).then(([d, taxCfg]) => {
      // Filter out PPN if inactive
      const ppnCfg = (taxCfg.configs || []).find((c: any) => c.taxType === "PPN");
      const ppnIsActive = ppnCfg ? ppnCfg.isActive : true;
      setPpnActive(ppnIsActive);
      setTaxTypes((d.taxTypes || []).filter((t: any) => t.type !== "PPN" || ppnIsActive));
      setPtkpOptions(d.ptkpOptions || []);
      setDataLoaded(true);
    }).catch((e) => toast.error(e.message));
  }, []);

  async function handleCalculate() {
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Masukkan nominal yang valid"); return; }
    setLoading(true);
    try {
      const d = await api<{ result: any }>("/api/finance/tax-calculator", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setResult(d.result);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  if (!dataLoaded) return <Loading />;

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <strong>Perhatian:</strong> Seluruh tarif & rumus pajak disimpan dalam tabel konfigurasi dan dapat diperbarui tanpa mengubah source code. Pastikan tarif sesuai dengan peraturan perpajakan terbaru. Konsultasi dengan konsultan pajak untuk kasus kompleks.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input form */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kalkulator Pajak</CardTitle>
            <p className="text-xs text-slate-500">Pilih jenis pajak & masukkan data</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Jenis Pajak</Label>
              <Select value={form.taxType} onValueChange={(v) => setForm({ ...form, taxType: v })}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {taxTypes.map((t) => <SelectItem key={t.type} value={t.type}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">
                {form.taxType === "PPH21" ? "Gaji Bruto Bulanan (Rp)" : form.taxType === "PPH_BADAN" ? "Laba Sebelum Pajak (Rp)" : form.taxType === "PPN" ? "Dasar Pengenaan Pajak (Rp)" : "Jumlah Bruto (Rp)"}
              </Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="bg-white text-right font-medium text-lg" />
            </div>

            {form.taxType === "PPH21" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Status PTKP</Label>
                  <Select value={form.ptkpStatus} onValueChange={(v) => setForm({ ...form, ptkpStatus: v })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ptkpOptions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isMonthly" checked={form.isMonthly} onChange={(e) => setForm({ ...form, isMonthly: e.target.checked })} className="rounded" />
                  <Label htmlFor="isMonthly" className="text-xs text-slate-600 cursor-pointer">Input adalah gaji bulanan (bukan tahunan)</Label>
                </div>
              </>
            )}

            <Button onClick={handleCalculate} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 h-11">
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
              {loading ? "Menghitung..." : "Hitung Pajak"}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hasil Perhitungan</CardTitle>
            <p className="text-xs text-slate-500">Detail perhitungan pajak</p>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calculator className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">Masukkan data & klik "Hitung Pajak"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Tax type badge */}
                <div className="flex items-center justify-between pb-2 border-b">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">{result.taxType}</Badge>
                  <span className="text-xs text-slate-500">{result.configName}</span>
                </div>

                {/* PPh 21 result */}
                {result.taxType === "PPH21" && (
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">PTKP ({result.ptkpStatus})</span><span className="font-medium">{formatCurrency(result.ptkpAnnual)}/thn</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Gaji Bruto/Tahun</span><span className="font-medium">{formatCurrency(result.brutoAnnual)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Penghasilan Kena Pajak</span><span className="font-medium text-blue-600">{formatCurrency(result.pkpAnnual)}</span></div>
                    </div>
                    {/* Bracket details */}
                    {result.bracketDetails && result.bracketDetails.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Rincian Tarif Progresif</p>
                        {result.bracketDetails.map((b: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs bg-slate-50 rounded p-1.5">
                            <span className="text-slate-600">{b.range} ({b.rate})</span>
                            <span className="font-medium text-slate-700">{formatCurrency(b.tax)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-rose-50 rounded-lg p-3 text-center border border-rose-100">
                        <p className="text-[10px] text-rose-600 uppercase">Pajak/Bulan</p>
                        <p className="text-lg font-bold text-rose-700">{formatCurrency(result.taxMonthly)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                        <p className="text-[10px] text-green-600 uppercase">Take Home Pay/Bulan</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(result.takeHomePayMonthly)}</p>
                      </div>
                    </div>
                    <div className="bg-blue-600 text-white rounded-lg p-3 flex justify-between items-center">
                      <span className="text-sm font-medium">Pajak/Tahun</span>
                      <span className="text-xl font-bold">{formatCurrency(result.taxAnnual)}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Effective rate: {result.effectiveRate}</p>
                  </div>
                )}

                {/* PPh 23 result */}
                {result.taxType === "PPH23" && (
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Bruto</span><span className="font-medium">{formatCurrency(result.bruto)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tarif PPh 23</span><span className="font-medium">{result.rate}%</span></div>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-3 text-center border border-rose-100">
                      <p className="text-[10px] text-rose-600 uppercase">PPh 23 Dipotong</p>
                      <p className="text-2xl font-bold text-rose-700">{formatCurrency(result.tax)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                      <p className="text-[10px] text-green-600 uppercase">Diterima (Net)</p>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(result.netReceived)}</p>
                    </div>
                    <p className="text-xs text-slate-500 italic">{result.description}</p>
                  </div>
                )}

                {/* PPh Badan result */}
                {result.taxType === "PPH_BADAN" && (
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Laba Komersial</span><span className="font-medium">{formatCurrency(result.labaKomersial)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tarif PPh Badan</span><span className="font-medium">{result.rate}%</span></div>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-3 text-center border border-rose-100">
                      <p className="text-[10px] text-rose-600 uppercase">Pajak Terutang</p>
                      <p className="text-2xl font-bold text-rose-700">{formatCurrency(result.pajakTerutang)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                      <p className="text-[10px] text-green-600 uppercase">Laba Bersih</p>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(result.labaBersih)}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                      <p className="text-[10px] text-amber-700">{result.note}</p>
                    </div>
                  </div>
                )}

                {/* PPN result */}
                {result.taxType === "PPN" && (
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">DPP (Dasar Pengenaan)</span><span className="font-medium">{formatCurrency(result.dpp)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tarif PPN</span><span className="font-medium">{result.rate}%</span></div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                      <p className="text-[10px] text-amber-600 uppercase">PPN (11%)</p>
                      <p className="text-2xl font-bold text-amber-700">{formatCurrency(result.ppn)}</p>
                    </div>
                    <div className="bg-blue-600 text-white rounded-lg p-3 text-center">
                      <p className="text-[10px] text-blue-100 uppercase">Total dengan PPN</p>
                      <p className="text-2xl font-bold">{formatCurrency(result.totalWithPPN)}</p>
                    </div>
                    <p className="text-xs text-slate-500 italic">{result.description}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// DOKUMEN SPT BADAN (PDF with company letterhead)
// ============================================================
function SptBadanModule({ year, month }: { year: number; month: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taxPayments, setTaxPayments] = useState<any[]>([]);
  const [buktiDialog, setBuktiDialog] = useState(false);
  const [sspDialog, setSspDialog] = useState(false);
  const [ppnActive, setPpnActive] = useState(true);
  const [buktiForm, setBuktiForm] = useState({
    formNumber: "", taxType: "PPh 23", masaPajak: monthNames[month - 1], tahun: String(year),
    pemotongName: "", pemotongNpwp: "", wpName: COMPANY_INFO.name, wpNpwp: COMPANY_INFO.npwp, wpAddress: COMPANY_INFO.address,
    jenisPenghasilan: "Jasa Profesional/Consulting", jumlahBruto: "", tarif: 2, pphDipotong: "", tanggalPotong: new Date().toISOString().slice(0, 10),
  });
  const [sspForm, setSspForm] = useState({
    sspNumber: "", taxType: "PPh Badan", masaPajak: monthNames[month - 1], tahun: String(year),
    wpName: COMPANY_INFO.name, wpNpwp: COMPANY_INFO.npwp, wpAddress: COMPANY_INFO.address,
    jenisPajak: "PPh Badan", kodeAkun: "411250", kodeJenisSetoran: "100", jumlahSetoran: "", tanggalSetor: new Date().toISOString().slice(0, 10),
    bankPenerima: "Bank BSI", ntpn: "", status: "LUNAS",
  });

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => setLoading(true));
    Promise.all([
      api(`/api/finance/laporan?year=${year}&month=${month}`),
      api("/api/finance/tax-config").catch(() => ({ configs: [] })),
    ]).then(([d, taxCfg]) => {
      if (active) {
        setData(d);
        setTaxPayments(d.taxPayments || []);
        const ppnCfg = (taxCfg.configs || []).find((c: any) => c.taxType === "PPN");
        setPpnActive(ppnCfg ? ppnCfg.isActive : true);
      }
    }).catch((e) => { if (active) toast.error(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year, month]);

  if (loading || !data) return <Loading />;

  function handleDownloadNeraca() {
    const n = data.neraca;
    const doc = generateNeracaPDF({
      asOf: `${monthNames[month - 1]} ${year}`,
      aset: n.aset, kewajiban: n.kewajiban, modal: n.modal, totalEkuitas: n.totalEkuitas,
    });
    doc.save(`Laporan-Neraca-SPT-${month}-${year}.pdf`);
    toast.success("Laporan Neraca PDF diunduh");
  }

  function handleDownloadLabaRugi() {
    const lr = data.labaRugi;
    const doc = generateLabaRugiPDF({
      periode: lr.periodeLabel || `${monthNames[month - 1]} ${year}`,
      pendapatanItems: lr.pendapatanItems,
      totalPendapatan: lr.totalPendapatan,
      biayaItems: lr.biayaItems,
      totalBiaya: lr.totalBiaya,
      labaSebelumPajak: lr.labaSebelumPajak,
      pajakEstimasi: lr.pajakPenghasilan || lr.pajakEstimasi || 0,
      pajakPenghasilan: lr.pajakPenghasilan,
      pphBadanRate: lr.pphBadanRate || 22,
      pajakNote: lr.pajakNote,
      labaBersih: lr.labaBersih,
    });
    doc.save(`Laporan-Laba-Rugi-SPT-${month}-${year}.pdf`);
    toast.success("Laporan Laba Rugi PDF diunduh");
  }

  function handleDownloadBuktiPotong() {
    const f = buktiForm;
    const doc = generateBuktiPotongPDF({
      formNumber: f.formNumber || `BPP-${Date.now().toString().slice(-6)}`,
      taxType: f.taxType, masaPajak: f.masaPajak, tahun: f.tahun,
      pemotongName: f.pemotongName, pemotongNpwp: f.pemotongNpwp,
      wpName: f.wpName, wpNpwp: f.wpNpwp, wpAddress: f.wpAddress,
      jenisPenghasilan: f.jenisPenghasilan,
      jumlahBruto: Number(f.jumlahBruto) || 0,
      tarif: f.tarif,
      pphDipotong: Number(f.pphDipotong) || Math.round((Number(f.jumlahBruto) || 0) * f.tarif / 100),
      tanggalPotong: f.tanggalPotong,
    });
    doc.save(`Bukti-Potong-${f.taxType.replace(/\s/g, "")}-${f.tahun}.pdf`);
    toast.success("Bukti Potong PDF diunduh");
    setBuktiDialog(false);
  }

  function handleDownloadSSP() {
    const f = sspForm;
    const doc = generateSSPPDF({
      sspNumber: f.sspNumber || `SSP-${Date.now().toString().slice(-6)}`,
      taxType: f.taxType, masaPajak: f.masaPajak, tahun: f.tahun,
      wpName: f.wpName, wpNpwp: f.wpNpwp, wpAddress: f.wpAddress,
      jenisPajak: f.jenisPajak, kodeAkun: f.kodeAkun, kodeJenisSetoran: f.kodeJenisSetoran,
      jumlahSetoran: Number(f.jumlahSetoran) || 0,
      tanggalSetor: f.tanggalSetor, bankPenerima: f.bankPenerima, ntpn: f.ntpn || "-",
      status: f.status,
    });
    doc.save(`SSP-${f.taxType.replace(/\s/g, "")}-${f.tahun}.pdf`);
    toast.success("Surat Setoran Pajak (SSP) PDF diunduh");
    setSspDialog(false);
  }

  const docs = [
    {
      num: 1, title: "Laporan Neraca", desc: "Laporan posisi keuangan (Aset, Kewajiban, Modal) per periode",
      icon: BarChart3, color: "green",
      data: `Total Aset: ${formatCurrency(data.neraca.aset.totalAset)} | Total Kewajiban: ${formatCurrency(data.neraca.kewajiban.totalKewajiban)} | Total Modal: ${formatCurrency(data.neraca.modal.totalModal)}`,
      action: handleDownloadNeraca,
    },
    {
      num: 2, title: "Laporan Laba Rugi", desc: "Laporan pendapatan, biaya & laba bersih periode berjalan",
      icon: TrendingUp, color: "blue",
      data: `Pendapatan: ${formatCurrency(data.labaRugi.totalPendapatan)} | Biaya: ${formatCurrency(data.labaRugi.totalPengeluaran)} | Laba Bersih: ${formatCurrency(data.labaRugi.labaBersih)}`,
      action: handleDownloadLabaRugi,
    },
    {
      num: 3, title: "Bukti Potong PPh", desc: "Bukti pemotongan PPh 23/22/4(2) dari pihak lain (input manual)",
      icon: Receipt, color: "violet",
      data: "Form bukti potong dengan kop perusahaan - isi data pemotong & wajib pajak",
      action: () => setBuktiDialog(true),
    },
    {
      num: 4, title: "Surat Setoran Pajak (SSP)", desc: "Bukti pembayaran pajak - wajib jika SPT Kurang Bayar (PPh 29)",
      icon: FileSpreadsheet, color: "amber",
      data: "Form SSP dengan kop perusahaan - isi detail setoran & NTPN",
      action: () => setSspDialog(true),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4 flex items-start gap-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900 text-sm">Dokumen Pendukung SPT Badan - {year}</p>
            <p className="text-xs text-slate-600 mt-1">Unduh dokumen PDF dengan kop surat perusahaan (logo, nama, alamat, NPWP) untuk dilampirkan saat pelaporan SPT Tahunan PPh Badan.</p>
          </div>
        </CardContent>
      </Card>

      {/* Company letterhead preview */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-600" /> Kop Surat (Header Dokumen)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-600">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">HF</div>
              <div>
                <p className="font-bold text-lg text-blue-900">{COMPANY_INFO.name}</p>
                <p className="text-xs text-slate-600">{COMPANY_INFO.address}</p>
                <p className="text-xs text-slate-600">Telp: {COMPANY_INFO.phone} | Email: {COMPANY_INFO.email} | Web: {COMPANY_INFO.website}</p>
                <p className="text-xs text-slate-600">NPWP: {COMPANY_INFO.npwp}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((d) => {
          const colorMap: Record<string, string> = {
            green: "bg-green-50 text-green-600", blue: "bg-blue-50 text-blue-600",
            violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600",
          };
          return (
            <Card key={d.num} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", colorMap[d.color])}>
                    <d.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-slate-50">{d.num}</Badge>
                      <h3 className="font-semibold text-slate-900 text-sm">{d.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{d.desc}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 mb-3">
                  <p className="text-[11px] text-slate-600">{d.data}</p>
                </div>
                <Button onClick={d.action} className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                  <Download className="w-4 h-4 mr-1.5" /> Download PDF
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Existing tax payments as SSP reference */}
      {taxPayments.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Referensi Pajak Tercatat (untuk SSP)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {taxPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.taxType} - {p.masaPajak}</p>
                    <p className="text-[10px] text-slate-500">Jatuh tempo: {formatDate(p.dueDate)} | Status: {p.status}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{formatCurrency(p.taxDue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bukti Potong Dialog */}
      <Dialog open={buktiDialog} onOpenChange={setBuktiDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Form Bukti Potong PPh</DialogTitle>
            <DialogDescription>Isi data untuk generate PDF Bukti Potong dengan kop perusahaan</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5"><Label className="text-xs">Jenis PPh</Label><Select value={buktiForm.taxType} onValueChange={(v) => setBuktiForm({ ...buktiForm, taxType: v, tarif: v === "PPh 23" ? 2 : v === "PPh 22" ? 1.5 : 10 })}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PPh 23">PPh 23 - Jasa (2%)</SelectItem><SelectItem value="PPh 22">PPh 22 - Impor (1.5%)</SelectItem><SelectItem value="PPh 4(2)">PPh 4(2) - Bunga (10%)</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Masa Pajak</Label><Input value={buktiForm.masaPajak} onChange={(e) => setBuktiForm({ ...buktiForm, masaPajak: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5 col-span-2"><Label className="text-xs">Nama Pemotong (Pihak yang potong)</Label><Input value={buktiForm.pemotongName} onChange={(e) => setBuktiForm({ ...buktiForm, pemotongName: e.target.value })} placeholder="Mis. PT XYZ" className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">NPWP Pemotong</Label><Input value={buktiForm.pemotongNpwp} onChange={(e) => setBuktiForm({ ...buktiForm, pemotongNpwp: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tanggal Potong</Label><Input type="date" value={buktiForm.tanggalPotong} onChange={(e) => setBuktiForm({ ...buktiForm, tanggalPotong: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Jumlah Bruto (Rp)</Label><Input type="number" value={buktiForm.jumlahBruto} onChange={(e) => setBuktiForm({ ...buktiForm, jumlahBruto: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tarif ({buktiForm.tarif}%)</Label><Input type="number" value={buktiForm.tarif} onChange={(e) => setBuktiForm({ ...buktiForm, tarif: Number(e.target.value) })} className="bg-white" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuktiDialog(false)}>Batal</Button>
            <Button onClick={handleDownloadBuktiPotong} className="bg-blue-600 hover:bg-blue-700"><Download className="w-4 h-4 mr-1" /> Generate PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SSP Dialog */}
      <Dialog open={sspDialog} onOpenChange={setSspDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Form Surat Setoran Pajak (SSP)</DialogTitle>
            <DialogDescription>Isi data setoran pajak untuk generate PDF SSP dengan kop perusahaan</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5"><Label className="text-xs">Jenis Pajak</Label><Select value={sspForm.jenisPajak} onValueChange={(v) => setSspForm({ ...sspForm, jenisPajak: v })}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PPh Badan">PPh Badan</SelectItem><SelectItem value="PPh 21">PPh 21</SelectItem><SelectItem value="PPh 23">PPh 23</SelectItem>{ppnActive && <SelectItem value="PPN">PPN</SelectItem>}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Masa Pajak</Label><Input value={sspForm.masaPajak} onChange={(e) => setSspForm({ ...sspForm, masaPajak: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Kode Akun</Label><Input value={sspForm.kodeAkun} onChange={(e) => setSspForm({ ...sspForm, kodeAkun: e.target.value })} placeholder="Mis. 411250" className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Kode Jenis Setoran</Label><Input value={sspForm.kodeJenisSetoran} onChange={(e) => setSspForm({ ...sspForm, kodeJenisSetoran: e.target.value })} placeholder="Mis. 100" className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Jumlah Setoran (Rp)</Label><Input type="number" value={sspForm.jumlahSetoran} onChange={(e) => setSspForm({ ...sspForm, jumlahSetoran: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tanggal Setor</Label><Input type="date" value={sspForm.tanggalSetor} onChange={(e) => setSspForm({ ...sspForm, tanggalSetor: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bank Penerima</Label><Input value={sspForm.bankPenerima} onChange={(e) => setSspForm({ ...sspForm, bankPenerima: e.target.value })} className="bg-white" /></div>
            <div className="space-y-1.5"><Label className="text-xs">NTPN</Label><Input value={sspForm.ntpn} onChange={(e) => setSspForm({ ...sspForm, ntpn: e.target.value })} placeholder="No. Transaksi Penerimaan Negara" className="bg-white" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSspDialog(false)}>Batal</Button>
            <Button onClick={handleDownloadSSP} className="bg-blue-600 hover:bg-blue-700"><Download className="w-4 h-4 mr-1" /> Generate PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// PENGATURAN PAJAK (Tax Config - editable)
// ============================================================
function TaxConfigModule() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{ open: boolean; config: any }>({ open: false, config: null });
  const [form, setForm] = useState({ taxType: "", name: "", rate: 0, description: "", brackets: "", ptkp: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await api("/api/finance/tax-config"); setConfigs(d.configs || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await api("/api/finance/tax-config", { method: "PUT", body: JSON.stringify(form) });
      toast.success("Pengaturan pajak disimpan & terintegrasi ke semua sistem");
      setEditDialog({ open: false, config: null });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function togglePPN(active: boolean) {
    setSaving(true);
    try {
      const ppnConfig = configs.find((c) => c.taxType === "PPN");
      if (!ppnConfig) return;
      await api("/api/finance/tax-config", {
        method: "PUT",
        body: JSON.stringify({ taxType: "PPN", isActive: active }),
      });
      toast.success(active ? "PPN diaktifkan — sinkron ke semua sistem" : "PPN dinonaktifkan — semua sistem tidak menggunakan PPN");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Loading />;

  const taxTypeColors: Record<string, string> = {
    PPH21: "bg-blue-50 text-blue-700 border-blue-200",
    PPH23: "bg-cyan-50 text-cyan-700 border-cyan-200",
    PPH_BADAN: "bg-violet-50 text-violet-700 border-violet-200",
    PPN: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const taxTypeLabels: Record<string, string> = {
    PPH21: "PPh 21 — Pajak Karyawan",
    PPH23: "PPh 23 — Pajak Jasa",
    PPH_BADAN: "PPh Badan — Pajak Perusahaan",
    PPN: "PPN — Pajak Pertambahan Nilai",
  };

  const taxTypeIntegrations: Record<string, string[]> = {
    PPH21: ["Payroll & Gaji (PPh 21 karyawan)", "Kalkulator Pajak", "Slip Gaji PDF"],
    PPH23: ["Arus Kas (transaksi jasa)", "Kalkulator Pajak", "SPT Badan"],
    PPH_BADAN: ["Laporan Laba Rugi", "SPT Badan", "AI Tax Consultant", "Dashboard Finance"],
    PPN: ["Arus Kas (transaksi penjualan)", "Kalkulator Pajak", "Invoice"],
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900 text-sm">Pengaturan Pajak Terintegrasi</p>
            <p className="text-xs text-slate-600 mt-1">
              Atur sekali, berlaku untuk semua sistem. Perubahan tarif otomatis tersinkron ke: Payroll & Gaji, Kalkulator Pajak, SPT Badan, Laporan Laba Rugi, Invoice, dan AI Tax Consultant.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4 Tax Cards - exactly PPh 21, PPh 23, PPh Badan, PPN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((c) => (
          <Card key={c.id} className={cn("shadow-sm hover:shadow-md transition-shadow", c.taxType === "PPN" && !c.isActive && "opacity-60")}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px] font-semibold", taxTypeColors[c.taxType] || "bg-slate-50")}>{c.taxType}</Badge>
                  {c.isActive ? (
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500 border-slate-200">
                      Nonaktif
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-white"
                  onClick={() => {
                    setForm({ taxType: c.taxType, name: c.name, rate: c.rate, description: c.description || "", brackets: c.brackets || "", ptkp: c.ptkp || "" });
                    setEditDialog({ open: true, config: c });
                  }}
                >
                  <Edit3 className="w-3 h-3 mr-1" /> Edit
                </Button>
              </div>
              <p className="font-semibold text-slate-900 text-sm">{taxTypeLabels[c.taxType] || c.name}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold text-blue-700">{c.rate}%</p>
                {c.taxType === "PPH21" && <p className="text-xs text-slate-400">(progresif)</p>}
              </div>
              {c.description && <p className="text-xs text-slate-500 mt-1">{c.description}</p>}

              {/* Progressive brackets for PPh 21 */}
              {c.taxType === "PPH21" && c.brackets && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">Tarif Progresif (UU HPP)</p>
                  <div className="space-y-1">
                    {(() => {
                      try {
                        const b = JSON.parse(c.brackets);
                        return b.map((br: any, i: number) => (
                          <div key={i} className="flex justify-between text-[10px] text-slate-600">
                            <span>{formatCurrency(br.min)} - {br.max ? formatCurrency(br.max) : "tak terbatas"}</span>
                            <span className="font-semibold text-blue-600">{br.rate}%</span>
                          </div>
                        ));
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              )}

              {/* PTKP for PPh 21 */}
              {c.taxType === "PPH21" && c.ptkp && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">PTKP (Penghasilan Tidak Kena Pajak)</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {(() => {
                      try {
                        const p = JSON.parse(c.ptkp);
                        return Object.entries(p).map(([k, v]: any) => (
                          <div key={k} className="flex justify-between text-[10px] text-slate-600">
                            <span>{k}</span>
                            <span className="font-medium">{formatCurrency(v)}/th</span>
                          </div>
                        ));
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              )}

              {/* Integration info */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">Terintegrasi ke:</p>
                <div className="flex flex-wrap gap-1">
                  {(taxTypeIntegrations[c.taxType] || []).map((int, i) => (
                    <Badge key={i} variant="outline" className={cn("text-[9px]", c.isActive ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-slate-50 text-slate-300 border-slate-100 line-through")}>{int}</Badge>
                  ))}
                </div>
              </div>

              {/* PPN toggle (only for PPN) */}
              {c.taxType === "PPN" && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Aktifkan PPN</p>
                    <p className="text-[10px] text-slate-400">Jika nonaktif, PPN tidak muncul di Arus Kas, Kalkulator, Invoice, & SPT</p>
                  </div>
                  <Switch
                    checked={c.isActive}
                    onCheckedChange={(v) => togglePPN(v)}
                    disabled={saving}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => setEditDialog({ open: o, config: editDialog.config })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {taxTypeLabels[form.taxType] || "Tarif Pajak"}</DialogTitle>
            <DialogDescription>Ubah tarif sesuai regulasi terbaru. Perubahan otomatis berlaku ke semua sistem terkait.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {/* Tarif - only show for non-PPH21 (PPh 21 uses brackets) */}
            {form.taxType !== "PPH21" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tarif (%)</Label>
                <Input type="number" step="0.1" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} className="bg-white" />
                <p className="text-[10px] text-slate-400">
                  {form.taxType === "PPH23" && "Tarif PPh 23 atas jasa profesional (default: 2%)"}
                  {form.taxType === "PPH_BADAN" && "Tarif PPh Badan (UU HPP 2022: 22%)"}
                  {form.taxType === "PPN" && "Tarif PPN (UU HPP 2022: 11%)"}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deskripsi / Dasar Hukum</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="bg-white text-sm resize-none" />
            </div>

            {/* PPh 21: progressive brackets */}
            {form.taxType === "PPH21" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tarif Progresif (Bracket JSON)</Label>
                <Textarea value={form.brackets} onChange={(e) => setForm({ ...form, brackets: e.target.value })} rows={5} className="bg-white text-xs font-mono resize-none" placeholder='[{"min":0,"max":60000000,"rate":5}]' />
                <p className="text-[10px] text-slate-400">Format: array of {"{ min, max, rate }"}. max = null untuk tak terbatas.</p>
              </div>
            )}

            {/* PPh 21: PTKP */}
            {form.taxType === "PPH21" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">PTKP (JSON)</Label>
                <Textarea value={form.ptkp} onChange={(e) => setForm({ ...form, ptkp: e.target.value })} rows={4} className="bg-white text-xs font-mono resize-none" placeholder='{"TK0":54000000,"K0":58500000}' />
                <p className="text-[10px] text-slate-400">Format: object dengan key TK0-TK3, K0-K3 dan value PTKP tahunan.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, config: null })}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Menyimpan...</> : "Simpan & Terapkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// AI CHAT DIALOG (reusable)
// ============================================================
function AIChatDialog({ title, apiEndpoint, open, onOpenChange, embedded }: { title: string; apiEndpoint: string; open: boolean; onOpenChange: (o: boolean) => void; embedded?: boolean }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: `Halo! Saya ${title}. Ada yang bisa saya bantu seputar keuangan/pajak?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setInput("");
     
    setLoading(true);
    try {
      const d = await api<{ response: string }>(apiEndpoint, { method: "POST", body: JSON.stringify({ message: userMsg }) });
      setMessages((m) => [...m, { role: "assistant", content: d.response }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: "Maaf, terjadi kesalahan: " + e.message }]);
    } finally { setLoading(false); }
  }

  const chatContent = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "")}>
            {m.role === "assistant" && <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-blue-600" /></div>}
            <div className={cn("max-w-[80%] rounded-xl p-3 text-sm", m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700")}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Bot className="w-4 h-4 text-blue-600" /></div>
            <div className="bg-slate-100 rounded-xl p-3 text-sm text-slate-400 flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin" /> Mengetik...</div>
          </div>
        )}
      </div>
      <div className="border-t p-3 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Tulis pesan..." className="bg-white" />
        <Button onClick={send} disabled={loading} className="bg-blue-600 hover:bg-blue-700"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );

  if (embedded) {
    return <Card className="shadow-sm h-[600px] flex flex-col overflow-hidden">{chatContent}</Card>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base"><Bot className="w-5 h-5 text-violet-600" /> {title}</DialogTitle>
        </DialogHeader>
        {chatContent}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================
function Loading() {
  return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>;
}

function FinanceCard({ icon: Icon, label, value, accent, full }: { icon: any; label: string; value: string; accent: "blue" | "green" | "rose" | "violet" | "cyan" | "amber"; full?: boolean }) {
  const accentMap = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", rose: "bg-rose-50 text-rose-600", violet: "bg-violet-50 text-violet-600", cyan: "bg-cyan-50 text-cyan-600", amber: "bg-amber-50 text-amber-600" };
  return (
    <Card className={cn("shadow-sm", full && "md:col-span-2")}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accentMap[accent])}><Icon className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{label}</p>
          <p className="text-base font-bold text-slate-900 truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NeracaRow({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center py-0.5", highlight && "font-bold text-base", bold && "font-semibold")}>
      <span className={cn("text-slate-600", bold && "text-slate-900")}>{label}</span>
      <span className={cn(value < 0 ? "text-rose-600" : "text-slate-800", bold && "font-bold", highlight && "text-blue-700")}>{formatCurrency(Math.abs(value))}{value < 0 ? " (-)" : ""}</span>
    </div>
  );
}

function ReminderCard({ title, items, icon: Icon, accent }: { title: string; items: { label: string; date: string; amount: number }[]; icon: any; accent: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className={cn("w-4 h-4", `text-${accent}-600`)} /> {title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Tidak ada reminder</p> : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{item.label}</p>
                  <p className="text-[10px] text-slate-500">{formatDate(item.date)}</p>
                </div>
                <span className="text-xs font-bold text-slate-700 shrink-0">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
