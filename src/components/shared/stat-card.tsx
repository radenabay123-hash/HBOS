"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  indicator?: "green" | "yellow" | "red" | "neutral";
  subtitle?: string;
  progress?: number; // 0-100
  accent?: string; // tailwind color class for icon bg
}

const indicatorStyles = {
  green: "border-l-emerald-500",
  yellow: "border-l-amber-500",
  red: "border-l-rose-500",
  neutral: "border-l-slate-300",
};

const indicatorDot = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
  neutral: "bg-slate-400",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  indicator = "neutral",
  subtitle,
  progress,
  accent = "bg-emerald-50 text-emerald-600",
}: StatCardProps) {
  return (
    <Card className={cn("border-l-4 overflow-hidden hover:shadow-md transition-shadow", indicatorStyles[indicator])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 truncate">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", accent)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {progress != null && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  progress >= 100 ? "bg-emerald-500" : progress >= 60 ? "bg-amber-500" : "bg-rose-500"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function IndicatorBadge({ indicator, label }: { indicator: "green" | "yellow" | "red" | "neutral"; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
      indicator === "green" ? "bg-emerald-100 text-emerald-700" :
      indicator === "yellow" ? "bg-amber-100 text-amber-700" :
      indicator === "red" ? "bg-rose-100 text-rose-700" :
      "bg-slate-100 text-slate-600"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", indicatorDot[indicator])} />
      {label}
    </span>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
