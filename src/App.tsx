import { Suspense, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserAuthProvider } from "@/contexts/UserAuthContext";
import { AuthModal } from "@/components/AuthModal";
import { AppSidebar } from "@/components/AppSidebar";
import { SeasonalEffects } from "@/components/SeasonalEffects";
import { PromotionWelcomeModal } from "@/components/PromotionWelcomeModal";
import { MaintenanceNotice } from "@/components/MaintenanceNotice";

import { PageLoader } from "@/components/PageLoader";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { cn } from "@/lib/utils";
import { lazyWithRetry } from "@/lib/lazy-with-retry";
import * as Pages from "@/routes/lazyPages";
import { AdminPermissionsProvider } from "@/hooks/useAdminPermissions";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";
import { SEOHelmet } from "@/components/SEOHelmet";

const Home = lazyWithRetry(() => import("@/pages/Home"));

const MaintenanceWrapper = ({ children }: { children: React.ReactNode }) => {
  const { ok: isAdmin, checking: isCheckingAdmin } = useRequireSiteAdmin();
  const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

  const showMaintenance = MAINTENANCE_MODE && (!isCheckingAdmin && !isAdmin);

  return (
    <>
      {showMaintenance && <MaintenanceNotice />}
      {children}
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const VALID_DEMO_PATHS = new Set([
  "",
  "/",
  "/dashboard",
  "/analytics",
  "/models",
  "/download",
  "/users/search",
  "/users/graph",
  "/users/list",
  "/players",
  "/map",
  "/live-view",
  "/bans",
  "/blacklist-detections",
  "/server-panel",
  "/console",
  "/resources",
  "/admins",
  "/whitelist-admin",
  "/activity",
  "/logs",
  "/settings",
  "/config-library",
]);

const DemoLayout = () => {
  const { showAuthModal } = useAuth();
  const location = useLocation();

  const rawSubPath = location.pathname.startsWith("/demo")
    ? location.pathname.slice("/demo".length)
    : location.pathname;
  const normalizedSubPath = rawSubPath.replace(/\/+$/, "") || "/";
  const isKnownRoute = VALID_DEMO_PATHS.has(normalizedSubPath) || VALID_DEMO_PATHS.has(rawSubPath);

  if (!isKnownRoute) {
    return <Pages.NotFound />;
  }

  const lockMainScroll =
    location.pathname.includes("/live-view") ||
    location.pathname.includes("/dashboard") ||
    location.pathname.includes("/analytics") ||
    location.pathname.includes("/map") ||
    location.pathname === "/demo";

  return (
    <div className="dashboard-viewport">
      <div className="dashboard-ui-scale">
        <AdminPermissionsProvider demo>
          <SidebarProvider>
            <AppSidebar />

            <SidebarInset
              className={cn(
                "relative !min-h-0 h-full min-w-0 bg-[#030d1b] dashboard-shell",
                lockMainScroll ? "flex max-h-full flex-col overflow-hidden" : "overflow-auto",
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
              <div className="pointer-events-none absolute -top-32 left-1/4 h-[550px] w-[550px] rounded-full bg-cyan-500/20 blur-[140px]" />
              <div className="pointer-events-none absolute top-1/3 -right-32 h-[550px] w-[550px] rounded-full bg-blue-600/20 blur-[140px]" />
              <div className="pointer-events-none absolute bottom-0 left-1/3 h-[450px] w-[450px] rounded-full bg-cyan-600/15 blur-[130px]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/[0.04] via-transparent to-blue-600/[0.04]" />

              <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
                <Suspense fallback={<PageLoader compact />}>
                  <Routes>
                    <Route index element={<Navigate to="/demo/dashboard" replace />} />
                    <Route path="/dashboard" element={<Pages.ServerDashboard />} />
                    <Route path="/analytics" element={<Pages.ServerAnalyticsPage />} />
                    <Route path="/models" element={<Pages.Models />} />
                    <Route path="/users/search" element={<Pages.Search />} />
                    <Route path="/users/graph" element={<Pages.UsersGraph />} />
                    <Route path="/users/list" element={<Pages.UsersList />} />
                    <Route path="/players" element={<Pages.Players />} />
                    <Route path="/map" element={<Pages.Map />} />
                    <Route path="/live-view" element={<Pages.ServerMonitoring />} />
                    <Route path="/bans" element={<Pages.Bans />} />
                    <Route path="/blacklist-detections" element={<Pages.BlacklistDetections />} />
                    <Route path="/server-panel" element={<Pages.ServerPanel />} />
                    <Route path="/console" element={<Pages.Console />} />
                    <Route path="/resources" element={<Pages.Resources />} />
                    <Route path="/admins" element={<Pages.Admins />} />
                    <Route path="/whitelist-admin" element={<Pages.WhitelistAdmin />} />
                    <Route path="/activity" element={<Pages.Activity />} />
                    <Route path="/logs" element={<Pages.Activity />} />
                    <Route path="/settings" element={<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"><Pages.Settings /></div>} />
                    <Route path="/config-library" element={<Pages.ConfigLibrary />} />
                    <Route path="/download" element={<Pages.DownloadPage />} />
                    <Route path="*" element={<Pages.NotFound />} />
                  </Routes>
                </Suspense>
              </div>

              {showAuthModal ? <AuthModal /> : null}
            </SidebarInset>
          </SidebarProvider>
        </AdminPermissionsProvider>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <SEOHelmet />
          <RouteErrorBoundary>
            <UserAuthProvider>
              <AuthProvider>
                <SeasonalEffects />
                <PromotionWelcomeModal />
                <MaintenanceWrapper>
                  <div className="relative min-h-screen overflow-x-hidden">
                    <div className="relative z-40">
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/features" element={<Navigate to="/" replace />} />
                        <Route path="/home" element={<Navigate to="/" replace />} />
                        <Route path="/pricing" element={<Pages.Pricing />} />
                        <Route path="/plan/:planId" element={<Pages.PlanDetails />} />
                        <Route path="/search" element={<Pages.Search />} />
                        <Route path="/auth" element={<Pages.Auth />} />
                        <Route path="/auth/verify-2fa" element={<Pages.MfaVerify />} />
                        <Route path="/reset-password" element={<Pages.ResetPassword />} />
                        <Route path="/download" element={<Pages.DownloadPage />} />
                        <Route path="/my-servers" element={<Pages.MyServers />} />
                        <Route path="/servers" element={<Navigate to="/my-servers" replace />} />
                        <Route path="/models" element={<Pages.Models />} />
                        <Route path="/library" element={<Pages.ConfigLibrary />} />
                        <Route path="/configs-library" element={<Pages.ConfigLibrary />} />
                        <Route path="/profile-settings" element={<Navigate to="/my-servers" replace />} />
                        <Route path="/terms" element={<Pages.Terms />} />
                        <Route path="/privacy" element={<Pages.Privacy />} />
                        <Route path="/refund" element={<Pages.Refund />} />
                        <Route path="/faqs" element={<Pages.FAQs />} />
                        <Route path="/partners" element={<Pages.Partners />} />
                        <Route path="/documentation" element={<Pages.Documentation />} />
                        <Route path="/documentation/:pageId" element={<Pages.Documentation />} />
                        <Route path="/help-center" element={<Pages.Support />} />
                        <Route path="/support" element={<Navigate to="/help-center" replace />} />
                        <Route path="/staff-panel" element={<Navigate to="/" replace />} />
                        <Route path="/support-panel" element={<Navigate to="/" replace />} />
                        <Route path="/staff/verify-2fa" element={<Navigate to="/" replace />} />

                        {/* About & Contact Pages */}
                        <Route path="/about" element={<Pages.AboutPage />} />
                        <Route path="/contact" element={<Pages.ContactPage />} />

                        <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
                        <Route path="/admin/verify-2fa" element={<Navigate to="/admin" replace />} />
                        <Route path="/admin" element={<Pages.AdminDashboard />} />
                        <Route path="/admin/products" element={<Pages.AdminProducts />} />
                        <Route path="/admin/servers" element={<Pages.AdminServers />} />
                        <Route
                          path="/admin/blacklisted-servers"
                          element={<Pages.AdminBlacklistedServers />}
                        />
                        <Route path="/admin/blocked-users" element={<Pages.AdminBlockedUsers />} />
                        <Route path="/admin/users" element={<Pages.AdminUsers />} />
                        <Route path="/admin/global-bans" element={<Pages.AdminGlobalBans />} />
                        <Route path="/admin/redeem-codes" element={<Pages.AdminRedeemCodes />} />
                        <Route path="/admin/coupon-codes" element={<Pages.AdminCouponCodes />} />
                        <Route path="/admin/promotions" element={<Pages.AdminPromotions />} />
                        <Route path="/admin/air-eye" element={<Pages.AdminAirEye />} />
                        <Route path="/admin/activity-log" element={<Pages.AdminActivityLog />} />
                        <Route path="/admin/backups" element={<Pages.AdminBackups />} />
                        <Route path="/admin/shared-configs" element={<Pages.AdminSharedConfigs />} />
                        <Route path="/admin/tickets" element={<Pages.AdminTickets />} />
                        <Route path="/admin/orders" element={<Pages.AdminOrders />} />
                        <Route path="/admin/orders/:orderNumber" element={<Pages.AdminOrders />} />
                        <Route path="/admin/ban-removal-requests" element={<Pages.AdminBanRemovalRequests />} />

                        <Route path="/:serverId/*" element={<Pages.ServerLayout />} />
                        <Route path="/demo/*" element={<DemoLayout />} />

                        <Route path="/404" element={<Pages.NotFound />} />
                        <Route path="*" element={<Pages.NotFound />} />
                      </Routes>
                    </Suspense>
                  </div>
                </div>
              </MaintenanceWrapper>
            </AuthProvider>
          </UserAuthProvider>
        </RouteErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
