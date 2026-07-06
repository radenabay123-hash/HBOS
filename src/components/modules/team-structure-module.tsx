"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, Crown, Briefcase, GraduationCap, PenTool, Monitor, Wallet,
  CheckCircle2, AlertCircle, Phone, Mail, Calendar, Plus, Edit3, Trash2, RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, ROLE_COLORS, formatDate } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SafeUser } from "@/lib/auth";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  biodata?: {
    nik: string | null;
    tempatLahir: string | null;
    tanggalLahir: string | null;
    npwp: string | null;
    bankName: string | null;
    bankAccount: string | null;
  };
}

// Role definitions with responsibilities
const ROLE_DEFINITIONS: Record<string, {
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  responsibilities: string[];
  kpiTargets: { label: string; weight: number }[];
  reports: string[];
}> = {
  OWNER: {
    icon: Crown,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Pemilik perusahaan yang bertanggung jawab atas seluruh operasional bisnis dan strategi pertumbuhan.",
    responsibilities: [
      "Menentukan visi, misi, dan strategi perusahaan",
      "Mengawasi seluruh operasional bisnis (Hafara Group)",
      "Mengambil keputusan strategis (ekspansi, investasi, partnership)",
      "Approve anggaran dan pengeluaran besar",
      "Menjaga relasi dengan klien utama (key accounts)",
      "Review laporan keuangan & KPI tim bulanan",
      "Approve recruitment dan termination karyawan",
      "Memimpin rapat strategis mingguan/bulanan",
      "Mengelola personal branding (M. Aqil Baihaqi) sebagai public figure",
      "Final approver untuk semua dokumen resmi perusahaan",
    ],
    kpiTargets: [
      { label: "Revenue Growth", weight: 30 },
      { label: "Profit Margin", weight: 25 },
      { label: "Client Retention", weight: 20 },
      { label: "Team Productivity", weight: 15 },
      { label: "Brand Reputation", weight: 10 },
    ],
    reports: ["Laporan Keuangan Bulanan", "Dashboard KPI Tim", "Laporan CRM Pipeline", "Scoreboard Tim"],
  },
  PROJECT_MANAGER: {
    icon: Briefcase,
    color: "text-violet-600",
    bgColor: "bg-violet-50 border-violet-200",
    description: "Mengelola proyek training dari hulu ke hilir, memastikan deliverables sesuai timeline dan kualitas.",
    responsibilities: [
      "Mengelola pipeline CRM (Lead → Deal)",
      "Membuat proposal & surat penawaran untuk klien",
      "Menjadwalkan event training (koordinasi tanggal, lokasi, trainer)",
      "Mengelola dokumen (SPK, Invoice, Surat Resmi)",
      "Koordinasi dengan trainer untuk pelaksanaan training",
      "Follow up klien untuk pembayaran",
      "Mengelola checklist persiapan event",
      "Membuat laporan progress proyek untuk owner",
      "Approve tugas harian tim",
      "Menjaga relasi klien post-training",
    ],
    kpiTargets: [
      { label: "Conversion Rate (Lead→Deal)", weight: 30 },
      { label: "Event Completion Rate", weight: 25 },
      { label: "Client Satisfaction", weight: 25 },
      { label: "Invoice Collection", weight: 20 },
    ],
    reports: ["Pipeline CRM", "Event Calendar", "Invoice Status", "Dokumen Tracking"],
  },
  ASSISTANT_TRAINER: {
    icon: GraduationCap,
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Mendukung pelaksanaan training, mempersiapkan materi, dan membantu trainer utama saat event.",
    responsibilities: [
      "Mempersiapkan materi training (slide, handout, modul)",
      "Membantu trainer utama selama pelaksanaan training",
      "Mengelola checklist persiapan event (logistik, konsumsi, ruangan)",
      "Menginput tugas harian di sistem HBOS",
      "Mengelola Kanban Board (update status pekerjaan)",
      "Melakukan riset konten untuk training",
      "Membuat materi promosi training (brosur, slide deck)",
      "Absensi tepat waktu setiap hari kerja",
      "Mengisi biodata karyawan secara lengkap",
      "Melaporkan progress ke Project Manager",
    ],
    kpiTargets: [
      { label: "Event Readiness", weight: 30 },
      { label: "Material Quality", weight: 25 },
      { label: "Attendance", weight: 25 },
      { label: "Kanban Completion", weight: 20 },
    ],
    reports: ["Kanban Board", "Daily Tasks", "Event Checklist", "Absensi"],
  },
  CONTENT_CREATIVE: {
    icon: PenTool,
    color: "text-pink-600",
    bgColor: "bg-pink-50 border-pink-200",
    description: "Membuat dan mengelola konten kreatif untuk semua platform media sosial Hafara Group.",
    responsibilities: [
      "Produksi konten reels/video untuk Instagram & TikTok",
      "Mendesain visual konten (Canva, CapCut)",
      "Mengelola CMS (Content Management System) untuk website",
      "Menjadwalkan upload konten di 13+ website",
      "Menginput ide konten di sistem HBOS untuk ACC owner",
      "Membuat artikel SEO untuk website Hafara Group",
      "Editing video dan foto untuk konten promosi",
      "Mengelola tugas konten harian",
      "Absensi tepat waktu setiap hari kerja",
      "Melaporkan progress konten ke Project Manager",
    ],
    kpiTargets: [
      { label: "Content Output (qty)", weight: 30 },
      { label: "Content Quality (ACC rate)", weight: 25 },
      { label: "Article Publishing", weight: 25 },
      { label: "Attendance", weight: 20 },
    ],
    reports: ["Tugas Konten", "Data Artikel", "Kanban Board", "Absensi"],
  },
  DIGITAL_MARKETING_IT: {
    icon: Monitor,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 border-cyan-200",
    description: "Mengelola pemasaran digital, SEO, dan infrastruktur IT perusahaan.",
    responsibilities: [
      "Mengelola iklan digital (Meta Ads, Google Ads)",
      "Optimasi SEO untuk website Hafara Group",
      "Maintenance dan update website (13+ website)",
      "Mengelola media sosial (strategy, scheduling, analytics)",
      "Riset pasar dan analisis kompetitor",
      "Mengelola email marketing dan broadcast",
      "Maintenance sistem HBOS (troubleshooting, backup)",
      "Mengelola domain dan hosting",
      "Absensi tepat waktu setiap hari kerja",
      "Melaporkan metrics digital ke Project Manager & Owner",
    ],
    kpiTargets: [
      { label: "Website Traffic", weight: 25 },
      { label: "Lead Generation (Digital)", weight: 30 },
      { label: "SEO Ranking", weight: 25 },
      { label: "Attendance", weight: 20 },
    ],
    reports: ["Digital Metrics", "SEO Report", "Ad Performance", "Absensi"],
  },
  FINANCE: {
    icon: Wallet,
    color: "text-sky-600",
    bgColor: "bg-sky-50 border-sky-200",
    description: "Mengelola seluruh keuangan perusahaan, payroll, pajak, dan pelaporan keuangan.",
    responsibilities: [
      "Input arus kas harian (pemasukan & pengeluaran)",
      "Mengelola payroll & slip gaji karyawan bulanan",
      "Menghitung dan membayar pajak (PPh 21/23/Badan, PPN)",
      "Membuat laporan laba rugi bulanan",
      "Mengelola neraca keuangan",
      "Mengelola piutang & hutang",
      "Membuat dokumen SPT Badan (Neraca, Laba Rugi, Bukti Potong, SSP)",
      "Mengelola kategori keuangan",
      "Rekap absensi untuk perhitungan gaji",
      "Melaporkan kondisi keuangan ke Owner",
    ],
    kpiTargets: [
      { label: "Financial Reporting Accuracy", weight: 30 },
      { label: "Tax Compliance", weight: 25 },
      { label: "Payroll Timeliness", weight: 25 },
      { label: "Attendance", weight: 20 },
    ],
    reports: ["Laporan Keuangan", "Arus Kas", "Payroll Summary", "Laporan Pajak"],
  },
};

