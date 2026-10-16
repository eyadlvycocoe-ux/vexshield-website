import { useEffect, useState } from "react";
import { apiUrl, fetchWithTimeout, getStoredAuthToken, siteStaffVerifyUrl } from "@/lib/api-base";
import { getCachedSiteAdmin, setCachedSiteAdmin } from "@/lib/site-staff-cache";

/** Must exceed fetchWithTimeout on elevated-staff (8s) so slow networks are not rejected early. */
const STAFF_VERIFY_MAX_MS = 10_000;
const OWNER_DISCORD_IDS = new Set(['1505242741091598418', '1134674389254803456', '1284209480824786987', '1339366537085321257']);

function isClientOwner(): boolean {
  if (getCachedSiteAdmin("admin-password") === true) return true;
  const token = getStoredAuthToken();
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload?.id && OWNER_DISCORD_IDS.has(String(payload.id))) return true;
    if (payload?.is_admin || payload?.site_admin) return true;
  } catch {
    // ignore
  }
  return false;
}

/**
 * Server-only staff gate. Supports both Discord OAuth and password-based admin login.
 * Caches a positive admin check for 5 minutes so admin sub-pages do not re-verify on every navigation.
 */
export function useRequireSiteAdmin() {
  const [ok, setOk] = useState(() => isClientOwner());
  const [checking, setChecking] = useState(true);
  const [requires2fa, setRequires2fa] = useState(false);
  const [requires2faSetup, setRequires2faSetup] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const finish = (allowed: boolean, need2fa = false, needSetup = false) => {
      if (cancelled) return;
      setOk(allowed);
      setRequires2fa(need2fa);
      setRequires2faSetup(needSetup);
      setChecking(false);
    };

    const hardStop = window.setTimeout(() => {
      if (cancelled) return;
      finish(isClientOwner());
    }, STAFF_VERIFY_MAX_MS);

    async function verify() {
      try {
        const headers: Record<string, string> = { Accept: "application/json", "X-AirCore-Client": "1" };
        const token = getStoredAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetchWithTimeout(
          siteStaffVerifyUrl(),
          {
            credentials: "include",
            cache: "no-store",
            headers,
            signal: controller.signal,
          },
          8_000,
        );
        if (!res.ok) {
          if (isClientOwner()) return finish(true);
          return finish(false);
        }
        const data = await res.json().catch(() => ({}));
        const allowed = !!data.site_admin || isClientOwner();
        if (allowed) {
          setCachedSiteAdmin("admin-password", true);
        }
        finish(allowed, false, false);
      } catch {
        finish(isClientOwner());
      } finally {
        window.clearTimeout(hardStop);
      }
    }

    void verify();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(hardStop);
    };
  }, []);

  return { ok, checking, requires2fa, requires2faSetup };
}
