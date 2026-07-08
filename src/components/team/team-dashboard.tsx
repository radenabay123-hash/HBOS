"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw, ListTodo, Film, FileText, CheckCircle2, Clock, AlertCircle,
  TrendingUp, Target, CalendarDays, Wallet, Users, BarChart3, Eye,
  Heart, Share2, Bookmark, MessageCircle, UserPlus, FileCheck, Trophy,
  FileStack, ExternalLink, Percent,
} from "lucide-react";
import { StatCard, SectionHeader, IndicatorBadge } from "@/components/shared/stat-card";
import { BarChartCard, LineChartCard, PieChartCard, AreaChartCard, ChartCard, chartColors } from "@/components/shared/charts";
import { api } from "@/lib/api-client";
import {
  formatCurrency, formatNumber, formatDate,
  ROLES, ROLE_LABELS,
  TASK_STATUS_LABELS, TASK_STATUS_COLORS,
  ACC_STATUS_LABELS, ACC_STATUS_COLORS,
  CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS,
} from "@/lib/constants";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { toast } from "sonner";

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function TeamDashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [kpiScore, setKpiScore] = useState<any>(null);
  const [myResponsibilities, setMyResponsibilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [d, kpi, resp] = await Promise.all([
        api(`/api/dashboard/team?year=${year}&month=${month}`),
        api<{ score: any }>("/api/kpi/score").catch(() => ({ score: null })),
        api<{ grouped: Record<string, any[]> }>("/api/role-responsibilities").catch(() => ({ grouped: {} })),
      ]);
      setData(d);
      setKpiScore(kpi.score);
      // Set current user's role responsibilities
      const userRole = d.user?.role || data?.user?.role;
      if (userRole && resp.grouped) {
        setMyResponsibilities(resp.grouped[userRole] || []);
      }
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
        <RefreshCw className="w-6 h-6 animate-spin text-slate-600" />
      </div>
    );
  }

  const d = data;
  const u = d.user;
  const todayTaskDone = d.todayTasks.filter((t: any) => t.status === "SELESAI").length;
  const todayTaskProgress = d.todayTasks.length > 0 ? Math.round((todayTaskDone / d.todayTasks.length) * 100) : 0;

  function handleExport() {
    const rows = d.myContents.map((c: any) => ({
      Judul: c.judul, Kategori: c.kategori, "Status ACC": ACC_STATUS_LABELS[c.statusACC] || c.statusACC,
      "Status Publish": c.statusPublish, Tanggal: formatDate(c.tanggal),
    }));
    exportToExcel(rows, `Konten-${u.name}-${month}-${year}`, "Konten");
    toast.success("Data diunduh");
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-blue-100 text-sm">Selamat datang kembali,</p>
            <h1 className="text-2xl font-bold">{u.name}</h1>
            <p className="text-blue-100 text-sm mt-1">{u.roleLabel} · {u.position || ""}</p>
            {kpiScore && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-blue-100">KPI Score Anda:</span>
                <span className={`text-2xl font-bold ${kpiScore.weightedScore >= 90 ? "text-blue-400" : kpiScore.weightedScore >= 80 ? "text-cyan-400" : kpiScore.weightedScore >= 70 ? "text-amber-400" : "text-rose-400"}`}>
                  {kpiScore.weightedScore}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${kpiScore.weightedScore >= 90 ? "bg-blue-500/20 text-blue-300" : kpiScore.weightedScore >= 80 ? "bg-cyan-500/20 text-cyan-300" : kpiScore.weightedScore >= 70 ? "bg-amber-500/20 text-amber-300" : "bg-rose-500/20 text-rose-300"}`}>
                  {kpiScore.category}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/20">
              {monthNames.map((m, i) => <option key={i} value={i + 1} className="text-slate-900">{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/20">
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y} className="text-slate-900">{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* My Responsibilities */}
      {myResponsibilities.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" /> Tanggung Jawab Saya ({u.roleLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {myResponsibilities.map((r: any, i: number) => (
                <div key={r.id} className="flex items-start gap-2 p-1.5 rounded-md bg-white border border-blue-100">
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-700">{r.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's overview */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Ringkasan Hari Ini</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Tugas Hari Ini" value={d.todayTasks.length} icon={ListTodo} indicator={todayTaskProgress >= 80 ? "green" : todayTaskProgress >= 50 ? "yellow" : "red"} subtitle={`${todayTaskDone} selesai`} progress={todayTaskProgress} accent="bg-blue-50 text-blue-600" />
          <StatCard title="Konten Hari Ini" value={d.contentSummary.todayContents} icon={Film} indicator="neutral" accent="bg-pink-50 text-pink-600" />
          <StatCard title="Artikel Hari Ini" value={d.articleSummary.todayArticles} icon={FileText} indicator="neutral" accent="bg-amber-50 text-amber-600" />
          <StatCard title="Konten Pending ACC" value={d.contentSummary.pending} icon={Clock} indicator={d.contentSummary.pending > 0 ? "yellow" : "green"} accent="bg-amber-50 text-amber-600" />
        </div>
      </div>

      {/* Role-specific KPIs */}
      <RoleSpecificSection role={u.role} roleData={d.roleData} year={year} month={month} />

      {/* ACC Status summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Film className="w-4 h-4 text-pink-600" /> Status Konten (ACC Owner)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{d.contentSummary.acc}</p>
                <p className="text-[10px] text-slate-500 mt-1">ACC</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-700">{d.contentSummary.pending}</p>
                <p className="text-[10px] text-slate-500 mt-1">Pending</p>
              </div>
              <div className="bg-rose-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-rose-700">{d.contentSummary.revisi}</p>
                <p className="text-[10px] text-slate-500 mt-1">Revisi</p>
              </div>
              <div className="bg-sky-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-sky-700">{d.contentSummary.published}</p>
                <p className="text-[10px] text-slate-500 mt-1">Published</p>
              </div>
            </div>
            {d.contentSummary.revisi > 0 && (
              <div className="mt-3 flex items-start gap-2 bg-rose-50 rounded-lg p-3 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Ada {d.contentSummary.revisi} konten yang perlu direvisi. Buka menu Tugas Konten untuk melihat catatan revisi dari owner.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-amber-600" /> Status Artikel (ACC Owner)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{d.articleSummary.acc}</p>
                <p className="text-[10px] text-slate-500 mt-1">ACC</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-700">{d.articleSummary.pending}</p>
                <p className="text-[10px] text-slate-500 mt-1">Pending</p>
              </div>
              <div className="bg-rose-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-rose-700">{d.articleSummary.revisi}</p>
                <p className="text-[10px] text-slate-500 mt-1">Revisi</p>
              </div>
              <div className="bg-sky-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-sky-700">{d.articleSummary.published}</p>
                <p className="text-[10px] text-slate-500 mt-1">Published</p>
              </div>
            </div>
            {d.articleSummary.revisi > 0 && (
              <div className="mt-3 flex items-start gap-2 bg-rose-50 rounded-lg p-3 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Ada {d.articleSummary.revisi} artikel yang perlu direvisi. Buka menu Data Artikel.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's tasks list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ListTodo className="w-4 h-4 text-slate-600" /> Tugas Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {d.todayTasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Belum ada tugas hari ini. Tambahkan di menu Tugas Harian.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {d.todayTasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{t.taskHariIni}</p>
                    <p className="text-xs text-slate-500">{t.hambatan ? `Hambatan: ${t.hambatan}` : t.progress || "Tidak ada catatan"}</p>
                  </div>
                  <div className="w-24 shrink-0">
                    <Progress value={t.persentaseSelesai} className="h-1.5" />
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${TASK_STATUS_COLORS[t.status]}`}>{TASK_STATUS_LABELS[t.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly chart */}
      <BarChartCard
        title={`Produktivitas Bulanan ${year}`}
        data={d.monthlyData}
        keys={[
          { key: "contents", label: "Konten", color: "#db2777" },
          { key: "articles", label: "Artikel", color: "#ca8a04" },
          { key: "tasksDone", label: "Tugas Selesai", color: "#2563eb" },
        ]}
        height={280}
      />

      {/* Yearly chart */}
      <LineChartCard
        title="Tren Tahunan (5 Tahun)"
        data={d.yearlyData}
        keys={[
          { key: "contents", label: "Konten", color: "#db2777" },
          { key: "articles", label: "Artikel", color: "#ca8a04" },
          { key: "tasksDone", label: "Tugas Selesai", color: "#2563eb" },
        ]}
        height={260}
      />

      {/* Recent content & articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Konten Terbaru</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleExport}><FileStack className="w-3 h-3 mr-1" /> Export</Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {d.myContents.slice(0, 8).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.judul}</p>
                      <p className="text-[10px] text-slate-500">{c.kategori}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${ACC_STATUS_COLORS[c.statusACC]}`}>{ACC_STATUS_LABELS[c.statusACC]}</Badge>
                  </div>
                ))}
                {d.myContents.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Belum ada konten</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Artikel Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {d.myArticles.slice(0, 8).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{a.judulArtikel}</p>
                      <p className="text-[10px] text-slate-500">{a.websiteTujuan}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${a.statusACC === "ACC" ? "bg-blue-100 text-blue-700 border-blue-200" : a.statusACC === "REVISI_ADMIN" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                      {a.statusACC === "ACC" ? "ACC" : a.statusACC === "REVISI_ADMIN" ? "Revisi" : "Pending"}
                    </Badge>
                  </div>
                ))}
                {d.myArticles.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Belum ada artikel</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===== Role-specific section =====
function RoleSpecificSection({ role, roleData, year, month }: { role: string; roleData: any; year: number; month: number }) {
  if (role === ROLES.PROJECT_MANAGER) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">CRM & Pipeline</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Total Klien" value={roleData.totalClients} icon={Users} indicator="neutral" accent="bg-violet-50 text-violet-600" />
          <StatCard title="Total Deal" value={roleData.pipeline.DEAL} icon={CheckCircle2} indicator="green" subtitle={formatCurrency(roleData.dealRevenue)} accent="bg-blue-50 text-blue-600" />
          <StatCard title="Event Bulan Ini" value={roleData.eventsThisMonth} icon={CalendarDays} indicator="neutral" accent="bg-amber-50 text-amber-600" />
          <StatCard title="Total Dokumen" value={roleData.documents} icon={FileStack} indicator="neutral" accent="bg-cyan-50 text-cyan-600" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Pipeline CRM</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(roleData.pipeline).map(([status, count]: any) => (
                  <div key={status} className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs w-24 justify-center ${CLIENT_STATUS_COLORS[status] || ""}`}>{CLIENT_STATUS_LABELS[status] || status}</Badge>
                    <div className="flex-1"><Progress value={roleData.totalClients > 0 ? (count / roleData.totalClients) * 100 : 0} className="h-2" /></div>
                    <span className="text-sm font-semibold w-8 text-right">{count as number}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Event Mendatang</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {roleData.upcomingEvents.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Tidak ada event mendatang</p> :
                  roleData.upcomingEvents.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                      <CalendarDays className="w-4 h-4 text-violet-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.namaEvent}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(e.tanggal)} · {e.lokasi || "-"}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (role === ROLES.ASSISTANT_TRAINER) {
    const k = roleData.kpis;
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">KPI Assistant Trainer</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Reels Diproduksi Hari Ini" value={`${k.reelsProducedToday}/${k.reelsTargetToday}`} icon={Film} indicator={k.reelsProducedToday >= k.reelsTargetToday ? "green" : "yellow"} accent="bg-pink-50 text-pink-600" />
          <StatCard title="Reels Dipublish Hari Ini" value={`${k.reelsPublishedToday}/${k.reelsPublishTargetToday}`} icon={CheckCircle2} indicator={k.reelsPublishedToday >= k.reelsPublishTargetToday ? "green" : "yellow"} accent="bg-blue-50 text-blue-600" />
          <StatCard title="Artikel Mingguan" value={`${k.articlesWeekly}/${k.articlesWeeklyTarget}`} icon={FileText} indicator={k.articlesWeekly >= k.articlesWeeklyTarget ? "green" : "red"} accent="bg-amber-50 text-amber-600" />
          <StatCard title="Backup Website" value="2 Minggu" icon={FileCheck} indicator="neutral" accent="bg-cyan-50 text-cyan-600" />
        </div>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Event Saya</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {roleData.upcomingMyEvents.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Tidak ada event</p> :
                roleData.upcomingMyEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                    <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.namaEvent}</p>
                      <p className="text-[10px] text-slate-500">{formatDate(e.tanggal)} · {e.lokasi || "-"}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{e.statusPersiapan}</Badge>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role === ROLES.CONTENT_CREATIVE) {
    const k = roleData.kpis;
    const ev = roleData.evaluation;
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">KPI Content Creative</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Ide Konten Hari Ini" value={`${k.ideasToday}/${k.ideasTargetToday}`} icon={Target} indicator={k.ideasToday >= k.ideasTargetToday ? "green" : "yellow"} accent="bg-violet-50 text-violet-600" />
          <StatCard title="Reels Diproduksi" value={`${k.reelsProducedToday}/${k.reelsProducedTargetToday}`} icon={Film} indicator={k.reelsProducedToday >= k.reelsProducedTargetToday ? "green" : "yellow"} accent="bg-pink-50 text-pink-600" />
          <StatCard title="Reels Dipublish" value={`${k.reelsPublishedToday}/${k.reelsPublishTargetToday}`} icon={CheckCircle2} indicator={k.reelsPublishedToday >= k.reelsPublishTargetToday ? "green" : "yellow"} accent="bg-blue-50 text-blue-600" />
          <StatCard title="Artikel SEO Hari Ini" value={`${k.articlesToday}/${k.articlesTargetToday}`} icon={FileText} indicator={k.articlesToday >= k.articlesTargetToday ? "green" : "red"} accent="bg-amber-50 text-amber-600" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Target Mingguan</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2"><span className="text-sm w-32">Ide Konten</span><Progress value={(k.weeklyIdeas / k.weeklyIdeasTarget) * 100} className="h-2 flex-1" /><span className="text-sm font-semibold w-16 text-right">{k.weeklyIdeas}/{k.weeklyIdeasTarget}</span></div>
                <div className="flex items-center gap-2"><span className="text-sm w-32">Reels</span><Progress value={(k.weeklyReels / k.weeklyReelsTarget) * 100} className="h-2 flex-1" /><span className="text-sm font-semibold w-16 text-right">{k.weeklyReels}/{k.weeklyReelsTarget}</span></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Evaluasi Konten</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-50 rounded-lg p-2"><Eye className="w-4 h-4 mx-auto text-cyan-600" /><p className="text-lg font-bold mt-1">{formatNumber(ev.reach)}</p><p className="text-[10px] text-slate-500">Reach</p></div>
                <div className="bg-slate-50 rounded-lg p-2"><BarChart3 className="w-4 h-4 mx-auto text-violet-600" /><p className="text-lg font-bold mt-1">{formatNumber(ev.views)}</p><p className="text-[10px] text-slate-500">Views</p></div>
                <div className="bg-slate-50 rounded-lg p-2"><Share2 className="w-4 h-4 mx-auto text-blue-600" /><p className="text-lg font-bold mt-1">{formatNumber(ev.share)}</p><p className="text-[10px] text-slate-500">Share</p></div>
                <div className="bg-slate-50 rounded-lg p-2"><UserPlus className="w-4 h-4 mx-auto text-pink-600" /><p className="text-lg font-bold mt-1">{formatNumber(ev.followerGrowth)}</p><p className="text-[10px] text-slate-500">Follower+</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (role === ROLES.DIGITAL_MARKETING_IT) {
    const k = roleData.kpis;
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">KPI Digital Marketing & IT</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Artikel SEO Hari Ini" value={`${k.articlesToday}/${k.articlesTargetToday}`} icon={FileText} indicator={k.articlesToday >= k.articlesTargetToday ? "green" : "red"} accent="bg-amber-50 text-amber-600" />
          <StatCard title="Optimasi Website" value={`${k.websiteOptimizationToday}/${k.websiteOptimizationTarget}`} icon={CheckCircle2} indicator="green" accent="bg-cyan-50 text-cyan-600" />
          <StatCard title="Materi Promosi" value={`${k.promoMaterialToday}/${k.promoMaterialTarget}`} icon={Target} indicator="green" accent="bg-violet-50 text-violet-600" />
          <StatCard title="Analisis Kompetitor" value={`${k.competitorAnalysisToday}/${k.competitorAnalysisTarget}`} icon={BarChart3} indicator="green" accent="bg-sky-50 text-sky-600" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Artikel per Website</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roleData.articlesByWebsite.map((w: any) => (
                  <div key={w.name} className="flex items-center gap-2">
                    <span className="text-sm w-40 truncate">{w.name}</span>
                    <div className="flex-1"><Progress value={w.value > 0 ? 100 : 0} className="h-2" /></div>
                    <span className="text-sm font-semibold w-8 text-right">{w.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Peningkatan Mingguan</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-3"><TrendingUp className="w-4 h-4 mx-auto text-blue-600" /><p className="text-lg font-bold mt-1">{roleData.weekly.traffic}</p><p className="text-[10px] text-slate-500">Traffic</p></div>
                <div className="bg-cyan-50 rounded-lg p-3"><BarChart3 className="w-4 h-4 mx-auto text-cyan-600" /><p className="text-lg font-bold mt-1">{roleData.weekly.seoRanking}</p><p className="text-[10px] text-slate-500">SEO Rank</p></div>
                <div className="bg-violet-50 rounded-lg p-3"><UserPlus className="w-4 h-4 mx-auto text-violet-600" /><p className="text-lg font-bold mt-1">{roleData.weekly.leads}</p><p className="text-[10px] text-slate-500">Leads</p></div>
                <div className="bg-pink-50 rounded-lg p-3"><Heart className="w-4 h-4 mx-auto text-pink-600" /><p className="text-lg font-bold mt-1">{roleData.weekly.engagement}</p><p className="text-[10px] text-slate-500">Engagement</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (role === ROLES.FINANCE) {
    const r = roleData;
    const marginIndicator = r.margin >= 30 ? "green" : r.margin >= 15 ? "yellow" : "red";
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">KPI Finance</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Revenue Bulan Ini" value={formatCurrency(r.revenue)} icon={Wallet} indicator={r.revenue >= r.targetRevenue ? "green" : "yellow"} subtitle={`Target: ${formatCurrency(r.targetRevenue)}`} progress={r.targetRevenue > 0 ? Math.round((r.revenue / r.targetRevenue) * 100) : 0} accent="bg-blue-50 text-blue-600" />
          <StatCard title="Expense Bulan Ini" value={formatCurrency(r.expense)} icon={TrendingUp} indicator="neutral" accent="bg-rose-50 text-rose-600" />
          <StatCard title="Profit Bulan Ini" value={formatCurrency(r.profit)} icon={BarChart3} indicator={r.profit >= r.targetProfit ? "green" : "yellow"} subtitle={`Target: ${formatCurrency(r.targetProfit)}`} accent="bg-sky-50 text-sky-600" />
          <StatCard title="Margin" value={`${r.margin}%`} icon={Percent} indicator={marginIndicator} accent="bg-cyan-50 text-cyan-600" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Cash Flow" value={formatCurrency(r.cashFlow)} icon={Wallet} indicator={r.cashFlow >= 0 ? "green" : "red"} accent="bg-blue-50 text-blue-600" />
          <StatCard title="Piutang" value={formatCurrency(r.piutang)} icon={FileText} indicator="neutral" accent="bg-amber-50 text-amber-600" />
          <StatCard title="Hutang" value={formatCurrency(r.hutang)} icon={FileStack} indicator="neutral" accent="bg-rose-50 text-rose-600" />
          <StatCard title="Forecast" value={formatCurrency(r.forecast)} icon={Target} indicator="neutral" accent="bg-violet-50 text-violet-600" />
        </div>
        <BarChartCard
          title={`Revenue vs Expense vs Profit ${year}`}
          data={r.financeMonthly}
          keys={[
            { key: "revenue", label: "Revenue", color: "#2563eb" },
            { key: "expense", label: "Expense", color: "#f43f5e" },
            { key: "profit", label: "Profit", color: "#0891b2" },
          ]}
          height={260}
          formatY={(v) => `${(v / 1000000).toFixed(0)}M`}
        />
      </div>
    );
  }

  return null;
}
