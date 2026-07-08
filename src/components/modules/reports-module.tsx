"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  FileBarChart, FileDown, FileSpreadsheet, Loader2, DollarSign, TrendingUp,
  TrendingDown, Target, Users, FileText, Film, Activity, CheckCircle2,
  Clock, CalendarDays, Award, FileCheck, FileWarning,
} from "lucide-react";

import { api } from "@/lib/api-client";
import {
  ROLE_LABELS, ROLE_COLORS, formatCurrency, formatNumber, formatDate,
} from "@/lib/constants";
import { exportToExcel, exportReportPDF } from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import {
  BarChartCard, LineChartCard, PieChartCard,
} from "@/components/shared/charts";

// ============================ Types ============================

interface MonthlyData {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
  deals: number;
  contents: number;
  articles: number;
  events: number;
  leads: number;
}
interface YearlyData {
  year: string;
  revenue: number;
  expense: number;
  profit: number;
  deals: number;
  contents: number;
  articles: number;
}
interface DealClientWithDocs {
  id: string;
  namaKlien: string;
  instansi: string;
  budget: number;
  tanggalEvent: string;
  documents: { documentType: string; documentName: string; documentNumber: string; link: string }[];
  hasInvoice: boolean;
  hasSpk: boolean;
  hasSurat: boolean;
}
interface TeamProductivity {
  id: string;
  name: string;
  role: string;
  position?: string;
  tasksDone: number;
  tasksTotal: number;
  contents: number;
  articles: number;
  completionRate: number;
}

interface DashboardData {
  year: number;
  month: number;
  crm: {
    totalLead: number; totalFollowUp: number; totalProposal: number;
    totalNegotiation: number; totalDeal: number; totalLost: number;
    totalClients: number; conversionRate: number; dealRevenue: number;
    crmPipeline: { name: string; value: number }[];
  };
  events: { eventsThisMonth: number; eventsThisMonthList: any[] };
  finance: {
    revenueThisMonth: number; expenseThisMonth: number; profitThisMonth: number;
    targetRevenue: number; targetProfit: number;
    revenueAchievement: number; profitAchievement: number;
    profitEstimation: number;
  };
  content: {
    totalContentPublished: number; totalContentProduced: number; totalReels: number;
    totalReach: number; totalViews: number; totalShare: number; totalSave: number;
    totalComment: number; totalFollowerGrowth: number;
    engagementRate: number;
    contentByCategory: { name: string; value: number }[];
    pendingAccContents: number;
  };
  articles: {
    totalArticles: number; totalArticlesPublished: number; pendingAccArticles: number;
  };
  monthlyData: MonthlyData[];
  yearlyData: YearlyData[];
  dealClientsWithDocs: DealClientWithDocs[];
  teamProductivity: TeamProductivity[];
}

interface FinanceTxn {
  id: string;
  type: string;
  amount: number;
  description?: string | null;
  category?: string | null;
  date: string;
  user?: { id: string; name: string } | null;
  client?: { id: string; namaKlien: string } | null;
}

interface ContentIdea {
  id: string;
  kategori: string;
  judul: string;
  statusACC: string;
  statusPublish: string;
  statusProduksi: string;
  tanggal: string;
  user?: { id: string; name: string; role: string } | null;
}

interface Article {
  id: string;
  judulArtikel: string;
  keyword?: string | null;
  websiteTujuan?: string | null;
  statusACC: string;
  status: string;
  tanggalPublish?: string | null;
  createdAt: string;
  user?: { id: string; name: string; role: string } | null;
}

// ============================ Constants ============================

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const ACC_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ACC: "bg-blue-100 text-blue-700 border-blue-200",
  REVISI: "bg-rose-100 text-rose-700 border-rose-200",
  REVISI_ADMIN: "bg-rose-100 text-rose-700 border-rose-200",
};

const ACC_LABELS: Record<string, string> = {
  PENDING: "Menunggu ACC",
  ACC: "ACC",
  REVISI: "Revisi",
  REVISI_ADMIN: "Revisi Admin",
};

const currentYear = new Date().getFullYear();

// ============================ Main ============================

