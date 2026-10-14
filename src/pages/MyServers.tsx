import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Server,
  Key,
  ChevronRight,
  Globe,
  Plus,
} from "lucide-react";
import { RedeemKeyModal } from "@/components/RedeemKeyModal";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminPermissionsProvider } from "@/hooks/useAdminPermissions";
import { readConnectedServer, setConnectedServer } from "@/lib/connected-server";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { apiUrl, fetchSiteStaffVerified } from "@/lib/api-base";
import { useRequireSiteSupport } from "@/hooks/useRequireSiteSupport";
import { useTranslation } from "react-i18next";

type ServerAccessRole = "owner" | "admin" | "other";

interface ServerData {
  id: string;
  server_id: string;
  license_key: string;
  display_name: string | null;
  status: string;
  owner_email: string | null;
  accessRole: ServerAccessRole;
  player_count: number;
  bans_count?: number;
  ent_airshield?: number | boolean;
  expires_at?: string | null;
  soft_deleted_at?: string | null;
}

function normalizeServerStatus(status: string | undefined) {
  return String(status || "").trim().toLowerCase();
}

type DashboardServerRow = {
  id: string;
  server_id: string;
  license_key: string;
  display_name: string | null;
  status: string;
  owner_email: string | null;
  isOwner: boolean;
  player_count?: number;
  bans_count?: number;
  ent_airshield?: number | boolean;
  expires_at?: string | null;
  soft_deleted_at?: string | null;
};

