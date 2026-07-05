"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLORS = ["#059669", "#0d9488", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#475569"];

export function ChartCard({ title, children, className, action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <Card className={cn("border-slate-200", className)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

const axisStyle = { fontSize: 11, fill: "#64748b" };

export function BarChartCard({ title, data, keys, height = 260, formatY, stacked }: {
  title: string;
  data: any[];
  keys: { key: string; label: string; color?: string }[];
  height?: number;
  formatY?: (v: number) => string;
  stacked?: boolean;
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatY} width={50} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [formatY ? formatY(Number(v)) : v, name]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.map((k, i) => (
            <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color || COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} stackId={stacked ? "a" : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function LineChartCard({ title, data, keys, height = 260, formatY }: {
  title: string;
  data: any[];
  keys: { key: string; label: string; color?: string }[];
  height?: number;
  formatY?: (v: number) => string;
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatY} width={50} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [formatY ? formatY(Number(v)) : v, name]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.map((k, i) => (
            <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color || COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AreaChartCard({ title, data, keys, height = 260, formatY }: {
  title: string;
  data: any[];
  keys: { key: string; label: string; color?: string }[];
  height?: number;
  formatY?: (v: number) => string;
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient key={k.key} id={`grad-${k.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={k.color || COLORS[i % COLORS.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={k.color || COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatY} width={50} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [formatY ? formatY(Number(v)) : v, name]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.map((k, i) => (
            <Area key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color || COLORS[i % COLORS.length]} fill={`url(#grad-${k.key})`} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PieChartCard({ title, data, height = 260 }: {
  title: string;
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export const chartColors = COLORS;
