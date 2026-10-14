/** Dashboard server ids are VexShield-xxxx / ASHLD-xxxx (see AdminServers / license API). */
const SERVER_ID_RE = /^(VexShield|VEXSHIELD|ASHLD|VEX)-[A-Z0-9]{4,20}$/i;

/** Path segments that must not be treated as server dashboards (marketing / static). */
export const RESERVED_DASHBOARD_SEGMENTS = new Set([
  "features",
  "home",
  "pricing",
  "uploads",
  "connect",
  "auth",
  "admin",
  "demo",
  "plan",
  "add-funds",
  "profile-settings",
  "my-servers",
  "terms",
  "privacy",
  "refund",
  "faqs",
  "documentation",
  "air-eye",
  "support",
  "mobile",
  "desktop",
  "ban-clip",
]);

export function isDashboardServerId(segment: string | undefined): boolean {
  const s = String(segment || "").trim();
  if (!s || RESERVED_DASHBOARD_SEGMENTS.has(s.toLowerCase())) return false;
  return SERVER_ID_RE.test(s);
}

/** Public ban clip filename (uuid.webm). */
export function parseBanClipFilename(segment: string | undefined): string | null {
  const s = String(segment || "").trim();
  if (!/^[a-f0-9-]{36}\.webm$/i.test(s)) return null;
  return s;
}

export function banClipPlayerPath(filename: string): string {
  return `/clip.html?f=${encodeURIComponent(filename)}`;
}

export function banClipUrlToPlayerPath(url: string): string {
  const m = String(url || "").match(/\/uploads\/ban-clips\/([^/?#]+)/i);
  if (m && parseBanClipFilename(m[1])) return banClipPlayerPath(m[1]);
  return url;
}
