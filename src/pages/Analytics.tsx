import { useCallback, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FallingPapers } from "@/components/FallingPapers";
import { supabase } from "@/integrations/supabase/client";
import { useIsDemoMode } from "@/demo/demoMode";
import { extractPlayerIp } from "@/lib/player-ip";
import { effectiveLivePlayerCount, parsePlayersSnapshot } from "@/lib/players-snapshot";
import { lookupIpsGeo } from "@/lib/geo-lookup";
import type { GlobePlayerPoint } from "@/components/analytics/PlayerGlobe.types";
import {
  clusterPlayersByCountry,
  clustersToGlobePoints,
  type PlayerMapCluster,
} from "@/lib/globe-clusters";
import { AnalyticsStatsPanel } from "@/components/analytics/AnalyticsStatsPanel";
import type { PlayerGlobeHandle } from "@/components/analytics/PlayerGlobe";

const PlayerGlobe = lazy(() =>
  import("@/components/analytics/PlayerGlobe").then((m) => ({ default: m.PlayerGlobe })),
);

const DEMO_POINTS: GlobePlayerPoint[] = [
  { lat: 48.8566, lng: 2.3522, name: "Paris", country: "France", color: "#38bdf8", size: 0.4 },
  { lat: 48.5734, lng: 7.7521, name: "Strasbourg", country: "France", color: "#38bdf8", size: 0.4 },
  { lat: 43.6047, lng: 1.4442, name: "Toulouse", country: "France", color: "#38bdf8", size: 0.4 },
  { lat: 45.7640, lng: 4.8357, name: "Lyon", country: "France", color: "#38bdf8", size: 0.4 },
  { lat: 47.2184, lng: -1.5536, name: "Nantes", country: "France", color: "#38bdf8", size: 0.4 },
  { lat: 41.9028, lng: 12.4964, name: "Rome", country: "Italy", color: "#38bdf8", size: 0.4 },
  { lat: 46.2044, lng: 6.1432, name: "Geneva", country: "Switzerland", color: "#38bdf8", size: 0.4 },
  { lat: 24.7136, lng: 46.6753, name: "Riyadh", country: "Saudi Arabia", color: "#38bdf8", size: 0.4 },
  { lat: 25.2048, lng: 55.2708, name: "Dubai", country: "UAE", color: "#38bdf8", size: 0.4 },
];

const DEMO_SPARKLINE = [
  { i: 0, v: 4 }, { i: 1, v: 5 }, { i: 2, v: 3 }, { i: 3, v: 4 },
  { i: 4, v: 6 }, { i: 5, v: 8 }, { i: 6, v: 12 }, { i: 7, v: 15 },
  { i: 8, v: 11 }, { i: 9, v: 9 }, { i: 10, v: 7 }, { i: 11, v: 5 },
  { i: 12, v: 4 }, { i: 13, v: 6 }, { i: 14, v: 10 }, { i: 15, v: 9 },
];

type SnapshotPlayer = Record<string, unknown>;

function playerName(p: SnapshotPlayer): string {
  return String(p.player_name || p.name || "Unknown");
}

function buildCountryBreakdown(clusters: PlayerMapCluster[]) {
  return clusters.map((c) => ({ name: c.country, value: c.count }));
}

