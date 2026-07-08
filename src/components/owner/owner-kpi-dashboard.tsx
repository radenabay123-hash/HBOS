"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Avatar, AvatarFallback,
} from "@/components/ui/avatar";
import {
  RefreshCw, Trophy, Award, Target, TrendingUp, AlertCircle, CheckCircle2,
  Crown, Medal, FileText, Star, Zap, Clock, Calendar, Pencil, Edit3,
} from "lucide-react";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import { BarChartCard } from "@/components/shared/charts";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { exportToExcel, exportReportPDF } from "@/lib/export-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KpiScore {
  userId: string;
  userName: string;
  role: string;
  roleLabel: string;
  daily: { achievementRate: number; items: any[]; totalTarget: number; totalActual: number };
  weekly: { achievementRate: number; items: any[]; totalTarget: number; totalActual: number };
  monthly: { achievementRate: number; items: any[]; totalTarget: number; totalActual: number };
  deadlineScore: number;
  qualityScore: number;
  weightedScore: number;
  category: string;
  categoryColor: string;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function getCategoryStyle(score: number) {
  if (score >= 90) return { label: "Excellent", bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-50", border: "border-blue-200", gradient: "from-blue-500 to-sky-600", indicator: "green" as const };
  if (score >= 80) return { label: "Good", bg: "bg-cyan-500", text: "text-cyan-700", light: "bg-cyan-50", border: "border-cyan-200", gradient: "from-cyan-500 to-blue-500", indicator: "blue" as const };
  if (score >= 70) return { label: "Need Coaching", bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50", border: "border-amber-200", gradient: "from-amber-500 to-orange-500", indicator: "yellow" as const };
  return { label: "Warning", bg: "bg-rose-500", text: "text-rose-700", light: "bg-rose-50", border: "border-rose-200", gradient: "from-rose-500 to-red-600", indicator: "red" as const };
}

export function OwnerKpiDashboard() {
  const [scores, setScores] = useState<KpiScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [targetDialog, setTargetDialog] = useState<{ open: boolean; role: string; period: string; item: any }>({ open: false, role: "", period: "", item: null });
  const [newTarget, setNewTarget] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  const [kpiInputDialog, setKpiInputDialog] = useState<{ open: boolean; userId: string; userName: string; items: any[]; period: string }>({ open: false, userId: "", userName: "", items: [], period: "daily" });
  const [kpiValues, setKpiValues] = useState<Record<string, string>>({});
  const [savingKpi, setSavingKpi] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const d = await api<{ scores: KpiScore[] }>("/api/kpi/team-scores");
      setScores(d.scores);
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat KPI scores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSaveTarget() {
    if (!targetDialog.item || !newTarget) return;
    setSavingTarget(true);
    try {
      await api("/api/kpi/targets", {
        method: "PUT",
        body: JSON.stringify({
          role: targetDialog.role,
          period: targetDialog.period,
          key: targetDialog.item.key,
          newTarget: Number(newTarget),
        }),
      });
      toast.success("Target KPI diperbarui");
      setTargetDialog({ open: false, role: "", period: "", item: null });
      setNewTarget("");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan target");
    } finally {
      setSavingTarget(false);
    }
  }

  function openKpiInput(userId: string, userName: string, items: any[], period: string) {
    const vals: Record<string, string> = {};
    items.forEach((it: any) => { vals[it.key] = String(it.actual || 0); });
    setKpiValues(vals);
    setKpiInputDialog({ open: true, userId, userName, items, period });
  }

  async function handleSaveKpi() {
    setSavingKpi(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(
        Object.entries(kpiValues).map(([key, value]) =>
          api("/api/kpi/logs", {
            method: "POST",
            body: JSON.stringify({ userId: kpiInputDialog.userId, metricKey: key, value: Number(value) || 0, date: today }),
          })
        )
      );
      toast.success(`KPI ${kpiInputDialog.userName} (${kpiInputDialog.period}) diperbarui`);
      setKpiInputDialog({ open: false, userId: "", userName: "", items: [], period: "daily" });
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan KPI");
    } finally {
      setSavingKpi(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const sorted = [...scores].sort((a, b) => b.weightedScore - a.weightedScore);
  const avgScore = sorted.length > 0 ? Math.round(sorted.reduce((s, x) => s + x.weightedScore, 0) / sorted.length) : 0;
  const excellent = sorted.filter((s) => s.weightedScore >= 90).length;
  const good = sorted.filter((s) => s.weightedScore >= 80 && s.weightedScore < 90).length;
  const coaching = sorted.filter((s) => s.weightedScore >= 70 && s.weightedScore < 80).length;
  const warning = sorted.filter((s) => s.weightedScore < 70).length;
  const top3 = sorted.slice(0, 3);

  function handleExportExcel() {
    const rows = sorted.map((s, i) => ({
      Peringkat: i + 1,
      Nama: s.userName,
      Jabatan: s.roleLabel,
      "Skor Harian (30%)": s.daily.achievementRate,
      "Skor Mingguan (25%)": s.weekly.achievementRate,
      "Skor Bulanan (25%)": s.monthly.achievementRate,
      "Deadline (10%)": s.deadlineScore,
      "Kualitas (10%)": s.qualityScore,
      "Skor Total": s.weightedScore,
      Kategori: s.category,
    }));
    exportToExcel(rows, "KPI-Score-Tim", "KPI Scores");
    toast.success("Excel diunduh");
  }

  function handleExportPDF() {
    exportReportPDF(
      "Laporan KPI Score Tim",
      [
        { heading: "Ringkasan KPI Score", columns: ["#", "Nama", "Jabatan", "Harian", "Mingguan", "Bulanan", "Deadline", "Kualitas", "Total", "Kategori"], rows: sorted.map((s, i) => [i + 1, s.userName, s.roleLabel, s.daily.achievementRate + "%", s.weekly.achievementRate + "%", s.monthly.achievementRate + "%", s.deadlineScore + "%", s.qualityScore + "%", s.weightedScore, s.category]) },
      ],
      "KPI-Score-Tim"
    );
    toast.success("PDF diunduh");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard KPI Score"
        description="Skor produktivitas tim berdasarkan target Harian → Mingguan → Bulanan"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}><FileText className="w-4 h-4 mr-1" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
          </div>
        }
      />

      {/* Formula explanation card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-800 mb-1">Formula KPI Score (Total 100%)</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="bg-white rounded px-2 py-1.5 border border-blue-100"><span className="font-semibold">30%</span> Target Harian</div>
                <div className="bg-white rounded px-2 py-1.5 border border-blue-100"><span className="font-semibold">25%</span> Target Mingguan</div>
                <div className="bg-white rounded px-2 py-1.5 border border-blue-100"><span className="font-semibold">25%</span> Target Bulanan</div>
                <div className="bg-white rounded px-2 py-1.5 border border-blue-100"><span className="font-semibold">10%</span> Ketepatan Deadline</div>
                <div className="bg-white rounded px-2 py-1.5 border border-blue-100"><span className="font-semibold">10%</span> Kualitas (ACC Owner)</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">90-100: Excellent</Badge>
                <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">80-89: Good</Badge>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">70-79: Need Coaching</Badge>
                <Badge className="bg-rose-100 text-rose-700 border-rose-200">&lt;70: Warning</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Rata-rata Skor Tim" value={avgScore} icon={Award} indicator={avgScore >= 80 ? "green" : avgScore >= 70 ? "yellow" : "red"} subtitle="dari 100" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Excellent" value={excellent} icon={Crown} indicator="green" subtitle="≥90" accent="bg-blue-50 text-blue-600" />
        <StatCard title="Need Coaching" value={coaching} icon={AlertCircle} indicator={coaching > 0 ? "yellow" : "green"} subtitle="70-79" accent="bg-amber-50 text-amber-600" />
        <StatCard title="Warning" value={warning} icon={AlertCircle} indicator={warning > 0 ? "red" : "green"} subtitle="<70" accent="bg-rose-50 text-rose-600" />
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Top 3 Performa KPI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 items-end">
              {/* 2nd */}
              {top3[1] && <PodiumCard score={top3[1]} rank={2} />}
              {/* 1st */}
              {top3[0] && <PodiumCard score={top3[0]} rank={1} />}
              {/* 3rd */}
              {top3[2] && <PodiumCard score={top3[2]} rank={3} />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team KPI Score ranking table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4 text-blue-600" /> Ranking KPI Score Tim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">Nama</th>
                  <th className="py-2 px-2 font-medium">Harian<br/><span className="text-[9px] font-normal">(30%)</span></th>
                  <th className="py-2 px-2 font-medium">Mingguan<br/><span className="text-[9px] font-normal">(25%)</span></th>
                  <th className="py-2 px-2 font-medium">Bulanan<br/><span className="text-[9px] font-normal">(25%)</span></th>
                  <th className="py-2 px-2 font-medium">Deadline<br/><span className="text-[9px] font-normal">(10%)</span></th>
                  <th className="py-2 px-2 font-medium">Kualitas<br/><span className="text-[9px] font-normal">(10%)</span></th>
                  <th className="py-2 px-2 font-medium">Total</th>
                  <th className="py-2 pl-2 font-medium">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const cat = getCategoryStyle(s.weightedScore);
                  return (
                    <tr key={s.userId} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 pr-2 font-bold text-slate-400">{i + 1}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7"><AvatarFallback className={cn("text-[10px] font-semibold", cat.light, cat.text)}>{initials(s.userName)}</AvatarFallback></Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{s.userName}</p>
                            <p className="text-[10px] text-slate-500">{s.roleLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2"><ScoreCell value={s.daily.achievementRate} /></td>
                      <td className="py-2 px-2"><ScoreCell value={s.weekly.achievementRate} /></td>
                      <td className="py-2 px-2"><ScoreCell value={s.monthly.achievementRate} /></td>
                      <td className="py-2 px-2"><ScoreCell value={s.deadlineScore} /></td>
                      <td className="py-2 px-2"><ScoreCell value={s.qualityScore} /></td>
                      <td className="py-2 px-2">
                        <span className={cn("text-lg font-bold", cat.text)}>{s.weightedScore}</span>
                      </td>
                      <td className="py-2 pl-2">
                        <Badge variant="outline" className={cn("text-[10px]", cat.light, cat.text, cat.border)}>{cat.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail per team member */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-blue-600" /> Detail Target per Anggota Tim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sorted.map((s) => {
              const cat = getCategoryStyle(s.weightedScore);
              return (
                <div key={s.userId} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-9 h-9"><AvatarFallback className={cn("text-xs font-semibold", cat.light, cat.text)}>{initials(s.userName)}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-semibold text-slate-900">{s.userName}</p>
                        <p className="text-xs text-slate-500">{s.roleLabel}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-2xl font-bold", cat.text)}>{s.weightedScore}</p>
                      <Badge variant="outline" className={cn("text-[10px]", cat.light, cat.text, cat.border)}>{cat.label}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <PeriodDetail title="Target Harian" data={s.daily} role={s.role} period="daily" userId={s.userId} userName={s.userName} onEditTarget={(r, p, item) => { setTargetDialog({ open: true, role: r, period: p, item }); setNewTarget(String(item.target)); }} onInputKpi={openKpiInput} />
                    <PeriodDetail title="Target Mingguan" data={s.weekly} role={s.role} period="weekly" userId={s.userId} userName={s.userName} onEditTarget={(r, p, item) => { setTargetDialog({ open: true, role: r, period: p, item }); setNewTarget(String(item.target)); }} onInputKpi={openKpiInput} />
                    <PeriodDetail title="Target Bulanan" data={s.monthly} role={s.role} period="monthly" userId={s.userId} userName={s.userName} onEditTarget={(r, p, item) => { setTargetDialog({ open: true, role: r, period: p, item }); setNewTarget(String(item.target)); }} onInputKpi={openKpiInput} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Target Dialog */}
      <Dialog open={targetDialog.open} onOpenChange={(v) => setTargetDialog({ ...targetDialog, open: v })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Target KPI</DialogTitle>
          </DialogHeader>
          {targetDialog.item && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600">KPI Item</Label>
                <p className="text-sm font-medium text-slate-900 mt-1">{targetDialog.item.label}</p>
                <p className="text-xs text-slate-500">Target saat ini: {targetDialog.item.target} {targetDialog.item.unit}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Target Baru</Label>
                <Input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDialog({ ...targetDialog, open: false })}>Batal</Button>
            <Button onClick={handleSaveTarget} disabled={savingTarget || !newTarget} className="bg-blue-600 hover:bg-blue-700">
              {savingTarget ? "Menyimpan..." : "Simpan Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Input KPI Actual Dialog */}
      <Dialog open={kpiInputDialog.open} onOpenChange={(v) => setKpiInputDialog({ ...kpiInputDialog, open: v })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Input KPI {kpiInputDialog.userName} ({kpiInputDialog.period})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {kpiInputDialog.items.map((item: any) => (
              <div key={item.key} className="flex items-center gap-3">
                <span className="text-xs text-slate-700 flex-1 truncate">{item.label}</span>
                <span className="text-[10px] text-slate-400">target: {item.target}</span>
                <Input
                  type="number"
                  value={kpiValues[item.key] || "0"}
                  onChange={(e) => setKpiValues({ ...kpiValues, [item.key]: e.target.value })}
                  className="w-20 h-8 text-sm text-right"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKpiInputDialog({ ...kpiInputDialog, open: false })}>Batal</Button>
            <Button onClick={handleSaveKpi} disabled={savingKpi} className="bg-blue-600 hover:bg-blue-700">
              {savingKpi ? "Menyimpan..." : "Simpan KPI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScoreCell({ value }: { value: number }) {
  const cat = getCategoryStyle(value);
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1.5 h-1.5 rounded-full", cat.bg)} />
      <span className="text-xs font-medium text-slate-700">{value}%</span>
    </div>
  );
}

function PodiumCard({ score, rank }: { score: KpiScore; rank: number }) {
  const cat = getCategoryStyle(score.weightedScore);
  const medals = ["🥇", "🥈", "🥉"];
  const heights = ["h-32", "h-40", "h-28"];
  const icons = [Crown, Medal, Award];
  const Icon = icons[rank - 1];
  return (
    <div className={cn("flex flex-col items-center text-center", rank === 1 && "-mt-4")}>
      <div className="text-3xl mb-1">{medals[rank - 1]}</div>
      <Avatar className={cn("mb-2 border-4", rank === 1 ? "w-16 h-16 border-amber-300" : rank === 2 ? "w-14 h-14 border-slate-300" : "w-14 h-14 border-amber-700")}>
        <AvatarFallback className={cn("font-bold", cat.light, cat.text)}>{initials(score.userName)}</AvatarFallback>
      </Avatar>
      <p className="font-semibold text-sm text-slate-900 truncate w-full">{score.userName}</p>
      <p className="text-[10px] text-slate-500 mb-2">{score.roleLabel}</p>
      <div className={cn("bg-gradient-to-br text-white rounded-lg p-3 w-full", heights[rank - 1], cat.gradient, "flex flex-col items-center justify-center")}>
        <Icon className="w-5 h-5 mb-1 opacity-80" />
        <p className="text-3xl font-bold">{score.weightedScore}</p>
        <p className="text-[10px] opacity-90 mt-0.5">Produktivitas</p>
        <div className="mt-2 bg-white/20 rounded-full px-2 py-0.5 text-[9px]">{cat.label}</div>
      </div>
    </div>
  );
}

function PeriodDetail({ title, data, role, period, userId, userName, onEditTarget, onInputKpi }: {
  title: string;
  data: { achievementRate: number; items: any[]; totalTarget: number; totalActual: number };
  role?: string;
  period?: string;
  userId?: string;
  userName?: string;
  onEditTarget?: (role: string, period: string, item: any) => void;
  onInputKpi?: (userId: string, userName: string, items: any[], period: string) => void;
}) {
  const cat = getCategoryStyle(data.achievementRate);
  return (
    <div className={cn("rounded-lg p-3 border", cat.light, cat.border)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          {onInputKpi && userId && (
            <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px]" onClick={() => onInputKpi(userId, userName || "", data.items, period || "daily")}>
              <Edit3 className="w-2.5 h-2.5 mr-0.5" /> Input
            </Button>
          )}
        </div>
        <span className={cn("text-sm font-bold", cat.text)}>{data.achievementRate}%</span>
      </div>
      <Progress value={data.achievementRate} className={cn("h-1.5 mb-2", `[&>div]:${cat.bg}`)} />
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {data.items.slice(0, 5).map((item: any) => (
          <div key={item.key} className="flex items-center justify-between text-[10px]">
            <span className="text-slate-600 truncate pr-1 flex items-center gap-1">
              {item.label}
              {onEditTarget && role && (
                <button onClick={() => onEditTarget(role, period || "daily", item)} className="text-slate-300 hover:text-blue-600" title="Edit Target">
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
            <span className="font-medium text-slate-700 shrink-0">{item.actual}/{item.target}</span>
          </div>
        ))}
        {data.items.length > 5 && <p className="text-[9px] text-slate-400">+{data.items.length - 5} lainnya</p>}
      </div>
    </div>
  );
}
