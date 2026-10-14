import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Monitor, Shield, User, Car, Bike  } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiscordImage } from "@/components/DiscordImage";
import { LoadingPanel } from "@/components/ui/loading-spinner";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { ServerPlayerDetailModal } from "@/components/ServerPlayerDetailModal";
import { discordIdFromPlayerRecord, resolveDiscordSnowflake } from "@/lib/discord-avatar";
import { useDiscordAvatarsBatch } from "@/hooks/useDiscordAvatarsBatch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlayerMapPreview } from "@/components/PlayerMapPreview";
import { PlayerKickBanDialog } from "@/components/PlayerKickBanDialog";
import { parsePlayersSnapshot } from "@/lib/players-snapshot";
import { aircoreSurface } from "@/lib/aircore-design-system";

interface Player {
  name: string;
  id: string;
  license: string;
  ip?: string;
  ping?: number;
  threatScore?: number;
  inVehicle?: boolean;
  onBike?: boolean;
  coords?: { x: number; y: number; z: number };
  identifiers?: string[];
  discordId?: string | null;
  rawData?: Record<string, unknown>;
}

type LookupRiskResult = {
  reputationPct: number;
  riskPct: number;
  label: string;
  serverBans: number;
  botBans: number;
  blacklisted: boolean;
  discoveredDiscordId?: string | null;
};

type LookupServerBan = {
  is_active?: boolean | number | string | null;
};

const LOOKUP_RISK_CACHE_MS = 120_000;
const LOOKUP_RISK_BATCH_SIZE = 4;

function PlayerActivityIcon({ player }: { player: Player }) {
  if (player.inVehicle) return <Car className="w-4 h-4 shrink-0 text-slate-400" aria-hidden />;
  if (player.onBike) return <Bike className="w-4 h-4 shrink-0 text-slate-400" aria-hidden />;
  return <User className="w-4 h-4 shrink-0 text-slate-400" aria-hidden />;
}

function computeLookupReputation(isBlacklisted: boolean, serverBans: number, botBans: number): {
  pct: number;
  label: string;
} {
  let score = 100;
  if (isBlacklisted) score -= 55;
  score -= Math.min(35, serverBans * 7);
  score -= Math.min(25, botBans * 8);
  if ((serverBans > 0 || botBans > 0) && score >= 80) score = 79;
  score = Math.max(5, Math.min(100, score));
  if (score >= 80) return { pct: score, label: "Clean" };
  if (score >= 50) return { pct: score, label: "Low risk" };
  if (score >= 25) return { pct: score, label: "High risk" };
  return { pct: score, label: "Critical risk" };
}

function isLookupServerBanActive(ban: LookupServerBan): boolean {
  const value = ban.is_active;
  return value !== false && value !== 0 && value !== "0";
}

function lookupQueryForPlayer(player: Player): string | null {
  if (player.discordId) return `discord:${player.discordId}`;
  if (player.license) return player.license;
  if (player.id && player.id !== "0") return player.id;
  return player.name || null;
}

function riskMetaFromLookupRisk(score: LookupRiskResult | undefined, fallbackThreatScore?: number): {
  riskPct: number;
  label: string;
  className: string;
  dotClassName: string;
} {
  const riskPct =
    score
      ? score.riskPct
      : typeof fallbackThreatScore === "number"
        ? Math.max(0, Math.min(100, Math.round(fallbackThreatScore)))
        : 0;
  const reputationPct = score
    ? score.reputationPct
    : typeof fallbackThreatScore === "number"
      ? 100 - riskPct
      : 100;

  if (reputationPct >= 80) {
    return {
      riskPct,
      label: "Clean",
      className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
      dotClassName: "bg-emerald-400",
    };
  }
  if (reputationPct >= 50) {
    return {
      riskPct,
      label: "Low risk",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
      dotClassName: "bg-amber-400",
    };
  }
  if (reputationPct >= 25) {
    return {
      riskPct,
      label: "High risk",
      className: "border-orange-400/35 bg-orange-500/10 text-orange-300",
      dotClassName: "bg-orange-400",
    };
  }
  return {
    riskPct,
    label: "Critical risk",
    className: "border-red-400/40 bg-red-500/10 text-red-300",
    dotClassName: "bg-red-400",
  };
}

