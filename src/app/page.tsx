"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { LoginScreen } from "@/components/auth/login-screen";
import { AppShell, type ViewKey } from "@/components/shell/app-shell";
import { OwnerDashboard } from "@/components/owner/owner-dashboard";
import { OwnerKpiDashboard } from "@/components/owner/owner-kpi-dashboard";
import { TeamDashboard } from "@/components/team/team-dashboard";
import { CrmModule } from "@/components/modules/crm-module";
import { EventsModule } from "@/components/modules/events-module";
import { KpiModule } from "@/components/modules/kpi-module";
import { AbsensiModule } from "@/components/modules/absensi-module";
import { PayrollModule } from "@/components/modules/payroll-module";
import { InvoiceModule } from "@/components/modules/invoice-module";
import { ContentModule } from "@/components/modules/content-module";
import { ArticlesModule } from "@/components/modules/articles-module";
import { FinanceModule } from "@/components/modules/finance-module";
import { DocumentsModule } from "@/components/modules/documents-module";
import { ScoreboardModule } from "@/components/modules/scoreboard-module";
import { AssessmentModule } from "@/components/modules/assessment-module";
import { TeamManagementModule } from "@/components/modules/team-management-module";
import { ReportsModule } from "@/components/modules/reports-module";
import { PengaturanModule } from "@/components/modules/pengaturan-module";
import { DocumentLayoutModule } from "@/components/modules/document-layout-module";
import { SuratModule } from "@/components/modules/surat-module";
import { KanbanModule } from "@/components/modules/kanban-module";
import { BiodataModule } from "@/components/modules/biodata-module";
import { AiMasterContentModule } from "@/components/modules/ai-master-content-module";
import { ImportDataModule } from "@/components/modules/import-data-module";
import { SubscriptionManagerModule } from "@/components/modules/subscription-manager-module";
import { TeamStructureModule } from "@/components/modules/team-structure-module";
import { BroadcastModule } from "@/components/modules/broadcast-module";
import { MyNotificationsModule } from "@/components/modules/my-notifications-module";
import { ChatModule } from "@/components/modules/chat-module";
import { AgendaModule } from "@/components/modules/agenda-module";
import { ROLES } from "@/lib/constants";
import type { SafeUser } from "@/lib/auth";
import { getMe, api } from "@/lib/api-client";

export default function Home() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [navCount, setNavCount] = useState(0); // increments on every sidebar click to force remount
  const [notifications, setNotifications] = useState<{ count: number; items: any[] }>({ count: 0, items: [] });

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api<{ notifications: any[]; unread: number }>("/api/notifications");
      setNotifications({ count: data.unread, items: data.notifications });
    } catch {}
  }, []);

  useEffect(() => {
    getMe()
      .then((d) => {
        setUser(d.user);
        if (d.user) {
          setView("dashboard");
          loadNotifications();
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [loadNotifications]);

  // Periodically refresh notifications
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  function handleLogin() {
    getMe().then((d) => {
      setUser(d.user);
      setView("dashboard");
      loadNotifications();
    });
  }

  function handleLogout() {
    setUser(null);
    setView("dashboard");
  }

  function handleViewChange(v: ViewKey) {
    setView(v);
    setNavCount((c) => c + 1); // force remount of finance sub-modules so initialView is re-applied
    loadNotifications();
  }

  function markNotificationsRead() {
    api("/api/notifications", { method: "PUT" }).then(() => {
      setNotifications((prev) => ({ count: 0, items: prev.items.map((n) => ({ ...n, read: true })) }));
    }).catch(() => {});
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isOwner = user.role === ROLES.OWNER;

  function renderView() {
    switch (view) {
      case "dashboard":
        return isOwner ? <OwnerDashboard /> : <TeamDashboard />;
      case "kpi":
        return isOwner ? <OwnerKpiDashboard /> : <KpiModule user={user} />;
      case "absensi":
        return <AbsensiModule user={user} />;
      case "payroll":
        return <PayrollModule user={user} />;
      case "invoice":
        return <InvoiceModule user={user} />;
      case "crm":
        return <CrmModule user={user} />;
      case "events":
        return <EventsModule user={user} />;
      case "content":
        return <ContentModule user={user} />;
      case "articles":
        return <ArticlesModule user={user} />;
      case "finance":
        return <FinanceModule key={`finance-${navCount}`} user={user} />;
      case "laba-rugi":
        return <FinanceModule key={`laba-rugi-${navCount}`} user={user} initialView="laporan" />;
      case "kalkulator-pajak":
        return <FinanceModule key={`kalkulator-pajak-${navCount}`} user={user} initialView="kalkulator" />;
      case "finance-arus-kas":
        return <FinanceModule key={`aruskas-${navCount}`} user={user} initialView="aruskas" />;
      case "finance-pajak":
        return <FinanceModule key={`pajak-${navCount}`} user={user} initialView="pajak" />;
      case "finance-dokumen-pajak":
        return <FinanceModule key={`spt-${navCount}`} user={user} initialView="spt" />;
      case "finance-neraca":
        return <FinanceModule key={`neraca-${navCount}`} user={user} initialView="neraca" />;
      case "finance-laporan":
        return <FinanceModule key={`laporan-${navCount}`} user={user} initialView="laporan" />;
      case "pengaturan-pajak":
        return <FinanceModule key={`taxconfig-${navCount}`} user={user} initialView="taxconfig" />;
      case "documents":
        return <DocumentsModule user={user} />;
      case "scoreboard":
        return <ScoreboardModule />;
      case "assessment":
        return <AssessmentModule />;
      case "team":
        return <TeamManagementModule />;
      case "reports":
        return <ReportsModule />;
      case "pengaturan":
        return <PengaturanModule />;
      case "doclayout":
        return <DocumentLayoutModule />;
      case "surat":
        return <SuratModule user={user} />;
      case "kanban":
        return <KanbanModule user={user} />;
      case "biodata":
        return <BiodataModule user={user} />;
      case "aimaster":
        return <AiMasterContentModule user={user} />;
      case "importdata":
        return <ImportDataModule />;
      case "subscriptions":
        return <SubscriptionManagerModule />;
      case "teamstructure":
        return <TeamStructureModule user={user} />;
      case "broadcast":
        return <BroadcastModule />;
      case "mynotifs":
        return <MyNotificationsModule user={user} />;
      case "chat":
        return <ChatModule user={user} />;
      case "agenda":
        return <AgendaModule user={user} />;
      default:
        return null;
    }
  }

  return (
    <AppShell
      user={user}
      activeView={view}
      onViewChange={handleViewChange}
      onLogout={handleLogout}
      notifications={notifications}
      onMarkNotificationsRead={markNotificationsRead}
    >
      {renderView()}
    </AppShell>
  );
}
