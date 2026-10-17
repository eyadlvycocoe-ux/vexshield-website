import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, X, Ban, UserX, AlertTriangle,
  Settings, ChevronUp, ChevronDown, Filter, ThermometerSun, Shield, Orbit,
 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { useIsDemoMode } from "@/demo/demoMode";
import { makeMapDemoPlayers } from "@/demo/demoData";
import { parsePlayersSnapshot } from "@/lib/players-snapshot";

type MapStyleId = "atlas" | "satellite" | "grid";
type MapMode = "2d" | "3d";

type PlayerFilterType =
  | "none"
  | "recently-connected"
  | "low-playtime"
  | "potential-threat"
  | "admins";

interface Player {
  id: string;
  name: string;
  serverId?: string;
  coords?: { x: number; y: number; z: number };
  world?: { x: number; y: number; z: number };
  status: string;
  identifiers?: string[];
  admin?: boolean;
  inVehicle?: boolean;
  threatScore?: number;
  timeOnline?: number;
  playTime?: number;
}

const MAP_STYLE_KEY = "aircore-map-style";
const HEATMAP_KEY = "aircore-map-heatmap";

const MAP_STYLE_BACKGROUNDS: Record<MapStyleId, string> = {
  atlas: "#0CA9D2",
  satellite: "#153E6A",
  grid: "#8F9190",
};

const MAP_SWITCH_OFF = "data-[state=unchecked]:bg-zinc-600";

const MAP_PANEL =
  "gap-0 overflow-hidden rounded-2xl border border-white/[0.08] hover:border-blue-500/30 bg-[#0a0a0a]/95 shadow-2xl backdrop-blur-md transition-all";
const MAP_PANEL_HEADER = "p-4";
const MAP_PANEL_TITLE = "text-sm font-bold leading-none text-white";
const MAP_PANEL_BADGE = "rounded-md border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-400";
const MAP_PLAYER_BADGE =
  "shrink-0 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-300";

const MAP_ASSET_VERSION = "20260530";

function loadStorage<T extends string>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    if (raw.startsWith('"')) return JSON.parse(raw) as T;
    return raw as T;
  } catch {
    return fallback;
  }
}

