import { useEffect, useMemo, useRef, useState } from "react";
import { User  } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveDiscordSnowflake } from "@/lib/discord-avatar";

/**
 * Build an ordered list of avatar URLs to attempt.
 * Priority:
 *   1. Inline base64 data URL  (passed from caller, fastest)
 *   2. Discord CDN default avatar (public, no auth needed — ALWAYS works)
 *   3. Same-origin server proxy  (needs backend + bot token for real avatars)
 */
function buildQueue(
  snowflake: string | null,
  avatarDataUrl: string | null | undefined,
  size: number,
): string[] {
  if (avatarDataUrl?.startsWith("data:image/")) return [avatarDataUrl];

  if (!snowflake) return [];

  // Compute the default avatar index from the snowflake
  let idx = 0;
  try {
    if (/^\d+$/.test(snowflake)) {
      idx = Number(BigInt(snowflake) % BigInt(5));
    } else {
      idx = snowflake.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 5;
    }
  } catch (_) {
    idx = 0;
  }

  return [
    // Try real CDN avatar first (requires proxy to resolve avatar hash)
    `/api/public/discord-avatar/${snowflake}?size=${size}`,
    // If proxy fails → fall back to public Discord default embed avatar
    `https://cdn.discordapp.com/embed/avatars/${idx}.png`,
  ];
}

/**
 * Renders a Discord user's avatar.
 * Tries the server proxy first (real photo), then falls back to the
 * Discord default embed avatar (colorful, always public, no auth needed).
 * Shows a User icon placeholder only if every source fails.
 */
export function DiscordImage({
  discordId,
  avatarDataUrl,
  size = 256,
  alt = "",
  className,
  fallbackClassName,
}: {
  discordId?: string | null;
  avatarDataUrl?: string | null;
  size?: number;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const snowflake = useMemo(() => resolveDiscordSnowflake(discordId), [discordId]);

  const queue = useMemo(
    () => buildQueue(snowflake, avatarDataUrl, size),
    [snowflake, avatarDataUrl, size],
  );

  const [idx, setIdx] = useState(0);
  const prevSnowflake = useRef<string | null>(null);

  // Reset queue position when user changes
  useEffect(() => {
    if (prevSnowflake.current !== snowflake) {
      prevSnowflake.current = snowflake;
      setIdx(0);
    }
  }, [snowflake]);

  const src = queue[idx] ?? null;

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-slate-800/80 text-slate-500",
          fallbackClassName,
          className,
        )}
      >
        <User className="h-1/2 w-1/2 opacity-50" />
      </div>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={cn("object-cover", className)}
      onError={() => setIdx((prev) => prev + 1)}
    />
  );
}
