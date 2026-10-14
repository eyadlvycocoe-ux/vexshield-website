import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { pickLookupAvatarSrc, resolveDiscordSnowflake } from "@/lib/discord-avatar";
import { User  } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscordAvatarProps {
  discordId?: string | null;
  avatarHash?: string | null;
  /** Preloaded from batch API — skips extra fetch */
  avatarDataUrl?: string | null;
  /** When true, never call discord-profile API (use hash / proxy only). */
  skipProfileFetch?: boolean;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  /** square avatars for player cards */
  variant?: "circle" | "rounded";
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
  "2xl": "w-24 h-24",
};

/**
 * Discord profile picture via site API proxy (works with ad blockers).
 */
export function DiscordAvatar({
  discordId: rawDiscordId,
  avatarHash,
  avatarDataUrl,
  skipProfileFetch = false,
  name,
  size = "md",
  className = "",
  variant = "circle",
}: DiscordAvatarProps) {
  const snowflake = useMemo(
    () => resolveDiscordSnowflake(rawDiscordId),
    [rawDiscordId],
  );
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!snowflake) {
      setSrc(null);
      return;
    }

    if (avatarDataUrl?.startsWith("data:image/")) {
      setSrc(avatarDataUrl);
      return;
    }

    let cancelled = false;
    setSrc(pickLookupAvatarSrc(snowflake, avatarHash, null, 0));

    if (skipProfileFetch || avatarHash) {
      return () => {
        cancelled = true;
      };
    }

    fetch(`/api/public/discord-profile/${snowflake}?light=1`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setSrc(
          pickLookupAvatarSrc(
            snowflake,
            data.avatar ?? avatarHash,
            data.avatar_url,
            0,
            data.avatar_data_url,
          ),
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [snowflake, avatarHash, avatarDataUrl, skipProfileFetch]);

  const safeName = typeof name === "string" ? name : name != null ? String(name) : "";
  const initials = safeName.charAt(0).toUpperCase() || "?";
  const rounded = variant === "rounded" ? "rounded-xl" : "rounded-full";

  return (
    <Avatar className={cn(sizeClasses[size], rounded, className)}>
      {snowflake && src ? (
        <AvatarImage
          src={src}
          alt={safeName || "Discord user"}
          className={cn("object-cover", rounded)}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            const proxy = `/api/public/discord-avatar/${snowflake}?size=128&retry=${Date.now()}`;
            if (!el.src.includes("/api/public/discord-avatar/")) el.src = proxy;
          }}
        />
      ) : null}
      <AvatarFallback
        className={cn("bg-primary/20 text-primary text-xs", rounded)}
      >
        {initials !== "?" ? initials : <User className="w-3 h-3" />}
      </AvatarFallback>
    </Avatar>
  );
}