export function ReportsModule() {
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1); // 1-12, or 0 = all
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");

  // Side data per tab (lazy loaded)
  const [financeTxns, setFinanceTxns] = useState<FinanceTxn[] | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[] | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  const loadData = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      // Pass year & month as-is. API handles year=0 (Semua Tahun) and month=0
      // (Semua Bulan) by aggregating across all years / whole year respectively.
      const d = await api<DashboardData>(`/api/dashboard/owner?year=${y}&month=${m}`);
      setData(d);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat data laporan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(year, month);
  }, [year, month, loadData]);

  // Lazy loaders
  const loadFinance = useCallback(async () => {
    setFinanceLoading(true);
    try {
      // Build query — only send month/year when > 0 (0 means "no filter / all")
      const qs = new URLSearchParams();
      if (month > 0) qs.set("month", String(month));
      if (year > 0) qs.set("year", String(year));
      const url = `/api/finance${qs.toString() ? `?${qs.toString()}` : ""}`;
      const d = await api<{ transactions: FinanceTxn[] }>(url);
      setFinanceTxns(d.transactions);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat transaksi keuangan");
    } finally {
      setFinanceLoading(false);
    }
  }, [year, month]);

  const loadContentArticles = useCallback(async () => {
    setContentLoading(true);
    try {
      const [c, a] = await Promise.all([
        api<{ ideas: ContentIdea[] }>("/api/content-ideas"),
        api<{ articles: Article[] }>("/api/articles"),
      ]);
      setContentIdeas(c.ideas);
      setArticles(a.articles);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat data konten/artikel");
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "finance" && !financeTxns && !financeLoading) loadFinance();
    if (activeTab === "content" && !contentIdeas && !contentLoading) loadContentArticles();
  }, [activeTab, financeTxns, contentIdeas, financeLoading, contentLoading, loadFinance, loadContentArticles]);

  const periodLabel = year === 0
    ? "Semua Tahun (Akumulasi)"
    : month === 0
      ? `Tahun ${year}`
      : `${MONTH_NAMES[month - 1]} ${year}`;

  // Aggregates for "Semua Bulan"
  const annualAgg = useMemo(() => {
    if (!data) return null;
    const sum = data.monthlyData.reduce(
      (acc, m) => {
        acc.revenue += m.revenue;
        acc.expense += m.expense;
        acc.profit += m.profit;
        acc.deals += m.deals;
        acc.contents += m.contents;
        acc.articles += m.articles;
        acc.events += m.events;
        acc.leads += m.leads;
        return acc;
      },
      { revenue: 0, expense: 0, profit: 0, deals: 0, contents: 0, articles: 0, events: 0, leads: 0 }
    );
    return sum;
  }, [data]);

  // "Effective" KPIs based on selection
  const eff = useMemo(() => {
    if (!data) return null;
    // Use annual aggregate when month=0 (Semua Bulan) OR year=0 (Semua Tahun)
    const isAll = month === 0 || year === 0;
    return {
      revenue: isAll ? annualAgg!.revenue : data.finance.revenueThisMonth,
      expense: isAll ? annualAgg!.expense : data.finance.expenseThisMonth,
      profit: isAll ? annualAgg!.profit : data.finance.profitThisMonth,
      deals: isAll ? annualAgg!.deals : data.crm.totalDeal, // CRM deal count is total, not month-specific; OK to show
      contents: isAll ? annualAgg!.contents : data.content.totalContentPublished,
      articles: isAll ? annualAgg!.articles : data.articles.totalArticlesPublished,
      events: isAll ? annualAgg!.events : data.events.eventsThisMonth,
      leads: isAll ? annualAgg!.leads : data.crm.totalClients,
    };
  }, [data, month, year, annualAgg]);

  function handleDownloadFullPDF() {
    if (!data || !eff) return;
    const sections: { heading: string; columns: string[]; rows: (string | number)[][] }[] = [];

    // Section 1: KPI Summary
    sections.push({
      heading: "1. Ringkasan KPI Bisnis",
      columns: ["Metrik", "Nilai"],
      rows: [
        ["Periode", periodLabel],
        ["Pendapatan", formatCurrency(eff.revenue)],
        ["Pengeluaran", formatCurrency(eff.expense)],
        ["Profit", formatCurrency(eff.profit)],
        ["Target Pendapatan", formatCurrency(data.finance.targetRevenue)],
        ["Capaian Pendapatan", `${data.finance.revenueAchievement}%`],
        ["Total Deal", eff.deals],
        ["Total Klien", data.crm.totalClients],
        ["Conversion Rate", `${data.crm.conversionRate}%`],
        ["Revenue Deal", formatCurrency(data.crm.dealRevenue)],
        ["Konten Published", eff.contents],
        ["Artikel Published", eff.articles],
        ["Engagement Rate", `${data.content.engagementRate}%`],
        ["Estimasi Profit (avg/bln)", formatCurrency(data.finance.profitEstimation)],
      ],
    });

    // Section 2: CRM Pipeline
    sections.push({
      heading: "2. CRM Pipeline",
      columns: ["Stage", "Jumlah"],
      rows: data.crm.crmPipeline.map((p) => [p.name, p.value]),
    });

    // Section 3: Deal Clients
    sections.push({
      heading: "3. Klien Deal & Dokumen",
      columns: ["Klien", "Instansi", "Budget", "Tgl Event", "Invoice", "SPK", "Surat"],
      rows: data.dealClientsWithDocs.map((c) => [
        c.namaKlien,
        c.instansi || "-",
        formatCurrency(c.budget),
        formatDate(c.tanggalEvent),
        c.hasInvoice ? "Ada" : "Tidak",
        c.hasSpk ? "Ada" : "Tidak",
        c.hasSurat ? "Ada" : "Tidak",
      ]),
    });

    // Section 4: Monthly Data
    sections.push({
      heading: "4. Data Bulanan",
      columns: ["Bulan", "Pendapatan", "Pengeluaran", "Profit", "Deal", "Konten", "Artikel", "Event", "Lead"],
      rows: data.monthlyData.map((m) => [
        m.month, formatCurrency(m.revenue), formatCurrency(m.expense), formatCurrency(m.profit),
        m.deals, m.contents, m.articles, m.events, m.leads,
      ]),
    });

    // Section 5: Yearly
    sections.push({
      heading: "5. Data Tahunan (5 Tahun)",
      columns: ["Tahun", "Pendapatan", "Pengeluaran", "Profit", "Deal", "Konten", "Artikel"],
      rows: data.yearlyData.map((y) => [
        y.year, formatCurrency(y.revenue), formatCurrency(y.expense), formatCurrency(y.profit),
        y.deals, y.contents, y.articles,
      ]),
    });

    // Section 6: Team Productivity
    sections.push({
      heading: "6. Produktivitas Tim",
      columns: ["Nama", "Role", "Tugas Selesai", "Total Tugas", "Completion", "Konten", "Artikel"],
      rows: data.teamProductivity.map((t) => [
        t.name, ROLE_LABELS[t.role] || t.role,
        t.tasksDone, t.tasksTotal, `${t.completionRate}%`, t.contents, t.articles,
      ]),
    });

    exportReportPDF(`Laporan Lengkap - ${periodLabel}`, sections, `laporan-lengkap-${periodLabel.replace(/\s+/g, "-")}`);
    toast.success("Laporan lengkap diunduh");
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Laporan & Reporting"
        description="Generate laporan otomatis dan export ke PDF/Excel."
        action={
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleDownloadFullPDF}
            disabled={loading || !data}
          >
            <FileBarChart className="w-4 h-4" /> Download Laporan Lengkap (PDF)
          </Button>
        }
      />

      {/* Period selector */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tahun</label>
            <select
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 w-full sm:w-32 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Tahun</option>
              {[2026, 2025, 2024, 2023, 2022].map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Bulan</label>
            <select
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 w-full sm:w-44 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Bulan</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="sm:ml-auto text-sm text-slate-500">
            Menampilkan data: <span className="font-semibold text-blue-700">{periodLabel}</span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <ReportSkeleton />
      ) : !data ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Gagal memuat data. Coba refresh halaman.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="summary">Ringkasan Bisnis</TabsTrigger>
              <TabsTrigger value="crm">CRM & Penjualan</TabsTrigger>
              <TabsTrigger value="content">Konten & Artikel</TabsTrigger>
              <TabsTrigger value="finance">Keuangan</TabsTrigger>
              <TabsTrigger value="team">Tim</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="summary" className="mt-4">
            <SummaryTab data={data} eff={eff!} periodLabel={periodLabel} month={month} year={year} />
          </TabsContent>
          <TabsContent value="crm" className="mt-4">
            <CrmTab data={data} periodLabel={periodLabel} />
          </TabsContent>
          <TabsContent value="content" className="mt-4">
            <ContentTab
              data={data}
              ideas={contentIdeas}
              articles={articles}
              loading={contentLoading}
              periodLabel={periodLabel}
            />
          </TabsContent>
          <TabsContent value="finance" className="mt-4">
            <FinanceTab
              data={data}
              txns={financeTxns}
              loading={financeLoading}
              periodLabel={periodLabel}
              month={month}
              year={year}
            />
          </TabsContent>
          <TabsContent value="team" className="mt-4">
            <TeamTab data={data} periodLabel={periodLabel} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ============================ Summary Tab ============================

function SummaryTab({
  data, eff, periodLabel, month, year,
}: {
  data: DashboardData;
  eff: { revenue: number; expense: number; profit: number; deals: number; contents: number; articles: number; events: number; leads: number };
  periodLabel: string;
  month: number;
  year: number;
}) {
  function exportSummaryPDF() {
    const sections = [
      {
        heading: "Ringkasan KPI",
        columns: ["Metrik", "Nilai"],
        rows: [
          ["Periode", periodLabel],
          ["Pendapatan", formatCurrency(eff.revenue)],
          ["Pengeluaran", formatCurrency(eff.expense)],
          ["Profit", formatCurrency(eff.profit)],
          ["Total Deal", eff.deals],
          ["Total Klien", eff.leads],
          ["Konten Published", eff.contents],
          ["Artikel Published", eff.articles],
          ["Conversion Rate", `${data.crm.conversionRate}%`],
          ["Engagement Rate", `${data.content.engagementRate}%`],
        ],
      },
      {
        heading: "Data Bulanan",
        columns: ["Bulan", "Pendapatan", "Pengeluaran", "Profit", "Deal", "Konten", "Artikel"],
        rows: data.monthlyData.map((m) => [
          m.month, formatCurrency(m.revenue), formatCurrency(m.expense), formatCurrency(m.profit),
          m.deals, m.contents, m.articles,
        ]),
      },
      {
        heading: "Data Tahunan",
        columns: ["Tahun", "Pendapatan", "Pengeluaran", "Profit", "Deal", "Konten", "Artikel"],
        rows: data.yearlyData.map((y) => [
          y.year, formatCurrency(y.revenue), formatCurrency(y.expense), formatCurrency(y.profit),
          y.deals, y.contents, y.articles,
        ]),
      },
    ];
    exportReportPDF(`Ringkasan Bisnis - ${periodLabel}`, sections, `ringkasan-bisnis-${periodLabel.replace(/\s+/g, "-")}`);
    toast.success("PDF Ringkasan diunduh");
  }

  function exportSummaryExcel() {
    const rows = data.monthlyData.map((m) => ({
      Bulan: m.month,
      Pendapatan: m.revenue,
      Pengeluaran: m.expense,
      Profit: m.profit,
      Deal: m.deals,
      Konten: m.contents,
      Artikel: m.articles,
      Event: m.events,
      Lead: m.leads,
    }));
    exportToExcel(rows, `ringkasan-bulanan-${data.year}`, "Bulanan");
    toast.success("Excel Ringkasan diunduh");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportSummaryPDF}>
          <FileDown className="w-4 h-4" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportSummaryExcel}>
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard
          title="Pendapatan"
          value={formatCurrency(eff.revenue)}
          icon={DollarSign}
          indicator={data.finance.revenueAchievement >= 100 ? "green" : data.finance.revenueAchievement >= 60 ? "yellow" : "red"}
          accent="bg-blue-50 text-blue-600"
          subtitle={`Target: ${formatCurrency(data.finance.targetRevenue)}`}
          progress={month === 0 || year === 0 ? undefined : data.finance.revenueAchievement}
        />
        <StatCard
          title="Profit"
          value={formatCurrency(eff.profit)}
          icon={eff.profit >= 0 ? TrendingUp : TrendingDown}
          indicator={eff.profit >= 0 ? "green" : "red"}
          accent={eff.profit >= 0 ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"}
          subtitle={`Estimasi/bln: ${formatCurrency(data.finance.profitEstimation)}`}
        />
        <StatCard
          title="Total Deal"
          value={eff.deals}
          icon={Award}
          indicator="green"
          accent="bg-blue-50 text-blue-600"
          subtitle={`Revenue: ${formatCurrency(data.crm.dealRevenue)}`}
        />
        <StatCard
          title="Conversion Rate"
          value={`${data.crm.conversionRate}%`}
          icon={Target}
          indicator={data.crm.conversionRate >= 30 ? "green" : data.crm.conversionRate >= 15 ? "yellow" : "red"}
          accent="bg-blue-50 text-blue-600"
          subtitle={`${data.crm.totalDeal} dari ${data.crm.totalClients} klien`}
        />
        <StatCard
          title="Konten Published"
          value={eff.contents}
          icon={Film}
          accent="bg-blue-50 text-blue-600"
          subtitle={`Engagement: ${data.content.engagementRate}%`}
        />
        <StatCard
          title="Artikel Published"
          value={eff.articles}
          icon={FileText}
          accent="bg-blue-50 text-blue-600"
          subtitle={`Total: ${data.articles.totalArticles} artikel`}
        />
        <StatCard
          title="Event"
          value={eff.events}
          icon={CalendarDays}
          accent="bg-blue-50 text-blue-600"
          subtitle={periodLabel}
        />
        <StatCard
          title="Reach Konten"
          value={formatNumber(data.content.totalReach)}
          icon={Activity}
          accent="bg-blue-50 text-blue-600"
          subtitle={`${formatNumber(data.content.totalViews)} views`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartCard
          title="Pendapatan vs Pengeluaran (Bulanan)"
          data={data.monthlyData}
          keys={[
            { key: "revenue", label: "Pendapatan", color: "#2563eb" },
            { key: "expense", label: "Pengeluaran", color: "#f43f5e" },
          ]}
          height={280}
          formatY={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
        />
        <BarChartCard
          title="Profit per Bulan"
          data={data.monthlyData}
          keys={[{ key: "profit", label: "Profit", color: "#0d9488" }]}
          height={280}
          formatY={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartCard
          title="Tren Aktivitas (Deal, Konten, Artikel)"
          data={data.monthlyData}
          keys={[
            { key: "deals", label: "Deal", color: "#2563eb" },
            { key: "contents", label: "Konten", color: "#7c3aed" },
            { key: "articles", label: "Artikel", color: "#ea580c" },
          ]}
          height={280}
        />
        <BarChartCard
          title="Pendapatan per Tahun (5 Tahun)"
          data={data.yearlyData}
          keys={[
            { key: "revenue", label: "Pendapatan", color: "#2563eb" },
            { key: "expense", label: "Pengeluaran", color: "#f43f5e" },
            { key: "profit", label: "Profit", color: "#0d9488" },
          ]}
          height={280}
          formatY={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
        />
      </div>

      {/* Monthly table */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Detail Bulanan {data.year}</h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50">
                <TableRow>
                  <TableHead>Bulan</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                  <TableHead className="text-right">Pengeluaran</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-center">Deal</TableHead>
                  <TableHead className="text-center">Konten</TableHead>
                  <TableHead className="text-center">Artikel</TableHead>
                  <TableHead className="text-center">Event</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthlyData.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-right text-blue-700">{formatCurrency(m.revenue)}</TableCell>
                    <TableCell className="text-right text-rose-700">{formatCurrency(m.expense)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(m.profit)}</TableCell>
                    <TableCell className="text-center">{m.deals}</TableCell>
                    <TableCell className="text-center">{m.contents}</TableCell>
                    <TableCell className="text-center">{m.articles}</TableCell>
                    <TableCell className="text-center">{m.events}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================ CRM Tab ============================

function CrmTab({ data, periodLabel }: { data: DashboardData; periodLabel: string }) {
  function exportPDF() {
    const sections = [
      {
        heading: "Pipeline CRM",
        columns: ["Stage", "Jumlah"],
        rows: data.crm.crmPipeline.map((p) => [p.name, p.value]),
      },
      {
        heading: "Klien Deal & Dokumen",
        columns: ["Klien", "Instansi", "Budget", "Tgl Event", "Invoice", "SPK", "Surat"],
        rows: data.dealClientsWithDocs.map((c) => [
          c.namaKlien, c.instansi || "-", formatCurrency(c.budget), formatDate(c.tanggalEvent),
          c.hasInvoice ? "Ada" : "Tidak", c.hasSpk ? "Ada" : "Tidak", c.hasSurat ? "Ada" : "Tidak",
        ]),
      },
    ];
    exportReportPDF(`Laporan CRM & Penjualan - ${periodLabel}`, sections, `crm-penjualan-${periodLabel.replace(/\s+/g, "-")}`);
    toast.success("PDF CRM diunduh");
  }

  function exportExcel() {
    const rows = data.dealClientsWithDocs.map((c) => ({
      Klien: c.namaKlien,
      Instansi: c.instansi || "-",
      Budget: c.budget,
      TanggalEvent: formatDate(c.tanggalEvent),
      Invoice: c.hasInvoice ? "Ada" : "Tidak",
      SPK: c.hasSpk ? "Ada" : "Tidak",
      Surat: c.hasSurat ? "Ada" : "Tidak",
    }));
    exportToExcel(rows, `crm-deal-${periodLabel.replace(/\s+/g, "-")}`, "CRM Deal");
    toast.success("Excel CRM diunduh");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <FileDown className="w-4 h-4" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      {/* CRM Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Lead" value={data.crm.totalLead} icon={Users} accent="bg-slate-100 text-slate-700" />
        <StatCard title="Follow Up" value={data.crm.totalFollowUp} icon={Users} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Proposal" value={data.crm.totalProposal} icon={FileText} accent="bg-amber-50 text-amber-600" />
        <StatCard title="Negotiation" value={data.crm.totalNegotiation} icon={Activity} accent="bg-violet-50 text-violet-600" />
        <StatCard title="Deal" value={data.crm.totalDeal} icon={Award} indicator="green" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Lost" value={data.crm.totalLost} icon={TrendingDown} indicator="red" accent="bg-rose-50 text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Klien"
          value={data.crm.totalClients}
          icon={Users}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Conversion Rate"
          value={`${data.crm.conversionRate}%`}
          icon={Target}
          indicator={data.crm.conversionRate >= 30 ? "green" : data.crm.conversionRate >= 15 ? "yellow" : "red"}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Total Revenue Deal"
          value={formatCurrency(data.crm.dealRevenue)}
          icon={DollarSign}
          indicator="green"
          accent="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Pipeline chart */}
      <BarChartCard
        title="Distribusi Pipeline CRM"
        data={data.crm.crmPipeline}
        keys={[{ key: "value", label: "Jumlah Klien", color: "#2563eb" }]}
        height={260}
      />

      {/* Deal clients with docs */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Klien Deal & Status Dokumen
          </h3>
          {data.dealClientsWithDocs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Belum ada klien dengan status deal.</p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50">
                  <TableRow>
                    <TableHead className="min-w-[160px]">Klien</TableHead>
                    <TableHead className="min-w-[140px]">Instansi</TableHead>
                    <TableHead className="text-right min-w-[130px]">Budget</TableHead>
                    <TableHead className="min-w-[110px]">Tgl Event</TableHead>
                    <TableHead className="text-center min-w-[80px]">Invoice</TableHead>
                    <TableHead className="text-center min-w-[80px]">SPK</TableHead>
                    <TableHead className="text-center min-w-[80px]">Surat</TableHead>
                    <TableHead className="text-center min-w-[80px]">Dokumen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dealClientsWithDocs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.namaKlien}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{c.instansi || "-"}</TableCell>
                      <TableCell className="text-right text-blue-700 font-medium">{formatCurrency(c.budget)}</TableCell>
                      <TableCell className="text-slate-600 text-xs">{formatDate(c.tanggalEvent)}</TableCell>
                      <TableCell className="text-center">
                        <DocBadge has={c.hasInvoice} />
                      </TableCell>
                      <TableCell className="text-center">
                        <DocBadge has={c.hasSpk} />
                      </TableCell>
                      <TableCell className="text-center">
                        <DocBadge has={c.hasSurat} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {c.documents.length}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DocBadge({ has }: { has: boolean }) {
  return has ? (
    <CheckCircle2 className="w-4 h-4 text-blue-600 inline" />
  ) : (
    <span className="text-xs text-slate-400">-</span>
  );
}

// ============================ Content Tab ============================

function ContentTab({
  data, ideas, articles, loading, periodLabel,
}: {
  data: DashboardData;
  ideas: ContentIdea[] | null;
  articles: Article[] | null;
  loading: boolean;
  periodLabel: string;
}) {
  const pendingContents = ideas?.filter((i) => i.statusACC === "PENDING") || [];
  const publishedContents = ideas?.filter((i) => i.statusPublish === "PUBLISHED") || [];
  const pendingArticles = articles?.filter((a) => a.statusACC === "PENDING") || [];
  const publishedArticles = articles?.filter((a) => a.status === "PUBLISHED") || [];

  // Articles by website
  const articlesByWebsite = useMemo(() => {
    if (!articles) return [];
    const map = new Map<string, number>();
    for (const a of articles) {
      const w = a.websiteTujuan || "Lainnya";
      map.set(w, (map.get(w) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [articles]);

  function exportPDF() {
    const sections = [
      {
        heading: "Statistik Konten",
        columns: ["Metrik", "Nilai"],
        rows: [
          ["Konten Published", data.content.totalContentPublished],
          ["Konten Produced", data.content.totalContentProduced],
          ["Total Reach", formatNumber(data.content.totalReach)],
          ["Total Views", formatNumber(data.content.totalViews)],
          ["Total Share", formatNumber(data.content.totalShare)],
          ["Total Save", formatNumber(data.content.totalSave)],
          ["Total Comment", formatNumber(data.content.totalComment)],
          ["Follower Growth", formatNumber(data.content.totalFollowerGrowth)],
          ["Engagement Rate", `${data.content.engagementRate}%`],
        ],
      },
      {
        heading: "Konten per Kategori",
        columns: ["Kategori", "Jumlah"],
        rows: data.content.contentByCategory.map((c) => [c.name, c.value]),
      },
      {
        heading: "Artikel per Website",
        columns: ["Website", "Jumlah"],
        rows: articlesByWebsite.map((w) => [w.name, w.value]),
      },
      {
        heading: "Konten Pending ACC",
        columns: ["Judul", "Kategori", "Status ACC", "Tanggal"],
        rows: pendingContents.map((c) => [c.judul, c.kategori, ACC_LABELS[c.statusACC] || c.statusACC, formatDate(c.tanggal)]),
      },
      {
        heading: "Artikel Pending ACC",
        columns: ["Judul", "Website", "Keyword", "Status ACC"],
        rows: pendingArticles.map((a) => [a.judulArtikel, a.websiteTujuan || "-", a.keyword || "-", ACC_LABELS[a.statusACC] || a.statusACC]),
      },
    ];
    exportReportPDF(`Laporan Konten & Artikel - ${periodLabel}`, sections, `konten-artikel-${periodLabel.replace(/\s+/g, "-")}`);
    toast.success("PDF Konten & Artikel diunduh");
  }

  function exportExcel() {
    if (!ideas || !articles) return;
    const rows = [
      ...ideas.map((c) => ({
        Tipe: "Konten",
        Judul: c.judul,
        Kategori: c.kategori,
        StatusACC: ACC_LABELS[c.statusACC] || c.statusACC,
        StatusPublish: c.statusPublish,
        Tanggal: formatDate(c.tanggal),
      })),
      ...articles.map((a) => ({
        Tipe: "Artikel",
        Judul: a.judulArtikel,
        Kategori: a.websiteTujuan || "-",
        StatusACC: ACC_LABELS[a.statusACC] || a.statusACC,
        StatusPublish: a.status,
        Tanggal: formatDate(a.createdAt),
      })),
    ];
    exportToExcel(rows, `konten-artikel-${periodLabel.replace(/\s+/g, "-")}`, "Konten & Artikel");
    toast.success("Excel Konten & Artikel diunduh");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <FileDown className="w-4 h-4" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel} disabled={!ideas || !articles}>
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      {/* Content KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard title="Konten Published" value={data.content.totalContentPublished} icon={Film} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Konten Produced" value={data.content.totalContentProduced} icon={CheckCircle2} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Artikel Published" value={data.articles.totalArticlesPublished} icon={FileText} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Engagement Rate" value={`${data.content.engagementRate}%`} icon={Activity} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Total Reach" value={formatNumber(data.content.totalReach)} icon={Users} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Total Views" value={formatNumber(data.content.totalViews)} icon={Activity} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Follower Growth" value={formatNumber(data.content.totalFollowerGrowth)} icon={TrendingUp} indicator="green" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Pending ACC" value={data.content.pendingAccContents + data.articles.pendingAccArticles} icon={Clock} indicator="yellow" accent="bg-amber-50 text-amber-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PieChartCard title="Konten per Kategori" data={data.content.contentByCategory} height={280} />
        <PieChartCard title="Artikel per Website" data={articlesByWebsite} height={280} />
      </div>

      {loading ? (
        <Card><CardContent className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      ) : (
        <>
          {/* Pending ACC lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileWarning className="w-4 h-4 text-amber-600" />
                    Konten Pending ACC
                  </h3>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">{pendingContents.length}</Badge>
                </div>
                {pendingContents.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Tidak ada konten pending.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {pendingContents.slice(0, 20).map((c) => (
                      <div key={c.id} className="border border-slate-200 rounded-md p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{c.judul}</p>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${ACC_COLORS[c.statusACC]}`}>
                            {ACC_LABELS[c.statusACC] || c.statusACC}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{c.kategori}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileWarning className="w-4 h-4 text-amber-600" />
                    Artikel Pending ACC
                  </h3>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">{pendingArticles.length}</Badge>
                </div>
                {pendingArticles.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Tidak ada artikel pending.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {pendingArticles.slice(0, 20).map((a) => (
                      <div key={a.id} className="border border-slate-200 rounded-md p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{a.judulArtikel}</p>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${ACC_COLORS[a.statusACC]}`}>
                            {ACC_LABELS[a.statusACC] || a.statusACC}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{a.websiteTujuan || "-"} • {a.keyword || "-"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Published lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    Konten Published
                  </h3>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">{publishedContents.length}</Badge>
                </div>
                {publishedContents.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Belum ada konten published.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {publishedContents.slice(0, 20).map((c) => (
                      <div key={c.id} className="border border-slate-200 rounded-md p-2.5">
                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{c.judul}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{c.kategori} • {formatDate(c.tanggal)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    Artikel Published
                  </h3>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">{publishedArticles.length}</Badge>
                </div>
                {publishedArticles.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Belum ada artikel published.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {publishedArticles.slice(0, 20).map((a) => (
                      <div key={a.id} className="border border-slate-200 rounded-md p-2.5">
                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{a.judulArtikel}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{a.websiteTujuan || "-"} • {formatDate(a.tanggalPublish)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ============================ Finance Tab ============================

function FinanceTab({
  data, txns, loading, periodLabel, month, year,
}: {
  data: DashboardData;
  txns: FinanceTxn[] | null;
  loading: boolean;
  periodLabel: string;
  month: number;
  year: number;
}) {
  const isAll = month === 0 || year === 0;

  // Expense by category (from txns if available, fallback to monthly)
  const expenseByCategory = useMemo(() => {
    if (!txns) return [];
    const map = new Map<string, number>();
    for (const t of txns) {
      if (t.type !== "PENGELUARAN") continue;
      const cat = t.category || "Lainnya";
      map.set(cat, (map.get(cat) || 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [txns]);

  function exportPDF() {
    const sections = [
      {
        heading: "Ringkasan Keuangan",
        columns: ["Metrik", "Nilai"],
        rows: [
          ["Periode", periodLabel],
          ["Pendapatan", formatCurrency(data.finance.revenueThisMonth)],
          ["Pengeluaran", formatCurrency(data.finance.expenseThisMonth)],
          ["Profit", formatCurrency(data.finance.profitThisMonth)],
          ["Target Pendapatan", formatCurrency(data.finance.targetRevenue)],
          ["Target Profit", formatCurrency(data.finance.targetProfit)],
          ["Capaian Pendapatan", `${data.finance.revenueAchievement}%`],
          ["Capaian Profit", `${data.finance.profitAchievement}%`],
          ["Estimasi Profit/Bulan", formatCurrency(data.finance.profitEstimation)],
        ],
      },
      {
        heading: "Data Bulanan",
        columns: ["Bulan", "Pendapatan", "Pengeluaran", "Profit"],
        rows: data.monthlyData.map((m) => [
          m.month, formatCurrency(m.revenue), formatCurrency(m.expense), formatCurrency(m.profit),
        ]),
      },
    ];
    if (expenseByCategory.length > 0) {
      sections.push({
        heading: "Pengeluaran per Kategori",
        columns: ["Kategori", "Jumlah"],
        rows: expenseByCategory.map((c) => [c.name, formatCurrency(c.value)]),
      });
    }
    if (txns && txns.length > 0) {
      sections.push({
        heading: "Detail Transaksi",
        columns: ["Tanggal", "Tipe", "Kategori", "Deskripsi", "Jumlah"],
        rows: txns.slice(0, 100).map((t) => [
          formatDate(t.date), t.type, t.category || "-", t.description || "-", formatCurrency(t.amount),
        ]),
      });
    }
    exportReportPDF(`Laporan Keuangan - ${periodLabel}`, sections, `keuangan-${periodLabel.replace(/\s+/g, "-")}`);
    toast.success("PDF Keuangan diunduh");
  }

  function exportExcel() {
    if (!txns) return;
    const rows = txns.map((t) => ({
      Tanggal: formatDate(t.date),
      Tipe: t.type,
      Kategori: t.category || "-",
      Deskripsi: t.description || "-",
      Jumlah: t.amount,
      Klien: t.client?.namaKlien || "-",
      User: t.user?.name || "-",
    }));
    exportToExcel(rows, `transaksi-${periodLabel.replace(/\s+/g, "-")}`, "Transaksi");
    toast.success("Excel Keuangan diunduh");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <FileDown className="w-4 h-4" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel} disabled={!txns || txns.length === 0}>
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Pendapatan"
          value={formatCurrency(isAll ? data.monthlyData.reduce((s, m) => s + m.revenue, 0) : data.finance.revenueThisMonth)}
          icon={TrendingUp}
          indicator={data.finance.revenueAchievement >= 100 ? "green" : data.finance.revenueAchievement >= 60 ? "yellow" : "red"}
          accent="bg-blue-50 text-blue-600"
          subtitle={`Capaian: ${data.finance.revenueAchievement}%`}
          progress={isAll ? undefined : data.finance.revenueAchievement}
        />
        <StatCard
          title="Pengeluaran"
          value={formatCurrency(isAll ? data.monthlyData.reduce((s, m) => s + m.expense, 0) : data.finance.expenseThisMonth)}
          icon={TrendingDown}
          indicator="red"
          accent="bg-rose-50 text-rose-600"
        />
        <StatCard
          title="Profit"
          value={formatCurrency(isAll ? data.monthlyData.reduce((s, m) => s + m.profit, 0) : data.finance.profitThisMonth)}
          icon={DollarSign}
          indicator={(isAll ? data.monthlyData.reduce((s, m) => s + m.profit, 0) : data.finance.profitThisMonth) >= 0 ? "green" : "red"}
          accent="bg-blue-50 text-blue-600"
          subtitle={`Capaian: ${data.finance.profitAchievement}%`}
        />
        <StatCard
          title="Estimasi Profit/Bln"
          value={formatCurrency(data.finance.profitEstimation)}
          icon={Target}
          accent="bg-blue-50 text-blue-600"
          subtitle="Rata-rata tahun berjalan"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartCard
          title="Pendapatan vs Pengeluaran (Bulanan)"
          data={data.monthlyData}
          keys={[
            { key: "revenue", label: "Pendapatan", color: "#2563eb" },
            { key: "expense", label: "Pengeluaran", color: "#f43f5e" },
          ]}
          height={280}
          formatY={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
        />
        {expenseByCategory.length > 0 ? (
          <PieChartCard title="Pengeluaran per Kategori" data={expenseByCategory} height={280} />
        ) : (
          <BarChartCard
            title="Profit per Bulan"
            data={data.monthlyData}
            keys={[{ key: "profit", label: "Profit", color: "#0d9488" }]}
            height={280}
            formatY={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
          />
        )}
      </div>

      {/* Monthly finance table */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Detail Keuangan Bulanan {data.year}</h3>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50">
                <TableRow>
                  <TableHead>Bulan</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                  <TableHead className="text-right">Pengeluaran</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthlyData.map((m) => {
                  const margin = m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) : 0;
                  return (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.month}</TableCell>
                      <TableCell className="text-right text-blue-700">{formatCurrency(m.revenue)}</TableCell>
                      <TableCell className="text-right text-rose-700">{formatCurrency(m.expense)}</TableCell>
                      <TableCell className={`text-right font-semibold ${m.profit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                        {formatCurrency(m.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={margin >= 30 ? "bg-blue-100 text-blue-700 border-blue-200" : margin >= 10 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-rose-100 text-rose-700 border-rose-200"}>
                          {margin}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Transactions table */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Detail Transaksi - {periodLabel}
          </h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !txns || txns.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Tidak ada transaksi pada periode ini.</p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50">
                  <TableRow>
                    <TableHead className="min-w-[110px]">Tanggal</TableHead>
                    <TableHead className="min-w-[100px]">Tipe</TableHead>
                    <TableHead className="min-w-[120px]">Kategori</TableHead>
                    <TableHead className="min-w-[200px]">Deskripsi</TableHead>
                    <TableHead className="min-w-[140px]">Klien</TableHead>
                    <TableHead className="text-right min-w-[130px]">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txns.slice(0, 200).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-slate-600">{formatDate(t.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={t.type === "PEMASUKAN" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-rose-100 text-rose-700 border-rose-200"}>
                          {t.type === "PEMASUKAN" ? "Masuk" : "Keluar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{t.category || "-"}</TableCell>
                      <TableCell className="text-sm text-slate-700">{t.description || "-"}</TableCell>
                      <TableCell className="text-sm text-slate-600">{t.client?.namaKlien || "-"}</TableCell>
                      <TableCell className={`text-right font-medium ${t.type === "PEMASUKAN" ? "text-blue-700" : "text-rose-700"}`}>
                        {formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================ Team Tab ============================

function TeamTab({ data, periodLabel }: { data: DashboardData; periodLabel: string }) {
  function exportPDF() {
    const sections = [
      {
        heading: "Produktivitas Tim",
        columns: ["Nama", "Role", "Posisi", "Tugas Selesai", "Total Tugas", "Completion", "Konten", "Artikel"],
        rows: data.teamProductivity.map((t) => [
          t.name, ROLE_LABELS[t.role] || t.role, t.position || "-",
          t.tasksDone, t.tasksTotal, `${t.completionRate}%`, t.contents, t.articles,
        ]),
      },
    ];
    exportReportPDF(`Laporan Produktivitas Tim - ${periodLabel}`, sections, `tim-${periodLabel.replace(/\s+/g, "-")}`);
    toast.success("PDF Tim diunduh");
  }

  function exportExcel() {
    const rows = data.teamProductivity.map((t) => ({
      Nama: t.name,
      Role: ROLE_LABELS[t.role] || t.role,
      Posisi: t.position || "-",
      TugasSelesai: t.tasksDone,
      TotalTugas: t.tasksTotal,
      CompletionRate: t.completionRate,
      Konten: t.contents,
      Artikel: t.articles,
    }));
    exportToExcel(rows, `produktivitas-tim-${periodLabel.replace(/\s+/g, "-")}`, "Tim");
    toast.success("Excel Tim diunduh");
  }

  const avgCompletion = data.teamProductivity.length > 0
    ? Math.round(data.teamProductivity.reduce((s, t) => s + t.completionRate, 0) / data.teamProductivity.length)
    : 0;
  const totalTasksDone = data.teamProductivity.reduce((s, t) => s + t.tasksDone, 0);
  const totalTasksTotal = data.teamProductivity.reduce((s, t) => s + t.tasksTotal, 0);
  const totalContents = data.teamProductivity.reduce((s, t) => s + t.contents, 0);
  const totalArticles = data.teamProductivity.reduce((s, t) => s + t.articles, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <FileDown className="w-4 h-4" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Anggota Aktif" value={data.teamProductivity.length} icon={Users} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Total Tugas Selesai" value={totalTasksDone} icon={CheckCircle2} subtitle={`dari ${totalTasksTotal} tugas`} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Rata-rata Completion" value={`${avgCompletion}%`} icon={Target} indicator={avgCompletion >= 70 ? "green" : avgCompletion >= 40 ? "yellow" : "red"} accent="bg-blue-50 text-blue-600" />
        <StatCard title="Konten + Artikel" value={totalContents + totalArticles} icon={FileText} subtitle={`${totalContents} konten • ${totalArticles} artikel`} accent="bg-blue-50 text-blue-600" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Tabel Produktivitas Tim - {periodLabel}
          </h3>
          {data.teamProductivity.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Tidak ada data produktivitas pada periode ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Nama</TableHead>
                    <TableHead className="min-w-[140px]">Role</TableHead>
                    <TableHead className="min-w-[140px]">Posisi</TableHead>
                    <TableHead className="text-center min-w-[100px]">Tugas Selesai</TableHead>
                    <TableHead className="text-center min-w-[100px]">Total Tugas</TableHead>
                    <TableHead className="min-w-[180px]">Completion</TableHead>
                    <TableHead className="text-center min-w-[80px]">Konten</TableHead>
                    <TableHead className="text-center min-w-[80px]">Artikel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.teamProductivity.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-slate-900">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[t.role] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {ROLE_LABELS[t.role] || t.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{t.position || "-"}</TableCell>
                      <TableCell className="text-center text-blue-700 font-medium">{t.tasksDone}</TableCell>
                      <TableCell className="text-center">{t.tasksTotal}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={t.completionRate} className="h-2 flex-1" />
                          <span className={`text-xs font-semibold w-9 text-right ${
                            t.completionRate >= 70 ? "text-blue-700" : t.completionRate >= 40 ? "text-amber-700" : "text-rose-700"
                          }`}>
                            {t.completionRate}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{t.contents}</TableCell>
                      <TableCell className="text-center">{t.articles}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================ Skeleton ============================

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
        ))}
      </div>
    </div>
  );
}