export default function Analytics() {
  const { serverId: routeServerId } = useParams();
  const isDemo = useIsDemoMode();
  const globeRef = useRef<PlayerGlobeHandle>(null);

  const activeServerId = useMemo(() => {
    if (routeServerId) return routeServerId;
    try {
      const raw = sessionStorage.getItem("connected_server");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.server_id) return String(parsed.server_id);
      }
    } catch {
      /* ignore */
    }
    return "";
  }, [routeServerId]);

  const [loading, setLoading] = useState(true);
  const [rawPoints, setRawPoints] = useState<GlobePlayerPoint[]>([]);
  const [onlineCount, setOnlineCount] = useState(isDemo ? 9 : 0);
  const [activitySpark, setActivitySpark] = useState<{ i: number; v: number }[]>(isDemo ? DEMO_SPARKLINE : []);
  const [stats, setStats] = useState(isDemo ? { warns: 24, kicks: 12, bans: 8 } : { warns: 0, kicks: 0, bans: 0 });

  const clusters = useMemo(() => clusterPlayersByCountry(rawPoints), [rawPoints]);
  const globePoints = useMemo(() => clustersToGlobePoints(clusters), [clusters]);
  const countryBreakdown = useMemo(() => buildCountryBreakdown(clusters), [clusters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemo) {
        setOnlineCount(9);
        setStats({ warns: 24, kicks: 12, bans: 8 });
        setActivitySpark(DEMO_SPARKLINE);
        setRawPoints(DEMO_POINTS);
        return;
      }

      if (!activeServerId) {
        setOnlineCount(0);
        setStats({ warns: 0, kicks: 0, bans: 0 });
        setActivitySpark([]);
        setRawPoints([]);
        return;
      }

      const [{ data: snap }, { count: banCount }, { count: kickCount }, { count: warnCount }] =
        await Promise.all([
          supabase.from("players_snapshots").select("snapshot, total_players, updated_at").eq("server_id", activeServerId).maybeSingle(),
          supabase.from("bans").select("*", { count: "exact", head: true }).eq("server_id", activeServerId),
          supabase.from("kicks").select("*", { count: "exact", head: true }).eq("server_id", activeServerId),
          supabase.from("warns").select("*", { count: "exact", head: true }).eq("server_id", activeServerId),
        ]);

      const { players: snapshotPlayers } = parsePlayersSnapshot(snap ?? undefined);
      const players: SnapshotPlayer[] = snapshotPlayers as SnapshotPlayer[];
      const liveCount = effectiveLivePlayerCount(snap ?? undefined);
      
      const realStats = {
        bans: banCount ?? 0,
        kicks: kickCount ?? 0,
        warns: warnCount ?? 0,
      };

      const ips = players
        .map((p) => extractPlayerIp(p))
        .filter((ip): ip is string => !!ip);
      const geoMap = await lookupIpsGeo(ips);

      const points: GlobePlayerPoint[] = [];
      players.forEach((p) => {
        const ip = extractPlayerIp(p);
        if (!ip) return;
        const geo = geoMap[ip];
        if (!geo) return;
        points.push({
          lat: geo.lat,
          lng: geo.lng,
          name: playerName(p),
          country: geo.country,
          color: "#38bdf8",
          size: 0.4,
        });
      });

      setOnlineCount(liveCount || points.length);
      setStats(realStats);
      setRawPoints(points);
      if (players.length > 0) {
        setActivitySpark(
          Array.from({ length: 16 }, (_, i) => ({
            i,
            v: Math.max(1, Math.round((players.length || 1) * (0.6 + Math.sin(i / 3) * 0.25))),
          })),
        );
      } else {
        setActivitySpark([]);
      }
    } catch {
      setOnlineCount(0);
      setStats({ warns: 0, kicks: 0, bans: 0 });
      setActivitySpark([]);
      setRawPoints([]);
    } finally {
      setLoading(false);
    }
  }, [isDemo, activeServerId]);

  useEffect(() => {
    load();
    if (isDemo) return;
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
  }, [load, isDemo]);

  const [selectedPoint, setSelectedPoint] = useState<GlobePlayerPoint | null>(null);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 bg-[#0F1017] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.02),transparent_55%)] -z-10" />
      <FallingPapers />

      <div className="relative z-10 flex h-full min-h-0 gap-3.5 overflow-hidden">
        <Card className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0F1017] shadow-2xl">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs font-semibold text-zinc-500">Loading map…</div>
          ) : (
            <>
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-zinc-500">
                    Loading real map…
                  </div>
                }
              >
                <PlayerGlobe
                  ref={globeRef}
                  points={isDemo ? DEMO_POINTS : rawPoints}
                  selectedPoint={selectedPoint}
                  className="h-full w-full"
                />
              </Suspense>
            </>
          )}

          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-xl border-white/10 bg-[#141414] hover:bg-[#1a1a1e] text-zinc-300 hover:text-white font-bold text-xs px-3.5 backdrop-blur-md"
              onClick={() => load()}
              disabled={loading}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </Card>

        <AnalyticsStatsPanel
          onlineCount={onlineCount}
          activitySpark={activitySpark}
          countryBreakdown={countryBreakdown}
          stats={stats}
          rawPoints={isDemo ? DEMO_POINTS : rawPoints}
          selectedPoint={selectedPoint}
          onSelectPlayer={(p) => setSelectedPoint(p)}
        />
      </div>
    </div>
  );
}
