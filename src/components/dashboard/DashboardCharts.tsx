import { useMemo, memo, type ReactNode } from "react";
import type { LucideIcon } from "@/components/animate-icons";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AnalyticsPoint } from "@/lib/dashboard-analytics";
import { seriesPeakAvg } from "@/lib/dashboard-analytics";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#06b6d4", "#38bdf8", "#0ea5e9", "#22d3ee", "#67e8f9", "#0284c7", "#7dd3fc"] as const;

const analyticsConfig = {
  players: { label: "Players", color: "hsl(188, 94%, 48%)" },
  bans: { label: "Bans", color: "hsl(343, 89%, 60%)" },
} satisfies ChartConfig;

export function formatDashboardNumber(value: number | string): string {
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "0";
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent: "sky" | "violet" | "rose" | "emerald";
  valueClassName?: string;
  suffix?: string;
  trend?: number;
  trendUp?: boolean;
  sparkline?: number[];
  compact?: boolean;
};

function Sparkline({ data, stroke, compact }: { data: number[]; stroke: string; compact?: boolean }) {
  const w = compact ? 72 : 96;
  const h = compact ? 26 : 36;
  const pts = data.length > 1 ? data : [0, 0];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const step = w / (pts.length - 1);
  const coords = pts.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = `spark-${stroke.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const accentStyles = {
  sky: {
    bar: "bg-cyan-500",
    icon: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    value: "text-cyan-400",
    glow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    stroke: "#06b6d4",
  },
  violet: {
    bar: "bg-purple-500",
    icon: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    value: "text-purple-400",
    glow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    stroke: "#a855f7",
  },
  rose: {
    bar: "bg-rose-500",
    icon: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    value: "text-rose-500",
    glow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    stroke: "#f43f5e",
  },
  emerald: {
    bar: "bg-emerald-500",
    icon: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    value: "text-emerald-400",
    glow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    stroke: "#10b981",
  },
} as const;

type DashboardInfoCardProps = {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  iconClassName?: string;
};

export function DashboardInfoCard({ icon: Icon, label, children, iconClassName }: DashboardInfoCardProps) {
  return (
    <Card className="relative overflow-hidden rounded-xl border border-white/10 bg-[#090e18] shadow-md px-4 py-3.5 transition-all duration-300 hover:border-white/20">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("rounded-lg p-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/20", iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
      </div>
      <div className="min-h-[28px]">{children}</div>
    </Card>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
  valueClassName,
  suffix,
  trend,
  trendUp,
  sparkline,
  compact,
}: MetricCardProps) {
  const styles = accentStyles[accent];
  const display =
    typeof value === "number" ? formatDashboardNumber(value) : value;
  const hasTrend = !compact && typeof trend === "number";
  const up = trendUp ?? (trend ?? 0) >= 0;

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-xl border border-white/10 bg-[#090e18] shadow-md p-0 transition-all duration-300 hover:border-white/20",
      styles.glow
    )}>
      <div className={cn("absolute inset-y-0 left-0", compact ? "w-1" : "w-1.5", styles.bar)} />
      <div className={cn("flex items-stretch gap-2", compact ? "px-3 py-2.5 pl-4" : "px-5 py-4 pl-6")}>
        <div className="min-w-0 flex-1">
          <div className={cn("flex items-center gap-2", compact ? "mb-1" : "mb-2")}>
            <div className={cn("rounded-lg border", styles.icon, compact ? "p-1" : "p-1.5")}>
              <Icon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </div>
            <span className={cn("font-semibold uppercase tracking-wider text-zinc-400", compact ? "text-[11px]" : "text-xs")}>{label}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <p
              className={cn(
                "font-bold tabular-nums leading-none tracking-tight",
                compact ? "text-2xl" : "text-3xl sm:text-4xl",
                styles.value,
                valueClassName,
              )}
            >
              {display}
            </p>
            {suffix ? (
              <span className={cn("font-normal text-zinc-400", compact ? "text-xs" : "text-sm")}>{suffix}</span>
            ) : null}
          </div>
          {hasTrend ? (
            <div className="mt-1 flex items-center gap-1 text-[10px] font-medium">
              <span className={cn(up ? "text-emerald-400" : "text-rose-400")}>
                {up ? "↑" : "↓"} {Math.abs(trend as number)}%
              </span>
              <span className="text-zinc-500">from yesterday</span>
            </div>
          ) : null}
        </div>
        {sparkline && sparkline.length > 1 ? (
          <div className="flex shrink-0 items-end self-center">
            <Sparkline data={sparkline} stroke={styles.stroke} compact={compact} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

type DistributionSlice = { name: string; value: number };

const DONUT_PALETTE = [
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // rose/red
  "#a855f7", // purple
  "#ec4899", // pink
  "#6366f1", // indigo
];

type DistributionDonutChartProps = {
  title: string;
  subtitle?: string;
  data: DistributionSlice[];
  centerLabel?: string;
  showPercent?: boolean;
};

export const DistributionDonutChart = memo(function DistributionDonutChart({
  title,
  subtitle,
  data,
  centerLabel = "total",
  showPercent = false,
}: DistributionDonutChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  // Sort data descending so the most significant drops/detections are at the top
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value);
  }, [data]);

  const pieData = useMemo(() => {
    if (total === 0) {
      return [{ name: "No data", value: 1, color: "rgba(255,255,255,0.06)" }];
    }
    return sortedData.filter((d) => d.value > 0).map((d, idx) => ({
      ...d,
      color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
    }));
  }, [sortedData, total]);

  return (
    <Card className="flex h-full min-h-0 flex-col rounded-xl border border-white/10 bg-[#090e18] hover:border-white/20 p-5 transition-all duration-200 relative overflow-hidden group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 font-medium mt-0.5 font-mono">
              ({subtitle})
            </p>
          )}
        </div>
      </div>

      {/* Two-column layout: Donut chart on left, Legend list on right (WaveShield style) */}
      <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 min-h-0">
        {/* Left: Real Donut Chart with center value */}
        <div className="relative flex items-center justify-center w-[150px] h-[150px] shrink-0">
          <PieChart width={150} height={150}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={46}
              outerRadius={66}
              paddingAngle={total > 0 ? 3 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
            <span className="text-xl font-bold font-mono text-white leading-none">
              {formatDashboardNumber(total)}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium lowercase mt-0.5">
              {centerLabel}
            </span>
          </div>
        </div>

        {/* Right: Legend Items List */}
        <div className="flex-1 min-w-0 w-full flex flex-col justify-center space-y-2 max-h-[170px] overflow-y-auto pr-1 scrollbar-thin">
          {sortedData.length === 0 ? (
            <p className="text-xs text-zinc-500 italic text-center">No telemetry recorded</p>
          ) : (
            sortedData.map((item, i) => {
              const color = DONUT_PALETTE[i % DONUT_PALETTE.length];
              const hasValue = item.value > 0;
              return (
                <div key={item.name} className="flex items-center justify-between gap-2 text-xs group/item">
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: hasValue ? color : "rgba(255,255,255,0.15)" }}
                    />
                    <span
                      className={cn(
                        "truncate font-medium transition-colors",
                        hasValue ? "text-zinc-200 group-hover/item:text-white" : "text-zinc-500"
                      )}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-mono font-semibold shrink-0 text-right",
                      hasValue ? "text-zinc-100" : "text-zinc-500"
                    )}
                  >
                    {formatDashboardNumber(item.value)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
});

type ServerAnalyticsChartProps = { data: AnalyticsPoint[]; subtitle?: string };

export const ServerAnalyticsChart = memo(function ServerAnalyticsChart({ data, subtitle = "last 24h" }: ServerAnalyticsChartProps) {
  const { peak, avg } = useMemo(() => seriesPeakAvg(data.map((d) => d.players)), [data]);

  const yMax = useMemo(() => {
    const top = Math.max(...data.map((d) => Math.max(d.players, d.bans)), 1);
    if (top <= 65) return 65;
    return Math.ceil(top / 65) * 65;
  }, [data]);

  return (
    <Card className="flex h-full min-h-0 flex-col rounded-xl border border-white/5 bg-[#090e18] hover:border-white/10 p-5 transition-all duration-200 relative overflow-hidden group">
      {/* Header */}
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Server Telemetry Analytics</span>
          </h3>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 font-medium mt-0.5 font-mono">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-white/5 border border-white/10 px-2.5 py-1 text-xs">
            <span className="text-zinc-400">Peak:</span>
            <span className="font-mono text-white font-semibold">{formatDashboardNumber(peak)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-white/5 border border-white/10 px-2.5 py-1 text-xs">
            <span className="text-zinc-400">Avg:</span>
            <span className="font-mono text-white font-semibold">{formatDashboardNumber(avg)}</span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <ChartContainer config={analyticsConfig} className="aspect-auto min-h-[180px] w-full flex-1 [&]:!aspect-auto">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
          <defs>
            <linearGradient id="fillPlayers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillBans" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-white/[0.04]" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={3} tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }} />
          <YAxis tickLine={false} axisLine={false} domain={[0, yMax]} tickCount={5} tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }} />
          <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
          <Area type="monotone" dataKey="players" stroke="#3b82f6" fill="url(#fillPlayers)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#3b82f6", strokeWidth: 2, fill: "#090e18" }} />
          <Area type="monotone" dataKey="bans" stroke="#f43f5e" fill="url(#fillBans)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, stroke: "#f43f5e", strokeWidth: 2, fill: "#090e18" }} />
        </AreaChart>
      </ChartContainer>

      {/* Legend */}
      <div className="mt-3 flex shrink-0 items-center justify-center gap-6 text-xs font-medium text-zinc-400">
        <span className="flex items-center gap-2 group cursor-pointer">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="group-hover:text-white transition-colors">Players</span>
        </span>
        <span className="flex items-center gap-2 group cursor-pointer">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="group-hover:text-white transition-colors">Bans</span>
        </span>
      </div>
    </Card>
  );
});
