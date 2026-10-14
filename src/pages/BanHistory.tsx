import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getSearchPagePath } from "@/lib/search-route";
import { apiUrl, apiMutationHeaders, ensureMutationCsrf } from "@/lib/api-base";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Shield,
  AlertTriangle,
  Eye,
  History,
  Ban as BanIcon,
  Video,
  ExternalLink,
  FileQuestion,
  Clock,
  Loader2,
  X,
  RotateCcw,
  Share2,
  Trash2,
  Copy,
  Check,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { FallingPapers } from "@/components/FallingPapers";
import { DiscordImage } from "@/components/DiscordImage";
import { supabase } from "@/integrations/supabase/client";
import { useDiscordAvatarsBatch } from "@/hooks/useDiscordAvatarsBatch";
import { useAdminPermissions, canEditPage } from "@/hooks/useAdminPermissions";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { enrichBansWithHistory, toIso } from "@/lib/ban-player-stats";
import { formatBanDateTime, formatBanRelative } from "@/lib/ban-dates";
import { mapRowToBanRecord, type BanRecord } from "@/pages/Bans";

const BanDetailModal = lazy(() =>
  import("@/components/BanDetailModal").then((m) => ({ default: m.BanDetailModal })),
);

interface RemovalRequestInfo {
  id: string;
  status: "pending" | "approved" | "denied" | string;
  reason?: string;
  proofs?: string[];
  review_note?: string | null;
  requested_by_discord_id?: string;
  created_at?: string;
  reviewed_at?: string | null;
}

interface ShareCodeInfo {
  id: string;
  code: string;
  ban_count: number;
  created_at: string;
}

interface ApiBanRow extends Record<string, unknown> {
  is_active?: number | boolean;
  imported_from?: string | null;
  imported_from_server_name?: string | null;
  removal_request?: RemovalRequestInfo | null;
}

type HistoryBan = BanRecord & {
  isActive: boolean;
  bannedBy?: string | null;
  importedFrom?: string | null;
  importedFromServerName?: string | null;
  request: RemovalRequestInfo | null;
};

type StatusFilter = "all" | "banned" | "unbanned";
type SortOrder = "newest" | "oldest" | "banIdAsc" | "banIdDesc";

function safeText(v: unknown): string {
  return v == null ? "" : String(v);
}

