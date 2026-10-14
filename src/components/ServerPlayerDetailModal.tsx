import { useEffect, useRef, useState, type ReactNode } from "react";
import { pickLookupAvatarSrc } from "@/lib/discord-avatar";
import { ChevronLeft,
  Clock,
  Layers,
  Monitor,
  Search,
  Wifi,
 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DiscordImage } from "@/components/DiscordImage";
import type { DiscordAvatarBatchMap } from "@/lib/discord-avatar-cache";
import { apiUrl } from "@/lib/api-base";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export type ServerPlayerDetail = {
  name: string;
  id: string;
  license: string;
  ip?: string;
  ping?: number;
  threatScore?: number;
  coords?: { x: number; y: number; z: number };
  identifiers?: string[];
  discordId?: string | null;
  rawData?: Record<string, unknown>;
};

function pickIdentifier(
  player: ServerPlayerDetail,
  kind: "license" | "discord" | "license2" | "ip",
): string | null {
  const ids = player.identifiers || [];
  const prefixes =
    kind === "license2"
      ? ["license2:"]
      : kind === "license"
        ? ["license:"]
        : kind === "discord"
          ? ["discord:"]
          : ["ip:"];
  for (const p of prefixes) {
    const hit = ids.find((i) => i.toLowerCase().startsWith(p));
    if (hit) return hit;
  }
  if (kind === "license" && player.license) return player.license;
  if (kind === "ip" && player.ip) return player.ip;
  if (kind === "discord" && player.discordId) return `discord:${player.discordId}`;
  return null;
}

function formatSession(player: ServerPlayerDetail): { label: string; duration: string } {
  const raw = player.rawData || {};
  const mins =
    typeof raw.session_minutes === "number"
      ? raw.session_minutes
      : typeof raw.playtime_minutes === "number"
        ? raw.playtime_minutes
        : null;
  if (mins == null) return { label: "Session", duration: "active" };
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0) {
    return {
      label: "Session",
      duration: `${h} hour${h === 1 ? "" : "s"} ${m} minute${m === 1 ? "" : "s"}`,
    };
  }
  return { label: "Session", duration: `${m} minute${m === 1 ? "" : "s"}` };
}

function SignalBars({ ping }: { ping?: number }) {
  const level =
    ping == null ? 3 : ping < 55 ? 4 : ping < 95 ? 3 : ping < 140 ? 2 : 1;
  const heights = ["h-[35%]", "h-[55%]", "h-[75%]", "h-full"];
  return (
    <span className="flex h-3.5 w-4 shrink-0 items-end gap-[2px]" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-[1px]", h, i < level ? "bg-[#4caf50]" : "bg-white/15")}
        />
      ))}
    </span>
  );
}

function IdentifierTile({
  label,
  value,
  icon,
  onCopy,
  className,
}: {
  label: string;
  value: string | null;
  icon: ReactNode;
  onCopy: (v: string, label: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => value && onCopy(value, label)}
      className={cn(
        "flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-md border border-white/15 bg-[#141722] px-2 py-3 transition-colors",
        value ? "hover:border-sky-400/40 hover:bg-[#1c2233]" : "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="text-slate-100">{icon}</span>
      <span className="text-[11px] font-semibold text-slate-200">{label}</span>
    </button>
  );
}

function PlayerMapPanel({ player }: { player: ServerPlayerDetail }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!player.coords) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const { x, y } = player.coords;
    const payload = {
      id: player.id,
      name: player.name,
      x,
      y,
      admin: false,
      inVehicle: false,
      threatScore: player.threatScore || 0,
    };

    const send = () => {
      iframe.contentWindow?.postMessage({ type: "updatePlayers", players: [payload] }, window.location.origin);
      iframe.contentWindow?.postMessage(
        { type: "focusPlayer", player: { id: player.id, name: player.name, x, y } },
        window.location.origin,
      );
    };

    send();
    const t = window.setTimeout(send, 400);
    return () => window.clearTimeout(t);
  }, [player.id, player.name, player.coords, player.threatScore]);

  return (
    <div className="relative h-full min-h-[380px] bg-[#0F1017]">
      <iframe
        ref={iframeRef}
        title="Player map"
        src="/map/index.html?embed=1"
        className="absolute inset-0 h-full w-full border-0"
      />
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/55 text-slate-300 backdrop-blur-sm"
          aria-label="Map back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/55 text-slate-300 backdrop-blur-sm"
          aria-label="Map layers"
        >
          <Layers className="h-3.5 w-3.5" />
        </button>
      </div>
      {!player.coords && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white/70">
          No location available
        </div>
      )}
    </div>
  );
}

