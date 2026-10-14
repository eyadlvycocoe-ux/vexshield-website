/** Prefetch lazy dashboard chunks for smoother sidebar navigation. */
const PAGE_LOADERS: Record<string, () => Promise<unknown>> = {
  dashboard: () => import("@/pages/ServerDashboard"),
  analytics: () => import("@/pages/Analytics"),
  download: () => import("@/pages/DownloadPage"),
  "users/search": () => import("@/pages/UsersSearch"),
  "users/graph": () => import("@/pages/UsersGraph"),
  "users/list": () => import("@/pages/UsersList"),
  "server-panel": () => import("@/pages/ServerPanel"),
  players: () => import("@/pages/ServerPlayers"),
  search: () => import("@/pages/Search"),
  map: () => import("@/pages/Map"),
  "live-view": () => import("@/pages/ServerMonitoring"),
  bans: () => import("@/pages/Bans"),
  console: () => import("@/pages/ServerConsole"),
  resources: () => import("@/pages/Resources"),
  admins: () => import("@/pages/Admins"),
  activity: () => import("@/pages/Activity"),
  settings: () => import("@/pages/Settings"),
  vehicles: () => import("@/pages/Vehicles"),
  logs: () => import("@/pages/Logs"),
  "blacklist-detections": () => import("@/pages/BlacklistDetections"),
};

const prefetched = new Set<string>();

export function prefetchDashboardPage(segment: string) {
  const normalized = segment.replace(/^\//, "").split("?")[0] || "dashboard";
  const loader =
    PAGE_LOADERS[normalized] ??
    PAGE_LOADERS[normalized.split("/")[0] || "dashboard"];
  const cacheKey = normalized.split("/")[0] || "dashboard";
  if (!loader || prefetched.has(cacheKey)) return;
  prefetched.add(cacheKey);
  void loader();
}

export function prefetchCommonDashboardPages() {
  const keys = ["dashboard", "players", "map"];
  keys.forEach((key, index) => {
    window.setTimeout(() => prefetchDashboardPage(key), index * 250);
  });
}

/** Extract page segment from `/{serverId}/settings` style paths. */
export function dashboardPathSegment(pathname: string, baseUrl: string): string {
  const prefix = `${baseUrl}/`;
  if (!pathname.startsWith(prefix)) return "dashboard";
  return pathname.slice(prefix.length).split("?")[0] || "dashboard";
}
