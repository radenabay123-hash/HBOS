"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, SectionHeader } from "@/components/shared/stat-card";
import { api } from "@/lib/api-client";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import {
  ROLES,
  CLIENT_STATUS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  ROLE_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/constants";
import type { SafeUser } from "@/lib/auth";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  FileText,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Target,
  TrendingUp,
  Handshake,
  XCircle,
  Inbox,
  Loader2,
} from "lucide-react";

interface ClientItem {
  id: string;
  namaKlien: string;
  instansi?: string | null;
  pic?: string | null;
  nomorWA?: string | null;
  email?: string | null;
  jenisTraining?: string | null;
  jumlahPeserta?: number | null;
  budget?: number | null;
  lokasi?: string | null;
  tanggalEvent?: string | null;
  status: string;
  catatanFollowUp?: string | null;
  reminderFollowUp?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; role: string } | null;
  _count?: { events: number; documents: number; financeTxns: number };
  createdAt: string;
  updatedAt: string;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

interface CrmModuleProps {
  user: SafeUser;
}

const EMPTY_FORM = {
  namaKlien: "",
  instansi: "",
  pic: "",
  nomorWA: "",
  email: "",
  jenisTraining: "",
  jumlahPeserta: "",
  budget: "",
  lokasi: "",
  tanggalEvent: "",
  status: "LEAD",
  catatanFollowUp: "",
  reminderFollowUp: "",
  assignedToId: "",
};