export function TeamStructureModule({ user }: { user: SafeUser }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [responsibilities, setResponsibilities] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const isOwner = user.role === ROLES.OWNER;

  // Edit/Add responsibility dialog
  const [respDialog, setRespDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [respForm, setRespForm] = useState({ title: "" });
  const [respSaving, setRespSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [membersRes, respRes] = await Promise.all([
        api<{ users: TeamMember[] }>("/api/users").catch(() => ({ users: [] })),
        api<{ grouped: Record<string, any[]> }>("/api/role-responsibilities").catch(() => ({ grouped: {} })),
      ]);
      setMembers(membersRes.users || []);
      setResponsibilities(respRes.grouped || {});
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Responsibility CRUD
  async function handleSaveResp() {
    if (!respForm.title.trim()) { toast.error("Tanggung jawab wajib diisi"); return; }
    if (!selectedRole) return;
    setRespSaving(true);
    try {
      if (respDialog.item) {
        await api("/api/role-responsibilities", { method: "PUT", body: JSON.stringify({ id: respDialog.item.id, title: respForm.title }) });
        toast.success("Tanggung jawab diperbarui");
      } else {
        await api("/api/role-responsibilities", { method: "POST", body: JSON.stringify({ role: selectedRole, title: respForm.title }) });
        toast.success("Tanggung jawab ditambahkan");
      }
      setRespDialog({ open: false, item: null });
      setRespForm({ title: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setRespSaving(false); }
  }

  async function handleDeleteResp(id: string) {
    if (!confirm("Hapus tanggung jawab ini?")) return;
    try {
      await api(`/api/role-responsibilities?id=${id}`, { method: "DELETE" });
      toast.success("Dihapus");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  function openAddResp() {
    setRespForm({ title: "" });
    setRespDialog({ open: true, item: null });
  }

  function openEditResp(item: any) {
    setRespForm({ title: item.title });
    setRespDialog({ open: true, item });
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const allRoles = [ROLES.OWNER, ...Object.values(ROLES).filter(r => r !== ROLES.OWNER)];
  const selectedDef = selectedRole ? ROLE_DEFINITIONS[selectedRole] : null;
  const selectedMembers = selectedRole ? members.filter(m => m.role === selectedRole) : [];
  const selectedResps = selectedRole ? (responsibilities[selectedRole] || []) : [];

  function initials(name: string) {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" /> Struktur Tim & Tanggung Jawab
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isOwner ? "Pantau struktur organisasi dan tanggung jawab setiap role." : "Lihat struktur tim dan tanggung jawab role Anda."}
        </p>
      </div>

      {/* Org Chart — visual hierarchy */}
      <Card className="shadow-sm border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            {/* Owner (top) */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                <Crown className="w-7 h-7" />
              </div>
              <p className="font-bold text-slate-900 text-sm mt-2">Owner</p>
              <p className="text-xs text-slate-500">M. Aqil Baihaqi</p>
            </div>

            {/* Connector line */}
            <div className="w-px h-6 bg-slate-300" />

            {/* Team row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.values(ROLES).filter(r => r !== ROLES.OWNER).map((role) => {
                const def = ROLE_DEFINITIONS[role];
                const Icon = def.icon;
                const count = members.filter(m => m.role === role).length;
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-xl border-2 transition-all hover:shadow-md",
                      selectedRole === role ? def.bgColor : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", def.bgColor)}>
                      <Icon className={cn("w-5 h-5", def.color)} />
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-1.5 text-center leading-tight">{ROLE_LABELS[role]}</p>
                    <p className="text-[10px] text-slate-400">{count} orang</p>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role detail panel (when selected) */}
      {selectedDef && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Responsibilities */}
          <Card className={cn("shadow-sm border-2 lg:col-span-2", selectedDef.bgColor)}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedDef.bgColor)}>
                  <selectedDef.icon className={cn("w-5 h-5", selectedDef.color)} />
                </div>
                <div>
                  <CardTitle className="text-base">{ROLE_LABELS[selectedRole!]}</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedDef.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Responsibilities — from DB, with CRUD for owner */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Tanggung Jawab Utama</p>
                  {isOwner && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] bg-white" onClick={openAddResp}>
                      <Plus className="w-3 h-3 mr-0.5" /> Tambah
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedResps.length === 0 ? (
                    <p className="text-xs text-slate-400 col-span-2 py-2">Belum ada tanggung jawab. {isOwner ? "Klik Tambah untuk menambah." : ""}</p>
                  ) : (
                    selectedResps.map((r: any, i: number) => (
                      <div key={r.id} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-100 group hover:border-blue-200 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-700 flex-1">{r.title}</span>
                        {isOwner && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => openEditResp(r)}><Edit3 className="w-3 h-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-rose-600" onClick={() => handleDeleteResp(r.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* KPI Targets */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Target KPI (Bobot Penilaian)</p>
                <div className="space-y-1.5">
                  {selectedDef.kpiTargets.map((kpi, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full flex items-center px-2", selectedDef.bgColor)} style={{ width: `${kpi.weight}%` }}>
                          <span className="text-[10px] font-semibold text-slate-700 truncate">{kpi.label}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-600 w-8 text-right">{kpi.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reports */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Laporan yang Dihasilkan</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDef.reports.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] bg-white">{r}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Team members in this role */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Anggota Tim ({selectedMembers.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedMembers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada anggota</p>
              ) : (
                selectedMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 hover:bg-slate-50">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0", ROLE_COLORS[m.role])}>
                      {initials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        {m.isActive ? <span className="text-green-600">● Aktif</span> : <span className="text-slate-400">○ Nonaktif</span>}
                        <span>·</span>
                        <span>Bergabung: {formatDate(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full team overview (always visible) */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Semua Anggota Tim ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m) => {
              const def = ROLE_DEFINITIONS[m.role];
              const Icon = def?.icon || Users;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedRole(m.role)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", def?.bgColor || "bg-slate-100")}>
                    <Icon className={cn("w-5 h-5", def?.color || "text-slate-400")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>
                    <Badge variant="outline" className={cn("text-[9px] mt-0.5", ROLE_COLORS[m.role])}>
                      {ROLE_LABELS[m.role]}
                    </Badge>
                  </div>
                  {m.isActive ? (
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Aktif" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" title="Nonaktif" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Responsibility Dialog */}
      <Dialog open={respDialog.open} onOpenChange={(o) => setRespDialog({ open: o, item: respDialog.item })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{respDialog.item ? "Edit Tanggung Jawab" : "Tambah Tanggung Jawab"}</DialogTitle>
            <DialogDescription>
              {selectedRole ? `Role: ${ROLE_LABELS[selectedRole]}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tanggung Jawab *</Label>
              <Input
                value={respForm.title}
                onChange={(e) => setRespForm({ ...respForm, title: e.target.value })}
                placeholder="e.g. Mengelola pipeline CRM (Lead → Deal)"
                className="bg-white"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespDialog({ open: false, item: null })}>Batal</Button>
            <Button onClick={handleSaveResp} disabled={respSaving} className="bg-blue-600 hover:bg-blue-700">
              {respSaving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              {respDialog.item ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
