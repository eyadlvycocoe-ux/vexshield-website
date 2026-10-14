import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePeerJsAirshieldStream, type PeerStreamStatus } from "@/hooks/usePeerJsAirshieldStream";
import type { StreamPlayer } from "@/components/PlayerStreamCard";

export type LivePeerStreamEntry = {
  remoteStream: MediaStream | null;
  status: PeerStreamStatus;
};

type Registry = Map<string, LivePeerStreamEntry>;

const LivePeerStreamsContext = createContext<Registry | null>(null);

function LivePeerStreamSlot({
  serverId,
  player,
  onUpdate,
  onRemove,
}: {
  serverId: string;
  player: StreamPlayer;
  onUpdate: (id: string, entry: LivePeerStreamEntry) => void;
  onRemove: (id: string) => void;
}) {
  const { remoteStream, status } = usePeerJsAirshieldStream({
    serverId,
    playerId: player.id,
    playerName: player.name,
    license: player.license,
    enabled: true,
  });

  useEffect(() => {
    onUpdate(player.id, { remoteStream, status });
  }, [player.id, status, remoteStream, onUpdate]);

  useEffect(() => {
    return () => {
      onRemove(player.id);
    };
  }, [player.id, onRemove]);

  return null;
}

/**
 * One PeerJS session per player id while that id is in `streamPlayerIds`, so the grid card and
 * the expanded modal share the same connection (no teardown when opening/closing the dialog).
 */
export function LivePeerStreamsProvider({
  serverId,
  streamPlayerIds,
  resolvePlayer,
  children,
}: {
  serverId: string;
  streamPlayerIds: readonly string[];
  resolvePlayer: (id: string) => StreamPlayer | undefined;
  children: ReactNode;
}) {
  const [registry, setRegistry] = useState<Registry>(() => new Map());

  const onUpdate = useCallback((id: string, entry: LivePeerStreamEntry) => {
    setRegistry((prev) => {
      const cur = prev.get(id);
      if (cur && cur.status === entry.status && cur.remoteStream === entry.remoteStream) {
        return prev;
      }
      const next = new Map(prev);
      next.set(id, entry);
      return next;
    });
  }, []);

  const onRemove = useCallback((id: string) => {
    setRegistry((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(() => registry, [registry]);

  const slots = useMemo(() => {
    const out: StreamPlayer[] = [];
    const seen = new Set<string>();
    for (const id of streamPlayerIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const p = resolvePlayer(id);
      if (p) out.push(p);
    }
    return out;
  }, [streamPlayerIds, resolvePlayer]);

  return (
    <LivePeerStreamsContext.Provider value={value}>
      {slots.map((player) => (
        <LivePeerStreamSlot
          key={player.id}
          serverId={serverId}
          player={player}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
      {children}
    </LivePeerStreamsContext.Provider>
  );
}

export function useLivePeerStream(playerId: string | undefined | null): LivePeerStreamEntry | null {
  const map = useContext(LivePeerStreamsContext);
  if (!map || playerId == null || playerId === "") return null;
  return map.get(playerId) ?? null;
}