function PlayerRiskBadge({
  lookupRisk,
  fallbackThreatScore,
}: {
  lookupRisk?: LookupRiskResult;
  fallbackThreatScore?: number;
}) {
  const meta = riskMetaFromLookupRisk(lookupRisk, fallbackThreatScore);

  const title =
    lookupRisk
      ? `${meta.label}: lookup risk ${meta.riskPct}% (${lookupRisk.serverBans} server bans, ${lookupRisk.botBans} bot bans)`
      : typeof fallbackThreatScore === "number"
        ? `${meta.label}: risk ${meta.riskPct}%`
        : "Lookup risk loading";

  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[10px] font-black tabular-nums",
        meta.className,
      )}
      aria-label={title}
    >
      <Shield className="h-3.5 w-3.5" aria-hidden />
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClassName)} aria-hidden />
      <span>{meta.riskPct}</span>
    </span>
  );
}

function SignalBars({ ping }: { ping?: number }) {
  const level =
    ping == null ? 3 : ping < 55 ? 4 : ping < 95 ? 3 : ping < 140 ? 2 : 1;
  const heights = ["h-[35%]", "h-[55%]", "h-[75%]", "h-full"];
  return (
    <div className="flex items-end gap-[2px] h-3.5 w-4 shrink-0" aria-hidden>
      {heights.map((h, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-[1px]",
            h,
            i < level ? "bg-emerald-400/90" : "bg-white/15",
          )}
        />
      ))}
    </div>
  );
}

