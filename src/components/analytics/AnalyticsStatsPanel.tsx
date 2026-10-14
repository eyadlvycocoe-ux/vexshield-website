import { useMemo } from "react";
import { MapPin, User } from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { formatDashboardNumber } from "@/components/dashboard/DashboardCharts";
import type { GlobePlayerPoint } from "@/components/analytics/PlayerGlobe.types";

const PIE_COLORS = ["#f8fafc", "#38bdf8", "#94a3b8", "#a78bfa", "#4ade80", "#fb923c"] as const;

type CountrySlice = { name: string; value: number };

type Props = {
  onlineCount: number;
  activitySpark: { i: number; v: number }[];
  countryBreakdown: CountrySlice[];
  stats: { warns: number; kicks: number; bans: number };
  rawPoints?: GlobePlayerPoint[];
  selectedPoint?: GlobePlayerPoint | null;
  onSelectPlayer?: (point: GlobePlayerPoint) => void;
};

export function AnalyticsStatsPanel({
  onlineCount,
  activitySpark,
  countryBreakdown,
  stats,
  rawPoints = [],
  selectedPoint,
  onSelectPlayer,
}: Props) {
  const filtered = useMemo(
    () => [...countryBreakdown].filter((d) => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 3),
    [countryBreakdown],
  );
  const total = useMemo(() => filtered.reduce((sum, d) => sum + d.value, 0), [filtered]);
  const chartData = total > 0 ? filtered : [{ name: "empty", value: 1 }];

  return (
    <div className="flex w-[260px] shrink-0 flex-col gap-2.5 overflow-y-auto pr-0.5">
      <Card className="rounded-2xl border border-white/[0.08] hover:border-blue-500/30 bg-gradient-to-b from-[#0c1017] to-[#04060a] p-4 shadow-2xl transition-all">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Online players</p>
        <p className="mt-1 text-3xl font-black tabular-nums leading-none text-blue-400">{onlineCount}</p>

        <div className="mt-3 h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activitySpark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="analyticsSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="#38bdf8"
                fill="url(#analyticsSpark)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Top countries</p>

        <div className="relative mx-auto mt-3 h-[88px] w-[88px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={30}
                outerRadius={42}
                strokeWidth={2}
                stroke="#0a0a0a"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {total > 0
                  ? filtered.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))
                  : <Cell fill="rgba(255,255,255,0.1)" />}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {filtered.length > 0 ? (
            filtered.map((item, i) => (
              <div key={item.name} className="min-w-0 text-center">
                <div className="mb-1 flex items-center justify-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="truncate text-[11px] font-medium text-zinc-400">{item.name}</span>
                </div>
                <p className="text-xs font-bold tabular-nums text-white">
                  {total > 0 ? `${Math.round((item.value / total) * 100)}%` : "0%"}
                </p>
              </div>
            ))
          ) : (
            <p className="col-span-3 text-center text-xs text-zinc-500">No country data yet</p>
          )}
        </div>
      </Card>

      <Card className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#0a0a0a] px-3 py-3.5 shadow-2xl">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Warns</p>
          <p className="mt-1 text-xl font-black tabular-nums text-zinc-200">{formatDashboardNumber(stats.warns)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Kicks</p>
          <p className="mt-1 text-xl font-black tabular-nums text-zinc-200">{formatDashboardNumber(stats.kicks)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bans</p>
          <p className="mt-1 text-xl font-black tabular-nums text-white">{formatDashboardNumber(stats.bans)}</p>
        </div>
      </Card>

      {/* Online Connected Players List (Pin to Map) */}
      <Card className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0a0a0a] p-3.5 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Connected Players</p>
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
            {rawPoints.length} Live
          </span>
        </div>

        <div className="mt-1 flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
          {rawPoints.length > 0 ? (
            rawPoints.map((p, idx) => {
              const isSelected = selectedPoint?.lat === p.lat && selectedPoint?.lng === p.lng;
              return (
                <button
                  key={`${p.name}-${idx}`}
                  type="button"
                  onClick={() => onSelectPlayer?.(p)}
                  className={`group flex items-center justify-between rounded-xl border p-2 text-left transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-600/20 shadow-lg shadow-blue-500/10"
                      : "border-white/5 bg-zinc-900/60 hover:border-blue-500/40 hover:bg-blue-600/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="truncate text-xs font-bold text-zinc-200 group-hover:text-white">{p.name}</p>
                      <p className="truncate text-[10px] text-zinc-400">{p.country || "Live Location"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg text-blue-400 text-[10px] font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MapPin className="h-3 w-3" />
                    Pin 📍
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-4 text-center text-xs text-zinc-500 font-medium">
              No players online right now
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
