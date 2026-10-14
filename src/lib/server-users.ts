import { supabase } from "@/integrations/supabase/client";
import {
  extractFirstJoinIso,
  extractLastJoinIso,
  extractPlaytimeMinutes,
  normalizePlayerLicense,
  toIso,
} from "@/lib/ban-player-stats";
import { discordIdFromBanMetadata } from "@/lib/discord-avatar";
import { parsePlayersSnapshot } from "@/lib/players-snapshot";

export type UserBanStatus = "clean" | "warned" | "banned";

export type UserBanHistoryEntry = {
  reason: string;
  date: string;
  active: boolean;
  mode?: string;
};

export type ServerUserProfile = {
  id: string;
  username: string;
  license: string;
  discordId: string | null;
  rank: string;
  status: "online" | "offline";
  banStatus: UserBanStatus;
  joinDate?: string;
  lastSeen?: string;
  playtimeMinutes: number;
  violationCount: number;
  banHistory: UserBanHistoryEntry[];
  playerId?: string;
};

export type UsersGraphData = {
  newUsersOverTime: { date: string; count: number }[];
  detectionsPerDay: { date: string; count: number }[];
  topCheatModules: { name: string; count: number }[];
  banRateOverTime: { date: string; rate: number }[];
  activeVsBanned: { name: string; value: number }[];
};

function licenseFromRow(row: Record<string, unknown>): string {
  const meta = (row.metadata as Record<string, unknown> | null) ?? {};
  const raw =
    (typeof meta.license === "string" && meta.license) ||
    (typeof meta.license2 === "string" && meta.license2) ||
    (typeof row.license === "string" && row.license) ||
    "";
  return normalizePlayerLicense(raw);
}

function computeRank(playtimeMinutes: number, violationCount: number): string {
  if (violationCount >= 5) return "Flagged";
  if (playtimeMinutes >= 5000) return "Veteran";
  if (playtimeMinutes >= 1200) return "Regular";
  if (playtimeMinutes >= 300) return "Member";
  return "Newcomer";
}

