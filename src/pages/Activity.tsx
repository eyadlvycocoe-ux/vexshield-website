import { useEffect, useState, useMemo } from "react";
import { Activity,
  AlertTriangle,
  Ban,
  Clock,
  Cog,
  Database,
  Shield,
  ShieldAlert,
  Terminal,
  UserCog,
  UserX,
  Search,
  FolderOpen,
  Filter,
 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { apiUrl, apiMutationHeaders, ensureCsrfCookie } from "@/lib/api-base";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DiscordAvatar } from "@/components/DiscordAvatar";
import { ActivityEventChart } from "@/components/activity/ActivityEventChart";
import {
  activityRangeStart,
  buildActivityChartData,
  type ActivityTimeRange,
} from "@/lib/activity-event-chart";
import { cn } from "@/lib/utils";

interface UnifiedLog {
  id: string;
  source: "command" | "ban" | "kick" | "warn";
  action: string;
  description: string;
  status: string;
  /** Who performed the action (admin username / email). */
  actor: string;
  actorDiscordId?: string | null;
  actorAvatar?: string | null;
  sourceLabel: string;
  created_at: string;
  extra?: string;
}

type DiscordProfileRow = { username: string | null; avatar: string | null };

const moderationTypes = new Set(["ban", "unban", "kick", "warn", "unwarn"]);
const resourceTypes = new Set(["start_resource", "stop_resource", "restart_resource", "sync_resources", "get_resources"]);

function resolveActorLabel(data: Record<string, unknown>, fallback = "Dashboard"): string {
  const username = data.issued_by_username ?? data.actor_username;
  if (typeof username === "string" && username.trim()) return username.trim();
  const email = data.issued_by_email ?? data.actor_email ?? data.admin_email;
  if (typeof email === "string" && email.trim()) return email.trim();
  const did = data.issued_by_discord_id ?? data.actor_discord_id;
  if (did) return `Discord ${did}`;
  return fallback;
}

function resolveBanActor(bannedBy: string | null | undefined, mode: string | null | undefined): string {
  const by = String(bannedBy || "").trim();
  if (!by || /^anticheat$/i.test(by) || (/^airshield/i.test(by) || /^vexshield/i.test(by))) {
    return mode && String(mode).trim() ? String(mode) : "Anticheat";
  }
  return by;
}

function normalizeDiscordId(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).replace(/^discord:/i, "").trim();
  return /^\d{17,20}$/.test(s) ? s : null;
}

function resolveActorDiscordId(data: Record<string, unknown>): string | null {
  return normalizeDiscordId(data.issued_by_discord_id ?? data.actor_discord_id);
}

async function fetchDiscordProfiles(
  discordIds: string[],
  serverId: string
): Promise<Record<string, DiscordProfileRow>> {
  const unique = [...new Set(discordIds.filter((id) => /^\d{17,20}$/.test(id)))];
  if (!unique.length || !serverId) return {};
  try {
    await ensureCsrfCookie();
    const res = await fetch(
      apiUrl(`/api/servers/${encodeURIComponent(serverId)}/activity-actor-profiles`),
      {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ discord_ids: unique }),
      }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[Activity] actor profiles failed:", body.error || res.status);
      return {};
    }
    const profiles = (body.profiles || {}) as Record<
      string,
      { username?: string | null; avatar?: string | null }
    >;
    const out: Record<string, DiscordProfileRow> = {};
    for (const [id, row] of Object.entries(profiles)) {
      out[id] = { username: row.username ?? null, avatar: row.avatar ?? null };
    }
    return out;
  } catch (e) {
    console.warn("[Activity] actor profiles error:", e);
    return {};
  }
}

function applyActorProfiles(logs: UnifiedLog[], profiles: Record<string, DiscordProfileRow>) {
  for (const log of logs) {
    const did = log.actorDiscordId;
    if (!did || !profiles[did]) continue;
    const p = profiles[did];
    if (p.avatar) log.actorAvatar = p.avatar;
    if (p.username && String(p.username).trim()) log.actor = String(p.username).trim();
  }
}

