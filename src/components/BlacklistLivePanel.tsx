import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, RefreshCw  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscordAvatar } from "@/components/DiscordAvatar";

export interface BotBanEntry {
  identifiers: {
    discord?: string;
    license?: string;
    steam?: string;
  };
  playerInfo?: {
    name?: string;
    ip?: string;
  };
  banDetails?: {
    reason?: string;
    serverName?: string;
    addedAt?: string;
    type?: string;
    guildId?: string;
    channelId?: string;
    channelName?: string;
    guild_icon_url?: string | null;
    screenshotUrls?: string[];
    videoUrls?: string[];
    screenshotUrl?: string;
    videoUrl?: string;
  };
}

export interface BlacklistLiveServer {
  id: string;
  name: string;
  icon?: string | null;
  nickname?: string | null;
  joinedAt?: string | null;
  roles?: Array<string | { id?: string; name?: string }>;
}

const FIELD_EMOJI = {
  userId: "🆔",
  username: "🛡️",
  reason: "⚙️",
  license: "🔑",
  server: "🌐",
  time: "🕒",
} as const;

function formatField(emoji: string, label: string, value: ReactNode) {
  return (
    <p className="text-[13px] leading-relaxed text-[#dbdee1]">
      <span className="opacity-90">{emoji}</span>{" "}
      <span className="text-[#b5bac1]">|</span>{" "}
      <span className="font-semibold text-white">{label}</span> {value}
    </p>
  );
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "unknown";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} minutes ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)} days ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function mediaFromBan(ban: BotBanEntry | null): string[] {
  if (!ban?.banDetails) return [];
  const d = ban.banDetails;
  const shots = d.screenshotUrls?.length
    ? d.screenshotUrls
    : d.screenshotUrl && d.screenshotUrl !== "no-image"
      ? [d.screenshotUrl]
      : [];
  const vids = d.videoUrls?.length
    ? d.videoUrls
    : d.videoUrl && d.videoUrl !== "no-video"
      ? [d.videoUrl]
      : [];
  return [...shots, ...vids].filter(Boolean);
}

function discordIdFromBan(ban: BotBanEntry | null): string | null {
  const raw = ban?.identifiers?.discord;
  if (!raw) return null;
  return String(raw).replace(/^discord:/i, "");
}

function licenseFromBan(ban: BotBanEntry | null): string {
  const lic = ban?.identifiers?.license;
  if (!lic || String(lic).toLowerCase() === "not provided") return "Not Provided";
  return lic.startsWith("license:") ? lic : `license:${lic}`;
}

interface BlacklistLivePanelProps {
  bans: BotBanEntry[];
  index: number;
  onIndexChange: (next: number) => void;
  onRefresh?: () => void;
  avatarUrl: string;
  displayId?: string | null;
  /** Discord login name for @mention (not snowflake). */
  discordHandle?: string | null;
  displayName?: string | null;
  fallbackReason?: string | null;
  fallbackServer?: string | null;
  fallbackAddedAt?: string | null;
  linkedServers?: BlacklistLiveServer[];
}

