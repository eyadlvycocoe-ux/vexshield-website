import { useEffect, useState } from "react";
import { fetchElevatedStaff } from "@/lib/api-base";
import { getCachedSiteSupport, setCachedSiteSupport } from "@/lib/site-staff-cache";
import { useUserAuth } from "@/contexts/UserAuthContext";

const SUPPORT_VERIFY_MAX_MS = 10_000;

/** Server-only support gate (support staff or site admin). */
export function useRequireSiteSupport() {
  const { user } = useUserAuth();
  const userId = user?.id ? String(user.id) : null;

  const [ok, setOk] = useState(() => getCachedSiteSupport(userId) === true);
  const [checking, setChecking] = useState(() => getCachedSiteSupport(userId) === null);
  const [requires2fa, setRequires2fa] = useState(false);
  const [requires2faSetup, setRequires2faSetup] = useState(false);

  useEffect(() => {
    if (!userId) {
      setOk(false);
      setChecking(false);
      return;
    }

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
      finish(getCachedSiteSupport(userId) === true);
    }, SUPPORT_VERIFY_MAX_MS);

    void fetchElevatedStaff(controller.signal, { userId, bypassCache: true })
      .then((data) => {
        const allowed = !!data.site_support || !!data.site_admin;
        const need2fa = !!data.requires2fa;
        const needSetup = !!data.requires2faSetup;
        if (allowed && userId) {
          setCachedSiteSupport(userId, true);
        }
        finish(allowed, need2fa, needSetup);
      })
      .catch(() => finish(false))
      .finally(() => {
        window.clearTimeout(hardStop);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(hardStop);
    };
  }, [userId]);

  return { ok, checking, requires2fa, requires2faSetup };
}
