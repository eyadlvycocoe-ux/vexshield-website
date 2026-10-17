// Custom MySQL API client to replace Supabase client
// This maintains the same interface to minimize frontend changes

import {
  getApiBaseUrl,
  getApiOrigin,
  apiMutationHeaders,
  apiFormMutationHeaders,
  ensureCsrfCookie,
  fetchWithTimeout,
  isCsrfErrorMessage,
  isRateLimitErrorMessage,
  parseRetryAfterMs,
} from '@/lib/api-base';

/** Logical bucket "releases" maps to disk folder anticheat-files (same as /api/anticheat/download). */
function storagePathSegmentForDisk(bucket: string) {
  const b = bucket.toLowerCase();
  if (b === 'releases' || b === 'rel' || b === 'anticheat-files') return 'anticheat-files';
  return bucket;
}

/** Use /api/media/* (no "anticheat" in URL) for these buckets ? avoids ad-blocker ERR_BLOCKED_BY_CLIENT. */
function useNeutralMediaEndpoints(bucket: string) {
  const b = bucket.toLowerCase();
  return b === 'releases' || b === 'rel' || b === 'anticheat-files';
}

type AuthSessionPayload = { user?: any; token?: string };

let authSessionInflight: Promise<AuthSessionPayload | null> | null = null;
let authSessionCache: { at: number; payload: AuthSessionPayload | null; tokenKey: string } | null = null;

async function fetchAuthSessionCached(desktopToken?: string | null): Promise<AuthSessionPayload | null> {
  const tokenKey = desktopToken ? "desktop" : "cookie";
  const now = Date.now();
  if (authSessionCache && authSessionCache.tokenKey === tokenKey && now - authSessionCache.at < 3000) {
    return authSessionCache.payload;
  }
  if (authSessionInflight) return authSessionInflight;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (desktopToken) headers.Authorization = `Bearer ${desktopToken}`;

  authSessionInflight = fetchWithTimeout(
    `${getApiBaseUrl()}/auth/session`,
    {
      credentials: "include",
      headers,
      cache: "no-store",
    },
    10_000,
  )
    .then(async (res) => {
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as AuthSessionPayload & { token?: string };
      if (data && data.token) {
        try { localStorage.setItem('sb-aircore-token', data.token); } catch { }
      }
      return data;
    })
    .catch(() => null)
    .finally(() => {
      authSessionInflight = null;
    });

  const payload = await authSessionInflight;
  authSessionCache = { at: Date.now(), payload, tokenKey };
  return payload;
}

const clientInflightRequests = new Map<string, Promise<any>>();
const clientRequestCache = new Map<string, { data: any; exp: number }>();

export function clearClientRequestCache() {
  clientRequestCache.clear();
  clientInflightRequests.clear();
}

class QueryBuilder {
  private table: string;
  private selectCols: string = '*';
  private filters: { type: string, column: string, value: any }[] = [];
  private orderCol?: string;
  private orderDirection: 'ASC' | 'DESC' = 'ASC';
  private limitCount?: number;
  private offsetCount?: number;
  /** Supabase: .select('*', { count: 'exact', head: true }) */
  private countHeadMode = false;

  constructor(table: string) {
    this.table = table;
  }