export default function ServerPlayers() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const initialLoadDone = useRef(false);
  const loadingTimedOut = useLoadingTimeout(loading, 15_000);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"kick" | "ban" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [serverCredentials, setServerCredentials] = useState<{ server_id: string; license_key: string } | null>(null);
  const [hoveredPlayer, setHoveredPlayer] = useState<Player | null>(null);
  const [hoverAnchorRect, setHoverAnchorRect] = useState<DOMRect | null>(null);
  const [lookupRisks, setLookupRisks] = useState<Record<string, LookupRiskResult>>({});
  const [discoveredDiscords, setDiscoveredDiscords] = useState<Record<string, string>>({});
  const lookupRiskCacheRef = useRef<Map<string, { expiresAt: number; value: LookupRiskResult }>>(new Map());

  const openPlayerDetails = (player: Player) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const openLiveStream = () => {
    if (!selectedPlayer || !serverId) return;
    setIsModalOpen(false);
    const params = new URLSearchParams({ player: selectedPlayer.id });
    if (selectedPlayer.name) params.set("name", selectedPlayer.name);
    navigate(`/${serverId}/live-view?${params.toString()}`);
  };

  const handleAction = async (type: "kick" | "ban", reason: string) => {
    if (!selectedPlayer || !serverCredentials) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("server-command", {
        body: {
          server_id: serverCredentials.server_id,
          license_key: serverCredentials.license_key,
          command_type: type,
          command_data: {
            player_id: selectedPlayer.id,
            player_name: selectedPlayer.name,
            license: type === "ban" ? selectedPlayer.license || undefined : undefined,
            reason,
          },
        },
      });

      if (error) throw error;

      if (data && data.success) {
        toast.success(`Player ${type === "kick" ? "kicked" : "banned"} successfully`);
        setIsModalOpen(false);
        setActionType(null);
      } else {
        toast.error(`Failed to ${type} player: ${(data && data.error) || "Unknown error"}`);
      }
    } catch (error) {
      console.error(`Error ${type}ing player:`, error);
      toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = () => {
      const connected = sessionStorage.getItem('connected_server');
      let serverData: any = null;
      if (connected) {
        try {
          serverData = JSON.parse(connected);
        } catch {
          serverData = null;
        }
      }

      if (serverData && serverData.server_id === serverId) {
        setServerCredentials(serverData);
        return true;
      }

      if (serverId) {
        setServerCredentials({ server_id: serverId, license_key: serverData?.license_key || "" });
        return true;
      }

      toast.error("Please connect to a server first");
      navigate('/');
      return false;
    };

    const loadPlayers = async () => {
      if (!checkAuth()) {
        setLoading(false);
        return;
      }

      if (!initialLoadDone.current) setLoading(true);

      try {
        const { data, error } = await supabase
          .from("players_snapshots")
          .select("snapshot, total_players, updated_at")
          .eq("server_id", serverId)
          .maybeSingle();

        if (error) throw error;

        const { players: snapshotData } = parsePlayersSnapshot(data ?? undefined);

        setPlayers(
          snapshotData.map((player: Record<string, unknown>) => {
            const mapped: Player = {
              name: String(player.player_name || player.name || "Unknown"),
              id: String(player.player_id || player.id || "0"),
              license:
                String(player.license || "") ||
                (Array.isArray(player.identifiers)
                  ? (player.identifiers as string[]).find((id) => id.startsWith("license:")) || ""
                  : ""),
              ip:
                String(player.ip || "") ||
                (Array.isArray(player.identifiers)
                  ? (player.identifiers as string[]).find((id) => id.startsWith("ip:")) || ""
                  : ""),
              ping:
                typeof player.ping === "number"
                  ? player.ping
                  : typeof player.Ping === "number"
                    ? player.Ping
                    : undefined,
              threatScore:
                typeof player.threat_score === "number"
                  ? player.threat_score
                  : typeof player.threatScore === "number"
                    ? player.threatScore
                    : undefined,
              inVehicle: Boolean(player.in_vehicle ?? player.inVehicle),
              onBike: Boolean(player.on_bike ?? player.onBike),
              coords: (player.coords || player.position) as Player["coords"],
              identifiers: Array.isArray(player.identifiers) ? (player.identifiers as string[]) : [],
              rawData: player,
            };
            mapped.discordId = discordIdFromPlayerRecord(
              { ...player, license: mapped.license } as Record<
                string,
                unknown
              >,
            );
            return mapped;
          }),
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Error loading players:", error);
        if (!initialLoadDone.current) {
          setPlayers([]);
        }
      } finally {
        initialLoadDone.current = true;
        setLoading(false);
      }
    };

    void loadPlayers();
    const poll = window.setInterval(() => void loadPlayers(), 8000);

    const channel = supabase
      .channel("server-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players_snapshots", filter: `server_id=eq.${serverId}` },
        () => {
          void loadPlayers();
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [serverId, navigate, reloadTick]);

  const filteredPlayers = players.filter(player =>
    (player.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.license.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const effectivePlayers = players.map(p => ({
    ...p,
    discordId: p.discordId || discoveredDiscords[p.id] || null
  }));

  const { avatars: discordAvatars } = useDiscordAvatarsBatch(effectivePlayers.map((p) => p.discordId));

  const playersKey = players.map((p) => `${p.id}:${p.discordId || ""}`).sort().join(",");

  useEffect(() => {
    if (players.length === 0) {
      setLookupRisks({});
      return;
    }

    let cancelled = false;
    const abort = new AbortController();

    const loadLookupRisks = async () => {
      const now = Date.now();
      const nextRisks: Record<string, LookupRiskResult> = {};
      const cachedDiscordByPlayerId: Record<string, string> = {};
      const missing: Player[] = [];

      for (const player of players) {
        const key = String(player.id || "").trim();
        if (!key) continue;
        const query = lookupQueryForPlayer(player);
        const cacheKey = query ? `${key}:${query}` : key;
        const cached = lookupRiskCacheRef.current.get(cacheKey);
        if (cached && cached.expiresAt > now) {
          nextRisks[key] = cached.value;
          if (!player.discordId && cached.value.discoveredDiscordId) {
            cachedDiscordByPlayerId[key] = cached.value.discoveredDiscordId;
          }
        } else {
          missing.push(player);
        }
      }

      if (Object.keys(nextRisks).length && !cancelled) {
        setLookupRisks((prev) => ({ ...prev, ...nextRisks }));
      }
      if (Object.keys(cachedDiscordByPlayerId).length && !cancelled) {
        setDiscoveredDiscords((prev) => ({ ...prev, ...cachedDiscordByPlayerId }));
      }

      const desktopToken = typeof localStorage !== "undefined" ? localStorage.getItem("sb-aircore-token") : null;
      const headers: Record<string, string> = { Accept: "application/json", "X-AirCore-Client": "1" };
      if (desktopToken) headers.Authorization = `Bearer ${desktopToken}`;

      const BATCH_SIZE = 2;

      for (let i = 0; i < missing.length && !cancelled; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (player) => {
            const query = lookupQueryForPlayer(player);
            if (!query) return null;

            let lookup: any = null;
            let serverBansJson: any = null;

            try {
              const [lookupRes, serverBansRes] = await Promise.all([
                fetch(`/api/public/lookup/enrich?q=${encodeURIComponent(query)}&core=1`, {
                  credentials: "same-origin",
                  cache: "no-store",
                  signal: abort.signal,
                  headers,
                }),
                fetch(`/api/public/lookup/server-bans?q=${encodeURIComponent(query)}`, {
                  credentials: "same-origin",
                  cache: "no-store",
                  signal: abort.signal,
                  headers,
                }),
              ]);

              if (lookupRes.ok) lookup = await lookupRes.json().catch(() => null);
              if (serverBansRes.ok) serverBansJson = await serverBansRes.json().catch(() => null);
            } catch (_) {
              /* ignore network / cancellation errors */
            }

            const activeServerBans = ((serverBansJson?.server_bans || []) as LookupServerBan[]).filter(
              isLookupServerBanActive,
            );
            const botBans = Array.isArray(lookup?.bot_bans) ? lookup.bot_bans.length : lookup?.bot_entry ? 1 : 0;
            const blacklisted = Boolean(lookup?.is_blacklisted || lookup?.blacklisted);
            const reputation = computeLookupReputation(blacklisted, activeServerBans.length, botBans);
            const discoveredDiscordId =
              resolveDiscordSnowflake(lookup?.discord?.discord_id) ||
              resolveDiscordSnowflake(lookup?.profile?.discord_id) ||
              resolveDiscordSnowflake(lookup?.blacklisted?.discord_id);
            return {
              playerId: player.id,
              cacheKey: `${player.id}:${query}`,
              discoveredDiscordId,
              value: {
                reputationPct: reputation.pct,
                riskPct: 100 - reputation.pct,
                label: reputation.label,
                serverBans: activeServerBans.length,
                botBans,
                blacklisted,
                discoveredDiscordId,
              },
            };
          }),
        );

        const batchRisks: Record<string, LookupRiskResult> = {};
        const discoveredDiscordByPlayerId: Record<string, string> = {};
        for (const result of results) {
          if (result.status !== "fulfilled" || !result.value) continue;
          batchRisks[result.value.playerId] = result.value.value;
          if (result.value.discoveredDiscordId) {
            discoveredDiscordByPlayerId[result.value.playerId] = result.value.discoveredDiscordId;
          }
          lookupRiskCacheRef.current.set(result.value.cacheKey, {
            expiresAt: Date.now() + LOOKUP_RISK_CACHE_MS,
            value: result.value.value,
          });
        }
        if (Object.keys(batchRisks).length && !cancelled) {
          setLookupRisks((prev) => ({ ...prev, ...batchRisks }));
        }
        if (Object.keys(discoveredDiscordByPlayerId).length && !cancelled) {
          setDiscoveredDiscords((prev) => ({ ...prev, ...discoveredDiscordByPlayerId }));
        }

        if (i + BATCH_SIZE < missing.length && !cancelled) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    };

    void loadLookupRisks();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [playersKey]);

  return (
    <div className="relative min-h-full w-full p-4 md:p-6 bg-[#0F1017] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.02),transparent_55%)] -z-10" />
      <div className="w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search players by name, ID, or license..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-white/10 bg-[#050505] pl-10 text-xs text-white placeholder:text-zinc-500 rounded-xl focus-visible:ring-1 focus-visible:ring-white/20"
            />
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white rounded-full"
          >
            {players.length} Players online
          </Badge>
        </div>

        {loading ? (
          <LoadingPanel
            label="Loading players…"
            timedOut={loadingTimedOut}
            onRetry={() => {
              initialLoadDone.current = false;
              setLoading(true);
              setReloadTick((t) => t + 1);
            }}
          />
        ) : (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredPlayers.map((player) => (
              <button
                key={`${player.id}-${player.license}`}
                type="button"
                className="group flex w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[#181B26] px-3 py-2.5 text-left transition-all hover:border-white/25 hover:bg-white/[0.04]"
                onClick={() => openPlayerDetails(player)}
                onMouseEnter={(e) => {
                  setHoveredPlayer(player);
                  setHoverAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                }}
                onMouseMove={(e) => {
                  setHoverAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                }}
                onMouseLeave={() => {
                  setHoveredPlayer(null);
                  setHoverAnchorRect(null);
                }}
              >
                <PlayerActivityIcon player={player} />

                <span className="shrink-0 text-[11px] font-mono text-zinc-500">[{player.id}]</span>

                <span className="min-w-0 flex-1 truncate text-xs font-bold text-white group-hover:text-zinc-200">
                  {player.name || "Unknown"}
                </span>

                <div
                  className="shrink-0 h-6 w-6 overflow-hidden rounded-full ring-1 ring-white/20 bg-white/10"
                  title={player.discordId ? `Discord ${player.discordId}` : "Discord"}
                >
                  <DiscordImage
                    discordId={player.discordId}
                    avatarDataUrl={
                      player.discordId ? discordAvatars[player.discordId]?.avatar_data_url : null
                    }
                    size={64}
                    alt={player.name}
                    className="h-full w-full rounded-full"
                    fallbackClassName="rounded-full h-full w-full"
                  />
                </div>

                <Monitor
                  className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-white transition-colors"
                  aria-hidden
                />

                <PlayerRiskBadge lookupRisk={lookupRisks[player.id]} fallbackThreatScore={player.threatScore} />

                <SignalBars ping={player.ping} />
              </button>
            ))}
          </div>
        )}

        <PlayerMapPreview
          open={!!hoveredPlayer}
          player={
            hoveredPlayer
              ? {
                id: hoveredPlayer.id,
                name: hoveredPlayer.name,
                coords: hoveredPlayer.coords,
              }
              : null
          }
          anchorRect={hoverAnchorRect}
        />

        <ServerPlayerDetailModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          serverId={serverId}
          player={selectedPlayer}
          discordAvatars={discordAvatars}
          onKick={() => setActionType("kick")}
          onBan={() => setActionType("ban")}
          onSpectate={openLiveStream}
        />

        <PlayerKickBanDialog
          open={actionType !== null && !!selectedPlayer}
          onOpenChange={(open) => {
            if (!open && !actionLoading) setActionType(null);
          }}
          action={actionType}
          playerName={selectedPlayer?.name ?? ""}
          loading={actionLoading}
          onConfirm={(reason) => actionType && void handleAction(actionType, reason)}
        />

        {!loading && filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No players found matching your search.' : 'No players online.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
