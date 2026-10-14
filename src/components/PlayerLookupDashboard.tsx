import { memo, useMemo, useState, useEffect } from "react";
import {
  ChevronDown,
  Copy,
  Shield,
  User,
  MessageCircle,
  Ban,
  MoreHorizontal,
  AlertTriangle,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { pickLookupAvatarSrc } from "@/lib/discord-avatar";
import { formatBanDateTime, formatBanRelative } from "@/lib/ban-dates";
import { toIso } from "@/lib/ban-player-stats";
import { guildIconPlaceholderDataUri, guildIconProxyUrl, isUsableGuildIconUrl } from "@/lib/guild-icon";
import { type BotBanEntry } from "@/components/BlacklistLivePanel";

export type LookupBlacklistedUser = {
  discord_id: string;
  discord_tag?: string | null;
  username?: string | null;
  reason: string | null;
  added_at?: string | null;
  last_ban_date?: string | null;
  license?: string | null;
  server_name?: string | null;
};

function mysqlBlacklistToBotBan(bl: LookupBlacklistedUser): BotBanEntry {
  return {
    identifiers: {
      discord: bl.discord_id ? `discord:${bl.discord_id}` : undefined,
      license: bl.license || undefined,
    },
    playerInfo: {
      name: bl.username || bl.discord_tag || bl.discord_id,
    },
    banDetails: {
      reason: bl.reason || "Listed on global blacklist",
      serverName: bl.server_name || "Global blacklist",
      addedAt: bl.added_at || bl.last_ban_date || undefined,
      type: "Global",
    },
  };
}

export type ServerBanHit = {
  id: string;
  server_id: string;
  server_name: string;
  server_icon_url?: string | null;
  reason: string;
  player_name?: string | null;
  banned_by?: string | null;
  mode?: string | null;
  created_at?: string | null;
  is_active?: boolean | number | string | null;
  screenshot_url?: string | null;
  license?: string | null;
  license2?: string | null;
  discord?: string | null;
  ban_json_id?: string | null;
};

function isServerBanActive(ban: ServerBanHit): boolean {
  const value = ban.is_active;
  return value !== false && value !== 0 && value !== "0";
}

export type LookupProfile = {
  player_name?: string | null;
  last_active?: string | null;
  license?: string | null;
  license2?: string | null;
  discord_id?: string | null;
};

export type LookupDiscord = {
  discord_id: string;
  username: string | null;
  display_name: string | null;
  avatar: string | null;
  avatar_url?: string | null;
  avatar_data_url?: string | null;
  connected_at: string | null;
  bio: string | null;
};

export type CheatServerHit = {
  guild_id: string;
  guild_name: string;
  guild_icon_url?: string | null;
  roles: string[];
  display_name?: string | null;
  nickname?: string | null;
  username?: string | null;
  joined_at?: string | null;
  /** Currently in the cheat server. */
  member?: boolean;
  /** Still listed after leaving (stored sighting). */
  historical?: boolean;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
};

export type CheatServerMembership = {
  checked: boolean;
  in_cheat_discord: boolean;
  member_count: number;
  configured_count: number;
  servers: CheatServerHit[];
  main_guild_roles?: string[];
  offline?: boolean;
  error?: string | null;
  /** True when loaded from local history cache only (live scan still running). */
  partial?: boolean;
  /** Live scan could not finish (self-bot offline, etc.) — do not treat as "not in servers". */
  scan_incomplete?: boolean;
  self_bot_offline?: boolean;
};

export type CheatIntelTicket = {
  ticket_id: string;
  guild_id: string;
  guild_name: string;
  guild_icon_url?: string | null;
  channel_name: string;
  opened_at?: string | null;
  last_message_at?: string | null;
};

export type CheatIntelReaction = {
  emoji: string;
  emoji_id?: string | null;
  count: number;
};

export type CheatIntelMessage = {
  message_id: string;
  guild_id: string;
  guild_name: string;
  guild_icon_url?: string | null;
  channel_id: string;
  channel_name: string;
  content: string;
  sent_at: string;
  flagged?: boolean;
  reactions?: CheatIntelReaction[];
};

export type CheatIntelIdentifier = {
  type: string;
  value: string;
  guild_id: string;
  guild_name: string;
  guild_icon_url?: string | null;
  captured_at?: string | null;
};

export type CheatServerIntel = {
  ticket_count: number;
  message_count: number;
  identifier_count: number;
  flagged_message_count: number;
  first_message_at?: string | null;
  last_message_at?: string | null;
  tickets: CheatIntelTicket[];
  messages: CheatIntelMessage[];
  identifiers: CheatIntelIdentifier[];
};

type BanRow = {
  id: string;
  serverName: string;
  reason: string;
  mode?: string | null;
  date?: string | null;
  screenshot?: string | null;
  shortId: string;
  isActive?: boolean;
  source: "server" | "bot" | "global";
  guildId?: string | null;
  guildIconUrl?: string | null;
};

function cleanBanServerName(name: string): string {
  const raw = String(name || "").trim();
  if (!raw) return "Unknown server";
  const first = raw.replace(/^>\s*/, "").split(",")[0]?.trim();
  return first || raw;
}

function formatBlacklistDisplayReason(
  reason?: string | null,
  botBans: BotBanEntry[] = [],
): string | null {
  for (const b of botBans) {
    const r = String(b.banDetails?.reason || "").trim();
    const core = r.replace(/\s*\(time:\s*[^)]+\)\s*$/i, "").trim();
    if (core && !/^no reason provided$/i.test(core)) return r;
  }
  const raw = String(reason || "").trim();
  if (!raw) return null;
  const core = raw.replace(/\s*\(time:\s*[^)]+\)\s*$/i, "").trim();
  if (!core || /^no reason provided$/i.test(core)) return null;
  return raw;
}

