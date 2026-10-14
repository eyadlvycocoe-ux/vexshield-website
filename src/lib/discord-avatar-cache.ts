export type DiscordAvatarBatchEntry = {
  avatar: string | null;
  avatar_data_url: string | null;
  username?: string | null;
  display_name?: string | null;
};

export type DiscordAvatarBatchMap = Record<string, DiscordAvatarBatchEntry>;

function hasUsableAvatar(entry?: DiscordAvatarBatchEntry | null): boolean {
  return Boolean(
    entry?.avatar_data_url?.startsWith("data:image/") ||
      entry?.avatar ||
      entry?.username,
  );
}

/** Process-wide cache — survives poll/refetch and React remounts. */
const globalAvatarCache: DiscordAvatarBatchMap = {};

/** IDs whose proxy image loaded successfully in the browser. */
const proxyLoadedIds = new Set<string>();

export function getGlobalDiscordAvatars(): DiscordAvatarBatchMap {
  return globalAvatarCache;
}

export function getGlobalDiscordAvatar(id: string): DiscordAvatarBatchEntry | undefined {
  return globalAvatarCache[id];
}

export function markDiscordProxyLoaded(id: string): void {
  if (!id) return;
  proxyLoadedIds.add(id);
  if (!globalAvatarCache[id]) {
    globalAvatarCache[id] = { avatar: null, avatar_data_url: null };
  }
}

export function isDiscordProxyLoaded(id: string): boolean {
  return proxyLoadedIds.has(id);
}

export function mergeGlobalDiscordAvatars(part: DiscordAvatarBatchMap): DiscordAvatarBatchMap {
  for (const [id, entry] of Object.entries(part)) {
    if (!entry) continue;
    const existing = globalAvatarCache[id];
    if (hasUsableAvatar(existing) && !hasUsableAvatar(entry)) {
      globalAvatarCache[id] = {
        ...entry,
        avatar: entry.avatar ?? existing.avatar,
        avatar_data_url: existing.avatar_data_url,
        username: entry.username ?? existing.username,
        display_name: entry.display_name ?? existing.display_name,
      };
      continue;
    }
    globalAvatarCache[id] = entry;
  }
  return { ...globalAvatarCache };
}

export function globalCacheHasAvatar(id: string): boolean {
  return proxyLoadedIds.has(id) || hasUsableAvatar(globalAvatarCache[id]);
}