export default function Map() {
  const { serverId } = useParams();
  const isDemo = useIsDemoMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionReason, setActionReason] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframe3dRef = useRef<HTMLIFrameElement>(null);
  const [map3dReady, setMap3dReady] = useState(false);

  const [mapStyle, setMapStyle] = useState<MapStyleId>(() =>
    loadStorage<MapStyleId>(MAP_STYLE_KEY, "atlas"),
  );
  const [heatmapEnabled, setHeatmapEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(HEATMAP_KEY);
      return raw ? JSON.parse(raw) === true : false;
    } catch {
      return false;
    }
  });
  const [controlsOpen, setControlsOpen] = useState(true);
  const [playersPanelOpen, setPlayersPanelOpen] = useState(true);
  const [playerFilterType, setPlayerFilterType] = useState<PlayerFilterType>("none");
  const [mapMode, setMapMode] = useState<MapMode>("2d");

  const initialMapStyle = useRef(mapStyle).current;

  const postToMap = useCallback((payload: Record<string, unknown>) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(payload, "*");
      iframe3dRef.current?.contentWindow?.postMessage(payload, "*");
    } catch {}
  }, []);

  const syncMapSettings = useCallback(() => {
    postToMap({ type: "setMapStyle", style: mapStyle });
    postToMap({ type: "setHeatmap", enabled: heatmapEnabled });
  }, [heatmapEnabled, mapStyle, postToMap]);

  useEffect(() => {
    try {
      localStorage.setItem(MAP_STYLE_KEY, JSON.stringify(mapStyle));
    } catch {}
    postToMap({ type: "setMapStyle", style: mapStyle });
  }, [mapStyle, postToMap]);

  useEffect(() => {
    try {
      localStorage.setItem(HEATMAP_KEY, JSON.stringify(heatmapEnabled));
    } catch {}
    postToMap({ type: "setHeatmap", enabled: heatmapEnabled });
  }, [heatmapEnabled, postToMap]);

  const fetchPlayers = useCallback(async () => {
    if (isDemo) {
      const mapped: Player[] = makeMapDemoPlayers(256).map((p) => ({
        id: p.id,
        name: p.name,
        serverId: "demo",
        coords: p.coords,
        world: p.coords,
        status: "online",
        identifiers: p.identifiers,
        admin: !!p.admin,
        inVehicle: !!p.inVehicle,
        threatScore: p.threatScore,
        timeOnline: (p.sessionMinutes ?? 0) * 60,
        playTime: p.playtimeMinutes ?? 0,
      }));
      setPlayers(mapped);
      setLoading(false);
      return;
    }

    try {
      const connectedServerStr = sessionStorage.getItem("connected_server");
      let connectedServer: { server_id?: string; license_key?: string } | null = null;
      if (connectedServerStr) {
        try {
          connectedServer = JSON.parse(connectedServerStr);
        } catch {
          connectedServer = null;
        }
      }
      const serverIdCtx = serverId || connectedServer?.server_id;
      if (!serverIdCtx) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      const { data: snapshotData, error } = await supabase
        .from("players_snapshots")
        .select("server_id, snapshot, total_players, updated_at")
        .eq("server_id", serverIdCtx)
        .maybeSingle();

      if (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.warn("Could not refresh map players snapshot:", error);
        return;
      }

      const { players: snapshot } = parsePlayersSnapshot(snapshotData ?? undefined);
      if (snapshot.length === 0) {
        setPlayers([]);
      } else {
        const mappedPlayers: Player[] = snapshot
          .map((player: Record<string, unknown>) => {
            const coords =
              (player.coords as { x?: number; y?: number; z?: number }) ||
              (player.position as { x?: number; y?: number; z?: number }) ||
              { x: 0, y: 0, z: 0 };
            let rawX = 0;
            let rawY = 0;
            let rawZ = 0;
            if (typeof coords.x !== "undefined") {
              rawX = Number(coords.x);
              rawY = Number(coords.y);
              rawZ = Number(coords.z);
            } else if (Array.isArray(coords)) {
              [rawX, rawY, rawZ] = coords.map(Number);
            }
            return {
              id: String(player.player_id || player.id || "0"),
              name: String(player.player_name || player.name || "Unknown"),
              serverId: snapshotData?.server_id ?? serverIdCtx ?? "",
              coords: { x: rawX, y: rawY, z: rawZ },
              world: { x: rawX, y: rawY, z: rawZ },
              status: "online",
              identifiers: (player.identifiers as string[]) || [],
              admin: Boolean(player.admin),
              inVehicle: Boolean(player.inVehicle ?? player.in_vehicle),
              threatScore: Number(player.threatScore ?? player.threat_score ?? 0),
              timeOnline: Number(player.timeOnline ?? player.time_online ?? 0),
              playTime: Number(player.playTime ?? player.play_time ?? 0),
            };
          })
          .filter((pl) => pl.id !== "" && pl.coords && Number.isFinite(pl.coords.x));
        setPlayers(mappedPlayers);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
      toast.error("Error fetching players");
    } finally {
      setLoading(false);
    }
  }, [serverId, isDemo]);

  useEffect(() => {
    fetchPlayers();
    if (!autoRefresh) return;

    const poll = window.setInterval(fetchPlayers, 8000);

    const connected = sessionStorage.getItem("connected_server");
    let serverIdCtx = serverId;
    if (connected) {
      try {
        serverIdCtx = JSON.parse(connected).server_id ?? serverId;
      } catch {
        /* ignore */
      }
    }

    const channel =
      serverIdCtx && !isDemo
        ? supabase
          .channel("server-changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "players_snapshots",
              filter: `server_id=eq.${serverIdCtx}`,
            },
            () => {
              void fetchPlayers();
            },
          )
          .subscribe()
        : null;

    return () => {
      window.clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchPlayers, autoRefresh, serverId, isDemo]);

  useEffect(() => {
    localStorage.setItem(MAP_STYLE_KEY, mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    localStorage.setItem(HEATMAP_KEY, JSON.stringify(heatmapEnabled));
  }, [heatmapEnabled]);

  const filteredPlayers = useMemo(() => {
    let list = players;

    if (playerFilterType === "recently-connected") {
      list = list.filter((p) => (p.timeOnline ?? 99999) < 3600);
    } else if (playerFilterType === "low-playtime") {
      list = list.filter((p) => (p.playTime ?? 99999) < 60);
    } else if (playerFilterType === "potential-threat") {
      list = list.filter((p) => (p.threatScore ?? 0) >= 60);
    } else if (playerFilterType === "admins") {
      list = list.filter((p) => !!p.admin);
    }

    const raw = searchQuery.trim();
    if (raw) {
      if (/^\d+$/.test(raw)) {
        list = list.filter((p) => p.id === raw);
      } else {
        const q = raw.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q),
        );
      }
    }

    return [...list].sort((a, b) => Number(a.id) - Number(b.id));
  }, [players, searchQuery, playerFilterType]);

  const mapPlayersPayload = useMemo(
    () =>
      filteredPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        x: p.coords?.x ?? 0,
        y: p.coords?.y ?? 0,
        admin: p.admin || false,
        inVehicle: p.inVehicle || false,
        threatScore: p.threatScore || 0,
      })),
    [filteredPlayers],
  );

  useEffect(() => {
    postToMap({ type: "updatePlayers", players: mapPlayersPayload });
  }, [mapPlayersPayload, postToMap]);

  useEffect(() => {
    postToMap({ type: "setMapStyle", style: mapStyle });
  }, [mapStyle, postToMap]);

  useEffect(() => {
    postToMap({ type: "setHeatmap", enabled: heatmapEnabled });
  }, [heatmapEnabled, postToMap]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "playerSelected") {
        const p = players.find((pl) => pl.id === e.data.player?.id);
        if (p) setSelectedPlayer(p);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [players]);

  const toggleFilterType = (type: PlayerFilterType) => {
    setPlayerFilterType((prev) => (prev === type ? "none" : type));
  };

  const focusPlayer = (p: Player) => {
    setSelectedPlayer(p);
    if (p.coords) {
      postToMap({
        type: "focusPlayer",
        player: { id: p.id, name: p.name, x: p.coords.x, y: p.coords.y },
      });
    }
  };

  const executeCommand = async (player: Player, commandType: string, reason: string) => {
    if (isDemo) {
      const label = commandType.charAt(0).toUpperCase() + commandType.slice(1);
      toast.success(`[Demo] ${label}ed ${player.name}`);
      setSelectedPlayer(null);
      return;
    }
    try {
      const connectedServerStr = sessionStorage.getItem("connected_server");
      let connectedServer: { server_id?: string; license_key?: string } | null = null;
      if (connectedServerStr) {
        try {
          connectedServer = JSON.parse(connectedServerStr);
        } catch {
          connectedServer = null;
        }
      }
      const serverIdCtx = connectedServer?.server_id ?? player.serverId;
      const licenseKeyCtx = connectedServer?.license_key;
      const commandData: Record<string, unknown> = {
        player_id: player.id,
        player_name: player.name,
        reason,
      };
      if (commandType === "ban") {
        commandData.license = (player.identifiers || []).find(
          (id) => typeof id === "string" && id.startsWith("license:"),
        );
      }
      const { error } = await supabase.functions.invoke("server-command", {
        body: {
          server_id: serverIdCtx,
          license_key: licenseKeyCtx,
          command_type: commandType,
          command_data: commandData,
        },
      });
      if (error) throw error;
      const label = commandType.charAt(0).toUpperCase() + commandType.slice(1);
      toast.success(`${label}ed ${player.name}`);
      setSelectedPlayer(null);
    } catch {
      toast.error(`Failed to ${commandType} player`);
    }
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "mapReady") {
        setMap3dReady(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (mapMode === "3d" && map3dReady) {
      postToMap({ type: "updatePlayers", players: mapPlayersPayload });
    }
  }, [mapMode, map3dReady, postToMap, mapPlayersPayload]);

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col p-4">
        <div
          className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 shadow-2xl"
          style={{ backgroundColor: mapMode === "3d" ? "#1a6b8a" : MAP_STYLE_BACKGROUNDS[mapStyle] }}
        >
          <iframe
            ref={iframeRef}
            src={`/map/index.html?embed=1&style=${initialMapStyle}&v=${MAP_ASSET_VERSION}`}
            title="2D Map"
            className="absolute inset-0 h-full w-full border-0"
            style={{ display: mapMode === "2d" ? "block" : "none" }}
            onLoad={() => {
              syncMapSettings();
              postToMap({ type: "updatePlayers", players: mapPlayersPayload });
            }}
          />
          <iframe
            ref={iframe3dRef}
            src="/3dmap/index.html"
            title="3D Map"
            className="absolute inset-0 h-full w-full border-0"
            style={{ display: mapMode === "3d" ? "block" : "none" }}
            onLoad={() => {
              postToMap({ type: "updatePlayers", players: mapPlayersPayload });
            }}
          />

          {/* Map Controls — WaveShield style */}
          <div className="absolute left-4 top-4 z-[1000] w-80">
            <Card className={MAP_PANEL}>
              <CardHeader className={`${MAP_PANEL_HEADER} ${controlsOpen ? "pb-3" : "pb-4"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-white" />
                    <CardTitle className={MAP_PANEL_TITLE}>Map Controls</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-white hover:bg-white/20"
                    onClick={() => setControlsOpen((v) => !v)}
                  >
                    {controlsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>

              {controlsOpen && (
                <CardContent className="space-y-4 px-4 pb-4 pt-0">
                  {/* Map Mode Toggle */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-white/80">Map Mode</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMapMode("2d")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${mapMode === "2d"
                            ? "bg-white/20 text-white shadow-sm"
                            : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                          }`}
                      >
                        2D
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapMode("3d")}
                        className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${mapMode === "3d"
                            ? "bg-white/20 text-white shadow-sm"
                            : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                          }`}
                      >
                        <Orbit className="h-3 w-3" />
                        3D
                      </button>
                    </div>
                  </div>

                  {mapMode === "2d" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/80">Map Style</label>
                        <Select value={mapStyle} onValueChange={(v) => setMapStyle(v as MapStyleId)}>
                          <SelectTrigger className="border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="atlas">Atlas</SelectItem>
                            <SelectItem value="satellite">Satellite</SelectItem>
                            <SelectItem value="grid">Grid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1 text-xs font-medium text-white/80">
                            <ThermometerSun className="h-3 w-3" />
                            Player Heatmap
                          </label>
                          <Switch
                            checked={heatmapEnabled}
                            onCheckedChange={setHeatmapEnabled}
                            className={`${MAP_SWITCH_OFF} data-[state=checked]:bg-red-500`}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <Separator className="bg-white/20" />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1 text-xs font-medium text-white/80">
                        <Filter className="h-3 w-3" />
                        Filter Players
                      </label>
                      {players.length > 0 && (
                        <Badge variant="secondary" className={MAP_PANEL_BADGE}>
                          {filteredPlayers.length}/{players.length}
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-white/20 bg-white/10 pr-8 text-white transition-colors placeholder:text-white/60 focus:bg-white/20"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 text-white/60 hover:bg-white/20 hover:text-white"
                          onClick={() => setSearchQuery("")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-medium text-white/80">Player Filters</label>

                      <FilterRow
                        label="Recently Connected"
                        hint="(<1h)"
                        checked={playerFilterType === "recently-connected"}
                        onCheckedChange={() => toggleFilterType("recently-connected")}
                        color="data-[state=checked]:bg-blue-500"
                      />
                      <FilterRow
                        label="Low Playtime"
                        hint="(<60m)"
                        checked={playerFilterType === "low-playtime"}
                        onCheckedChange={() => toggleFilterType("low-playtime")}
                        color="data-[state=checked]:bg-yellow-500"
                      />
                      <FilterRow
                        label="Potential Threats"
                        hint="(≥60)"
                        checked={playerFilterType === "potential-threat"}
                        onCheckedChange={() => toggleFilterType("potential-threat")}
                        color="data-[state=checked]:bg-red-500"
                      />
                      <FilterRow
                        label="Show Admins"
                        hint="🛡️"
                        checked={playerFilterType === "admins"}
                        onCheckedChange={() => toggleFilterType("admins")}
                        color="data-[state=checked]:bg-orange-500"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Players list — WaveShield style */}
          <div className="absolute right-4 top-4 z-[1000] w-fit min-w-[240px] max-w-80">
            <Card className={MAP_PANEL}>
              <CardHeader className={`${MAP_PANEL_HEADER} ${playersPanelOpen ? "pb-3" : "pb-4"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-white" />
                    <CardTitle className={MAP_PANEL_TITLE}>Players</CardTitle>
                    <Badge variant="secondary" className={MAP_PANEL_BADGE}>
                      {filteredPlayers.length}/{players.length}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 shrink-0 p-0 text-white hover:bg-white/20"
                    onClick={() => setPlayersPanelOpen((v) => !v)}
                  >
                    {playersPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>

              {playersPanelOpen && (
                <CardContent className="px-4 pb-4 pt-0">
                  {loading ? (
                    <div className="py-4 text-center text-xs text-white/60">Loading players…</div>
                  ) : filteredPlayers.length === 0 ? (
                    <div className="py-4 text-center text-white/60">
                      <Users className="mx-auto mb-1 h-5 w-5 opacity-50" />
                      <p className="text-xs">No players found</p>
                    </div>
                  ) : filteredPlayers.length <= 8 ? (
                    <div className="mt-3 space-y-2">
                      {filteredPlayers.map((p) => (
                        <PlayerRow key={p.id} player={p} onSelect={focusPlayer} />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <ScrollArea className="h-[40vh] w-full">
                        <div className="space-y-2 pr-3">
                          {filteredPlayers.map((p) => (
                            <PlayerRow key={p.id} player={p} onSelect={focusPlayer} />
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPlayer(null)}
        >
          <Card className="gaming-card w-full max-w-[500px] p-4 lg:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold text-wave lg:text-2xl">{selectedPlayer.name}</h2>
                <p className="truncate font-mono text-xs text-muted-foreground lg:text-sm">
                  ID: {selectedPlayer.id}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedPlayer(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="font-mono text-xs text-muted-foreground lg:text-sm">
                  <span className="font-semibold text-foreground">Position:</span>
                  <br />
                  X: {selectedPlayer.world?.x?.toFixed(2)} | Y: {selectedPlayer.world?.y?.toFixed(2)} | Z:{" "}
                  {selectedPlayer.world?.z?.toFixed(2)}
                </p>
              </div>
              {selectedPlayer.identifiers && selectedPlayer.identifiers.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">Identifiers:</p>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {selectedPlayer.identifiers.map((id, idx) => (
                      <p key={idx} className="truncate font-mono text-xs text-muted-foreground">
                        {id}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <Input
                placeholder="Enter reason for action"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="text-sm"
              />
              <div className="flex flex-col gap-2 border-t border-border pt-2 sm:flex-row">
                <Button
                  variant="destructive"
                  disabled={!actionReason.trim()}
                  onClick={() => {
                    executeCommand(selectedPlayer, "kick", actionReason.trim());
                    setActionReason("");
                  }}
                  className="flex-1 text-sm"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Kick
                </Button>
                <Button
                  variant="secondary"
                  disabled={!actionReason.trim()}
                  onClick={() => {
                    executeCommand(selectedPlayer, "warn", actionReason.trim());
                    setActionReason("");
                  }}
                  className="flex-1 text-sm"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Warn
                </Button>
                <Button
                  variant="destructive"
                  disabled={!actionReason.trim()}
                  onClick={() => {
                    executeCommand(selectedPlayer, "ban", actionReason.trim());
                    setActionReason("");
                  }}
                  className="flex-1 text-sm"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Ban
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function PlayerRow({
  player,
  onSelect,
}: {
  player: Player;
  onSelect: (player: Player) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-white/10"
    >
      <Badge variant="outline" className={MAP_PLAYER_BADGE}>
        #{player.id}
      </Badge>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{player.name}</span>
      {player.admin ? <Shield className="h-3.5 w-3.5 shrink-0 text-orange-400" /> : null}
    </button>
  );
}

function FilterRow({
  label,
  hint,
  checked,
  onCheckedChange,
  color,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: () => void;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/90">{label}</span>
        <span className="text-xs text-white/60">{hint}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className={`${MAP_SWITCH_OFF} ${color}`} />
    </div>
  );
}
