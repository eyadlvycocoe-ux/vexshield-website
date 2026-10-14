/** Strip `ip:` prefix and validate a public IPv4 address for geo lookup. */
export function normalizePlayerIp(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  let ip = raw.trim();
  if (ip.startsWith("ip:")) ip = ip.slice(3).trim();

  const v4 = ip.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (!v4) return null;

  const parts = ip.split(".").map(Number);
  if (parts.some((n) => n < 0 || n > 255)) return null;

  if (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("127.") ||
    ip.startsWith("0.") ||
    ip === "255.255.255.255"
  ) {
    return null;
  }

  return ip;
}

export function extractPlayerIp(player: Record<string, unknown>): string | null {
  const direct = normalizePlayerIp(typeof player.ip === "string" ? player.ip : null);
  if (direct) return direct;

  if (Array.isArray(player.identifiers)) {
    for (const id of player.identifiers) {
      if (typeof id === "string" && id.startsWith("ip:")) {
        const parsed = normalizePlayerIp(id);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}
