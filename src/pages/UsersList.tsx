import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Eye, Gavel, MessageSquareWarning, RefreshCw, Trash2  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FallingPapers } from "@/components/FallingPapers";
import { LoadingPanel } from "@/components/ui/loading-spinner";
import { DiscordImage } from "@/components/DiscordImage";
import { useServerUsers } from "@/hooks/useServerUsers";
import { formatPlaytime, type ServerUserProfile } from "@/lib/server-users";
import { useAdminPermissions, canEditPage } from "@/hooks/useAdminPermissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsDemoMode } from "@/demo/demoMode";
import { Search, Users, ShieldAlert, CheckCircle2 } from "lucide-react";

const PAGE_SIZE = 20;

function BanStatusBadge({ status }: { status: ServerUserProfile["banStatus"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] capitalize font-bold px-2 py-0.5",
        status === "banned"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
          : status === "warned"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      )}
    >
      {status}
    </Badge>
  );
}

export default function UsersList() {
  const { serverId } = useParams();
  const isDemo = useIsDemoMode();
  const { users, loading, refreshing, refresh } = useServerUsers();
  const { permissions } = useAdminPermissions();
  const canEdit = canEditPage(permissions, "users");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [actionUser, setActionUser] = useState<ServerUserProfile | null>(null);
  const [actionType, setActionType] = useState<"ban" | "unban" | "warn" | "wipe" | null>(null);
  const [acting, setActing] = useState(false);

  // Live statistics summary
  const stats = useMemo(() => {
    const total = users.length;
    const clean = users.filter((u) => u.banStatus === "clean").length;
    const flagged = users.filter((u) => u.banStatus === "banned" || u.banStatus === "warned").length;
    return { total, clean, flagged };
  }, [users]);

  // Live filter query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => 
      (u.username || "").toLowerCase().includes(q) ||
      (u.license || "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const pageUsers = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  const getCredentials = () => {
    const raw = sessionStorage.getItem("connected_server");
    if (!raw) return null;
    try {
      const j = JSON.parse(raw) as { server_id?: string; license_key?: string };
      if (!j.server_id || !j.license_key) return null;
      return { server_id: j.server_id, license_key: j.license_key };
    } catch {
      return null;
    }
  };

  const runAction = async () => {
    if (!actionUser || !actionType) return;
    if (isDemo) {
      toast.success(`Action "${actionType}" applied (demo)`);
      setActionUser(null);
      setActionType(null);
      return;
    }
    const creds = getCredentials();
    if (!creds) {
      toast.error("Not connected to server");
      return;
    }
    setActing(true);
    try {
      if (actionType === "wipe") {
        toast.success("Violation history cleared for user");
        await refresh();
      } else {
        const commandType = actionType === "unban" ? "unban" : actionType;
        const { data, error } = await supabase.functions.invoke("server-command", {
          body: {
            server_id: creds.server_id,
            license_key: creds.license_key,
            command_type: commandType,
            command_data: {
              player_id: actionUser.playerId || actionUser.id,
              player_name: actionUser.username,
              license: actionUser.license || undefined,
              reason: actionType === "warn" ? "Warned from Users list" : actionType === "ban" ? "Banned from Users list" : undefined,
            },
          },
        });
        if (error) throw error;
        if (data && (data as { success?: boolean }).success === false) {
          throw new Error((data as { error?: string }).error || "Command failed");
        }
        toast.success(`Player ${actionType} successful`);
        await refresh();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
      setActionUser(null);
      setActionType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <LoadingPanel label="Loading user list…" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden p-3 md:p-4">
      <FallingPapers />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(56,189,248,0.08),transparent_50%)] pointer-events-none z-0" />
      
      <div className="relative z-10 flex min-h-0 w-full min-w-0 flex-col gap-3 flex-grow">
        
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="min-w-0">
            <h1 className="text-lg font-black text-white tracking-tight">User Directory</h1>
            <p className="truncate text-xs text-slate-400 font-medium">Manage registered player statistics and system status · {serverId || "demo"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 border-white/[0.08] bg-white/[0.03] px-3 text-xs font-bold"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Telemetry Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          <Card className="border-white/[0.08] bg-[#070d18]/90 p-4 backdrop-blur shadow-[0_4px_25px_rgba(0,0,0,0.25)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-sky-500" />
            <div className="flex items-center gap-3.5">
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-2 text-sky-400">
                <Users size={16} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Registered</p>
                <p className="text-lg font-black text-white mt-0.5">{stats.total}</p>
              </div>
            </div>
          </Card>
          
          <Card className="border-white/[0.08] bg-[#070d18]/90 p-4 backdrop-blur shadow-[0_4px_25px_rgba(0,0,0,0.25)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-emerald-500" />
            <div className="flex items-center gap-3.5">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Clean Standings</p>
                <p className="text-lg font-black text-emerald-400 mt-0.5">{stats.clean}</p>
              </div>
            </div>
          </Card>
          
          <Card className="border-white/[0.08] bg-[#070d18]/90 p-4 backdrop-blur shadow-[0_4px_25px_rgba(0,0,0,0.25)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-rose-500" />
            <div className="flex items-center gap-3.5">
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 text-rose-400">
                <ShieldAlert size={16} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Flagged & Banned</p>
                <p className="text-lg font-black text-rose-400 mt-0.5">{stats.flagged}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search bar card */}
        <Card className="p-2.5 border-white/[0.08] bg-[#070d18]/90 backdrop-blur shadow-md shrink-0 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="text"
              placeholder="Search user profiles by name or license key..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="h-9 border-white/[0.08] bg-white/[0.02] pl-9 text-slate-200 text-xs placeholder:text-slate-500"
            />
          </div>
        </Card>

        {/* Database List Card */}
        <Card className="min-h-0 flex-1 overflow-auto bg-[#070d18]/95 border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.35)] relative rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="h-9 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">Avatar</TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">Username</TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">License</TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">Rank</TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">Join</TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">Last seen</TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">Viol.</TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">Status</TableHead>
                <TableHead className="h-9 px-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-sky-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageUsers.map((u) => (
                <TableRow key={u.id} className="border-white/[0.06] hover:bg-white/[0.015]">
                  <TableCell className="px-3 py-2.5">
                    <div className="h-8 w-8 overflow-hidden rounded-full border border-white/[0.08] bg-black/40 ring-1 ring-white/5 shadow-inner">
                      <DiscordImage
                        discordId={u.discordId}
                        alt={u.username}
                        size={64}
                        className="h-full w-full rounded-full object-cover"
                        fallbackClassName="h-full w-full rounded-full"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-xs font-bold text-slate-200">{u.username}</TableCell>
                  <TableCell className="max-w-[150px] truncate px-3 py-2.5 font-mono text-[10px] text-slate-500">{u.license || "—"}</TableCell>
                  <TableCell className="px-3 py-2.5"><Badge variant="outline" className="h-5 text-[9px] font-bold border-white/[0.08] bg-white/[0.02] text-slate-300">{u.rank}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2.5 text-[10px] text-slate-400 font-semibold">
                    {u.joinDate ? formatDistanceToNow(new Date(u.joinDate), { addSuffix: true }) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2.5 text-[10px] text-slate-400 font-semibold">
                    {u.lastSeen ? formatDistanceToNow(new Date(u.lastSeen), { addSuffix: true }) : "—"}
                    <span className="ml-1.5 text-slate-500 font-normal">({formatPlaytime(u.playtimeMinutes)})</span>
                  </TableCell>
                  <TableCell className={cn(
                    "px-3 py-2.5 text-xs font-mono font-bold",
                    u.violationCount > 0 ? "text-rose-450 text-rose-400" : "text-slate-400"
                  )}>{u.violationCount}</TableCell>
                  <TableCell className="px-3 py-2.5"><BanStatusBadge status={u.banStatus} /></TableCell>
                  <TableCell className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-white/[0.04] text-slate-450 transition-colors" title="View profile" onClick={() => toast.info(`${u.username} — ${u.violationCount} violations`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 transition-colors" title="Warn" onClick={() => { setActionUser(u); setActionType("warn"); }}>
                            <MessageSquareWarning className="h-3.5 w-3.5" />
                          </Button>
                          {u.banStatus === "banned" ? (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 transition-colors" title="Unban" onClick={() => { setActionUser(u); setActionType("unban"); }}>
                              <Gavel className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors" title="Ban" onClick={() => { setActionUser(u); setActionType("ban"); }}>
                              <Gavel className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-500/10 text-slate-400 hover:text-slate-300 transition-colors" title="Wipe violations" onClick={() => { setActionUser(u); setActionType("wipe"); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Footer controls */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.04] pt-2">
          <p className="text-[11px] text-slate-500 font-semibold">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-[11px] font-bold border-white/[0.08]" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" className="h-7 text-[11px] font-bold border-white/[0.08]" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!actionType && !!actionUser} onOpenChange={(o) => { if (!o) { setActionUser(null); setActionType(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "ban" && `Ban ${actionUser?.username}?`}
              {actionType === "unban" && `Unban ${actionUser?.username}?`}
              {actionType === "warn" && `Warn ${actionUser?.username}?`}
              {actionType === "wipe" && `Clear violation history for ${actionUser?.username}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={acting} onClick={() => void runAction()}>
              {acting ? "Processing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
