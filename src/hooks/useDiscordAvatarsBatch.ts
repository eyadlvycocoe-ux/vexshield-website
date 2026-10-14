import { useEffect, useRef, useState } from "react";
import { resolveDiscordSnowflake } from "@/lib/discord-avatar";
import {
  getGlobalDiscordAvatars,
  globalCacheHasAvatar,
  mergeGlobalDiscordAvatars,
  type DiscordAvatarBatchMap,
} from "@/lib/discord-avatar-cache";

export type { DiscordAvatarBatchEntry, DiscordAvatarBatchMap } from "@/lib/discord-avatar-cache";

const CHUNK_SIZE = 40;

async function fetchAvatarChunk(ids: string[]): Promise<DiscordAvatarBatchMap> {
  if (ids.length === 0) return {};
  try {
    const res = await fetch("/api/public/discord-avatars-batch", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) return {};
    const data = await res.json().catch(() => null);
    return (data?.avatars as DiscordAvatarBatchMap) || {};
  } catch {
    return {};
  }
}

/**
 * Fetch Discord avatars (server warms cache). UI always uses /api/public/discord-avatar proxy.
 */
export function useDiscordAvatarsBatch(discordIds: (string | null | undefined)[]) {
  const [map, setMap] = useState<DiscordAvatarBatchMap>(() => ({ ...getGlobalDiscordAvatars() }));
  const [loading, setLoading] = useState(false);
  const fetchGenRef = useRef(0);

  const key = discordIds
    .map((id) => resolveDiscordSnowflake(id))
    .filter(Boolean)
    .sort()
    .join(",");

  useEffect(() => {
    const ids = [...new Set(discordIds.map((id) => resolveDiscordSnowflake(id)).filter(Boolean))] as string[];

    setMap({ ...getGlobalDiscordAvatars() });

    if (ids.length === 0) return;

    const missing = ids.filter((id) => !globalCacheHasAvatar(id));
    if (missing.length === 0) return;

    const gen = ++fetchGenRef.current;
    let cancelled = false;
    setLoading(true);

    (async () => {
      for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
        if (cancelled || fetchGenRef.current !== gen) return;
        const chunk = missing.slice(i, i + CHUNK_SIZE);
        const part = await fetchAvatarChunk(chunk);
        const merged = mergeGlobalDiscordAvatars(part);
        if (!cancelled && fetchGenRef.current === gen) {
          setMap({ ...merged });
        }
      }
    })()
      .catch(() => { })
      .finally(() => {
        if (!cancelled && fetchGenRef.current === gen) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { avatars: map, loading };
}
