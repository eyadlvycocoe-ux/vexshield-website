import { apiUrl, apiMutationHeaders, ensureCsrfCookie } from "@/lib/api-base";

export type GeoLocation = {
  lat: number;
  lng: number;
  country: string;
  countryCode: string;
  city: string;
};

const clientCache = new Map<string, GeoLocation | null>();

export async function lookupIpsGeo(ips: string[]): Promise<Record<string, GeoLocation | null>> {
  const unique = [...new Set(ips.filter(Boolean))];
  const result: Record<string, GeoLocation | null> = {};
  const missing: string[] = [];

  for (const ip of unique) {
    if (clientCache.has(ip)) {
      result[ip] = clientCache.get(ip) ?? null;
    } else {
      missing.push(ip);
    }
  }

  if (missing.length === 0) return result;

  try {
    await ensureCsrfCookie();
    const res = await fetch(apiUrl("/geo/lookup"), {
      method: "POST",
      credentials: "include",
      headers: apiMutationHeaders(),
      body: JSON.stringify({ ips: missing.slice(0, 80) }),
    });

    if (!res.ok) {
      missing.forEach((ip) => {
        result[ip] = null;
        clientCache.set(ip, null);
      });
      return result;
    }

    const data = (await res.json()) as { results?: Record<string, GeoLocation | null> };
    for (const ip of missing) {
      const loc = data.results?.[ip] ?? null;
      result[ip] = loc;
      clientCache.set(ip, loc);
    }
  } catch {
    missing.forEach((ip) => {
      result[ip] = null;
    });
  }

  return result;
}
