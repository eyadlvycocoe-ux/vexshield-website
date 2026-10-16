/**
 * Get Discord avatar URL from Discord user ID
 * Discord CDN: https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png
 * Default avatar: https://cdn.discordapp.com/embed/avatars/{discriminator % 5}.png
 */

export function isDefaultDiscordEmbedUrl(url?: string | null): boolean {
  if (!url) return true;
  return url.includes("/embed/avatars/");
}

/** Resolve avatar hash from DB field or full CDN URL. */
export function resolveDiscordAvatarHash(
  discordId: string,
  avatar?: string | null,
  avatarUrl?: string | null,
): string | null {
  const av = String(avatar || "").trim();
  if (av && !isDefaultDiscordEmbedUrl(av) && !av.includes("/embed/avatars/")) {
    if (av.startsWith("http")) {
      const m = av.match(/\/avatars\/\d+\/([a-zA-Z0-9_]+)/);
      return m?.[1] ?? null;
    }
    return av.replace(/\.(png|gif|jpe?g|webp)(\?.*)?$/i, "");
  }
  const url = String(avatarUrl || "").trim();
  if (url && !isDefaultDiscordEmbedUrl(url)) {
    const m = url.match(new RegExp(`/avatars/${discordId}/([a-zA-Z0-9_]+)`));
    return m?.[1] ?? null;
  }
  return null;
}

/**
 * Best URL for <img src> on the Search / lookup UI.
 * Prefer inline data URL from API (immune to ad blockers on cdn.discordapp.com).
 */
export function pickLookupAvatarSrc(
  discordId: string,
  _avatar?: string | null,
  _avatarUrl?: string | null,
  proxyKey = 0,
  avatarDataUrl?: string | null,
): string {
  if (avatarDataUrl && avatarDataUrl.startsWith("data:image/")) {
    return avatarDataUrl;
  }
  return `/api/public/discord-avatar/${discordId}?size=256&v=${proxyKey}`;
}

