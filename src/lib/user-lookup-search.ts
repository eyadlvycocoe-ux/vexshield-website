import type { BotBanEntry } from "@/components/BlacklistLivePanel";
import type {
  LookupProfile,
  LookupDiscord,
  CheatServerMembership,
  CheatServerIntel,
  ServerBanHit,
} from "@/components/PlayerLookupDashboard";

export const SEARCH_TIMEOUT_MS = 10_000;

export const EMPTY_CHEAT_SERVERS: CheatServerMembership = {
  checked: false,
  in_cheat_discord: false,
  member_count: 0,
  configured_count: 0,
  servers: [],
  partial: true,
};

export interface BlacklistedUser {
  id: number;
  discord_id: string;
  discord_tag?: string | null;
  username?: string | null;
  reason: string | null;
  added_at: string | null;
  last_ban_date?: string | null;
  license?: string | null;
}

export interface BlacklistedProof {
  id: number;
  proof_url: string | null;
  server_name: string | null;
}

export type SearchPayload = {
  matched?: boolean;
  blacklisted?: BlacklistedUser | null;
  discord?: LookupDiscord | null;
  proofs?: BlacklistedProof[];
  bot_bans?: BotBanEntry[];
  bot_entry?: BotBanEntry | null;
  server_bans?: ServerBanHit[];
  server_bans_lazy?: boolean;
  profile?: LookupProfile | null;
  cheat_servers?: CheatServerMembership | null;
  cheat_servers_lazy?: boolean;
  cleared?: boolean;
  source?: string | null;
  is_blacklisted?: boolean;
  instant?: boolean;
  enrich?: boolean;
  error?: string;
  asuas?: {
    blacklist?: any;
    cheaters?: any;
    bans?: any;
    events?: any;
    servers?: any;
  } | null;
};

export type SearchSetters = {
  setBotBans: (v: BotBanEntry[]) => void;
  setServerBans?: (v: ServerBanHit[]) => void;
  setIsBlacklisted: (v: boolean) => void;
  setBlacklistedUser: (v: BlacklistedUser | null) => void;
  setProofs: (v: BlacklistedProof[]) => void;
  setProfile: (v: LookupProfile | null) => void;
  setDiscordUser: (v: LookupDiscord | null | ((prev: LookupDiscord | null) => LookupDiscord | null)) => void;
  setCheatServers?: (v: CheatServerMembership | null) => void;
  setCheatServersLoading?: (v: boolean) => void;
  setAsuAsData?: (v: any) => void;
};

export function isServerBanActive(ban: ServerBanHit): boolean {
  const value = ban.is_active;
  return value !== false && value !== 0 && value !== "0";
}

export function pickDiscordDisplayName(dc: LookupDiscord | null | undefined): string | null {
  if (!dc) return null;
  const display = String(dc.display_name || "").trim();
  const user = String(dc.username || "").trim();
  if (display && !/^\d{17,19}$/.test(display)) return display;
  if (user && !/^\d{17,19}$/.test(user)) return user;
  return null;
}

export async function fetchLookupEnrich(
  trimmedQuery: string,
  signal?: AbortSignal,
  options?: { core?: boolean },
): Promise<SearchPayload | null> {
  try {
    const core = options?.core ? "&core=1" : "";
    const r = await fetch(
      apiUrl(`/api/lookup/enrich?q=${encodeURIComponent(trimmedQuery)}${core}`),
      {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal,
      },
    );
    if (!r.ok) return null;
    return (await r.json()) as SearchPayload;
  } catch {
    return null;
  }
}

export async function fetchServerBansLazy(
  trimmedQuery: string,
  signal?: AbortSignal,
): Promise<ServerBanHit[]> {
  try {
    const r = await fetch(
      `/api/public/lookup/server-bans?q=${encodeURIComponent(trimmedQuery)}`,
      {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal,
      },
    );
    if (!r.ok) return [];
    const json = (await r.json()) as { server_bans?: ServerBanHit[] };
    return (json.server_bans || []).filter(isServerBanActive);
  } catch {
    return [];
  }
}

