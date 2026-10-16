/**
 * API base URL (ends with `/api`, no trailing slash after `api`).
 *
 * In the browser we default to the **current page origin** so the SPA and API share one host (e.g. aircore.xyz).
 * never causes cross-origin fetches (403 / CORS / WAF) when `.env` baked a different host at build time.
 *
 * Set `VITE_API_FORCE=1` and `VITE_API_URL` only if the API is on a different host than the SPA.
 */
import * as siteStaffCache from "@/lib/site-staff-cache";

export type ElevatedStaffResponse = {
  site_admin?: boolean;
  site_support?: boolean;
  is_staff_admin?: boolean;
  is_staff_support?: boolean;
  requires2fa?: boolean;
  requires2faSetup?: boolean;
  error?: string;
};

const elevatedStaffFallbackCache = new Map<string, { data: ElevatedStaffResponse; expiresAt: number }>();

function readCachedElevatedStaff(userId?: string | null): ElevatedStaffResponse | null {
  const fromModule =
    typeof siteStaffCache.getCachedElevatedStaff === "function"
      ? siteStaffCache.getCachedElevatedStaff(userId)
      : null;
  if (fromModule) return fromModule;
  if (!userId) return null;
  const cached = elevatedStaffFallbackCache.get(userId);
  if (!cached || cached.expiresAt < Date.now()) return null;
  return cached.data;
}

function writeCachedElevatedStaff(userId: string, data: ElevatedStaffResponse) {
  if (typeof siteStaffCache.setCachedElevatedStaff === "function") {
    siteStaffCache.setCachedElevatedStaff(userId, data);
    return;
  }
  elevatedStaffFallbackCache.set(userId, { data, expiresAt: Date.now() + 5 * 60_000 });
}