function TrustScorePanel({
  open,
  serverId,
  player,
}: {
  open: boolean;
  serverId?: string;
  player: ServerPlayerDetail;
}) {
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<{
    score: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    setScore(null);
    setLoading(false);
  }, [open, serverId, player.id]);

  const riskTone =
    score?.riskLevel === "critical" || score?.riskLevel === "high"
      ? "destructive"
      : score?.riskLevel === "medium"
        ? "secondary"
        : "outline";

  return (
    <div className="mb-4 rounded-md border border-white/10 bg-[#141722] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">Trust Score</p>
        {score ? <Badge variant={riskTone}>{score.riskLevel}</Badge> : null}
      </div>
      {loading ? (
        <p className="mt-2 text-xs text-slate-400">Calculating player risk...</p>
      ) : score ? (
        <>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl font-bold text-white">{score.score}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${score.score}%` }} />
            </div>
          </div>
          {score.warnings?.length ? (
            <p className="mt-2 text-xs text-slate-300">{score.warnings.slice(0, 2).join(" · ")}</p>
          ) : (
            <p className="mt-2 text-xs text-slate-400">No major risk warnings found.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Trust score unavailable for this player.</p>
      )}
    </div>
  );
}

export function ServerPlayerDetailModal({
  open,
  onOpenChange,
  serverId,
  player,
  discordAvatars,
  onKick,
  onBan,
  onSpectate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId?: string;
  player: ServerPlayerDetail | null;
  discordAvatars: DiscordAvatarBatchMap;
  onKick: () => void;
  onBan: () => void;
  onSpectate: () => void;
}) {
  const [fetchedAvatar, setFetchedAvatar] = useState<string | null>(null);

  const batchAvatar =
    player?.discordId && discordAvatars[player.discordId]
      ? discordAvatars[player.discordId].avatar_data_url
      : null;

  const avatarDataUrl = fetchedAvatar || batchAvatar || null;

  useEffect(() => {
    if (!open || !player?.discordId) {
      setFetchedAvatar(null);
      return;
    }
    const id = player.discordId;
    let cancelled = false;
    fetch(`/api/public/discord-profile/${id}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.avatar_data_url?.startsWith("data:image/")) {
          setFetchedAvatar(data.avatar_data_url);
        } else {
          pickLookupAvatarSrc(id, data.avatar, data.avatar_url, 0, data.avatar_data_url);
          setFetchedAvatar(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, player?.discordId]);

  const copyValue = (value: string, label: string) => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  if (!player) return null;

  const license = pickIdentifier(player, "license");
  const discord = pickIdentifier(player, "discord");
  const license2 = pickIdentifier(player, "license2");
  const ip = pickIdentifier(player, "ip");
  const session = formatSession(player);

  const discordTileIcon = player.discordId ? (
    <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-indigo-400/30">
      <DiscordImage
        discordId={player.discordId}
        avatarDataUrl={avatarDataUrl}
        size={64}
        alt=""
        className="h-full w-full rounded-full"
        fallbackClassName="rounded-full h-full w-full"
      />
    </div>
  ) : (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C1.566 7.71.83 11.03 1.054 14.32a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.29-3.52-.524-6.83-2.59-9.923a.061.061 0 0 0-.031-.03z" />
    </svg>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-lg border border-white/15 bg-[#0F1017] p-0 text-white sm:max-w-[900px] w-[900px] max-w-[96vw] [&>button]:text-slate-300 [&>button]:hover:text-white">
        <DialogHeader className="sr-only">
          <DialogTitle>
            [{player.id}] {player.name}
          </DialogTitle>
          <DialogDescription>Player details and map</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[400px] grid-cols-1 lg:grid-cols-2">
          <div className="flex flex-col border-b border-white/10 p-4 lg:border-b-0 lg:border-r lg:border-white/10">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-bold leading-tight text-white">
                      [{player.id}] {player.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                      {session.label}{" "}
                      <span className="font-semibold text-emerald-400">{session.duration}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <SignalBars ping={player.ping} />
                    <Search className="h-4 w-4 text-sky-400" aria-hidden />
                  </div>
                </div>

                <TrustScorePanel open={open} serverId={serverId} player={player} />

                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-400">
                    Player Identifiers
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <IdentifierTile
                      label="License"
                      value={license}
                      icon={<span className="text-xl font-black text-amber-400">R</span>}
                      onCopy={copyValue}
                    />
                    <IdentifierTile
                      label="Discord"
                      value={discord}
                      icon={discordTileIcon}
                      onCopy={copyValue}
                    />
                    <IdentifierTile
                      label="License2"
                      value={license2}
                      icon={<span className="text-xl font-black text-amber-400">R</span>}
                      onCopy={copyValue}
                    />
                  </div>
                  <div className="mt-2">
                    <IdentifierTile
                      label="IP"
                      value={ip}
                      icon={<Wifi className="h-5 w-5" />}
                      onCopy={copyValue}
                      className="min-h-[56px] w-full"
                    />
                  </div>
                </div>

                <div className="mt-auto">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-400">
                    Player Actions
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onKick}
                      className="h-9 flex-1 rounded-md border-2 border-amber-400 bg-amber-400/10 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
                    >
                      Kick
                    </button>
                    <button
                      type="button"
                      onClick={onBan}
                      className="h-9 flex-1 rounded-md border-2 border-red-500 bg-red-500/20 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/30"
                    >
                      Ban
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onSpectate}
                    className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md border-2 border-sky-500/60 bg-sky-500/15 text-sm font-semibold text-sky-300 transition-colors hover:border-sky-400 hover:bg-sky-500/25"
                    aria-label="Open live stream"
                  >
                    <Monitor className="h-4 w-4" />
                    Live stream
                  </button>
                </div>

                {player.coords && (
                  <p className="mt-3 font-mono text-[11px] text-slate-300">
                    X: {player.coords.x.toFixed(2)} · Y: {player.coords.y.toFixed(2)} · Z:{" "}
                    {player.coords.z.toFixed(2)}
                  </p>
                )}
          </div>

          <PlayerMapPanel player={player} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