export function applySearchPayload(
  json: SearchPayload | null,
  snowflake: string | null,
  setters: SearchSetters,
) {
  if (!json) return;

  if (json.asuas) {
    setters.setAsuAsData?.(json.asuas);
  }

  if (json.matched === false && !json.cleared) {
    setters.setIsBlacklisted(false);
    setters.setBlacklistedUser(null);
    setters.setBotBans([]);
    setters.setServerBans?.([]);
    setters.setProofs([]);
    setters.setProfile(null);
    setters.setDiscordUser(null);
    setters.setCheatServers?.(null);
    setters.setCheatServersLoading?.(false);
    return;
  }

  if (json.cleared) {
    setters.setIsBlacklisted(false);
    setters.setBlacklistedUser(null);
    setters.setBotBans([]);
    setters.setServerBans?.([]);
    setters.setProofs([]);
    if (snowflake) {
      setters.setProfile({ discord_id: snowflake, player_name: null });
      setters.setDiscordUser(minimalDiscord(snowflake));
    }
    return;
  }

  const bl = json.blacklisted ?? null;
  const dc = json.discord ?? null;
  const proofsList = json.proofs || [];
  let bansFromBot = json.bot_bans || [];
  if (bansFromBot.length === 0 && json.bot_entry) {
    bansFromBot = [json.bot_entry];
  }
  const bansFromServers = (json.server_bans || []).filter(isServerBanActive);
  const onGlobalBlacklist =
    !json.cleared &&
    Boolean(
      json.is_blacklisted ??
      (bl ||
        bansFromBot.length > 0 ||
        json.source === "bot" ||
        json.source === "both"),
    );

  if (bansFromBot.length) setters.setBotBans(bansFromBot);
  if (bansFromServers.length) setters.setServerBans?.(bansFromServers);
  if (json.profile) {
    const dcName = dc ? pickDiscordDisplayName(dc) : null;
    setters.setProfile({
      ...json.profile,
      player_name: json.profile.player_name || dcName || null,
      last_active: json.profile.last_active ?? dc?.connected_at ?? null,
    });
  } else if (snowflake) {
    setters.setProfile({ discord_id: snowflake });
  }

  if (json.cheat_servers && setters.setCheatServers) {
    setters.setCheatServers(json.cheat_servers);
    setters.setCheatServersLoading?.(false);
  }

  if (bl) {
    setters.setBlacklistedUser(bl);
    setters.setProofs(proofsList);
  } else if (onGlobalBlacklist) {
    setters.setProofs(proofsList);
  } else if (bansFromServers.length > 0) {
    setters.setProofs(proofsList);
  }

  setters.setIsBlacklisted(onGlobalBlacklist);

  if (!bl && onGlobalBlacklist && bansFromBot.length > 0) {
    const first = bansFromBot[bansFromBot.length - 1];
    const did = first.identifiers?.discord?.replace(/^discord:/i, "") || snowflake;
    if (did) {
      setters.setBlacklistedUser({
        id: 0,
        discord_id: did,
        username: first.playerInfo?.name || null,
        reason: first.banDetails?.reason || null,
        added_at: first.banDetails?.addedAt || null,
      });
    }
  } else if (!onGlobalBlacklist) {
    setters.setBlacklistedUser(null);
  }

  if (dc) {
    setters.setDiscordUser(dc);
    const dcName = pickDiscordDisplayName(dc);
    if (dcName) {
      const base = json.profile ?? (snowflake ? { discord_id: snowflake } : null);
      setters.setProfile({
        player_name: base?.player_name || dcName,
        last_active: base?.last_active ?? dc.connected_at ?? null,
        license: base?.license ?? null,
        license2: base?.license2 ?? null,
        discord_id: base?.discord_id || dc.discord_id || snowflake || null,
      });
    }
  } else if (snowflake) {
    setters.setDiscordUser((prev) => prev ?? minimalDiscord(snowflake));
  }
}

