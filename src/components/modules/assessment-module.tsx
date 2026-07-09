"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy, Medal, Award, Crown, FileSpreadsheet, Loader2, Save, RefreshCw,
  Settings2, Plus, Pencil, Trash2, AlertTriangle, Calculator, Users, Wallet,
  Target, ClipboardList, Sparkles, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import {
  ROLE_COLORS, ROLE_LABELS, formatCurrency, formatNumber,
} from "@/lib/constants";
import { exportToExcel } from "@/lib/export-utils";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";

// ===== Types =====
interface Criteria {
  id: string;
  name: string;
  description?: string | null;
  weight: number;
  dataSource: string;
  order: number;
  isActive: boolean;
}

interface UserScore {
  criteriaId: string;
  name: string;
  description?: string | null;
  weight: number;
  dataSource: string;
  score: number;
  isAuto: boolean;
  note: string | null;
}

interface ScoreRow {
  userId: string;
  userName: string;
  role: string;
  position?: string | null;
  avatar?: string | null;
  criteria: UserScore[];
  totalScore: number;
  bonusAmount: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  position?: string | null;
  avatar?: string | null;
}

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const DATA_SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  ATTENDANCE: "Absensi",
  KPI: "KPI",
  SOCIAL_MEDIA: "Social Media",
  VIRAL: "Viral",
};

const DATA_SOURCE_BADGE: Record<string, string> = {
  MANUAL: "bg-slate-100 text-slate-700 border-slate-200",
  ATTENDANCE: "bg-blue-100 text-blue-700 border-blue-200",
  KPI: "bg-violet-100 text-violet-700 border-violet-200",
  SOCIAL_MEDIA: "bg-pink-100 text-pink-700 border-pink-200",
  VIRAL: "bg-amber-100 text-amber-700 border-amber-200",
};

const AUTO_SOURCES = ["ATTENDANCE", "KPI", "SOCIAL_MEDIA", "VIRAL"];

function getScoreCategory(score: number): { label: string; color: string; bg: string; bar: string } {
  if (score >= 90) return { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" };
  if (score >= 80) return { label: "Good", color: "text-blue-700", bg: "bg-blue-100 text-blue-700 border-blue-200", bar: "bg-blue-500" };
  if (score >= 70) return { label: "Need Coaching", color: "text-amber-700", bg: "bg-amber-100 text-amber-700 border-amber-200", bar: "bg-amber-500" };
  return { label: "Warning", color: "text-rose-700", bg: "bg-rose-100 text-rose-700 border-rose-200", bar: "bg-rose-500" };
}

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 80) return "text-blue-600";
  if (score >= 70) return "text-amber-600";
  return "text-rose-600";
}

