"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, FileText, Handshake, Percent, CalendarDays, Wallet, Target,
  Film, FileEdit, TrendingUp, Heart, Share2, Bookmark, MessageCircle,
  UserPlus, DollarSign, BarChart3, AlertCircle, CheckCircle2, Clock,
  FileStack, Trophy, RefreshCw, ExternalLink, FileCheck, FileX, Bot,
} from "lucide-react";
import { StatCard, SectionHeader, IndicatorBadge } from "@/components/shared/stat-card";
import { BarChartCard, LineChartCard, PieChartCard, AreaChartCard, ChartCard, chartColors } from "@/components/shared/charts";
import { api } from "@/lib/api-client";
import { formatCurrency, formatNumber, formatDate, getIndicatorColor } from "@/lib/constants";
import { exportToExcel, exportReportPDF } from "@/lib/export-utils";
import { toast } from "sonner";

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function OwnerDashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [kpiScores, setKpiScores] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [d, kpi, insight] = await Promise.all([
        api(`/api/dashboard/owner?year=${year}&month=${month}`),
        api<{ scores: any[] }>("/api/kpi/team-scores").catch(() => ({ scores: [] })),
        api<{ insight: string }>(`/api/finance/ai-insight?year=${year}&month=${month}`).catch(() => ({ insight: "" })),
      ]);
      setData(d);
      setKpiScores(kpi.scores || []);
      setAiInsight(insight.insight || "");
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [year, month]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const d = data;
  const revIndicator = getIndicatorColor(d.finance.revenueThisMonth, d.finance.targetRevenue) as any;
  const profitIndicator = getIndicatorColor(d.finance.profitThisMonth, d.finance.targetProfit) as any;
  const convIndicator = d.crm.conversionRate >= 30 ? "green" : d.crm.conversionRate >= 15 ? "yellow" : "red";

  function handleExportExcel() {
    if (!d) return;
    const rows = d.monthlyData.map((m: any) => ({
      Bulan: m.month, Revenue: m.revenue, Expense: m.expense, Profit: m.profit,
      Deal: m.deals, Konten: m.contents, Artikel: m.articles, Event: m.events, Lead: m.leads,
    }));
    exportToExcel(rows, `Laporan-Owner-${year}-${month}`, "Dashboard");
    toast.success("Excel diunduh");
  }

  function handleExportPDF() {
    if (!d) return;
    exportReportPDF(
      `Laporan Dashboard Owner - ${monthNames[month - 1]} ${year}`,
      [
        { heading: "Ringkasan KPI", columns: ["KPI", "Nilai"], rows: [
          ["Total Lead", d.crm.totalLead], ["Total Proposal", d.crm.totalProposal],
          ["Total Deal", d.crm.totalDeal], ["Conversion Rate", d.crm.conversionRate + "%"],
          ["Revenue Bulan Ini", formatCurrency(d.finance.revenueThisMonth)],
          ["Expense Bulan Ini", formatCurrency(d.finance.expenseThisMonth)],
          ["Profit Bulan Ini", formatCurrency(d.finance.profitThisMonth)],
          ["Target Revenue", formatCurrency(d.finance.targetRevenue)],
          ["Total Konten Dipublikasi", d.content.totalContentPublished],
          ["Total Artikel SEO", d.articles.totalArticlesPublished],
          ["Engagement Rate", d.content.engagementRate + "%"],
        ]},
        { heading: "Data Bulanan", columns: ["Bulan", "Revenue", "Expense", "Profit", "Deal", "Konten", "Artikel"], rows: d.monthlyData.map((m: any) => [m.month, formatCurrency(m.revenue), formatCurrency(m.expense), formatCurrency(m.profit), m.deals, m.contents, m.articles]) },
        { heading: "Klien Deal dengan Dokumen", columns: ["Klien", "Budget", "Invoice", "SPK", "Surat"], rows: d.dealClientsWithDocs.map((c: any) => [c.namaKlien, formatCurrency(c.budget || 0), c.hasInvoice ? "Ada" : "Tidak Ada", c.hasSpk ? "Ada" : "Tidak Ada", c.hasSurat ? "Ada" : "Tidak Ada"]) },
      ],
      `Laporan-Owner-${year}-${month}`
    );
    toast.success("PDF diunduh");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Dashboard Owner"
        description="Pantau seluruh aktivitas bisnis secara real-time"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportExcel}><FileStack className="w-4 h-4 mr-1" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
          </div>
        }
      />

      {/* KPI Score Summary - Team Productivity */}
      {kpiScores.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-blue-600" />
              KPI Score Tim - Productivity Score
              <Badge variant="outline" className="ml-auto text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                Rata-rata: {Math.round(kpiScores.reduce((s: number, x: any) => s + x.weightedScore, 0) / kpiScores.length)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {kpiScores.map((s: any) => {
                const cat = s.weightedScore >= 90 ? { bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-50", label: "Excellent" }
                  : s.weightedScore >= 80 ? { bg: "bg-cyan-500", text: "text-cyan-700", light: "bg-cyan-50", label: "Good" }
                  : s.weightedScore >= 70 ? { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50", label: "Need Coaching" }
                  : { bg: "bg-rose-500", text: "text-rose-700", light: "bg-rose-50", label: "Warning" };
                return (
                  <div key={s.userId} className={`rounded-lg p-3 border ${cat.light} border-slate-200`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{s.userName}</p>
                      <span className={`text-lg font-bold ${cat.text}`}>{s.weightedScore}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">{s.roleLabel}</p>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                        <div className={`h-full ${cat.bg} rounded-full`} style={{ width: `${s.weightedScore}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>H: {s.daily.achievementRate}%</span>
                      <span>M: {s.weekly.achievementRate}%</span>
                      <span>B: {s.monthly.achievementRate}%</span>
                    </div>
                    <Badge variant="outline" className={`text-[9px] mt-1 ${cat.light} ${cat.text} border-slate-200`}>{cat.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Finance Insight */}
      {aiInsight && (
        <Card className="border-blue-200 shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 rounded-t-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">AI Insight Keuangan</h3>
              <p className="text-blue-100 text-xs">Analisis otomatis kondisi keuangan bulan ini</p>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{aiInsight}</div>
          </CardContent>
        </Card>
      )}

      {/* CRM & Sales KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">CRM & Penjualan</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Lead Masuk" value={d.crm.totalLead} icon={UserPlus} indicator="yellow" accent="bg-amber-50 text-amber-600" />
          <StatCard title="Proposal Terkirim" value={d.crm.totalProposal} icon={FileText} indicator="yellow" accent="bg-violet-50 text-violet-600" />
          <StatCard title="Total Deal" value={d.crm.totalDeal} icon={Handshake} indicator="green" subtitle={formatCurrency(d.crm.dealRevenue)} accent="bg-blue-50 text-blue-600" />
          <StatCard title="Conversion Rate" value={`${d.crm.conversionRate}%`} icon={Percent} indicator={convIndicator} subtitle={`${d.crm.totalClients} total klien`} accent="bg-sky-50 text-sky-600" />
        </div>
      </div>

      {/* Finance KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Keuangan</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Revenue Bulan Ini" value={formatCurrency(d.finance.revenueThisMonth)} icon={Wallet} indicator={revIndicator} subtitle={`Target: ${formatCurrency(d.finance.targetRevenue)}`} progress={d.finance.revenueAchievement} accent="bg-blue-50 text-blue-600" />
          <StatCard title="Profit Bulan Ini" value={formatCurrency(d.finance.profitThisMonth)} icon={TrendingUp} indicator={profitIndicator} subtitle={`Target: ${formatCurrency(d.finance.targetProfit)}`} progress={d.finance.profitAchievement} accent="bg-sky-50 text-sky-600" />
          <StatCard title="Expense Bulan Ini" value={formatCurrency(d.finance.expenseThisMonth)} icon={DollarSign} indicator="neutral" accent="bg-rose-50 text-rose-600" />
          <StatCard title="Profit Estimation" value={formatCurrency(d.finance.profitEstimation)} icon={BarChart3} indicator="neutral" subtitle="Rata-rata/bulan" accent="bg-cyan-50 text-cyan-600" />
        </div>
      </div>

      {/* Events & Content KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Event Bulan Ini" value={d.events.eventsThisMonth} icon={CalendarDays} indicator="neutral" accent="bg-violet-50 text-violet-600" />
        <StatCard title="Total Konten Diproduksi" value={d.content.totalContentProduced} icon={Film} indicator="neutral" subtitle={`${d.content.totalContentPublished} dipublikasi`} accent="bg-pink-50 text-pink-600" />
        <StatCard title="Total Artikel SEO" value={d.articles.totalArticlesPublished} icon={FileEdit} indicator="neutral" subtitle={`${d.articles.totalArticles} total`} accent="bg-amber-50 text-amber-600" />
        <StatCard title="Engagement Rate" value={`${d.content.engagementRate}%`} icon={Heart} indicator="neutral" subtitle={`${formatNumber(d.content.totalViews)} views`} accent="bg-rose-50 text-rose-600" />
      </div>

      {/* Social Growth */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Followers Growth" value={formatNumber(d.content.totalFollowerGrowth)} icon={UserPlus} indicator="green" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Total Reach" value={formatNumber(d.content.totalReach)} icon={TrendingUp} indicator="neutral" accent="bg-cyan-50 text-cyan-600" />
        <StatCard title="Total Share" value={formatNumber(d.content.totalShare)} icon={Share2} indicator="neutral" accent="bg-violet-50 text-violet-600" />
        <StatCard title="Total Save" value={formatNumber(d.content.totalSave)} icon={Bookmark} indicator="neutral" accent="bg-amber-50 text-amber-600" />
      </div>

      {/* Pending ACC alerts */}
      {(d.content.pendingAccContents > 0 || d.articles.pendingAccArticles > 0) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-amber-800">Menunggu Persetujuan Owner: </span>
              <span className="text-amber-700">
                {d.content.pendingAccContents} konten{d.articles.pendingAccArticles > 0 ? `, ${d.articles.pendingAccArticles} artikel` : ""}. Buka menu Tugas Konten / Data Artikel untuk ACC.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts row 1 - Monthly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartCard
          title={`Revenue vs Expense vs Profit - ${year}`}
          data={d.monthlyData}
          keys={[
            { key: "revenue", label: "Revenue", color: "#2563eb" },
            { key: "expense", label: "Expense", color: "#f43f5e" },
            { key: "profit", label: "Profit", color: "#0891b2" },
          ]}
          height={280}
          formatY={(v) => `${(v / 1000000).toFixed(0)}M`}
        />
        <LineChartCard
          title="Aktivitas Bisnis Bulanan"
          data={d.monthlyData}
          keys={[
            { key: "deals", label: "Deal", color: "#2563eb" },
            { key: "leads", label: "Lead", color: "#0891b2" },
            { key: "contents", label: "Konten", color: "#db2777" },
            { key: "articles", label: "Artikel", color: "#ca8a04" },
          ]}
          height={280}
        />
      </div>

      {/* Charts row 2 - Pie + Yearly */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PieChartCard title="CRM Pipeline" data={d.crm.crmPipeline} height={260} />
        <PieChartCard title="Konten per Kategori" data={d.content.contentByCategory} height={260} />
        <BarChartCard
          title="Tahunan (5 Tahun)"
          data={d.yearlyData}
          keys={[
            { key: "revenue", label: "Revenue", color: "#2563eb" },
            { key: "profit", label: "Profit", color: "#0891b2" },
          ]}
          height={260}
          formatY={(v) => `${(v / 1000000).toFixed(0)}M`}
        />
      </div>

      {/* Deal Clients with Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            Klien Deal - Status Dokumen (Invoice, SPK, Surat)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {d.dealClientsWithDocs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Belum ada klien deal</p>
          ) : (
            <ScrollArea className="max-h-80">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-xs text-slate-500">
                    <th className="py-2 pr-2 font-medium">Klien</th>
                    <th className="py-2 px-2 font-medium">Instansi</th>
                    <th className="py-2 px-2 font-medium text-right">Budget</th>
                    <th className="py-2 px-2 font-medium text-center">Invoice</th>
                    <th className="py-2 px-2 font-medium text-center">SPK</th>
                    <th className="py-2 px-2 font-medium text-center">Surat</th>
                  </tr>
                </thead>
                <tbody>
                  {d.dealClientsWithDocs.map((c: any) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 pr-2 font-medium text-slate-900">{c.namaKlien}</td>
                      <td className="py-2 px-2 text-slate-600">{c.instansi || "-"}</td>
                      <td className="py-2 px-2 text-right text-slate-700">{formatCurrency(c.budget || 0)}</td>
                      <td className="py-2 px-2 text-center">{c.hasInvoice ? <CheckCircle2 className="w-4 h-4 text-blue-600 inline" /> : <FileX className="w-4 h-4 text-rose-400 inline" />}</td>
                      <td className="py-2 px-2 text-center">{c.hasSpk ? <CheckCircle2 className="w-4 h-4 text-blue-600 inline" /> : <FileX className="w-4 h-4 text-rose-400 inline" />}</td>
                      <td className="py-2 px-2 text-center">{c.hasSurat ? <CheckCircle2 className="w-4 h-4 text-blue-600 inline" /> : <FileX className="w-4 h-4 text-rose-400 inline" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Team Productivity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-blue-600" />
            Produktivitas Tim - {monthNames[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {d.teamProductivity.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="w-32 shrink-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-500">{t.position || t.role}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Progress value={t.completionRate} className="h-2" />
                    <span className="text-xs font-medium text-slate-600 w-10 text-right">{t.completionRate}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {t.tasksDone}/{t.tasksTotal} tugas · {t.contents} konten · {t.articles} artikel
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
