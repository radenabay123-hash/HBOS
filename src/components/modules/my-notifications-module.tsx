"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell, BellOff, RefreshCw, CheckCircle2, AlertTriangle, Zap, Megaphone, MessageSquare,
  Volume2, VolumeX, Trash2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

export function MyNotificationsModule({ user }: { user: SafeUser }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterType, setFilterType] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ notifications: any[] }>("/api/notifications");
      setNotifications(d.notifications || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const saved = localStorage.getItem("notif-sound-enabled");
    if (saved !== null) setSoundEnabled(saved === "true");
  }, [load]);

  function toggleSound() {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem("notif-sound-enabled", String(newVal));
    toast.success(newVal ? "Suara notifikasi diaktifkan" : "Suara notifikasi dimatikan");
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSound}
            className="bg-white text-xs"
          >
            {soundEnabled ? <><Volume2 className="w-3.5 h-3.5 mr-1 text-blue-600" /> Sound On</> : <><VolumeX className="w-3.5 h-3.5 mr-1 text-slate-400" /> Muted</>}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="bg-white text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Tandai Semua Dibaca
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
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

      {/* Notification list */}
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
                    {/* Icon */}
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border", config.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {/* Content */}
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