function bucketByDay(rows: { created_at?: string | null }[], days = 14): Map<string, number> {
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const iso = toIso(row.created_at);
    if (!iso) continue;
    const key = iso.slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

const MAX_DB_ROWS = 200;

export async function loadServerUsers(serverId: string): Promise<ServerUserProfile[]> {
  const [bansRes, warnsRes, kicksRes, snapRes] = await Promise.all([
    supabase
      .from("bans")
      .select("id, player_id, player_name, reason, mode, metadata, created_at, is_active")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(MAX_DB_ROWS),
    supabase
      .from("warns")
      .select("id, player_id, player_name, message, metadata, created_at")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(MAX_DB_ROWS),
    supabase
      .from("kicks")
      .select("id, player_id, player_name, reason, metadata, created_at")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(MAX_DB_ROWS),
    supabase.from("players_snapshots").select("snapshot").eq("server_id", serverId).maybeSingle(),
  ]);

  const onlineLicenses = new Map<string, { name: string; id: string; discordId: string | null }>();
  const { players } = parsePlayersSnapshot(snapRes.data ?? undefined);
  for (const p of players) {
    const rec = p as Record<string, unknown>;
    const lic = normalizePlayerLicense(String(rec.license || ""));
    if (!lic) continue;
    const identifiers = Array.isArray(rec.identifiers) ? (rec.identifiers as string[]) : [];
    let discordId: string | null = null;
    for (const id of identifiers) {
      if (id.toLowerCase().startsWith("discord:")) {
        discordId = id.slice(8);
        break;
      }
    }
    onlineLicenses.set(lic, {
      name: String(rec.player_name || rec.name || "Unknown"),
      id: String(rec.player_id || rec.source || rec.id || ""),
      discordId,
    });
  }

  const profiles = new Map<string, ServerUserProfile>();

  const ensure = (license: string, name: string, playerId?: string): ServerUserProfile => {
    const key = license || `pid:${playerId || name}`;
    let p = profiles.get(key);
    if (!p) {
      p = {
        id: key,
        username: name || "Unknown",
        license: license ? `license:${license}` : "",
        discordId: null,
        rank: "Newcomer",
        status: "offline",
        banStatus: "clean",
        playtimeMinutes: 0,
        violationCount: 0,
        banHistory: [],
        playerId,
      };
      profiles.set(key, p);
    } else if (name && name !== "Unknown" && p.username === "Unknown") {
      p.username = name;
    }
    return p;
  };

  for (const ban of bansRes.data ?? []) {
    const row = ban as Record<string, unknown>;
    const lic = licenseFromRow(row);
    const name = String(row.player_name || "Unknown");
    const p = ensure(lic, name, String(row.player_id || ""));
    const meta = (row.metadata as Record<string, unknown> | null) ?? {};
    p.discordId = p.discordId ?? discordIdFromBanMetadata(meta);
    const banCreatedAt = toIso(row.created_at) ?? "";
    const join = extractFirstJoinIso(meta);
    const last = extractLastJoinIso(meta, banCreatedAt);
    const play = extractPlaytimeMinutes(meta, banCreatedAt);
    if (join && (!p.joinDate || join < p.joinDate)) p.joinDate = join;
    if (last && (!p.lastSeen || last > p.lastSeen)) p.lastSeen = last;
    if (play != null && play > p.playtimeMinutes) p.playtimeMinutes = play;
    const active = row.is_active !== false && row.is_active !== 0;
    p.banHistory.push({
      reason: String(row.reason || "No reason"),
      date: toIso(row.created_at) || new Date().toISOString(),
      active,
      mode: String(row.mode || ""),
    });
    if (active) p.banStatus = "banned";
    p.violationCount += 1;
  }

  for (const warn of warnsRes.data ?? []) {
    const row = warn as Record<string, unknown>;
    const lic = licenseFromRow(row);
    const name = String(row.player_name || "Unknown");
    const p = ensure(lic, name, String(row.player_id || ""));
    const meta = (row.metadata as Record<string, unknown> | null) ?? {};
    p.discordId = p.discordId ?? discordIdFromBanMetadata(meta);
    p.violationCount += 1;
    if (p.banStatus === "clean") p.banStatus = "warned";
    const join = extractFirstJoinIso(meta);
    if (join && (!p.joinDate || join < p.joinDate)) p.joinDate = join;
  }

  for (const kick of kicksRes.data ?? []) {
    const row = kick as Record<string, unknown>;
    const lic = licenseFromRow(row);
    const name = String(row.player_name || "Unknown");
    const p = ensure(lic, name, String(row.player_id || ""));
    p.violationCount += 1;
  }

  for (const [lic, online] of onlineLicenses) {
    const p = ensure(lic, online.name, online.id);
    p.status = "online";
    p.lastSeen = new Date().toISOString();
    p.playerId = online.id;
    if (online.discordId) p.discordId = online.discordId;
  }

  for (const p of profiles.values()) {
    p.rank = computeRank(p.playtimeMinutes, p.violationCount);
    p.banHistory.sort((a, b) => b.date.localeCompare(a.date));
  }

  return Array.from(profiles.values()).sort((a, b) => {
    if (a.status !== b.status) return a.status === "online" ? -1 : 1;
    return (b.lastSeen || "").localeCompare(a.lastSeen || "");
  });
}

export function buildUsersGraphData(
  users: ServerUserProfile[],
  bans: { reason?: string; mode?: string; created_at?: string | null }[],
): UsersGraphData {
  const dayKeys: string[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const newUsersMap = new Map(dayKeys.map((k) => [k, 0]));
  for (const u of users) {
    if (!u.joinDate) continue;
    const key = u.joinDate.slice(0, 10);
    if (newUsersMap.has(key)) newUsersMap.set(key, (newUsersMap.get(key) ?? 0) + 1);
  }

  const anticheatBans = bans.filter((b) => String(b.mode || "").toLowerCase() === "anticheat");
  const detectMap = bucketByDay(anticheatBans);
  const allBansMap = bucketByDay(bans);

  const moduleCounts = new Map<string, number>();
  for (const b of anticheatBans) {
    const raw = (b.reason || "Unknown").trim();
    const label = raw.length > 28 ? `${raw.slice(0, 28)}…` : raw;
    moduleCounts.set(label, (moduleCounts.get(label) || 0) + 1);
  }

  const activeCount = users.filter((u) => u.status === "online").length;
  const bannedCount = users.filter((u) => u.banStatus === "banned").length;
  const cleanCount = Math.max(0, users.length - bannedCount);

  return {
    newUsersOverTime: dayKeys.map((date) => ({ date, count: newUsersMap.get(date) ?? 0 })),
    detectionsPerDay: dayKeys.map((date) => ({ date, count: detectMap.get(date) ?? 0 })),
    topCheatModules: Array.from(moduleCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    banRateOverTime: dayKeys.map((date) => {
      const bansDay = allBansMap.get(date) ?? 0;
      const newDay = newUsersMap.get(date) ?? 0;
      const rate = newDay > 0 ? Math.round((bansDay / newDay) * 100) : bansDay > 0 ? 100 : 0;
      return { date, rate };
    }),
    activeVsBanned: [
      { name: "Active", value: activeCount || cleanCount },
      { name: "Banned", value: bannedCount },
      { name: "Warned", value: users.filter((u) => u.banStatus === "warned").length },
    ],
  };
}

export function filterUsers(
  users: ServerUserProfile[],
  filters: {
    query?: string;
    rank?: string;
    status?: string;
    banStatus?: string;
  },
): ServerUserProfile[] {
  const q = (filters.query || "").trim().toLowerCase();
  return users.filter((u) => {
    if (q) {
      const hay = `${u.username} ${u.license} ${u.discordId || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.rank && filters.rank !== "all" && u.rank !== filters.rank) return false;
    if (filters.status && filters.status !== "all" && u.status !== filters.status) return false;
    if (filters.banStatus && filters.banStatus !== "all" && u.banStatus !== filters.banStatus) return false;
    return true;
  });
}

export function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
