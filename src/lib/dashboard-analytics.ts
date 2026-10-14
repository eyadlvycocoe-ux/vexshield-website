export type AnalyticsPoint = {
  label: string;
  players: number;
  bans: number;
};

const BUCKETS = 24;

export function buildHourLabels(count = BUCKETS): string[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now - (count - 1 - i) * 60 * 60 * 1000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
}

export function loadActivityHistory(serverId: string): number[] | null {
  try {
    const raw = localStorage.getItem(`dashboard_activity_${serverId}`);
    if (!raw) return null;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr) || arr.length !== BUCKETS) return null;
    return arr.map((v) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0));
  } catch {
    return null;
  }
}

/** Persist hourly player counts; last bucket is always the live count. */
export function saveActivityHistory(
  serverId: string,
  current: number,
  existing?: number[] | null,
): number[] {
  const hour = new Date().getHours();
  const safe = Math.max(0, Math.round(current));
  const history =
    existing && existing.length === BUCKETS
      ? [...existing]
      : Array(BUCKETS).fill(safe);
  history[hour] = Math.max(history[hour] ?? 0, safe);
  history[BUCKETS - 1] = safe;
  try {
    localStorage.setItem(`dashboard_activity_${serverId}`, JSON.stringify(history));
  } catch {
    /* ignore quota */
  }
  return history;
}

export function bucketBansByHour(
  bans: { created_at?: string | null }[],
  buckets = BUCKETS,
): number[] {
  const now = Date.now();
  const counts = Array(buckets).fill(0);
  for (const ban of bans) {
    if (!ban.created_at) continue;
    const t = new Date(ban.created_at).getTime();
    if (Number.isNaN(t)) continue;
    const hoursAgo = Math.floor((now - t) / (60 * 60 * 1000));
    if (hoursAgo >= 0 && hoursAgo < buckets) {
      counts[buckets - 1 - hoursAgo] += 1;
    }
  }
  return counts;
}

export function buildAnalyticsSeries(
  playerHistory: number[],
  banBuckets: number[],
): AnalyticsPoint[] {
  const labels = buildHourLabels(BUCKETS);
  return labels.map((label, i) => ({
    label,
    players: playerHistory[i] ?? 0,
    bans: banBuckets[i] ?? 0,
  }));
}

export function seriesPeakAvg(values: number[]): { peak: number; avg: number } {
  if (!values.length) return { peak: 0, avg: 0 };
  const peak = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return { peak, avg };
}
