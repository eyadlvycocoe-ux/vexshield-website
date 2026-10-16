import { invalidateAdminPermissionsCache } from "@/hooks/useAdminPermissions";

import { apiUrl, fetchWithTimeout } from "@/lib/api-base";



export type ConnectedServerSession = {
  server_id: string;
  license_key: string;
  display_name?: string | null;
  status?: string | null;
  owner_email?: string | null;
  /** MySQL/API may return 0/1 or boolean  -  normalized when read in useServerEntitlements. */
  ent_airshield?: number | boolean;
  ent_airscanner?: number | boolean;
  ent_airpc?: number | boolean;
  is_admin_panel?: boolean;
  /** Support staff opened panel via approved access request. */
  is_support_session?: boolean;
  /** Selected dashboard type: airshield */
  selected_dashboard?: "airshield";
};



/** Persist panel session and notify layout/providers to refresh. */

export function setConnectedServer(data: ConnectedServerSession) {

  sessionStorage.setItem("connected_server", JSON.stringify(data));

  invalidateAdminPermissionsCache(data.server_id);

  window.dispatchEvent(new CustomEvent("aircore:connected-server"));

}



export function readConnectedServer(): ConnectedServerSession | null {

  try {

    const raw = sessionStorage.getItem("connected_server");

    if (!raw) return null;

    return JSON.parse(raw) as ConnectedServerSession;

  } catch {

    return null;

  }

}



export function isSupportPanelSession(): boolean {

  return readConnectedServer()?.is_support_session === true;

}



type DashboardServerRow = ConnectedServerSession & {

  server_id?: string;

  license_key?: string;

  soft_deleted_at?: string | null;

};



async function fetchAccessibleServers(path: string, retryCount = 0): Promise<DashboardServerRow[]> {

  try {

    const res = await fetchWithTimeout(apiUrl(path), {

      credentials: "include",

      cache: "no-store",

      headers: { Accept: "application/json", "X-AirCore-Client": "1" },

    });

    if (!res.ok) {

      // Retry on 5xx errors or network failures

      if (res.status >= 500 && retryCount < 2) {

        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));

        return fetchAccessibleServers(path, retryCount + 1);

      }

      return [];

    }

    const body = await res.json().catch(() => []);

    return Array.isArray(body) ? (body as DashboardServerRow[]) : [];

  } catch (error) {

    // Retry on network errors

    if (retryCount < 2) {

      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));

      return fetchAccessibleServers(path, retryCount + 1);

    }

    console.error('Error fetching accessible servers:', error);

    return [];

  }

}



/**

 * Rebuild `connected_server` from the authenticated user's current server list.

 * This prevents stale sessionStorage (for example, an old license key after reconnect)

 * from sending a valid dashboard route to "Server Not Found".

 */

export async function recoverConnectedServerSession(serverId: string | undefined): Promise<ConnectedServerSession | null> {

  const id = String(serverId || "").trim();

  if (!id) return null;



  // Check cache first to avoid unnecessary API calls

  const cacheKey = `server_session_cache_${id}`;

  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {

    try {

      const cachedData = JSON.parse(cached) as { session: ConnectedServerSession; timestamp: number };

      // Use cache if it's less than 30 seconds old

      if (Date.now() - cachedData.timestamp < 30000) {

        return cachedData.session;

      }

    } catch {

      sessionStorage.removeItem(cacheKey);

    }

  }



  const lists = await Promise.allSettled([
    fetchAccessibleServers("/auth/session?view=servers"),
    fetchAccessibleServers("/auth/session?view=admin_servers"),
    fetchAccessibleServers("/users/me/dashboard-servers"),
    fetchAccessibleServers("/admin/servers"),
  ]);



  for (const result of lists) {

    if (result.status !== "fulfilled") continue;

    const row = result.value.find((server) => String(server.server_id || "").trim() === id && !server.soft_deleted_at);

    if (!row?.server_id || !row?.license_key) continue;

    const session: ConnectedServerSession = {

      server_id: row.server_id,

      license_key: row.license_key,

      display_name: row.display_name ?? null,

      status: row.status ?? null,

      owner_email: row.owner_email ?? null,

      ent_airshield: row.ent_airshield,

      ent_airscanner: row.ent_airscanner,

      ent_airpc: row.ent_airpc,

    };

    setConnectedServer(session);

    // Cache the result for 30 seconds

    sessionStorage.setItem(cacheKey, JSON.stringify({ session, timestamp: Date.now() }));

    return session;

  }



  return null;

}

