"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Loader2, Lock, Mail, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { login, api } from "@/lib/api-client";
import { toast } from "sonner";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    api<{ settings: any[] }>("/api/settings").then((d) => {
      const map: Record<string, string> = {};
      (d.settings || []).forEach((s: any) => { map[s.key] = s.value; });
      setAppSettings(map);
    }).catch(() => {});
  }, []);

  const appName = appSettings.app_name || "HBOS";
  const appFullName = appSettings.app_full_name || "Hafara Business Operating System";
  // App logo (square icon for favicon/sidebar/login). Falls back to legacy company_logo.
  const appLogo = appSettings.app_logo || appSettings.company_logo || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Login berhasil");
      onLogin();
    } catch (err: any) {
      toast.error(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(em: string) {
    setEmail(em);
    setPassword("password123");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div className="lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-700 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-sky-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 overflow-hidden">
              {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-7 h-7" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{appName}</h1>
              <p className="text-xs text-blue-100">{appFullName}</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 space-y-6 my-8">
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
            Pantau Seluruh Aktivitas Bisnis Anda Secara Real-Time
          </h2>
          <p className="text-blue-50 text-lg">
            Sistem operasi bisnis terpadu untuk training, consulting, dan human development.
            Kelola CRM, event, KPI tim, konten, dan keuangan dalam satu platform.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            {[
              { icon: TrendingUp, label: "Dashboard Real-Time" },
              { icon: Users, label: "Role-Based Access" },
              { icon: ShieldCheck, label: "Data Terpusat" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-lg p-3 border border-white/10">
                <f.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-blue-100/80">
          © {new Date().getFullYear()} Hafara Group. All rights reserved.
        </div>
      </div>

      {/* Right login form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          <Card className="border-slate-200 shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Selamat Datang</CardTitle>
              <CardDescription>
                Masuk ke akun Anda untuk mengakses dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@hafara.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2 font-medium">Akun Demo (klik untuk isi otomatis):</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Owner", email: "owner@hafara.com" },
                    { label: "Project Mgr", email: "ayu_project@hafara.com" },
                    { label: "Asst Trainer", email: "badar_asisten@hafara.com" },
                    { label: "Content", email: "istiana_creative@hafara.com" },
                    { label: "Digital/IT", email: "cinta_marketing@hafara.com" },
                    { label: "Finance", email: "finance@hafara.com" },
                  ].map((a) => (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => quickFill(a.email)}
                      className="text-left text-xs px-2 py-1.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition border border-slate-200"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
