const TTL_MS = 5 * 60_000;

export type ElevatedStaffResponse = { site_admin?: boolean; site_support?: boolean };

type StaffCache = {
  userId: string;
  data: ElevatedStaffResponse;
  at: number;
};

let cache: StaffCache | null = null;

export function getCachedElevatedStaff(userId?: string | null): ElevatedStaffResponse | null {
  if (!userId || !cache || cache.userId !== userId || Date.now() - cache.at > TTL_MS) return null;
  return cache.data;
}

export function getCachedSiteAdmin(userId?: string | null): boolean | null {
  const data = getCachedElevatedStaff(userId);
  if (!data) return null;
  return !!data.site_admin;
}

export function getCachedSiteSupport(userId?: string | null): boolean | null {
  const data = getCachedElevatedStaff(userId);
  if (!data) return null;
  return !!data.site_support;
}

export function setCachedElevatedStaff(userId: string, data: ElevatedStaffResponse) {
  if (!userId) return;
  cache = { userId, data, at: Date.now() };
}

export function setCachedSiteAdmin(userId: string, admin: boolean) {
  setCachedElevatedStaff(userId, { site_admin: admin, site_support: admin });
}

export function setCachedSiteSupport(userId: string, support: boolean) {
  const existing = getCachedElevatedStaff(userId) || {};
  setCachedElevatedStaff(userId, { ...existing, site_support: support });
}

export function clearSiteStaffCache() {
  cache = null;
}