export function BlacklistLivePanel({
  bans,
  index,
  onIndexChange,
  onRefresh,
  avatarUrl,
  displayId,
  discordHandle,
  displayName,
  fallbackReason,
  fallbackServer,
  fallbackAddedAt,
  linkedServers = [],
}: BlacklistLivePanelProps) {
  const total = Math.max(1, bans.length);
  const safeIndex = bans.length ? Math.min(index, bans.length - 1) : 0;
  const ban = bans[safeIndex] ?? null;

  const discordId = discordIdFromBan(ban) || displayId || null;
  const playerName = ban?.playerInfo?.name || null;
  const playerIsSnowflake = playerName && /^\d{17,19}$/.test(playerName);
  const handle =
    discordHandle && !/^\d{17,19}$/.test(discordHandle)
      ? discordHandle
      : playerName && !playerIsSnowflake
        ? playerName
        : null;
  const reason = ban?.banDetails?.reason || fallbackReason || "No reason provided";
  const serverName = ban?.banDetails?.serverName || fallbackServer || "Unknown";
  const addedAt = ban?.banDetails?.addedAt || fallbackAddedAt;
  const media = mediaFromBan(ban);
  const memberServers = linkedServers.filter((s) => s?.id);

  return (
    <div className="rounded-xl overflow-hidden border border-[#1e1f22] bg-[#313338] shadow-xl">
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex gap-3 sm:gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
              ♻️ Blacklist Live ({safeIndex + 1}/{total})
            </h3>
            <div className="space-y-1.5">
              <div className="rounded-md bg-[#2a1215]/80 border border-red-900/40 px-3 py-2 font-mono text-[12px] text-red-200/95">
                - A new user has been added to the global blacklist.
              </div>
              <div className="rounded-md bg-[#2a1215]/80 border border-red-900/40 px-3 py-2 font-mono text-[12px] text-red-200/95">
                - If you were blacklisted by mistake or have any issues, please contact support and we
                will resolve it with you.
              </div>
            </div>
          </div>
          {discordId ? (
            <DiscordAvatar
              discordId={discordId}
              name={displayName || handle || undefined}
              size="lg"
              variant="rounded"
              className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-[#1e1f22] shrink-0"
            />
          ) : (
            <img
              src={avatarUrl}
              alt=""
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover ring-2 ring-[#1e1f22] shrink-0"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        <hr className="border-[#3f4147]" />

        <div className="space-y-2">
          {formatField(
            FIELD_EMOJI.userId,
            "User ID",
            discordId && handle ? (
              <span className="text-[#00a8fc] font-medium">@{handle}</span>
            ) : discordId ? (
              <span className="text-[#00a8fc] font-medium font-mono text-xs">{discordId}</span>
            ) : (
              <code className="text-[#e3e5e8] bg-[#1e1f22] px-1.5 py-0.5 rounded text-xs">no linked</code>
            )
          )}
          {formatField(
            FIELD_EMOJI.username,
            "Username",
            <code className="text-[#e3e5e8] bg-[#1e1f22] px-1.5 py-0.5 rounded text-xs break-all">
              {discordId || playerName || "Unknown"}
            </code>
          )}
          {displayName && displayName !== handle && (
            <p className="text-[13px] text-[#b5bac1]">
              Display name: <span className="text-white font-medium">{displayName}</span>
            </p>
          )}
          {formatField(
            FIELD_EMOJI.reason,
            "Reason",
            <code className="text-[#e3e5e8] bg-[#1e1f22] px-1.5 py-0.5 rounded text-xs break-all">
              {reason}
            </code>
          )}
          {formatField(
            FIELD_EMOJI.license,
            "License",
            <code className="text-[#e3e5e8] bg-[#1e1f22] px-1.5 py-0.5 rounded text-xs break-all">
              {licenseFromBan(ban)}
            </code>
          )}
          {formatField(
            FIELD_EMOJI.server,
            "Server",
            <code className="text-[#e3e5e8] bg-[#1e1f22] px-1.5 py-0.5 rounded text-xs break-all">
              {serverName}
            </code>
          )}
        </div>

        {media.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {media.map((url) => {
              const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
              return (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg overflow-hidden border border-[#3f4147] bg-[#1e1f22] aspect-video"
                >
                  {isVideo ? (
                    <video src={url} className="w-full h-full object-cover" controls muted />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </a>
              );
            })}
          </div>
        )}

        <hr className="border-[#3f4147]" />

        {formatField(FIELD_EMOJI.time, "Time", <span className="text-[#b5bac1]">{relativeTime(addedAt)}</span>)}

        {memberServers.length > 0 && (
          <>
            <hr className="border-[#3f4147]" />
            <p className="text-sm font-bold text-white">🎮 Servers ({memberServers.length})</p>
            <div className="space-y-3">
              {memberServers.map((s) => (
                <div key={s.id} className="flex gap-3 items-start">
                  <div className="min-w-0 flex-1 space-y-0.5 text-[13px] text-[#dbdee1]">
                    <p className="font-bold text-white">{s.name}</p>
                    <p>
                      <code className="text-xs bg-[#1e1f22] px-1.5 py-0.5 rounded text-[#e3e5e8]">{s.id}</code>
                    </p>
                    {s.nickname && (
                      <p>
                        Nickname: <span className="font-semibold text-white">{s.nickname}</span>
                      </p>
                    )}
                    <p className="text-[#b5bac1] text-xs">
                      {s.joinedAt
                        ? `Joined ${new Date(s.joinedAt).toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}`
                        : "Joined: unknown"}
                      {Array.isArray(s.roles) && s.roles.length > 0 && (
                        <>
                          {" "}
                          · Roles:{" "}
                          {s.roles
                            .slice(0, 8)
                            .map((r) => (typeof r === "object" && r ? r.name || r.id : r))
                            .filter(Boolean)
                            .join(", ")}
                        </>
                      )}
                    </p>
                  </div>
                  {s.icon ? (
                    <img
                      src={s.icon}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-[#3f4147]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#1e1f22] shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {bans.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2b2d31] border-t border-[#1e1f22]">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-9 w-9 bg-[#4e5058] hover:bg-[#6d6f78] border-0 text-white"
            disabled={safeIndex <= 0}
            onClick={() => onIndexChange(Math.max(0, safeIndex - 1))}
            aria-label="Previous ban"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-9 w-9 bg-[#4e5058] hover:bg-[#6d6f78] border-0 text-white"
            onClick={() => onRefresh?.()}
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-9 w-9 bg-[#4e5058] hover:bg-[#6d6f78] border-0 text-white"
            disabled={safeIndex >= bans.length - 1}
            onClick={() => onIndexChange(Math.min(bans.length - 1, safeIndex + 1))}
            aria-label="Next ban"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
