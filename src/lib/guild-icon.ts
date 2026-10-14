/** True when value is a real image URL, not a bare Discord snowflake mistaken for one. */
export function isUsableGuildIconUrl(url?: string | null): boolean {
  const u = String(url || "").trim();
  if (!u) return false;
  if (/^\d{17,20}$/.test(u)) return false;
  return (
    /^https?:\/\//i.test(u) ||
    u.startsWith("/api/public/discord-guild-icon/") ||
    u.startsWith("/uploads/") ||
    u.startsWith("data:image/")
  );
}

export function guildIconProxyUrl(
  guildId?: string | null,
  opts?: { size?: number; label?: string },
): string | null {
  const gid = String(guildId || "").trim();
  if (!/^\d{17,20}$/.test(gid)) return null;
  const size = opts?.size ?? 128;
  const label = String(opts?.label || "")
    .trim()
    .charAt(0)
    .toUpperCase();
  const qs = new URLSearchParams({ size: String(size) });
  if (label) qs.set("label", label);
  return `/api/public/discord-guild-icon/${gid}?${qs.toString()}`;
}

export function resolveGuildIconSrc(
  url?: string | null,
  guildId?: string | null,
  iconByGuild?: ReadonlyMap<string, string>,
  opts?: { size?: number; label?: string },
): string | null {
  if (isUsableGuildIconUrl(url)) return String(url).trim();

  const gid = String(guildId || "").trim();
  if (gid) {
    const mapped = iconByGuild?.get(gid);
    if (isUsableGuildIconUrl(mapped)) return mapped!;
    return guildIconProxyUrl(gid, opts);
  }

  return null;
}

/** Inline SVG placeholder — avoids console 404 when API icon proxy is unavailable. */
export function guildIconPlaceholderDataUri(guildId: string, label?: string): string {
  const gid = String(guildId || "").trim();
  let letter = String(label || "")
    .trim()
    .charAt(0)
    .toUpperCase();
  if (!letter || !/[A-Z0-9]/i.test(letter)) {
    const n = parseInt(gid.slice(-2) || "0", 10);
    letter = String.fromCharCode(65 + (Number.isNaN(n) ? 0 : n % 26));
  }
  let hue = 210;
  try {
    hue = Number(BigInt(gid || "0") % BigInt(360));
  } catch {
    hue = parseInt(gid.slice(-3) || "0", 10) % 360;
  }
  const safeLetter = letter.replace(/[<>&"']/g, "");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" rx="24" fill="hsl(${hue},42%,32%)"/>` +
    `<text x="64" y="72" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="56" font-weight="600">${safeLetter}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
