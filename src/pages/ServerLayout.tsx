import { Suspense, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate, useParams, Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageLoader } from "@/components/PageLoader";
import { toast } from "sonner";
import { isRateLimitErrorMessage } from "@/lib/api-base";
import { defaultPathForServer, isPcCheckerOnlyMode } from "@/lib/server-mode";
import { RequirePageAccess } from "@/components/RequirePageAccess";
import { AdminPermissionsProvider } from "@/hooks/useAdminPermissions";
import { prefetchCommonDashboardPages } from "@/lib/prefetch-dashboard-pages";
import { readConnectedServer, recoverConnectedServerSession, setConnectedServer, type ConnectedServerSession } from "@/lib/connected-server";
import { validateServerSessionCached } from "@/lib/server-auth-cache";
import * as Pages from "@/routes/lazyPages";
import { useTranslation } from "react-i18next";

const VALID_SERVER_PATHS = new Set([
  "",
  "/",
  "/dashboard",
  "/analytics",
  "/users/search",
  "/users/graph",
  "/users/list",
  "/server-panel",
  "/download",
  "/players",
  "/console",
  "/map",
  "/live-view",
  "/search",
  "/warns",
  "/kicks",
  "/bans",
  "/ban-history",
  "/resources",
  "/admins",
  "/whitelist-admin",
  "/activity",
  "/settings",
  "/config-library",
  "/models",
  "/vehicles",
  "/blacklist-detections",
  "/support",
]);

