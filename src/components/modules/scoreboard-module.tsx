"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trophy, Medal, Award, Crown, FileSpreadsheet, FileText, Loader2,
  TrendingUp, Target, ClipboardCheck, FileText as ArticleIcon, Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  ROLE_COLORS, formatNumber, formatDate,
} from "@/lib/constants";
import { api } from "@/lib/api-client";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { SectionHeader, StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface RankingItem {
  id: string;
  name: string;
  role: string;
  position?: string | null;
  avatar?: string | null;
  roleLabel: string;
  score: number;
  totalTasks: number;
  doneTasks: number;
  disciplineRate: number;
  contentProduced: number;
  articlesPublished: number;
  productivityScore: number;
}

type Period = "month" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  month: "Bulan Ini",
  year: "Tahun Ini",
  all: "Semua Periode",
};

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function disciplineColor(rate: number): string {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function disciplineBadge(rate: number): string {
  if (rate >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (rate >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

export function ScoreboardModule(_props?: Record<string, never>) {
  const [period, setPeriod] = useState<Period>("month");
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ ranking: RankingItem[]; period: Period }>(
        `/api/scoreboard?period=${period}`
      );
      setRanking(data.ranking || []);
    } catch (e: any) {
      toast.error("Gagal memuat scoreboard: " + (e?.message || ""));
      setRanking([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const sorted = useMemo(
    () => [...ranking].sort((a, b) => b.productivityScore - a.productivityScore),
    [ranking]
  );

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const summary = useMemo(() => {
    const totalScore = sorted.reduce((s, r) => s + r.score, 0);
    const totalTasks = sorted.reduce((s, r) => s + r.doneTasks, 0);
    const avgDiscipline = sorted.length > 0
      ? Math.round(sorted.reduce((s, r) => s + r.disciplineRate, 0) / sorted.length)
      : 0;
    const totalContent = sorted.reduce((s, r) => s + r.contentProduced + r.articlesPublished, 0);
    return { totalScore, totalTasks, avgDiscipline, totalContent, totalMembers: sorted.length };
  }, [sorted]);

  function handleExportExcel() {
    if (sorted.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const rows = sorted.map((r, i) => ({
      Peringkat: i + 1,
      Nama: r.name,
      Jabatan: r.roleLabel,
      Posisi: r.position || "-",
      Skor: r.score,
      TugasSelesai: r.doneTasks,
      TotalTugas: r.totalTasks,
      Disiplin: `${r.disciplineRate}%`,
      KontenDiproduksi: r.contentProduced,
      ArtikelDipublish: r.articlesPublished,
      Produktivitas: r.productivityScore,
    }));
    exportToExcel(rows, `Scoreboard_${PERIOD_LABELS[period]}`, "Scoreboard");
    toast.success("Excel diekspor");
  }

  function handleExportPDF() {
    if (sorted.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    exportToPDF(
      `Scoreboard Karyawan - ${PERIOD_LABELS[period]}`,
      ["#", "Nama", "Jabatan", "Skor", "Tugas", "Disiplin", "Konten", "Artikel", "Produktivitas"],
      sorted.map((r, i) => [
        i + 1,
        r.name,
        r.roleLabel,
        r.score,
        `${r.doneTasks}/${r.totalTasks}`,
        `${r.disciplineRate}%`,
        r.contentProduced,
        r.articlesPublished,
        r.productivityScore,
      ]),
      `Scoreboard_${period}`,
      `${sorted.length} karyawan • Dibuat ${formatDate(new Date())}`
    );
    toast.success("PDF diekspor");
  }

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Scoreboard Karyawan"
        description="Ranking produktivitas tim berdasarkan skor otomatis. Transparan untuk seluruh divisi."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
          </div>
        }
      />

      {/* Period Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Periode:</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? "default" : "outline"}
                  onClick={() => setPeriod(p)}
                >
                  {PERIOD_LABELS[p]}
                </Button>
              ))}
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Skor Tim"
          value={formatNumber(summary.totalScore)}
          icon={Star}
          subtitle={`${summary.totalMembers} anggota`}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Tugas Selesai"
          value={formatNumber(summary.totalTasks)}
          icon={ClipboardCheck}
          subtitle="Akumulasi tim"
          accent="bg-teal-50 text-teal-600"
        />
        <StatCard
          title="Rata-rata Disiplin"
          value={`${summary.avgDiscipline}%`}
          icon={Target}
          indicator={
            summary.avgDiscipline >= 80 ? "green" :
            summary.avgDiscipline >= 50 ? "yellow" : "red"
          }
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Konten + Artikel"
          value={formatNumber(summary.totalContent)}
          icon={TrendingUp}
          subtitle="Karya tim periode ini"
          accent="bg-violet-50 text-violet-600"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Podium Top 3 */}
          {top3.length > 0 && (
            <Card className="overflow-hidden">
              <CardContent className="p-4 sm:p-6 bg-gradient-to-br from-emerald-50/50 via-amber-50/30 to-slate-50">
                <div className="flex items-center gap-2 mb-5">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-800">Top 3 Podium</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  {podiumOrder.map((r) => {
                    const rankIndex = sorted.findIndex((x) => x.id === r.id);
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
                    const icon = isFirst ? Crown : isSecond ? Medal : Award;
                    const Icon = icon;

                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "relative rounded-xl border-2 p-4 text-center shadow-sm hover:shadow-md transition-all",
                          cardClass
                        )}
                      >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">
                          {medal}
                        </div>
                        <div className="flex flex-col items-center gap-2 mt-2">
                          <div className="relative">
                            <Avatar className="w-16 h-16 border-4 border-white shadow">
                              {r.avatar ? (
                                <AvatarImage src={r.avatar} alt={r.name} />
                              ) : null}
                              <AvatarFallback className={cn("text-lg font-semibold", iconBg)}>
                                {initials(r.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white",
                              iconBg
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{r.name}</p>
                            <Badge
                              variant="outline"
                              className={cn("mt-1 text-[10px] py-0 px-1.5", ROLE_COLORS[r.role])}
                            >
                              {r.roleLabel}
                            </Badge>
                          </div>
                          <div className="w-full mt-1">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                              <span>Produktivitas</span>
                              <span className="font-bold text-slate-800">
                                {formatNumber(r.productivityScore)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                              <span>Disiplin</span>
                              <span className="font-semibold text-slate-700">
                                {r.disciplineRate}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", disciplineColor(r.disciplineRate))}
                                style={{ width: `${Math.min(100, r.disciplineRate)}%` }}
                              />
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

          {/* Full Ranking Table */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Ranking Lengkap</h3>
                  <p className="text-sm text-slate-500">
                    {sorted.length} karyawan • Diurutkan berdasarkan produktivitas
                  </p>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 custom-scroll">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50 z-10">
                    <TableRow>
                      <TableHead className="w-14 text-center">#</TableHead>
                      <TableHead className="min-w-[180px]">Nama</TableHead>
                      <TableHead className="w-40">Role</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                      <TableHead className="text-center w-32">Tugas</TableHead>
                      <TableHead className="w-40">Disiplin</TableHead>
                      <TableHead className="text-right">Konten</TableHead>
                      <TableHead className="text-right">Artikel</TableHead>
                      <TableHead className="text-right">Produktivitas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((r, i) => (
                      <TableRow key={r.id} className="hover:bg-slate-50">
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold",
                              i === 0 ? "bg-amber-100 text-amber-700" :
                              i === 1 ? "bg-slate-200 text-slate-700" :
                              i === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-slate-100 text-slate-500"
                            )}
                          >
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8">
                              {r.avatar ? <AvatarImage src={r.avatar} alt={r.name} /> : null}
                              <AvatarFallback className="text-xs bg-emerald-50 text-emerald-700">
                                {initials(r.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{r.name}</p>
                              {r.position && (
                                <p className="text-xs text-slate-500 truncate">{r.position}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", ROLE_COLORS[r.role])}>
                            {r.roleLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-800">
                          {formatNumber(r.score)}
                        </TableCell>
                        <TableCell className="text-center text-sm text-slate-600">
                          <span className="font-semibold text-slate-800">{r.doneTasks}</span>
                          <span className="text-slate-400"> / {r.totalTasks}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-[60px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", disciplineColor(r.disciplineRate))}
                                style={{ width: `${Math.min(100, r.disciplineRate)}%` }}
                              />
                            </div>
                            <Badge variant="outline" className={cn("text-xs", disciplineBadge(r.disciplineRate))}>
                              {r.disciplineRate}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-700">
                          {formatNumber(r.contentProduced)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-700">
                          {formatNumber(r.articlesPublished)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {formatNumber(r.productivityScore)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 max-h-[28rem] overflow-y-auto custom-scroll pr-1">
                {sorted.map((r, i) => (
                  <div
                    key={r.id}
                    className={cn(
                      "rounded-lg border p-3",
                      i === 0 ? "border-amber-200 bg-amber-50/40" :
                      i === 1 ? "border-slate-200 bg-slate-50/40" :
                      i === 2 ? "border-orange-200 bg-orange-50/40" :
                      "border-slate-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          i === 0 ? "bg-amber-100 text-amber-700" :
                          i === 1 ? "bg-slate-200 text-slate-700" :
                          i === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-slate-100 text-slate-500"
                        )}
                      >
                        {i + 1}
                      </span>
                      <Avatar className="w-10 h-10 shrink-0">
                        {r.avatar ? <AvatarImage src={r.avatar} alt={r.name} /> : null}
                        <AvatarFallback className="text-xs bg-emerald-50 text-emerald-700">
                          {initials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900 truncate">{r.name}</p>
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 shrink-0">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {formatNumber(r.productivityScore)}
                          </span>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] mt-0.5", ROLE_COLORS[r.role])}>
                          {r.roleLabel}
                        </Badge>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div>
                            <p className="text-slate-400">Skor</p>
                            <p className="font-semibold text-slate-800">{formatNumber(r.score)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Tugas</p>
                            <p className="font-semibold text-slate-800">{r.doneTasks}/{r.totalTasks}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Disiplin</p>
                            <p className="font-semibold text-slate-800">{r.disciplineRate}%</p>
                          </div>
                        </div>
                        <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", disciplineColor(r.disciplineRate))}
                            style={{ width: `${Math.min(100, r.disciplineRate)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Trophy className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">Belum ada data scoreboard</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Belum ada aktivitas yang tercatat pada periode ini. Coba ubah periode ke &quot;Semua&quot; untuk melihat seluruh riwayat.
        </p>
      </CardContent>
    </Card>
  );
}
