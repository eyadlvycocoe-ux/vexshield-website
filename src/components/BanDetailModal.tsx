import { useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useIsDemoMode } from "@/demo/demoMode";
import { useBanPlayerEnrichment } from "@/hooks/useBanPlayerEnrichment";
import { getSearchPagePath } from "@/lib/search-route";
import { Calendar,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  Search,
  Shield,
  Trash2,
  User,
  Video,
 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DiscordImage } from "@/components/DiscordImage";
import type { DiscordAvatarBatchMap } from "@/lib/discord-avatar-cache";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BanRecord } from "@/pages/Bans";
import { formatBanDateTime, formatBanRelative } from "@/lib/ban-dates";

function formatPlaytime(minutes?: number): string {
  if (minutes == null || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function collectIdentifiers(ban: BanRecord): string[] {
  const out: string[] = [];
  const m = ban.metadata || {};
  const push = (v?: string) => {
    if (v && !out.includes(v)) out.push(v);
  };
  push(m.steam?.startsWith("steam:") ? m.steam : m.steam ? `steam:${m.steam}` : undefined);
  push(m.discord?.startsWith("discord:") ? m.discord : m.discord ? `discord:${m.discord}` : undefined);
  push(m.fivem?.startsWith("fivem:") ? m.fivem : m.fivem ? `fivem:${m.fivem}` : undefined);
  push(m.license);
  push(m.license2);
  push(m.xbl);
  return out;
}

function lookupQueryFromBan(ban: BanRecord): string {
  const m = ban.metadata || {};
  if (m.discord) return m.discord.replace(/^discord:/i, "");
  if (ban.discordId) return ban.discordId;
  if (m.license) return m.license.replace(/^license:/i, "");
  if (m.steam) return m.steam.replace(/^steam:/i, "");
  return ban.playerName;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}

export function BanDetailModal({
  open,
  onOpenChange,
  ban,
  discordAvatars,
  canEdit,
  onConfirmUnban,
  onConfirmCheatingBan,
  allBans = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ban: BanRecord | null;
  discordAvatars: DiscordAvatarBatchMap;
  canEdit: boolean;
  onConfirmUnban: (ban: BanRecord) => void;
  onConfirmCheatingBan?: (ban: BanRecord) => void;
  allBans?: BanRecord[];
}) {
  const navigate = useNavigate();
  const { serverId } = useParams();
  const { pathname } = useLocation();
  const isDemo = useIsDemoMode();
  const [unbanConfirmOpen, setUnbanConfirmOpen] = useState(false);
  const playerStats = useBanPlayerEnrichment(ban, open, serverId, allBans, isDemo);

  if (!ban) return null;

  const displayId = ban.displayBanId;
  const identifiers = collectIdentifiers(ban);
  const avatarUrl = ban.discordId ? discordAvatars[ban.discordId]?.avatar_data_url : null;
  const isPermanent = !ban.expiresAt;

  const copyValue = (value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const openLookup = () => {
    const q = lookupQueryFromBan(ban);
    onOpenChange(false);
    navigate(getSearchPagePath(serverId, pathname), {
      state: { prefilledQuery: q, autoSearch: true },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden border border-white/15 bg-[#0a0f1a] p-0 text-white sm:max-w-2xl [&>button]:text-slate-300 [&>button]:hover:text-white">
          <DialogHeader className="border-b border-white/10 px-6 py-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
              <div>
                <DialogTitle className="text-left text-lg font-bold text-white">
                  Ban Details — {displayId}
                </DialogTitle>
                <DialogDescription className="text-left text-slate-400">
                  Detailed information about this ban record
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="ban" className="w-full">
            <div className="border-b border-white/10 px-4">
              <TabsList className="h-auto w-full justify-start gap-1 rounded-none bg-transparent p-0">
                {(
                  [
                    { value: "ban", label: "Ban Infos", icon: Hash },
                    { value: "player", label: "Player Infos", icon: User },
                    { value: "identifiers", label: "Identifiers", icon: FileText },
                  ] as const
                ).map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn(
                      "gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm shadow-none",
                      "text-slate-400 data-[state=active]:border-sky-400 data-[state=active]:bg-sky-500/10 data-[state=active]:text-sky-300",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="max-h-[min(52vh,480px)] overflow-y-auto px-6 py-4">
              <TabsContent value="ban" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Ban ID" value={displayId} />
                  <InfoRow
                    label="Banned At"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-sky-400" />
                        {formatBanDateTime(ban.createdAt)}
                        <span className="text-slate-400">({formatBanRelative(ban.createdAt)})</span>
                      </span>
                    }
                  />
                  <InfoRow
                    label="Ban Expiration"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-red-400" />
                        {isPermanent ? (
                          <span className="text-red-400">Permanent</span>
                        ) : (
                          formatBanDateTime(ban.expiresAt!)
                        )}
                      </span>
                    }
                  />
                  <InfoRow label="Mode" value={ban.mode} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-400">Reason</p>
                  <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                    {ban.description}
                  </div>
                </div>
                {(ban.screenshot || ban.banClip) && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-300">Evidence</p>
                    {ban.screenshot && (
                      <div className="space-y-2">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          Screenshot
                          <a
                            href={ban.screenshot}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:text-sky-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </p>
                        <div className="overflow-hidden rounded-lg border border-white/15 bg-black/40">
                          <img
                            src={ban.screenshot}
                            alt="Ban screenshot"
                            className="max-h-56 w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {ban.banClip && (
                      <div className="space-y-2">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <Video className="h-3.5 w-3.5 text-sky-400" />
                          Ban clip
                          <a
                            href={ban.banClip}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:text-sky-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </p>
                        <div className="overflow-hidden rounded-lg border border-white/15 bg-black/40">
                          <video
                            src={ban.banClip}
                            controls
                            playsInline
                            preload="metadata"
                            className="max-h-56 w-full bg-black"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="player" className="mt-0 space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#121a28] p-3">
                  <DiscordImage
                    discordId={ban.discordId}
                    avatarDataUrl={avatarUrl}
                    alt={ban.playerName}
                    className="h-11 w-11 rounded-full"
                  />
                  <div>
                    <p className="font-semibold text-white">{ban.playerName}</p>
                    <p className="text-xs text-slate-400">{displayId}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Player Name" value={ban.playerName} />
                  <InfoRow
                    label="Play Time"
                    value={
                      playerStats.loading ? (
                        <span className="text-slate-400">Loading…</span>
                      ) : (
                        formatPlaytime(playerStats.playtimeMinutes)
                      )
                    }
                  />
                  <InfoRow
                    label="First Join"
                    value={
                      playerStats.loading ? (
                        <span className="text-slate-400">Loading…</span>
                      ) : playerStats.firstJoinAt ? (
                        <>
                          {formatBanDateTime(playerStats.firstJoinAt)}
                          <span className="ml-1 text-slate-400">
                            ({formatBanRelative(playerStats.firstJoinAt)})
                          </span>
                        </>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <InfoRow
                    label="Last Join"
                    value={
                      playerStats.lastJoinAt ? (
                        <>
                          {formatBanDateTime(playerStats.lastJoinAt)}
                          <span className="ml-1 text-slate-400">
                            ({formatBanRelative(playerStats.lastJoinAt)})
                          </span>
                        </>
                      ) : (
                        formatBanDateTime(ban.createdAt)
                      )
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="identifiers" className="mt-0 space-y-3">
                <p className="text-sm font-semibold text-white">Banned Identifiers</p>
                {identifiers.length === 0 ? (
                  <p className="text-sm text-slate-500">No identifiers recorded.</p>
                ) : (
                  <div className="space-y-2 rounded-lg border border-white/10 bg-[#0c121c] p-2">
                    {identifiers.map((id) => (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-2 font-mono text-xs text-slate-200 hover:bg-white/5"
                      >
                        <span className="truncate">{id}</span>
                        <button
                          type="button"
                          onClick={() => copyValue(id)}
                          className="shrink-0 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                          aria-label="Copy identifier"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-white/20 bg-transparent text-slate-200 hover:bg-white/10"
              >
                Close
              </Button>
              {onConfirmCheatingBan && (
                <Button
                  onClick={() => {
                    onConfirmCheatingBan(ban);
                  }}
                  className={cn(
                    "gap-2 font-semibold text-white transition-all shadow-md",
                    ban.metadata?.confirmed_cheating_ban
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  {ban.metadata?.confirmed_cheating_ban ? "Ban Confirmed 🟢" : "Confirm Cheating Ban"}
                </Button>
              )}
              <Button
                disabled={!canEdit}
                onClick={() => setUnbanConfirmOpen(true)}
                className="gap-2 border-2 border-red-500 bg-red-500/20 font-semibold text-red-300 hover:bg-red-500/35 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Unban Player
              </Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={unbanConfirmOpen} onOpenChange={setUnbanConfirmOpen}>
        <AlertDialogContent className="border border-sky-500/30 bg-[#0a0f1a] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Unban Player</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Are you sure you want to unban <span className="font-semibold text-white">{ban.playerName}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-sky-500/50 bg-transparent text-slate-200 hover:bg-sky-500/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 font-semibold text-white hover:bg-rose-400"
              onClick={() => {
                setUnbanConfirmOpen(false);
                onConfirmUnban(ban);
              }}
            >
              Unban Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
