/** Ignore DB snapshot if the game has not reported players within this window (10 mins fallback). */
export const PLAYERS_SNAPSHOT_MAX_AGE_MS = 600_000;

export type PlayersSnapshotRow = {
  snapshot?: unknown;
  total_players?: number | null;
  updated_at?: string | null;
};

export function isPlayersSnapshotStale(updatedAt?: string | null): boolean {
  if (!updatedAt) return false;
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts > PLAYERS_SNAPSHOT_MAX_AGE_MS;
}

export function snapshotList(row: PlayersSnapshotRow | null | undefined): Record<string, unknown>[] {
  if (!row || row.snapshot == null) return [];
  let data = row.snapshot;

  // Handle JSON strings (e.g. MySQL JSON.stringify(snapshot))
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return [];
    try {
      data = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  // Handle direct arrays
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }

  // Handle object wrappers like { players: [...] }, { data: [...] }, or object maps { "1": {...} }
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.players)) return obj.players as Record<string, unknown>[];
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    if (Array.isArray(obj.snapshot)) return obj.snapshot as Record<string, unknown>[];

    const values = Object.values(obj);
    if (values.length > 0 && values.every((v) => typeof v === "object" && v !== null)) {
      return values as Record<string, unknown>[];
    }
  }

  return [];
}

export function parsePlayersSnapshot(
  row: PlayersSnapshotRow | null | undefined,
  options?: { strictStale?: boolean }
): {
  players: Record<string, unknown>[];
  stale: boolean;
} {
  if (!row) return { players: [], stale: false };

  const stale = isPlayersSnapshotStale(row.updated_at);
  const list = snapshotList(row);

  if (stale && options?.strictStale) {
    return { players: [], stale: true };
  }

  return { players: list, stale };
}

/** Live online count from the latest in-game snapshot only. */
export function effectiveLivePlayerCount(row: PlayersSnapshotRow | null | undefined): number {
  if (!row) return 0;

  const players = snapshotList(row);
  if (players.length > 0) return players.length;

  return typeof row.total_players === "number" ? row.total_players : 0;
}

