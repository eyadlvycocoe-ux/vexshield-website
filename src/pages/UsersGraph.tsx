import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw, Users, ShieldAlert, Ban, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingPanel } from "@/components/ui/loading-spinner";
import { DistributionDonutChart } from "@/components/dashboard/DashboardCharts";
import { useServerUsers } from "@/hooks/useServerUsers";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

function formatDayLabel(date: string) {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatBadge({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "emerald" | "rose" | "amber" | "sky";
}) {
  const colorMap = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#070d18]/90 px-3.5 py-2.5 shadow-md">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <h3 className="text-xl font-black text-white tabular-nums tracking-tight">{value}</h3>
          <p className="truncate text-[10px] font-medium text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className={cn("rounded-lg border p-2 shrink-0 ml-2", colorMap[color])}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col min-h-0 h-full rounded-xl border border-white/[0.08] bg-[#070d18]/95 p-4 shadow-lg backdrop-blur transition-colors hover:border-white/[0.14]",
        className
      )}
    >
      <div className="mb-2 shrink-0 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{title}</p>
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
      </div>
      <div className="w-full flex-1 min-h-0">{children}</div>
    </div>
  );
}

export default function UsersGraph() {
  const { serverId } = useParams();
  const { graphData, loading, refreshing, refresh } = useServerUsers();

  const charts = useMemo(() => {
    if (!graphData) return null;
    return {
      newUsers: graphData.newUsersOverTime.map((p) => ({ ...p, label: formatDayLabel(p.date) })),
      detections: graphData.detectionsPerDay.map((p) => ({ ...p, label: formatDayLabel(p.date) })),
      banRate: graphData.banRateOverTime.map((p) => ({ ...p, label: formatDayLabel(p.date) })),
      modules:
        graphData.topCheatModules && graphData.topCheatModules.length > 0
          ? graphData.topCheatModules.map((m) => ({ name: m.name, value: m.count }))
          : [
              { name: "Lua Execution", value: 0 },
              { name: "Resource Stopper", value: 0 },
              { name: "Event Spammer", value: 0 },
              { name: "Godmode Detect", value: 0 },
              { name: "Noclip / Teleport", value: 0 },
            ],
      ratio: graphData.activeVsBanned,
    };
  }, [graphData]);

  const kpis = useMemo(() => {
    if (!graphData) return null;
    const ratioList = graphData.activeVsBanned || [];
    const totalUsers = ratioList.reduce((sum, item) => sum + (Number(item?.value) || 0), 0);
    const activeUsers = ratioList.find((i) => i.name.toLowerCase().includes("active"))?.value || 0;
    const bannedUsers = ratioList.find((i) => i.name.toLowerCase().includes("banned"))?.value || 0;
    const totalDetections = (graphData.detectionsPerDay || []).reduce((sum, p) => sum + (Number(p?.count) || 0), 0);

    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      totalDetections,
    };
  }, [graphData]);

  if (loading || !charts || !kpis) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <LoadingPanel label="Loading analytics…" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden p-3 md:p-4 gap-3">
      {/* Top Bar & KPI Summary */}
      <div className="shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-2.5">
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-400" />
              User Analytics & Trends
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Real-time telemetry and detection metrics · <span className="text-sky-400 font-bold">{serverId || "demo"}</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-white/[0.1] bg-white/[0.04] px-3 text-xs font-bold text-white hover:bg-white/[0.08]"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* 4 Stat Badges in 1 compact row */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatBadge
            title="Total Registered"
            value={kpis.totalUsers}
            subtitle="Unique accounts"
            icon={Users}
            color="emerald"
          />
          <StatBadge
            title="Active Players"
            value={kpis.activeUsers}
            subtitle="Clean standing"
            icon={TrendingUp}
            color="sky"
          />
          <StatBadge
            title="Total Detections"
            value={kpis.totalDetections}
            subtitle="Alerts logged"
            icon={ShieldAlert}
            color="rose"
          />
          <StatBadge
            title="Banned Users"
            value={kpis.bannedUsers}
            subtitle="Terminated"
            icon={Ban}
            color="amber"
          />
        </div>
      </div>

      {/* Main Full-Height 2-Row Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-rows-2 gap-3.5">
        {/* Row 1: New Users */}
        <ChartCard title="New Users Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.newUsers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="newUsersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} width={30} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#090d16", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: 11, color: "#fff" }} />
              <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#newUsersGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 1: Detections */}
        <ChartCard title="Detections Per Day">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.detections} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="detectionsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} width={30} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#090d16", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: 11, color: "#fff" }} />
              <Area type="monotone" dataKey="count" stroke="#f43f5e" fill="url(#detectionsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 1: Ban Rate */}
        <ChartCard title="Ban Rate Over Time (%)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.banRate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="banRateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} width={30} unit="%" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#090d16", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: 11, color: "#fff" }} />
              <Area type="monotone" dataKey="rate" stroke="#fbbf24" fill="url(#banRateGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 2: Most Triggered Modules (Col Span 2) */}
        <ChartCard title="Most Triggered Cheat Modules" className="md:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.modules} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="modulesGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#cbd5e1", fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(56, 189, 248, 0.06)' }} contentStyle={{ background: "#090d16", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: 11, color: "#fff" }} />
              <Bar dataKey="value" fill="url(#modulesGrad)" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Row 2: User Ratio Donut (Col Span 1) */}
        <div className="flex flex-col min-h-0 h-full rounded-xl border border-white/[0.08] bg-[#070d18]/95 p-4 shadow-lg backdrop-blur overflow-hidden">
          <DistributionDonutChart
            title="Active vs Banned Users"
            subtitle="Status Ratio Breakdown"
            data={charts.ratio}
            centerLabel="users"
          />
        </div>
      </div>
    </div>
  );
}
