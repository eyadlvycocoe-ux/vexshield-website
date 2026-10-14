import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Search, RefreshCw  } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FallingPapers } from "@/components/FallingPapers";
import { LoadingPanel } from "@/components/ui/loading-spinner";
import { DiscordImage } from "@/components/DiscordImage";
import { useServerUsers } from "@/hooks/useServerUsers";
import { filterUsers, formatPlaytime, type ServerUserProfile } from "@/lib/server-users";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const RANKS = ["Newcomer", "Member", "Regular", "Veteran", "Flagged"];

function UserResultCard({ user }: { user: ServerUserProfile }) {
  return (
    <div className="rounded-xl border border-white/[0.08] hover:border-blue-500/30 bg-gradient-to-b from-[#0c1017] to-[#04060a] p-3 shadow-md transition-all">
      <div className="flex gap-2.5">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-2 ring-blue-500/30">
          <DiscordImage
            discordId={user.discordId}
            alt={user.username}
            size={72}
            className="h-full w-full rounded-full"
            fallbackClassName="h-full w-full rounded-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-xs font-bold text-white">{user.username}</h3>
            <Badge variant="outline" className="h-4 border-blue-500/30 bg-blue-500/10 px-1.5 text-[9px] text-blue-400 font-mono">{user.rank}</Badge>
            <Badge
              variant="outline"
              className={cn(
                "h-4 px-1.5 text-[9px] font-mono",
                user.status === "online"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/[0.04] text-zinc-400",
              )}
            >
              {user.status}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "h-4 px-1.5 text-[9px] font-mono",
                user.banStatus === "banned"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  : user.banStatus === "warned"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-blue-500/30 bg-blue-500/10 text-blue-400",
              )}
            >
              {user.banStatus}
            </Badge>
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] text-blue-400/70">{user.license || "—"}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
            <span>Join: {user.joinDate ? formatDistanceToNow(new Date(user.joinDate), { addSuffix: true }) : "—"}</span>
            <span>Seen: {user.lastSeen ? formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true }) : "—"}</span>
            <span>Play: {formatPlaytime(user.playtimeMinutes)}</span>
            <span>Viol: {user.violationCount}</span>
          </div>
          {user.banHistory.length > 0 && (
            <div className="mt-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1">
              {user.banHistory.slice(0, 2).map((b, i) => (
                <p key={i} className="truncate text-[10px] text-slate-400">
                  {b.reason} · {b.active ? "active" : "lifted"}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsersSearch() {
  const { serverId } = useParams();
  const { users, loading, refreshing, refresh } = useServerUsers();
  const [query, setQuery] = useState("");
  const [rank, setRank] = useState("all");
  const [status, setStatus] = useState("all");
  const [banStatus, setBanStatus] = useState("all");

  const filtered = useMemo(
    () => filterUsers(users, { query, rank, status, banStatus }),
    [users, query, rank, status, banStatus],
  );

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <LoadingPanel label="Loading users…" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden p-2 md:p-3">
      <FallingPapers />
      <div className="relative z-10 flex min-h-0 w-full min-w-0 flex-col gap-2 overflow-y-auto">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-100 md:text-lg">User Search</h1>
            <p className="text-[11px] text-slate-500">{filtered.length} results · {serverId || "demo"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 border-white/10 bg-white/[0.03] px-2.5 text-[11px]"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-1.5 h-3 w-3", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="shrink-0 rounded-xl border border-white/[0.08] bg-[#0a101c]/95 p-2">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <div className="relative col-span-2 lg:col-span-2">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Username, license…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 border-white/10 bg-white/[0.04] pl-8 text-xs"
              />
            </div>
            <Select value={rank} onValueChange={setRank}>
              <SelectTrigger className="h-8 border-white/10 bg-white/[0.04] text-xs">
                <SelectValue placeholder="Rank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ranks</SelectItem>
                {RANKS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 border-white/10 bg-white/[0.04] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <Select value={banStatus} onValueChange={setBanStatus}>
              <SelectTrigger className="h-8 border-white/10 bg-white/[0.04] text-xs">
                <SelectValue placeholder="Ban status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ban statuses</SelectItem>
                <SelectItem value="clean">Clean</SelectItem>
                <SelectItem value="warned">Warned</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#0a101c]/95 p-6 text-center text-xs text-slate-500">
            No users match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((u) => (
              <UserResultCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
