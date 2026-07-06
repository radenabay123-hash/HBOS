"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Megaphone, Send, RefreshCw, AlertTriangle, Zap, Bell, MessageSquare,
  CheckCircle2, Clock,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, formatDateTime } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NOTIF_TYPES = [
  { value: "EVALUATION", label: "Evaluasi", icon: MessageSquare, color: "bg-blue-50 text-blue-600 border-blue-200", priority: "normal" },
  { value: "URGENT_TASK", label: "Tugas Dadakan", icon: Zap, color: "bg-rose-50 text-rose-600 border-rose-200", priority: "urgent" },
  { value: "ANNOUNCEMENT", label: "Pengumuman", icon: Megaphone, color: "bg-amber-50 text-amber-600 border-amber-200", priority: "normal" },
  { value: "WARNING", label: "Peringatan", icon: AlertTriangle, color: "bg-orange-50 text-orange-600 border-orange-200", priority: "high" },
];

const TARGET_OPTIONS = [
  { value: "ALL", label: "Semua Tim" },
  { value: ROLES.PROJECT_MANAGER, label: ROLE_LABELS[ROLES.PROJECT_MANAGER] },
  { value: ROLES.ASSISTANT_TRAINER, label: ROLE_LABELS[ROLES.ASSISTANT_TRAINER] },
  { value: ROLES.CONTENT_CREATIVE, label: ROLE_LABELS[ROLES.CONTENT_CREATIVE] },
  { value: ROLES.DIGITAL_MARKETING_IT, label: ROLE_LABELS[ROLES.DIGITAL_MARKETING_IT] },
  { value: ROLES.FINANCE, label: ROLE_LABELS[ROLES.FINANCE] },
];

export function BroadcastModule() {
  const [form, setForm] = useState({
    title: "", message: "", type: "EVALUATION", targetRole: "ALL", actionUrl: "",
  });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ notifications: any[] }>("/api/notifications?all=true");
      // Filter only broadcast notifications (have senderId)
      const broadcastNotifs = (d.notifications || []).filter((n: any) => n.senderId);
      setHistory(broadcastNotifs.slice(0, 20));
      const usersRes = await api<{ users: any[] }>("/api/users");
      setTeamMembers((usersRes.users || []).filter((u: any) => u.role !== ROLES.OWNER));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSend() {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Judul dan pesan wajib diisi");
      return;
    }
    const notifType = NOTIF_TYPES.find(t => t.value === form.type);
    setSending(true);
    try {
      const body: any = {
        title: form.title,
        message: form.message,
        type: form.type,
        priority: notifType?.priority || "normal",
        actionUrl: form.actionUrl || null,
      };
      if (targetUserId) body.targetUserId = targetUserId;
      else body.targetRole = form.targetRole;

      const d = await api<{ sent: number }>("/api/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success(`Notifikasi terkirim ke ${d.sent} orang! 🔔`);
      setForm({ title: "", message: "", type: "EVALUATION", targetRole: "ALL", actionUrl: "" });
      setTargetUserId("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  }

  const selectedType = NOTIF_TYPES.find(t => t.value === form.type);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-blue-600" /> Broadcast & Evaluasi
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Kirim evaluasi, tugas dadakan, atau pengumuman ke tim. Notifikasi muncul dengan suara di HP/browser tim.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Compose */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Send className="w-4 h-4 text-blue-600" /> Kirim Notifikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Tipe Notifikasi</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {NOTIF_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm({ ...form, type: t.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs",
                      form.type === t.value ? cn(t.color, "border-current font-semibold") : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    )}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Kirim Ke</Label>
              <div className="flex gap-2">
                <Select value={form.targetRole} onValueChange={(v) => { setForm({ ...form, targetRole: v }); setTargetUserId(""); }}>
                  <SelectTrigger className="bg-white h-9 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Or select specific person */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 whitespace-nowrap">atau orang spesifik:</span>
                <select
                  value={targetUserId}
                  onChange={(e) => { setTargetUserId(e.target.value); }}
                  className="flex-1 h-8 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="">— Pilih orang —</option>
                  {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name} ({ROLE_LABELS[m.role]})</option>)}
                </select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Judul *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Evaluasi Konten Minggu Ini" className="bg-white h-9 text-sm" />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Pesan *</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Tulis evaluasi, tugas dadakan, atau pengumuman..." className="bg-white text-sm resize-none" />
            </div>

            {/* Action URL (optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Link Tindakan (opsional)</Label>
              <Input value={form.actionUrl} onChange={(e) => setForm({ ...form, actionUrl: e.target.value })} placeholder="e.g. /kanban atau /tasks" className="bg-white h-9 text-sm" />
              <p className="text-[10px] text-slate-400">Tim akan diarahkan ke halaman ini saat klik notifikasi</p>
            </div>

            {/* Preview */}
            {form.title && (
              <div className={cn("p-3 rounded-lg border-2", selectedType?.color)}>
                <div className="flex items-center gap-2 mb-1">
                  {selectedType && <selectedType.icon className="w-3.5 h-3.5" />}
                  <p className="text-xs font-bold">{form.title}</p>
                  {selectedType?.priority === "urgent" && <Badge variant="outline" className="text-[9px] bg-rose-100 text-rose-700 border-rose-300">URGENT</Badge>}
                </div>
                <p className="text-xs text-slate-600">{form.message}</p>
              </div>
            )}

            {/* Send button */}
            <Button onClick={handleSend} disabled={sending} className="w-full bg-blue-600 hover:bg-blue-700 h-10">
              {sending ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Mengirim...</> : <><Send className="w-4 h-4 mr-1" /> Kirim Notifikasi 🔔</>}
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT: History */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /> Riwayat Broadcast ({history.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-blue-600" /></div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Belum ada broadcast terkirim</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50">
                {history.map((n) => {
                  const typeInfo = NOTIF_TYPES.find(t => t.value === n.type) || NOTIF_TYPES[0];
                  const Icon = typeInfo.icon;
                  // Count how many people received this (same title+message+createdAt)
                  const recipientCount = history.filter(h => h.title === n.title && h.message === n.message && h.createdAt === n.createdAt).length;
                  return (
                    <div key={n.id} className="p-3 hover:bg-slate-50/50">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", typeInfo.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                            {n.priority === "urgent" && <Badge variant="outline" className="text-[8px] bg-rose-100 text-rose-700 border-rose-300 shrink-0">URGENT</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <span>{typeInfo.label}</span>
                            <span>·</span>
                            <span>{formatDateTime(n.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
