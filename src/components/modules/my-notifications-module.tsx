"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Bell, BellOff, RefreshCw, CheckCircle2, AlertTriangle, Zap, Megaphone, MessageSquare,
  Volume2, VolumeX, Smartphone, Laptop, BellRing, Send, Info, ShieldCheck, Wifi,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import type { SafeUser } from "@/lib/auth";

const NOTIF_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  EVALUATION: { icon: MessageSquare, color: "bg-blue-50 text-blue-600 border-blue-200", label: "Evaluasi" },
  URGENT_TASK: { icon: Zap, color: "bg-rose-50 text-rose-600 border-rose-200", label: "Tugas Dadakan" },
  ANNOUNCEMENT: { icon: Megaphone, color: "bg-amber-50 text-amber-600 border-amber-200", label: "Pengumuman" },
  WARNING: { icon: AlertTriangle, color: "bg-orange-50 text-orange-600 border-orange-200", label: "Peringatan" },
  INFO: { icon: Bell, color: "bg-slate-50 text-slate-600 border-slate-200", label: "Info" },
  ACC: { icon: CheckCircle2, color: "bg-green-50 text-green-600 border-green-200", label: "ACC" },
  REVISI: { icon: AlertTriangle, color: "bg-amber-50 text-amber-600 border-amber-200", label: "Revisi" },
  TASK: { icon: CheckCircle2, color: "bg-blue-50 text-blue-600 border-blue-200", label: "Tugas" },
  REMINDER: { icon: Bell, color: "bg-violet-50 text-violet-600 border-violet-200", label: "Pengingat" },
};

function detectDeviceType(ua?: string | null): { icon: any; label: string } {
  if (!ua) return { icon: Laptop, label: "Perangkat" };
  const lower = ua.toLowerCase();
  if (lower.includes("android") || lower.includes("iphone") || lower.includes("ipad") || lower.includes("mobile")) {
    return { icon: Smartphone, label: "HP / Mobile" };
  }
  return { icon: Laptop, label: "Laptop / Desktop" };
}

