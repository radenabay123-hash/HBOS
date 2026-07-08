"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, CalendarDays, ListTodo, Wallet, Clock, LogOut, Menu, Building2,
  Target, Receipt, FileText, Trophy, UserCog, FileBarChart, Settings, KanbanSquare, Layout,
  UserCircle, Sparkles, Database, CreditCard, Megaphone, MessageCircle, Bell, BellOff,
  Home, Briefcase, ClipboardList, BarChart3, MoreHorizontal, X, TrendingUp,
} from "lucide-react";
import { ROLES, ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import type { SafeUser } from "@/lib/auth";
import { logout, api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ViewKey =
  | "dashboard" | "kpi" | "crm" | "events" | "tasks" | "content" | "articles"
  | "finance" | "documents" | "scoreboard" | "team" | "reports"
  | "absensi" | "payroll" | "invoice" | "pengaturan" | "surat" | "kanban"
  | "doclayout" | "biodata" | "aimaster" | "importdata" | "subscriptions"
  | "teamstructure" | "broadcast" | "mynotifs" | "chat"
  | "kalkulator-pajak" | "laba-rugi"
  | "finance-arus-kas" | "finance-pajak" | "finance-dokumen-pajak"
  | "finance-neraca" | "finance-laporan" | "pengaturan-pajak";

interface MenuItem {
  key: ViewKey;
  label: string;
  icon: any;
  roles: string[];
  mobileTab?: boolean; // show in bottom nav on mobile
}

const ALL_ROLES = ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"];

const MENU: MenuItem[] = [
  // Mobile bottom nav items (5 max)
  { key: "dashboard", label: "Dashboard", icon: Home, roles: ALL_ROLES, mobileTab: true },
  { key: "kanban", label: "Kanban", icon: KanbanSquare, roles: ALL_ROLES, mobileTab: true },
  { key: "chat", label: "Chat", icon: MessageCircle, roles: ALL_ROLES, mobileTab: true },
  { key: "tasks", label: "Tugas", icon: ClipboardList, roles: ALL_ROLES, mobileTab: true },
  { key: "scoreboard", label: "Score", icon: Trophy, roles: ALL_ROLES, mobileTab: true },
  // Full menu items
  { key: "kpi", label: "Dashboard KPI", icon: Target, roles: ALL_ROLES },
  { key: "absensi", label: "Absensi", icon: Clock, roles: ALL_ROLES },
  { key: "biodata", label: "Biodata Karyawan", icon: UserCircle, roles: ALL_ROLES },
  { key: "mynotifs", label: "Notifikasi Saya", icon: Bell, roles: ALL_ROLES },
  { key: "teamstructure", label: "Struktur Tim", icon: Users, roles: ALL_ROLES },
  { key: "crm", label: "CRM Client", icon: Users, roles: ["OWNER", "PROJECT_MANAGER"] },
  { key: "events", label: "Event Management", icon: CalendarDays, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER"] },
  { key: "invoice", label: "Invoice", icon: Receipt, roles: ["OWNER", "PROJECT_MANAGER", "FINANCE"] },
  { key: "surat", label: "Surat Resmi", icon: FileText, roles: ["OWNER", "PROJECT_MANAGER", "FINANCE"] },
  { key: "content", label: "Tugas Konten", icon: FileText, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT"] },
  { key: "articles", label: "Data Artikel", icon: FileText, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT"] },
  { key: "finance", label: "Keuangan", icon: Wallet, roles: ["OWNER", "FINANCE"] },
  { key: "kalkulator-pajak", label: "Kalkulator Pajak", icon: Target, roles: ["OWNER", "FINANCE"] },
  { key: "laba-rugi", label: "Laba Rugi", icon: TrendingUp, roles: ["OWNER", "FINANCE"] },
  { key: "payroll", label: "Payroll & Gaji", icon: Receipt, roles: ALL_ROLES },
  { key: "documents", label: "Dokumen", icon: FileText, roles: ["OWNER", "PROJECT_MANAGER", "FINANCE"] },
  { key: "team", label: "Manajemen Tim", icon: UserCog, roles: ["OWNER"] },
  { key: "reports", label: "Laporan", icon: FileBarChart, roles: ["OWNER"] },
  { key: "pengaturan", label: "Pengaturan", icon: Settings, roles: ["OWNER"] },
  { key: "doclayout", label: "Layout Dokumen", icon: Layout, roles: ["OWNER"] },
  { key: "importdata", label: "Import Data", icon: Database, roles: ["OWNER"] },
  { key: "broadcast", label: "Broadcast & Evaluasi", icon: Megaphone, roles: ["OWNER"] },
  { key: "subscriptions", label: "Manajemen Langganan", icon: CreditCard, roles: ["OWNER"] },
  { key: "aimaster", label: "AI Master Content", icon: Sparkles, roles: ALL_ROLES },
];

function getMenuForRole(role: string) {
  return MENU.filter((m) => m.roles.includes(role));
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

interface AppShellProps {
  user: SafeUser;
  activeView: ViewKey;
  onViewChange: (v: ViewKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
  notifications: { count: number; items: any[] };
  onMarkNotificationsRead: () => void;
}

export function AppShell({ user, activeView, onViewChange, onLogout, children, notifications, onMarkNotificationsRead }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("notif-sound-enabled");
    return saved === null ? true : saved === "true";
  });
  const lastNotifCount = useRef(notifications.count);
  const menu = getMenuForRole(user.role);
  const isOwner = user.role === ROLES.OWNER;

  // Fetch app settings
  useEffect(() => {
    api<{ settings: any[] }>("/api/settings").then((d) => {
      const map: Record<string, string> = {};
      (d.settings || []).forEach((s: any) => { map[s.key] = s.value; });
      setAppSettings(map);
    }).catch(() => {});
  }, []);

  const appName = appSettings.app_name || "HBOS";
  const appFullName = appSettings.app_full_name || "Hafara Business Operating System";
  const companyName = appSettings.company_name || "PT. HAFARA AQIBA NUSANTARA";
  const appLogo = appSettings.app_logo || appSettings.company_logo || "";

  // Notification sound
  const playNotifSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 800; osc.type = "sine";
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    if (notifications.count > lastNotifCount.current) playNotifSound();
    lastNotifCount.current = notifications.count;
  }, [notifications.count, playNotifSound]);

  function toggleSound() {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem("notif-sound-enabled", String(newVal));
    toast.success(newVal ? "Suara notifikasi dinyalakan" : "Suara notifikasi dimatikan");
  }

  function handleLogout() {
    logout().then(() => onLogout()).catch(() => onLogout());
  }

  const activeMenu = menu.find((m) => m.key === activeView);
  const mobileTabs = menu.filter((m) => m.mobileTab);
  const otherMenuItems = menu.filter((m) => !m.mobileTab);

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center gap-3 px-5 py-5 border-b", isOwner ? "border-blue-100" : "border-slate-100")}>
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
          {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-white" />}
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-slate-900 leading-tight">{appName}</h1>
          <p className="text-[10px] text-slate-500 truncate">{appFullName}</p>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-slate-100">
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", isOwner ? "bg-blue-50" : "bg-slate-50")}>
          <Avatar className="w-8 h-8">
            <AvatarFallback className={cn("text-xs font-semibold", isOwner ? "bg-blue-600 text-white" : "bg-blue-700 text-white")}>
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{ROLE_LABELS[user.role] || user.role}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {/* Mobile tabs section */}
        {mobileTabs.length > 0 && (
          <>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 py-1.5">Menu Utama</p>
            {mobileTabs.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.key;
              return (
                <button key={item.key} onClick={() => { onViewChange(item.key); setMobileOpen(false); }}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
            <div className="h-px bg-slate-100 my-2" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 py-1.5">Menu Lainnya</p>
          </>
        )}
        {otherMenuItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.key;
          return (
            <button key={item.key} onClick={() => { onViewChange(item.key); setMobileOpen(false); }}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        {SidebarContent}
      </aside>

      {/* Mobile slide-out sidebar (for "More" menu) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top bar — desktop only */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200 h-14 items-center justify-between px-6">
          <h2 className="font-semibold text-slate-900 text-base">{activeMenu?.label}</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleSound}>
              {soundEnabled ? <Bell className="w-4 h-4 text-blue-600" /> : <BellOff className="w-4 h-4 text-slate-400" />}
            </Button>
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative h-9 w-9"
                onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) onMarkNotificationsRead(); }}>
                <Bell className="w-4 h-4" />
                {notifications.count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {notifications.count > 9 ? "9+" : notifications.count}
                  </span>
                )}
              </Button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border z-20 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
                      <p className="font-semibold text-sm">Notifikasi</p>
                      <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    {notifications.items.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">Tidak ada notifikasi</p>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.items.map((n: any) => (
                          <div key={n.id} className={cn("px-4 py-3", !n.read && "bg-blue-50/50")}>
                            <p className="text-sm font-medium text-slate-900">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className={cn("text-xs font-semibold", isOwner ? "bg-blue-600 text-white" : "bg-blue-700 text-white")}>
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Mobile top bar — compact, elegant */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-white" />}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 leading-tight">{appName}</p>
                <p className="text-[9px] text-slate-500 leading-tight truncate max-w-[120px]">{activeMenu?.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleSound}>
                {soundEnabled ? <Bell className="w-4 h-4 text-blue-600" /> : <BellOff className="w-4 h-4 text-slate-400" />}
              </Button>
              <div className="relative">
                <Button variant="ghost" size="icon" className="relative h-9 w-9"
                  onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) onMarkNotificationsRead(); }}>
                  <Bell className="w-4 h-4" />
                  {notifications.count > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                      {notifications.count > 9 ? "9+" : notifications.count}
                    </span>
                  )}
                </Button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border z-20 max-h-80 overflow-y-auto">
                      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
                        <p className="font-semibold text-sm">Notifikasi</p>
                        <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                      </div>
                      {notifications.items.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">Tidak ada notifikasi</p>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {notifications.items.slice(0, 10).map((n: any) => (
                            <div key={n.id} className={cn("px-4 py-2.5", !n.read && "bg-blue-50/50")}>
                              <p className="text-xs font-medium text-slate-900">{n.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <Avatar className="w-8 h-8" onClick={() => setMobileOpen(true)}>
                <AvatarFallback className={cn("text-[10px] font-semibold cursor-pointer", isOwner ? "bg-blue-600 text-white" : "bg-blue-700 text-white")}>
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page content — padding bottom for mobile bottom nav */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>

        {/* Footer — desktop only */}
        <footer className="hidden lg:block mt-auto border-t border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>© {new Date().getFullYear()} {companyName}</p>
            <p>Sistem Operasi Bisnis Terpadu</p>
          </div>
        </footer>
      </div>

      {/* ===== Mobile Bottom Navigation Bar ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          {/* Bottom nav tabs (max 5) */}
          {mobileTabs.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = activeView === item.key;
            return (
              <button key={item.key} onClick={() => onViewChange(item.key)}
                className={cn("flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  active ? "text-blue-600" : "text-slate-400 hover:text-slate-600")}>
                <div className={cn("p-1 rounded-lg transition-colors", active && "bg-blue-50")}>
                  <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                </div>
                <span className={cn("text-[9px] font-medium", active && "font-semibold")}>{item.label}</span>
              </button>
            );
          })}

          {/* More button — opens slide-out sidebar */}
          <button onClick={() => setMobileOpen(true)}
            className={cn("flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              !mobileTabs.some(t => t.key === activeView) && activeView !== "dashboard" ? "text-blue-600" : "text-slate-400 hover:text-slate-600")}>
            <div className={cn("p-1 rounded-lg transition-colors", !mobileTabs.some(t => t.key === activeView) && activeView !== "dashboard" && "bg-blue-50")}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className={cn("text-[9px] font-medium", !mobileTabs.some(t => t.key === activeView) && activeView !== "dashboard" && "font-semibold")}>Lainnya</span>
          </button>
        </div>
        {/* Safe area padding for iPhone */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
