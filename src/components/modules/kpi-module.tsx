"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  RefreshCw, Target, TrendingUp, Calendar, Clock, Award, AlertCircle,
  CheckCircle2, Trophy, Zap, FileText, Plus, Edit3, ChevronRight, Star, Save, RotateCcw,
} from "lucide-react";
import { StatCard, SectionHeader, IndicatorBadge } from "@/components/shared/stat-card";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

interface KpiItem {
  key: string;
  label: string;
  target: number;
  unit: string;
  actual: number;
  achievement: number;
}

interface KpiData {
  period: "daily" | "weekly" | "monthly";
  role: string;
  targets: KpiItem[];
  logs: any[];
  achievementRate: number;
  dateRange: { start: string; end: string };
}

interface KpiScoreData {
  userId: string;
  userName: string;
  role: string;
  roleLabel: string;
  daily: { achievementRate: number; items: KpiItem[] };
  weekly: { achievementRate: number; items: KpiItem[] };
  monthly: { achievementRate: number; items: KpiItem[] };
  deadlineScore: number;
  qualityScore: number;
  weightedScore: number;
  category: string;
  categoryColor: string;
}

interface EffectiveConfigResponse {
  config: any | null;
  baseConfig: any | null;
  overrides: { daily: Record<string, number>; weekly: Record<string, number>; monthly: Record<string, number> };
  weights: any;
  categories: any[];
}

