import type { BanRecord } from "@/pages/Bans";

/** Normalize DB / API date values (ISO, MySQL datetime, unix sec/ms) for display. */
export function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && value > 0) {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const raw = value.trim();
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 1e9 && /^\d+(\.\d+)?$/.test(raw)) {
      const ms = n > 1e12 ? n : n * 1000;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    const mysqlSpaced = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (mysqlSpaced) {
      const normalized = raw.replace(" ", "T");
      const hasTz = /([zZ]|[+-]\d{2}:\d{2})$/.test(normalized);
      const d = new Date(hasTz ? normalized : `${normalized}Z`);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    // ISO without timezone (e.g. "2026-05-27T14:32:10") is ambiguous; our DB/API values are UTC.
    const isoNoTz = raw.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/);
    if (isoNoTz) {
      const d = new Date(`${raw}Z`);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

function toUnixSeconds(value: unknown): number | null {
  const iso = toIso(value);
  if (!iso) return null;
  return Math.floor(new Date(iso).getTime() / 1000);
}

export function normalizePlayerLicense(raw?: string | null): string {
  if (!raw) return "";
  const s = String(raw).trim().toLowerCase();
  return s.startsWith("license:") ? s.slice("license:".length) : s;
}

const GENERIC_PLAYER_NAMES = new Set(["", "unknown", "n/a", "na", "none", "-", "onbekend"]);

/** Names like "Unknown" must not link unrelated bans together. */
export function isReliablePlayerName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n.length > 0 && !GENERIC_PLAYER_NAMES.has(n);
}

/** Prefer anticheat ban time from metadata; DB created_at is often bulk-sync time. */
export function extractBannedAtIso(
  metadata: Record<string, unknown>,
  dbCreatedAtIso?: string,
): string | undefined {
  const keys = [
    "banned_at",
    "bannedAt",
    "ban_time",
    "banTime",
    "timestamp",
    "time",
    "created_at",
    "createdAt",
  ];
  for (const key of keys) {
    const iso = toIso(metadata[key]);
    if (iso) return iso;
  }
  return dbCreatedAtIso;
}

export function playerMatchKeys(ban: BanRecord): { licenses: Set<string>; discordIds: Set<string>; name: string } {
  const licenses = new Set<string>();
  const discordIds = new Set<string>();
  const m = ban.metadata || {};

  const lic = normalizePlayerLicense(
    (m.license as string) || ban.playerId || undefined,
  );
  if (lic) licenses.add(lic);
  const lic2 = normalizePlayerLicense(m.license2 as string);
  if (lic2) licenses.add(lic2);

  const dcRaw = (m.discord as string) || ban.discordId || "";
  const dc = String(dcRaw).replace(/^discord:/i, "").trim();
  if (/^\d{17,19}$/.test(dc)) discordIds.add(dc);

  return {
    licenses,
    discordIds,
    name: (ban.playerName || "").trim().toLowerCase(),
  };
}

export function bansReferToSamePlayer(a: BanRecord, b: BanRecord): boolean {
  const ka = playerMatchKeys(a);
  const kb = playerMatchKeys(b);
  for (const l of ka.licenses) {
    if (kb.licenses.has(l)) return true;
  }
  for (const d of ka.discordIds) {
    if (kb.discordIds.has(d)) return true;
  }
  if (isReliablePlayerName(ka.name) && ka.name === kb.name) return true;
  return false;
}

export function extractPlaytimeMinutes(
  metadata: Record<string, unknown>,
  banCreatedAtIso: string,
): number | undefined {
  const numericKeys = [
    "playtime_minutes",
    "playtimeMinutes",
    "play_time_minutes",
    "playTimeMinutes",
    "total_playtime_minutes",
    "session_minutes",
    "sessionMinutes",
    "time_played_minutes",
    "minutes_played",
  ];
  for (const key of numericKeys) {
    const v = metadata[key];
    if (typeof v === "number" && v >= 0) return Math.round(v);
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
      return Math.round(Number(v));
    }
  }

  for (const key of ["playtime_hours", "playTimeHours", "hours_played"]) {
    const v = metadata[key];
    if (typeof v === "number" && v >= 0) return Math.round(v * 60);
  }

  const bannedAt =
    toUnixSeconds(metadata.banned_at) ??
    toUnixSeconds(metadata.bannedAt) ??
    toUnixSeconds(banCreatedAtIso);
  const joinedAt =
    toUnixSeconds(metadata.joined_at) ??
    toUnixSeconds(metadata.joinedAt) ??
    toUnixSeconds(metadata.session_start) ??
    toUnixSeconds(metadata.sessionStart);

  if (bannedAt != null && joinedAt != null && bannedAt >= joinedAt) {
    const mins = Math.round((bannedAt - joinedAt) / 60);
    return mins > 0 ? mins : 1;
  }

  return undefined;
}

