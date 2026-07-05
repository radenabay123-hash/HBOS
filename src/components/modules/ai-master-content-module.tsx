"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Send, RefreshCw, Lightbulb, FileText, Flame, Copy, Check,
  Bot, User, Trash2, Zap, Target, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const QUICK_PROMPTS = [
  {
    icon: Flame,
    title: "Riset 30 Ide Konten",
    prompt: "Riset 30 ide konten tentang masalah leadership di perusahaan. Lakukan analisis Pain, Fear, Dream, Conflict, Objection, Trend, Behavior, Mindset, Psychology, Common Mistake terlebih dahulu, lalu buat 30 ide konten urut dari potensi viral tertinggi.",
    color: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200",
  },
  {
    icon: FileText,
    title: "Script Konten Lengkap",
    prompt: "Buat script konten lengkap tentang micromanagement dengan framework: Hook → Storytelling → Insight → Analogi → Closing → CTA → Punchline. Topik: kenapa micromanagement justru membuat tim mundur.",
    color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
  },
  {
    icon: Zap,
    title: "Konten Tunggal",
    prompt: "Buat 1 konten tentang burnout kerja dengan format: Judul, Hook, Isi (maksimal 2 paragraf), CTA, Punchline. Target audience: Gen Z worker.",
    color: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200",
  },
  {
    icon: Target,
    title: "Analisis Pain Point",
    prompt: "Analisis pain point audience Business Owner terkait delegation. Jelaskan Pain, Fear, Dream, Conflict, dan Common Mistake yang sering mereka lakukan.",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
  },
  {
    icon: TrendingUp,
    title: "Hook Tajam",
    prompt: "Buat 10 hook tajam (maksimal 2 kalimat) untuk konten tentang 'kenapa tim sales tidak perform'. Gunakan pola Kontras, Kontroversi, Curiosity, Shock, dan Fear.",
    color: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200",
  },
  {
    icon: Lightbulb,
    title: "Content Pillar Strategy",
    prompt: "Buat strategi content pillar 1 bulan untuk personal branding seorang HR Director. Fokus: Leadership, Employee Engagement, dan Corporate Culture. 4 konten per minggu.",
    color: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
  },
];

const CONTENT_PILLARS = [
  "Leadership", "Human Growth", "Mindset", "Ownership", "Employee Engagement",
  "Team Performance", "Business Growth", "Productivity", "Sales", "Marketing",
  "Burnout", "Micromanagement", "Corporate Culture", "Delegation", "Psychology",
];

export function AiMasterContentModule({ user }: { user: SafeUser }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Build history (exclude the current message, send as context)
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const data = await api<{ response: string }>("/api/ai-master-content", {
        method: "POST",
        body: JSON.stringify({ message: text, history }),
      });
      const aiMsg: Message = { role: "assistant", content: data.response, timestamp: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      toast.error(e.message || "Gagal menghubungi AI");
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  function handleQuickPrompt(prompt: string) {
    sendMessage(prompt);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleCopy(content: string, idx: number) {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    toast.success("Konten disalin ke clipboard");
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function handleClearChat() {
    setMessages([]);
    toast.info("Percakapan direset");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" /> AI Master Content
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            AI Content Research Engine V5.0 — Riset konten berbasis problem nyata audience
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearChat} className="bg-white">
            <Trash2 className="w-4 h-4 mr-1" /> Reset Chat
          </Button>
        )}
      </div>

      {/* AI Identity Card */}
      <Card className="shadow-sm border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-slate-900 text-sm">AI Content Research Engine V5.0</p>
                <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">Hafara Group</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                World Class Business Coach • Viral Content Strategist • Storytelling Expert • Human Growth Productivity Expert.
                Membuat konten yang membuat audience berkata <em>"Wah, ini saya banget."</em>
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {CONTENT_PILLARS.slice(0, 8).map((p) => (
                  <Badge key={p} variant="outline" className="text-[9px] bg-white text-slate-600 border-slate-200">{p}</Badge>
                ))}
                <Badge variant="outline" className="text-[9px] bg-white text-slate-500 border-slate-200">+{CONTENT_PILLARS.length - 8} lainnya</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ===== LEFT: Quick Prompts ===== */}
        <div className="lg:col-span-1 space-y-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" /> Quick Prompts
              </CardTitle>
              <p className="text-xs text-slate-500">Klik untuk langsung eksekusi</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  disabled={loading}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                    qp.color
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <qp.icon className="w-4 h-4 shrink-0" />
                    <p className="font-semibold text-xs">{qp.title}</p>
                  </div>
                  <p className="text-[10px] opacity-80 line-clamp-2">{qp.prompt.substring(0, 80)}...</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Output Format Info */}
          <Card className="shadow-sm bg-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" /> Format Output
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-1.5">
              <p>Setiap konten mencakup:</p>
              <ol className="list-decimal list-inside space-y-0.5 ml-1">
                <li>Judul</li>
                <li>Hook (maks 2 kalimat, tajam)</li>
                <li>Isi (maks 2 paragraf pendek)</li>
                <li>CTA (mengundang komentar)</li>
                <li>Punchline</li>
              </ol>
              <div className="pt-2 mt-2 border-t border-slate-200">
                <p className="font-semibold text-slate-700 mb-1">Prinsip Konten:</p>
                <p className="text-[10px] leading-relaxed">
                  Berhenti scrolling → Baca sampai selesai → Komentar → Simpan → Bagikan → Bangun <strong>Authority & Trust</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== RIGHT: Chat Area ===== */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-600" /> Chat dengan AI Master Content
                </CardTitle>
                {loading && (
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> AI sedang berpikir...
                  </Badge>
                )}
              </div>
            </CardHeader>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Mulai percakapan dengan AI</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Pilih quick prompt di kiri, atau ketik permintaan sendiri di bawah.
                    AI akan membuat konten yang relate dengan problem nyata audience.
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user" ? "bg-slate-200" : "bg-blue-600"
                  )}>
                    {msg.role === "user" ? (
                      <User className="w-4 h-4 text-slate-700" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={cn("flex-1 min-w-0 max-w-[85%]", msg.role === "user" && "flex justify-end")}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm",
                      msg.role === "user"
                        ? "bg-slate-100 text-slate-800"
                        : "bg-blue-50 text-slate-800 border border-blue-100"
                    )}>
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-slate-500 hover:text-blue-600"
                          onClick={() => handleCopy(msg.content, idx)}
                        >
                          {copiedIdx === idx ? (
                            <><Check className="w-3 h-3 mr-1" /> Disalin</>
                          ) : (
                            <><Copy className="w-3 h-3 mr-1" /> Salin</>
                          )}
                        </Button>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-slate-600">AI sedang meriset konten...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 p-3">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik permintaan konten... (Ctrl+Enter untuk kirim)"
                  className="flex-1 resize-none bg-white text-sm"
                  rows={2}
                  disabled={loading}
                />
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="bg-blue-600 hover:bg-blue-700 h-10 px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                AI Master Content V5.0 • {user.name} • {messages.length} pesan
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