function extractBannedAtIso(meta: Record<string, unknown>, fallback?: string): string | undefined {
  const candidates = ["banned_at", "banned_at_iso", "ban_date", "date", "timestamp"];
  for (const k of candidates) {
    const v = meta?.[k];
    if (typeof v === "string" && v.trim()) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return fallback;
}

function mapApiRowToHistoryBan(row: ApiBanRow): HistoryBan {
  const base = mapRowToBanRecord(row as Record<string, unknown>);
  let meta: Record<string, unknown> = (row.metadata as Record<string, unknown>) || {};
  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  const dbCreated = toIso(row.created_at);
  const createdAt =
    (meta && typeof meta === "object"
      ? extractBannedAtIso(meta, dbCreated ?? undefined)
      : (dbCreated ?? undefined)) ??
    dbCreated ??
    new Date().toISOString();
  const evidence = (row as { evidence?: { clip_url?: string | null; screenshot_url?: string | null } }).evidence;
  const record = base as HistoryBan;
  record.createdAt = createdAt;
  record.date = new Date(createdAt).toLocaleDateString();
  record.time = new Date(createdAt).toLocaleTimeString();
  record.isActive = Number(row.is_active) === 1;
  record.bannedBy = (row.banned_by as string) || null;
  record.importedFrom = row.imported_from || null;
  record.importedFromServerName = row.imported_from_server_name || null;
  record.request = row.removal_request ?? null;
  if (!record.banClip && evidence?.clip_url) record.banClip = evidence.clip_url;
  if (!record.screenshot && evidence?.screenshot_url) record.screenshot = evidence.screenshot_url;
  return record;
}

/** Numeric part of Air-style ban ids for sorting. */
function airBanSortKey(ban: HistoryBan): number {
  for (const src of [ban.banJsonId, ban.displayBanId, ban.id]) {
    const s = safeText(src);
    const air = s.match(/air[-_#]?(\d+)/i);
    if (air) return parseInt(air[1], 10);
    const pure = s.match(/^(\d+)$/);
    if (pure) return parseInt(pure[1], 10);
  }
  const t = new Date(ban.createdAt).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

function historyMatchesSearch(ban: HistoryBan, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const airMatch = q.match(/^#?air[-_]?(\d+)$/i);
  if (airMatch) {
    return airBanSortKey(ban) === parseInt(airMatch[1], 10);
  }
  return (
    ban.playerName.toLowerCase().includes(q) ||
    ban.description.toLowerCase().includes(q) ||
    safeText(ban.displayBanId).toLowerCase().includes(q) ||
    safeText(ban.banJsonId).toLowerCase().includes(q) ||
    safeText(ban.mode).toLowerCase().includes(q) ||
    safeText(ban.bannedBy).toLowerCase().includes(q)
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function BanHistory() {
  const params = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { permissions, isOwner, isLoading: permsLoading } = useAdminPermissions();
  const canEditBans = isOwner || canEditPage(permissions, "bans");

  const [items, setItems] = useState<HistoryBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [selectedBan, setSelectedBan] = useState<HistoryBan | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [removalTarget, setRemovalTarget] = useState<HistoryBan | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalProofs, setRemovalProofs] = useState("");
  const [submittingRemoval, setSubmittingRemoval] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareResult, setShareResult] = useState<{ code: string; count: number } | null>(null);
  const [creatingCode, setCreatingCode] = useState(false);
  const [myCodes, setMyCodes] = useState<ShareCodeInfo[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    const interval = setInterval(() => {
      const raw = sessionStorage.getItem("connected_server");
      try {
        const current = raw ? JSON.parse(raw) : null;
        setConnectedServer((prev: unknown) =>
          JSON.stringify(prev) !== JSON.stringify(current) ? current : prev,
        );
      } catch {
        setConnectedServer(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeServerId = (params.serverId || connectedServer?.server_id) as string | undefined;

  const loadHistory = useCallback(async () => {
    if (!activeServerId) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/dashboard/${encodeURIComponent(activeServerId)}/ban-history?limit=500`),
        { credentials: "include" },
      );
      if (generation !== loadGenerationRef.current) return;
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Failed to load ban history (HTTP ${res.status})`);
      const rows: ApiBanRow[] = Array.isArray(body.bans) ? body.bans : [];
      setItems(enrichBansWithHistory(rows.map(mapApiRowToHistoryBan)) as HistoryBan[]);
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;
      console.error(err);
      setLoadError(err instanceof Error ? err.message : "Failed to load ban history");
    } finally {
      if (generation === loadGenerationRef.current) setLoading(false);
      loadInFlightRef.current = false;
    }
  }, [activeServerId]);

  const loadMyCodes = useCallback(async () => {
    if (!activeServerId) return;
    try {
      const res = await fetch(
        apiUrl(`/api/dashboard/${encodeURIComponent(activeServerId)}/ban-share-codes`),
        { credentials: "include" },
      );
      const body = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(body.codes)) setMyCodes(body.codes as ShareCodeInfo[]);
    } catch {
      /* non-fatal */
    }
  }, [activeServerId]);

  useEffect(() => {
    void loadHistory();
    void loadMyCodes();
  }, [loadHistory, loadMyCodes]);

  // Debounced live reload (same pattern as the Bans page — avoids refresh storms).
  useEffect(() => {
    if (!connectedServer?.server_id) return;
    const channel = supabase
      .channel("ban-history-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bans",
          filter: `server_id=eq.${connectedServer.server_id}`,
        },
        () => {
          if (liveReloadTimerRef.current !== null) {
            window.clearTimeout(liveReloadTimerRef.current);
          }
          liveReloadTimerRef.current = window.setTimeout(() => {
            liveReloadTimerRef.current = null;
            void loadHistory();
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
  }, [connectedServer, loadHistory]);

  const { avatars: discordAvatars } = useDiscordAvatarsBatch(items.map((b) => b.discordId));

  const visibleItems = useMemo(() => {
    let list = items.filter((b) => historyMatchesSearch(b, searchQuery));
    if (statusFilter === "banned") list = list.filter((b) => b.isActive);
    if (statusFilter === "unbanned") list = list.filter((b) => !b.isActive);
    list = [...list].sort((a, b) => {
      if (sortOrder === "banIdAsc") return airBanSortKey(a) - airBanSortKey(b);
      if (sortOrder === "banIdDesc") return airBanSortKey(b) - airBanSortKey(a);
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [items, searchQuery, statusFilter, sortOrder]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((i) => i.isActive).length,
      unbanned: items.filter((i) => !i.isActive).length,
    }),
    [items],
  );

  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((b) => selectedIds.has(b.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleItems.forEach((b) => next.delete(b.id));
      } else {
        visibleItems.forEach((b) => next.add(b.id));
      }
      return next;
    });
  }, [allVisibleSelected, visibleItems]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openDetails = useCallback((ban: HistoryBan) => {
    setSelectedBan(ban);
    setDetailModalOpen(true);
  }, []);

  const goToPlayerLookup = useCallback(
    (ban: HistoryBan) => {
      const m = ban.metadata || {};
      const q =
        (typeof m.discord === "string" && m.discord.replace(/^discord:/i, "")) ||
        ban.discordId ||
        (typeof m.license === "string" && m.license.replace(/^license:/i, "")) ||
        ban.playerName;
      navigate(
        getSearchPagePath(params.serverId, pathname),
        { state: { prefilledQuery: q, autoSearch: true } },
      );
    },
    [navigate, params.serverId, pathname],
  );

  const restoreBans = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      setRestoringIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      try {
        await ensureMutationCsrf();
        const res = await fetch(
          apiUrl(`/api/dashboard/${encodeURIComponent(activeServerId)}/ban-history/restore-bulk`),
          {
            method: "POST",
            credentials: "include",
            headers: apiMutationHeaders(),
            body: JSON.stringify({ ban_ids: ids }),
          },
        );
        const body: { ok?: boolean; restored?: number } & { error?: string } = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Restore failed (HTTP ${res.status})`);
        setItems((prev) =>
          prev.map((item) => (ids.includes(item.id) ? { ...item, isActive: true } : item)),
        );
        toast.success(`${body.restored ?? ids.length} ban(s) restored — active again and enforced.`);
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Failed to restore bans");
      } finally {
        setRestoringIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }
    },
    [activeServerId],
  );

  const createShareCode = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setCreatingCode(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/api/dashboard/${encodeURIComponent(activeServerId)}/ban-share-codes`), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ ban_ids: ids }),
      });
      const body: { ok?: boolean; code?: string; count?: number } & { error?: string } =
        await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Failed to create share code (HTTP ${res.status})`);
      setShareResult({ code: body.code || "", count: body.count || ids.length });
      void loadMyCodes();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to create share code");
    } finally {
      setCreatingCode(false);
    }
  }, [activeServerId, selectedIds, loadMyCodes]);

  const deleteShareCode = useCallback(
    async (codeId: string) => {
      try {
        await ensureMutationCsrf();
        const res = await fetch(
          apiUrl(`/api/dashboard/${encodeURIComponent(activeServerId)}/ban-share-codes/${encodeURIComponent(codeId)}`),
          { method: "DELETE", credentials: "include", headers: apiMutationHeaders() },
        );
        const body: { ok?: boolean } & { error?: string } = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed to delete code");
        setMyCodes((prev) => prev.filter((c) => c.id !== codeId));
        toast.success("Share code deleted — it can no longer be imported.");
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Failed to delete share code");
      }
    },
    [activeServerId],
  );

  const handleCopyCode = useCallback(async (code: string) => {
    const ok = await copyText(code);
    if (ok) {
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 1600);
      toast.success("Code copied");
    } else {
      toast.error("Could not copy — select it manually");
    }
  }, []);

  const submitRemovalRequest = useCallback(async () => {
    if (!removalTarget) return;
    const reason = removalReason.trim();
    if (reason.length < 10) {
      toast.error("Please provide a reason (min 10 characters).");
      return;
    }
    const proofs = removalProofs
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    setSubmittingRemoval(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(
        apiUrl(`/api/dashboard/${encodeURIComponent(activeServerId)}/ban-history/${encodeURIComponent(removalTarget.id)}/removal-request`),
        {
          method: "POST",
          credentials: "include",
          headers: apiMutationHeaders(),
          body: JSON.stringify({ reason, proofs }),
        },
      );
      const body: { ok?: boolean; id?: string } & { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (HTTP ${res.status})`);
      const request: RemovalRequestInfo = {
        id: body.id || "",
        status: "pending",
        reason,
        proofs,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => prev.map((i) => (i.id === removalTarget.id ? { ...i, request } : i)));
      toast.success("Removal request submitted — staff (level 4+) will review it.");
      setRemovalTarget(null);
      setRemovalReason("");
      setRemovalProofs("");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to submit removal request");
    } finally {
      setSubmittingRemoval(false);
    }
  }, [activeServerId, removalTarget, removalReason, removalProofs]);

  const manualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadHistory();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadHistory]);

  const statusBadge = (ban: HistoryBan) =>
    ban.isActive ? (
      <span className="inline-flex w-fit items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
        <BanIcon className="h-2.5 w-2.5" />
        Banned
      </span>
    ) : (
      <span className="inline-flex w-fit items-center gap-1 rounded-md border border-zinc-500/40 bg-zinc-500/10 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
        <Clock className="h-2.5 w-2.5" />
        Unbanned
      </span>
    );

  const removalChip = (ban: HistoryBan) => {
    if (!ban.request) return null;
    if (ban.request.status === "pending") {
      return (
        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
          <FileQuestion className="h-2.5 w-2.5" />
          Removal pending
        </span>
      );
    }
    if (ban.request.status === "denied") {
      return (
        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
          <X className="h-2.5 w-2.5" />
          Removal denied
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-full w-full p-4 md:p-6 relative bg-[#0F1017] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.02),transparent_55%)] -z-10" />
      <FallingPapers />
      <div className="w-full space-y-5 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border border-white/[0.08] hover:border-blue-500/30 bg-gradient-to-b from-[#0c1017] to-[#04060a] p-5 shadow-2xl transition-all">
            <div className="flex items-center gap-3.5">
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-400 shadow-sm shadow-blue-500/10">
                <History className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Records</p>
                <p className="text-2xl font-black text-white mt-0.5 tabular-nums">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="rounded-2xl border border-white/[0.08] hover:border-blue-500/30 bg-gradient-to-b from-[#0c1017] to-[#04060a] p-5 shadow-2xl transition-all">
            <div className="flex items-center gap-3.5">
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-400 shadow-sm shadow-blue-500/10">
                <BanIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Currently Banned</p>
                <p className="text-2xl font-black text-emerald-400 mt-0.5 tabular-nums">{stats.active}</p>
              </div>
            </div>
          </Card>
          <Card className="rounded-2xl border border-white/[0.08] hover:border-blue-500/30 bg-gradient-to-b from-[#0c1017] to-[#04060a] p-5 shadow-2xl transition-all">
            <div className="flex items-center gap-3.5">
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-400 shadow-sm shadow-blue-500/10">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Unbanned</p>
                <p className="text-2xl font-black text-zinc-400 mt-0.5 tabular-nums">{stats.unbanned}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-white">Ban History</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Permanent record of every ban on this server — active, unbanned, restored and imported.
              </p>
            </div>
            <Button
              onClick={() => void manualRefresh()}
              variant="outline"
              className="h-10 gap-2 rounded-xl border-white/10 bg-transparent px-4 font-bold text-xs text-white hover:bg-white/5 transition-all"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by player, ban ID, reason, moderator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 border-white/10 bg-[#050505] text-xs text-white placeholder:text-zinc-500 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/40"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-10 w-full border-white/10 bg-[#050505] text-xs text-white rounded-xl sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-xl">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="unbanned">Unbanned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="h-10 w-full border-white/10 bg-[#050505] text-xs text-white rounded-xl sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-xl">
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="banIdAsc">Ban ID: low to high</SelectItem>
                <SelectItem value="banIdDesc">Ban ID: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Records Table */}
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <BanIcon className="h-5 w-5 text-white" />
              <div>
                <h2 className="font-black text-sm text-white">Historical Records</h2>
                <p className="text-xs text-zinc-400">{visibleItems.length} record(s) found</p>
              </div>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-xs font-bold text-blue-300">
                  {selectedIds.size} selected
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    const restorable = Array.from(selectedIds).filter((id) => {
                      const item = items.find((i) => i.id === id);
                      return item && !item.isActive;
                    });
                    if (!restorable.length) {
                      toast.info("Selected records are already active bans.");
                      return;
                    }
                    void restoreBans(restorable);
                  }}
                  disabled={permsLoading || !canEditBans || restoringIds.size > 0}
                  title={!canEditBans && !permsLoading ? "You only have view access to bans" : "Re-activate unbanned records"}
                  className="h-8 rounded-lg border border-emerald-500/50 bg-emerald-500/15 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  {restoringIds.size > 0 ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
                  Restore ban
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                  className="h-8 rounded-lg border border-blue-500/50 bg-blue-500/15 text-xs font-bold text-blue-300 hover:bg-blue-500/25"
                >
                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                  Share
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  className="h-8 rounded-lg px-2 text-xs text-zinc-400 hover:bg-white/5"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {loadError ? (
            <div className="px-6 py-16 text-center">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500/60" />
              <p className="text-xs font-semibold text-red-300">{loadError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadHistory()}
                className="mt-4 rounded-xl border-white/15 bg-transparent text-white hover:bg-white/5"
              >
                Retry
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center px-6 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
              <p className="text-xs font-semibold text-zinc-400">No ban history records match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/[0.08] bg-[#050505]/50 hover:bg-transparent">
                    <TableHead className="w-10 pr-0">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all records"
                        className="h-4 w-4 cursor-pointer accent-blue-500"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-zinc-400">Player</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ban ID</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-zinc-400">Reason</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-zinc-400">Evidence</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-zinc-400">Status</TableHead>
                    <TableHead className="min-w-[9.5rem] whitespace-nowrap text-xs font-bold uppercase tracking-wider text-zinc-400">Banned At</TableHead>
                    <TableHead className="min-w-[9.5rem] whitespace-nowrap text-xs font-bold uppercase tracking-wider text-zinc-400">First Join</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-zinc-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.map((ban) => {
                    const isSelected = selectedIds.has(ban.id);
                    const isRestoring = restoringIds.has(ban.id);
                    return (
                      <TableRow
                        key={ban.id}
                        className={cn(
                          "border-white/10 hover:bg-sky-500/5",
                          isSelected && "bg-blue-500/[0.07]",
                        )}
                      >
                        <TableCell className="pr-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(ban.id)}
                            aria-label={`Select record for ${ban.playerName}`}
                            className="h-4 w-4 cursor-pointer accent-blue-500"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-blue-500/40">
                              <DiscordImage
                                discordId={ban.discordId}
                                avatarDataUrl={
                                  ban.discordId ? discordAvatars[ban.discordId]?.avatar_data_url : undefined
                                }
                                size={128}
                                alt={ban.playerName}
                                className="h-full w-full rounded-full"
                                fallbackClassName="rounded-full h-full w-full"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{ban.playerName}</p>
                              <p className="truncate text-[11px] text-zinc-500">{ban.mode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded-md border border-white/15 bg-[#121a28] px-2 py-1 font-mono text-xs text-slate-200">
                            {ban.displayBanId}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <p className="truncate text-sm text-slate-200" title={ban.description}>
                            {ban.description}
                          </p>
                          {ban.notes ? (
                            <p className="truncate text-[11px] text-zinc-500" title={ban.notes}>
                              {ban.notes}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {ban.banClip ? (
                            <a
                              href={ban.banClip}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/20"
                            >
                              <Video className="h-3 w-3" />
                              Clip
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
                                loading="lazy"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.style.display = "none";
                                  if (el.parentElement) {
                                    el.parentElement.innerHTML =
                                      '<span style="font-size:10px;color:#71717a;padding:12px">Unavailable</span>';
                                  }
                                }}
                              />
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-500">No evidence</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start">
                            {statusBadge(ban)}
                            {removalChip(ban)}
                            {ban.importedFrom ? (
                              <span
                                className="mt-1 inline-flex w-fit items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300"
                                title={`Imported via share code ${ban.importedFrom}${
                                  ban.importedFromServerName ? ` from ${ban.importedFromServerName}` : ""
                                }`}
                              >
                                <Download className="h-2.5 w-2.5" />
                                Imported
                                {ban.importedFromServerName ? ` · ${ban.importedFromServerName}` : ""}
                                {ban.importedFrom.startsWith("AIRBANS-") ? ` · ${ban.importedFrom}` : ""}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[9.5rem] text-sm text-slate-300">
                          <div className="whitespace-nowrap">{formatBanDateTime(ban.createdAt)}</div>
                          <div className="text-xs text-zinc-500">{formatBanRelative(ban.createdAt)}</div>
                        </TableCell>
                        <TableCell className="min-w-[9.5rem] text-sm text-slate-300">
                          {ban.firstJoinAt ? (
                            <>
                              <div className="whitespace-nowrap">{formatBanDateTime(ban.firstJoinAt)}</div>
                              <div className="text-xs text-zinc-500">{formatBanRelative(ban.firstJoinAt)}</div>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {!ban.isActive && (
                              <button
                                type="button"
                                disabled={permsLoading || !canEditBans || isRestoring}
                                title={
                                  !canEditBans && !permsLoading
                                    ? "You only have view access to bans"
                                    : "Restore ban — make this ban active again"
                                }
                                onClick={() => void restoreBans([ban.id])}
                                className="rounded-md p-2 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Restore ban"
                              >
                                {isRestoring ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openDetails(ban)}
                              className="rounded-md p-2 text-slate-300 hover:bg-blue-500/15 hover:text-blue-300"
                              aria-label="View ban details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => goToPlayerLookup(ban)}
                              className="rounded-md p-2 text-slate-300 hover:bg-blue-500/15 hover:text-blue-300"
                              aria-label="Player lookup"
                            >
                              <Search className="h-4 w-4" />
                            </button>
                            {isOwner && !ban.request?.status && (
                              <button
                                type="button"
                                onClick={() => setRemovalTarget(ban)}
                                title="Request removal from Ban History (owner only — reviewed by staff)"
                                className="rounded-md p-2 text-rose-400 hover:bg-rose-500/15 hover:text-rose-300"
                                aria-label="Request removal"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* My Shared Ban Codes */}
        {myCodes.length > 0 && (
          <Card className="rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
              <Share2 className="h-5 w-5 text-blue-400" />
              <div>
                <h2 className="font-black text-sm text-white">My Shared Ban Codes</h2>
                <p className="text-xs text-zinc-400">Codes created by this server — other servers can redeem them on their Bans page.</p>
              </div>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {myCodes.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleCopyCode(c.code)}
                      className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 font-mono text-sm font-black tracking-widest text-blue-200 transition-colors hover:bg-blue-500/20"
                      title="Copy code"
                    >
                      {copiedCode === c.code ? (
                        <Check className="inline h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="mr-1.5 inline h-3.5 w-3.5" />
                      )}
                      {c.code}
                    </button>
                    <div className="text-xs text-zinc-500">
                      {c.ban_count} ban(s) · {formatBanDateTime(c.created_at)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={permsLoading || !canEditBans}
                    onClick={() => void deleteShareCode(c.id)}
                    className="h-8 gap-1.5 rounded-lg px-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Detail modal */}
      <Suspense fallback={null}>
        <BanDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          ban={selectedBan}
          allBans={items}
          discordAvatars={discordAvatars}
          canEdit={canEditBans}
          onConfirmUnban={() => {
            toast.info("Unban is available from the active Bans page.");
            setDetailModalOpen(false);
          }}
        />
      </Suspense>

      {/* Removal request dialog (owner only) */}
      <Dialog
        open={!!removalTarget}
        onOpenChange={(o) => {
          if (!o) setRemovalTarget(null);
        }}
      >
        <DialogContent className="border border-white/15 bg-[#0a0f1a] text-white sm:max-w-md [&>button]:text-slate-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-400" />
              Request removal
            </DialogTitle>
            <DialogDescription className="text-left text-slate-400">
              Request removal of <span className="font-bold text-white">{removalTarget?.playerName}</span>'s record
              from Ban History. This is reviewed by staff (level 4+) — the record is never deleted instantly, and
              homepage statistics are preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                Reason for removal *
              </label>
              <Textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Explain why this historical record should be removed..."
                className="border-white/10 bg-[#050505] text-sm text-white placeholder:text-zinc-600 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                Proof / evidence links (optional)
              </label>
              <Input
                type="text"
                value={removalProofs}
                onChange={(e) => setRemovalProofs(e.target.value)}
                placeholder="https://... (comma separated, max 10)"
                className="h-10 border-white/10 bg-[#050505] text-xs text-white placeholder:text-zinc-600 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/40"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRemovalTarget(null)}
              className="rounded-xl border-white/15 bg-transparent text-slate-200 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void submitRemovalRequest()}
              disabled={submittingRemoval || removalReason.trim().length < 10}
              className="rounded-xl bg-rose-500 font-bold text-white hover:bg-rose-400 disabled:opacity-50"
            >
              {submittingRemoval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={(o) => { setShareDialogOpen(o); if (!o) setShareResult(null); }}>
        <DialogContent className="border border-white/15 bg-[#0a0f1a] text-white sm:max-w-md [&>button]:text-slate-300">
          {shareResult ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-400" />
                  Share code created
                </DialogTitle>
                <DialogDescription className="text-left text-slate-400">
                  Give this code to any other VexShield server — they can redeem it on their Bans page and these{" "}
                  {shareResult.count} ban(s) will be imported there as active, enforced bans marked as imported.
                </DialogDescription>
              </DialogHeader>
              <button
                type="button"
                onClick={() => void handleCopyCode(shareResult.code)}
                className="group flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-blue-500/50 bg-blue-500/10 px-5 py-4 transition-colors hover:bg-blue-500/20"
              >
                <span className="font-mono text-2xl font-black tracking-[0.2em] text-blue-200">
                  {shareResult.code}
                </span>
                {copiedCode === shareResult.code ? (
                  <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <Copy className="h-5 w-5 shrink-0 text-blue-300 group-hover:text-blue-200" />
                )}
              </button>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShareDialogOpen(false);
                    setShareResult(null);
                    setSelectedIds(new Set());
                  }}
                  className="w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-400" />
                  Share {selectedIds.size} ban record(s)?
                </DialogTitle>
                <DialogDescription className="text-left text-slate-400">
                  A code in the format <span className="font-mono font-bold text-blue-300">AIRBANS-XXXX</span>{" "}
                  will bundle snapshots of the selected bans. Any other server can redeem it on their Bans page to
                  import them as active bans. You can revoke the code at any time.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-3">
                {Array.from(selectedIds).map((id) => {
                  const item = items.find((i) => i.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="flex items-center justify-between py-0.5 text-xs text-slate-300">
                      <span className="truncate">{item.playerName}</span>
                      <span className="ml-2 shrink-0 text-zinc-500">{item.displayBanId}</span>
                    </div>
                  );
                })}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShareDialogOpen(false)}
                  className="rounded-xl border-white/15 bg-transparent text-slate-200 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void createShareCode()}
                  disabled={creatingCode}
                  className="rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {creatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Create AIRBANS code
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