/** True when URL points to a ban clip (WebM/MP4 or panel upload path). */
export function isBanClipUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const u = value.trim();
  if (!u) return false;
  return /\.(mp4|webm|mov)(\?|$)/i.test(u) || u.includes("/uploads/ban-clips/");
}

export function extractBanScreenshotUrl(
  metadata: Record<string, unknown>,
  fallback?: string | null,
): string | undefined {
  const candidates: string[] = [];
  if (fallback?.trim()) candidates.push(fallback.trim());
  for (const key of ["screenshot_url", "screenshot", "image", "image_url"]) {
    const v = metadata[key];
    if (typeof v === "string" && v.trim()) candidates.push(v.trim());
  }
  for (const raw of candidates) {
    if (!isBanClipUrl(raw)) return raw;
  }
  return undefined;
}

export function extractBanClipUrl(metadata: Record<string, unknown>): string | undefined {
  for (const key of [
    "clip_url",
    "clipUrl",
    "ban_clip_url",
    "ban_clip",
    "banClip",
    "banClipUrl",
    "proof_url",
    "proof",
  ]) {
    const v = metadata[key];
    if (typeof v === "string" && v.trim() && isBanClipUrl(v)) return v.trim();
  }
  for (const key of ["screenshot_url", "screenshot"]) {
    const v = metadata[key];
    if (typeof v === "string" && v.trim() && isBanClipUrl(v)) return v.trim();
  }
  return undefined;
}

export function sanitizeFirstJoinAt(
  firstJoinAt: string | undefined,
  bannedAt: string,
): string | undefined {
  if (!firstJoinAt) return undefined;
  const fj = new Date(firstJoinAt).getTime();
  const ban = new Date(bannedAt).getTime();
  if (Number.isNaN(fj) || Number.isNaN(ban)) return firstJoinAt;
  // Session join at ban time is not a real "first join" date.
  if (Math.abs(fj - ban) < 5 * 60 * 1000) return undefined;
  if (fj > ban) return undefined;
  return firstJoinAt;
}

export function extractFirstJoinIso(metadata: Record<string, unknown>): string | undefined {
  const keys = [
    "first_join_at",
    "first_join",
    "firstJoinAt",
    "firstJoin",
    "first_seen_at",
    "firstSeenAt",
    "account_created_at",
    "account_created",
  ];
  for (const key of keys) {
    const iso = toIso(metadata[key]);
    if (iso) return iso;
  }
  return undefined;
}

export function extractLastJoinIso(
  metadata: Record<string, unknown>,
  banCreatedAtIso: string,
): string | undefined {
  const keys = ["last_join_at", "last_join", "lastJoinAt", "lastJoin", "joined_at", "joinedAt"];
  for (const key of keys) {
    const iso = toIso(metadata[key]);
    if (iso) return iso;
  }
  return toIso(banCreatedAtIso);
}

export function applyBanMetadataStats(ban: BanRecord): BanRecord {
  const metadata = (ban.metadata || {}) as Record<string, unknown>;
  const firstJoinRaw = ban.firstJoinAt ?? extractFirstJoinIso(metadata);
  return {
    ...ban,
    playtimeMinutes: ban.playtimeMinutes ?? extractPlaytimeMinutes(metadata, ban.createdAt),
    firstJoinAt: sanitizeFirstJoinAt(firstJoinRaw, ban.createdAt),
    lastJoinAt: ban.lastJoinAt ?? extractLastJoinIso(metadata, ban.createdAt),
  };
}

export function earliestIso(dates: (string | undefined)[]): string | undefined {
  let best: number | null = null;
  let bestIso: string | undefined;
  for (const iso of dates) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) continue;
    if (best == null || t < best) {
      best = t;
      bestIso = iso;
    }
  }
  return bestIso;
}

export function enrichBansWithHistory(list: BanRecord[]): BanRecord[] {
  return list.map((ban) => applyBanMetadataStats(ban));
}
