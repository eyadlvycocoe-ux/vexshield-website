import { useEffect, useState } from "react";
import type { BanRecord } from "@/pages/Bans";
import {
  applyBanMetadataStats,
  normalizePlayerLicense,
  playerMatchKeys,
} from "@/lib/ban-player-stats";
import { supabase } from "@/integrations/supabase/client";

export type BanPlayerEnrichment = {
  playtimeMinutes?: number;
  firstJoinAt?: string;
  lastJoinAt?: string;
  loading: boolean;
};

export function useBanPlayerEnrichment(
  ban: BanRecord | null,
  open: boolean,
  serverId: string | undefined,
  _allBans: BanRecord[],
  isDemo: boolean,
): BanPlayerEnrichment {
  const base = ban ? applyBanMetadataStats(ban) : null;
  const [playtimeMinutes, setPlaytimeMinutes] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ban || !serverId || isDemo) {
      setPlaytimeMinutes(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPlaytimeMinutes(base?.playtimeMinutes);

    (async () => {
      let playtime = base?.playtimeMinutes;

      try {
        const license = normalizePlayerLicense(ban.metadata?.license || ban.playerId);
        const snapRes = await supabase
          .from("players_snapshots")
          .select("snapshot")
          .eq("server_id", serverId)
          .maybeSingle();

        const snapshot = snapRes.data?.snapshot;
        const players = Array.isArray(snapshot) ? snapshot : [];
        for (const p of players) {
          if (typeof p !== "object" || !p) continue;
          const rec = p as Record<string, unknown>;
          const pLic = normalizePlayerLicense(
            String(rec.license || "") ||
              (Array.isArray(rec.identifiers)
                ? (rec.identifiers as string[]).find((id) => id.startsWith("license:"))
                : "") ||
              "",
          );
          if (!license || pLic !== license) continue;

          const snapPlay =
            typeof rec.playtime_minutes === "number"
              ? rec.playtime_minutes
              : typeof rec.playtimeMinutes === "number"
                ? rec.playtimeMinutes
                : typeof rec.session_minutes === "number"
                  ? rec.session_minutes
                  : undefined;
          if (snapPlay != null && playtime == null) playtime = Math.round(snapPlay);
          break;
        }
      } catch {
        /* keep base stats */
      }

      if (!cancelled) {
        setPlaytimeMinutes(playtime);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, ban, serverId, isDemo, base?.playtimeMinutes]);

  if (!base) {
    return { loading: false };
  }

  return {
    playtimeMinutes: playtimeMinutes ?? base.playtimeMinutes,
    firstJoinAt: base.firstJoinAt,
    lastJoinAt: base.lastJoinAt,
    loading,
  };
}