function scoreBadgeBg(score: number): string {
  if (score >= 90) return "bg-emerald-100 text-emerald-700";
  if (score >= 80) return "bg-blue-100 text-blue-700";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ===== Main Module =====
export function AssessmentModule() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState("penilaian");
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [bonusMultiplier, setBonusMultiplier] = useState(100000);
  const [bonusInput, setBonusInput] = useState("100000");
  const [savingBonus, setSavingBonus] = useState(false);

  const period = formatPeriod(year, month);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scoresRes, criteriaRes] = await Promise.all([
        api<{ scores: ScoreRow[]; period: string; bonusMultiplier: number }>(
          `/api/assessment/scores?period=${period}`
        ),
        api<{ criteria: Criteria[] }>("/api/assessment/criteria"),
      ]);
      setScores(scoresRes.scores || []);
      setBonusMultiplier(scoresRes.bonusMultiplier || 100000);
      setBonusInput(String(scoresRes.bonusMultiplier || 100000));
      setCriteria(criteriaRes.criteria || []);
    } catch (e: any) {
      toast.error("Gagal memuat data penilaian: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Summary stats
  const summary = useMemo(() => {
    const totalCriteria = criteria.length;
    const totalMembers = scores.length;
    const avgScore = totalMembers > 0
      ? Math.round(scores.reduce((s, r) => s + r.totalScore, 0) / totalMembers)
      : 0;
    const topPerformer = scores.length > 0
      ? [...scores].sort((a, b) => b.totalScore - a.totalScore)[0]
      : null;
    const totalBonus = scores.reduce((s, r) => s + r.bonusAmount, 0);
    return { totalCriteria, totalMembers, avgScore, topPerformer, totalBonus };
  }, [criteria, scores]);

  function handleSaveBonus() {
    const n = Number(bonusInput);
    if (isNaN(n) || n < 0) {
      toast.error("Nilai bonus tidak valid");
      return;
    }
    setSavingBonus(true);
    api("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        key: "assessment_bonus_per_point",
        value: String(n),
        category: "ASSESSMENT",
        type: "NUMBER",
        description: "Bonus multiplier (Rp) per point penilaian tim",
      }),
    })
      .then(() => {
        setBonusMultiplier(n);
        toast.success("Bonus multiplier disimpan");
        loadData();
      })
      .catch((e: any) => toast.error("Gagal simpan: " + (e?.message || "")))
      .finally(() => setSavingBonus(false));
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Penilaian & Bonus Tim"
        description="Kelola kriteria penilaian, hitung skor otomatis & manual, tentukan bonus bulanan tim."
        action={
          <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")}>
            <Settings2 className="w-4 h-4" /> Kelola Kriteria
          </Button>
        }
      />

      {/* Period selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Periode:</span>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700"
              >
                {monthNames.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700"
              >
                {[0, 1, 2].map((d) => {
                  const y = now.getFullYear() - d;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Kriteria"
          value={summary.totalCriteria}
          icon={ClipboardList}
          subtitle="Kriteria aktif"
          accent="bg-violet-50 text-violet-600"
        />
        <StatCard
          title="Rata-rata Skor"
          value={summary.avgScore}
          icon={Target}
          indicator={summary.avgScore >= 80 ? "green" : summary.avgScore >= 70 ? "yellow" : "red"}
          subtitle={`${summary.totalMembers} anggota dinilai`}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Top Performer"
          value={summary.topPerformer ? summary.topPerformer.userName.split(" ")[0] : "-"}
          icon={Crown}
          subtitle={summary.topPerformer ? `${summary.topPerformer.totalScore} poin` : "Belum ada"}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Total Bonus"
          value={formatCurrency(summary.totalBonus)}
          icon={Wallet}
          subtitle={`@ ${formatCurrency(bonusMultiplier)}/poin`}
          accent="bg-emerald-50 text-emerald-600"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="penilaian"><ClipboardList className="w-4 h-4" /> Penilaian</TabsTrigger>
          <TabsTrigger value="ranking"><Trophy className="w-4 h-4" /> Ranking & Bonus</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="w-4 h-4" /> Pengaturan Kriteria</TabsTrigger>
        </TabsList>

        <TabsContent value="penilaian">
          <PenilaianTab
            period={period}
            scores={scores}
            criteria={criteria}
            bonusMultiplier={bonusMultiplier}
            onChanged={loadData}
          />
        </TabsContent>

        <TabsContent value="ranking">
          <RankingTab
            scores={scores}
            period={period}
            monthLabel={`${monthNames[month - 1]} ${year}`}
            bonusMultiplier={bonusMultiplier}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab
            criteria={criteria}
            bonusMultiplier={bonusMultiplier}
            bonusInput={bonusInput}
            setBonusInput={setBonusInput}
            onSaveBonus={handleSaveBonus}
            savingBonus={savingBonus}
            onChanged={loadData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Tab 1: Penilaian (Matrix Table) =====
function PenilaianTab({
  period, scores, criteria, bonusMultiplier, onChanged,
}: {
  period: string;
  scores: ScoreRow[];
  criteria: Criteria[];
  bonusMultiplier: number;
  onChanged: () => void;
}) {
  const [matrix, setMatrix] = useState<Record<string, { score: number; note: string }>>({});
  const [saving, setSaving] = useState(false);
  const [calcUser, setCalcUser] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, { score: number; note: string }> = {};
    for (const s of scores) {
      for (const c of s.criteria) {
        next[`${s.userId}_${c.criteriaId}`] = { score: c.score, note: c.note || "" };
      }
      for (const c of criteria) {
        const key = `${s.userId}_${c.id}`;
        if (!next[key]) next[key] = { score: 0, note: "" };
      }
    }
    setMatrix(next);
  }, [scores, criteria]);

  function getScore(userId: string, criteriaId: string): number {
    return matrix[`${userId}_${criteriaId}`]?.score ?? 0;
  }

  function setScore(userId: string, criteriaId: string, score: number) {
    const key = `${userId}_${criteriaId}`;
    setMatrix((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { note: "" }), score: Math.min(100, Math.max(0, score)) },
    }));
  }

  function getUserTotal(userId: string): number {
    const items = criteria.map((c) => ({ weight: c.weight, score: getScore(userId, c.id) }));
    const tw = items.reduce((s, i) => s + i.weight, 0);
    if (tw <= 0) return 0;
    return Math.round((items.reduce((s, i) => s + i.score * i.weight, 0) / tw) * 100) / 100;
  }

  async function handleAutoCalc(userId: string) {
    setCalcUser(userId);
    try {
      const res = await api<{ results: any[] }>("/api/assessment/auto-calculate", {
        method: "POST",
        body: JSON.stringify({ userId, period }),
      });
      setMatrix((prev) => {
        const next = { ...prev };
        for (const r of res.results || []) {
          next[`${userId}_${r.criteriaId}`] = { score: r.score, note: r.note || "Auto" };
        }
        return next;
      });
      toast.success("Skor otomatis dihitung");
    } catch (e: any) {
      toast.error("Gagal: " + (e?.message || ""));
    } finally {
      setCalcUser(null);
    }
  }

  async function handleSaveUser(userId: string) {
    setSaving(true);
    try {
      const payload = criteria.map((c) => ({
        criteriaId: c.id,
        score: getScore(userId, c.id),
        note: matrix[`${userId}_${c.id}`]?.note ?? "",
      }));
      await api("/api/assessment/scores", {
        method: "POST",
        body: JSON.stringify({ userId, period, scores: payload }),
      });
      toast.success("Penilaian tersimpan");
      onChanged();
    } catch (e: any) {
      toast.error("Gagal simpan: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      for (const s of scores) {
        const payload = criteria.map((c) => ({
          criteriaId: c.id,
          score: getScore(s.userId, c.id),
          note: matrix[`${s.userId}_${c.id}`]?.note ?? "",
        }));
        await api("/api/assessment/scores", {
          method: "POST",
          body: JSON.stringify({ userId: s.userId, period, scores: payload }),
        });
      }
      toast.success(`Penilaian ${scores.length} anggota tim tersimpan`);
      onChanged();
    } catch (e: any) {
      toast.error("Gagal simpan: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  }

  if (scores.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center">
        <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-700 font-medium">Belum ada anggota tim</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500">Isi skor manual (0-100), klik "Auto" untuk hitung dari data sistem. Total & bonus update real-time.</p>
        <Button onClick={handleSaveAll} disabled={saving} size="sm" className="bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Simpan Semua
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left text-[10px] font-bold text-slate-600 uppercase min-w-[130px]">Anggota Tim</th>
                {criteria.map((c) => (
                  <th key={c.id} className="px-1 py-2 text-center text-[9px] font-bold text-slate-600 uppercase min-w-[70px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="leading-tight">{c.name}</span>
                      <span className="text-[7px] text-slate-400 normal-case font-normal">{c.weight}% {AUTO_SOURCES.includes(c.dataSource) ? "Auto" : "Manual"}</span>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-600 uppercase min-w-[90px]">Total & Bonus</th>
                <th className="px-1 py-2 text-center text-[10px] font-bold text-slate-600 uppercase min-w-[70px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => {
                const total = getUserTotal(s.userId);
                const cat = getScoreCategory(total);
                const bonus = Math.round(total * bonusMultiplier);
                return (
                  <tr key={s.userId} className="border-b border-slate-50 hover:bg-slate-50/30">
                    <td className="sticky left-0 bg-white px-3 py-2">
                      <p className="font-medium text-slate-900 text-xs truncate">{s.userName}</p>
                      <p className="text-[9px] text-slate-500">{ROLE_LABELS[s.role] || s.role}</p>
                    </td>
                    {criteria.map((c) => {
                      const isAuto = AUTO_SOURCES.includes(c.dataSource);
                      const score = getScore(s.userId, c.id);
                      const sc = getScoreCategory(score);
                      return (
                        <td key={c.id} className="px-1 py-1.5 text-center">
                          {isAuto ? (
                            <span className={cn("text-sm font-bold", sc.color)}>{score.toFixed(0)}</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={score}
                              onChange={(e) => setScore(s.userId, c.id, Number(e.target.value) || 0)}
                              className={cn("w-12 h-7 text-center text-sm font-bold rounded border-0 bg-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none", sc.color)}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center">
                      <span className={cn("text-base font-bold", cat.color)}>{total.toFixed(1)}</span>
                      <Badge variant="outline" className={cn("text-[8px] mt-0.5 block w-fit mx-auto", cat.bg)}>{cat.label}</Badge>
                      <span className="text-[9px] text-emerald-600 font-medium">{formatCurrency(bonus)}</span>
                    </td>
                    <td className="px-1 py-2 text-center">
                      <div className="flex flex-col gap-0.5 items-center">
                        <button onClick={() => handleAutoCalc(s.userId)} disabled={calcUser === s.userId} className="text-[10px] text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded flex items-center gap-0.5">
                          {calcUser === s.userId ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />} Auto
                        </button>
                        <button onClick={() => handleSaveUser(s.userId)} disabled={saving} className="text-[10px] text-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-0.5">
                          <Save className="w-2.5 h-2.5" /> Simpan
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {scores.map((s) => {
          const total = getUserTotal(s.userId);
          const cat = getScoreCategory(total);
          return (
            <div key={s.userId} className={cn("rounded-lg border-l-4 bg-white p-2.5", cat.border)}>
              <p className="text-[10px] text-slate-500 truncate">{s.userName}</p>
              <p className={cn("text-lg font-bold", cat.color)}>{total.toFixed(1)}</p>
              <p className="text-[9px] text-emerald-600">{formatCurrency(Math.round(total * bonusMultiplier))}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Tab 2: Ranking & Bonus =====
function RankingTab({
  scores, period, monthLabel, bonusMultiplier,
}: {
  scores: ScoreRow[];
  period: string;
  monthLabel: string;
  bonusMultiplier: number;
}) {
  const sorted = useMemo(
    () => [...scores].sort((a, b) => b.totalScore - a.totalScore),
    [scores]
  );
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  function handleExportExcel() {
    if (sorted.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const rows = sorted.map((r, i) => {
      const cat = getScoreCategory(r.totalScore);
      return {
        Peringkat: i + 1,
        Nama: r.userName,
        Jabatan: ROLE_LABELS[r.role] || r.role,
        Posisi: r.position || "-",
        "Total Skor": r.totalScore.toFixed(2),
        Kategori: cat.label,
        "Bonus (Rp)": r.bonusAmount,
        "Detail Kriteria": r.criteria.map((c) => `${c.name}: ${c.score.toFixed(0)}`).join("; "),
      };
    });
    exportToExcel(rows, `Penilaian_${period}`, "Penilaian Tim");
    toast.success("Excel diekspor");
  }

  if (scores.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Trophy className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700">Belum ada data penilaian</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Belum ada skor untuk periode {monthLabel}. Buka tab &quot;Penilaian&quot; untuk mulai menilai anggota tim.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportExcel}>
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      {/* Podium Top 3 */}
      {top3.length > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6 bg-gradient-to-br from-amber-50/50 via-blue-50/30 to-slate-50">
            <div className="flex items-center gap-2 mb-5">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-800">Top 3 Podium — {monthLabel}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {podiumOrder.map((r) => {
                const rankIndex = sorted.findIndex((x) => x.userId === r.userId);
                const isFirst = rankIndex === 0;
                const isSecond = rankIndex === 1;
                const isThird = rankIndex === 2;
                const medal = isFirst ? "🥇" : isSecond ? "🥈" : "🥉";
                const cardClass = isFirst
                  ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white order-2 sm:order-2 sm:-translate-y-2 sm:scale-105"
                  : isSecond
                  ? "border-slate-300 bg-gradient-to-b from-slate-50 to-white order-1 sm:order-1"
                  : "border-orange-300 bg-gradient-to-b from-orange-50 to-white order-3 sm:order-3";
                const iconBg = isFirst
                  ? "bg-amber-100 text-amber-600"
                  : isSecond
                  ? "bg-slate-200 text-slate-600"
                  : "bg-orange-100 text-orange-600";
                const Icon = isFirst ? Crown : isSecond ? Medal : Award;
                const cat = getScoreCategory(r.totalScore);
                return (
                  <div
                    key={r.userId}
                    className={cn("relative rounded-xl border-2 p-4 text-center shadow-sm hover:shadow-md transition-all", cardClass)}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">{medal}</div>
                    <div className="flex flex-col items-center gap-2 mt-2">
                      <div className="relative">
                        <Avatar className="w-16 h-16 border-4 border-white shadow">
                          {r.avatar ? <AvatarImage src={r.avatar} alt={r.userName} /> : null}
                          <AvatarFallback className={cn("text-lg font-semibold", iconBg)}>{initials(r.userName)}</AvatarFallback>
                        </Avatar>
                        <div className={cn("absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white", iconBg)}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{r.userName}</p>
                        <Badge variant="outline" className={cn("mt-1 text-[10px] py-0 px-1.5", ROLE_COLORS[r.role])}>
                          {ROLE_LABELS[r.role] || r.role}
                        </Badge>
                      </div>
                      <div className="w-full mt-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Total Skor</span>
                          <span className={cn("font-bold text-lg", cat.color)}>{r.totalScore.toFixed(1)}</span>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px]", cat.bg)}>{cat.label}</Badge>
                        <div className="mt-2 p-2 rounded-md bg-emerald-50">
                          <p className="text-[10px] text-emerald-600 uppercase">Bonus</p>
                          <p className="text-base font-bold text-emerald-700">{formatCurrency(r.bonusAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full ranking table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Ranking Lengkap</h3>
              <p className="text-sm text-slate-500">{sorted.length} anggota · {monthLabel} · @ {formatCurrency(bonusMultiplier)}/poin</p>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 custom-scroll">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 z-10">
                <TableRow>
                  <TableHead className="w-14 text-center">#</TableHead>
                  <TableHead className="min-w-[180px]">Nama</TableHead>
                  <TableHead className="w-44">Role</TableHead>
                  <TableHead className="text-center">Total Skor</TableHead>
                  <TableHead className="text-center">Kategori</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r, i) => {
                  const cat = getScoreCategory(r.totalScore);
                  return (
                    <TableRow key={r.userId} className="hover:bg-slate-50">
                      <TableCell className="text-center">
                        <span className={cn(
                          "inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold",
                          i === 0 ? "bg-amber-100 text-amber-700" :
                          i === 1 ? "bg-slate-200 text-slate-700" :
                          i === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8">
                            {r.avatar ? <AvatarImage src={r.avatar} alt={r.userName} /> : null}
                            <AvatarFallback className="text-xs bg-blue-50 text-blue-700">{initials(r.userName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{r.userName}</p>
                            {r.position && <p className="text-xs text-slate-500 truncate">{r.position}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", ROLE_COLORS[r.role])}>
                          {ROLE_LABELS[r.role] || r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("inline-flex items-center justify-center w-14 h-9 rounded-lg text-lg font-bold", scoreBadgeBg(r.totalScore))}>
                          {r.totalScore.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[10px]", cat.bg)}>{cat.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {formatCurrency(r.bonusAmount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 max-h-[28rem] overflow-y-auto custom-scroll pr-1">
            {sorted.map((r, i) => {
              const cat = getScoreCategory(r.totalScore);
              return (
                <div
                  key={r.userId}
                  className={cn(
                    "rounded-lg border p-3",
                    i === 0 ? "border-amber-200 bg-amber-50/40" :
                    i === 1 ? "border-slate-200 bg-slate-50/40" :
                    i === 2 ? "border-orange-200 bg-orange-50/40" :
                    "border-slate-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      i === 0 ? "bg-amber-100 text-amber-700" :
                      i === 1 ? "bg-slate-200 text-slate-700" :
                      i === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {i + 1}
                    </span>
                    <Avatar className="w-10 h-10 shrink-0">
                      {r.avatar ? <AvatarImage src={r.avatar} alt={r.userName} /> : null}
                      <AvatarFallback className="text-xs bg-blue-50 text-blue-700">{initials(r.userName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 truncate">{r.userName}</p>
                        <span className={cn("text-lg font-bold shrink-0", cat.color)}>{r.totalScore.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={cn("text-[10px]", ROLE_COLORS[r.role])}>
                          {ROLE_LABELS[r.role] || r.role}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px]", cat.bg)}>{cat.label}</Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Bonus</span>
                        <span className="text-sm font-bold text-emerald-700">{formatCurrency(r.bonusAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Tab 3: Pengaturan Kriteria =====
function SettingsTab({
  criteria, bonusMultiplier, bonusInput, setBonusInput, onSaveBonus, savingBonus, onChanged,
}: {
  criteria: Criteria[];
  bonusMultiplier: number;
  bonusInput: string;
  setBonusInput: (v: string) => void;
  onSaveBonus: () => void;
  savingBonus: boolean;
  onChanged: () => void;
}) {
  const [editDialog, setEditDialog] = useState<{ open: boolean; criteria: Criteria | null }>({ open: false, criteria: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    weight: "10",
    dataSource: "MANUAL",
    order: "1",
  });

  const totalWeight = useMemo(
    () => criteria.reduce((s, c) => s + c.weight, 0),
    [criteria]
  );
  const weightValid = Math.abs(totalWeight - 100) < 0.01;

  function openAdd() {
    setForm({
      name: "",
      description: "",
      weight: "10",
      dataSource: "MANUAL",
      order: String(criteria.length + 1),
    });
    setEditDialog({ open: true, criteria: null });
  }
  function openEdit(c: Criteria) {
    setForm({
      name: c.name,
      description: c.description || "",
      weight: String(c.weight),
      dataSource: c.dataSource,
      order: String(c.order),
    });
    setEditDialog({ open: true, criteria: c });
  }

  async function handleSaveCriteria() {
    if (!form.name.trim()) {
      toast.error("Nama kriteria wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        weight: Number(form.weight) || 0,
        dataSource: form.dataSource,
        order: Number(form.order) || 1,
      };
      if (editDialog.criteria) {
        await api("/api/assessment/criteria", {
          method: "PUT",
          body: JSON.stringify({ id: editDialog.criteria.id, ...payload }),
        });
        toast.success("Kriteria diperbarui");
      } else {
        await api("/api/assessment/criteria", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Kriteria ditambahkan");
      }
      setEditDialog({ open: false, criteria: null });
      onChanged();
    } catch (e: any) {
      toast.error("Gagal simpan: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Criteria) {
    if (!confirm(`Hapus kriteria "${c.name}"? Semua skor terkait akan ikut terhapus.`)) return;
    try {
      await api(`/api/assessment/criteria/${c.id}`, { method: "DELETE" });
      toast.success("Kriteria dihapus");
      onChanged();
    } catch (e: any) {
      toast.error("Gagal hapus: " + (e?.message || ""));
    }
  }

  return (
    <div className="space-y-4">
      {/* Bonus multiplier setting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600" /> Bonus Multiplier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs text-slate-500">Bonus per poin (Rp)</Label>
              <Input
                type="number"
                value={bonusInput}
                onChange={(e) => setBonusInput(e.target.value)}
                placeholder="100000"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Saat ini: <span className="font-semibold text-emerald-700">{formatCurrency(bonusMultiplier)}</span> / poin.
                Skor 90 → bonus {formatCurrency(90 * bonusMultiplier)}.
              </p>
            </div>
            <Button onClick={onSaveBonus} disabled={savingBonus}>
              {savingBonus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Criteria list */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Daftar Kriteria ({criteria.length})</CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">Total bobot harus = 100%</p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Weight warning */}
          <div className={cn(
            "rounded-lg p-3 flex items-center gap-2 text-sm",
            weightValid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          )}>
            {weightValid ? <Sparkles className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>
              Total bobot: <span className="font-bold">{totalWeight}%</span>
              {weightValid ? " — Bobot sudah valid (100%)" : ` — Kurang dari / lebih dari 100%. Disarankan: 100%.`}
            </span>
          </div>

          {criteria.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              Belum ada kriteria. Klik &quot;Tambah&quot; untuk membuat kriteria pertama.
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Nama Kriteria</TableHead>
                    <TableHead className="w-28 text-center">Bobot</TableHead>
                    <TableHead className="w-36">Sumber Data</TableHead>
                    <TableHead className="w-24 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteria.map((c, i) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-center text-xs text-slate-500">{i + 1}</TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                          {c.weight}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", DATA_SOURCE_BADGE[c.dataSource])}>
                          {DATA_SOURCE_LABELS[c.dataSource]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add/Edit dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => setEditDialog({ open: o, criteria: editDialog.criteria })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDialog.criteria ? "Edit Kriteria" : "Tambah Kriteria"}</DialogTitle>
            <DialogDescription>
              {editDialog.criteria
                ? "Ubah detail kriteria penilaian."
                : "Buat kriteria penilaian baru untuk tim."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Kriteria</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Kehadiran Tepat Waktu"
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Penjelasan singkat kriteria..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bobot (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                />
              </div>
              <div>
                <Label>Urutan</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Sumber Data</Label>
              <Select
                value={form.dataSource}
                onValueChange={(v) => setForm({ ...form, dataSource: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual (diisi owner)</SelectItem>
                  <SelectItem value="ATTENDANCE">Absensi (otomatis)</SelectItem>
                  <SelectItem value="KPI">KPI (otomatis)</SelectItem>
                  <SelectItem value="SOCIAL_MEDIA">Social Media (otomatis)</SelectItem>
                  <SelectItem value="VIRAL">Viral (otomatis)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {AUTO_SOURCES.includes(form.dataSource)
                  ? "Kriteria ini akan dihitung otomatis dari data sistem."
                  : "Kriteria ini diisi manual oleh owner saat penilaian."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, criteria: null })}>
              Batal
            </Button>
            <Button onClick={handleSaveCriteria} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