async function fetchJsonApi<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", "X-AirCore-Client": "1" },
  });
  const raw = await res.text();
  let body: { error?: string } | T = null as T;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Invalid API response (${res.status})`);
  }
  if (!res.ok) {
    const msg =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export default function MyServers() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<ServerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [siteAdminChecked, setSiteAdminChecked] = useState(false);
  const [listMode, setListMode] = useState<"mine" | "global">("mine");
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  const { user, loading: authLoading } = useUserAuth();
  useRequireSiteSupport();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error(t("myServers.signInRequired"));
      navigate("/auth");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const allowed = await fetchSiteStaffVerified();
        if (!cancelled) setIsSiteAdmin(allowed);
      } catch {
        if (!cancelled) setIsSiteAdmin(false);
      } finally {
        if (!cancelled) setSiteAdminChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, navigate, t]);

  useEffect(() => {
    if (!isSiteAdmin && listMode === "global") {
      setListMode("mine");
    }
  }, [isSiteAdmin, listMode]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (listMode === "global" && !isSiteAdmin) {
      setLoading(false);
      return;
    }

    loadServers(user.email ?? "", user.id, listMode === "global" && isSiteAdmin);
  }, [authLoading, user, listMode, isSiteAdmin]);

  const loadServers = async (email: string, userId: string, showGlobal: boolean) => {
    setLoading(true);
    const emailNorm = email.trim().toLowerCase();

    try {
      if (showGlobal) {
        const allRows = await fetchJsonApi<DashboardServerRow[]>("/api/admin/servers?active_only=true");

        const { data: adminAccess } = await supabase
          .from("server_admins")
          .select("server_id")
          .eq("user_id", userId);

        const adminServerIds = new Set((adminAccess ?? []).map((a) => a.server_id).filter(Boolean));
        const activeRows = (allRows ?? []).filter((s) => !s.soft_deleted_at);

        const mergedBase = activeRows.map((s) => {
          const ownerMatch = !!(s.owner_email && String(s.owner_email).trim().toLowerCase() === emailNorm);
          const accessRole: ServerAccessRole = ownerMatch
            ? "owner"
            : adminServerIds.has(s.server_id)
              ? "admin"
              : "other";
          return { ...s, accessRole };
        });

        setServers(
          mergedBase.map((s) => ({
            ...s,
            player_count: s.player_count ?? 0,
            bans_count: s.bans_count ?? 0,
          })),
        );
        return;
      }

      const rows = await fetchJsonApi<DashboardServerRow[]>("/api/users/me/dashboard-servers");
      const activeRows = (rows ?? []).filter((s) => !s.soft_deleted_at);
      const merged = activeRows.map((s) => ({
        ...s,
        accessRole: s.isOwner ? ("owner" as const) : ("admin" as const),
        player_count: s.player_count ?? 0,
        bans_count: s.bans_count ?? 0,
      }));

      const unique = Array.from(new Map(merged.map((s) => [s.id, s])).values());
      setServers(unique);
    } catch (error: unknown) {
      console.error("Error loading servers:", error);
      toast.error(t("myServers.loadFailed"));
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateToDashboard = (server: ServerData) => {
    const session = {
      server_id: server.server_id,
      license_key: server.license_key,
      display_name: server.display_name,
      status: server.status,
      owner_email: server.owner_email,
      ent_airshield: server.ent_airshield ?? 1,
      selected_dashboard: "airshield" as const,
    };
    setConnectedServer(session);
    navigate(`/${server.server_id}/dashboard`);
  };

  return (
    <div className="dashboard-viewport">
      <div className="dashboard-ui-scale">
        <AdminPermissionsProvider demo={!readConnectedServer()?.server_id}>
          <SidebarProvider>
            <AppSidebar />

            <SidebarInset className="relative !min-h-0 h-full min-w-0 bg-[#070b14] dashboard-shell overflow-y-auto text-white selection:bg-cyan-500/30 selection:text-cyan-200">
              {/* Subtle Dark Cyber Background Grid */}
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.02]" />

              <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col p-5 sm:p-8 lg:p-10 max-w-[1400px] mx-auto w-full">

                {/* Top Header: Title & Action */}
                <div className="flex items-center justify-between gap-4 pb-8">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      VexShield
                    </h1>

                    {siteAdminChecked && isSiteAdmin && (
                      <ToggleGroup
                        type="single"
                        value={listMode}
                        onValueChange={(v) => {
                          if (v === "mine" || v === "global") setListMode(v);
                        }}
                        className="border border-white/10 bg-[#0b1220] p-0.5 rounded-lg text-xs"
                      >
                        <ToggleGroupItem
                          value="mine"
                          className="data-[state=on]:bg-blue-600 data-[state=on]:text-white text-zinc-400 px-3 py-1 text-xs font-medium rounded-md"
                        >
                          My Servers
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="global"
                          className="data-[state=on]:bg-blue-600 data-[state=on]:text-white text-zinc-400 px-3 py-1 text-xs font-medium rounded-md gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          Global
                        </ToggleGroupItem>
                      </ToggleGroup>
                    )}
                  </div>

                  <button
                    onClick={() => setShowRedeemModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs sm:text-sm px-4 py-2 shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Key className="h-4 w-4" />
                    <span>Redeem License</span>
                  </button>
                </div>

                {/* Section: Your Servers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-zinc-200">
                      Your Servers
                    </h2>
                    <span className="text-xs text-zinc-400">
                      {servers.length} {servers.length === 1 ? "server" : "servers"} connected
                    </span>
                  </div>

                  {loading ? (
                    <div className="rounded-xl border border-white/5 bg-[#090e18] p-10 flex flex-col items-center justify-center gap-2.5">
                      <div className="h-6 w-6 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                      <p className="text-xs text-zinc-400">Loading your server fleet...</p>
                    </div>
                  ) : servers.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-[#090e18] p-10 text-center">
                      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                        <Server className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-zinc-300">No servers found</p>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                        Activate your first server by redeeming a license key.
                      </p>
                      <button
                        onClick={() => setShowRedeemModal(true)}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Redeem License</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {servers.map((server) => {
                        const isOnline = normalizeServerStatus(server.status) === "online";
                        const displayName = server.display_name || server.server_id;

                        return (
                          <div
                            key={server.id}
                            onClick={() => navigateToDashboard(server)}
                            className="group rounded-xl border border-white/5 bg-[#090e18] hover:bg-[#0c1424] hover:border-blue-500/30 p-4 transition-all duration-200 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="size-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors shrink-0">
                                <Server className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                                  {displayName}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-400">
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className={cn(
                                        "size-1.5 rounded-full",
                                        isOnline ? "bg-emerald-400" : "bg-zinc-500"
                                      )}
                                    />
                                    <span className={isOnline ? "text-emerald-400 font-medium" : "text-zinc-500"}>
                                      {isOnline ? "Online" : "Offline"}
                                    </span>
                                  </span>

                                  <span className="text-zinc-600">·</span>

                                  <span className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
                                    <span className="size-1.5 rounded-full bg-blue-400" />
                                    <span>
                                      Expires: {server.expires_at ? new Date(server.expires_at).toLocaleDateString() : "Active"}
                                    </span>
                                  </span>

                                  <span className="text-zinc-600">·</span>

                                  <span className="text-zinc-400 text-[11px]">
                                    {server.player_count} Players
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Redeem License Key Modal */}
                <RedeemKeyModal
                  open={showRedeemModal}
                  onOpenChange={setShowRedeemModal}
                  onSuccess={() => {
                    if (user) {
                      loadServers(user.email ?? "", user.id, listMode === "global" && isSiteAdmin);
                    }
                  }}
                />

              </div>
            </SidebarInset>
          </SidebarProvider>
        </AdminPermissionsProvider>
      </div>
    </div>
  );
}