  private async executeFetch(
    path: string,
    options: RequestInit = {},
    csrfRetried = false,
    rateLimitAttempt = 0,
    gatewayAttempt = 0,
  ) {
    const method = String(options.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      await ensureCsrfCookie();
    }

    const desktopToken = localStorage.getItem('sb-aircore-token');
    const headers = new Headers(options.headers);

    if (desktopToken && desktopToken.trim() !== '' && desktopToken !== 'null' && desktopToken !== 'undefined') {
      headers.set('Authorization', `Bearer ${desktopToken.trim()}`);
    }

    const response = await fetchWithTimeout(`${getApiBaseUrl()}${path}`, {
      ...options,
      credentials: 'include',
      cache: 'default',
      headers: {
        ...apiMutationHeaders(),
        ...Object.fromEntries(headers.entries()),
      },
    });

    const rawText = await response.text();

    // Parse JSON safely (API sometimes returns HTML/text when misconfigured)
    const tryParseJson = () => {
      try {
        return rawText ? JSON.parse(rawText) : null;
      } catch {
        return null;
      }
    };

    if (!response.ok) {
      const errorData = tryParseJson();
      const msg =
        (errorData && typeof errorData.error === 'string' && errorData.error) ||
        `API Error (HTTP ${response.status})`;
      if (
        !csrfRetried &&
        response.status === 403 &&
        isCsrfErrorMessage(msg) &&
        method !== 'GET' &&
        method !== 'HEAD'
      ) {
        await ensureCsrfCookie(true);
        return this.executeFetch(path, options, true, rateLimitAttempt, gatewayAttempt);
      }
      if (
        (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504) &&
        (response.status === 429 ? rateLimitAttempt < 3 : gatewayAttempt < 4) &&
        (method === 'GET' || method === 'HEAD')
      ) {
        const retryAfterMs =
          response.status === 429
            ? parseRetryAfterMs(response) || 400 * 2 ** rateLimitAttempt
            : 500 * (gatewayAttempt + 1);
        await new Promise((r) => setTimeout(r, retryAfterMs));
        return this.executeFetch(
          path,
          options,
          csrfRetried,
          response.status === 429 ? rateLimitAttempt + 1 : rateLimitAttempt,
          response.status === 429 ? gatewayAttempt : gatewayAttempt + 1,
        );
      }
      const err = new Error(msg) as Error & { status?: number; rateLimited?: boolean };
      err.status = response.status;
      if (response.status === 429 || isRateLimitErrorMessage(msg)) {
        err.rateLimited = true;
      }
      throw err;
    }

    const data = tryParseJson();
    if (data === null && rawText.trim() !== "") {
      const preview = rawText.trim().slice(0, 160);
      throw new Error(`API returned invalid JSON: ${preview}`);
    }
    return data;
  }

  private async fetchApi(
    path: string,
    options: RequestInit = {},
    csrfRetried = false,
    rateLimitAttempt = 0,
    gatewayAttempt = 0,
  ) {
    const method = String(options.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      clearClientRequestCache();
      return this.executeFetch(path, options, csrfRetried, rateLimitAttempt, gatewayAttempt);
    }

    const cacheKey = `${getApiBaseUrl()}${path}`;
    const cached = clientRequestCache.get(cacheKey);
    if (cached && Date.now() < cached.exp) {
      return cached.data;
    }

    if (clientInflightRequests.has(cacheKey)) {
      return await clientInflightRequests.get(cacheKey);
    }

    const reqPromise = (async () => {
      try {
        const data = await this.executeFetch(path, options, csrfRetried, rateLimitAttempt, gatewayAttempt);
        clientRequestCache.set(cacheKey, { data, exp: Date.now() + 2500 });
        return data;
      } finally {
        clientInflightRequests.delete(cacheKey);
      }
    })();

    clientInflightRequests.set(cacheKey, reqPromise);
    return await reqPromise;
  }

