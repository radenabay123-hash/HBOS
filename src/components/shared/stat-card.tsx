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
  green: "border-l-blue-500",
  yellow: "border-l-amber-500",
  red: "border-l-rose-500",
  neutral: "border-l-slate-300",
};

const indicatorDot = {
  green: "bg-blue-500",
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
  accent = "bg-blue-50 text-blue-600",
}: StatCardProps) {
  return (
    <Card className={cn("border-l-4 shadow-sm hover:shadow-md transition-shadow rounded-xl overflow-hidden", indicatorStyles[indicator])}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accent)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide truncate">{title}</p>
          <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          {progress != null && (
            <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", indicatorDot[indicator])} style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function IndicatorBadge({ indicator, label }: { indicator: "green" | "yellow" | "red" | "neutral"; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
      indicator === "green" ? "bg-blue-100 text-blue-700" :
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
