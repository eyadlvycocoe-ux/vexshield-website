import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsDemoMode } from "@/demo/demoMode";
import { makeDemoData } from "@/demo/demoData";
import {
  buildUsersGraphData,
  loadServerUsers,
  type ServerUserProfile,
  type UsersGraphData,
} from "@/lib/server-users";
import { normalizePlayerLicense, toIso } from "@/lib/ban-player-stats";

function buildDemoUsers(): ServerUserProfile[] {
  const demo = makeDemoData();
  const map = new Map<string, ServerUserProfile>();
  const now = Date.now();

  demo.bans.forEach((b, i) => {
    const lic = normalizePlayerLicense(b.metadata.license || "");
    const key = lic || b.playerId;
    let p = map.get(key);
    if (!p) {
      p = {
        id: key,
        username: b.playerName,
        license: b.metadata.license ? String(b.metadata.license) : "",
        discordId: b.metadata.discord ? String(b.metadata.discord).replace("discord:", "") : null,
        rank: i % 4 === 0 ? "Veteran" : i % 3 === 0 ? "Regular" : "Member",
        status: i < 3 ? "online" : "offline",
        banStatus: "banned",
        joinDate: new Date(now - (30 + i) * 86400000).toISOString(),
        lastSeen: new Date(now - i * 3600000).toISOString(),
        playtimeMinutes: 200 + i * 47,
        violationCount: 1 + (i % 3),
        banHistory: [],
        playerId: b.playerId,
      };
      map.set(key, p);
    }
    p!.banHistory.push({
      reason: b.description,
      date: b.createdAt,
      active: true,
      mode: b.mode,
    });
  });

  demo.warns.slice(0, 8).forEach((w, i) => {
    const key = `warn-${i}`;
    map.set(key, {
      id: key,
      username: w.playerName,
      license: `license:demo${i}${"a".repeat(36)}`.slice(0, 48),
      discordId: null,
      rank: "Member",
      status: "offline",
      banStatus: "warned",
      joinDate: new Date(now - 10 * 86400000).toISOString(),
      lastSeen: w.createdAt,
      playtimeMinutes: 90 + i * 20,
      violationCount: 1,
      banHistory: [],
    });
  });

  demo.players.slice(0, 5).forEach((pl, i) => {
    const lic = normalizePlayerLicense(pl.identifiers.find((id) => id.startsWith("license:")) || "");
    const key = lic || pl.id;
    if (map.has(key)) {
      const p = map.get(key)!;
      p.status = "online";
      return;
    }
    map.set(key, {
      id: key,
      username: pl.name,
      license: pl.identifiers.find((id) => id.startsWith("license:")) || "",
      discordId: pl.identifiers.find((id) => id.startsWith("discord:"))?.slice(8) ?? null,
      rank: pl.admin ? "Veteran" : "Newcomer",
      status: "online",
      banStatus: "clean",
      joinDate: new Date(now - (2 + i) * 86400000).toISOString(),
      lastSeen: new Date().toISOString(),
      playtimeMinutes: pl.playtimeMinutes ?? 45,
      violationCount: 0,
      banHistory: [],
      playerId: pl.id,
    });
  });

  return Array.from(map.values());
}

