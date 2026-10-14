import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Activity,
  Gauge,
  RefreshCw,
  Search,
  Shield,
  SignalHigh,
  Users,
 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FallingPapers } from "@/components/FallingPapers";
import { LoadingPanel } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { effectiveLivePlayerCount, parsePlayersSnapshot } from "@/lib/players-snapshot";
import { useIsDemoMode } from "@/demo/demoMode";
import { getDashboardDemoState, makeDemoData } from "@/demo/demoData";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

type DetectionFeedItem = {
  id: string;
  player: string;
  cheatType: string;
  action: string;
  time: string;
};

type BanFeedItem = {
  id: string;
  player: string;
  reason: string;
  time: string;
};

type ServerPanelData = {
  status: "online" | "offline";
  ping: number;
  players: number;
  maxSlots: number;
  acStatus: "active" | "inactive" | "updating";
  activeModules: string[];
  detectionsLastHour: number;
  fps: number;
  tickRate: number;
  ramUsage: number;
  cpuUsage: number;
  resourceCount: number;
  uptime: string;
  lastRestart: string;
  detectionFeed: DetectionFeedItem[];
  banFeed: BanFeedItem[];
  perfHistory: { t: string; fps: number }[];
};

function parseMetaNumber(meta: Record<string, unknown> | null, keys: string[], fallback: number): number {
  if (!meta) return fallback;
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return fallback;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function PanelCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.08] hover:border-blue-500/30 bg-gradient-to-b from-[#0c1017] to-[#04060a] p-4 shadow-xl transition-all", className)}>
      {children}
    </div>
  );
}

