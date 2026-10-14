const CACHE_PREFIX = "aircore_dash_v1_";

export type DashboardCachePayload = {
  server: Record<string, unknown> | null;
  snapshot: Record<string, unknown> | null;
  stats: {
    totalBans: number;
    totalKicks: number;
    totalWarns: number;
    peakPlayers: number;
  };
  acVersion: string;
  licenseKey?: string;
  savedAt: number;
};

export function readDashboardCache(serverId: string): DashboardCachePayload | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${serverId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardCachePayload;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > 10 * 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDashboardCache(serverId: string, payload: Omit<DashboardCachePayload, "savedAt">) {
  try {
    sessionStorage.setItem(
      `${CACHE_PREFIX}${serverId}`,
      JSON.stringify({ ...payload, savedAt: Date.now() } satisfies DashboardCachePayload),
    );
  } catch {
    /* ignore quota */
  }
}
