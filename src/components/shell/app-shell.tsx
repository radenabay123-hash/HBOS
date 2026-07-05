"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, CalendarDays, ListTodo, FileText, Film, Wallet,
  FileStack, Trophy, UserCog, FileBarChart, Bell, LogOut, Menu, Building2,
  ChevronDown, X, Target, Clock, Receipt,
} from "lucide-react";
import { ROLES, ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import type { SafeUser } from "@/lib/auth";
import { logout } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ViewKey =
  | "dashboard" | "crm" | "events" | "tasks" | "kpi" | "content" | "articles"
  | "finance" | "documents" | "scoreboard" | "team" | "reports"
  | "absensi" | "payroll";

interface MenuItem {
  key: ViewKey;
  label: string;
  icon: any;
  roles: string[];
}

const MENU: MenuItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"] },
  { key: "kpi", label: "Dashboard KPI", icon: Target, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"] },
  { key: "absensi", label: "Absensi", icon: Clock, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"] },
  { key: "crm", label: "CRM Client", icon: Users, roles: ["OWNER", "PROJECT_MANAGER"] },
  { key: "events", label: "Event Management", icon: CalendarDays, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER"] },
  { key: "tasks", label: "Tugas Harian", icon: ListTodo, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"] },
  { key: "content", label: "Tugas Konten", icon: Film, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT"] },
  { key: "articles", label: "Data Artikel", icon: FileText, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT"] },
  { key: "finance", label: "Keuangan", icon: Wallet, roles: ["OWNER", "FINANCE"] },
  { key: "payroll", label: "Payroll & Gaji", icon: Receipt, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"] },
  { key: "documents", label: "Dokumen", icon: FileStack, roles: ["OWNER", "PROJECT_MANAGER", "FINANCE"] },
  { key: "scoreboard", label: "Scoreboard", icon: Trophy, roles: ["OWNER", "PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"] },
  { key: "team", label: "Manajemen Tim", icon: UserCog, roles: ["OWNER"] },
  { key: "reports", label: "Laporan", icon: FileBarChart, roles: ["OWNER"] },
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
  const menu = getMenuForRole(user.role);
  const isOwner = user.role === ROLES.OWNER;

  async function handleLogout() {
    try {
      await logout();
    } catch {}
    onLogout();
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-5 py-5 border-b", isOwner ? "border-blue-100" : "border-slate-100")}>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isOwner ? "bg-blue-600 text-white" : "bg-slate-900 text-white")}>
          <Building2 className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-slate-900 leading-tight">HBOS</h1>
          <p className="text-[10px] text-slate-500 truncate">Hafara Business OS</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-3 py-3 border-b border-slate-100">
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", isOwner ? "bg-blue-50" : "bg-slate-50")}>
          <Avatar className="w-8 h-8">
            <AvatarFallback className={cn("text-xs font-semibold", isOwner ? "bg-blue-600 text-white" : "bg-slate-700 text-white")}>
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", ROLE_COLORS[user.role])}>
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {menu.map((item) => {
          const active = activeView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { onViewChange(item.key); setMobileOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? (isOwner ? "bg-blue-600 text-white shadow-sm" : "bg-slate-900 text-white shadow-sm")
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-slate-100">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="w-4 h-4 mr-2" /> Keluar
        </Button>
      </div>
    </div>
  );

  const activeMenu = menu.find((m) => m.key === activeView);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200 h-14 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-slate-900 text-sm lg:text-base">{activeMenu?.label}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) onMarkNotificationsRead(); }}
              >
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
                  <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-slate-200 z-20 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
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
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString("id-ID")}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className={cn("text-xs font-semibold", isOwner ? "bg-blue-600 text-white" : "bg-slate-700 text-white")}>
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white px-4 lg:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Hafara Business Operating System (HBOS)</p>
            <p className="hidden sm:block">Sistem Operasi Bisnis Terpadu</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
