import type { AnalyticsPoint } from "@/lib/dashboard-analytics";

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function int(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function idNum(rng: Rng, digits: number): string {
  let s = "";
  for (let i = 0; i < digits; i++) s += String(int(rng, 0, 9));
  // avoid leading zero
  if (s[0] === "0") s = "1" + s.slice(1);
  return s;
}

function license(rng: Rng): string {
  const hex = "0123456789abcdef";
  let out = "license:";
  for (let i = 0; i < 40; i++) out += hex[Math.floor(rng() * hex.length)]!;
  return out;
}

export type DemoPlayer = {
  id: string;
  name: string;
  ping: number;
  threatScore: number;
  tags: string[];
  admin?: boolean;
  inVehicle?: boolean;
  coords: { x: number; y: number; z: number };
  identifiers: string[];
  justJoined?: boolean;
  playtimeMinutes?: number;
  sessionMinutes?: number;
};

export type DemoBan = {
  id: string;
  banJsonId: string;
  playerId: string;
  playerName: string;
  mode: "Anticheat" | "Manuel";
  server: string;
  type: "ban";
  description: string;
  screenshot?: string | null;
  createdAt: string;
  metadata: {
    steam?: string;
    fivem?: string;
    discord?: string;
    xbl?: string;
    license?: string;
    license2?: string;
  };
};

export type DemoKick = {
  id: string;
  playerName: string;
  mode: "Anticheat" | "Manuel";
  server: string;
  type: "kick";
  description: string;
  createdAt: string;
  discordId?: string;
};

export type DemoWarn = {
  id: string;
  playerId?: string;
  playerName: string;
  mode: "Anticheat" | "Manuel";
  server: string;
  type: "warn";
  description: string;
  createdAt: string;
};

export type DemoActivityEvent = {
  id: string;
  kind: "ban" | "kick" | "warn" | "detection" | "admin";
  title: string;
  subtitle: string;
  createdAt: string;
};

export type DemoLogLine = {
  id: string;
  ts: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
};

export type DemoSearchResult = {
  blacklisted: boolean;
  discord: {
    discord_id: string;
    username: string;
    display_name: string;
    avatar: string | null;
    bio: string | null;
    email: string | null;
    connected_at: string;
  };
  blacklist: {
    id: number;
    discord_id: string;
    discord_tag: string;
    username: string;
    reason: string;
    added_at: string;
    last_ban_date: string;
    banned_by: string;
    license: string;
  } | null;
  proofs: Array<{ id: number; proof_url: string; user_id: number; server_name: string }>;
  asuas: {
    servers: Array<{
      name: string;
      id: string;
      messages: number;
      joinedAt: string;
      roles: Array<string | { id: string; name: string }>;
      nickname: string | null;
      icon: string | null;
      foundVia: string | null;
    }>;
    stats: { bans: number; cheaters: number; events: number; messages: number };
    bans: any[];
    cheaters: any[];
    events: any[];
    messages: any[];
  };
};

export function makeDemoData(seed = 20260422, serverId = "demo") {
  const rng = mulberry32(seed);

  const nameA = [
    "Fuzzy", "Silent", "Night", "Racing", "Pro", "Ghost", "Neo", "Dark", "Lucky", "Phoenix", "Viper", "Atlas", "El",
    "Bobo", "Mamba", "Shadow", "Nova", "Turbo", "Karma", "Sultan",
  ] as const;
  const nameB = [
    "Goose", "Rider", "Storm", "King", "Gamer", "Nomad", "Runner", "Spectre", "Drift", "M3NCHO", "Bobovero", "2570",
    "2024", "X", "Prime", "Zero", "Alpha", "Wolf", "Sparrow", "Titan",
  ] as const;

  const reasonsBan = [
    "Anti Noclip Detection",
    "Anti Godmode triggered",
    "Anti Speedhack (threshold exceeded)",
    "Anti Teleport / coords spoofing",
    "Injected menu signatures (lua hook)",
    "Weapon damage modifier (silent aim)",
    "Resource stop attempt blocked",
    "Blacklist match (shared identifiers)",
  ] as const;
  const reasonsKick = [
    "Suspicious behavior — manual review",
    "High packet loss / unstable connection",
    "Trigger spam (anti-flood)",
    "Weapon whitelist violation",
    "Multiple failed auth handshakes",
  ] as const;
  const reasonsWarn = [
    "Potential threat score spike",
    "Unusual playtime/session pattern",
    "Repeated trigger calls",
    "Possible spectator abuse",
  ] as const;

  const now = Date.now();
  const isoAgo = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

  const players: DemoPlayer[] = Array.from({ length: 42 }, (_, i) => {
    const id = String(10 + i);
    const nm = `${pick(rng, nameA)}${pick(rng, nameB)}${rng() < 0.22 ? int(rng, 10, 99) : ""}`.replace(/\s+/g, "");
    const ping = int(rng, 18, 140);
    const threatScore = Math.min(100, Math.max(0, Math.round(int(rng, 12, 92) + (rng() < 0.18 ? int(rng, 8, 25) : 0))));
    const admin = rng() < 0.07;
    const inVehicle = rng() < 0.45;
    const justJoined = rng() < 0.15;
    const sessionMinutes = justJoined ? int(rng, 1, 7) : int(rng, 8, 180);
    const playtimeMinutes = int(rng, 25, 3_200);
    const tags: string[] = [];
    if (admin) tags.push("Admin");
    if (justJoined) tags.push("Just joined");
    if (playtimeMinutes < 120) tags.push("Low playtime");
    if (threatScore >= 80 && !admin) tags.push("Potential threat");

    // GTA V world-ish coords (roughly fits many map renderers)
    const x = Math.round((rng() * 6000 - 3000) * 10) / 10;
    const y = Math.round((rng() * 6000 - 3000) * 10) / 10;
    const z = Math.round((rng() * 80 + 10) * 10) / 10;

    const discordId = idNum(rng, 18);
    const steamHex = idNum(rng, 15);
    const fivem = `fivem:${idNum(rng, 9)}`;
    const lic = license(rng);
    const lic2 = license(rng);

    return {
      id,
      name: nm,
      ping,
      threatScore,
      tags: tags.slice(0, 3),
      admin,
      inVehicle,
      coords: { x, y, z },
      identifiers: [
        lic,
        lic2,
        `discord:${discordId}`,
        `steam:${steamHex}`,
        fivem,
      ],
      justJoined,
      playtimeMinutes,
      sessionMinutes,
    };
  });

  const bans: DemoBan[] = Array.from({ length: 28 }, (_, i) => {
    const p = pick(rng, players);
    const minsAgo = int(rng, 4, 60 * 48);
    const createdAt = isoAgo(minsAgo);
    const dc = (p.identifiers.find((x) => x.startsWith("discord:")) || "").slice("discord:".length);
    const st = (p.identifiers.find((x) => x.startsWith("steam:")) || "").slice("steam:".length);
    const fv = (p.identifiers.find((x) => x.startsWith("fivem:")) || "").slice("fivem:".length);
    const lic = p.identifiers.find((x) => x.startsWith("license:")) || p.id;
    const lic2 = p.identifiers.filter((x) => x.startsWith("license:"))[1] || undefined;
    return {
      id: `demo-ban-${i + 1}`,
      banJsonId: `banjson-${idNum(rng, 10)}`,
      playerId: p.id,
      playerName: p.name,
      mode: rng() < 0.75 ? "Anticheat" : "Manuel",
      server: serverId,
      type: "ban",
      description: pick(rng, reasonsBan),
      screenshot: null,
      createdAt,
      metadata: {
        discord: dc || undefined,
        steam: st || undefined,
        fivem: fv || undefined,
        license: lic || undefined,
        license2: lic2,
      },
    };
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const kicks: DemoKick[] = Array.from({ length: 34 }, (_, i) => {
    const p = pick(rng, players);
    const minsAgo = int(rng, 2, 60 * 24);
    const createdAt = isoAgo(minsAgo);
    const dc = (p.identifiers.find((x) => x.startsWith("discord:")) || "").slice("discord:".length);
    return {
      id: `demo-kick-${i + 1}`,
      playerName: p.name,
      mode: rng() < 0.62 ? "Anticheat" : "Manuel",
      server: serverId,
      type: "kick",
      description: pick(rng, reasonsKick),
      createdAt,
      discordId: dc || undefined,
    };
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const warns: DemoWarn[] = Array.from({ length: 22 }, (_, i) => {
    const p = pick(rng, players);
    const minsAgo = int(rng, 1, 60 * 16);
    const createdAt = isoAgo(minsAgo);
    return {
      id: `demo-warn-${i + 1}`,
      playerId: p.id,
      playerName: p.name,
      mode: rng() < 0.55 ? "Anticheat" : "Manuel",
      server: serverId,
      type: "warn",
      description: pick(rng, reasonsWarn),
      createdAt,
    };
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const activity: DemoActivityEvent[] = [
    ...bans.slice(0, 10).map((b, i) => ({
      id: `act-ban-${i}`,
      kind: "ban" as const,
      title: `Ban: ${b.playerName}`,
      subtitle: b.description,
      createdAt: b.createdAt,
    })),
    ...kicks.slice(0, 10).map((k, i) => ({
      id: `act-kick-${i}`,
      kind: "kick" as const,
      title: `Kick: ${k.playerName}`,
      subtitle: k.description,
      createdAt: k.createdAt,
    })),
    ...warns.slice(0, 8).map((w, i) => ({
      id: `act-warn-${i}`,
      kind: "warn" as const,
      title: `Warning: ${w.playerName}`,
      subtitle: w.description,
      createdAt: w.createdAt,
    })),
  ]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20);

  const logs: DemoLogLine[] = Array.from({ length: 60 }, (_, i) => {
    const minsAgo = i * int(rng, 1, 4);
    const ts = isoAgo(minsAgo);
    const lvl = rng() < 0.08 ? "ERROR" : rng() < 0.22 ? "WARN" : "INFO";
    const msg =
      lvl === "ERROR"
        ? pick(rng, [
            "Heartbeat timeout from client; stream ended",
            "DB sync failed for one row (retry scheduled)",
            "Peer connection dropped (ICE restart)",
            "Signature scan exception (handled)",
          ] as const)
        : lvl === "WARN"
          ? pick(rng, [
              "Threat score spike detected (auto-flag)",
              "High trigger rate detected; rate-limited",
              "Vehicle spawn burst; monitoring",
              "Admin action queued",
            ] as const)
          : pick(rng, [
              "Snapshot updated",
              "Live view session refreshed",
              "Resource list synced",
              "Banlist sync completed",
              "Player joined",
              "Player left",
            ] as const);
    return { id: `log-${i}`, ts, level: lvl, message: msg };
  });

  const searchDemo: DemoSearchResult = (() => {
    const discordId = idNum(rng, 18);
    const tag = `user${discordId.slice(-4)}`;
    const display = `Demo ${pick(rng, ["Moderator", "Player", "Staff", "Member"] as const)} ${discordId.slice(-3)}`;
    const isBlacklisted = rng() < 0.55;
    const addedAt = isoAgo(int(rng, 60 * 24, 60 * 24 * 90));
    const lastBan = isoAgo(int(rng, 60 * 3, 60 * 24 * 14));
    const lic = license(rng);
    const proofs = isBlacklisted
      ? [
          { id: 1, proof_url: "https://example.com/proof/1", user_id: 1, server_name: "Demo RP" },
          { id: 2, proof_url: "https://example.com/proof/2", user_id: 1, server_name: "Atlas RP" },
        ]
      : [];

    const servers = Array.from({ length: 4 }, () => ({
      name: pick(rng, ["Demo RP", "Atlas RP", "Nova City", "NightShift", "Turbo Life"] as const),
      id: idNum(rng, 18),
      messages: int(rng, 12, 4_600),
      joinedAt: isoAgo(int(rng, 60 * 24 * 20, 60 * 24 * 240)),
      roles: [
        { id: "1", name: pick(rng, ["Member", "Verified", "VIP", "Staff"] as const) },
        rng() < 0.35 ? { id: "2", name: "Booster" } : "Supporter",
      ].filter(Boolean),
      nickname: rng() < 0.5 ? tag : null,
      icon: null,
      foundVia: rng() < 0.35 ? "messages" : "bans",
    }));

    return {
      blacklisted: isBlacklisted,
      discord: {
        discord_id: discordId,
        username: tag,
        display_name: display,
        avatar: null,
        bio: rng() < 0.4 ? "Here for RP. Keep it clean." : null,
        email: null,
        connected_at: isoAgo(int(rng, 60 * 24 * 2, 60 * 24 * 60)),
      },
      blacklist: isBlacklisted
        ? {
            id: 1,
            discord_id: discordId,
            discord_tag: `${tag}#${idNum(rng, 4)}`,
            username: display,
            reason: pick(rng, [
              "Ban evasion (shared license)",
              "Cheat menu detection (verified)",
              "Repeated anti-flood triggers",
              "Account linking suspicious activity",
            ] as const),
            added_at: addedAt,
            last_ban_date: lastBan,
            banned_by: "AirShield Auto",
            license: lic,
          }
        : null,
      proofs,
      asuas: {
        servers,
        stats: {
          bans: int(rng, 0, 18),
          cheaters: int(rng, 0, 7),
          events: int(rng, 30, 420),
          messages: int(rng, 200, 6_000),
        },
        bans: [],
        cheaters: [],
        events: [],
        messages: [],
      },
    };
  })();

  return { players, bans, kicks, warns, activity, logs, searchDemo };
}

/** WaveShield-style map demo: 256 players spread across GTA map. */
export function makeMapDemoPlayers(count = 256, seed = 20260429): DemoPlayer[] {
  const rng = mulberry32(seed);
  const names = [
    "xXDarkLord123Xx", "GamerGirl2024", "NoobSlayer69", "ProHacker_420", "SilentAssassin",
    "RedBullAddict", "MommasBoy", "TwitchStreamer", "YTInfluencer", "DiscordMod",
    "MinecraftSteve", "Fortnite_Kid", "CallOfDutyPro", "ApexLegend", "ValorantAce",
    "NightRider", "RacingKing", "PhoenixX", "ShadowStorm", "TurboKing",
  ];

  return Array.from({ length: count }, (_, i) => {
    const id = String(i + 1);
    const nameIndex = i % names.length;
    const variant = Math.floor(i / names.length);
    const name = names[nameIndex] + (variant > 0 ? `_${variant}` : "");
    const admin = i % 20 === 0;
    const inVehicle = i % 3 === 0;
    const justJoined = i % 8 === 0;
    const sessionMinutes = justJoined ? int(rng, 1, 55) : int(rng, 60, 480);
    const playtimeMinutes = int(rng, 5, 1200);
    const threatScore = int(rng, 0, 100);

    return {
      id,
      name,
      ping: int(rng, 18, 140),
      threatScore,
      tags: [],
      admin,
      inVehicle,
      coords: {
        x: Math.floor(Math.sin(i / 3) * 2800 + rng() * 800 - 400),
        y: Math.floor(Math.cos(i / 4) * 2800 + rng() * 800 - 400),
        z: int(rng, 10, 80),
      },
      identifiers: [license(rng), `discord:${idNum(rng, 18)}`],
      justJoined,
      playtimeMinutes,
      sessionMinutes,
    };
  });
}

export type DashboardDemoTimeRange = "today" | "7d" | "30d";

/** WaveShield-style analytics buckets (ported from WS demo-data.ts). */
export function getDashboardDemoAnalytics(timeRange: DashboardDemoTimeRange): AnalyticsPoint[] {
  if (timeRange === "today") {
    return Array.from({ length: 24 }, (_, i) => ({
      label: `${String(i).padStart(2, "0")}:00`,
      players: Math.floor(((i + 1) * 17) % 100) + 150,
      bans: Math.floor(((i + 1) * 3) % 15) + 10,
    }));
  }
  if (timeRange === "7d") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({
      label,
      players: Math.floor(((i + 1) * 23) % 30) + 226,
      bans: Math.floor(((i + 1) * 5) % 18) + 3,
    }));
  }
  return Array.from({ length: 4 }, (_, i) => ({
    label: `Week ${i + 1}`,
    players: Math.floor(((i + 1) * 31) % 20) + 236,
    bans: Math.floor(((i + 1) * 7) % 16) + 5,
  }));
}

const DEMO_DROP_REASONS = [
  { name: "By Player", value: 145 },
  { name: "By Server", value: 89 },
  { name: "Anticheat", value: 34 },
  { name: "By Resource", value: 28 },
  { name: "Crash", value: 14 },
  { name: "Timeout", value: 7 },
  { name: "Security", value: 3 },
] as const;

const DEMO_DETECTIONS = [
  { name: "AimBot Detected", value: 23 },
  { name: "Silent Aim Detected", value: 18 },
  { name: "Overlay Detected", value: 15 },
  { name: "Illegal Native Execution", value: 12 },
  { name: "Spoofed Bullets Detected", value: 11 },
  { name: "Invincibility Detected", value: 10 },
] as const;

/** Full dashboard demo payload matching WaveShield marketing screenshots. */
export function getDashboardDemoState() {
  const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return {
    server: {
      server_id: "demo",
      display_name: "Demo Server",
      server_ip: "8.8.8.8",
      status: "online",
      expires_at: expiresAt,
    },
    licenseKey: "demo-xxxxxxxx-xxxx-xxxx",
    acVersion: "4.6.0",
    latestAcVersion: "4.7.13",
    connections: 1247,
    playerCount: 256,
    maxSlots: 300,
    stats: {
      totalBans: 89,
      totalKicks: 231,
      totalWarns: 89,
      peakPlayers: 15_823,
    },
    banReasonBreakdown: DEMO_DETECTIONS.map((d) => ({ ...d })),
    actionBreakdown: DEMO_DROP_REASONS.map((d) => ({ ...d })),
  };
}

