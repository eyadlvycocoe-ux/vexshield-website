import { useState, useEffect, useMemo, useCallback, useRef, memo, lazy, Suspense } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getSearchPagePath } from "@/lib/search-route";
import { apiMutationHeaders, apiUrl, ensureMutationCsrf, isCsrfErrorMessage } from "@/lib/api-base";
import { useIsDemoMode } from "@/demo/demoMode";
import { makeDemoData } from "@/demo/demoData";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search,
  UserX,
  Shield,
  AlertTriangle,
  User,
  UserCheck,
  Eye,
  Trash2,
  Ban as BanIcon,
  Video,
  ExternalLink,
  Download,
  Loader2,
 } from "lucide-react";
import { DiscordImage } from "@/components/DiscordImage";
import { findDiscordSnowflakeInValue } from "@/lib/discord-avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FallingPapers } from "@/components/FallingPapers";
import { discordIdFromBanMetadata } from "@/lib/discord-avatar";
import { useDiscordAvatarsBatch } from "@/hooks/useDiscordAvatarsBatch";
import { useAdminPermissions, canEditPage } from "@/hooks/useAdminPermissions";
import { useTranslation } from "react-i18next";

const BanOfflineModal = lazy(() => import("@/components/BanOfflineModal").then((m) => ({ default: m.BanOfflineModal })));
const BanDetailModal = lazy(() => import("@/components/BanDetailModal").then((m) => ({ default: m.BanDetailModal })));
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { cn } from "@/lib/utils";
import {
  applyBanMetadataStats,
  extractBannedAtIso,
  extractBanClipUrl,
  extractBanScreenshotUrl,
  extractPlaytimeMinutes,
  extractFirstJoinIso,
  extractLastJoinIso,
  enrichBansWithHistory,
  sanitizeFirstJoinAt,
  toIso,
} from "@/lib/ban-player-stats";
import { formatBanDateTime, formatBanRelative } from "@/lib/ban-dates";

export interface BanRecord {
  id: string;
  banJsonId?: string;
  displayBanId: string;
  playerId?: string;
  discordId?: string | null;
  playerName: string;
  mode: string;
  server: string;
  type: string;
  description: string;
  screenshot?: string | null;
  banClip?: string | null;
  createdAt: string;
  date: string;
  time: string;
  playtimeMinutes?: number;
  firstJoinAt?: string;
  lastJoinAt?: string;
  expiresAt?: string | null;
  notes?: string;
  metadata?: {
    steam?: string;
    fivem?: string;
    discord?: string;
    xbl?: string;
    license?: string;
    license2?: string;
    [key: string]: unknown;
  };
}