export function MyNotificationsModule({ user }: { user: SafeUser }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const push = usePushNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, subsRes] = await Promise.all([
        api<{ notifications: any[] }>("/api/notifications"),
        api<{ subscriptions: any[] }>("/api/push/subscribe").catch(() => ({ subscriptions: [] })),
      ]);
      setNotifications(d.notifications || []);
      setSubscriptions(subsRes.subscriptions || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const saved = localStorage.getItem("notif-sound-enabled");
    if (saved !== null) setSoundEnabled(saved === "true");
  }, [load]);

  // Auto-sync soundEnabled with push.muted (local UI consistency)
  useEffect(() => {
    // Sound switch and push mute share the same intent
    setSoundEnabled(!push.muted);
  }, [push.muted]);

  function toggleSound() {
    const newMuted = soundEnabled; // toggle inverse
    push.setMuted(newMuted);
    localStorage.setItem("notif-sound-enabled", String(!newMuted));
    toast.success(newMuted ? "Notifikasi dimute (silent)" : "Notifikasi + suara diaktifkan");
  }

  async function handleEnablePush() {
    const ok = await push.enable();
    if (ok) {
      toast.success("Notifikasi background diaktifkan! Anda akan tetap menerima notif walau aplikasi tertutup.");
      load();
    } else if (push.error) {
      toast.error(push.error);
    }
  }

  async function handleDisablePush() {
    const ok = await push.disable();
    if (ok) {
      toast.success("Notifikasi background dimatikan");
      load();
    }
  }

  async function handleSendTest() {
    const r = await push.sendTest();
    if (r.ok) {
      toast.success(r.message || `Test terkirim ke ${r.sent} perangkat`);
    } else {
      toast.error(r.message || "Gagal kirim test");
    }
  }

  async function markAllRead() {
    try {
      await api("/api/notifications", { method: "PUT" });
      toast.success("Semua notifikasi ditandai dibaca");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  const filtered = filterType === "all" ? notifications : notifications.filter(n => n.type === filterType);
  const unreadCount = notifications.filter(n => !n.read).length;
  const broadcastNotifs = notifications.filter(n => n.senderId);
  const broadcastCount = broadcastNotifs.length;

  // Status badge for push
  const pushStatus = !push.supported
    ? { label: "Tidak Didukung", color: "bg-slate-100 text-slate-500 border-slate-200", icon: BellOff }
    : push.permission === "denied"
    ? { label: "Izin Ditolak", color: "bg-rose-100 text-rose-700 border-rose-300", icon: AlertTriangle }
    : push.subscribed
    ? { label: "Aktif", color: "bg-green-100 text-green-700 border-green-300", icon: ShieldCheck }
    : push.permission === "granted"
    ? { label: "Izin Diberikan", color: "bg-amber-100 text-amber-700 border-amber-300", icon: BellRing }
    : { label: "Belum Diaktifkan", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Bell };

  const PushStatusIcon = pushStatus.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" /> Notifikasi Saya
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Semua notifikasi sudah dibaca"}
            {broadcastCount > 0 && ` · ${broadcastCount} dari Owner`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSound}
            disabled={!push.supported}
            className="bg-white text-xs"
          >
            {soundEnabled ? <><Volume2 className="w-3.5 h-3.5 mr-1 text-blue-600" /> Sound On</> : <><VolumeX className="w-3.5 h-3.5 mr-1 text-slate-400" /> Muted</>}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="bg-white text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Tandai Dibaca
            </Button>
          )}
        </div>
      </div>

      {/* ===================== PUSH NOTIFICATION PANEL ===================== */}
      <Card className={cn(
        "border-2 shadow-sm overflow-hidden",
        push.subscribed ? "border-green-200" : "border-blue-200"
      )}>
        <CardHeader className="pb-3 bg-gradient-to-br from-blue-50/60 to-white">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2", pushStatus.color)}>
                <PushStatusIcon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Notifikasi Background (Push)
                  <Badge variant="outline" className={cn("text-[10px]", pushStatus.color)}>
                    {pushStatus.label}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Aktifkan agar notifikasi dari Owner tetap muncul di HP/laptop Anda <strong>walau aplikasi HBOS tidak sedang dibuka</strong>. Notifikasi akan muncul di system tray / lock screen dengan suara & vibrasi.
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Browser unsupported */}
          {!push.supported && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Browser ini tidak mendukung Web Push Notification. Gunakan Chrome, Edge, Firefox, atau Safari terbaru (HP maupun laptop). Pastikan juga tidak dalam mode incognito.
              </div>
            </div>
          )}

          {/* Permission denied hint */}
          {push.supported && push.permission === "denied" && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Izin notifikasi ditolak.</strong> Buka pengaturan browser → Site settings → Notifications → izinkan untuk situs ini, lalu refresh halaman.
              </div>
            </div>
          )}

          {/* Action row */}
          {push.supported && (
            <div className="flex items-center gap-2 flex-wrap">
              {!push.subscribed ? (
                <Button
                  onClick={handleEnablePush}
                  disabled={push.enabling}
                  className="bg-blue-600 hover:bg-blue-700 h-10"
                >
                  {push.enabling
                    ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> Mengaktifkan...</>
                    : <><BellRing className="w-4 h-4 mr-1.5" /> Aktifkan Notifikasi Background</>}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSendTest}
                    variant="outline"
                    className="bg-white h-10 border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Send className="w-4 h-4 mr-1.5" /> Kirim Test Notifikasi
                  </Button>
                  <Button
                    onClick={handleDisablePush}
                    variant="outline"
                    className="bg-white h-10 text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <BellOff className="w-4 h-4 mr-1.5" /> Matikan
                  </Button>
                </>
              )}

              {/* Mute toggle (only when subscribed) */}
              {push.subscribed && (
                <div className="flex items-center gap-2 ml-auto px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
                  {soundEnabled
                    ? <Volume2 className="w-4 h-4 text-blue-600" />
                    : <VolumeX className="w-4 h-4 text-slate-400" />}
                  <span className="text-xs font-medium text-slate-700">
                    {soundEnabled ? "Bersuara" : "Mute"}
                  </span>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={(v) => push.setMuted(!v)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Info row when active */}
          {push.subscribed && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200">
                <Wifi className="w-4 h-4 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Berjalan di Background</p>
                  <p className="text-green-600 text-[10px]">Walau aplikasi tertutup</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800">{subscriptions.length} Perangkat Aktif</p>
                  <p className="text-blue-600 text-[10px]">HP & laptop terdaftar</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-50 border border-violet-200">
                <Volume2 className="w-4 h-4 text-violet-600 shrink-0" />
                <div>
                  <p className="font-semibold text-violet-800">{soundEnabled ? "Suara + Vibrasi" : "Silent"}</p>
                  <p className="text-violet-600 text-[10px]">{soundEnabled ? "Berdering saat push" : "Hanya visual"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Devices list */}
          {subscriptions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> Perangkat Terdaftar
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {subscriptions.map((s) => {
                  const dev = detectDeviceType(s.userAgent);
                  const DevIcon = dev.icon;
                  return (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-100 text-xs">
                      <DevIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium text-slate-700">{dev.label}</span>
                      <span className="text-slate-400 truncate flex-1">
                        {s.userAgent ? s.userAgent.slice(0, 60) : "Browser"}
                      </span>
                      {s.muted && <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-500 border-slate-200">Muted</Badge>}
                      <Badge variant="outline" className="text-[9px] bg-green-50 text-green-600 border-green-200">
                        {formatDateTime(s.updatedAt)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* How it works */}
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer flex items-center gap-1 font-medium text-slate-600 hover:text-slate-800">
              <Info className="w-3.5 h-3.5" /> Cara kerja notifikasi background
            </summary>
            <div className="mt-2 space-y-1.5 pl-5">
              <p>1. Klik "Aktifkan Notifikasi Background" — browser akan meminta izin.</p>
              <p>2. Klik "Allow / Izinkan" pada dialog browser.</p>
              <p>3. Setelah aktif, semua broadcast dari Owner (evaluasi, tugas dadakan, pengumuman, peringatan) akan otomatis muncul di HP/laptop Anda walau Anda tidak sedang membuka aplikasi HBOS.</p>
              <p>4. Klik "Kirim Test Notifikasi" untuk memverifikasi notifikasi muncul di latar belakang.</p>
              <p>5. Anda bisa mute/unmute kapan saja. Status mute tersinkron di semua perangkat.</p>
              <p className="text-slate-400 italic">Tip: Untuk hasil terbaik di HP, install aplikasi HBOS ke home screen (Add to Home Screen) agar push bekerja optimal seperti aplikasi native.</p>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* ===================== NOTIFICATION LIST ===================== */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterType("all")}
          className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            filterType === "all" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}
        >
          Semua ({notifications.length})
        </button>
        {Object.entries(NOTIF_TYPE_CONFIG).map(([type, config]) => {
          const count = notifications.filter(n => n.type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                filterType === type ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}
            >
              <config.icon className="w-3 h-3" /> {config.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Tidak ada notifikasi</p>
            <p className="text-sm text-slate-500 mt-1">Notifikasi dari Owner akan muncul di sini</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const config = NOTIF_TYPE_CONFIG[n.type] || NOTIF_TYPE_CONFIG.INFO;
            const Icon = config.icon;
            const isBroadcast = !!n.senderId;
            return (
              <Card key={n.id} className={cn(
                "border transition-all hover:shadow-sm",
                n.read ? "border-slate-100 bg-white" : "border-blue-200 bg-blue-50/30",
                n.priority === "urgent" && "border-rose-200 bg-rose-50/30"
              )}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border", config.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn("text-sm font-medium", n.read ? "text-slate-600" : "text-slate-900")}>{n.title}</p>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                            {n.priority === "urgent" && <Badge variant="outline" className="text-[9px] bg-rose-100 text-rose-700 border-rose-300 shrink-0">URGENT</Badge>}
                            {isBroadcast && <Badge variant="outline" className="text-[9px] bg-violet-50 text-violet-700 border-violet-200 shrink-0">Dari Owner</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                            <Badge variant="outline" className={cn("text-[9px]", config.color)}>{config.label}</Badge>
                            <span>·</span>
                            <span>{formatDateTime(n.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