export function useServerUsers() {
  const { serverId } = useParams();
  const isDemo = useIsDemoMode();
  const [users, setUsers] = useState<ServerUserProfile[]>([]);
  const [graphData, setGraphData] = useState<UsersGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (isDemo) {
      const demoUsers = buildDemoUsers();
      setUsers(demoUsers);
      const demo = makeDemoData();
      setGraphData(
        buildUsersGraphData(
          demoUsers,
          demo.bans.map((b) => ({
            reason: b.description,
            mode: b.mode,
            created_at: b.createdAt,
          })),
        ),
      );
      setLoading(false);
      return;
    }
    if (!serverId) return;
    setLoading(true);
    try {
      const [profiles, bansRes] = await Promise.all([
        loadServerUsers(serverId).catch(() => [] as ServerUserProfile[]),
        supabase
          .from("bans")
          .select("reason, mode, created_at")
          .eq("server_id", serverId)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      setUsers(profiles);
      setGraphData(
        buildUsersGraphData(
          profiles,
          (bansRes.data ?? []) as { reason?: string; mode?: string; created_at?: string | null }[],
        ),
      );
    } catch {
      setUsers([]);
      setGraphData(null);
    } finally {
      setLoading(false);
    }
  }, [isDemo, serverId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return { users, graphData, loading, refreshing, refresh, serverId };
}

export function useDashboard24hStats(serverId: string | undefined, isDemo: boolean) {
  const [stats, setStats] = useState({
    newRegistrations: 0,
    detections24h: 0,
    bans24h: 0,
    falsePositiveReports: 0,
    topCheatToday: "—",
    topFlaggedPlayer: "—",
    lastLicenseEvent: null as { who: string; what: string; when: string } | null,
  });

  useEffect(() => {
    if (isDemo) {
      setStats({
        newRegistrations: 12,
        detections24h: 8,
        bans24h: 3,
        falsePositiveReports: 2,
        topCheatToday: "Anti Speedhack",
        topFlaggedPlayer: "SpeedHacker99",
        lastLicenseEvent: {
          who: "demo_owner",
          what: "AirShield 1 month renewal",
          when: new Date(Date.now() - 3600000).toISOString(),
        },
      });
      return;
    }
    if (!serverId) return;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const run = async () => {
      try {
        const [bansRes, reportsRes, serverRes, users] = await Promise.all([
          supabase
            .from("bans")
            .select("player_name, reason, mode, created_at")
            .eq("server_id", serverId)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("reports")
            .select("player_name, reason, metadata, created_at")
            .eq("server_id", serverId)
            .gte("created_at", since)
            .limit(100),
          supabase.from("servers").select("display_name, owner_email, created_at, expires_at").eq("server_id", serverId).maybeSingle(),
          loadServerUsers(serverId).catch(() => []),
        ]);

      const bans = bansRes.data ?? [];
      const detections = bans.filter((b) => String((b as { mode?: string }).mode || "").toLowerCase() === "anticheat");

      const cheatCounts = new Map<string, number>();
      const playerCounts = new Map<string, number>();
      for (const b of detections) {
        const row = b as { reason?: string; player_name?: string };
        const reason = String(row.reason || "Unknown").slice(0, 40);
        cheatCounts.set(reason, (cheatCounts.get(reason) || 0) + 1);
        const name = String(row.player_name || "Unknown");
        playerCounts.set(name, (playerCounts.get(name) || 0) + 1);
      }

      const fpReports = (reportsRes.data ?? []).filter((r) => {
        const row = r as { reason?: string; metadata?: Record<string, unknown> };
        const reason = String(row.reason || "").toLowerCase();
        const meta = row.metadata ?? {};
        return reason.includes("false positive") || meta.false_positive === true;
      });

      const newUsers = users.filter((u) => u.joinDate && u.joinDate >= since);

      let topCheat = "—";
      let topPlayer = "—";
      let maxC = 0;
      let maxP = 0;
      for (const [k, v] of cheatCounts) {
        if (v > maxC) {
          maxC = v;
          topCheat = k;
        }
      }
      for (const [k, v] of playerCounts) {
        if (v > maxP) {
          maxP = v;
          topPlayer = k;
        }
      }

      const srv = serverRes.data as { display_name?: string; owner_email?: string; created_at?: string; expires_at?: string } | null;
      const licenseWhen = srv?.expires_at || srv?.created_at;
      setStats({
        newRegistrations: newUsers.length,
        detections24h: detections.length,
        bans24h: bans.length,
        falsePositiveReports: fpReports.length,
        topCheatToday: topCheat,
        topFlaggedPlayer: topPlayer,
        lastLicenseEvent: licenseWhen
          ? {
              who: srv?.owner_email || srv?.display_name || serverId,
              what: "License active",
              when: toIso(licenseWhen) || licenseWhen,
            }
          : null,
      });
      } catch {
        /* keep previous stats on partial failure */
      }
    };

    void run();
  }, [serverId, isDemo]);

  return stats;
}
