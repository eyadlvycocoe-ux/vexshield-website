import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Clock, Users, Bell, Copy, X, Key, Home, Shield, TrendingUp, Ban, Pencil, Check, Eye, Calendar, Globe, Cctv, Terminal, MapPin, Radio, Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { isRateLimitError, apiMutationHeaders, apiUrl, ensureMutationCsrf } from "@/lib/api-base";
import {
  buildAnalyticsSeries,
  loadActivityHistory,
  saveActivityHistory,
  bucketBansByHour,
  type AnalyticsPoint,
} from "@/lib/dashboard-analytics";
import { MetricCard, DistributionDonutChart, ServerAnalyticsChart, DashboardInfoCard, formatDashboardNumber } from "@/components/dashboard/DashboardCharts";
import { LoadingPanel } from "@/components/ui/loading-spinner";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { useIsDemoMode } from "@/demo/demoMode";
import { getDashboardDemoAnalytics, getDashboardDemoState } from "@/demo/demoData";
import { isSupportPanelSession, readConnectedServer, recoverConnectedServerSession, setConnectedServer } from "@/lib/connected-server";
import { readDashboardCache, writeDashboardCache } from "@/lib/dashboard-cache";
import { effectiveLivePlayerCount, parsePlayersSnapshot } from "@/lib/players-snapshot";
import { validateServerSessionCached } from "@/lib/server-auth-cache";
import { useTranslation } from "react-i18next";

interface Player {
  player_id: string;
  player_name: string;
  ping: number;
  coords?: { x: number; y: number; z: number };
}

interface RecentAction {
  type: 'ban' | 'kick' | 'warn' | 'detection';
  player: string;
  reason: string;
  time: string;
}

// Calculate days until expiration
const getDaysUntilExpiration = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Get expiration warning level
const getExpirationWarning = (daysUntil: number | null): { level: 'critical' | 'warning' | 'info' | null; message: string } => {
  if (daysUntil === null) return { level: null, message: '' };
  if (daysUntil <= 0) return { level: 'critical', message: 'Your license has expired! Please renew to continue using the service.' };
  if (daysUntil <= 1) return { level: 'critical', message: 'Your license expires tomorrow! Renew now to avoid service interruption.' };
  if (daysUntil <= 3) return { level: 'warning', message: `Your license expires in ${daysUntil} days. Consider renewing soon.` };
  if (daysUntil <= 7) return { level: 'info', message: `Your license expires in ${daysUntil} days.` };
  return { level: null, message: '' };
};

