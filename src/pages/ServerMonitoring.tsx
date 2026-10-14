import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlayerKickBanDialog } from "@/components/PlayerKickBanDialog";
import { type StreamPlayer } from "@/components/PlayerStreamCard";
import { MultiStreamViewer } from "@/components/MultiStreamViewer";
import { LivePeerStreamsProvider } from "@/contexts/LivePeerStreamsContext";
import { discordIdFromPlayerRecord } from "@/lib/discord-avatar";
import { useDiscordAvatarsBatch } from "@/hooks/useDiscordAvatarsBatch";
import { useIsDemoMode } from "@/demo/demoMode";
import { makeDemoData } from "@/demo/demoData";
import { DemoLivePeerStreamsProvider } from "@/demo/DemoLivePeerStreamsProvider";
import { parsePlayersSnapshot } from "@/lib/players-snapshot";

interface RawPlayer {
  source?: string | number;
  player_id?: string;
  id?: string;
  player_name?: string;
  name?: string;
  ping?: number;
  steam?: string;
  steamId?: string;
  vehicle?: unknown;
  flags?: unknown[];
  threat_score?: number;
  playtime_minutes?: number;
  session_minutes?: number;
  just_joined?: boolean;
  is_admin?: boolean;
  license?: string;
  identifiers?: string[];
  in_vehicle?: boolean;
  inVehicle?: boolean;
  on_bike?: boolean;
  onBike?: boolean;
}

function toStreamPlayer(p: RawPlayer): StreamPlayer {
  const id = String(
    p.source !== undefined && p.source !== null && String(p.source).trim() !== ""
      ? p.source
      : p.player_id ?? p.id ?? "0"
  );
  const name = p.player_name || p.name || "Unknown";
  const ping = typeof p.ping === "number" ? p.ping : 0;
  const flagCount = Array.isArray(p.flags) ? p.flags.length : 0;
  const threatScore =
    typeof p.threat_score === "number" && p.threat_score >= 0 && p.threat_score <= 100
      ? Math.round(p.threat_score)
      : Math.min(100, 48 + flagCount * 14);

  const tags: string[] = [];
  if (p.is_admin) tags.push("Admin");
  if (p.just_joined === true || (typeof p.session_minutes === "number" && p.session_minutes < 8)) {
    tags.push("Just joined");
  }
  if (typeof p.playtime_minutes === "number" && p.playtime_minutes < 120) {
    tags.push("Low playtime");
  }
  if (threatScore >= 80 && !tags.includes("Admin")) {
    tags.push("Potential threat");
  }

  const identifiers = Array.isArray(p.identifiers) ? p.identifiers : [];
  const discordId = discordIdFromPlayerRecord({
    identifiers,
    license: typeof p.license === "string" ? p.license : "",
  } as Record<string, unknown>);

  return {
    id,
    name,
    license: typeof p.license === "string" ? p.license : "",
    ping,
    threatScore,
    tags: tags.slice(0, 3),
    flags: p.flags,
    discordId,
    inVehicle: Boolean(p.in_vehicle ?? p.inVehicle),
    onBike: Boolean(p.on_bike ?? p.onBike),
  };
}