export function getApiBaseUrl(): string {
  const force =
    import.meta.env.VITE_API_FORCE === "1" ||
    String(import.meta.env.VITE_API_FORCE || "").toLowerCase() === "true";
  if (force && import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    if (window.location.hostname.endsWith("github.io")) {
      return (import.meta.env.VITE_API_URL || "https://vexshield-backend.onrender.com/api").replace(/\/$/, "");
    }
    return `${window.location.origin}/api`;
  }
  return (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
}

/** Origin only (no `/api`), for WebSocket / PeerJS bases. */
export function getApiOrigin(): string {
  return getApiBaseUrl().replace(/\/api$/, "");
}

/** In-memory CSRF (mirrors csrf_token cookie; avoids cookie/domain read races after refresh). */
let csrfTokenMemory = "";

/** Double-submit CSRF token (set as non-httpOnly cookie on Discord login). */
export function getCsrfToken(): string {
  if (csrfTokenMemory) return csrfTokenMemory;
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export function setCsrfToken(token: string) {
  csrfTokenMemory = String(token || "").trim();
}

export function clearCsrfToken() {
  csrfTokenMemory = "";
}

export function apiMutationHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getStoredAuthToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-AirCore-Client": "1",
    "X-AirCore-Csrf": getCsrfToken(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/** Multipart uploads: CSRF + client id only (do not set Content-Type — browser sets boundary). */
export function apiFormMutationHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getStoredAuthToken();
  return {
    Accept: "application/json",
    "X-AirCore-Client": "1",
    "X-AirCore-Csrf": getCsrfToken(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

let csrfBootstrapInflight: Promise<void> | null = null;
const elevatedStaffInflight = new Map<string, Promise<ElevatedStaffResponse>>();

const DEFAULT_FETCH_TIMEOUT_MS = 12_000;

function mergeAbortSignals(signals: Array<AbortSignal | undefined>): AbortSignal {
  const active = signals.filter((s): s is AbortSignal => !!s);
  if (active.length === 0) return new AbortController().signal;
  const anyFn = (AbortSignal as typeof AbortSignal & { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  if (typeof anyFn === "function") return anyFn(active);
  const merged = new AbortController();
  for (const signal of active) {
    if (signal.aborted) {
      merged.abort();
      break;
    }
    signal.addEventListener("abort", () => merged.abort(), { once: true });
  }
  return merged.signal;
}

/** Abort fetch if the server/network does not respond in time (prevents infinite "Loading session"). */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const timeoutController = new AbortController();
  const timer = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = mergeAbortSignals([init?.signal, timeoutController.signal]);
  try {
    return await fetch(input, { ...init, signal });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Ensures `csrf_token` cookie exists (required for POST/PATCH/DELETE under /api).
 * Call before mutating API requests when the session predates CSRF or the cookie was cleared.
 * Never blocks app boot — times out quickly and runs best-effort only.
 */
export async function ensureCsrfCookie(forceRefresh = false): Promise<void> {
  if (typeof document === "undefined") return;
  if (!forceRefresh && getCsrfToken()) return;

  if (!csrfBootstrapInflight) {
    csrfBootstrapInflight = (async () => {
      try {
        const base = getApiBaseUrl();
        const qs = forceRefresh ? "?refresh=1" : "";
        const res = await fetchWithTimeout(
          `${base}/auth/csrf${qs}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json", "X-AirCore-Client": "1" },
          },
          8_000,
        );
        if (res.ok) {
          try {
            const body = (await res.json()) as { csrf_token?: string };
            if (body.csrf_token) setCsrfToken(body.csrf_token);
          } catch {
            /* ignore */
          }
        }
        if (!res.ok && res.status === 401) return;
        if (!res.ok) {
          await fetchWithTimeout(
            `${base}/auth/session`,
            {
              credentials: "include",
              cache: "no-store",
              headers: { Accept: "application/json", "X-AirCore-Client": "1" },
            },
            8_000,
          ).catch(() => { });
        }
      } catch {
        /* ignore — mutation may still fail with a clear CSRF error */
      } finally {
        csrfBootstrapInflight = null;
      }
    })();
  }
  try {
    await Promise.race([
      csrfBootstrapInflight,
      new Promise<void>((resolve) => window.setTimeout(resolve, 8_500)),
    ]);
  } catch {
    /* ignore */
  }
}

/** Refresh CSRF before PATCH/POST/DELETE — avoids stale token races. */
export async function ensureMutationCsrf(): Promise<void> {
  await ensureCsrfCookie(true);
}

export function isCsrfErrorMessage(msg: string): boolean {
  return /csrf/i.test(msg);
}

export function isRateLimitErrorMessage(msg: string): boolean {
  return /too many requests/i.test(msg);
}

export function isRateLimitError(err: unknown): boolean {
  const msg =
    (err instanceof Error && err.message) ||
    (typeof err === "object" && err !== null && "message" in err && String((err as { message?: unknown }).message)) ||
    "";
  return isRateLimitErrorMessage(msg);
}

/** Parse Retry-After (seconds or HTTP-date) from a 429 response. */
export function parseRetryAfterMs(response: Response): number {
  const raw = response.headers.get("Retry-After");
  if (!raw) return 0;
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum >= 0) return Math.min(asNum * 1000, 60_000);
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) return Math.max(0, Math.min(asDate - Date.now(), 60_000));
  return 0;
}

/**
 * Absolute URL for a path under `/api/...`.
 * `path` may be `/db/...`, `/public/...`, or already `/api/...`.
 */
export const apiUrl = (path: string) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const withApi = cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
  const originSansApi = getApiBaseUrl().replace(/\/api$/, "");
  return `${originSansApi}${withApi}`;
};

/**
 * Query segment for `/api/db/:table` filters. Server expects `eq=column:value`
 * (see `parseFieldValuePair` in server), not `column=eq.value`.
 */
export function dbEqQueryParam(column: string, value: string): string {
  return `eq=${encodeURIComponent(column)}:${encodeURIComponent(value)}`;
}

/**
 * Site-wide staff check (Discord allowlist, `user_roles`, or `discord_users.is_admin`).
 * Path avoids legacy `site-admin` / `site_admin` URL substrings targeted by known userscript bypasses.
 */
export function siteStaffVerifyUrl(): string {
  return apiUrl("/api/auth/staff");
}

/** True only when the API returns 200 JSON with `site_admin: true` for the current session cookie. */
export async function fetchSiteStaffVerified(
  signal?: AbortSignal,
  userId?: string | null,
): Promise<boolean> {
  const data = await fetchElevatedStaff(signal, { userId });
  return !!data.site_admin;
}

/** Support staff (or admin) — manages support panel access. */
export async function fetchSiteSupportVerified(
  signal?: AbortSignal,
  userId?: string | null,
  bypassCache = true,
): Promise<boolean> {
  const data = await fetchElevatedStaff(signal, { userId, bypassCache });
  return !!data.site_support || !!data.site_admin;
}

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("sb-aircore-token") || localStorage.getItem("aircore-token") || null;
  } catch {
    return null;
  }
}

export async function fetchElevatedStaff(
  signal?: AbortSignal,
  options?: { bypassCache?: boolean; userId?: string | null },
): Promise<ElevatedStaffResponse> {
  const userId = options?.userId ?? null;

  if (!options?.bypassCache && userId) {
    const cached = readCachedElevatedStaff(userId);
    if (cached) return cached;
  }

  const run = async (): Promise<ElevatedStaffResponse> => {
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
          signal,
        },
        8_000,
      );
      if (!res.ok) return {};
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) return {};
      const data = (await res.json()) as ElevatedStaffResponse;
      if (userId) writeCachedElevatedStaff(userId, data);
      return data;
    } catch {
      return {};
    }
  };

  const inflightKey = (userId || "__session__") + (options?.bypassCache ? "_bypass" : "");
  let inflight = elevatedStaffInflight.get(inflightKey);
  if (!inflight) {
    inflight = run().finally(() => {
      elevatedStaffInflight.delete(inflightKey);
    });
    elevatedStaffInflight.set(inflightKey, inflight);
  }

  return inflight;
}

export type PaypalServerReady = { ready: boolean; mode: "sandbox" | "live" | null };

/** True when the API has PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (see server/.env). */
export async function fetchPaypalServerReady(): Promise<PaypalServerReady> {
  try {
    const r = await fetch(`${getApiBaseUrl()}/public/paypal-ready`);
    const j = (await r.json()) as PaypalServerReady;
    return {
      ready: !!j.ready,
      mode: j.mode === "live" ? "live" : j.mode === "sandbox" ? "sandbox" : null,
    };
  } catch {
    return { ready: false, mode: null };
  }
}

export function formatPaypalErrorMessage(errorMsg: string): string {
  if (!errorMsg) return "Payment failed. Please try again.";
  if (errorMsg.includes("PAYEE_ACCOUNT_RESTRICTED")) {
    return "PayPal payments are temporarily restricted on this merchant account. Please contact support or use your wallet balance.";
  }
  if (errorMsg.includes("PAYPAL_NOT_CONFIGURED")) {
    return "Payment service is not configured on the server.";
  }
  if (errorMsg.includes("CURRENCY_NOT_SUPPORTED")) {
    return "This currency is not supported by the payment gateway.";
  }
  const jsonMatch = errorMsg.match(/\{"name":.*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.details && parsed.details[0]?.description) {
        return `PayPal Error: ${parsed.details[0].description}`;
      }
      if (parsed.message) return `PayPal Error: ${parsed.message}`;
    } catch {
      /* ignore */
    }
  }
  return errorMsg;
}