export default function ServerLayout() {
  const { t } = useTranslation();
  const { serverId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const rawSubPath = serverId && location.pathname.startsWith(`/${serverId}`)
    ? location.pathname.slice(`/${serverId}`.length)
    : location.pathname;
  const normalizedSubPath = rawSubPath.replace(/\/+$/, "") || "/";
  const isKnownRoute = VALID_SERVER_PATHS.has(normalizedSubPath) || VALID_SERVER_PATHS.has(rawSubPath);

  const lockMainScroll =
    location.pathname.includes("/live-view") ||
    location.pathname.includes("/dashboard") ||
    location.pathname.includes("/analytics") ||
    location.pathname.includes("/server-panel") ||
    location.pathname.includes("/users/") ||
    location.pathname.includes("/settings") ||
    location.pathname.includes("/activity") ||
    location.pathname.includes("/map") ||
    location.pathname.includes("/pcchecker/");

  useEffect(() => {
    if (!serverId || !isKnownRoute) return;
    const existingSession = readConnectedServer();
    if (!existingSession) return;

    if (existingSession.selected_dashboard !== "airshield") {
      setConnectedServer({
        ...existingSession,
        selected_dashboard: "airshield",
      });
    }
  }, [serverId, location.pathname, isKnownRoute]);

  useEffect(() => {
    if (!serverId || !isKnownRoute || !isPcCheckerOnlyMode()) return;
    const path = location.pathname.replace(/\/+$/, "");
    const base = `/${serverId}`;
    if (path === base || path === `${base}/dashboard`) {
      navigate(`${base}/${defaultPathForServer()}`, { replace: true });
    }
  }, [serverId, location.pathname, navigate, isKnownRoute]);

  useEffect(() => {
    if (!isKnownRoute) return;
    const run = () => prefetchCommonDashboardPages();
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 400);
    return () => window.clearTimeout(t);
  }, [serverId, isKnownRoute]);

  useEffect(() => {
    if (!isKnownRoute) return;
    let cancelled = false;

    const getValidSession = async (retryCount = 0): Promise<ConnectedServerSession | null> => {
      const existing = readConnectedServer();

      // If existing session matches serverId and has a license key, use it even if recovery fails
      // This prevents false "Server Not Found" when API is temporarily down
      if (
        existing?.server_id === serverId &&
        typeof existing.license_key === "string" &&
        existing.license_key.trim()
      ) {
        return existing;
      }

      const recovered = await recoverConnectedServerSession(serverId);
      if (recovered) {
        return recovered;
      }

      // Retry on temporary failures before giving up
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return getValidSession(retryCount + 1);
      }

      if (existing) {
        toast.error(t("dashboard.common.invalidServerConnection"));
      } else {
        toast.error(t("dashboard.common.connectToServerFirst"));
      }
      navigate("/");
      return null;
    };

    const checkExpiry = async (retryCount = 0) => {
      const serverData = await getValidSession();
      if (!serverData || cancelled) return;
      const licenseCheckKey = `aircore_license_check_${serverData.server_id}`;
      const lastCheck = Number(sessionStorage.getItem(licenseCheckKey) || 0);
      if (Date.now() - lastCheck < 120_000) return;

      if (typeof serverData.license_key !== "string" || !serverData.license_key.trim()) {
        toast.error(t("dashboard.common.missingLicenseKey"));
        sessionStorage.removeItem("connected_server");
        navigate("/");
        return;
      }
      try {
        const { status, ok, body } = await validateServerSessionCached(String(serverId), serverData.license_key);
        sessionStorage.setItem(licenseCheckKey, String(Date.now()));
        if (status === 429 || status >= 500) {
          // Retry on rate limit or server errors
          if (retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            return checkExpiry(retryCount + 1);
          }
          return;
        }
        if (!ok) {
          toast.error(body.error || t("dashboard.common.serverNoLongerExists"));
          sessionStorage.removeItem("connected_server");
          navigate("/");
          return;
        }
        if (body.ok && typeof body.license_key === "string" && body.license_key && body.license_key !== serverData.license_key) {
          setConnectedServer({ ...serverData, ...body, license_key: body.license_key });
        }
        if (body.expires_at) {
          const expiresAt = new Date(body.expires_at);
          if (expiresAt < new Date()) {
            toast.error(t("dashboard.common.licenseExpired"));
            sessionStorage.removeItem("connected_server");
            navigate("/");
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (isRateLimitErrorMessage(msg)) return;
        toast.error(t("dashboard.common.verifyConnectionFailed"));
      }
    };

    const defer =
      typeof window.requestIdleCallback === "function"
        ? (fn: () => void) => window.requestIdleCallback(fn, { timeout: 4000 })
        : (fn: () => void) => window.setTimeout(fn, 1500);

    const idleHandle = defer(() => {
      void checkExpiry();
    });
    const interval = window.setInterval(() => void checkExpiry(), 120_000);
    return () => {
      cancelled = true;
      if (typeof idleHandle === "number") window.clearTimeout(idleHandle);
      else if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle);
      window.clearInterval(interval);
    };
  }, [serverId, navigate, t, isKnownRoute]);

  if (!isKnownRoute) {
    return <Pages.NotFound />;
  }

  return (
    <div className="dashboard-viewport">
      <div className="dashboard-ui-scale">
        <AdminPermissionsProvider serverId={serverId}>
          <SidebarProvider>
            <AppSidebar />

            <SidebarInset
              className={cn(
                "relative !min-h-0 h-full min-w-0 bg-[#0F1017] dashboard-shell",
                lockMainScroll
                  ? "flex max-h-full flex-col overflow-x-hidden overflow-y-hidden"
                  : "overflow-x-hidden overflow-y-auto",
              )}
            >
              {/* Ambient Background Grid */}
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-5" />

              <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 flex-col">
                  <Suspense fallback={<PageLoader compact />}>
                    <Routes>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route
                        path="dashboard"
                        element={
                          <RequirePageAccess page="dashboard">
                            <Pages.ServerDashboard />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <RequirePageAccess page="dashboard">
                            <Pages.ServerDashboard />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="analytics"
                        element={
                          <RequirePageAccess page="dashboard">
                            <Pages.ServerAnalyticsPage />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/analytics"
                        element={
                          <RequirePageAccess page="dashboard">
                            <Pages.ServerAnalyticsPage />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/users/search"
                        element={
                          <RequirePageAccess page="users">
                            <Pages.Search />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/users/graph"
                        element={
                          <RequirePageAccess page="users">
                            <Pages.UsersGraph />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/users/list"
                        element={
                          <RequirePageAccess page="users">
                            <Pages.UsersList />
                          </RequirePageAccess>
                        }
                      />
                      <Route path="/server-panel" element={<Navigate to="dashboard" replace />} />
                      <Route
                        path="/download"
                        element={
                          <RequirePageAccess page="dashboard" licenseOwnerOnly>
                            <Pages.DownloadPage />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/players"
                        element={
                          <RequirePageAccess page="players">
                            <Pages.ServerPlayers />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/console"
                        element={
                          <RequirePageAccess page="console">
                            <Pages.ServerConsole />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/map"
                        element={
                          <RequirePageAccess page="map">
                            <Pages.Map />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/live-view"
                        element={
                          <RequirePageAccess page="live-view">
                            <Pages.ServerMonitoring />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/search"
                        element={
                          <RequirePageAccess page="search">
                            <Pages.Search />
                          </RequirePageAccess>
                        }
                      />
                      <Route path="/warns" element={<Navigate to="dashboard" replace />} />
                      <Route path="/kicks" element={<Navigate to="dashboard" replace />} />
                      <Route
                        path="/bans"
                        element={
                          <RequirePageAccess page="bans">
                            <Pages.Bans />
                          </RequirePageAccess>
                        }
                      />
                      <Route path="/ban-history" element={<Navigate to="bans" replace />} />
                      <Route
                        path="/resources"
                        element={
                          <RequirePageAccess page="resources">
                            <Pages.Resources />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/admins"
                        element={
                          <RequirePageAccess page="admins">
                            <Pages.Admins />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/whitelist-admin"
                        element={
                          <RequirePageAccess page="settings">
                            <Pages.WhitelistAdmin />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/activity"
                        element={
                          <RequirePageAccess page="activity">
                            <Pages.Activity />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <RequirePageAccess page="settings">
                            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                              <Pages.Settings />
                            </div>
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/config-library"
                        element={
                          <RequirePageAccess page="settings">
                            <Pages.ConfigLibrary />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/models"
                        element={
                          <RequirePageAccess page="settings">
                            <Pages.Models />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/vehicles"
                        element={
                          <RequirePageAccess page="settings">
                            <Pages.Vehicles />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/logs"
                        element={
                          <RequirePageAccess page="activity">
                            <Pages.Logs />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/blacklist-detections"
                        element={
                          <RequirePageAccess page="blacklist-detections">
                            <Pages.BlacklistDetections />
                          </RequirePageAccess>
                        }
                      />
                      <Route
                        path="/support"
                        element={<Pages.DashboardSupport />}
                      />
                      <Route path="*" element={<Pages.NotFound />} />
                    </Routes>
                  </Suspense>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </AdminPermissionsProvider>
      </div>
    </div>
  );
}