function BanServerIcon({
  guildId,
  guildIconUrl,
  serverName,
}: {
  guildId?: string | null;
  guildIconUrl?: string | null;
  serverName: string;
}) {
  const initial = cleanBanServerName(serverName).charAt(0).toUpperCase() || "S";
  const gid = String(guildId || "").trim();
  const placeholder =
    /^\d{17,20}$/.test(gid) ? guildIconPlaceholderDataUri(gid, initial) : null;
  const proxyUrl = guildIconProxyUrl(guildId, { size: 128, label: initial });
  const [src, setSrc] = useState<string | null>(() => {
    if (isUsableGuildIconUrl(guildIconUrl)) return guildIconUrl!;
    return proxyUrl || placeholder;
  });

  useEffect(() => {
    if (isUsableGuildIconUrl(guildIconUrl)) {
      setSrc(guildIconUrl!);
      return;
    }
    setSrc(proxyUrl || placeholder);
  }, [guildIconUrl, proxyUrl, placeholder]);

  if (!src) {
    return (
      <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="h-9 w-9 rounded-lg object-cover shrink-0 mt-0.5 ring-1 ring-white/10 bg-white/5"
      referrerPolicy="no-referrer"
      onError={() => {
        if (isUsableGuildIconUrl(guildIconUrl) && src === guildIconUrl && proxyUrl) {
          setSrc(proxyUrl);
          return;
        }
        if (placeholder && src !== placeholder) setSrc(placeholder);
      }}
    />
  );
}

function shortId(id: string): string {
  const s = String(id || "").replace(/-/g, "");
  return s.length >= 8 ? s.slice(0, 8) : s || "—";
}

function normalizeLicenseValue(value?: string | null, kind: "license" | "license2" = "license"): string | null {
  const raw = String(value || "").trim();
  if (!raw || /^not provided$/i.test(raw)) return null;
  const prefix = kind === "license2" ? "license2:" : "license:";
  if (/^license2?:/i.test(raw)) return raw;
  if (/^[a-f0-9]{40}$/i.test(raw)) return `${prefix}${raw.toLowerCase()}`;
  return raw;
}

function formatDate(iso?: string | null): string {
  const normalized = toIso(iso);
  if (!normalized) return "—";
  return formatBanDateTime(normalized);
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function pickLookupDiscordName(dc: LookupDiscord | null | undefined): string | null {
  if (!dc) return null;
  const display = String(dc.display_name || "").trim();
  const user = String(dc.username || "").trim();
  if (display && !/^\d{17,19}$/.test(display)) return display;
  if (user && !/^\d{17,19}$/.test(user)) return user;
  return null;
}

function discordCreatedFromSnowflake(id?: string | null): string | null {
  if (!id || !/^\d{17,19}$/.test(id)) return null;
  try {
    const ms = Number(BigInt(id) >> 22n) + 1420070400000;
    return formatDate(new Date(ms).toISOString());
  } catch {
    return null;
  }
}

function computeReputation(isBlacklisted: boolean, serverBans: number, botBans: number): {
  pct: number;
  label: string;
  color: string;
} {
  let score = 100;
  if (isBlacklisted) score -= 55;
  score -= Math.min(35, serverBans * 7);
  score -= Math.min(25, botBans * 8);
  if ((serverBans > 0 || botBans > 0) && score >= 80) score = 79;
  score = Math.max(5, Math.min(100, score));
  if (score >= 80) return { pct: score, label: "Good reputation", color: "#22c55e" };
  if (score >= 50) return { pct: score, label: "Low reputation", color: "#eab308" };
  if (score >= 25) return { pct: score, label: "Very low reputation", color: "#ef4444" };
  return { pct: score, label: "Critical reputation", color: "#dc2626" };
}

function IdentifierChip({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon: React.ReactNode;
}) {
  const v = value?.trim();
  return (
    <button
      type="button"
      disabled={!v}
      onClick={() => {
        if (!v) return;
        navigator.clipboard.writeText(v).then(
          () => toast.success(`${label} copied`),
          () => toast.error("Copy failed"),
        );
      }}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors min-w-0",
        v
          ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200"
          : "border-white/5 bg-white/[0.02] text-slate-600 cursor-not-allowed",
      )}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="font-medium">{label}</span>
      {v ? (
        <span className="ml-1 truncate font-mono text-[10px] opacity-60 max-w-[5.5rem]">
          {v.replace(/^license2?:/i, "").slice(0, 8)}…
        </span>
      ) : null}
      {v ? <Copy className="h-3 w-3 ml-auto shrink-0 opacity-50" /> : null}
    </button>
  );
}