  select(columns: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.selectCols = columns;
    this.countHeadMode = options?.count === 'exact' && options?.head === true;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, value: values.join(',') });
    return this;
  }

  contains(column: string, value: any) {
    this.filters.push({ type: 'contains', column, value: JSON.stringify(value) });
    return this;
  }

  /** SQL LIKE ? pattern may include % wildcards; value is encoded so ":" in pattern is safe. */
  like(column: string, pattern: string) {
    this.filters.push({ type: 'like', column, value: encodeURIComponent(pattern) });
    return this;
  }

  /** Case-insensitive equality (MySQL: LOWER(col) = LOWER(value)). Value must not contain ":". */
  ilike(column: string, value: string) {
    this.filters.push({ type: 'ilike', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderDirection = options?.ascending === false ? 'DESC' : 'ASC';
    return this;
  }

  limit(count: number) {
    const n = Number(count);
    this.limitCount = Number.isFinite(n) ? Math.min(200, Math.max(1, n)) : 200;
    return this;
  }

  offset(count: number) {
    this.offsetCount = count;
    return this;
  }

  private buildQueryString() {
    const params = new URLSearchParams();
    params.append('select', this.selectCols);

    this.filters.forEach((f) => {
      params.append(f.type, `${f.column}:${f.value}`);
    });

    if (this.orderCol) {
      params.append('order', `${this.orderCol}:${this.orderDirection}`);
    }

    if (this.limitCount) {
      params.append('limit', this.limitCount.toString());
    }

    if (this.offsetCount !== undefined) {
      params.append('offset', this.offsetCount.toString());
    }

    if (this.countHeadMode) {
      params.append('count', 'exact');
      params.append('head', 'true');
    }

    return params.toString();
  }

  async then(onfulfilled?: (value: any) => any) {
    try {
      const query = this.buildQueryString();
      const raw = await this.fetchApi(`/db/${this.table}?${query}`);
      if (this.countHeadMode) {
        const count = typeof raw?.count === 'number' ? raw.count : parseInt(String(raw?.count ?? '0'), 10);
        const result = { data: null, count, error: null };
        return onfulfilled ? onfulfilled(result) : result;
      }
      const result = { data: raw, error: null };
      return onfulfilled ? onfulfilled(result) : result;
    } catch (err) {
      const result = { data: null, error: err as Error };
      return onfulfilled ? onfulfilled(result) : result;
    }
  }

  async single() {
    if (!this.countHeadMode) {
      this.limitCount = 1;
    }
    try {
      const res: any = await this.then();
      if (res?.error) return { data: null, error: res.error };
      if (this.countHeadMode) {
        return { data: null, count: res.count, error: null };
      }
      const data = res?.data as any[];
      return { data: data && data[0] ? data[0] : null, error: data && data[0] ? null : new Error('No rows found') };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  async maybeSingle() {
    if (!this.countHeadMode) {
      this.limitCount = 1;
    }
    try {
      const res: any = await this.then();
      if (res?.error) return { data: null, error: res.error };
      if (this.countHeadMode) {
        return { data: null, count: res.count, error: null };
      }
      const data = res?.data as any[];
      return { data: Array.isArray(data) ? data[0] || null : data || null, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  insert(data: any) {
    const promise = (async () => {
      try {
        const result = await this.fetchApi(`/db/${this.table}`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return { data: result, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    })();

    const chainable: any = promise;
    chainable.select = () => chainable;
    chainable.single = () => chainable;
    return chainable;
  }

  upsert(data: any) {
    const promise = (async () => {
      try {
        const result = await this.fetchApi(`/db/${this.table}`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return { data: result, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    })();

    const chainable: any = promise;
    chainable.select = () => chainable;
    chainable.single = () => chainable;
    return chainable;
  }

  update(data: any) {
    return {
      eq: async (column: string, value: any) => {
        const result = await this.fetchApi(`/db/${this.table}?eq=${column}:${value}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        return { data: result, error: null };
      }
    };
  }

  delete() {
    return {
      eq: async (column: string, value: any) => {
        const result = await this.fetchApi(`/db/${this.table}?eq=${column}:${value}`, {
          method: 'DELETE',
        });
        return { data: result, error: null };
      }
    };
  }
}

class MySqlClient {
  from(table: string) {
    return new QueryBuilder(table);
  }

  auth = {
    signInWithOAuth: async ({ provider, options }: { provider: string, options: any }) => {
      // Redirect to backend OAuth start. Backend should redirect back to `redirectTo`.
      // We keep the call signature similar to Supabase to minimize frontend changes.
      const redirectTo =
        (options && typeof options.redirectTo === 'string' && options.redirectTo) ||
        window.location.href;
      window.location.href = `${getApiBaseUrl()}/auth/discord?redirectTo=${encodeURIComponent(redirectTo)}`;
      return { data: { url: null }, error: null };
    },
    signOut: async () => {
      authSessionCache = null;
      authSessionInflight = null;
      try {
        localStorage.removeItem('sb-aircore-token');
        localStorage.removeItem('airshield_auth_token');
        localStorage.removeItem('token');
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      } catch { }
      try {
        await fetch(`${getApiBaseUrl()}/auth/signout`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch { }
      return { error: null };
    },

    getUser: async () => {
      try {
        const data = await fetchAuthSessionCached(localStorage.getItem('sb-aircore-token'));
        return { data: { user: data?.user ?? null }, error: null };
      } catch {
        return { data: { user: null }, error: null };
      }
    },
    getSession: async () => {
      try {
        let desktopToken = localStorage.getItem('sb-aircore-token');
        const data = await fetchAuthSessionCached(desktopToken);
        if (!data) return { data: { session: null }, error: null };

        // Bootstrap CSRF in background - must not block session / app boot.
        void ensureCsrfCookie();

        // Optional: backend can return a token suitable for app/desktop handoff.
        if (!desktopToken && data && typeof data.token === 'string' && data.token) {
          desktopToken = data.token;
          localStorage.setItem('sb-aircore-token', desktopToken);
        }

        return { data: { session: data.user ? { user: data.user, access_token: desktopToken } : null }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },
    onAuthStateChange: (callback: any) => {
      // Keep a similar shape to Supabase, but avoid billing-ish wording in app code.
      return { data: { listener: { unsubscribe: () => { } } } };
    },
    exchangeCodeForSession: async (code: string) => {
      const session = await this.auth.getSession();
      return { data: session.data.session, error: null };
    },
    updateUser: async (data: any) => {
      try {
        // Never write display name into `username` ? that column is the Discord handle (invites, login).
        const patch: Record<string, unknown> = {};
        const d = data.data;
        if (d?.bio !== undefined) patch.bio = d.bio;
        const disp = d?.full_name ?? d?.display_name;
        if (disp !== undefined && disp !== null) patch.display_name = disp;
        if (Object.keys(patch).length === 0) {
          return { data: null, error: null };
        }
        const response = await fetch(`${getApiBaseUrl()}/users/me/discord-profile`, {
          method: 'PATCH',
          credentials: 'include',
          headers: apiMutationHeaders(),
          body: JSON.stringify(patch),
        });
        if (!response.ok) throw new Error('Update failed');
        return { data: await response.json(), error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    }
  };

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File, csrfRetried = false) => {
        await ensureCsrfCookie(csrfRetried);
        const formData = new FormData();
        formData.append('file', file);
        const uploadUrl = useNeutralMediaEndpoints(bucket)
          ? `${getApiBaseUrl()}/media/put?path=${encodeURIComponent(path)}`
          : `${getApiBaseUrl()}/storage/${bucket}/upload?path=${encodeURIComponent(path)}`;
        try {
          const result = await fetch(uploadUrl, {
            method: 'POST',
            credentials: 'include',
            headers: apiFormMutationHeaders(),
            body: formData,
          });
          const rawText = await result.text();
          let parsed: { path?: string; error?: string } | null = null;
          if (rawText) {
            try {
              parsed = JSON.parse(rawText);
            } catch {
              parsed = null;
            }
          }
          if (!result.ok) {
            const fromApi = parsed && typeof parsed.error === 'string' ? parsed.error : null;
            const msg =
              fromApi ||
              (result.status === 413
                ? 'Upload rejected (HTTP 413). Add this inside the nginx block that handles your site (same block as location /api): client_max_body_size 250M; then sudo nginx -t && sudo systemctl reload nginx. This path is POST /api/media/put - it is not a shell command. If nginx is already raised, check Cloudflare (orange cloud) or another CDN body limit. Match MAX_UPLOAD_MB in the API .env.'
                : 'Upload failed');
            if (!csrfRetried && result.status === 403 && isCsrfErrorMessage(msg)) {
              await ensureCsrfCookie(true);
              const retry = await fetch(uploadUrl, {
                method: 'POST',
                credentials: 'include',
                headers: apiFormMutationHeaders(),
                body: formData,
              });
              const retryText = await retry.text();
              let retryParsed: { path?: string; error?: string } | null = null;
              if (retryText) {
                try {
                  retryParsed = JSON.parse(retryText);
                } catch {
                  retryParsed = null;
                }
              }
              if (!retry.ok) {
                const retryMsg =
                  (retryParsed && typeof retryParsed.error === 'string' && retryParsed.error) ||
                  'Upload failed';
                throw new Error(retryMsg);
              }
              if (!retryParsed || typeof retryParsed.path !== 'string') {
                throw new Error('Upload failed: invalid response');
              }
              return { data: { path: retryParsed.path }, error: null };
            }
            throw new Error(msg);
          }
          if (!parsed || typeof parsed.path !== 'string') {
            throw new Error('Upload failed: invalid response');
          }
          return { data: { path: parsed.path }, error: null };
        } catch (error: any) {
          return { data: null, error };
        }
      },
      remove: async (paths: string[], csrfRetried = false) => {
        await ensureCsrfCookie(csrfRetried);
        const removeUrl = useNeutralMediaEndpoints(bucket)
          ? `${getApiBaseUrl()}/media/remove`
          : `${getApiBaseUrl()}/storage/${bucket}/remove`;
        try {
          const result = await fetch(removeUrl, {
            method: 'DELETE',
            credentials: 'include',
            headers: apiMutationHeaders(),
            body: JSON.stringify({ paths }),
          });
          if (!result.ok) {
            const rawText = await result.text();
            let errMsg = 'Remove failed';
            try {
              const j = rawText ? JSON.parse(rawText) : null;
              if (j && typeof j.error === 'string') errMsg = j.error;
            } catch {
              /* ignore */
            }
            if (!csrfRetried && result.status === 403 && isCsrfErrorMessage(errMsg)) {
              await ensureCsrfCookie(true);
              const retry = await fetch(removeUrl, {
                method: 'DELETE',
                credentials: 'include',
                headers: apiMutationHeaders(),
                body: JSON.stringify({ paths }),
              });
              if (!retry.ok) {
                const retryText = await retry.text();
                let retryMsg = 'Remove failed';
                try {
                  const j = retryText ? JSON.parse(retryText) : null;
                  if (j && typeof j.error === 'string') retryMsg = j.error;
                } catch {
                  /* ignore */
                }
                throw new Error(retryMsg);
              }
              return { error: null };
            }
            throw new Error(errMsg);
          }
          return { error: null };
        } catch (error: any) {
          return { error };
        }
      },
      getPublicUrl: (path: string) => {
        const baseUrl = getApiOrigin();
        const seg = storagePathSegmentForDisk(bucket);
        return { data: { publicUrl: `${baseUrl}/uploads/${seg}/${path}` } };
      },
      download: async (path: string) => {
        const baseUrl = getApiOrigin();
        const seg = storagePathSegmentForDisk(bucket);
        try {
          const response = await fetch(`${baseUrl}/uploads/${seg}/${path}`, {
            credentials: 'include'
          });
          if (!response.ok) throw new Error('Download failed');
          const blob = await response.blob();
          return { data: blob, error: null };
        } catch (error: any) {
          return { data: null, error };
        }
      }
    })
  };

  functions = {
    invoke: async (name: string, options: any, csrfRetried = false) => {
      try {
        await ensureCsrfCookie(csrfRetried);
        const desktopToken = localStorage.getItem('sb-aircore-token');
        const headers = new Headers(apiMutationHeaders());
        if (desktopToken) {
          headers.set('Authorization', `Bearer ${desktopToken}`);
        }
        const response = await fetchWithTimeout(`${getApiBaseUrl()}/functions/${name}`, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers,
          body: JSON.stringify(options?.body ?? {}),
        }, 20_000);
        if (!response.ok) {
          let msg = 'Function failed';
          try {
            const errBody = await response.json();
            msg = errBody.error || msg;
          } catch {
            /* ignore */
          }
          if (!csrfRetried && response.status === 403 && isCsrfErrorMessage(msg)) {
            return this.functions.invoke(name, options, true);
          }
          throw new Error(msg);
        }
        const data = await response.json();
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    }
  };

  private liveEventSource: EventSource | null = null;
  private liveEventSourceServerId: string | null = null;
  private liveReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private liveReconnectAttempt = 0;
  private liveListeners: Map<string, Set<Function>> = new Map();
  private livePollingTimer: ReturnType<typeof setInterval> | null = null;
  private livePollingServerId: string | null = null;
  private livePollingBusy = false;
  private liveSseDisabledUntil = 0;

  private liveSseEnabled() {
    return (
      import.meta.env.VITE_LIVE_UPDATES_SSE === "true" &&
      Date.now() > this.liveSseDisabledUntil
    );
  }

  private closeLiveEventSource() {
    if (this.liveReconnectTimer) {
      clearTimeout(this.liveReconnectTimer);
      this.liveReconnectTimer = null;
    }
    if (this.liveEventSource) {
      try {
        this.liveEventSource.close();
      } catch {
        /* ignore */
      }
      this.liveEventSource = null;
    }
  }

  private closeLivePolling() {
    if (this.livePollingTimer) {
      clearInterval(this.livePollingTimer);
      this.livePollingTimer = null;
    }
    this.livePollingServerId = null;
    this.livePollingBusy = false;
  }

  private emitLivePollingTick(serverId: string) {
    if (this.livePollingBusy) return;
    this.livePollingBusy = true;
    try {
      for (const [type, listeners] of this.liveListeners.entries()) {
        listeners.forEach((cb) => {
          try {
            cb({ type, server_id: serverId, polling: true });
          } catch {
            /* ignore listener errors */
          }
        });
      }
    } finally {
      window.setTimeout(() => {
        this.livePollingBusy = false;
      }, 250);
    }
  }

  private ensureLivePolling(serverId: string) {
    if (this.livePollingTimer && this.livePollingServerId === serverId) return;
    this.closeLiveEventSource();
    this.closeLivePolling();
    this.livePollingServerId = serverId;
    this.livePollingTimer = setInterval(() => {
      if (this.livePollingServerId) this.emitLivePollingTick(this.livePollingServerId);
    }, 10_000);
  }

  private scheduleLiveReconnect(serverId: string) {
    if (this.liveReconnectTimer) return;
    const delayMs = Math.min(60_000, 4000 * 2 ** this.liveReconnectAttempt);
    this.liveReconnectAttempt = Math.min(this.liveReconnectAttempt + 1, 4);
    this.liveReconnectTimer = setTimeout(() => {
      this.liveReconnectTimer = null;
      if (this.liveEventSourceServerId === serverId) {
        this.ensureLiveEventSource(serverId, true);
      }
    }, delayMs);
  }

  private ensureLiveEventSource(serverId: string, forceReconnect = false) {
    if (!this.liveSseEnabled()) {
      this.ensureLivePolling(serverId);
      return;
    }
    if (!forceReconnect && this.liveEventSource && this.liveEventSourceServerId === serverId) return;
    this.closeLivePolling();
    this.liveEventSourceServerId = serverId;
    this.closeLiveEventSource();

    const es = new EventSource(
      `${getApiBaseUrl()}/live/updates?server_id=${encodeURIComponent(serverId)}`,
      { withCredentials: true },
    );
    this.liveEventSource = es;

    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(':')) return;
      this.liveReconnectAttempt = 0;
      try {
        const data = JSON.parse(e.data);
        const listeners = this.liveListeners.get(data.type);
        if (listeners) listeners.forEach((cb) => cb(data));
      } catch {
        /* ignore malformed SSE payloads */
      }
    };
    es.onerror = () => {
      this.liveSseDisabledUntil = Date.now() + 120_000;
      this.closeLiveEventSource();
      this.ensureLivePolling(serverId);
    };
  }

  channel(name: string) {
    if (name === 'bans-changes' || name === 'server-changes') {
      const registeredListeners: Array<{ type: string; callback: Function }> = [];
      const liveChannel = {
        on: (event: string, config: any, callback: Function) => {
          const serverId = config?.filter?.match?.(/server_id=eq\.(.+)/)?.[1];
          if (serverId) this.ensureLiveEventSource(serverId);

          const table = String(config?.table || '').trim();
          const eventTypes =
            table === 'bans'
              ? ['bans_updated']
              : table === 'players_snapshots'
                ? ['players_updated']
                : table === 'consoles'
                  ? ['console_updated']
                  : ['bans_updated', 'players_updated', 'console_updated'];

          eventTypes.forEach((type) => {
            if (!this.liveListeners.has(type)) {
              this.liveListeners.set(type, new Set());
            }
            this.liveListeners.get(type)!.add(callback);
            registeredListeners.push({ type, callback });
          });

          return liveChannel;
        },
        subscribe: () => ({}),
        unsubscribe: () => {
          registeredListeners.forEach(({ type, callback }) => {
            const listeners = this.liveListeners.get(type);
            if (!listeners) return;
            listeners.delete(callback);
            if (listeners.size === 0) this.liveListeners.delete(type);
          });
          registeredListeners.length = 0;
          if (this.liveListeners.size === 0) {
            this.closeLiveEventSource();
            this.closeLivePolling();
          }
          return {};
        }
      };
      return liveChannel;
    }
    const mockChannel = {
      on: () => mockChannel,
      subscribe: () => ({}),
      unsubscribe: () => ({})
    };
    return mockChannel;
  }

  removeChannel(channel: any) {
    try {
      channel?.unsubscribe?.();
    } catch {
      /* ignore */
    }
    return Promise.resolve();
  }

  rpc(name: string, params: any = {}) {
    return this.functions.invoke(name, { body: params });
  }
}

export const supabase = new MySqlClient() as any;