// Convert ISO date to YYYY-MM-DD for date input
function toDateInput(d?: string | null): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function toDateTimeInput(d?: string | null): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${hh}:${mm}`;
  } catch {
    return "";
  }
}

export function CrmModule({ user }: CrmModuleProps) {
  const canManage = user.role === ROLES.OWNER || user.role === ROLES.PROJECT_MANAGER;
  const isOwner = user.role === ROLES.OWNER;

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ clients: ClientItem[] }>("/api/clients");
      setClients(data.clients || []);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat data klien");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (!isOwner) return;
    try {
      const data = await api<{ users: UserOption[] }>("/api/users");
      setUsers(data.users || []);
    } catch {
      // Owner-only endpoint; silently ignore
    }
  }, [isOwner]);

  useEffect(() => {
    loadClients();
    loadUsers();
  }, [loadClients, loadUsers]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = [c.namaKlien, c.instansi, c.pic, c.email, c.jenisTraining]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [clients, statusFilter, search]);

  const stats = useMemo(() => {
    const total = clients.length;
    const lead = clients.filter((c) => c.status === "LEAD").length;
    const proposal = clients.filter((c) => c.status === "PROPOSAL").length;
    const deal = clients.filter((c) => c.status === "DEAL").length;
    const lost = clients.filter((c) => c.status === "LOST").length;
    return { total, lead, proposal, deal, lost };
  }, [clients]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      assignedToId: isOwner ? "" : user.id,
    });
    setDialogOpen(true);
  }

  function openEdit(c: ClientItem) {
    setEditing(c);
    setForm({
      namaKlien: c.namaKlien || "",
      instansi: c.instansi || "",
      pic: c.pic || "",
      nomorWA: c.nomorWA || "",
      email: c.email || "",
      jenisTraining: c.jenisTraining || "",
      jumlahPeserta: c.jumlahPeserta != null ? String(c.jumlahPeserta) : "",
      budget: c.budget != null ? String(c.budget) : "",
      lokasi: c.lokasi || "",
      tanggalEvent: toDateInput(c.tanggalEvent),
      status: c.status || "LEAD",
      catatanFollowUp: c.catatanFollowUp || "",
      reminderFollowUp: toDateTimeInput(c.reminderFollowUp),
      assignedToId: c.assignedToId || (isOwner ? "" : user.id),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.namaKlien.trim()) {
      toast.error("Nama klien wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        namaKlien: form.namaKlien.trim(),
        instansi: form.instansi.trim() || null,
        pic: form.pic.trim() || null,
        nomorWA: form.nomorWA.trim() || null,
        email: form.email.trim() || null,
        jenisTraining: form.jenisTraining.trim() || null,
        jumlahPeserta: form.jumlahPeserta ? Number(form.jumlahPeserta) : null,
        budget: form.budget ? Number(form.budget) : null,
        lokasi: form.lokasi.trim() || null,
        tanggalEvent: form.tanggalEvent ? form.tanggalEvent : null,
        status: form.status,
        catatanFollowUp: form.catatanFollowUp.trim() || null,
        reminderFollowUp: form.reminderFollowUp ? form.reminderFollowUp : null,
        assignedToId: form.assignedToId || null,
      };

      if (editing) {
        await api(`/api/clients/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Klien berhasil diperbarui");
      } else {
        await api("/api/clients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Klien baru ditambahkan");
      }
      setDialogOpen(false);
      await loadClients();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan klien");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api(`/api/clients/${deleteId}`, { method: "DELETE" });
      toast.success("Klien berhasil dihapus");
      setDeleteId(null);
      await loadClients();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus klien");
    } finally {
      setDeleting(false);
    }
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const rows = filtered.map((c) => ({
      "Nama Klien": c.namaKlien || "",
      Instansi: c.instansi || "",
      PIC: c.pic || "",
      "No. WA": c.nomorWA || "",
      Email: c.email || "",
      "Jenis Training": c.jenisTraining || "",
      Peserta: c.jumlahPeserta ?? 0,
      Budget: c.budget ?? 0,
      Lokasi: c.lokasi || "",
      "Tanggal Event": c.tanggalEvent ? formatDate(c.tanggalEvent) : "",
      Status: CLIENT_STATUS_LABELS[c.status] || c.status,
      "Catatan Follow Up": c.catatanFollowUp || "",
      "Reminder Follow Up": c.reminderFollowUp ? formatDateTime(c.reminderFollowUp) : "",
      "Ditugaskan Kepada": c.assignedTo?.name || "-",
      "Dibuat Pada": formatDate(c.createdAt),
    }));
    exportToExcel(rows, `CRM-Clients-${new Date().toISOString().slice(0, 10)}`, "CRM Clients");
    toast.success("Excel berhasil diekspor");
  }

  function handleExportPDF() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const columns = [
      "Nama Klien", "Instansi", "PIC", "Jenis Training", "Peserta",
      "Budget", "Status", "Tanggal Event", "PIC Internal",
    ];
    const rows = filtered.map((c) => [
      c.namaKlien || "-",
      c.instansi || "-",
      c.pic || "-",
      c.jenisTraining || "-",
      c.jumlahPeserta ?? 0,
      c.budget ? formatCurrency(c.budget) : "-",
      CLIENT_STATUS_LABELS[c.status] || c.status,
      c.tanggalEvent ? formatDate(c.tanggalEvent) : "-",
      c.assignedTo?.name || "-",
    ]);
    exportToPDF(
      "CRM - Client Management",
      columns,
      rows,
      `CRM-Clients-${new Date().toISOString().slice(0, 10)}.pdf`,
      `Total: ${filtered.length} klien`
    );
    toast.success("PDF berhasil diekspor");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="CRM Client Management"
        description="Kelola prospek klien, follow up, dan status deal dari seluruh pipeline penjualan."
        action={
          canManage ? (
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" /> Tambah Klien
            </Button>
          ) : undefined
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Lead"
          value={stats.lead}
          icon={Target}
          indicator="neutral"
          subtitle={`dari ${stats.total} klien`}
          accent="bg-slate-100 text-slate-600"
        />
        <StatCard
          title="Total Proposal"
          value={stats.proposal}
          icon={FileText}
          indicator="yellow"
          subtitle="Menunggu respon klien"
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Total Deal"
          value={stats.deal}
          icon={Handshake}
          indicator="green"
          subtitle="Klien yang deal"
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Total Lost"
          value={stats.lost}
          icon={XCircle}
          indicator="red"
          subtitle="Klien yang gagal"
          accent="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari nama klien, instansi, PIC, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                {CLIENT_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CLIENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF} className="flex-1 sm:flex-none">
                <FileText className="w-4 h-4" /> PDF
              </Button>
              <Button variant="outline" onClick={handleExportExcel} className="flex-1 sm:flex-none">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">Belum ada data klien</p>
              <p className="text-sm text-slate-400 mt-1">
                {canManage ? "Klik tombol Tambah Klien untuk menambah data baru." : "Data klien belum tersedia."}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="min-w-[180px]">Nama Klien</TableHead>
                    <TableHead className="min-w-[160px]">Instansi</TableHead>
                    <TableHead className="min-w-[140px]">PIC</TableHead>
                    <TableHead className="min-w-[160px]">Jenis Training</TableHead>
                    <TableHead className="text-center">Peserta</TableHead>
                    <TableHead className="text-right min-w-[140px]">Budget</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Tanggal Event</TableHead>
                    {canManage && <TableHead className="text-center min-w-[100px]">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900">{c.namaKlien}</div>
                        {c.email && <div className="text-xs text-slate-500">{c.email}</div>}
                      </TableCell>
                      <TableCell className="text-slate-700">{c.instansi || "-"}</TableCell>
                      <TableCell>
                        <div className="text-slate-700">{c.pic || "-"}</div>
                        {c.nomorWA && <div className="text-xs text-slate-500">{c.nomorWA}</div>}
                      </TableCell>
                      <TableCell className="text-slate-700">{c.jenisTraining || "-"}</TableCell>
                      <TableCell className="text-center text-slate-700">
                        {c.jumlahPeserta ?? "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {c.budget != null ? formatCurrency(c.budget) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={CLIENT_STATUS_COLORS[c.status] || "bg-slate-100 text-slate-700 border-slate-200"}
                        >
                          {CLIENT_STATUS_LABELS[c.status] || c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {c.tanggalEvent ? formatDate(c.tanggalEvent) : "-"}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-rose-600"
                              onClick={() => setDeleteId(c.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Klien" : "Tambah Klien Baru"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui informasi klien dan status follow up."
                : "Lengkapi data klien untuk pipeline CRM."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="namaKlien">Nama Klien *</Label>
                <Input
                  id="namaKlien"
                  value={form.namaKlien}
                  onChange={(e) => setForm({ ...form, namaKlien: e.target.value })}
                  required
                  placeholder="PT Maju Bersama"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instansi">Instansi</Label>
                <Input
                  id="instansi"
                  value={form.instansi}
                  onChange={(e) => setForm({ ...form, instansi: e.target.value })}
                  placeholder="Nama perusahaan / instansi"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pic">PIC</Label>
                <Input
                  id="pic"
                  value={form.pic}
                  onChange={(e) => setForm({ ...form, pic: e.target.value })}
                  placeholder="Nama contact person"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nomorWA">Nomor WA</Label>
                <Input
                  id="nomorWA"
                  value={form.nomorWA}
                  onChange={(e) => setForm({ ...form, nomorWA: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="pic@instansi.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jenisTraining">Jenis Training</Label>
                <Input
                  id="jenisTraining"
                  value={form.jenisTraining}
                  onChange={(e) => setForm({ ...form, jenisTraining: e.target.value })}
                  placeholder="Leadership Training"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jumlahPeserta">Jumlah Peserta</Label>
                <Input
                  id="jumlahPeserta"
                  type="number"
                  min="0"
                  value={form.jumlahPeserta}
                  onChange={(e) => setForm({ ...form, jumlahPeserta: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="budget">Budget (Rp)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="25000000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lokasi">Lokasi</Label>
                <Input
                  id="lokasi"
                  value={form.lokasi}
                  onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                  placeholder="Jakarta"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tanggalEvent">Tanggal Event</Label>
                <Input
                  id="tanggalEvent"
                  type="date"
                  value={form.tanggalEvent}
                  onChange={(e) => setForm({ ...form, tanggalEvent: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {CLIENT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignedToId">Ditugaskan Kepada</Label>
                {isOwner ? (
                  <Select
                    value={form.assignedToId}
                    onValueChange={(v) => setForm({ ...form, assignedToId: v })}
                  >
                    <SelectTrigger id="assignedToId" className="w-full">
                      <SelectValue placeholder="Pilih anggota tim" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({ROLE_LABELS[u.role] || u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="assignedToId"
                    value={`${user.name} (Anda)`}
                    disabled
                    className="bg-slate-50"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reminderFollowUp">Reminder Follow Up</Label>
                <Input
                  id="reminderFollowUp"
                  type="datetime-local"
                  value={form.reminderFollowUp}
                  onChange={(e) => setForm({ ...form, reminderFollowUp: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catatanFollowUp">Catatan Follow Up</Label>
              <Textarea
                id="catatanFollowUp"
                value={form.catatanFollowUp}
                onChange={(e) => setForm({ ...form, catatanFollowUp: e.target.value })}
                placeholder="Catatan hasil komunikasi dengan klien..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : editing ? (
                  "Simpan Perubahan"
                ) : (
                  "Tambah Klien"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Klien?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data klien, event, dokumen, dan transaksi terkait
              akan ikut terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menghapus...
                </>
              ) : (
                "Ya, Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
