"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard, Plus, Check, X, Edit3, Trash2, RefreshCw, AlertCircle,
  CheckCircle2, Clock, Wallet,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const CATEGORY_COLORS: Record<string, string> = {
  "Pribadi": "border-blue-200 bg-blue-50/50",
  "Team Kerja": "border-purple-200 bg-purple-50/50",
  "Operasional": "border-amber-200 bg-amber-50/50",
  "Lainnya": "border-slate-200 bg-slate-50/50",
};

export function SubscriptionManagerModule() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [dialog, setDialog] = useState<{ open: boolean; sub: any }>({ open: false, sub: null });
  const [form, setForm] = useState({ name: "", category: "Pribadi", amount: "", dueDay: "1", description: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/api/subscriptions?year=${year}&month=${month}`);
      setData(d);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  async function togglePayment(subId: string) {
    try {
      await api("/api/subscriptions", { method: "PUT", body: JSON.stringify({ action: "toggle-payment", id: subId, year, month }) });
      toast.success("Status pembayaran diperbarui");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleSave() {
    if (!form.name || !form.amount) { toast.error("Nama dan nominal wajib diisi"); return; }
    setSaving(true);
    try {
      if (dialog.sub) {
        await api("/api/subscriptions", { method: "PUT", body: JSON.stringify({ id: dialog.sub.id, name: form.name, category: form.category, amount: Number(form.amount), dueDay: Number(form.dueDay), description: form.description }) });
        toast.success("Langganan diperbarui");
      } else {
        await api("/api/subscriptions", { method: "POST", body: JSON.stringify({ name: form.name, category: form.category, amount: Number(form.amount), dueDay: Number(form.dueDay), description: form.description }) });
        toast.success("Langganan ditambahkan");
      }
      setDialog({ open: false, sub: null });
      setForm({ name: "", category: "Pribadi", amount: "", dueDay: "1", description: "" });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus langganan ini?")) return;
    try { await api(`/api/subscriptions?id=${id}`, { method: "DELETE" }); toast.success("Dihapus"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  function openCreate() {
    setForm({ name: "", category: "Pribadi", amount: "", dueDay: "1", description: "" });
    setDialog({ open: true, sub: null });
  }

  function openEdit(sub: any) {
    setForm({ name: sub.name, category: sub.category, amount: String(sub.amount), dueDay: String(sub.dueDay), description: sub.description || "" });
    setDialog({ open: true, sub });
  }

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>;

  const categories = Object.keys(data?.grouped || {});
  const progressPct = data?.totalAmount > 0 ? Math.round((data.totalPaid / data.totalAmount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" /> Manajemen Langganan
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pantau pembayaran langganan bulanan Anda</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah Langganan
        </Button>
      </div>

      {/* Month/Year selector */}
      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {monthNames.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
            <select value={String(year)} onChange={(e) => setYear(Number(e.target.value))} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[2026, 2025, 2024, 2023, 2022].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <div className="flex-1" />
            <span className="text-xs text-slate-400">Periode: {monthNames[month - 1]} {year}</span>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-slate-400" /><p className="text-xs text-slate-500">Total Bulan Ini</p></div>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(data?.totalAmount || 0)}</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-green-600" /><p className="text-xs text-slate-500">Sudah Dibayar</p></div>
          <p className="text-xl font-bold text-green-700">{formatCurrency(data?.totalPaid || 0)}</p>
        </div>
        <div className="bg-white rounded-lg border border-rose-200 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4 text-rose-600" /><p className="text-xs text-slate-500">Belum Dibayar</p></div>
          <p className="text-xl font-bold text-rose-700">{formatCurrency(data?.totalUnpaid || 0)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Progress Pembayaran {monthNames[month - 1]} {year}</p>
            <span className="text-sm font-bold text-blue-600">{progressPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2">{data?.totalPaid ? Math.round((data.totalAmount - data.totalPaid) / (data.totalAmount || 1) * 100) : 100}% tersisa · {data?.totalAmount ? Math.round(progressPct) : 0}% selesai</p>
        </CardContent>
      </Card>

      {/* Subscription list by category */}
      {categories.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Belum ada langganan</p>
            <p className="text-sm text-slate-500 mt-1">Klik "Tambah Langganan" untuk menambah data</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const subs = data.grouped[cat];
            const catTotal = subs.reduce((s: number, sub: any) => s + sub.amount, 0);
            const catPaid = subs.filter((s: any) => s.isPaid).reduce((s: number, sub: any) => s + sub.amount, 0);
            return (
              <Card key={cat} className={cn("border-2", CATEGORY_COLORS[cat] || CATEGORY_COLORS.Lainnya)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">{cat}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-white">{subs.filter((s: any) => s.isPaid).length}/{subs.length} lunas</Badge>
                      <span className="text-xs font-semibold text-slate-600">{formatCurrency(catPaid)} / {formatCurrency(catTotal)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2">
                    {subs.map((sub: any) => (
                      <div key={sub.id} className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        sub.isPaid ? "border-green-200 bg-green-50/30" : "border-slate-200 bg-white hover:border-blue-300"
                      )}>
                        {/* Checkbox / status */}
                        <button
                          onClick={() => togglePayment(sub.id)}
                          className={cn(
                            "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                            sub.isPaid ? "bg-green-500 text-white hover:bg-green-600" : "bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600"
                          )}
                          title={sub.isPaid ? "Tandai belum bayar" : "Tandai sudah bayar"}
                        >
                          {sub.isPaid ? <Check className="w-5 h-5" /> : <Clock className="w-4 h-4" />}
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm font-medium truncate", sub.isPaid ? "text-slate-500 line-through" : "text-slate-900")}>{sub.name}</p>
                            {sub.isPaid && <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200 shrink-0">LUNAS</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
                            <span>Tgl {sub.dueDay}</span>
                            {sub.paidAt && <span className="text-green-600">Dibayar: {new Date(sub.paidAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>}
                            {sub.description && <span className="truncate max-w-[200px]">{sub.description}</span>}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="shrink-0 text-right">
                          <p className={cn("text-sm font-bold", sub.isPaid ? "text-green-700" : "text-slate-900")}>{formatCurrency(sub.amount)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(sub)} title="Edit"><Edit3 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(sub.id)} title="Hapus"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, sub: dialog.sub })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.sub ? "Edit Langganan" : "Tambah Langganan Baru"}</DialogTitle>
            <DialogDescription>Catat langganan bulanan yang perlu dibayar</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Langganan *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="BPJS, Listrik, Wifi, dll" className="bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Kategori</Label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm">
                  <option value="Pribadi">Pribadi</option>
                  <option value="Team Kerja">Team Kerja</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nominal (Rp) *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="600000" className="bg-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tanggal Jatuh Tempo (1-31)</Label>
              <Input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan (opsional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Catatan tambahan" className="bg-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, sub: null })}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              {dialog.sub ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