const PERIOD_LABELS = { daily: "Harian", weekly: "Mingguan", monthly: "Bulanan" };
const PERIOD_ICONS = { daily: Clock, weekly: Calendar, monthly: Target };
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function getCategoryColor(score: number) {
  if (score >= 90) return { bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-50", label: "Excellent", indicator: "green" as const };
  if (score >= 80) return { bg: "bg-cyan-500", text: "text-cyan-700", light: "bg-cyan-50", label: "Good", indicator: "blue" as const };
  if (score >= 70) return { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50", label: "Need Coaching", indicator: "yellow" as const };
  return { bg: "bg-rose-500", text: "text-rose-700", light: "bg-rose-50", label: "Warning", indicator: "red" as const };
}

export function KpiModule({ user }: { user: SafeUser }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  // year=0 = "Semua Tahun" (use today); month=0 = "Semua Bulan" (use mid-year date)
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(0);
  const [data, setData] = useState<KpiData | null>(null);
  const [score, setScore] = useState<KpiScoreData | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Record<string, number>>>({ daily: {}, weekly: {}, monthly: {} });
  const [loading, setLoading] = useState(true);
  const [logDialog, setLogDialog] = useState<{ open: boolean; item: KpiItem | null }>({ open: false, item: null });
  const [logValue, setLogValue] = useState("");
  const [targetDialog, setTargetDialog] = useState<{ open: boolean; item: KpiItem | null }>({ open: false, item: null });
  const [targetValue, setTargetValue] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);

  const isOwner = user.role === ROLES.OWNER;

  // Build a date reference for the KPI API from year + month.
  const dateRef = useMemo(() => {
    if (year === 0) return null;
    if (month === 0) return `${year}-06-15`;
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }, [year, month]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dateQs = dateRef ? `&date=${dateRef}` : "";
      const [kpiData, scoreData, cfgData] = await Promise.all([
        api<KpiData>(`/api/kpi/logs?period=${period}${dateQs}`),
        api<{ score: KpiScoreData }>(`/api/kpi/score${dateRef ? `?date=${dateRef}` : ""}`),
        api<EffectiveConfigResponse>(`/api/kpi/targets?role=${encodeURIComponent(user.role)}`),
      ]);
      setData(kpiData);
      setScore(scoreData.score);
      setOverrides(cfgData.overrides || { daily: {}, weekly: {}, monthly: {} });
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat KPI");
    } finally {
      setLoading(false);
    }
  }, [period, dateRef, user.role]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSaveLog() {
    if (!logDialog.item) return;
    const val = Number(logValue);
    if (isNaN(val) || val < 0) {
      toast.error("Nilai harus angka positif");
      return;
    }
    try {
      let logDate = dateRef ? new Date(dateRef) : new Date();
      if (period === "weekly") {
        const day = logDate.getDay() || 7;
        logDate.setDate(logDate.getDate() - day + 1);
      } else if (period === "monthly") {
        logDate = new Date(logDate.getFullYear(), logDate.getMonth(), 1);
      }
      await api("/api/kpi/logs", {
        method: "POST",
        body: JSON.stringify({ metricKey: logDialog.item.key, value: val, date: logDate }),
      });
      toast.success("KPI berhasil diupdate");
      setLogDialog({ open: false, item: null });
      setLogValue("");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    }
  }

  async function handleSaveTarget() {
    if (!targetDialog.item) return;
    const val = Number(targetValue);
    if (isNaN(val) || val < 0) {
      toast.error("Target harus angka positif");
      return;
    }
    setSavingTarget(true);
    try {
      await api("/api/kpi/targets", {
        method: "PUT",
        body: JSON.stringify({
          role: user.role,
          period,
          key: targetDialog.item.key,
          target: val,
        }),
      });
      toast.success(`Target "${targetDialog.item.label}" diubah menjadi ${val} ${targetDialog.item.unit}`);
      setTargetDialog({ open: false, item: null });
      setTargetValue("");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan target");
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleResetTarget(item: KpiItem) {
    try {
      await api("/api/kpi/targets", {
        method: "PUT",
        body: JSON.stringify({ role: user.role, period, key: item.key, target: null }),
      });
      toast.success(`Target "${item.label}" dikembalikan ke nilai default`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal mereset target");
    }
  }

  function handleExportExcel() {
    if (!data) return;
    const rows = data.targets.map((t) => ({
      Metrik: t.label, Target: t.target, Aktual: t.actual, Satuan: t.unit,
      Pencapaian: t.achievement + "%",
    }));
    exportToExcel(rows, `KPI-${PERIOD_LABELS[period]}-${user.name}`, "KPI");
    toast.success("Excel diunduh");
  }

  function handleExportPDF() {
    if (!data || !score) return;
    exportToPDF(
      `KPI ${PERIOD_LABELS[period]} - ${user.name}`,
      ["Metrik", "Target", "Aktual", "Satuan", "Pencapaian"],
      data.targets.map((t) => [t.label, t.target, t.actual, t.unit, t.achievement + "%"]),
      `KPI-${PERIOD_LABELS[period]}-${user.name}`,
      `Skor KPI: ${score.weightedScore} (${score.category})`
    );
    toast.success("PDF diunduh");
  }

  if (loading || !data || !score) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const cat = getCategoryColor(score.weightedScore);
  const PeriodIcon = PERIOD_ICONS[period];
  const isOverridden = (key: string) => overrides[period]?.[key] != null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard KPI"
        description="Target Harian → Mingguan → Bulanan & Productivity Score"
        action={
          <div className="flex flex-wrap gap-2">
            <select
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Bulan</option>
              {MONTH_NAMES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
            <select
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Semua Tahun</option>
              {[2026, 2025, 2024, 2023, 2022].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={handleExportExcel}><FileText className="w-4 h-4 mr-1" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
          </div>
        }
      />

      {/* KPI Score Card - Hero */}
      <Card className={cn("border-2 overflow-hidden", score.weightedScore >= 90 ? "border-blue-300" : score.weightedScore >= 80 ? "border-cyan-300" : score.weightedScore >= 70 ? "border-amber-300" : "border-rose-300")}>
        <div className={cn("bg-gradient-to-r p-6 text-white", cat.bg)}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5" />
                <span className="text-sm font-medium opacity-90">KPI Score Anda</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold">{score.weightedScore}</span>
                <span className="text-2xl opacity-80">/ 100</span>
              </div>
              <p className="text-lg font-semibold mt-1">{score.category}</p>
              <p className="text-xs opacity-80 mt-1">{ROLE_LABELS[user.role]} · {user.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/15 backdrop-blur rounded-lg p-3 min-w-[100px]">
                <p className="text-2xl font-bold">{score.daily.achievementRate}%</p>
                <p className="text-[10px] opacity-90">Harian (30%)</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-3 min-w-[100px]">
                <p className="text-2xl font-bold">{score.weekly.achievementRate}%</p>
                <p className="text-[10px] opacity-90">Mingguan (25%)</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-3 min-w-[100px]">
                <p className="text-2xl font-bold">{score.monthly.achievementRate}%</p>
                <p className="text-[10px] opacity-90">Bulanan (25%)</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-3 min-w-[100px]">
                <p className="text-2xl font-bold">{score.deadlineScore}%</p>
                <p className="text-[10px] opacity-90">Deadline (10%)</p>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
            <div><p className="text-slate-400">Harian</p><p className="font-bold text-slate-700">{score.daily.achievementRate}%</p></div>
            <div><p className="text-slate-400">Mingguan</p><p className="font-bold text-slate-700">{score.weekly.achievementRate}%</p></div>
            <div><p className="text-slate-400">Bulanan</p><p className="font-bold text-slate-700">{score.monthly.achievementRate}%</p></div>
            <div><p className="text-slate-400">Deadline</p><p className="font-bold text-slate-700">{score.deadlineScore}%</p></div>
            <div><p className="text-slate-400">Kualitas (ACC)</p><p className="font-bold text-slate-700">{score.qualityScore}%</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Owner hint banner */}
      {isOwner && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
          <Edit3 className="w-3.5 h-3.5" />
          <span>Owner mode: Anda dapat mengubah target KPI dengan tombol <span className="font-semibold">"Edit Target"</span>. Perubahan tersimpan sebagai override.</span>
        </div>
      )}

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="daily"><Clock className="w-4 h-4 mr-1" /> Harian</TabsTrigger>
          <TabsTrigger value="weekly"><Calendar className="w-4 h-4 mr-1" /> Mingguan</TabsTrigger>
          <TabsTrigger value="monthly"><Target className="w-4 h-4 mr-1" /> Bulanan</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-4">
          {/* Achievement summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard title={`Pencapaian ${PERIOD_LABELS[period]}`} value={`${data.achievementRate}%`} icon={PeriodIcon} indicator={cat.indicator} subtitle="Rata-rata semua metrik" accent="bg-blue-50 text-blue-600" />
            <StatCard title="Metrik Tercapai" value={`${data.targets.filter((t) => t.achievement >= 100).length}/${data.targets.length}`} icon={CheckCircle2} indicator={cat.indicator} accent="bg-cyan-50 text-cyan-600" />
            <StatCard title="Perlu Perhatian" value={data.targets.filter((t) => t.achievement < 70).length} icon={AlertCircle} indicator={data.targets.filter((t) => t.achievement < 70).length > 0 ? "red" : "green"} accent="bg-amber-50 text-amber-600" />
            <StatCard title="KPI Score" value={score.weightedScore} icon={Award} indicator={cat.indicator} subtitle={score.category} accent="bg-violet-50 text-violet-600" />
          </div>

          {/* KPI Items list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Target {PERIOD_LABELS[period]} - {ROLE_LABELS[user.role]}
                <span className="text-xs font-normal text-slate-400">
                  ({year === 0 ? "Semua Tahun" : month === 0 ? `Tahun ${year}` : `${MONTH_NAMES[month - 1]} ${year}`})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.targets.map((t) => {
                  const c = getCategoryColor(t.achievement);
                  const overridden = isOverridden(t.key);
                  return (
                    <div key={t.key} className={cn("border rounded-lg p-3 hover:shadow-sm transition", overridden ? "border-violet-300 bg-violet-50/40" : "border-slate-200")}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-slate-900 truncate">{t.label}</p>
                            {overridden && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 bg-violet-100 text-violet-700 border-violet-200">
                                Custom
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{t.actual}</span> / {t.target} {t.unit}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("text-xs", c.light, c.text)}>
                          {t.achievement}%
                        </Badge>
                        <div className="flex items-center gap-1">
                          {isOwner && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                                title="Edit Target"
                                onClick={() => { setTargetDialog({ open: true, item: t }); setTargetValue(String(t.target)); }}
                              >
                                <Edit3 className="w-3 h-3 mr-1" /> Target
                              </Button>
                              {overridden && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-slate-500"
                                  title="Reset ke default"
                                  onClick={() => handleResetTarget(t)}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            title="Update Aktual"
                            onClick={() => { setLogDialog({ open: true, item: t }); setLogValue(String(t.actual)); }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Update
                          </Button>
                        </div>
                      </div>
                      <Progress value={t.achievement} className={cn("h-2", t.achievement >= 100 && "[&>div]:bg-blue-500", t.achievement >= 80 && t.achievement < 100 && "[&>div]:bg-cyan-500", t.achievement >= 70 && t.achievement < 80 && "[&>div]:bg-amber-500", t.achievement < 70 && "[&>div]:bg-rose-500")} />
                    </div>
                  );
                })}
                {data.targets.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">Tidak ada target KPI untuk role ini</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Monthly Social KPI info card */}
      {score.role === ROLES.PROJECT_MANAGER || score.role === ROLES.ASSISTANT_TRAINER || score.role === ROLES.CONTENT_CREATIVE || score.role === ROLES.DIGITAL_MARKETING_IT ? (
        <SocialKpiCard role={user.role} />
      ) : null}

      {/* Log Dialog (Update Aktual) */}
      <Dialog open={logDialog.open} onOpenChange={(o) => setLogDialog({ open: o, item: logDialog.item })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update KPI: {logDialog.item?.label}</DialogTitle>
            <DialogDescription>
              Masukkan nilai aktual yang sudah Anda capai untuk periode {PERIOD_LABELS[period]} ini.
              Target: {logDialog.item?.target} {logDialog.item?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="logValue">Nilai Aktual ({logDialog.item?.unit})</Label>
              <Input
                id="logValue"
                type="number"
                min="0"
                step="0.1"
                value={logValue}
                onChange={(e) => setLogValue(e.target.value)}
                placeholder="0"
              />
            </div>
            {logDialog.item && Number(logValue) >= 0 && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="text-slate-600">Pencapaian: <span className="font-bold">{logDialog.item.target > 0 ? Math.min(100, Math.round((Number(logValue) / logDialog.item.target) * 100)) : 0}%</span></p>
                {Number(logValue) >= logDialog.item.target ? (
                  <p className="text-blue-600 text-xs mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Target tercapai!</p>
                ) : (
                  <p className="text-amber-600 text-xs mt-1">Sisa {Math.max(0, logDialog.item.target - Number(logValue))} {logDialog.item.unit} lagi</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialog({ open: false, item: null })}>Batal</Button>
            <Button onClick={handleSaveLog} className="bg-blue-600 hover:bg-blue-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Target Dialog (Edit Target - Owner Only) */}
      <Dialog open={targetDialog.open} onOpenChange={(o) => setTargetDialog({ open: o, item: targetDialog.item })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Target: {targetDialog.item?.label}</DialogTitle>
            <DialogDescription>
              Ubah nilai target {PERIOD_LABELS[period]} untuk role <span className="font-semibold">{ROLE_LABELS[user.role]}</span>.
              Perubahan akan disimpan sebagai override.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target Baru ({targetDialog.item?.unit})</Label>
              <Input
                id="targetValue"
                type="number"
                min="0"
                step="0.1"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="0"
              />
            </div>
            {targetDialog.item && Number(targetValue) >= 0 && (
              <div className="bg-violet-50 rounded-lg p-3 text-sm">
                <p className="text-slate-600">Target sebelumnya: <span className="font-bold">{targetDialog.item.target} {targetDialog.item.unit}</span></p>
                <p className="text-violet-700 text-xs mt-1 flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Perubahan akan langsung diterapkan ke dashboard tim.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDialog({ open: false, item: null })}>Batal</Button>
            <Button onClick={handleSaveTarget} disabled={savingTarget} className="bg-violet-600 hover:bg-violet-700">
              {savingTarget ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Simpan Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Social KPI info card
function SocialKpiCard({ role }: { role: string }) {
  const socialMap: Record<string, { platform: string; engagement: number; like: number; share: number; view: number }> = {
    PROJECT_MANAGER: { platform: "Instagram Magang", engagement: 10000, like: 1000, share: 1000, view: 10000 },
    ASSISTANT_TRAINER: { platform: "Instagram Aqil Baihaqi", engagement: 300000, like: 3000, share: 3000, view: 300000 },
    CONTENT_CREATIVE: { platform: "TikTok Aqil Baihaqi", engagement: 300000, like: 3000, share: 3000, view: 300000 },
    DIGITAL_MARKETING_IT: { platform: "Hafara Group", engagement: 20000, like: 1000, share: 1000, view: 30000 },
  };
  const s = socialMap[role];
  if (!s) return null;
  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-violet-600" />
          KPI Bulanan {s.platform}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3 text-center border border-violet-100">
            <Zap className="w-5 h-5 mx-auto text-violet-600 mb-1" />
            <p className="text-lg font-bold text-slate-900">{s.engagement.toLocaleString("id-ID")}</p>
            <p className="text-[10px] text-slate-500">Engagement</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-pink-100">
            <Star className="w-5 h-5 mx-auto text-pink-600 mb-1" />
            <p className="text-lg font-bold text-slate-900">{s.like.toLocaleString("id-ID")}</p>
            <p className="text-[10px] text-slate-500">Like</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-cyan-100">
            <TrendingUp className="w-5 h-5 mx-auto text-cyan-600 mb-1" />
            <p className="text-lg font-bold text-slate-900">{s.share.toLocaleString("id-ID")}</p>
            <p className="text-[10px] text-slate-500">Share</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
            <Award className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <p className="text-lg font-bold text-slate-900">{s.view.toLocaleString("id-ID")}</p>
            <p className="text-[10px] text-slate-500">View</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