export default function ServerMonitoring() {
  const { serverId: serverIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingLivePlayerRef = useRef<string | null>(null);
  const isDemo = useIsDemoMode();
  const serverId = useMemo(() => {
    if (serverIdParam) return serverIdParam;
    try {
      const raw = sessionStorage.getItem("connected_server");
      if (raw) {
        const cs = JSON.parse(raw) as { server_id?: string };
        if (typeof cs?.server_id === "string" && cs.server_id) return cs.server_id;
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }, [serverIdParam]);
  const [players, setPlayers] = useState<StreamPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [moderationAction, setModerationAction] = useState<{
    type: "kick" | "ban";
    player: StreamPlayer;
  } | null>(null);

  const requestModeration = useCallback((player: StreamPlayer, type: "kick" | "ban") => {
    setModerationAction({ type, player });
  }, []);

  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchInFlightRef = useRef(false);

  const fetchPlayers = useCallback(async (opts?: { silent?: boolean }) => {
    if (isDemo) {
      const demo = makeDemoData();
      setPlayers(
        demo.players.map((p) => ({
          id: p.id,
          name: p.name,
          license: p.identifiers.find((x) => x.startsWith("license:")) || "",
          ping: p.ping,
          threatScore: p.threatScore,
          tags: p.tags,
          flags: p.threatScore >= 80 ? ["threat_score_high"] : [],
          discordId: discordIdFromPlayerRecord({
            identifiers: p.identifiers,
          } as Record<string, unknown>),
          inVehicle: p.inVehicle,
          onBike: false,
        })),
      );
      setLoading(false);
      return;
    }
    if (!serverId) {
      setLoading(false);
      return;
    }
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    try {
      const { data: snapshotData, error } = await supabase
        .from("players_snapshots")
        .select("snapshot, total_players, updated_at")
        .eq("server_id", serverId)
        .maybeSingle();

      if (error) throw error;

      const { players: snapshot } = parsePlayersSnapshot(snapshotData ?? undefined);
      setPlayers(snapshot.map((row: RawPlayer) => toStreamPlayer(row)));
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      const status = e && typeof e === "object" && "status" in e ? Number((e as { status?: number }).status) : 0;
      if (!opts?.silent && status !== 502 && status !== 503 && status !== 504) {
        toast.error("Failed to load players");
      }
      if (!opts?.silent) {
        console.error("Error loading players:", e);
      }
    } finally {
      fetchInFlightRef.current = false;
      setLoading(false);
    }
  }, [serverId, isDemo]);

  const scheduleFetchPlayers = useCallback(
    (delayMs = 400) => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      fetchDebounceRef.current = setTimeout(() => {
        fetchDebounceRef.current = null;
        void fetchPlayers({ silent: true });
      }, delayMs);
    },
    [fetchPlayers],
  );

  useEffect(() => {
    void fetchPlayers();
    if (!isDemo) {
      const poll = window.setInterval(() => scheduleFetchPlayers(0), 15000);

      const channel = supabase
        .channel('server-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players_snapshots', filter: `server_id=eq.${serverId}` }, () => {
          scheduleFetchPlayers(600);
        })
        .subscribe();

      return () => {
        window.clearInterval(poll);
        if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
        supabase.removeChannel(channel);
      };
    }
  }, [fetchPlayers, scheduleFetchPlayers, isDemo, serverId]);

  const sendPlayerAction = useCallback(
    async (player: StreamPlayer, action: "kick" | "ban", reason: string) => {
      if (isDemo) {
        const key = `${action}-${player.id}`;
        setActionLoading(key);
        window.setTimeout(() => {
          toast.success(`[Demo] ${action === "kick" ? "Kicked" : "Banned"} ${player.name}`);
          setActionLoading(null);
        }, 450);
        return;
      }
      if (!serverId) return;
      const key = `${action}-${player.id}`;
      setActionLoading(key);
      try {
        let licenseKey = "";
        try {
          const raw = sessionStorage.getItem("connected_server");
          if (raw) {
            const cs = JSON.parse(raw) as { license_key?: string };
            licenseKey = cs?.license_key ?? "";
          }
        } catch { /* ignore */ }

        await (supabase as any).functions.invoke("server-command", {
          body: {
            server_id: serverId,
            license_key: licenseKey,
            command_type: action,
            command_data: {
              player_id: player.id,
              player_name: player.name,
              reason,
              ...(action === "ban" && player.license ? { license: player.license } : {}),
            },
          },
        });
        toast.success(`${action === "kick" ? "Kicked" : "Banned"} ${player.name}`);
        setModerationAction(null);
      } catch (e) {
        console.error(e);
        toast.error(`Failed to ${action} ${player.name}`);
      } finally {
        setActionLoading(null);
      }
    },
    [serverId, isDemo],
  );

  const confirmModeration = useCallback(
    (reason: string) => {
      if (!moderationAction) return;
      void sendPlayerAction(moderationAction.player, moderationAction.type, reason);
    },
    [moderationAction, sendPlayerAction],
  );

  const { avatars: discordAvatars } = useDiscordAvatarsBatch(players.map((p) => p.discordId));

  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  const liveStreamPlayerIds = useMemo(() => {
    return [...selectedPlayers];
  }, [selectedPlayers]);

  const resolveStreamPlayer = useCallback(
    (id: string) => players.find((p) => p.id === id),
    [players],
  );

  const selectPlayerForStream = useCallback(
    (p: StreamPlayer) => {
      setSelectedPlayers((prev) => {
        const next = new Set(prev);
        if (!next.has(p.id)) next.add(p.id);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const fromUrl = searchParams.get("player");
    if (fromUrl) pendingLivePlayerRef.current = fromUrl;
  }, [searchParams]);

  useEffect(() => {
    const focusId = pendingLivePlayerRef.current;
    if (!focusId || loading) return;

    const found = players.find((p) => p.id === focusId);
    const fallbackName = searchParams.get("name") || "Player";
    const target: StreamPlayer =
      found ??
      ({
        id: focusId,
        name: fallbackName,
        license: "",
        ping: 0,
        threatScore: 0,
        tags: [],
      } satisfies StreamPlayer);

    pendingLivePlayerRef.current = null;
    selectPlayerForStream(target);

    const next = new URLSearchParams(searchParams);
    next.delete("player");
    next.delete("name");
    setSearchParams(next, { replace: true });
  }, [loading, players, searchParams, setSearchParams, selectPlayerForStream]);

  if (!serverId && !isDemo) {
    return null;
  }

  const effectiveServerId = isDemo ? "demo" : (serverId as string);

  const content = (
    <>
      <MultiStreamViewer
        serverId={effectiveServerId}
        players={players}
        isVisible={true}
        selectedPlayers={selectedPlayers}
        setSelectedPlayers={setSelectedPlayers}
        onKick={(pl) => requestModeration(pl, "kick")}
        onBan={(pl) => requestModeration(pl, "ban")}
        actionLoading={actionLoading}
      />

      <PlayerKickBanDialog
        open={!!moderationAction}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setModerationAction(null);
        }}
        action={moderationAction?.type ?? null}
        playerName={moderationAction?.player.name ?? ""}
        loading={
          !!moderationAction &&
          actionLoading === `${moderationAction.type}-${moderationAction.player.id}`
        }
        onConfirm={confirmModeration}
      />
    </>
  );

  return isDemo ? (
    <DemoLivePeerStreamsProvider
      streamPlayerIds={liveStreamPlayerIds}
      labelForPlayerId={(id) => {
        const p = resolveStreamPlayer(id);
        return p ? `#${p.id} ${p.name}` : `Player ${id}`;
      }}
    >
      {content}
    </DemoLivePeerStreamsProvider>
  ) : (
    <LivePeerStreamsProvider
      serverId={effectiveServerId}
      streamPlayerIds={liveStreamPlayerIds}
      resolvePlayer={resolveStreamPlayer}
    >
      {content}
    </LivePeerStreamsProvider>
  );
}
