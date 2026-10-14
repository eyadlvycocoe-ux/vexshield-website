import { useEffect, useState } from "react";
import { apiUrl, fetchWithTimeout, getStoredAuthToken } from "@/lib/api-base";
import { getCachedSiteAdmin, setCachedSiteAdmin } from "@/lib/site-staff-cache";

/** Must exceed fetchWithTimeout on elevated-staff (8s) so slow networks are not rejected early. */
const STAFF_VERIFY_MAX_MS = 10_000;

/**
 * Server-only staff gate. Supports both Discord OAuth and password-based admin login.
 * Caches a positive admin check for 5 minutes so admin sub-pages do not re-verify on every navigation.
 */
export function useRequireSiteAdmin() {
  const [ok, setOk] = useState(() => getCachedSiteAdmin("admin-password") === true);
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
      finish(getCachedSiteAdmin("admin-password") === true);
    }, STAFF_VERIFY_MAX_MS);

    async function verify() {
      try {
        const headers: Record<string, string> = { Accept: "application/json", "X-AirCore-Client": "1" };
        const token = getStoredAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetchWithTimeout(
          apiUrl("/api/auth/elevated-staff"),
          {
            credentials: "include",
            cache: "no-store",
            headers,
            signal: controller.signal,
          },
          8_000,
        );
        if (!res.ok) return finish(false);
        const data = await res.json().catch(() => ({}));
        const allowed = !!data.site_admin;
        if (allowed) {
          setCachedSiteAdmin("admin-password", true);
        }
        finish(allowed, false, false);
      } catch {
        finish(false);
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
