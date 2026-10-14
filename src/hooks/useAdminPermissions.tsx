import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { hasPageAccess, normalizeAdminPermissions } from "@/lib/admin-permissions";
import { clearServerPermissionsCache, fetchServerPermissionsCached } from "@/lib/server-auth-cache";

export type Permission = string;

export { hasPageAccess, canEditPage } from "@/lib/admin-permissions";

interface AdminPermissions {
  permissions: string[];
  isOwner: boolean;
  isLicenseOwner: boolean;
  isLoading: boolean;
}

type CachedPayload = Pick<AdminPermissions, "permissions" | "isOwner" | "isLicenseOwner">;

const DEFAULT: CachedPayload = {
  permissions: ["all"],
  isOwner: true,
  isLicenseOwner: true,
};

const DEMO_PAYLOAD: CachedPayload = {
  permissions: ["all"],
  isOwner: true,
  isLicenseOwner: true,
};

const permissionsCache = new Map<string, CachedPayload>();

const PERMS_STORAGE_PREFIX = "aircore_perms_";

function readStoredPermissions(serverId: string): CachedPayload | null {
  try {
    const raw = sessionStorage.getItem(`${PERMS_STORAGE_PREFIX}${serverId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!Array.isArray(parsed.permissions)) return null;
    return {
      ...parsed,
      permissions: normalizeAdminPermissions(parsed.permissions),
    };
  } catch {
    return null;
  }
}

function storePermissions(serverId: string, payload: CachedPayload) {
  try {
    sessionStorage.setItem(
      `${PERMS_STORAGE_PREFIX}${serverId}`,
      JSON.stringify({ ...payload, permissions: normalizeAdminPermissions(payload.permissions) }),
    );
  } catch {
    /* ignore */
  }
}

function readCachedPermissions(serverId: string | null): CachedPayload | null {
  if (!serverId) return null;
  return permissionsCache.get(serverId) ?? readStoredPermissions(serverId);
}

const AdminPermissionsContext = createContext<AdminPermissions>({
  ...DEFAULT,
  isLoading: true,
});

function readConnectedServerId(): string | null {
  const raw = sessionStorage.getItem("connected_server");
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { server_id?: unknown };
    return typeof j.server_id === "string" && j.server_id.trim() ? j.server_id.trim() : null;
  } catch {
    return null;
  }
}

export function invalidateAdminPermissionsCache(serverId?: string | null) {
  if (serverId) {
    permissionsCache.delete(serverId);
    clearServerPermissionsCache(serverId);
    try {
      sessionStorage.removeItem(`${PERMS_STORAGE_PREFIX}${serverId}`);
    } catch {
      /* ignore */
    }
  } else {
    permissionsCache.clear();
    clearServerPermissionsCache();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(PERMS_STORAGE_PREFIX)) sessionStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent("aircore:permissions-invalidate"));
}

export function AdminPermissionsProvider({
  children,
  serverId,
  demo = false,
}: {
  children: ReactNode;
  serverId?: string | null;
  demo?: boolean;
}) {
  const { user, loading: authLoading } = useUserAuth();
  const resolvedServerId = demo ? null : (serverId?.trim() || readConnectedServerId());

  const [state, setState] = useState<AdminPermissions>(() => {
    if (demo) return { ...DEMO_PAYLOAD, isLoading: false };
    const cached = readCachedPermissions(resolvedServerId);
    if (cached) {
      if (resolvedServerId) permissionsCache.set(resolvedServerId, cached);
      return { ...cached, isLoading: false };
    }
    return { ...DEFAULT, isLoading: !demo };
  });

  useEffect(() => {
    if (demo) {
      setState({ ...DEMO_PAYLOAD, isLoading: false });
      return;
    }

    let cancelled = false;

    const apply = (payload: CachedPayload, loading: boolean) => {
      if (!cancelled) setState({ ...payload, isLoading: loading });
    };

    async function load(force = false) {
      const sid = serverId?.trim() || readConnectedServerId();
      if (!sid) {
        if (!authLoading) apply(DEFAULT, false);
        return;
      }

      if (!user && !authLoading) {
        apply(DEFAULT, false);
        return;
      }

      if (!force) {
        const cached = readCachedPermissions(sid);
        if (cached) {
          permissionsCache.set(sid, cached);
          apply(cached, false);
          void revalidate(sid);
          return;
        }
      }

      apply(readCachedPermissions(sid) ?? DEFAULT, !readCachedPermissions(sid));

      await revalidate(sid);
    }

    async function revalidate(sid: string, attempt = 0) {
      try {
        const payload = await fetchServerPermissionsCached(sid);
        if (cancelled) return;

        permissionsCache.set(sid, payload);
        storePermissions(sid, payload);
        apply(payload, false);
      } catch {
        if (cancelled) return;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          return revalidate(sid, attempt + 1);
        }
        apply(readCachedPermissions(sid) ?? DEFAULT, false);
      }
    }

    void load();

    const onInvalidate = () => {
      const sid = serverId?.trim() || readConnectedServerId();
      if (sid) permissionsCache.delete(sid);
      void load(true);
    };
    window.addEventListener("aircore:permissions-invalidate", onInvalidate);
    window.addEventListener("aircore:connected-server", onInvalidate);

    return () => {
      cancelled = true;
      window.removeEventListener("aircore:permissions-invalidate", onInvalidate);
      window.removeEventListener("aircore:connected-server", onInvalidate);
    };
  }, [authLoading, user?.id, serverId, demo]);

  return (
    <AdminPermissionsContext.Provider value={state}>{children}</AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions(): AdminPermissions {
  return useContext(AdminPermissionsContext);
}

export function hasPermission(permissions: string[], requiredPermission: string): boolean {
  return hasPageAccess(permissions, requiredPermission);
}

export const pagePermissionMap: Record<string, Permission> = {
  dashboard: "dashboard",
  players: "players",
  map: "map",
  "live-view": "live-view",
  search: "search",
  warns: "warns",
  kicks: "kicks",
  bans: "bans",
  console: "console",
  resources: "resources",
  admins: "admins",
  activity: "activity",
  settings: "settings",
  "blacklist-detections": "blacklist-detections",
};