export default function ServerPanel() {
  const { serverId } = useParams();
  const isDemo = useIsDemoMode();
  const [data, setData] = useState<ServerPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (isDemo) {
      const demo = makeDemoData();
      const demoDash = getDashboardDemoState();
      const now = Date.now();
      setData({
        status: "online",
        ping: 42,
        players: demo.players.length,
        maxSlots: demoDash.maxSlots,
        acStatus: "active",
        activeModules: ["Speed", "Teleport", "Weapon", "Godmode", "Noclip", "Aimbot"],
        detectionsLastHour: 7,
        fps: 58,
        tickRate: 64,
        ramUsage: 62,
        cpuUsage: 38,
        resourceCount: 142,
        uptime: "3d 14h",
        lastRestart: new Date(now - 302400000).toISOString(),
        detectionFeed: demo.bans.slice(0, 6).map((b, i) => ({
          id: `det-${i}`,
          player: b.playerName,
          cheatType: b.description,
          action: "ban",
          time: new Date(now - i * 420000).toISOString(),
        })),
        banFeed: demo.bans.slice(0, 5).map((b, i) => ({
          id: `ban-${i}`,
          player: b.playerName,
          reason: b.description,
          time: b.createdAt,
        })),
        perfHistory: Array.from({ length: 12 }, (_, i) => ({
          t: `${12 - i}m`,
          fps: 52 + Math.round(Math.sin(i) * 6),
        })),
      });
      setLoading(false);
      return;
    }
    if (!serverId) return;

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [serverRes, snapRes, settingsRes, resourcesRes, bansHourRes, recentBansRes, recentDetsRes] =
      await Promise.all([
        supabase.from("servers").select("status, created_at, last_update").eq("server_id", serverId).maybeSingle(),
        supabase.from("players_snapshots").select("snapshot, total_players, metadata, updated_at").eq("server_id", serverId).maybeSingle(),
        supabase.from("server_settings").select("settings").eq("server_id", serverId).maybeSingle(),
        supabase.from("server_resources").select("resources").eq("server_id", serverId).maybeSingle(),
        supabase.from("bans").select("id", { count: "exact", head: true }).eq("server_id", serverId).gte("created_at", hourAgo),
        supabase
          .from("bans")
          .select("id, player_name, reason, created_at, mode")
          .eq("server_id", serverId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("bans")
          .select("id, player_name, reason, created_at, mode")
          .eq("server_id", serverId)
          .eq("mode", "Anticheat")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    const server = serverRes.data as { status?: string; created_at?: string; last_update?: string } | null;
    const snap = snapRes.data;
    const metaRaw = snap?.metadata;
    const meta = typeof metaRaw === "string"
      ? (() => { try { return JSON.parse(metaRaw); } catch { return {}; } })()
      : ((metaRaw as Record<string, unknown> | null) ?? {});
    const players = effectiveLivePlayerCount(snap ?? undefined);
    const maxSlots = parseMetaNumber(meta, ["max_players", "maxPlayers", "slots"], 48);
    const ping = parseMetaNumber(meta, ["ping", "server_ping"], 0);
    const fps = parseMetaNumber(meta, ["fps", "server_fps", "frame_rate"], 0);
    const tickRate = parseMetaNumber(meta, ["tick_rate", "tickRate", "tick"], 0);
    const ramUsage = parseMetaNumber(meta, ["ram_usage", "ramUsage", "ram_percent"], 0);
    const cpuUsage = parseMetaNumber(meta, ["cpu_usage", "cpuUsage", "cpu_percent"], 0);
    const uptimeSec = parseMetaNumber(meta, ["uptime_s", "uptime_seconds", "uptime"], 0);
    const lastRestart = String(meta.last_restart || meta.lastRestart || server?.last_update || snap?.updated_at || "");

    const settings = (settingsRes.data?.settings as Record<string, unknown> | null) ?? {};
    const protections = (settings.protections as Record<string, boolean> | null) ?? {};
    const activeModules = Object.entries(protections)
      .filter(([, on]) => on)
      .map(([name]) => name.replace(/^Anti\s+/i, "").slice(0, 24))
      .slice(0, 20);

    let resources: unknown[] = [];
    const resRaw = resourcesRes.data?.resources;
    if (Array.isArray(resRaw)) resources = resRaw;
    else if (typeof resRaw === "string") {
      try {
        const parsed = JSON.parse(resRaw);
        if (Array.isArray(parsed)) resources = parsed;
      } catch { /* ignore */ }
    }

    const acVersion = String(meta.version || meta.ac_version || "");
    const acStatus: ServerPanelData["acStatus"] =
      server?.status === "online" ? (acVersion ? "active" : "updating") : "inactive";

    const detectionFeed: DetectionFeedItem[] = (recentDetsRes.data ?? []).map((row) => {
      const r = row as { id: string; player_name?: string; reason?: string; created_at?: string };
      return {
        id: r.id,
        player: String(r.player_name || "Unknown"),
        cheatType: String(r.reason || "Detection"),
        action: "ban",
        time: r.created_at || new Date().toISOString(),
      };
    });

    const banFeed: BanFeedItem[] = (recentBansRes.data ?? []).map((row) => {
      const r = row as { id: string; player_name?: string; reason?: string; created_at?: string };
      return {
        id: r.id,
        player: String(r.player_name || "Unknown"),
        reason: String(r.reason || "Banned"),
        time: r.created_at || new Date().toISOString(),
      };
    });

    const { players: snapPlayers } = parsePlayersSnapshot(snap ?? undefined);
    const avgPing =
      snapPlayers.length > 0
        ? Math.round(
            snapPlayers.reduce((s, p) => s + (Number((p as { ping?: number }).ping) || 0), 0) / snapPlayers.length,
          )
        : ping;

    setData({
      status: server?.status === "online" ? "online" : "offline",
      ping: avgPing || ping,
      players,
      maxSlots,
      acStatus,
      activeModules: activeModules.length > 0 ? activeModules : ["Speed", "Teleport", "Weapon", "Noclip"],
      detectionsLastHour: recentDetsRes.count ?? bansHourRes.count ?? 0,
      fps: fps || 0,
      tickRate: tickRate || 0,
      ramUsage: ramUsage || 0,
      cpuUsage: cpuUsage || 0,
      resourceCount: resources.length,
      uptime: uptimeSec > 0 ? formatUptime(uptimeSec) : "—",
      lastRestart: lastRestart,
      detectionFeed,
      banFeed,
      perfHistory: Array.from({ length: 12 }, (_, i) => ({
        t: `${12 - i}m`,
        fps: fps > 0 ? Math.max(20, fps - i + Math.round(Math.sin(i) * 3)) : 0,
      })),
    });
    setLoading(false);
  }, [isDemo, serverId]);

  useEffect(() => {
    void load();
    if (isDemo) return;
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, [load, isDemo]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredModules = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.activeModules;
    return data.activeModules.filter((m) => m.toLowerCase().includes(q));
  }, [data, search]);

  if (loading || !data) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <LoadingPanel label="Loading server panel…" />
      </div>
    );
  }

  const perfRows: { label: string; value: string }[] = [
    { label: "Server FPS", value: data.fps ? String(data.fps) : "—" },
    { label: "Tick rate", value: data.tickRate ? String(data.tickRate) : "—" },
    { label: "RAM usage", value: data.ramUsage ? `${data.ramUsage}%` : "—" },
    { label: "CPU usage", value: data.cpuUsage ? `${data.cpuUsage}%` : "—" },
    { label: "Resources", value: String(data.resourceCount) },
    { label: "Uptime", value: data.uptime },
    {
      label: "Last restart",
      value: data.lastRestart ? formatDistanceToNow(new Date(data.lastRestart), { addSuffix: true }) : "—",
    },
  ];

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 bg-[#0F1017] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.02),transparent_55%)] -z-10" />
      <FallingPapers />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col gap-3.5 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-white md:text-xl">Server Panel</h1>
            <p className="truncate text-xs text-zinc-400">FiveM anticheat · {serverId || "demo"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 border-white/10 bg-[#141414] hover:bg-[#1a1a1e] text-zinc-300 hover:text-white px-3.5 text-xs font-bold rounded-xl"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 xl:grid-cols-4">
          <PanelCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Server status</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge className={cn("h-5 px-1.5 text-[10px] capitalize", data.status === "online" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400")}>
                {data.status}
              </Badge>
              <span className="text-[11px] text-slate-400">{data.ping > 0 ? `${data.ping}ms ping` : "—"}</span>
            </div>
          </PanelCard>
          <PanelCard>
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Users className="h-3 w-3" /> Players
            </p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-100">
              {data.players}
              <span className="text-xs font-normal text-slate-500"> / {data.maxSlots}</span>
            </p>
          </PanelCard>
          <PanelCard>
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Shield className="h-3 w-3" /> VexShield AC
            </p>
            <Badge className={cn("mt-1 h-5 px-1.5 text-[10px] capitalize", data.acStatus === "active" ? "bg-sky-500/20 text-sky-300" : data.acStatus === "updating" ? "bg-amber-500/20 text-amber-300" : "bg-slate-500/20 text-slate-400")}>
              {data.acStatus}
            </Badge>
          </PanelCard>
          <PanelCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Detections (1h)</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-rose-300">{data.detectionsLastHour}</p>
          </PanelCard>
        </div>

        <div className="grid min-h-0 shrink-0 grid-cols-1 gap-2 xl:grid-cols-12">
          <PanelCard className="flex min-h-0 flex-col xl:col-span-8">
            <p className="mb-1 flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <Gauge className="h-3.5 w-3.5" /> Server FPS trend
            </p>
            <div className="min-h-[72px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.perfHistory}>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
                  <Area type="monotone" dataKey="fps" stroke="#38bdf8" fill="rgba(56,189,248,0.12)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PanelCard>

          <PanelCard className="xl:col-span-4">
            <p className="mb-1.5 text-[11px] font-semibold text-slate-300">Performance</p>
            <div className="space-y-1">
              {perfRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-2 text-[11px]">
                  <span className="text-slate-500">{row.label}</span>
                  <span className="truncate text-right text-slate-200">{row.value}</span>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>

        <PanelCard className="shrink-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold text-slate-300">Active modules</p>
            <div className="relative min-w-[140px] flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search modules…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 border-white/10 bg-white/[0.04] pl-7 text-[11px]"
              />
            </div>
          </div>
          <div className="flex max-h-[52px] flex-wrap gap-1 overflow-y-auto">
            {filteredModules.map((m) => (
              <Badge key={m} variant="outline" className="h-5 border-sky-500/25 bg-sky-500/10 px-1.5 text-[10px] text-sky-300">
                {m}
              </Badge>
            ))}
          </div>
        </PanelCard>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-2">
          <PanelCard className="flex min-h-0 flex-col">
            <p className="mb-1 flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <Activity className="h-3.5 w-3.5 text-rose-400" /> Recent detection feed
            </p>
            <ScrollArea className="min-h-0 flex-1">
              <ul className="space-y-1 pr-2">
                {data.detectionFeed.map((d) => (
                  <li key={d.id} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-slate-200">{d.player}</span>
                      <span className="shrink-0 text-[9px] text-slate-500">{formatDistanceToNow(new Date(d.time), { addSuffix: true })}</span>
                    </div>
                    <p className="truncate text-[10px] text-rose-300/90">{d.cheatType}</p>
                    <p className="text-[9px] text-slate-500">Action: {d.action}</p>
                  </li>
                ))}
                {data.detectionFeed.length === 0 && <p className="text-[11px] text-slate-500">No recent detections</p>}
              </ul>
            </ScrollArea>
          </PanelCard>

          <PanelCard className="flex min-h-0 flex-col">
            <p className="mb-1 flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <SignalHigh className="h-3.5 w-3.5 text-amber-400" /> Recent bans feed
            </p>
            <ScrollArea className="min-h-0 flex-1">
              <ul className="space-y-1 pr-2">
                {data.banFeed.map((b) => (
                  <li key={b.id} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-slate-200">{b.player}</span>
                      <span className="shrink-0 text-[9px] text-slate-500">{formatDistanceToNow(new Date(b.time), { addSuffix: true })}</span>
                    </div>
                    <p className="truncate text-[10px] text-slate-400">{b.reason}</p>
                  </li>
                ))}
                {data.banFeed.length === 0 && <p className="text-[11px] text-slate-500">No recent bans</p>}
              </ul>
            </ScrollArea>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
