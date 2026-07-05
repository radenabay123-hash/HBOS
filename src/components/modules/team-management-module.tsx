"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Users, UserCheck, UserX, UserPlus, Pencil, Trash2, Power, FileDown,
  FileSpreadsheet, Loader2, Search, ShieldAlert,
} from "lucide-react";

import { api } from "@/lib/api-client";
import {
  ROLES, ROLE_LABELS, ROLE_COLORS, TEAM_ROLES,
  formatDate,
} from "@/lib/constants";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { StatCard, SectionHeader } from "@/components/shared/stat-card";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
  position?: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { tasks: number; contentIdeas: number; articles: number };
}

interface FormState {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  position: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  role: TEAM_ROLES[0],
  phone: "",
  position: "",
  isActive: true,
};

export function TeamManagementModule() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ users: UserRow[] }>("/api/users");
      setUsers(data.users);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat data tim");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Stat cards
  const total = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = total - activeCount;
  const roleBreakdown = TEAM_ROLES.map((r) => ({
    role: r,
    count: users.filter((u) => u.role === r).length,
  }));

  // Filtered list
  const filtered = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.position || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  function openAdd() {
    setForm(EMPTY_FORM);
    setAddOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      phone: u.phone || "",
      position: u.position || "",
      isActive: u.isActive,
    });
    setEditOpen(true);
  }

  async function handleAdd() {
    if (!form.name || !form.email || !form.password || !form.role) {
      toast.error("Nama, email, password, dan role wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          phone: form.phone || undefined,
          position: form.position || undefined,
        }),
      });
      toast.success("Anggota tim berhasil ditambahkan");
      setAddOpen(false);
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menambah anggota");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editing) return;
    if (!form.name || !form.email || !form.role) {
      toast.error("Nama, email, dan role wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const body: any = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || "",
        position: form.position || "",
        isActive: form.isActive,
      };
      if (form.password) body.password = form.password;
      await api(`/api/users/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      toast.success("Data anggota diperbarui");
      setEditOpen(false);
      setEditing(null);
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || "Gagal memperbarui anggota");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(u: UserRow) {
    try {
      await api(`/api/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      toast.success(u.isActive ? "Anggota dinonaktifkan" : "Anggota diaktifkan");
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengubah status");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Anggota dihapus");
      setDeleteTarget(null);
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus anggota");
    } finally {
      setDeleting(false);
    }
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const rows = filtered.map((u) => ({
      Nama: u.name,
      Email: u.email,
      Role: ROLE_LABELS[u.role] || u.role,
      Posisi: u.position || "-",
      Telepon: u.phone || "-",
      Status: u.isActive ? "Aktif" : "Nonaktif",
      Tugas: u._count.tasks,
      Konten: u._count.contentIdeas,
      Artikel: u._count.articles,
      Bergabung: formatDate(u.createdAt),
    }));
    exportToExcel(rows, "manajemen-tim", "Tim");
    toast.success("Excel diunduh");
  }

  function handleExportPDF() {
    if (filtered.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const columns = ["Nama", "Email", "Role", "Posisi", "Telepon", "Status", "Tugas", "Konten", "Artikel", "Bergabung"];
    const rows = filtered.map((u) => [
      u.name,
      u.email,
      ROLE_LABELS[u.role] || u.role,
      u.position || "-",
      u.phone || "-",
      u.isActive ? "Aktif" : "Nonaktif",
      u._count.tasks,
      u._count.contentIdeas,
      u._count.articles,
      formatDate(u.createdAt),
    ]);
    exportToPDF(
      "Manajemen Tim",
      columns,
      rows,
      "manajemen-tim",
      `Total: ${filtered.length} anggota`
    );
    toast.success("PDF diunduh");
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Manajemen Tim"
        description="Kelola akun tim. Hanya owner yang dapat menambah, mengedit, atau menghapus akun."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={loading || users.length === 0}>
              <FileDown className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={loading || users.length === 0}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={openAdd}>
              <UserPlus className="w-4 h-4" /> Tambah Anggota
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total Anggota"
              value={total}
              icon={Users}
              accent="bg-emerald-50 text-emerald-600"
              subtitle="Seluruh akun tim"
            />
            <StatCard
              title="Aktif"
              value={activeCount}
              icon={UserCheck}
              indicator={activeCount > 0 ? "green" : "neutral"}
              accent="bg-emerald-50 text-emerald-600"
              subtitle={`${total > 0 ? Math.round((activeCount / total) * 100) : 0}% dari total`}
            />
            <StatCard
              title="Nonaktif"
              value={inactiveCount}
              icon={UserX}
              indicator={inactiveCount > 0 ? "red" : "neutral"}
              accent="bg-rose-50 text-rose-600"
              subtitle="Akun dimatikan"
            />
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Per Role</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {roleBreakdown.map((r) => (
                    <Badge
                      key={r.role}
                      variant="outline"
                      className={`text-[10px] ${ROLE_COLORS[r.role] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                    >
                      {ROLE_LABELS[r.role] || r.role}: {r.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filter & search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama, email, posisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Semua Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Role</SelectItem>
            {TEAM_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onAdd={openAdd} hasFilter={search !== "" || roleFilter !== "ALL"} />
          ) : (
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50 z-10">
                  <TableRow>
                    <TableHead className="min-w-[160px]">Nama</TableHead>
                    <TableHead className="min-w-[180px]">Email</TableHead>
                    <TableHead className="min-w-[140px]">Role</TableHead>
                    <TableHead className="min-w-[140px]">Posisi</TableHead>
                    <TableHead className="min-w-[130px]">Telepon</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="text-center min-w-[70px]">Tugas</TableHead>
                    <TableHead className="text-center min-w-[70px]">Konten</TableHead>
                    <TableHead className="text-center min-w-[70px]">Artikel</TableHead>
                    <TableHead className="min-w-[110px]">Bergabung</TableHead>
                    <TableHead className="text-right min-w-[160px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id} className={!u.isActive ? "opacity-60" : ""}>
                      <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                      <TableCell className="text-slate-600 text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[u.role] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{u.position || "-"}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{u.phone || "-"}</TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">Aktif</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border border-slate-200">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">{u._count.tasks}</TableCell>
                      <TableCell className="text-center text-sm">{u._count.contentIdeas}</TableCell>
                      <TableCell className="text-center text-sm">{u._count.articles}</TableCell>
                      <TableCell className="text-slate-600 text-xs">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openEdit(u)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => handleToggleActive(u)}
                            title={u.isActive ? "Nonaktifkan" : "Aktifkan"}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => setDeleteTarget(u)}
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Anggota Tim</DialogTitle>
            <DialogDescription>
              Buat akun baru untuk anggota tim. Role owner tidak dapat dibuat melalui form ini.
            </DialogDescription>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} passwordRequired />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleAdd}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Anggota Tim</DialogTitle>
            <DialogDescription>
              Perbarui data anggota. Kosongkan password jika tidak ingin mengubahnya.
            </DialogDescription>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} passwordRequired={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditing(null); }} disabled={submitting}>
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleEdit}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Hapus Anggota Tim?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus akun <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}).
              Tindakan ini tidak dapat dibatalkan. Semua data terkait akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================ Sub components ============================

function UserForm({
  form,
  setForm,
  passwordRequired,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  passwordRequired: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2 sm:col-span-1">
        <Label>Nama Lengkap *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="cth. Budi Santoso"
        />
      </div>
      <div className="space-y-1.5 col-span-2 sm:col-span-1">
        <Label>Email *</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="nama@hafara.com"
        />
      </div>
      <div className="space-y-1.5 col-span-2 sm:col-span-1">
        <Label>Password {passwordRequired ? "*" : "(opsional)"}</Label>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={passwordRequired ? "Min. 6 karakter" : "Kosongkan jika tidak diubah"}
        />
      </div>
      <div className="space-y-1.5 col-span-2 sm:col-span-1">
        <Label>Role *</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih role" />
          </SelectTrigger>
          <SelectContent>
            {TEAM_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2 sm:col-span-1">
        <Label>Posisi / Jabatan</Label>
        <Input
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
          placeholder="cth. Senior Trainer"
        />
      </div>
      <div className="space-y-1.5 col-span-2 sm:col-span-1">
        <Label>Telepon</Label>
        <Input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="08xxxxxxxxxx"
        />
      </div>
      {!passwordRequired && (
        <div className="col-span-2 flex items-center justify-between rounded-md border border-slate-200 p-3">
          <div>
            <Label className="text-sm">Status Aktif</Label>
            <p className="text-xs text-slate-500">Nonaktif untuk melarang login</p>
          </div>
          <Switch
            checked={form.isActive}
            onCheckedChange={(v) => setForm({ ...form, isActive: v })}
          />
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
        <Users className="w-7 h-7 text-emerald-600" />
      </div>
      <p className="text-sm font-medium text-slate-700">
        {hasFilter ? "Tidak ada anggota yang cocok" : "Belum ada anggota tim"}
      </p>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        {hasFilter
          ? "Coba ubah kata kunci pencarian atau filter role."
          : "Tambahkan anggota tim pertama untuk mulai mengelola akun."}
      </p>
      {!hasFilter && (
        <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={onAdd}>
          <UserPlus className="w-4 h-4" /> Tambah Anggota
        </Button>
      )}
    </div>
  );
}