function ReputationRing({ pct, color }: { pct: number; color: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

function BanEntryRow({ ban }: { ban: BanRow }) {
  const [open, setOpen] = useState(false);
  const displayServerName = cleanBanServerName(ban.serverName);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-white/[0.08] bg-[#0a1018]/80 overflow-hidden">
        <CollapsibleTrigger className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-white/[0.03] transition-colors">
          <BanServerIcon
            guildId={ban.guildId}
            guildIconUrl={ban.guildIconUrl}
            serverName={ban.serverName}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-white truncate">{displayServerName}</p>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-slate-500">{ban.shortId}</span>
                <ChevronDown
                  className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")}
                />
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-1 line-clamp-1 break-words">
              {ban.mode ? `${ban.mode} · ` : ""}
              {ban.reason}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 text-right">
              {ban.date ? (
                <>
                  <span className="whitespace-nowrap">{formatBanDateTime(ban.date)}</span>
                  <span className="block text-[10px] text-slate-600">{formatBanRelative(ban.date)}</span>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-white/[0.06] mt-0">
            <div className="pt-3 space-y-2 text-sm">
              <p className="text-slate-300 break-words">{ban.reason}</p>
              {ban.mode ? <p className="text-xs text-slate-500">Mode: {ban.mode}</p> : null}
              {!ban.isActive && ban.source === "server" ? (
                <p className="text-xs text-amber-500/90">Inactive / unbanned on server</p>
              ) : null}
            </div>
            {ban.screenshot ? (
              <div className="mt-3 rounded-lg overflow-hidden border border-white/[0.08] relative bg-black/40">
                <img src={ban.screenshot} alt="Ban evidence" className="w-full max-h-72 object-contain" />
                <button
                  type="button"
                  className="absolute top-2 right-2 h-8 w-8 rounded-md bg-black/60 flex items-center justify-center text-slate-300"
                  aria-label="More"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function RolePills({ roles }: { roles: string[] }) {
  if (!roles.length) {
    return <span className="text-xs text-slate-500">No roles</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {roles.map((role) => (
        <span
          key={role}
          className="inline-flex items-center rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-200"
        >
          {role}
        </span>
      ))}
    </div>
  );
}

function CheatServerScanProgress() {
  const [value, setValue] = useState(12);

  useEffect(() => {
    const id = window.setInterval(() => {
      setValue((v) => {
        if (v >= 90) return 18;
        return v + 6 + Math.random() * 10;
      });
    }, 450);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-300 mb-2.5">
        <Loader2 className="h-4 w-4 animate-spin shrink-0 text-sky-400" />
        Scanning cheat Discord servers…
      </div>
      <Progress value={value} className="h-1.5 bg-white/10 [&>div]:bg-sky-500" />
      <p className="text-[11px] text-slate-500 mt-2">Checking membership across monitored servers</p>
    </div>
  );
}

export const PlayerLookupDashboard = memo(function PlayerLookupDashboard({
  profile,
  discord,
  cheatServers: cheatServersProp,
  cheatServersLoading = false,
  cheatIntel = null,
  cheatIntelLoading = false,
  serverBans,
  botBans,
  isBlacklisted,
  blacklistedUser,
  blacklistedReason,
  proofs,
  skipDiscordEnrich = false,
  asuAs = null,
}: {
  profile?: LookupProfile | null;
  discord?: LookupDiscord | null;
  cheatServers?: CheatServerMembership | null;
  cheatServersLoading?: boolean;
  cheatIntel?: CheatServerIntel | null;
  cheatIntelLoading?: boolean;
  serverBans: ServerBanHit[];
  botBans: BotBanEntry[];
  isBlacklisted: boolean;
  blacklistedUser?: LookupBlacklistedUser | null;
  blacklistedReason?: string | null;
  proofs: { proof_url: string | null; server_name: string | null }[];
  skipDiscordEnrich?: boolean;
  asuAs?: any;
}) {
  const displayId = profile?.discord_id || discord?.discord_id || null;

  const [resolvedDiscord, setResolvedDiscord] = useState<LookupDiscord | null>(null);
  const [cheatServers, setCheatServers] = useState<CheatServerMembership | null>(
    cheatServersProp ?? null,
  );
  const [avatarKey, setAvatarKey] = useState(0);

  useEffect(() => {
    setResolvedDiscord(null);
  }, [displayId]);

  useEffect(() => {
    setCheatServers(cheatServersProp ?? null);
  }, [cheatServersProp]);

  useEffect(() => {
    if (!displayId || !/^\d{17,19}$/.test(displayId)) return;

    const hasName = Boolean(pickLookupDiscordName(discord));
    if (skipDiscordEnrich && hasName) return;

    let cancelled = false;
    fetch(`/api/public/discord-profile/${displayId}?light=1`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const name = pickLookupDiscordName({
          discord_id: String(data.discord_id || displayId),
          username: data.username ?? null,
          display_name: data.display_name ?? null,
          avatar: data.avatar ?? null,
          avatar_url: data.avatar_url ?? null,
          connected_at: data.connected_at ?? null,
          bio: data.bio ?? null,
        });
        if (!name && !data.avatar_url) return;
        setResolvedDiscord({
          discord_id: String(data.discord_id || displayId),
          username: data.username ?? null,
          display_name: data.display_name ?? null,
          avatar: data.avatar ?? null,
          avatar_url: data.avatar_url ?? null,
          avatar_data_url: data.avatar_data_url ?? null,
          connected_at: data.connected_at ?? null,
          bio: data.bio ?? null,
        });
        if (data.cheat_servers) {
          setCheatServers(data.cheat_servers as CheatServerMembership);
        }
        setAvatarKey((k) => k + 1);
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [displayId, skipDiscordEnrich, discord?.username, discord?.display_name]);

  const effectiveDiscord = resolvedDiscord || discord;

  const avatarUrl = useMemo(() => {
    if (!displayId) return null;
    return pickLookupAvatarSrc(
      displayId,
      effectiveDiscord?.avatar,
      effectiveDiscord?.avatar_url,
      avatarKey,
      effectiveDiscord?.avatar_data_url,
    );
  }, [
    displayId,
    effectiveDiscord?.avatar,
    effectiveDiscord?.avatar_url,
    effectiveDiscord?.avatar_data_url,
    avatarKey,
  ]);

  const liveBotBans = useMemo(() => {
    const list: BotBanEntry[] = [...botBans];
    if (isBlacklisted && blacklistedUser) {
      const mysqlBan = mysqlBlacklistToBotBan(blacklistedUser);
      const exists = list.some(
        (b) =>
          b.banDetails?.serverName === mysqlBan.banDetails?.serverName &&
          b.banDetails?.reason === mysqlBan.banDetails?.reason,
      );
      if (!exists) {
        list.push(mysqlBan);
      }
    }
    return list;
  }, [botBans, isBlacklisted, blacklistedUser]);

  const activeServerBans = useMemo(
    () => serverBans.filter(isServerBanActive),
    [serverBans],
  );

  const blacklistDisplayReason = useMemo(
    () => formatBlacklistDisplayReason(blacklistedReason, liveBotBans),
    [blacklistedReason, liveBotBans],
  );

  const playerName = useMemo(() => {
    const botName = liveBotBans[0]?.playerInfo?.name;
    const cleanBotName =
      botName && !/^\d{17,19}$/.test(String(botName)) ? String(botName) : null;
    const blName =
      blacklistedUser?.username && !/^\d{17,19}$/.test(String(blacklistedUser.username))
        ? String(blacklistedUser.username)
        : null;
    const discordName = pickLookupDiscordName(effectiveDiscord);
    const profileName =
      profile?.player_name && !/^\d{17,19}$/.test(String(profile.player_name))
        ? String(profile.player_name)
        : null;
    return profileName || discordName || cleanBotName || blName || "Unknown player";
  }, [
    profile?.player_name,
    liveBotBans,
    blacklistedUser?.username,
    effectiveDiscord?.display_name,
    effectiveDiscord?.username,
  ]);

  const enrichedProfile = useMemo(() => {
    let license = normalizeLicenseValue(profile?.license, "license");
    let license2 = normalizeLicenseValue(profile?.license2, "license2");
    for (const b of activeServerBans) {
      if (!license) license = normalizeLicenseValue(b.license, "license");
      if (!license2) license2 = normalizeLicenseValue(b.license2, "license2");
    }
    for (const b of liveBotBans) {
      const ids = b.identifiers as Record<string, string | undefined> | undefined;
      if (!ids) continue;
      if (!license) license = normalizeLicenseValue(ids.license, "license");
      if (!license2) license2 = normalizeLicenseValue(ids.license2, "license2");
    }
    return {
      player_name: profile?.player_name ?? null,
      last_active: profile?.last_active ?? null,
      discord_id: displayId ?? profile?.discord_id ?? null,
      license,
      license2,
    };
  }, [profile, activeServerBans, liveBotBans, displayId]);

  const showCheatScanLoading = cheatServersLoading && !cheatServers?.partial;

  const showCheatOffline =
    !cheatServersLoading &&
    cheatServers !== null &&
    (cheatServers.offline || cheatServers.scan_incomplete) &&
    !cheatServers.in_cheat_discord;

  const showCheatNotIn =
    !cheatServersLoading &&
    cheatServers !== null &&
    cheatServers.checked === true &&
    !cheatServers.in_cheat_discord &&
    !cheatServers.offline &&
    !cheatServers.scan_incomplete;

  const reputation = useMemo(
    () => computeReputation(isBlacklisted, activeServerBans.length, liveBotBans.length),
    [isBlacklisted, activeServerBans.length, liveBotBans.length],
  );

  const guildIconById = useMemo(() => {
    const map = new Map<string, string>();
    for (const srv of cheatServers?.servers ?? []) {
      const gid = String(srv.guild_id || "").trim();
      if (gid && srv.guild_icon_url) map.set(gid, srv.guild_icon_url);
    }
    return map;
  }, [cheatServers]);

  const allBans: BanRow[] = useMemo(() => {
    const rows: BanRow[] = [];
    for (const b of activeServerBans) {
      rows.push({
        id: b.id,
        serverName: b.server_name,
        reason: b.reason,
        mode: b.mode || b.banned_by,
        date: toIso(b.created_at) || null,
        screenshot: b.screenshot_url,
        shortId: shortId(b.ban_json_id || b.id),
        isActive: isServerBanActive(b),
        source: "server",
        guildId: null,
        guildIconUrl: b.server_icon_url || null,
      });
    }
    liveBotBans.forEach((b, i) => {
      const guildId = b.banDetails?.guildId ? String(b.banDetails.guildId) : null;
      rows.push({
        id: `bot-${i}`,
        serverName: b.banDetails?.serverName || "Global blacklist",
        reason: b.banDetails?.reason || blacklistedReason || "Blacklisted",
        mode: b.banDetails?.type || "Bot",
        date: toIso(b.banDetails?.addedAt) || null,
        screenshot:
          b.banDetails?.screenshotUrls?.[0] ||
          (b.banDetails?.screenshotUrl !== "no-image" ? b.banDetails?.screenshotUrl : null) ||
          null,
        shortId: shortId(b.identifiers?.discord || String(i)),
        isActive: true,
        source: "bot",
        guildId,
        guildIconUrl:
          b.banDetails?.guild_icon_url ||
          (guildId ? guildIconById.get(guildId) || null : null),
      });
    });
    if (isBlacklisted && rows.length === 0) {
      rows.push({
        id: "global-bl",
        serverName: "Global blacklist",
        reason: blacklistedReason || "Listed on VexShield global blacklist",
        mode: "Blacklist",
        date: null,
        screenshot: proofs[0]?.proof_url,
        shortId: "global",
        isActive: true,
        source: "global",
      });
    }
    return rows;
  }, [activeServerBans, liveBotBans, isBlacklisted, blacklistedReason, proofs, guildIconById]);

  const discordCreated = discordCreatedFromSnowflake(displayId);
  const discordUsername = pickLookupDiscordName(effectiveDiscord) || "—";
  const cheatMessages = cheatIntel?.messages ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Card className="overflow-hidden rounded-xl border-white/[0.08] bg-[#080b0f]/92 shadow-2xl shadow-black/30">
          <div className="h-20 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.55),transparent_35%),linear-gradient(135deg,#0a2a4c,#07090d_65%)]" />
          <div className="px-4 pb-4">
            <img
              key={`${displayId}-${avatarKey}`}
              src={avatarUrl || ""}
              alt=""
              referrerPolicy="no-referrer"
              className="-mt-8 h-16 w-16 rounded-full border-4 border-[#080b0f] object-cover bg-white/5"
              onError={(e) => {
                if (!displayId) return;
                const el = e.target as HTMLImageElement;
                const proxy = `/api/public/discord-avatar/${displayId}?size=256&retry=${Date.now()}`;
                if (!el.src.includes("/api/public/discord-avatar/")) el.src = proxy;
              }}
            />
            <h2 className="mt-3 truncate text-lg font-bold text-white">{playerName}</h2>
            <p className="truncate text-xs text-slate-500">{discordUsername}</p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-slate-500">ID</span>
                <button
                  type="button"
                  className="flex max-w-[150px] items-center gap-1 truncate font-semibold text-slate-200"
                  onClick={() => {
                    if (!displayId) return;
                    navigator.clipboard.writeText(displayId).then(
                      () => toast.success("Discord ID copied"),
                      () => toast.error("Copy failed"),
                    );
                  }}
                >
                  <span className="truncate">{displayId || "—"}</span>
                  {displayId ? <Copy className="h-3 w-3 shrink-0 text-slate-500" /> : null}
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-slate-500">Created</span>
                <span className="text-right font-semibold text-slate-200">{discordCreated || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Active</span>
                <span className="text-right font-semibold text-slate-200">
                  {profile?.last_active ? formatDate(profile.last_active) : "—"}
                </span>
              </div>
            </div>

            {displayId ? (
              <a
                href={`https://discord.com/users/${displayId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-indigo-500 text-sm font-bold text-white transition hover:bg-indigo-400"
              >
                View Profile
              </a>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-xl border-white/[0.08] bg-[#080b0f]/92 p-4">
          <p className="text-center text-xs text-slate-500">Risk analysis available for premium users only</p>
          <p className="mt-1 text-center text-sm font-bold" style={{ color: reputation.color }}>
            Status: {reputation.pct >= 80 ? "Clean" : reputation.pct >= 50 ? "Low" : "High"}
          </p>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Risk Progress</span>
              <span>{100 - reputation.pct}%</span>
            </div>
            <Progress
              value={100 - reputation.pct}
              className={cn(
                "h-2 overflow-hidden bg-white/[0.06]",
                "[&>div]:transition-all [&>div]:duration-700",
                reputation.pct >= 80
                  ? "[&>div]:bg-emerald-400"
                  : reputation.pct >= 50
                    ? "[&>div]:bg-amber-400"
                    : "[&>div]:bg-red-500",
              )}
            />
          </div>
        </Card>

        <Card className="rounded-xl border-white/[0.08] bg-[#080b0f]/92 p-4">
          <p className="mb-3 text-xs font-semibold text-slate-400">Summary</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-white">{activeServerBans.length}</p>
              <p className="mt-1 text-[10px] leading-tight text-slate-500">AC Bans</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{cheatServers?.member_count || 0}</p>
              <p className="mt-1 text-[10px] leading-tight text-slate-500">Servers</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">
                {(cheatServers?.servers || []).reduce((n, srv) => n + (srv.roles?.length || 0), 0)}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-slate-500">Roles</p>
            </div>
          </div>
        </Card>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
          <div className="flex items-center justify-between gap-3">
            <span>Account Reputation</span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-xs">
              {reputation.pct >= 80 ? "Clean" : reputation.label}
            </span>
          </div>
        </div>
      </aside>

      <section className="min-w-0 space-y-5">
        {showCheatScanLoading ? <CheatServerScanProgress /> : null}

        <div>
          <h3 className="mb-2 text-sm font-bold text-white">
            Cheat Discords (Customer 100%) ({cheatServers?.member_count || 0})
          </h3>
          {showCheatOffline ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-200/90">
              {cheatServers?.self_bot_offline
                ? "Live cheat server scan unavailable — start BotBlacklistair on the VPS."
                : "Cheat server scan could not be completed."}
            </div>
          ) : cheatServers?.servers?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cheatServers.servers.map((srv) => (
                <div
                  key={srv.guild_id}
                  className="rounded-xl border border-white/[0.1] bg-[#090d13]/95 p-3 shadow-xl shadow-black/20"
                >
                  <div className="flex items-center gap-3">
                    {isUsableGuildIconUrl(srv.guild_icon_url) ? (
                      <img src={srv.guild_icon_url!} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <img
                        src={
                          guildIconProxyUrl(srv.guild_id, {
                            size: 128,
                            label: srv.guild_name?.charAt(0) || "S",
                          }) || guildIconPlaceholderDataUri(srv.guild_id, srv.guild_name?.charAt(0) || "S")
                        }
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{srv.guild_name}</p>
                      <p className="truncate font-mono text-[11px] text-slate-500">{srv.guild_id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : showCheatNotIn ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 px-4 py-3 text-sm text-emerald-300">
              Not in any configured cheat Discord servers
              {cheatServers?.configured_count ? ` (${cheatServers.configured_count} monitored)` : ""}
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#090d13]/80 px-4 py-3 text-sm text-slate-500">
              No cheat Discord data available.
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold text-white">
            Roles ({cheatServers?.servers?.length || 0} servers)
          </h3>
          {cheatServers?.servers?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {cheatServers.servers.map((srv) => {
                const isHistorical = !!srv.historical && srv.member === false;
                const icon =
                  guildIconProxyUrl(srv.guild_id, {
                    size: 128,
                    label: srv.guild_name?.charAt(0) || "S",
                  }) || guildIconPlaceholderDataUri(srv.guild_id, srv.guild_name?.charAt(0) || "S");
                return (
                  <div
                    key={srv.guild_id}
                    className={cn(
                      "rounded-xl border bg-[#090d13]/95 p-3 shadow-xl shadow-black/20",
                      isHistorical ? "border-amber-500/20" : "border-white/[0.1]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={isUsableGuildIconUrl(srv.guild_icon_url) ? srv.guild_icon_url! : icon}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{srv.guild_name}</p>
                        <p className="truncate font-mono text-[11px] text-slate-500">{srv.guild_id}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {isHistorical ? (
                            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              Previous
                            </span>
                          ) : null}
                          {srv.member !== false ? (
                            <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-300">
                              Member
                            </span>
                          ) : null}
                          {srv.roles.map((role) => (
                            <span
                              key={role}
                              className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-200"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {(cheatIntelLoading || cheatMessages.length > 0) ? (
          <div>
            <h3 className="mb-2 text-sm font-bold text-white">
              Cheat Server Messages ({cheatMessages.length})
            </h3>
            {cheatIntelLoading && cheatMessages.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#090d13]/80 px-4 py-3 text-sm text-slate-500">
                Loading cheat server messages...
              </div>
            ) : (
              <div className="grid gap-3">
                {cheatMessages.slice(0, 6).map((msg) => {
                  const icon =
                    guildIconProxyUrl(msg.guild_id, {
                      size: 128,
                      label: msg.guild_name?.charAt(0) || "S",
                    }) || guildIconPlaceholderDataUri(msg.guild_id, msg.guild_name?.charAt(0) || "S");
                  return (
                    <div
                      key={msg.message_id}
                      className={cn(
                        "rounded-xl border bg-[#090d13]/90 p-3 shadow-xl shadow-black/20",
                        msg.flagged ? "border-red-500/25" : "border-white/[0.08]",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={isUsableGuildIconUrl(msg.guild_icon_url) ? msg.guild_icon_url! : icon}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">{msg.guild_name}</p>
                              <p className="truncate text-[11px] text-slate-500">#{msg.channel_name}</p>
                            </div>
                            <span className="text-[11px] text-slate-600">
                              {formatBanRelative(msg.sent_at)}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-xs leading-5 text-slate-300">
                            {msg.content || "No message content stored"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {asuAs ? (
          <div>
            <h3 className="mb-3 text-sm font-bold text-white flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              Asuas Lookup
              {(asuAs.blacklist?.cached || asuAs.cheaters?.cached || asuAs.bans?.cached) && (
                <span className="ml-auto text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
                  Cached
                </span>
              )}
            </h3>
            <div className="rounded-xl border border-white/[0.1] bg-[#0a0f18] p-4 space-y-4">
              {/* Header with Avatar & Basic Info */}
              {displayId && (
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                  <img
                    src={avatarUrl || `/api/public/discord-avatar/${displayId}?size=128`}
                    alt="Discord Avatar"
                    className="w-14 h-14 rounded-full border-2 border-white/10 object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `/api/public/discord-avatar/${displayId}?size=128`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{playerName}</p>
                    <p className="text-xs text-slate-400 font-mono">{displayId}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                {/* Blacklist Status Card */}
                {asuAs.blacklist && (
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <Shield className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200">Blacklist Status</h4>
                    </div>
                    {asuAs.blacklist.success ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Found:</span>
                          <span className={`text-xs font-bold ${asuAs.blacklist.data?.found ? "text-red-400" : "text-green-400"}`}>
                            {asuAs.blacklist.data?.found ? "Yes" : "No"}
                          </span>
                        </div>
                        {asuAs.blacklist.data?.message && (
                          <p className="text-xs text-slate-400">{asuAs.blacklist.data.message}</p>
                        )}
                        {asuAs.blacklist.data?.commonServers && asuAs.blacklist.data.commonServers.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] text-slate-500 mb-1">Common Servers:</p>
                            <div className="flex flex-wrap gap-1">
                              {asuAs.blacklist.data.commonServers.map((server: any, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-300 border border-slate-600/30"
                                >
                                  {server}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {asuAs.blacklist.data?.errors && asuAs.blacklist.data.errors.length > 0 && (
                          <div className="mt-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                            <p className="text-[10px] text-amber-300 font-semibold mb-1">Info:</p>
                            {asuAs.blacklist.data.errors.map((err: any, i: number) => (
                              <p key={i} className="text-[10px] text-amber-400">
                                {err.error}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{asuAs.blacklist.error || "Failed to fetch blacklist status"}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Cheaters Lookup Card */}
                {asuAs.cheaters && (
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200">Cheaters Lookup</h4>
                    </div>
                    {asuAs.cheaters.success ? (
                      <div className="space-y-2">
                        {asuAs.cheaters.data ? (
                          typeof asuAs.cheaters.data === "string" ? (
                            <div className={`flex items-center gap-2 ${asuAs.cheaters.data.toLowerCase().includes("not flagged") ||
                                asuAs.cheaters.data.toLowerCase().includes("kein cheater") ||
                                asuAs.cheaters.data.toLowerCase().includes("no cheater")
                                ? "text-green-400"
                                : "text-red-400"
                              }`}>
                              <div className={`w-2 h-2 rounded-full ${asuAs.cheaters.data.toLowerCase().includes("not flagged") ||
                                  asuAs.cheaters.data.toLowerCase().includes("kein cheater") ||
                                  asuAs.cheaters.data.toLowerCase().includes("no cheater")
                                  ? "bg-green-500"
                                  : "bg-red-500"
                                }`} />
                              <p className="text-xs font-semibold">
                                {asuAs.cheaters.data}
                              </p>
                            </div>
                          ) : (
                            <pre className="text-[10px] text-slate-400 overflow-x-auto bg-black/20 p-2 rounded">
                              {JSON.stringify(asuAs.cheaters.data, null, 2)}
                            </pre>
                          )
                        ) : (
                          <p className="text-xs text-slate-400">No data available</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{asuAs.cheaters.error || "Failed to fetch cheaters data"}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bans Lookup Card */}
                {asuAs.bans && (
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Ban className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200">Bans Lookup</h4>
                    </div>
                    {asuAs.bans.success ? (
                      <div className="space-y-2">
                        {asuAs.bans.data ? (
                          typeof asuAs.bans.data === "string" ? (
                            <div className={`flex items-center gap-2 ${asuAs.bans.data.toLowerCase().includes("does not have an ac ban") ||
                                asuAs.bans.data.toLowerCase().includes("kein ban") ||
                                asuAs.bans.data.toLowerCase().includes("no ban")
                                ? "text-green-400"
                                : "text-red-400"
                              }`}>
                              <div className={`w-2 h-2 rounded-full ${asuAs.bans.data.toLowerCase().includes("does not have an ac ban") ||
                                  asuAs.bans.data.toLowerCase().includes("kein ban") ||
                                  asuAs.bans.data.toLowerCase().includes("no ban")
                                  ? "bg-green-500"
                                  : "bg-red-500"
                                }`} />
                              <p className="text-xs font-semibold">
                                {asuAs.bans.data}
                              </p>
                            </div>
                          ) : (
                            <pre className="text-[10px] text-slate-400 overflow-x-auto bg-black/20 p-2 rounded">
                              {JSON.stringify(asuAs.bans.data, null, 2)}
                            </pre>
                          )
                        ) : (
                          <p className="text-xs text-slate-400">No data available</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{asuAs.bans.error || "Failed to fetch bans data"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Additional Data: Events and Servers */}
              {(asuAs.events || asuAs.servers) && (
                <div className="space-y-4 mt-4">
                  {/* Events Card */}
                  {asuAs.events && (
                    <div className="rounded-xl border border-white/[0.08] bg-[#0a0f18] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Events</h4>
                          {Array.isArray(asuAs.events?.data) && asuAs.events?.data?.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              {asuAs.events?.data?.length} events found
                            </span>
                          )}
                        </div>
                      </div>

                      {asuAs.events.success ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {/* Debug: show raw data temporarily */}
                          <details className="text-[10px] text-slate-500 mb-2">
                            <summary className="cursor-pointer">Debug: Raw Response</summary>
                            <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                              {JSON.stringify(asuAs.events, null, 2)}
                            </pre>
                          </details>

                          {asuAs.events.data ? (
                            typeof asuAs.events.data === "string" ? (
                              <p className="text-sm text-slate-400">{asuAs.events.data}</p>
                            ) : Array.isArray(asuAs.events.data) && asuAs.events.data.length > 0 ? (
                              asuAs.events.data.map((event: any, i: number) => (
                                <div
                                  key={i}
                                  className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0">
                                      {event.type === "VOICE_JOIN" || event.type === "VOICE_LEAVE" ? (
                                        <Users className="w-3 h-3 text-slate-400" />
                                      ) : event.type?.includes("VIDEO") ? (
                                        <Shield className="w-3 h-3 text-slate-400" />
                                      ) : (
                                        <AlertTriangle className="w-3 h-3 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-200">
                                          {event.type?.replace(/_/g, " ") || "Unknown Event"}
                                        </p>
                                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                                          {event.timestamp
                                            ? new Date(event.timestamp).toLocaleString()
                                            : "N/A"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400 mt-1 truncate">
                                        {event.userName || event.userId || "Unknown User"}
                                      </p>
                                      {event.channelName && (
                                        <p className="text-[10px] text-slate-500 mt-1">
                                          Channel: {event.channelName}
                                        </p>
                                      )}
                                      {event.serverId && (
                                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                          {event.serverId}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : Array.isArray(asuAs.events.data?.data) ? (
                              asuAs.events.data.data.map((event: any, i: number) => (
                                <div
                                  key={i}
                                  className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0">
                                      {event.type === "VOICE_JOIN" || event.type === "VOICE_LEAVE" ? (
                                        <Users className="w-3 h-3 text-slate-400" />
                                      ) : event.type?.includes("VIDEO") ? (
                                        <Shield className="w-3 h-3 text-slate-400" />
                                      ) : (
                                        <AlertTriangle className="w-3 h-3 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-200">
                                          {event.type?.replace(/_/g, " ") || "Unknown Event"}
                                        </p>
                                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                                          {event.timestamp
                                            ? new Date(event.timestamp).toLocaleString()
                                            : "N/A"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400 mt-1 truncate">
                                        {event.userName || event.userId || "Unknown User"}
                                      </p>
                                      {event.channelName && (
                                        <p className="text-[10px] text-slate-500 mt-1">
                                          Channel: {event.channelName}
                                        </p>
                                      )}
                                      {event.serverId && (
                                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                          {event.serverId}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-sm text-slate-500">No events available</p>
                              </div>
                            )
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-sm text-slate-500">No events available</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-amber-400 py-6">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{asuAs.events.error || "Failed to fetch events data"}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Servers Card */}
                  {asuAs.servers && (
                    <div className="rounded-xl border border-white/[0.08] bg-[#0a0f18] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Servers</h4>
                          {Array.isArray(asuAs.servers?.data) && asuAs.servers?.data?.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              {asuAs.servers?.data?.length} servers found
                            </span>
                          )}
                        </div>
                      </div>

                      {asuAs.servers.success ? (
                        <div className="space-y-2">
                          {/* Debug: show raw data temporarily */}
                          <details className="text-[10px] text-slate-500 mb-2">
                            <summary className="cursor-pointer">Debug: Raw Response</summary>
                            <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                              {JSON.stringify(asuAs.servers, null, 2)}
                            </pre>
                          </details>

                          <div className="grid gap-3 sm:grid-cols-2 max-h-96 overflow-y-auto">
                            {asuAs.servers.data ? (
                              typeof asuAs.servers.data === "string" ? (
                                <div className="col-span-2 text-center py-6">
                                  <p className="text-sm text-slate-400">{asuAs.servers.data}</p>
                                </div>
                              ) : Array.isArray(asuAs.servers.data) && asuAs.servers.data.length > 0 ? (
                                asuAs.servers.data.map((server: any, i: number) => (
                                  <div
                                    key={i}
                                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* Server Icon */}
                                      <div className="shrink-0">
                                        {server.icon ? (
                                          <img
                                            src={server.icon}
                                            alt=""
                                            className="w-12 h-12 rounded-lg object-cover border border-white/[0.06]"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const fallback = target.nextElementSibling as HTMLElement;
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                        ) : null}
                                        <div
                                          className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-white/[0.06] flex items-center justify-center text-white font-bold"
                                          style={{ display: server.icon ? 'none' : 'flex' }}
                                        >
                                          {(server.name || server.id || "S").charAt(0).toUpperCase()}
                                        </div>
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white truncate">
                                          {server.name || server.id || "Unknown Server"}
                                        </p>

                                        <div className="flex items-center gap-2 mt-1">
                                          <p className="text-[10px] text-slate-500 font-mono truncate">
                                            {server.id}
                                          </p>
                                          {server.memberCount !== undefined && server.memberCount !== null && (
                                            <p className="text-[10px] text-slate-500">
                                              • {server.memberCount.toLocaleString()} members
                                            </p>
                                          )}
                                        </div>

                                        {server.joinedAt && (
                                          <p className="text-[10px] text-slate-500 mt-1">
                                            Joined: {new Date(server.joinedAt).toLocaleDateString()}
                                          </p>
                                        )}

                                        {server.roles && Array.isArray(server.roles) && server.roles.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {server.roles.slice(0, 3).map((role: any, j: number) => (
                                              <span
                                                key={j}
                                                className="px-2 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-300 border border-slate-600/30"
                                                style={{ borderLeftColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined }}
                                              >
                                                {role.name || role.id}
                                              </span>
                                            ))}
                                            {server.roles.length > 3 && (
                                              <span className="px-2 py-0.5 bg-slate-700/30 rounded text-[10px] text-slate-400">
                                                +{server.roles.length - 3} roles
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : Array.isArray(asuAs.servers.data?.data) ? (
                                asuAs.servers.data.data.map((server: any, i: number) => (
                                  <div
                                    key={i}
                                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* Server Icon */}
                                      <div className="shrink-0">
                                        {server.icon ? (
                                          <img
                                            src={server.icon}
                                            alt=""
                                            className="w-12 h-12 rounded-lg object-cover border border-white/[0.06]"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const fallback = target.nextElementSibling as HTMLElement;
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                        ) : null}
                                        <div
                                          className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-white/[0.06] flex items-center justify-center text-white font-bold"
                                          style={{ display: server.icon ? 'none' : 'flex' }}
                                        >
                                          {(server.name || server.id || "S").charAt(0).toUpperCase()}
                                        </div>
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white truncate">
                                          {server.name || server.id || "Unknown Server"}
                                        </p>

                                        <div className="flex items-center gap-2 mt-1">
                                          <p className="text-[10px] text-slate-500 font-mono truncate">
                                            {server.id}
                                          </p>
                                          {server.memberCount !== undefined && server.memberCount !== null && (
                                            <p className="text-[10px] text-slate-500">
                                              • {server.memberCount.toLocaleString()} members
                                            </p>
                                          )}
                                        </div>

                                        {server.joinedAt && (
                                          <p className="text-[10px] text-slate-500 mt-1">
                                            Joined: {new Date(server.joinedAt).toLocaleDateString()}
                                          </p>
                                        )}

                                        {server.roles && Array.isArray(server.roles) && server.roles.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {server.roles.slice(0, 3).map((role: any, j: number) => (
                                              <span
                                                key={j}
                                                className="px-2 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-300 border border-slate-600/30"
                                                style={{ borderLeftColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : undefined }}
                                              >
                                                {role.name || role.id}
                                              </span>
                                            ))}
                                            {server.roles.length > 3 && (
                                              <span className="px-2 py-0.5 bg-slate-700/30 rounded text-[10px] text-slate-400">
                                                +{server.roles.length - 3} roles
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-2 text-center py-6">
                                  <p className="text-sm text-slate-500">No servers available</p>
                                </div>
                              )
                            ) : (
                              <div className="col-span-2 text-center py-6">
                                <p className="text-sm text-slate-500">No servers available</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-amber-400 py-6">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{asuAs.servers.error || "Failed to fetch servers data"}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {allBans.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-bold text-white">Recent Bans ({allBans.length})</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {allBans.map((ban) => (
                <div key={ban.id} className="rounded-xl border border-white/[0.08] bg-[#090d13]/80 p-3">
                  <div className="flex items-start gap-3">
                    <BanServerIcon
                      guildId={ban.guildId}
                      guildIconUrl={ban.guildIconUrl}
                      serverName={ban.serverName}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-white">{cleanBanServerName(ban.serverName)}</p>
                        {ban.mode && (
                          <span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400 border border-red-500/20">
                            {ban.mode}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{ban.reason}</p>
                      <p className="mt-2 text-[11px] text-slate-600">{ban.date ? formatBanRelative(ban.date) : "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
});
