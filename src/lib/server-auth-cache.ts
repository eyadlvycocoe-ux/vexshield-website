import { apiUrl, fetchWithTimeout } from "@/lib/api-base";
import { normalizeAdminPermissions } from "@/lib/admin-permissions";

type ServerSessionBody = {
  error?: string;
  ok?: boolean;
  license_key?: string;
  expires_at?: string | null;
};

type ServerSessionResult = {
  status: number;
  ok: boolean;
  body: ServerSessionBody;
};

type ServerPermissionsPayload = {
  permissions: string[];
  isOwner: boolean;
  isLicenseOwner: boolean;
};

const serverSessionInflight = new Map<string, Promise<ServerSessionResult>>();
const serverSessionCache = new Map<string, { expiresAt: number; result: ServerSessionResult }>();

const serverPermissionsInflight = new Map<string, Promise<ServerPermissionsPayload>>();
const serverPermissionsCache = new Map<string, { expiresAt: number; payload: ServerPermissionsPayload }>();

const SERVER_SESSION_TTL_MS = 120_000;
const SERVER_PERMISSIONS_TTL_MS = 60_000;

const DEFAULT_PERMISSIONS: ServerPermissionsPayload = {
  permissions: ["all"],
  isOwner: true,
  isLicenseOwner: true,
};

const PERMS_STORAGE_PREFIX = "aircore_perms_";

function readStoredPermissionsFromSession(serverId: string): ServerPermissionsPayload | null {
  try {
    const raw = sessionStorage.getItem(`${PERMS_STORAGE_PREFIX}${serverId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { permissions?: unknown; isOwner?: boolean; isLicenseOwner?: boolean };
    if (!Array.isArray(parsed.permissions)) return null;
    return {
      permissions: normalizeAdminPermissions(parsed.permissions),
      isOwner: !!parsed.isOwner,
      isLicenseOwner: !!parsed.isLicenseOwner,
    };
  } catch {
    return null;
  }
}

export function clearServerAuthCache(serverId?: string | null) {
  if (!serverId) {
    serverSessionInflight.clear();
    serverSessionCache.clear();
    serverPermissionsInflight.clear();
    serverPermissionsCache.clear();
    return;
  }

  const sid = serverId.trim();
  for (const key of Array.from(serverSessionInflight.keys())) {
    if (key.startsWith(`${sid}:`)) serverSessionInflight.delete(key);
  }
  for (const key of Array.from(serverSessionCache.keys())) {
    if (key.startsWith(`${sid}:`)) serverSessionCache.delete(key);
  }
  serverPermissionsInflight.delete(sid);
  serverPermissionsCache.delete(sid);
}

export function clearServerPermissionsCache(serverId?: string | null) {
  if (!serverId) {
    serverPermissionsInflight.clear();
    serverPermissionsCache.clear();
    return;
  }

  const sid = serverId.trim();
  serverPermissionsInflight.delete(sid);
  serverPermissionsCache.delete(sid);
}

export async function validateServerSessionCached(
  serverId: string,
  licenseKey: string,
): Promise<ServerSessionResult> {
  const sid = serverId.trim();
  const key = `${sid}:${licenseKey.trim()}`;
  const now = Date.now();
  const cached = serverSessionCache.get(key);
  if (cached && cached.expiresAt > now) return cached.result;

  const existing = serverSessionInflight.get(key);
  if (existing) return existing;

  const request = (async (): Promise<ServerSessionResult> => {
    const params = new URLSearchParams({
      server_id: sid,
      license_key: licenseKey,
    });
    const res = await fetchWithTimeout(
      apiUrl(`/api/auth/server-session?${params}`),
      {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "X-AirCore-Client": "1" },
      },
      12_000,
    );
    const body = (await res.json().catch(() => ({}))) as ServerSessionBody;
    const result = { status: res.status, ok: res.ok, body };

    if (res.ok || res.status === 429) {
      const previous = serverSessionCache.get(key);
      if (res.status === 429 && previous) return previous.result;
      serverSessionCache.set(key, {
        expiresAt: now + SERVER_SESSION_TTL_MS,
        result,
      });
    }

    return result;
  })();

  serverSessionInflight.set(key, request);
  try {
    return await request;
  } finally {
    serverSessionInflight.delete(key);
  }
}

export async function fetchServerPermissionsCached(serverId: string): Promise<ServerPermissionsPayload> {
  const sid = serverId.trim();
  const now = Date.now();
  const cached = serverPermissionsCache.get(sid);
  if (cached && cached.expiresAt > now) return cached.payload;

  const existing = serverPermissionsInflight.get(sid);
  if (existing) return existing;

  const request = (async (): Promise<ServerPermissionsPayload> => {
    const url = apiUrl(
      `/api/auth/server-permissions?${new URLSearchParams({ server_id: sid }).toString()}`,
    );
    const r = await fetchWithTimeout(
      url,
      { credentials: "include", cache: "no-store", headers: { "X-AirCore-Client": "1" } },
      12_000,
    );

    if (r.status === 429) {
      return serverPermissionsCache.get(sid)?.payload ?? DEFAULT_PERMISSIONS;
    }
    if (r.status === 401) return DEFAULT_PERMISSIONS;
    if (!r.ok) {
      const stored = readStoredPermissionsFromSession(sid);
      if (stored) return stored;
      throw new Error(`Permissions API ${r.status}`);
    }

    const j = (await r.json()) as {
      permissions?: string[];
      is_owner?: boolean;
      is_license_owner?: boolean;
    };
    const payload = {
      permissions: normalizeAdminPermissions(
        Array.isArray(j.permissions) && j.permissions.length ? j.permissions : ["dashboard"],
      ),
      isOwner: !!j.is_owner,
      isLicenseOwner: !!j.is_license_owner,
    };

    serverPermissionsCache.set(sid, {
      expiresAt: now + SERVER_PERMISSIONS_TTL_MS,
      payload,
    });
    return payload;
  })();

  serverPermissionsInflight.set(sid, request);
  try {
    return await request;
  } finally {
    serverPermissionsInflight.delete(sid);
  }
}