export default function ServerDashboard() {
  const { t } = useTranslation();
  const { serverId } = useParams();
  const navigate = useNavigate();
  const isDemo = useIsDemoMode();
  const [server, setServer] = useState<any>(null);
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [licenseVisible, setLicenseVisible] = useState(false);
  const [ipDraft, setIpDraft] = useState<string>("");
  const [ipEditing, setIpEditing] = useState(false);
  const [savingIp, setSavingIp] = useState(false);
  const [isSupportSession, setIsSupportSession] = useState(() => isSupportPanelSession());
  const canSupportResetIp = isSupportSession;
  const showResetIp = !isSupportSession || canSupportResetIp;
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(() => {
    if (isDemo || !serverId) return !isDemo;
    return readDashboardCache(serverId) == null;
  });
  const [chartData, setChartData] = useState<number[]>([]);
  const [analyticsSeries, setAnalyticsSeries] = useState<AnalyticsPoint[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [stats, setStats] = useState({
    totalBans: 0,
    totalKicks: 0,
    totalWarns: 0,
    peakPlayers: 0
  });
  const [acVersion, setAcVersion] = useState<string>("");
  const [latestAcVersion, setLatestAcVersion] = useState<string | null>(null);
  const [banReasonBreakdown, setBanReasonBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const serverRef = useRef<any>(null);
  const everLoadedServerRef = useRef(false);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">("today");
  const [demoConnections, setDemoConnections] = useState(0);
  const [demoActionBreakdown, setDemoActionBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [logoError, setLogoError] = useState(false);
  const [serverSettingsLogo, setServerSettingsLogo] = useState<string | null>(null);
  const dashboardLoadTimedOut = useLoadingTimeout(loading && !server, 18_000);

  useEffect(() => {
    serverRef.current = server;
    if (server) everLoadedServerRef.current = true;
  }, [server]);

  useEffect(() => {
    if (!isDemo) return;
    const demo = getDashboardDemoState();
    setServer(demo.server);
    setLicenseKey(demo.licenseKey);
    setIpDraft(demo.server.server_ip);
    setAcVersion(demo.acVersion);
    setLatestAcVersion(demo.latestAcVersion);
    setStats(demo.stats);
    setBanReasonBreakdown(demo.banReasonBreakdown);
    setDemoActionBreakdown(demo.actionBreakdown);
    setDemoConnections(demo.connections);
    setSnapshot({ total_players: demo.playerCount, metadata: { max_players: demo.maxSlots } });
    setAnalyticsSeries(getDashboardDemoAnalytics(timeRange));
    setLoading(false);

    if (window.self !== window.top) {
      document.documentElement.classList.add("iframe-demo");
      const style = document.createElement("style");
      style.id = "iframe-demo-styles";
      style.textContent = `
        .iframe-demo ::-webkit-scrollbar { display: none !important; }
        .iframe-demo * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      `;
      document.head.appendChild(style);
    }
  }, [isDemo]);

  useEffect(() => {
    if (!isDemo) return;
    setAnalyticsSeries(getDashboardDemoAnalytics(timeRange));
  }, [isDemo, timeRange]);

  useEffect(() => {
    if (isDemo) return;
    const syncSupport = () => setIsSupportSession(isSupportPanelSession());
    window.addEventListener("aircore:connected-server", syncSupport);
    return () => window.removeEventListener("aircore:connected-server", syncSupport);
  }, [isDemo]);

  useEffect(() => {
    if (isSupportSession && !canSupportResetIp) setIpEditing(false);
  }, [isSupportSession, canSupportResetIp]);

  useEffect(() => {
    if (isDemo) return;

    const checkAuth = async (): Promise<{ server_id: string; license_key: string } | null> => {
      let serverData = readConnectedServer();
      
      if (
        !serverData ||
        serverData.server_id !== serverId ||
        typeof serverData.license_key !== "string" ||
        !serverData.license_key.trim()
      ) {
        serverData = await recoverConnectedServerSession(serverId);
      }

      // Be more lenient - if we have existing session with valid license, use it even if recovery failed
      const existing = readConnectedServer();
      if (existing?.server_id === serverId && typeof existing.license_key === "string" && existing.license_key.trim()) {
        serverData = existing;
      }

      if (!serverData || serverData.server_id !== serverId) {
        toast.error(t("dashboard.common.connectToServerFirst"));
        navigate("/");
        return null;
      }

      if (typeof serverData.license_key !== "string" || !serverData.license_key.trim()) {
        toast.error(t("dashboard.common.missingLicenseKey"));
        sessionStorage.removeItem("connected_server");
        navigate("/");
        return null;
      }

      setLicenseKey(serverData.license_key);
      setIsSupportSession(serverData.is_support_session === true);

      try {
        const { status, ok, body } = await validateServerSessionCached(serverData.server_id, serverData.license_key);
        if (ok && body.ok && typeof body.license_key === "string" && body.license_key.trim()) {
          if (body.license_key !== serverData.license_key) {
            serverData = { ...serverData, ...body, license_key: body.license_key };
            setConnectedServer(serverData);
            setLicenseKey(body.license_key);
          }
        } else if (status === 404) {
          const recovered = await recoverConnectedServerSession(serverId);
          if (recovered?.license_key) {
            setLicenseKey(recovered.license_key);
            return { server_id: recovered.server_id, license_key: recovered.license_key };
          }
        }
      } catch {
        /* Keep the existing session; data load below still has its own retry path. */
      }

      return { server_id: serverData.server_id, license_key: serverData.license_key };
    };

    const applySnapshot = (snapshotData: any) => {
      const { players: snapshotList } = parsePlayersSnapshot(snapshotData ?? undefined);
      if (snapshotData) {
        setSnapshot(snapshotData);
        setPlayers(snapshotList.slice(0, 5) as unknown as Player[]);
      } else {
        setSnapshot(null);
        setPlayers([]);
      }
    };

    const cached = serverId ? readDashboardCache(serverId) : null;
    if (cached) {
      if (cached.server) {
        setServer(cached.server);
        setIpDraft(String(cached.server.server_ip || ""));
      }
      if (cached.snapshot) applySnapshot(cached.snapshot);
      if (cached.stats) {
        const cachedLive = effectiveLivePlayerCount(cached.snapshot as Parameters<typeof effectiveLivePlayerCount>[0]);
        setStats({ ...cached.stats, peakPlayers: cachedLive });
      }
      if (cached.acVersion) setAcVersion(cached.acVersion);
      if (cached.licenseKey) setLicenseKey(cached.licenseKey);
      setLoading(false);
    }

    const loadLiveSnapshot = async () => {
      const auth = await checkAuth();
      if (!auth) return;
      try {
        const [snapshotRes, serverStatusRes] = await Promise.all([
          supabase
            .from("players_snapshots")
            .select("*")
            .eq("server_id", serverId)
            .maybeSingle(),
          supabase
            .from("servers")
            .select("status, server_ip, display_name")
            .eq("server_id", serverId)
            .maybeSingle(),
        ]);
        const snapshotData = snapshotRes.data;
        applySnapshot(snapshotData);
        if (serverStatusRes?.data) {
          const row = serverStatusRes.data;
          setServer((prev: any) => (prev ? { ...prev, ...row } : row));
          if (row.server_ip) setIpDraft(row.server_ip);
        }
        setRateLimited(false);
        const liveCount = effectiveLivePlayerCount(snapshotData ?? undefined);
        setStats((prev) => ({ ...prev, peakPlayers: liveCount }));
        if (serverId) {
          setChartData((prev) => {
            const activity = saveActivityHistory(
              serverId,
              liveCount,
              prev.length === 24 ? prev : loadActivityHistory(serverId),
            );
            setAnalyticsSeries((series) =>
              series.length === 24
                ? series.map((p, i) => ({ ...p, players: activity[i] ?? p.players }))
                : series,
            );
            return activity;
          });
        }
      } catch (error) {
        if (isRateLimitError(error)) {
          setRateLimited(true);
          return;
        }
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Error refreshing live snapshot:", error);
      }
    };

    const loadServerData = async (silent = false, mode: "full" | "live" = "full", attempt = 0) => {
      const auth = await checkAuth();
      if (!auth) return;

      if (mode === "live") {
        await loadLiveSnapshot();
        return;
      }

      try {
        // First, try to get server data from Supabase servers table (for enhanced info like IP)
        const { data: serverData, error: serverError } = await supabase
          .from("servers")
          .select("*")
          .eq("server_id", serverId)
          .maybeSingle();

        if (serverError) throw serverError;

        // If Supabase query succeeds and returns data, use it
        if (serverData) {
          setNotFound(false);
          setLoadError(false);
          setServer(serverData);
          setIpDraft(serverData?.server_ip || "");
          setRateLimited(false);
          setLoading(false);
        } else {
          // If Supabase query fails or returns no data, use session data as fallback
          
          // Try to recover session if needed
          if (attempt === 0) {
            const recovered = await recoverConnectedServerSession(serverId);
            if (recovered?.license_key && recovered.license_key !== auth.license_key) {
              void loadServerData(silent, mode, attempt + 1);
              return;
            }
          }

          // Get session data (either recovered or existing). `auth` is already validated by
          // checkAuth() (it navigates home otherwise), so use it as a guaranteed fallback. This
          // prevents a transient sessionStorage read race from dropping the user onto a false
          // "Server Not Found" page when they clearly have a valid connected session.
          const sessionData = readConnectedServer() || await recoverConnectedServerSession(serverId);
          const fallbackSource = sessionData ?? auth;

          const fallbackServer = {
            server_id: fallbackSource.server_id || auth.server_id,
            license_key: fallbackSource.license_key || auth.license_key,
            display_name: sessionData?.display_name || auth.server_id,
            status: sessionData?.status || "unknown",
            expires_at: null,
            server_ip: "",
            ent_airshield: sessionData?.ent_airshield,
            ent_airscanner: sessionData?.ent_airscanner,
            ent_airpc: sessionData?.ent_airpc,
          };
          setNotFound(false);
          setLoadError(false);
          setServer(fallbackServer);
          setIpDraft("");
          setLoading(false);
        }

        const [snapshotRes, settingsRes, acFilesRes] = await Promise.all([
          supabase.from("players_snapshots").select("*").eq("server_id", serverId).maybeSingle(),
          supabase.from("server_settings").select("settings").eq("server_id", serverId).maybeSingle(),
          supabase
            .from("anticheat_files")
            .select("version, is_active")
            .order("uploaded_at", { ascending: false })
            .limit(5),
        ]);

        const snapshotData = snapshotRes.data;
        applySnapshot(snapshotData);

        if (settingsRes?.data?.settings) {
          const settingsVal = settingsRes.data.settings;
          const settingsObj = typeof settingsVal === "string"
            ? (() => { try { return JSON.parse(settingsVal); } catch { return {}; } })()
            : ((settingsVal as Record<string, unknown> | null) ?? {});
          const logoVal = settingsObj.ServerLogo || settingsObj.server_logo || settingsObj.serverLogo;
          if (logoVal && typeof logoVal === "string") setServerSettingsLogo(logoVal);
        }

        const acList = Array.isArray(acFilesRes.data) ? acFilesRes.data : [];
        const activeAc = acList.find((f: any) => f.is_active) || acList[0];
        setLatestAcVersion(activeAc?.version?.trim() || null);
        const installedVersion =
          (snapshotData?.metadata as { version?: string; ac_version?: string } | null)?.version?.trim() ||
          (snapshotData?.metadata as { version?: string; ac_version?: string } | null)?.ac_version?.trim() ||
          null;
        const resolvedAcVersion = installedVersion || activeAc?.version?.trim() || "Beta";
        setAcVersion(resolvedAcVersion);

        const liveCount = effectiveLivePlayerCount(snapshotData ?? undefined);
        const activity = saveActivityHistory(serverId!, liveCount, loadActivityHistory(serverId!));
        setChartData(activity);

        const [
          bansRes,
          banCountRes,
          kickCountRes,
          warnCountRes,
          recentKicksRes,
        ] = await Promise.all([
          supabase
            .from("bans")
            .select("player_name, reason, created_at")
            .eq("server_id", serverId)
            .order("created_at", { ascending: false })
            .limit(150),
          supabase.from("bans").select("*", { count: "exact", head: true }).eq("server_id", serverId),
          supabase.from("kicks").select("*", { count: "exact", head: true }).eq("server_id", serverId),
          supabase.from("warns").select("*", { count: "exact", head: true }).eq("server_id", serverId),
          supabase
            .from("kicks")
            .select("player_name, reason, created_at")
            .eq("server_id", serverId)
            .order("created_at", { ascending: false })
            .limit(2),
        ]);

        const bansList = Array.isArray(bansRes.data) ? bansRes.data : [];
        const reasonCounts = new Map<string, number>();
        bansList.forEach((ban: any) => {
          const raw = (ban.reason || "Unknown detection").trim();
          const label = raw.length > 32 ? `${raw.slice(0, 32)}` : raw;
          reasonCounts.set(label, (reasonCounts.get(label) || 0) + 1);
        });
        setBanReasonBreakdown(
          Array.from(reasonCounts.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7),
        );

        const nextStats = {
          totalBans: banCountRes.count || 0,
          totalKicks: kickCountRes.count || 0,
          totalWarns: warnCountRes.count || 0,
          peakPlayers: liveCount,
        };
        setStats(nextStats);

        const actions: RecentAction[] = [];
        bansList.slice(0, 2).forEach((ban: any) => {
          actions.push({
            type: "ban",
            player: ban.player_name || "Unknown",
            reason: ban.reason || "No reason",
            time: formatTimeAgo(new Date(ban.created_at || Date.now())),
          });
        });
        (recentKicksRes.data as any[])?.forEach((kick) => {
          actions.push({
            type: "kick",
            player: kick.player_name || "Unknown",
            reason: kick.reason || "No reason",
            time: formatTimeAgo(new Date(kick.created_at || Date.now())),
          });
        });
        setRecentActions(actions.slice(0, 4));

        const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
        const bans24h = bansList.filter(
          (b: any) => b?.created_at && new Date(b.created_at).getTime() >= sinceMs,
        );
        setAnalyticsSeries(buildAnalyticsSeries(activity, bucketBansByHour(bans24h || [])));

        if (serverId) {
          writeDashboardCache(serverId, {
            server: serverData,
            snapshot: snapshotData ?? null,
            stats: nextStats,
            acVersion: resolvedAcVersion,
            licenseKey: auth.license_key,
          });
        }
      } catch (error) {
        console.error("Error loading server data:", error);
        if (isRateLimitError(error)) {
          setRateLimited(true);
          if (!silent) {
            toast.error("Too many requests. Please wait a moment and try again.");
          }
          setLoading(false);
          return;
        }
        // Transient/network failure (not a definitive "not found").
        // Retry the initial load a few times before surfacing an error, so a
        // brief backend hiccup doesn't drop the user onto a "Server Not Found" page.
        if (attempt < 3) {
          if (!serverRef.current) setLoading(true);
          window.setTimeout(
            () => { void loadServerData(silent, mode, attempt + 1); },
            600 * (attempt + 1),
          );
          return;
        }
        // Only flag a hard load error when we never managed to load the server.
        if (!serverRef.current) setLoadError(true);
        const msg =
          (error as any)?.message ||
          (error as any)?.error_description ||
          (error as any)?.details ||
          "Failed to load server data";
        if (!silent) toast.error(String(msg));
        setLoading(false);
      }
    };

    loadServerData(false);
    // Light poll: one /api/db call; full stats reload every ~1 minute.
    let pollTick = 0;
    const poll = window.setInterval(() => {
      pollTick += 1;
      if (pollTick % 6 === 0) {
        loadServerData(true, "full");
      } else {
        loadServerData(true, "live");
      }
    }, 10000);

    const channel = supabase
      .channel('server-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players_snapshots', filter: `server_id=eq.${serverId}` }, (payload) => {
        const row = payload.new as Record<string, unknown> | null;
        applySnapshot(row);
        const liveCount = effectiveLivePlayerCount(row ?? undefined);
        setStats((prev) => ({ ...prev, peakPlayers: liveCount }));
        if (serverId) {
          setChartData((prev) => {
            const activity = saveActivityHistory(
              serverId,
              liveCount,
              prev.length === 24 ? prev : loadActivityHistory(serverId),
            );
            setAnalyticsSeries((series) =>
              series.length === 24
                ? series.map((p, i) => ({ ...p, players: activity[i] ?? p.players }))
                : series,
            );
            return activity;
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'servers', filter: `server_id=eq.${serverId}` }, (payload) => {
        const row = payload.new as Record<string, unknown> | null;
        // Never drop a valid server onto the "Server Not Found" screen because a
        // realtime heartbeat delivered an empty/partial row. Merge into the
        // existing server instead of replacing it outright.
        if (row && typeof row === "object" && Object.keys(row).length > 0) {
          setServer((prev: any) => (prev ? { ...prev, ...row } : row));
        }
      })
      // Also listen to our custom SSE events
      .on('*', {}, () => {
        loadLiveSnapshot();
        loadServerData(true, "live");
      })
      .subscribe();

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [serverId, navigate, isDemo, t]);

  const [accessRequests, setAccessRequests] = useState<any[]>([]);

  const loadAccessRequests = async () => {
    if (!serverId || isDemo) return;
    try {
      const res = await fetch(apiUrl(`/desk/access-requests?server_id=${encodeURIComponent(serverId)}`), {
        credentials: "include",
      });
      if (res.ok) {
        const rows = await res.json();
        setAccessRequests(Array.isArray(rows) ? rows : []);
      }
    } catch {
      /* ignore */
    }
  };

  const respondAccess = async (requestId: string, status: "approved" | "denied") => {
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/desk/access-requests/${requestId}`), {
        method: "PATCH",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(status === "approved" ? "Support staff access approved!" : "Support access denied");
      await loadAccessRequests();
    } catch {
      toast.error("Failed to update support access request");
    }
  };

  useEffect(() => {
    void loadAccessRequests();
  }, [serverId, isDemo]);

  const actionBreakdown = useMemo(
    () => {
      if (isDemo) return demoActionBreakdown;
      return [
      { name: "By Player", value: stats.totalKicks },
      { name: "By Server", value: stats.totalWarns },
      { name: "Anticheat", value: stats.totalBans },
      { name: "By Resource", value: 0 },
      { name: "Crash", value: 0 },
      { name: "Timeout", value: 0 },
      { name: "Security", value: 0 },
    ];
    },
    [isDemo, demoActionBreakdown, stats.totalBans, stats.totalKicks, stats.totalWarns],
  );

  const detectionBreakdown = useMemo(() => {
    if (banReasonBreakdown.length > 0) return banReasonBreakdown;
    return [
      { name: "Noclip", value: 0 },
      { name: "Godmode", value: 0 },
      { name: "Speedhack", value: 0 },
      { name: "Teleport", value: 0 },
      { name: "Aimbot", value: 0 },
    ];
  }, [banReasonBreakdown]);

  const daysUntilExpiry = getDaysUntilExpiration(server?.expires_at);
  const expirationWarning = getExpirationWarning(daysUntilExpiry);

  const copyLicense = async () => {
    try {
      await navigator.clipboard.writeText(licenseKey);
      toast.success("License key copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleSaveIp = async () => {
    const trimmed = ipDraft.trim();
    if (!trimmed) {
      toast.error("Server IP is required");
      return;
    }
    if (isDemo) {
      setServer((prev: any) => (prev ? { ...prev, server_ip: trimmed } : prev));
      setIpEditing(false);
      toast.success("Server IP updated (demo)");
      return;
    }
    if (!serverId) return;
    setSavingIp(true);
    try {
      if (canSupportResetIp) {
        await ensureMutationCsrf();
        const res = await fetch(apiUrl(`/desk/dashboard-servers/${encodeURIComponent(serverId)}/server-ip`), {
          method: "PATCH",
          credentials: "include",
          headers: apiMutationHeaders(),
          body: JSON.stringify({ server_ip: trimmed }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((j as { error?: string }).error || "Failed to update IP");
      } else {
        const { error } = await supabase
          .from("servers")
          .update({ server_ip: trimmed })
          .eq("server_id", serverId);
        if (error) throw error;
      }
      toast.success("Server IP updated");
      setServer((prev: any) => (prev ? { ...prev, server_ip: trimmed } : prev));
      setIpEditing(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update IP");
    } finally {
      setSavingIp(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading && !server) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-background">
        <LoadingPanel
          label={t("dashboard.common.loadingServerData")}
          timedOut={dashboardLoadTimedOut}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!server) {
    if (rateLimited) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center bg-background">
          <div className="max-w-md px-4 text-center">
            <h2 className="mb-2 text-2xl font-bold">{t("dashboard.common.tooManyRequests")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("dashboard.common.tooManyRequestsDescription")}
            </p>
            <Button onClick={() => window.location.reload()}>{t("dashboard.common.retry")}</Button>
          </div>
        </div>
      );
    }
    if (loadError && !notFound) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center bg-background">
          <div className="max-w-md px-4 text-center">
            <h2 className="mb-2 text-2xl font-bold">{t("dashboard.common.couldNotLoadDashboard")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("dashboard.common.temporaryServerError")}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button onClick={() => window.location.reload()}>{t("dashboard.common.retry")}</Button>
              <Button variant="outline" onClick={() => navigate('/')}>{t("dashboard.common.goHome")}</Button>
            </div>
          </div>
        </div>
      );
    }
    // If we previously loaded the server, a transient null (e.g. a realtime
    // hiccup while idle) should not surface the "Server Not Found" screen.
    // Show a brief reconnecting loader; the next poll restores the data.
    if (everLoadedServerRef.current) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center bg-background">
          <LoadingPanel label={t("dashboard.common.loadingServerData")} />
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">{t("dashboard.common.serverNotFound")}</h2>
          <p className="text-muted-foreground mb-4">{t("dashboard.common.serverNotFoundDescription")}</p>
          <Button onClick={() => navigate('/')}>{t("dashboard.common.goHome")}</Button>
        </div>
      </div>
    );
  }

  const playerCount = effectiveLivePlayerCount(snapshot ?? undefined);
  const parsedMeta = typeof snapshot?.metadata === 'string'
    ? (() => { try { return JSON.parse(snapshot.metadata); } catch { return {}; } })()
    : ((snapshot?.metadata as Record<string, unknown> | null) || {});

  const maxSlots = Number(parsedMeta.max_players ?? parsedMeta.maxClients ?? parsedMeta.slots) || 300;
  const rawDisplayName = server.display_name || (parsedMeta.server_name as string) || (parsedMeta.hostname as string) || server.server_id;
  const serverDisplayName = (!rawDisplayName || rawDisplayName === "AirShield Server") ? "VexShield Server" : rawDisplayName;
  const serverLogoUrl =
    (parsedMeta.server_logo as string) ||
    (parsedMeta.server_logo_url as string) ||
    (parsedMeta.logo_url as string) ||
    (parsedMeta.icon_url as string) ||
    (serverSettingsLogo as string) ||
    (server as { server_logo?: string })?.server_logo ||
    (server?.server_id ? `/api/public/server-icon/${server.server_id}` : undefined);
  const connectionsTotal = stats.totalKicks + stats.totalBans + stats.peakPlayers;
  const connectionsPeak = chartData.length > 0 ? Math.max(...chartData, playerCount) : playerCount;
  const totalConnections = isDemo ? demoConnections : Math.max(connectionsTotal, connectionsPeak);

  const timeRangeLabel =
    timeRange === "today" ? "last 24h" : timeRange === "7d" ? "last 7 days" : "last 30 days";

  const expiryLabel = server.expires_at
    ? formatDistanceToNow(new Date(server.expires_at), { addSuffix: true })
    : "Never";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:p-8 bg-[#070b14] text-white">
      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.02]" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden max-w-[1400px] mx-auto w-full">
        <div className="flex w-full flex-1 flex-col gap-4 pb-4">
          {accessRequests.filter((r) => r.status === "pending").map((req) => (
          <Alert key={req.id} className="border-amber-500/30 bg-amber-500/10 text-amber-200 flex flex-wrap items-center justify-between gap-3 p-3.5 mb-1 rounded-xl">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <AlertTitle className="text-amber-200 font-bold text-sm">Support Staff Access Request</AlertTitle>
                <AlertDescription className="text-xs text-amber-300/90 mt-0.5">
                  Staff member <strong className="text-white font-bold">{req.support_display_name || req.support_username || req.support_user_id}</strong> requested access to reset IP & view configuration for this server.
                </AlertDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 px-3 rounded-lg" onClick={() => void respondAccess(req.id, "approved")}>
                <Check className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="destructive" className="font-semibold text-xs h-8 px-3 rounded-lg" onClick={() => void respondAccess(req.id, "denied")}>
                <X className="h-4 w-4 mr-1" /> Deny
              </Button>
            </div>
          </Alert>
        ))}

        {expirationWarning.level && (
          <Alert
            className={cn(
              "rounded-xl",
              expirationWarning.level === "critical"
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : expirationWarning.level === "warning"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                  : "border-blue-500/40 bg-blue-500/10 text-blue-200"
            )}
          >
            <Bell
              className={`h-4 w-4 ${
                expirationWarning.level === "critical"
                  ? "text-red-400"
                  : expirationWarning.level === "warning"
                    ? "text-amber-400"
                    : "text-blue-400"
              }`}
            />
            <AlertTitle className="font-bold text-sm">
              {expirationWarning.level === "critical"
                ? "License Expiring!"
                : expirationWarning.level === "warning"
                  ? "License Reminder"
                  : "License Notice"}
            </AlertTitle>
            <AlertDescription className="text-xs mt-0.5">{expirationWarning.message}</AlertDescription>
          </Alert>
        )}

        {/* Top Controls: Status + Time Range */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
                server.status === "online"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/5 text-zinc-400"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  server.status === "online" ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                )}
              />
              {server.status === "online" ? "Online" : "Offline"}
            </span>

            <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono font-medium text-cyan-400">
              vBeta
            </span>

            {latestAcVersion && acVersion !== latestAcVersion && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 rounded-lg"
                onClick={() => navigate(isDemo ? "/demo/download" : `/${serverId}/download`)}
              >
                Update available
              </Button>
            )}
          </div>

          <div className="flex rounded-lg border border-white/10 bg-[#090e18] p-1">
            {(
              [
                { id: "today" as const, label: "Today" },
                { id: "7d" as const, label: "Last 7 Days" },
                { id: "30d" as const, label: "Last 30 Days" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeRange(opt.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  timeRange === opt.id
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* WaveShield Top Banner Artwork */}
        <div className="relative w-full h-36 sm:h-44 overflow-hidden rounded-xl border border-white/10 mb-4 shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${server.banner_url && !server.banner_url.includes("unsplash") ? server.banner_url : "/vexshield-banner.jpg"})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/40 to-transparent" />
          <div className="absolute bottom-4 left-6 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30 backdrop-blur-md text-blue-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none drop-shadow-md">
                {serverDisplayName}
              </h1>
              <p className="text-xs text-blue-300/80 mt-1 font-mono">
                VexShield Enterprise Protection
              </p>
            </div>
          </div>
        </div>

        {/* 4 Top Server Info Cards (WaveShield Style) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4 mb-4 shrink-0">
          {/* 1. Server Status Card */}
          <div className="rounded-xl border border-white/10 bg-[#090e18] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">SERVER STATUS</span>
              </div>
              <Badge
                variant={server.status === "online" ? "default" : "destructive"}
                className={cn("text-[10px] font-bold px-2 py-0.5 uppercase", server.status === "online" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "")}
              >
                {server.status === "online" ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="pt-2">
              <div className="text-xl font-bold text-white tracking-tight truncate">
                {serverDisplayName}
              </div>
              <div className="text-xs text-cyan-400/90 mt-1 font-mono">
                {acVersion ? (acVersion.toLowerCase().startsWith("v") ? acVersion : `v${acVersion}`) : "vBeta"}
              </div>
            </div>
          </div>

          {/* 2. Server IP Card */}
          <div className="rounded-xl border border-white/10 bg-[#090e18] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">SERVER IP</span>
              </div>
              {showResetIp && !ipEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIpEditing(true)}
                  className="h-6 text-[10px] font-medium border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 px-2 rounded-md"
                >
                  <Pencil className="h-3 w-3 mr-1" /> Reset IP
                </Button>
              )}
            </div>
            <div className="pt-2">
              {ipEditing ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    value={ipDraft}
                    onChange={(e) => setIpDraft(e.target.value)}
                    className="h-7 w-full rounded border border-blue-500/40 bg-[#060b14] px-2 text-xs text-zinc-200 outline-none focus:border-blue-400 font-mono"
                    placeholder="Enter server IP"
                  />
                  <button onClick={handleSaveIp} disabled={savingIp} className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setIpDraft(server?.server_ip || ""); setIpEditing(false); }} disabled={savingIp} className="p-1 text-rose-400 hover:text-rose-300 disabled:opacity-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-xl font-bold font-mono text-white tracking-tight truncate">
                  {server.server_ip || "Not set"}
                </div>
              )}
            </div>
          </div>

          {/* 3. License Key Card */}
          <div className="rounded-xl border border-white/10 bg-[#090e18] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Key className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">LICENSE KEY</span>
              </div>
              {!!licenseKey && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLicenseVisible((v) => !v)}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                    title={licenseVisible ? "Hide" : "Show"}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={copyLicense}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                    title="Copy License"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="pt-2">
              <div className="font-mono text-base sm:text-lg font-bold text-white tracking-wider truncate">
                {licenseVisible ? licenseKey || "—" : licenseKey ? "••••••••••••••••" : "••••••••••••••••"}
              </div>
            </div>
          </div>

          {/* 4. License Expiration Card */}
          <div className="rounded-xl border border-white/10 bg-[#090e18] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">LICENSE EXPIRATION</span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-2 py-0.5"
              >
                {server.expires_at ? expiryLabel : "Permanent"}
              </Badge>
            </div>
            <div className="pt-2">
              <div className="text-xl font-bold text-white tracking-tight">
                {daysUntilExpiry !== null ? `${daysUntilExpiry} days` : (server.expires_at ? expiryLabel : "Lifetime")}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards (Real Server Data) */}
        <div className="grid shrink-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard
            icon={Clock}
            label="CONNECTIONS"
            value={totalConnections}
            accent="sky"
          />
          <MetricCard
            icon={Users}
            label="TOTAL PLAYERS"
            value={stats.peakPlayers}
            accent="violet"
          />
          <MetricCard
            icon={Ban}
            label="TOTAL BANS"
            value={stats.totalBans}
            accent="rose"
          />
          <MetricCard
            icon={Shield}
            label="ONLINE NOW"
            value={playerCount}
            suffix={`/ ${maxSlots} slots`}
            accent="emerald"
          />
        </div>

        {/* Fleet Shortcuts Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl border border-white/5 bg-[#090e18] mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1.5 uppercase tracking-wider">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              Shortcuts:
            </span>
            <button
              onClick={() => navigate(isDemo ? "/demo/live-view" : `/${serverId}/live-view`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-white border border-white/10 text-zinc-300 text-xs font-medium transition-all"
            >
              <Cctv className="h-3.5 w-3.5 text-blue-400" />
              <span>Live View</span>
            </button>
            <button
              onClick={() => navigate(isDemo ? "/demo/players" : `/${serverId}/players`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-white border border-white/10 text-zinc-300 text-xs font-medium transition-all"
            >
              <Users className="h-3.5 w-3.5 text-blue-400" />
              <span>Players</span>
            </button>
            <button
              onClick={() => navigate(isDemo ? "/demo/map" : `/${serverId}/map`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-white border border-white/10 text-zinc-300 text-xs font-medium transition-all"
            >
              <MapPin className="h-3.5 w-3.5 text-blue-400" />
              <span>Radar Map</span>
            </button>
            <button
              onClick={() => navigate(isDemo ? "/demo/bans" : `/${serverId}/bans`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-600 hover:text-white border border-white/10 text-zinc-300 text-xs font-medium transition-all"
            >
              <Ban className="h-3.5 w-3.5 text-rose-400" />
              <span>Bans Matrix</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(isDemo ? "/demo/settings" : `/${serverId}/settings`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-sm shadow-blue-600/30"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Configuration</span>
            </button>
          </div>
        </div>

        {/* Lower Row: Analytics Chart & Distribution */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 flex-1 min-h-[380px]">
          <div className="xl:col-span-6 flex flex-col min-h-[380px]">
            <ServerAnalyticsChart
              data={
                analyticsSeries.length > 0
                  ? analyticsSeries
                  : buildAnalyticsSeries(
                      chartData.length === 24 ? chartData : Array(24).fill(playerCount),
                      Array(24).fill(0),
                    )
              }
              subtitle={timeRangeLabel}
            />
          </div>
          <div className="xl:col-span-3 flex flex-col min-h-[380px]">
            <DistributionDonutChart
              title="Drop Reasons"
              subtitle={timeRangeLabel}
              data={actionBreakdown}
              centerLabel="drops"
            />
          </div>
          <div className="xl:col-span-3 flex flex-col min-h-[380px]">
            <DistributionDonutChart
              title="Detections"
              subtitle={timeRangeLabel}
              data={detectionBreakdown}
              centerLabel="bans"
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