const labelByCommand: Record<string, string> = {
  ban: "Ban player",
  unban: "Unban player",
  kick: "Kick player",
  warn: "Warn player",
  unwarn: "Remove warning",
  update_settings: "Settings updated",
  execute_command: "Console command",
  start_resource: "Start resource",
  stop_resource: "Stop resource",
  restart_resource: "Restart resource",
  sync_resources: "Sync resources",
  get_resources: "Fetch resources",
  delete_vehicles: "Delete vehicles",
  delete_all_vehicles: "Delete all vehicles",
  delete_npcs: "Delete NPCs",
  delete_all_npcs: "Delete all NPCs",
  delete_objects: "Delete objects",
  delete_all_objects: "Delete all objects",
  start_monitoring: "Start monitoring",
  stop_monitoring: "Stop monitoring",
  admin_added: "Admin added",
  admin_removed: "Admin removed",
  admin_permissions_updated: "Admin permissions changed",
};

type LogCategory = "files" | "tx" | "system" | "server";

function logCategory(log: UnifiedLog): LogCategory {
  if (resourceTypes.has(log.action)) return "files";
  if (log.action === "execute_command") return "tx";
  if (log.source !== "command") return "system";
  return "server";
}

const TIME_RANGES: { id: ActivityTimeRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

const LOG_CATEGORY_FILTERS: { id: LogCategory; label: string; icon: typeof FolderOpen }[] = [
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "tx", label: "Tx", icon: Terminal },
  { id: "system", label: "System Events", icon: Filter },
  { id: "server", label: "Server Events", icon: Activity },
];