export async function fetchBotOnlyFallback(
  discordId: string,
  signal?: AbortSignal,
): Promise<{
  bot_bans?: BotBanEntry[];
  blacklisted?: BlacklistedUser | null;
  profile?: LookupProfile | null;
  proofs?: BlacklistedProof[];
  cleared?: boolean;
  is_blacklisted?: boolean;
} | null> {
  try {
    const r = await fetch(`/api/public/blacklist-bot/${discordId}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as {
      bot_bans?: BotBanEntry[];
      blacklisted?: BlacklistedUser | null;
      profile?: LookupProfile | null;
      proofs?: BlacklistedProof[];
      cleared?: boolean;
      is_blacklisted?: boolean;
    };
  } catch {
    return null;
  }
}

export function applyBotInstantPayload(
  fallback: NonNullable<Awaited<ReturnType<typeof fetchBotOnlyFallback>>>,
  snowflake: string,
  setters: SearchSetters,
) {
  applySearchPayload(
    {
      cleared: fallback.cleared,
      blacklisted: fallback.blacklisted,
      bot_bans: fallback.bot_bans,
      proofs: fallback.proofs,
      profile: fallback.profile,
      is_blacklisted: fallback.is_blacklisted,
      instant: true,
    },
    snowflake,
    setters,
  );
}

async function fetchCheatIntel(
  discordId: string,
  signal?: AbortSignal,
): Promise<CheatServerIntel | null> {
  try {
    const r = await fetch(`/api/public/cheat-intel/${discordId}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { intel?: CheatServerIntel };
    return json.intel ?? null;
  } catch {
    return null;
  }
}

async function fetchCheatServersLazy(
  discordId: string,
  signal?: AbortSignal,
  onPartial?: (data: CheatServerMembership) => void,
): Promise<CheatServerMembership | null> {
  const fetchJson = async (url: string) => {
    const r = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { cheat_servers?: CheatServerMembership };
    return json.cheat_servers ?? null;
  };

  let historyResult: CheatServerMembership | null = null;
  let liveResult: CheatServerMembership | null = null;

  const historyPromise = fetchJson(`/api/public/cheat-servers/${discordId}/history`)
    .then((data) => {
      if (data) {
        historyResult = data;
        onPartial?.({ ...data, partial: true });
      }
      return data;
    })
    .catch(() => null);

  const livePromise = fetchJson(`/api/public/cheat-servers/${discordId}`)
    .then((data) => {
      if (data) {
        liveResult = data;
        onPartial?.(data);
      }
      return data;
    })
    .catch(() => null);

  const historyFirst = await Promise.race([
    historyPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 350)),
  ]);

  if (historyFirst) return historyFirst;

  const liveFirst = await Promise.race([
    livePromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
  ]);

  if (liveFirst) return liveFirst;
  if (liveResult) return liveResult;
  if (historyResult) {
    return {
      ...historyResult,
      partial: false,
      checked: true,
      scan_incomplete: false,
      offline: false,
    };
  }

  return {
    checked: false,
    in_cheat_discord: false,
    member_count: 0,
    configured_count: 0,
    servers: [],
    offline: true,
    scan_incomplete: true,
    error: "Cheat server scan unavailable",
  };
}

export function startParallelCheatLookups(
  discordId: string,
  gen: number,
  cheatAbort: AbortController,
  setCheatServers: (v: CheatServerMembership | null) => void,
  setCheatServersLoading: (v: boolean) => void,
  setCheatIntel: (v: CheatServerIntel | null) => void,
  setCheatIntelLoading: (v: boolean) => void,
  searchGenRef: MutableRefObject<number>,
) {
  setCheatServersLoading(true);
  setCheatIntelLoading(true);

  void fetchCheatServersLazy(discordId, cheatAbort.signal, (partial) => {
    if (gen !== searchGenRef.current || cheatAbort.signal.aborted) return;
    setCheatServers(partial);
    if (partial.in_cheat_discord) {
      setCheatServersLoading(false);
    }
  })
    .then((cs) => {
      if (gen !== searchGenRef.current || cheatAbort.signal.aborted) return;
      if (cs) setCheatServers(cs);
    })
    .finally(() => {
      if (gen === searchGenRef.current) setCheatServersLoading(false);
    });

  window.setTimeout(() => {
    if (gen !== searchGenRef.current || cheatAbort.signal.aborted) return;
    void fetchCheatIntel(discordId, cheatAbort.signal)
      .then((intel) => {
        if (gen !== searchGenRef.current || cheatAbort.signal.aborted) return;
        if (intel) setCheatIntel(intel);
      })
      .finally(() => {
        if (gen === searchGenRef.current) setCheatIntelLoading(false);
      });
  }, 400);

  window.setTimeout(() => {
    if (gen !== searchGenRef.current) return;
    setCheatServersLoading(false);
  }, 5000);
}

export function isCompleteLookupQuery(q: string): boolean {
  const t = q.trim().replace(/\s+/g, "");
  if (!t) return false;
  if (/^\d{17,19}$/.test(t) || /^discord:\d{17,19}$/i.test(t)) return true;
  if (/^license:[a-f0-9]{30,50}$/i.test(t) || /^[a-f0-9]{30,50}$/i.test(t)) return true;
  return false;
}

export function safeLikePattern(q: string): string {
  return q.replace(/[%_\\]/g, "").slice(0, 80);
}

export function isAutoSearchableQuery(q: string): boolean {
  if (isCompleteLookupQuery(q)) return true;
  return safeLikePattern(q.trim()).length >= 2;
}

export function snowflakeFromQuery(q: string): string | null {
  const t = q.trim().replace(/\s+/g, "");
  const m = t.match(/^discord:(\d{17,19})$/i) || t.match(/^(\d{17,19})$/);
  return m ? m[1] : null;
}

export function minimalDiscord(id: string): LookupDiscord {
  return {
    discord_id: id,
    username: null,
    display_name: null,
    avatar: null,
    avatar_url: `/api/public/discord-avatar/${id}?size=256`,
    connected_at: null,
    bio: null,
  };
}