function safeSearchText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** Format anticheat ban id — returns the plain number (e.g. 1, 42) since ban.json now uses numeric IDs. */
export function toDisplayBanId(raw?: string): string {
  const s = safeSearchText(raw).trim();
  if (!s) return "—";

  // Skip UUID-like strings — not a real ban ID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  if (isUuid) return "—";

  // Match Air-prefixed IDs: Air1, air-8, #Air60 → extract numeric part only
  const air = s.match(/air[-_#]?(\d+)/i);
  if (air) return String(parseInt(air[1], 10));

  // Plain numeric ID from ban.json (e.g. "1", "42") → return as-is
  const pureNum = s.match(/^(\d+)$/);
  if (pureNum) return String(parseInt(pureNum[1], 10));

  // Mixed string with digits (e.g. "ban_75")
  const digits = s.replace(/\D/g, "");
  if (digits && digits.length <= 8) return String(parseInt(digits, 10));

  // Short alphanumeric fallback
  const hex = s.replace(/[^a-z0-9]/gi, "").slice(-6);
  return hex || "—";
}

function formatPlaytime(minutes?: number): string {
  if (minutes == null || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `Played ${h}h ${m}m`;
  return `Played ${m}m`;
}

function lookupQueryFromBan(ban: BanRecord): string {
  const m = ban.metadata || {};
  if (m.discord) return String(m.discord).replace(/^discord:/i, "");
  if (ban.discordId) return ban.discordId;
  if (m.license) return String(m.license).replace(/^license:/i, "");
  return ban.playerName;
}

/** Numeric part of Air-style ban ids (#Air8, Air-60, ban_json_id). */
function extractBanNumericId(ban: BanRecord): string | null {
  for (const src of [ban.banJsonId, ban.displayBanId, ban.id]) {
    const s = safeSearchText(src);
    const air = s.match(/air[-_#]?(\d+)/i);
    if (air) return String(parseInt(air[1], 10));
  }
  return null;
}

/** Sort key: Air number ascending (8 before 60), else ban date. */
function airBanSortKey(ban: BanRecord): number {
  const num = extractBanNumericId(ban);
  if (num != null && /^\d+$/.test(num)) return parseInt(num, 10);
  const t = new Date(ban.createdAt).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

function parseBanListQuery(raw: string): { mode: "all" | "banId" | "text"; banId?: string; text?: string } {
  const q = raw.trim();
  if (!q) return { mode: "all" };

  const airMatch = q.match(/^#?air[-_]?(\d+)$/i);
  if (airMatch) return { mode: "banId", banId: airMatch[1] };

  const hashDigits = q.match(/^#(\d+)$/);
  if (hashDigits) return { mode: "banId", banId: hashDigits[1] };

  if (/^\d+$/.test(q)) return { mode: "banId", banId: q };

  return { mode: "text", text: q.toLowerCase() };
}

function banMatchesListSearch(ban: BanRecord, rawQuery: string): boolean {
  const parsed = parseBanListQuery(rawQuery);
  if (parsed.mode === "all") return true;

  if (parsed.mode === "banId" && parsed.banId != null) {
    const num = extractBanNumericId(ban);
    return num === parsed.banId;
  }

  const text = parsed.text!;
  const display = safeSearchText(ban.displayBanId).toLowerCase();
  const jsonId = safeSearchText(ban.banJsonId).toLowerCase();
  return (
    safeSearchText(ban.playerName).toLowerCase().includes(text) ||
    safeSearchText(ban.description).toLowerCase().includes(text) ||
    display.includes(text) ||
    jsonId.includes(text)
  );
}

export function mapRowToBanRecord(ban: Record<string, unknown>): BanRecord {
  let metadata: Record<string, unknown> = (ban.metadata as Record<string, unknown>) || {};
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }
  const banJsonId = String(metadata.ban_json_id || metadata.id || ban.id || "");
  const screenshot =
    extractBanScreenshotUrl(
      metadata,
      (ban.screenshot as string) || null,
    ) ?? null;
  const banClip = extractBanClipUrl(metadata) ?? null;
  const dbCreatedAt = toIso(ban.created_at);
  const createdAt = extractBannedAtIso(metadata, dbCreatedAt) ?? dbCreatedAt ?? new Date().toISOString();
  const discordId =
    discordIdFromBanMetadata(metadata, ban.player_id as string) ||
    findDiscordSnowflakeInValue(ban.metadata) ||
    findDiscordSnowflakeInValue(ban);

  const playtimeMinutes = extractPlaytimeMinutes(metadata, createdAt);
  const firstJoinAt = sanitizeFirstJoinAt(extractFirstJoinIso(metadata), createdAt);
  const lastJoinAt = extractLastJoinIso(metadata, createdAt);

  const record: BanRecord = {
    id: String(ban.id),
    banJsonId,
    displayBanId: toDisplayBanId(banJsonId || String(ban.id)),
    playerId: ban.player_id as string | undefined,
    discordId,
    playerName: safeSearchText(ban.player_name) || "Unknown",
    mode: String(ban.mode || "Anticheat"),
    server: String(ban.server_id || ""),
    type: String(ban.type || "ban"),
    description: String(ban.reason || "No reason provided"),
    screenshot,
    banClip,
    createdAt,
    date: new Date(createdAt).toLocaleDateString(),
    time: new Date(createdAt).toLocaleTimeString(),
    playtimeMinutes,
    firstJoinAt,
    lastJoinAt,
    expiresAt:
      (metadata.expires_at as string) ||
      (metadata.expiration as string) ||
      (metadata.expiresAt as string) ||
      null,
    notes: typeof metadata.notes === "string" ? metadata.notes : undefined,
    metadata: {
      ...metadata,
      steam: (metadata.steam as string) || (metadata.identifiers as { steam?: string })?.steam,
      fivem: (metadata.fivem as string) || (metadata.identifiers as { fivem?: string })?.fivem,
      discord: (metadata.discord as string) || (metadata.identifiers as { discord?: string })?.discord,
      xbl: (metadata.xbl as string) || (metadata.identifiers as { xbl?: string })?.xbl,
      license:
        (metadata.license as string) ||
        (metadata.identifiers as { license?: string })?.license ||
        (ban.player_id as string),
      license2:
        (metadata.license2 as string) || (metadata.identifiers as { license2?: string })?.license2,
      confirmed_cheating_ban: Boolean(metadata.confirmed_cheating_ban),
    },
  };
  return applyBanMetadataStats(record);
}

type BanRowProps = {
  ban: BanRecord;
  discordAvatar?: { avatar_data_url?: string };
  canEdit: boolean;
  permsLoading: boolean;
  onOpenDetails: (ban: BanRecord) => void;
  onPlayerLookup: (ban: BanRecord) => void;
  onUnban: (ban: BanRecord) => void;
  onConfirmCheatingBan: (ban: BanRecord) => void;
};

const BanRow = memo(function BanRow({
  ban,
  discordAvatar,
  canEdit,
  permsLoading,
  onOpenDetails,
  onPlayerLookup,
  onUnban,
  onConfirmCheatingBan,
}: BanRowProps) {
  const banDiscordId = ban.discordId;
  const playLabel = formatPlaytime(ban.playtimeMinutes);
  return (
    <TableRow className="border-white/10 hover:bg-sky-500/5">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-sky-500/40">
            <DiscordImage
              discordId={banDiscordId}
              avatarDataUrl={discordAvatar?.avatar_data_url}
              size={128}
              alt={ban.playerName}
              className="h-full w-full rounded-full"
              fallbackClassName="rounded-full h-full w-full"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-white">{ban.playerName}</p>
              {ban.discordId ? (
                <span className="inline-flex items-center gap-1 rounded bg-[#5865F2]/20 border border-[#5865F2]/40 px-1.5 py-0.5 text-[11px] font-medium text-[#7983f5]">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span>@{ban.playerName}</span>
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {ban.discordId ? (
                <span className="font-mono text-[11px] text-zinc-400">discord:{ban.discordId}</span>
              ) : null}
              {playLabel ? <span>• {playLabel}</span> : null}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="rounded-md border border-white/15 bg-[#121a28] px-2 py-1 font-mono text-xs text-slate-200">
          {ban.displayBanId}
        </span>
      </TableCell>
      <TableCell className="max-w-[200px]">
        <p className="truncate text-sm text-slate-200" title={ban.description}>
          {ban.description}
        </p>
      </TableCell>
      <TableCell>
        {ban.banClip ? (
          <a
            href={ban.banClip}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/20 transition-colors"
          >
            <Video className="h-3 w-3" />
            Ban clip
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        ) : ban.screenshot ? (
          <a
            href={ban.screenshot}
            target="_blank"
            rel="noreferrer"
            className="block h-10 w-16 overflow-hidden rounded border border-white/15"
          >
            <img
              src={ban.screenshot}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </a>
        ) : (
          <span className="text-xs text-slate-500">No evidence</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className="gap-1 border-red-500/50 bg-red-500/20 font-semibold text-red-300 hover:bg-red-500/20">
          <BanIcon className="h-3 w-3" />
          Permanent
        </Badge>
      </TableCell>
      <TableCell className="min-w-[9.5rem] text-sm text-slate-300">
        <div className="whitespace-nowrap">{formatBanDateTime(ban.createdAt)}</div>
        <div className="text-xs text-slate-500">{formatBanRelative(ban.createdAt)}</div>
      </TableCell>
      <TableCell className="min-w-[9.5rem] text-sm text-slate-300">
        {ban.firstJoinAt ? (
          <>
            <div className="whitespace-nowrap">{formatBanDateTime(ban.firstJoinAt)}</div>
            <div className="text-xs text-slate-500">{formatBanRelative(ban.firstJoinAt)}</div>
          </>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDetails(ban)}
            className="rounded-md p-1.5 text-slate-300 hover:bg-sky-500/15 hover:text-sky-300"
            aria-label="View ban details"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPlayerLookup(ban)}
            className="rounded-md p-1.5 text-slate-300 hover:bg-sky-500/15 hover:text-sky-300"
            aria-label="Player lookup"
            title="Player Lookup"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={permsLoading || !canEdit}
            onClick={() => onConfirmCheatingBan(ban)}
            title={ban.metadata?.confirmed_cheating_ban ? "Ban Confirmed & Posted to Discord Jail" : "Confirm Cheating Ban & Post to Discord Jail (💀・punishments)"}
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold transition-all shadow-sm",
              ban.metadata?.confirmed_cheating_ban
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                : "border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>{ban.metadata?.confirmed_cheating_ban ? "Confirmed 🟢" : "Confirm Ban"}</span>
          </button>
          <Button
            type="button"
            size="sm"
            disabled={permsLoading || !canEdit}
            onClick={() => onUnban(ban)}
            className="h-7 gap-1 rounded-md border border-red-500/40 bg-red-600/25 px-2 text-[11px] font-bold text-red-300 hover:bg-red-600 hover:text-white transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            title="Unban Player"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Unban Player</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default function Bans() {
  const { t } = useTranslation();
  const isDemo = useIsDemoMode();
  const navigate = useNavigate();
  const { serverId } = useParams();
  const { pathname } = useLocation();
  const { permissions, isOwner, isLoading: permsLoading } = useAdminPermissions();
  const canEditBans = isOwner || canEditPage(permissions, "bans");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"banIdAsc" | "banIdDesc" | "newest" | "oldest">(
    "banIdAsc",
  );
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [selectedBan, setSelectedBan] = useState<BanRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState<BanRecord | null>(null);
  const [importCode, setImportCode] = useState("");
  const [importing, setImporting] = useState(false);
  const loadInFlightRef = useRef(false);
  const loadGenerationRef = useRef(0);
  const liveReloadTimerRef = useRef<number | null>(null);
  const [connectedServer, setConnectedServer] = useState(() => {
    const raw = sessionStorage.getItem("connected_server");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "connected_server") {
        try {
          setConnectedServer(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setConnectedServer(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(() => {
      const raw = sessionStorage.getItem("connected_server");
      try {
        const current = raw ? JSON.parse(raw) : null;
        setConnectedServer((prev: any) => {
          if (JSON.stringify(prev) !== JSON.stringify(current)) {
            return current;
          }
          return prev;
        });
      } catch {
        setConnectedServer(null);
      }
    }, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadBans = useCallback(async () => {
    if (isDemo) return;
    const activeServerId = serverId || connectedServer?.server_id;

    if (!activeServerId) {
      setBans([]);
      return;
    }
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const generation = ++loadGenerationRef.current;

    try {
      const pageSize = 200;
      const allRows: Record<string, unknown>[] = [];
      let offset = 0;

      while (true) {
        const { data, error } = await supabase
          .from("bans")
          .select("*")
          .eq("server_id", activeServerId)
          .eq("is_active", 1)
          .order("created_at", { ascending: false })
          .limit(pageSize)
          .offset(offset);

        if (generation !== loadGenerationRef.current) return;

        if (error) {
          console.error("Error loading bans:", error);
          return;
        }

        const rawList = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
        const batch = rawList.filter((r) => r.type !== "discord_blacklist");
        allRows.push(...batch);
        if (rawList.length < pageSize) break;
        offset += pageSize;
      }

      if (generation === loadGenerationRef.current) {
        const mapped = allRows.map(mapRowToBanRecord);
        setBans(enrichBansWithHistory(mapped));
      }
    } finally {
      loadInFlightRef.current = false;
    }
  }, [isDemo, connectedServer, serverId]);

  useEffect(() => {
    if (isDemo) {
      const demo = makeDemoData();
      const formatted = demo.bans.map((b, i) => {
        const createdAt = b.createdAt;
        const firstJoin = new Date(createdAt);
        firstJoin.setMonth(firstJoin.getMonth() - (3 + (i % 8)));
        return {
          id: b.id,
          banJsonId: b.banJsonId,
          displayBanId: toDisplayBanId(b.banJsonId),
          playerId: b.playerId,
          playerName: b.playerName,
          mode: b.mode,
          server: b.server,
          type: b.type,
          description: b.description,
          screenshot: b.screenshot ?? null,
          createdAt,
          date: new Date(createdAt).toLocaleDateString(),
          time: new Date(createdAt).toLocaleTimeString(),
          playtimeMinutes: 45 + (i % 12) * 37,
          firstJoinAt: firstJoin.toISOString(),
          lastJoinAt: createdAt,
          expiresAt: null,
          metadata: b.metadata,
          discordId:
            b.metadata.discord?.replace(/^discord:/i, "") ||
            findDiscordSnowflakeInValue(b.metadata),
        } as BanRecord;
      });
      setBans(enrichBansWithHistory(formatted.map((b) => applyBanMetadataStats(b))));
      return;
    }
    
    loadBans();

    const currentServerId = connectedServer?.server_id;
    if (!currentServerId) {
      return;
    }

    const channel = supabase
      .channel("bans-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bans",
          filter: `server_id=eq.${currentServerId}`,
        },
        () => {
          if (liveReloadTimerRef.current !== null) {
            window.clearTimeout(liveReloadTimerRef.current);
          }
          liveReloadTimerRef.current = window.setTimeout(() => {
            liveReloadTimerRef.current = null;
            loadBans();
          }, 750);
        },
      )
      .subscribe();

    return () => {
      if (liveReloadTimerRef.current !== null) {
        window.clearTimeout(liveReloadTimerRef.current);
        liveReloadTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [isDemo, connectedServer, loadBans]);

  const { avatars: discordAvatars } = useDiscordAvatarsBatch(bans.map((b) => b.discordId));

  const handleUnban = async (ban: BanRecord) => {
    if (isDemo) {
      setBans((prev) => prev.filter((b) => b.id !== ban.id));
      setDetailModalOpen(false);
      setSelectedBan(null);
      setUnbanTarget(null);
      toast.success(`[Demo] Unbanned ${ban.playerName}`);
      return;
    }
    try {
      const connectedServerStr = sessionStorage.getItem("connected_server");
      const connectedServer = connectedServerStr ? JSON.parse(connectedServerStr) : null;
      const targetServerId = serverId || connectedServer?.server_id;
      const licenseKey = connectedServer?.license_key;

      const { error: cmdError } = await supabase.functions.invoke("server-command", {
        body: {
          server_id: targetServerId,
          license_key: licenseKey,
          command_type: "unban",
          command_data: {
            player_id: ban.metadata?.license || ban.playerId,
            ban_id: ban.banJsonId || ban.id,
            player_name: ban.playerName,
            license: ban.metadata?.license,
            fivem: ban.metadata?.fivem,
            discord: ban.metadata?.discord,
            steam: ban.metadata?.steam,
          },
        },
      });

      // Also deactivate directly in DB
      try {
        await supabase
          .from("bans")
          .update({ is_active: false })
          .eq("id", ban.id);
      } catch (dbErr) {
        console.warn("Direct DB ban update notice:", dbErr);
      }

      if (cmdError) {
        const msg = cmdError instanceof Error ? cmdError.message : String(cmdError);
        if (/csrf/i.test(msg)) {
          toast.error("Session security token expired — refresh the page or sign in again.");
        }
        throw cmdError;
      }

      setBans((prev) => prev.filter((b) => b.id !== ban.id));
      setDetailModalOpen(false);
      setSelectedBan(null);
      setUnbanTarget(null);
      toast.success(
        `Unbanned ${ban.playerName}. The server will apply the change within a second.`,
      );
    } catch (err) {
      console.error("Unban failed:", err);
      toast.error("Failed to send unban command");
    }
  };

  const handleConfirmCheatingBan = useCallback(
    async (ban: BanRecord) => {
      if (isDemo) {
        toast.success(`[Demo] Ban confirmed & posted for ${ban.playerName}`);
        setBans((prev) =>
          prev.map((b) =>
            b.id === ban.id
              ? { ...b, metadata: { ...(b.metadata || {}), confirmed_cheating_ban: true } }
              : b,
          ),
        );
        return;
      }
      try {
        const connectedServerStr = sessionStorage.getItem("connected_server");
        const connectedServer = connectedServerStr ? JSON.parse(connectedServerStr) : null;
        const activeServerId = serverId || connectedServer?.server_id;
        if (!activeServerId) {
          toast.error("No active server selected");
          return;
        }

        toast.loading(`Confirming ban & posting for ${ban.playerName}...`, { id: "confirm-cheating-ban" });

        await ensureMutationCsrf();

        const endpoint = apiUrl(`/servers/${activeServerId}/bans/${ban.id}/confirm-cheating-ban`);
        const payloadBody = JSON.stringify({
          clip_url: ban.banClip || ban.screenshot || ban.metadata?.ban_clip || ban.metadata?.clip_url || ban.metadata?.evidence || null,
        });

        let response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: apiMutationHeaders(),
          body: payloadBody,
        });

        if (response.status === 403) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = String(errData.error || "");
          if (isCsrfErrorMessage(errMsg)) {
            await ensureMutationCsrf();
            response = await fetch(endpoint, {
              method: "POST",
              credentials: "include",
              headers: apiMutationHeaders(),
              body: payloadBody,
            });
          }
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to confirm ban");
        }

        const updatedMetadata = {
          ...(ban.metadata || {}),
          confirmed_cheating_ban: true,
          confirmed_posted_at: new Date().toISOString(),
        };

        // Persist in Supabase DB so live reload or refetch keeps confirmed_cheating_ban: true
        try {
          await supabase
            .from("bans")
            .update({ metadata: updatedMetadata })
            .eq("id", ban.id);
        } catch (spErr) {
          console.warn("Supabase ban update warning:", spErr);
        }

        toast.success(
          `Ban for ${ban.playerName} confirmed & posted to Discord 💀・punishments!`,
          { id: "confirm-cheating-ban" },
        );

        setBans((prev) =>
          prev.map((b) =>
            b.id === ban.id
              ? { ...b, metadata: updatedMetadata }
              : b,
          ),
        );
      } catch (err: unknown) {
        console.error("Confirm ban error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg, { id: "confirm-cheating-ban" });
      }
    },
    [isDemo, serverId],
  );

  const filteredBans = useMemo(() => {
    let list = bans.filter((ban) => banMatchesListSearch(ban, searchQuery));
    list = [...list].sort((a, b) => {
      if (sortOrder === "banIdAsc") return airBanSortKey(a) - airBanSortKey(b);
      if (sortOrder === "banIdDesc") return airBanSortKey(b) - airBanSortKey(a);
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [bans, searchQuery, sortOrder]);

  const handleImportSharedBans = async () => {
    const code = importCode.trim().toUpperCase();
    if (!/^(VEXBANS|AIRBANS)-[A-Z0-9]{4}$/.test(code)) {
      toast.error("Enter a valid code in the format VEXBANS-XXXX.");
      return;
    }
    const activeServerId = serverId || connectedServer?.server_id;
    if (!activeServerId) {
      toast.error("Connect to a server first.");
      return;
    }
    setImporting(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/api/dashboard/${encodeURIComponent(activeServerId)}/bans/import`), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ code }),
      });
      const body: { ok?: boolean; imported?: number; skipped?: number } & { error?: string } =
        await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Import failed (HTTP ${res.status})`);
      const skippedNote = body.skipped ? ` (${body.skipped} already banned here)` : "";
      toast.success(
        `Imported ${body.imported ?? 0} ban(s) from ${code}${skippedNote} — active on this server.`,
      );
      setImportCode("");
      void loadBans();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to import shared bans");
    } finally {
      setImporting(false);
    }
  };

  const openDetails = useCallback((ban: BanRecord) => {
    setSelectedBan(ban);
    setDetailModalOpen(true);
  }, []);

  const goToPlayerLookup = useCallback((ban: BanRecord) => {
    navigate(getSearchPagePath(serverId, pathname), {
      state: { prefilledQuery: lookupQueryFromBan(ban), autoSearch: true },
    });
  }, [navigate, serverId, pathname]);

  const handleSetUnbanTarget = useCallback((ban: BanRecord) => {
    setUnbanTarget(ban);
  }, []);

  const anticheatBansCount = useMemo(() => {
    return bans.filter((b) => safeSearchText(b.mode).toLowerCase() === "anticheat").length;
  }, [bans]);

  const manualBansCount = useMemo(() => {
    return bans.filter((b) => safeSearchText(b.mode).toLowerCase() === "manuel").length;
  }, [bans]);

  return (
    <div className="min-h-full w-full p-4 md:p-6 relative bg-[#0F1017] text-white">
      <div className="w-full space-y-4 relative z-10 max-w-7xl mx-auto">
        {/* Simple Clean Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="rounded-xl border border-white/[0.08] bg-[#0c1017] p-4 shadow-sm hover:border-white/15 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400">Total Bans</p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">{bans.length}</p>
              </div>
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border border-white/[0.08] bg-[#0c1017] p-4 shadow-sm hover:border-white/15 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400">Anticheat Bans</p>
                <p className="text-2xl font-bold text-blue-400 mt-1 tabular-nums">{anticheatBansCount}</p>
              </div>
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border border-white/[0.08] bg-[#0c1017] p-4 shadow-sm hover:border-white/15 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400">Manual Bans</p>
                <p className="text-2xl font-bold text-zinc-200 mt-1 tabular-nums">{manualBansCount}</p>
              </div>
              <div className="rounded-xl bg-white/[0.05] border border-white/10 p-2.5 text-zinc-400">
                <User className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Simple Filters & Search Bar */}
        <Card className="rounded-xl border border-white/[0.08] bg-[#0c1017] p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by name, ID, license, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 border-white/10 bg-black/40 text-xs text-white placeholder:text-zinc-500 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500/40"
              />
            </div>

            {/* Import & Sort Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <Input
                  type="text"
                  placeholder="VEXBANS-XXXX"
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                  maxLength={13}
                  disabled={permsLoading || !canEditBans || importing}
                  className="h-9 w-full sm:w-36 border-white/10 bg-black/40 font-mono text-xs uppercase tracking-wider text-white placeholder:text-zinc-600 rounded-lg"
                />
                <Button
                  onClick={() => void handleImportSharedBans()}
                  disabled={permsLoading || !canEditBans || importing}
                  title="Import bans from code"
                  variant="outline"
                  className="h-9 px-3 gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-200 rounded-lg"
                >
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span>Import</span>
                </Button>
              </div>

              <Select
                value={sortOrder}
                onValueChange={(v) =>
                  setSortOrder(v as "banIdAsc" | "banIdDesc" | "newest" | "oldest")
                }
              >
                <SelectTrigger className="h-9 w-full sm:w-44 border-white/10 bg-black/40 text-xs text-zinc-300 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#121624] border-white/10 text-white rounded-lg">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="banIdAsc">Ban ID: Low to High</SelectItem>
                  <SelectItem value="banIdDesc">Ban ID: High to Low</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => setBanModalOpen(true)}
                disabled={permsLoading || !canEditBans}
                className="h-9 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 shadow-sm transition-all disabled:opacity-50"
              >
                <UserX className="h-3.5 w-3.5" />
                <span>Ban Offline</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Ban Records Table */}
        <Card className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1017] shadow-sm">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <div className="flex items-center gap-2">
              <BanIcon className="h-4 w-4 text-zinc-400" />
              <h2 className="font-semibold text-sm text-white">Ban Records</h2>
              <Badge variant="secondary" className="text-[10px] bg-white/10 text-zinc-300">
                {filteredBans.length}
              </Badge>
            </div>
          </div>

          {filteredBans.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 text-zinc-500">
                <Shield className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-white mb-1">No bans found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery ? "No ban records match your search filter." : "There are currently no active bans on this server."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/[0.08] bg-black/20 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-zinc-400">Player</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-400">Ban ID</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-400">Reason</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-400">Evidence</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-400">Status</TableHead>
                    <TableHead className="min-w-[8.5rem] text-xs font-semibold text-zinc-400">Banned At</TableHead>
                    <TableHead className="min-w-[8.5rem] text-xs font-semibold text-zinc-400">First Join</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-zinc-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBans.map((ban) => (
                    <BanRow
                      key={ban.id}
                      ban={ban}
                      discordAvatar={ban.discordId ? discordAvatars[ban.discordId] : undefined}
                      canEdit={canEditBans}
                      permsLoading={permsLoading}
                      onOpenDetails={openDetails}
                      onPlayerLookup={goToPlayerLookup}
                      onUnban={handleSetUnbanTarget}
                      onConfirmCheatingBan={handleConfirmCheatingBan}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Suspense fallback={null}>
        <BanOfflineModal open={banModalOpen} onOpenChange={setBanModalOpen} canEdit={canEditBans} />
      </Suspense>

      <Suspense fallback={null}>
        <BanDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          ban={selectedBan}
          allBans={bans}
          discordAvatars={discordAvatars}
          canEdit={canEditBans}
          onConfirmUnban={handleUnban}
          onConfirmCheatingBan={handleConfirmCheatingBan}
        />
      </Suspense>

      <AlertDialog open={!!unbanTarget} onOpenChange={(o) => !o && setUnbanTarget(null)}>
        <AlertDialogContent className="border border-sky-500/30 bg-[#0a0f1a] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.bans.unbanPlayer")}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {t("dashboard.bans.unbanConfirm", { player: unbanTarget?.playerName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-sky-500/50 bg-transparent text-slate-200 hover:bg-sky-500/10">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 font-semibold text-white hover:bg-rose-400"
              onClick={() => unbanTarget && handleUnban(unbanTarget)}
            >
              {t("dashboard.bans.unbanPlayer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