export default function ActivityPage() {
  const [logs, setLogs] = useState<UnifiedLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState<ActivityTimeRange>("today");
  const [logCategories, setLogCategories] = useState<Set<LogCategory>>(
    () => new Set(["files", "tx", "system", "server"]),
  );

  useEffect(() => {
    loadActivity();

    const connectedServerStr = sessionStorage.getItem("connected_server");
    if (!connectedServerStr) return;
    const connectedServer = JSON.parse(connectedServerStr);
    const serverId = connectedServer?.server_id;
    if (!serverId) return;

    const ch1 = supabase
      .channel("activity-commands")
      .on("postgres_changes", { event: "*", schema: "public", table: "dashboard_commands", filter: `server_id=eq.${serverId}` }, () => loadActivity())
      .subscribe();

    const ch2 = supabase
      .channel("activity-bans")
      .on("postgres_changes", { event: "*", schema: "public", table: "bans", filter: `server_id=eq.${serverId}` }, () => loadActivity())
      .subscribe();

    const ch3 = supabase
      .channel("activity-kicks")
      .on("postgres_changes", { event: "*", schema: "public", table: "kicks", filter: `server_id=eq.${serverId}` }, () => loadActivity())
      .subscribe();

    const ch4 = supabase
      .channel("activity-warns")
      .on("postgres_changes", { event: "*", schema: "public", table: "warns", filter: `server_id=eq.${serverId}` }, () => loadActivity())
      .subscribe();

    const poll = window.setInterval(() => loadActivity(), 25000);

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
      supabase.removeChannel(ch4);
    };
  }, []);

  const loadActivity = async () => {
    const connectedServerStr = sessionStorage.getItem("connected_server");
    if (!connectedServerStr) return;
    const connectedServer = JSON.parse(connectedServerStr);
    const serverId = connectedServer?.server_id;
    if (!serverId) return;

    const [cmdRes, banRes, kickRes, warnRes] = await Promise.all([
      supabase
        .from("dashboard_commands")
        .select("id, command_type, command_data, status, result, created_at, executed_at")
        .eq("server_id", serverId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("bans")
        .select("id, player_name, player_id, reason, banned_by, mode, type, created_at, is_active")
        .eq("server_id", serverId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("kicks")
        .select("id, player_name, player_id, reason, kicked_by, mode, type, created_at")
        .eq("server_id", serverId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("warns")
        .select("id, player_name, player_id, message, warned_by, mode, type, created_at")
        .eq("server_id", serverId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const unified: UnifiedLog[] = [];

    // Dashboard commands
    for (const cmd of cmdRes.data || []) {
      const data = (cmd.command_data && typeof cmd.command_data === "object" && !Array.isArray(cmd.command_data) ? cmd.command_data : {}) as Record<string, any>;
      const base = labelByCommand[cmd.command_type] || cmd.command_type.replace(/_/g, " ");
      let desc = base;
      if (cmd.command_type === "execute_command" && data.command) desc = `${base}: ${data.command}`;
      else if (["kick", "ban", "warn", "unban", "unwarn"].includes(cmd.command_type) && data.player_name) desc = `${base}: ${data.player_name}`;
      else if (resourceTypes.has(cmd.command_type) && data.resource_name) desc = `${base}: ${data.resource_name}`;
      else if (cmd.command_type.startsWith("admin_") && data.admin_email) desc = `${base}: ${data.admin_email}`;

      let extra: string | undefined;
      if (cmd.status === "failed" && cmd.result) {
        extra = typeof cmd.result === "string" ? cmd.result : JSON.stringify(cmd.result);
      }

      // Map dashboard moderation commands to their proper source filter
      let source: UnifiedLog["source"] = "command";
      if (cmd.command_type === "ban" || cmd.command_type === "unban") source = "ban";
      else if (cmd.command_type === "kick") source = "kick";
      else if (cmd.command_type === "warn" || cmd.command_type === "unwarn") source = "warn";

      const actorDiscordId = resolveActorDiscordId(data);
      const actorName = resolveActorLabel(data);

      unified.push({
        id: `cmd-${cmd.id}`,
        source,
        action: cmd.command_type,
        description: desc,
        status: cmd.status || "pending",
        actor: actorName,
        actorDiscordId,
        sourceLabel: "Dashboard",
        created_at: cmd.created_at || new Date().toISOString(),
        extra,
      });
    }

    // Bans from anticheat/server
    for (const ban of banRes.data || []) {
      unified.push({
        id: `ban-${ban.id}`,
        source: "ban",
        action: "anticheat_ban",
        description: `Ban: ${ban.player_name || ban.player_id} — ${ban.reason}`,
        status: ban.is_active ? "active" : "expired",
        actor: resolveBanActor(ban.banned_by, ban.mode),
        sourceLabel: "Anticheat",
        created_at: ban.created_at || new Date().toISOString(),
      });
    }

    // Kicks (filter out unbans — they belong in the ban category)
    for (const kick of kickRes.data || []) {
      const isUnban = kick.mode === "Unban" || kick.type === "unban";
      unified.push({
        id: `kick-${kick.id}`,
        source: isUnban ? "ban" : "kick",
        action: isUnban ? "anticheat_unban" : "anticheat_kick",
        description: isUnban
          ? `Unban: ${kick.player_name || kick.player_id} — ${kick.reason}`
          : `Kick: ${kick.player_name || kick.player_id} — ${kick.reason}`,
        status: "completed",
        actor: resolveBanActor(kick.kicked_by, kick.mode),
        sourceLabel: isUnban && resolveBanActor(kick.kicked_by, kick.mode) !== "Anticheat" ? "Dashboard" : "Anticheat",
        created_at: kick.created_at || new Date().toISOString(),
      });
    }

    // Warns
    for (const warn of warnRes.data || []) {
      unified.push({
        id: `warn-${warn.id}`,
        source: "warn",
        action: "anticheat_warn",
        description: `Warn: ${warn.player_name || warn.player_id} — ${warn.message}`,
        status: "completed",
        actor: resolveBanActor(warn.warned_by, warn.mode),
        sourceLabel: "Anticheat",
        created_at: warn.created_at || new Date().toISOString(),
      });
    }

    const profileIds = unified.map((l) => l.actorDiscordId).filter((id): id is string => !!id);
    const profiles = await fetchDiscordProfiles(profileIds, serverId);
    applyActorProfiles(unified, profiles);

    unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setLogs(unified);
  };

  const rangeLogs = useMemo(() => {
    const start = activityRangeStart(timeRange);
    return logs.filter((l) => new Date(l.created_at) >= start);
  }, [logs, timeRange]);

  const chartData = useMemo(() => buildActivityChartData(rangeLogs, timeRange), [rangeLogs, timeRange]);

  const filtered = useMemo(() => {
    let result = rangeLogs;
    if (logCategories.size < LOG_CATEGORY_FILTERS.length) {
      result = result.filter((l) => logCategories.has(logCategory(l)));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.description.toLowerCase().includes(term) ||
          l.actor.toLowerCase().includes(term) ||
          l.action.toLowerCase().includes(term) ||
          (l.extra && l.extra.toLowerCase().includes(term)),
      );
    }
    return result;
  }, [rangeLogs, logCategories, searchTerm]);

  const toggleLogCategory = (cat: LogCategory) => {
    setLogCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size <= 1) return prev;
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/30";
      case "active":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "expired":
        return "bg-muted/30 text-muted-foreground border-border/30";
      default:
        return "bg-warning/10 text-warning border-warning/30";
    }
  };

  const getIcon = (log: UnifiedLog) => {
    if (log.action.startsWith("anticheat_ban")) return ShieldAlert;
    if (log.action.startsWith("anticheat_kick")) return Ban;
    if (log.action.startsWith("anticheat_unban")) return Shield;
    if (log.action.startsWith("anticheat_warn")) return AlertTriangle;
    if (moderationTypes.has(log.action)) return Shield;
    if (resourceTypes.has(log.action)) return Database;
    if (log.action === "execute_command") return Terminal;
    if (log.action.startsWith("admin_")) return UserCog;
    if (log.action.startsWith("delete_")) return UserX;
    if (log.action === "update_settings") return Cog;
    return Clock;
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4 md:p-6 bg-[#0F1017] text-white">
      <div className="flex min-h-0 flex-[1.15] flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-2xl">
        <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-black text-white">Server Event Logs</h1>
            <p className="text-xs text-zinc-400">Activity breakdown by event type over time</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#050505] p-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setTimeRange(r.id)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                  timeRange === r.id ? "bg-white text-black font-extrabold shadow-sm" : "text-zinc-400 hover:text-white",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <ActivityEventChart data={chartData} />
      </div>

      <div className="flex shrink-0 flex-col gap-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search by player name, ID, license, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 border-white/10 bg-[#050505] pl-10 text-xs text-white placeholder:text-zinc-500 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {LOG_CATEGORY_FILTERS.map(({ id, label, icon: Icon }) => {
            const active = logCategories.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleLogCategory(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                  active
                    ? "border-blue-500/40 bg-blue-500/20 text-blue-300 font-extrabold shadow-md shadow-blue-500/10"
                    : "border-white/10 bg-[#0a0a0a] text-zinc-400 hover:text-white hover:border-blue-500/30 hover:bg-[#111722]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Activity className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-xs font-semibold">No events in this range</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filtered.map((log) => {
              const Icon = getIcon(log);
              const isAnticheat = log.source !== "command";
              return (
                <div key={log.id} className="px-4 py-3 transition-colors hover:bg-white/[0.02]">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10",
                        isAnticheat ? "bg-red-500/10 text-red-400" : "bg-white/[0.05] text-zinc-300",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px] font-bold uppercase rounded-full px-2", getStatusBadge(log.status))}>
                          {log.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold rounded-full px-2",
                            isAnticheat
                              ? "border-red-500/20 bg-red-500/5 text-red-400"
                              : "border-white/15 bg-white/5 text-zinc-300",
                          )}
                        >
                          {log.sourceLabel}
                        </Badge>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-200">{log.description}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {log.actorDiscordId ? (
                          <DiscordAvatar
                            discordId={log.actorDiscordId}
                            avatarHash={log.actorAvatar}
                            name={log.actor}
                            size="xs"
                            className="ring-1 ring-white/10"
                          />
                        ) : (
                          <div
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                              isAnticheat ? "bg-red-500/15" : "bg-sky-500/15",
                            )}
                          >
                            <Shield className={cn("h-3 w-3", isAnticheat ? "text-red-400" : "text-sky-400")} />
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500">
                          By <span className="font-medium text-slate-300">{log.actor}</span>
                        </p>
                      </div>
                      {log.extra ? <p className="mt-1 text-[11px] text-red-400">{log.extra}</p> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
