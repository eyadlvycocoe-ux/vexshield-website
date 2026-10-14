export type ActivityTimeRange = "today" | "7d" | "30d";

export type ActivityEventKey =
  | "playerJoin"
  | "playerLeave"
  | "banPlayer"
  | "unbanPlayer"
  | "kickPlayer"
  | "entityCreate"
  | "kill"
  | "explosion";

export type ActivityChartRow = Record<ActivityEventKey, number> & { label: string };

export const ACTIVITY_EVENT_META: Record<ActivityEventKey, { label: string; color: string }> = {
  playerJoin: { label: "Player Join", color: "#22c55e" },
  playerLeave: { label: "Player Leave", color: "#3b82f6" },
  banPlayer: { label: "Ban Player", color: "#ef4444" },
  unbanPlayer: { label: "Unban Player", color: "#38bdf8" },
  kickPlayer: { label: "Kick Player", color: "#f97316" },
  entityCreate: { label: "Entity Create", color: "#ec4899" },
  kill: { label: "Kill", color: "#a855f7" },
  explosion: { label: "Explosion", color: "#991b1b" },
};

export const ACTIVITY_EVENT_KEYS = Object.keys(ACTIVITY_EVENT_META) as ActivityEventKey[];

function emptyRow(label: string): ActivityChartRow {
  return {
    label,
    playerJoin: 0,
    playerLeave: 0,
    banPlayer: 0,
    unbanPlayer: 0,
    kickPlayer: 0,
    entityCreate: 0,
    kill: 0,
    explosion: 0,
  };
}

export function activityRangeStart(range: ActivityTimeRange, now = new Date()): Date {
  const d = new Date(now);
  if (range === "today") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "7d") {
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function classifyActivityEvent(action: string, description: string, source: string): ActivityEventKey | null {
  const a = action.toLowerCase();
  const d = description.toLowerCase();

  if (a.includes("unban") || d.startsWith("unban:")) return "unbanPlayer";
  if (a.includes("join") || d.includes(" joined") || d.includes("player join")) return "playerJoin";
  if (a.includes("leave") || a.includes("disconnect") || d.includes(" left") || d.includes("player leave")) {
    return "playerLeave";
  }
  if (
    a.includes("resource") ||
    a.includes("spawn") ||
    a.includes("entity") ||
    a.includes("object") ||
    a.includes("vehicle") ||
    a.includes("ped") ||
    d.includes("entity")
  ) {
    return "entityCreate";
  }
  if (source === "kick" || a.includes("kick") || d.startsWith("kick:")) return "kickPlayer";
  if (source === "ban" || a.includes("ban") || d.startsWith("ban:")) {
    if (d.includes("explosion")) return "explosion";
    if (d.includes("kill")) return "kill";
    return "banPlayer";
  }
  return null;
}

export function buildActivityChartData(
  logs: { action: string; description: string; source: string; created_at: string }[],
  range: ActivityTimeRange,
): ActivityChartRow[] {
  const now = new Date();
  const start = activityRangeStart(range, now);

  if (range === "today") {
    const rows: ActivityChartRow[] = Array.from({ length: 24 }, (_, h) => emptyRow(`${String(h).padStart(2, "0")}:00`));
    for (const log of logs) {
      const t = new Date(log.created_at);
      if (Number.isNaN(t.getTime()) || t < start || t > now) continue;
      const key = classifyActivityEvent(log.action, log.description, log.source);
      if (!key) continue;
      rows[t.getHours()][key] += 1;
    }
    return rows;
  }

  const dayCount = range === "7d" ? 7 : 30;
  const rows: ActivityChartRow[] = [];
  for (let i = 0; i < dayCount; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    rows.push(emptyRow(day.toLocaleDateString(undefined, { month: "short", day: "numeric" })));
  }

  for (const log of logs) {
    const t = new Date(log.created_at);
    if (Number.isNaN(t.getTime()) || t < start || t > now) continue;
    const dayIndex = Math.floor((t.getTime() - start.getTime()) / 86_400_000);
    if (dayIndex < 0 || dayIndex >= rows.length) continue;
    const key = classifyActivityEvent(log.action, log.description, log.source);
    if (!key) continue;
    rows[dayIndex][key] += 1;
  }

  return rows;
}

export function chartYMax(rows: ActivityChartRow[]): number {
  let top = 0;
  for (const row of rows) {
    let sum = 0;
    for (const key of ACTIVITY_EVENT_KEYS) sum += row[key];
    if (sum > top) top = sum;
  }
  if (top <= 0) return 125;
  const step = top <= 25 ? 5 : top <= 50 ? 10 : 25;
  return Math.ceil(top / step) * step;
}