export function getDiscordAvatarUrl(
  discordId?: string | null, 
  avatarHash?: string | null,
  size: number = 128
): string | null {
  if (!discordId) return null;
  
  if (avatarHash) {
    const raw = String(avatarHash).trim();
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    // OAuth stores hash only; bot may store full CDN URL. Strip accidental file extension.
    const base = raw.replace(/\.(png|gif|jpe?g|webp)(\?.*)?$/i, '');
    const ext = base.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${discordId}/${base}.${ext}?size=${size}`;
  }
  
  // Default avatar based on user ID - handle both Discord IDs and UUIDs
  let defaultIndex = 0;
  try {
    // Try to convert to BigInt if it's a valid Discord ID (numeric)
    if (/^\d+$/.test(discordId)) {
      defaultIndex = Number(BigInt(discordId) % BigInt(5));
    } else {
      // For UUIDs or other formats, use a simple hash
      defaultIndex = discordId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5;
    }
  } catch (error) {
    // Fallback to 0 if any error occurs
    defaultIndex = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

/**
 * Extract Discord ID from discord identifier string
 * Format: "discord:1234567890" -> "1234567890"
 */
export function extractDiscordId(discordIdentifier?: string | null): string | null {
  if (!discordIdentifier) return null;

  const s = String(discordIdentifier).trim();
  if (!s) return null;

  if (s.startsWith("discord:")) {
    const id = s.replace(/^discord:/i, "").trim();
    return /^\d{17,19}$/.test(id) ? id : null;
  }

  if (/^\d{17,19}$/.test(s)) return s;

  return null;
}

/** Normalize discord:ID, raw snowflake, or metadata string. */
export function resolveDiscordSnowflake(raw?: string | null): string | null {
  if (raw == null || raw === "") return null;
  return extractDiscordId(String(raw).trim());
}

export function discordIdFromIdentifiers(identifiers?: string[] | null): string | null {
  if (!identifiers?.length) return null;
  for (const id of identifiers) {
    const did = resolveDiscordSnowflake(id);
    if (did) return did;
  }
  return null;
}

function discordIdFromIdentifierValue(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const did = discordIdFromIdentifierValue(item);
      if (did) return did;
    }
    return null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const direct =
      resolveDiscordSnowflake(obj.discord as string) ||
      resolveDiscordSnowflake(obj.discord_id as string) ||
      resolveDiscordSnowflake(obj.discordId as string) ||
      resolveDiscordSnowflake(obj.Discord as string) ||
      resolveDiscordSnowflake(obj.value as string);
    if (direct) return direct;
    for (const nested of Object.values(obj)) {
      const did = discordIdFromIdentifierValue(nested);
      if (did) return did;
    }
    return null;
  }
  return resolveDiscordSnowflake(String(value)) || findDiscordSnowflakeInValue(value);
}

/** Extract Discord snowflake from FiveM player snapshot / ban metadata. */
export function discordIdFromPlayerRecord(player: Record<string, unknown> | null | undefined): string | null {
  if (!player) return null;
  const fromIds = discordIdFromIdentifierValue(player.identifiers);
  if (fromIds) return fromIds;

  const candidates = [
    player.discord,
    player.discord_id,
    player.discordId,
    player.discordID,
    player.discordid,
    player.discordIdentifier,
    player.Discord,
    player.identifier_discord,
    (player.rawData as Record<string, unknown> | undefined)?.discord,
    (player.rawData as Record<string, unknown> | undefined)?.discord_id,
    (player.rawData as Record<string, unknown> | undefined)?.discordId,
    (player.metadata as Record<string, unknown> | undefined)?.discord,
    (player.metadata as Record<string, unknown> | undefined)?.discord_id,
    (player.metadata as Record<string, unknown> | undefined)?.discordId,
  ];
  for (const c of candidates) {
    const did = resolveDiscordSnowflake(c as string);
    if (did) return did;
  }

  const meta = player.metadata;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    const fromMeta =
      resolveDiscordSnowflake(m.discord as string) ||
      resolveDiscordSnowflake(m.discord_id as string) ||
      resolveDiscordSnowflake(m.discordId as string) ||
      resolveDiscordSnowflake(m.Discord as string) ||
      discordIdFromIdentifierValue(m.identifiers);
    if (fromMeta) return fromMeta;
    const deep = findDiscordSnowflakeInValue(meta);
    if (deep) return deep;
  }

  if (typeof meta === "string") {
    const did = resolveDiscordSnowflake(meta);
    if (did) return did;
    try {
      const parsed = JSON.parse(meta) as Record<string, unknown>;
      const fromParsed =
        resolveDiscordSnowflake(parsed.discord as string) ||
        resolveDiscordSnowflake(parsed.discord_id as string) ||
        resolveDiscordSnowflake(parsed.discordId as string) ||
        resolveDiscordSnowflake(parsed.Discord as string) ||
        discordIdFromIdentifierValue(parsed.identifiers);
      if (fromParsed) return fromParsed;
    } catch {
      /* ignore */
    }
  }

  return resolveDiscordSnowflake(player.player_id as string) || findDiscordSnowflakeInValue(player);
}

/** Find discord snowflake anywhere in JSON/text (ban metadata blobs). */
export function findDiscordSnowflakeInValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const direct = resolveDiscordSnowflake(value);
    if (direct) return direct;
  }
  try {
    const blob = typeof value === "string" ? value : JSON.stringify(value);
    const m = blob.match(/discord:?\s*(\d{17,19})/i);
    if (m?.[1]) return m[1];
  } catch {
    /* ignore */
  }
  return null;
}

export function discordIdFromBanMetadata(
  metadata?: Record<string, unknown> | null,
  playerId?: string | null,
): string | null {
  if (metadata) {
    const fromMeta =
      resolveDiscordSnowflake(metadata.discord as string) ||
      resolveDiscordSnowflake(metadata.Discord as string) ||
      discordIdFromIdentifiers(
        Array.isArray(metadata.identifiers)
          ? (metadata.identifiers as string[])
          : metadata.identifiers
            ? Object.values(metadata.identifiers as Record<string, string>)
            : null,
      );
    if (fromMeta) return fromMeta;
    const deep = findDiscordSnowflakeInValue(metadata);
    if (deep) return deep;
  }
  return resolveDiscordSnowflake(playerId) || findDiscordSnowflakeInValue(playerId);
}

/**
 * Get avatar URL from Supabase Discord auth user metadata
 */
export function getAuthUserAvatar(user: any): string | null {
  if (!user) return null;

  // Direct avatar_url
  if (user.avatar_url && typeof user.avatar_url === 'string') {
    return user.avatar_url;
  }
  
  const metadata = user.user_metadata;
  if (metadata?.avatar_url && typeof metadata.avatar_url === 'string') {
    return metadata.avatar_url;
  }
  
  // Construct from discordId and avatar hash
  const discordId = user.id || metadata?.provider_id || metadata?.sub;
  const avatarHash = user.avatar || metadata?.avatar;
  
  if (discordId && avatarHash) {
    return getDiscordAvatarUrl(String(discordId), String(avatarHash));
  }
  if (discordId) {
    return getDiscordAvatarUrl(String(discordId), null);
  }
  return null;
}

/**
 * Get Discord username from auth metadata or user properties
 */
export function getAuthUserName(user: any): string | null {
  if (!user) return null;
  
  return (
    user.display_name ||
    user.global_name ||
    user.username ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.custom_claims?.global_name ||
    user.user_metadata?.user_name ||
    (user.email ? user.email.split('@')[0] : null)
  );
}
