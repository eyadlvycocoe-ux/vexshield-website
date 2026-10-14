import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Search, Server, Ban, Trash2, Clock, User, ImageOff, RotateCcw, Settings, Key, Lock, CheckCircle2, AlertCircle  } from "lucide-react";
import { toast } from "sonner";
import { apiMutationHeaders, apiUrl, ensureMutationCsrf, ensureCsrfCookie } from "@/lib/api-base";

interface OwnerProfile {
  discord_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface DeskServer {
  server_id: string;
  display_name: string;
  owner_email?: string | null;
  server_ip?: string | null;
  status?: string;
  ban_count: number;
  soft_deleted_at?: string | null;
  purge_after?: string | null;
  deletion_note?: string | null;
  owner?: OwnerProfile | null;
}

interface BanLog {
  id: string;
  player_name?: string | null;
  player_id?: string | null;
  reason?: string | null;
  banned_by?: string | null;
  created_at: string;
  is_active?: number | boolean;
  screenshot_url?: string | null;
  screenshot_proxy_url?: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_display_name?: string | null;
  discord_avatar_url?: string | null;
  identifiers?: Record<string, string | null>;
}

function formatUser(id: string, username?: string | null, display?: string | null) {
  const u = username && !/^\d{17,19}$/.test(username) ? username : null;
  const d = display && !/^\d{17,19}$/.test(display) ? display : null;
  if (d && u) return `${d} (@${u})`;
  if (u) return `@${u}`;
  if (d) return d;
  return id;
}

function formatDt(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString();
}

function BanEvidenceThumb({
  proxyUrl,
  directUrl,
}: {
  proxyUrl?: string | null;
  directUrl?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const localSrc =
    [directUrl, proxyUrl].find(
      (u) =>
        u &&
        (u.includes("/uploads/ban-clips/") || u.includes("/uploads/"))
    ) || null;
  const isVideo = /\.webm(\?|$)/i.test(String(localSrc || ""));

  if (!localSrc || failed) {
    return (
      <div className="h-16 w-24 shrink-0 rounded border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1">
        <ImageOff className="h-4 w-4 text-slate-600" />
        <span className="text-[9px] text-slate-600 px-1 text-center leading-tight">No preview</span>
      </div>
    );
  }

  const href = localSrc;

  if (isVideo) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="shrink-0 block">
        <video
          src={localSrc}
          className="h-16 w-24 object-cover rounded border border-white/10 bg-black/30"
          muted
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="shrink-0">
      <img
        src={localSrc}
        alt="Ban evidence"
        className="h-16 w-24 object-cover rounded border border-white/10 bg-black/30"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </a>
  );
}

export function SupportDeskServersPanel() {
  const navigate = useNavigate();
  const [servers, setServers] = useState<DeskServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);
  const [selected, setSelected] = useState<DeskServer | null>(null);
  const [bans, setBans] = useState<BanLog[]>([]);
  const [bansLoading, setBansLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [accessMap, setAccessMap] = useState<Record<string, string>>({});
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [resettingIp, setResettingIp] = useState(false);
  const [resetIpModalOpen, setResetIpModalOpen] = useState(false);
  const [newServerIpInput, setNewServerIpInput] = useState("");
  const [resetIpReason, setResetIpReason] = useState("");

  const loadServers = async () => {
    setLoading(true);
    try {
      const q = showRemoved ? "?include_removed=1" : "";
      const res = await fetch(apiUrl(`/desk/dashboard-servers${q}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load servers");
      setServers(await res.json());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load servers");
    } finally {
      setLoading(false);
    }
  };

  const loadAccessRequests = async () => {
    try {
      const res = await fetch(apiUrl("/desk/access-requests"), { credentials: "include" });
      if (res.ok) {
        const rows = await res.json();
        const map: Record<string, string> = {};
        if (Array.isArray(rows)) {
          for (const r of rows) map[String(r.server_id)] = String(r.status);
        }
        setAccessMap(map);
      }
    } catch {
      /* ignore */
    }
  };

  const loadBans = async (serverId: string) => {
    setBansLoading(true);
    try {
      const res = await fetch(apiUrl(`/desk/dashboard-servers/${serverId}/bans`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load bans");
      const j = await res.json();
      setBans(Array.isArray(j.bans) ? j.bans : []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load bans");
      setBans([]);
    } finally {
      setBansLoading(false);
    }
  };

  useEffect(() => {
    void loadServers();
    void loadAccessRequests();
  }, [showRemoved]);

  const handleRequestAccess = async (serverId: string) => {
    setRequestingAccess(true);
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl("/desk/access-requests"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ server_id: serverId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Request failed");
      toast.success(j.status === "approved" ? "Access already approved by owner" : "Access request sent to panel owner for approval");
      await loadAccessRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleResetIp = async (serverId: string, customIp?: string) => {
    setResettingIp(true);
    const targetIp = customIp !== undefined ? customIp : newServerIpInput;
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl(`/desk/dashboard-servers/${serverId}/reset-ip`), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ server_ip: targetIp, reason: resetIpReason }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "IP Reset failed");
      toast.success("Server IP updated / reset successfully");
      setResetIpModalOpen(false);
      await loadServers();
      if (selected && selected.server_id === serverId) {
        setSelected({ ...selected, server_ip: targetIp });
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "IP Reset failed");
    } finally {
      setResettingIp(false);
    }
  };

  const handleOpenConfig = (serverId: string) => {
    navigate(`/${serverId}/settings`);
  };

  const selectServer = (s: DeskServer) => {
    setSelected(s);
    void loadBans(s.server_id);
  };

  const filtered = servers.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.display_name.toLowerCase().includes(q) ||
      s.server_id.toLowerCase().includes(q) ||
      String(s.owner_email || "").toLowerCase().includes(q) ||
      String(s.owner?.username || "").toLowerCase().includes(q)
    );
  });

  const confirmDelete = async () => {
    if (!selected || deleteReason.trim().length < 3) {
      toast.error("Deletion reason is required (min 3 characters)");
      return;
    }
    setDeleting(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/desk/dashboard-servers/${selected.server_id}/soft-delete`), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ reason: deleteReason.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || "Delete failed");
      toast.success("Server marked for removal (7 days retention)");
      setDeleteOpen(false);
      setDeleteReason("");
      await loadServers();
      setSelected(null);
      setBans([]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
      <Card className="lg:col-span-1 border-white/10 bg-card/40 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-orange-400" />
            Dashboard servers
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              className="pl-9 h-9 bg-background/50 border-white/10"
              placeholder="Search server or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant={showRemoved ? "default" : "outline"}
            className="mt-2 w-full text-xs"
            onClick={() => setShowRemoved((v) => !v)}
          >
            {showRemoved ? "Showing removed (7d window)" : "Active servers only"}
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <p className="text-sm text-slate-500 p-4">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 p-4 italic">No servers found</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.server_id}
                type="button"
                onClick={() => selectServer(s)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected?.server_id === s.server_id
                    ? "border-orange-500/50 bg-orange-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                } ${s.soft_deleted_at ? "opacity-70" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{s.display_name}</p>
                  {s.soft_deleted_at ? (
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      removed
                    </Badge>
                  ) : null}
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{s.server_id}</p>
                <p className="text-[10px] text-sky-300/80 mt-1 flex items-center gap-1">
                  <Ban className="h-3 w-3" />
                  {s.ban_count} bans
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 border-white/10 bg-card/40 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <CardHeader className="border-b border-white/10 pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{selected.display_name}</CardTitle>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{selected.server_id}</p>
                  {selected.owner ? (
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        src={selected.owner.avatar_url || `/api/public/discord-avatar/${selected.owner.discord_id}?size=64`}
                        alt=""
                        className="h-8 w-8 rounded-full border border-white/10"
                      />
                      <div className="text-xs">
                        <p className="text-white font-medium flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {formatUser(
                            selected.owner.discord_id,
                            selected.owner.username,
                            selected.owner.display_name,
                          )}
                        </p>
                        <p className="text-slate-500">{selected.owner_email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-2">{selected.owner_email || "No owner profile"}</p>
                  )}
                  {selected.soft_deleted_at ? (
                    <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pending removal · purge {formatDt(selected.purge_after)}
                      {selected.deletion_note ? ` · ${selected.deletion_note}` : ""}
                    </p>
                  ) : null}
                </div>
                {!selected.soft_deleted_at ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Always visible Reset IP button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-sky-500/50 text-sky-400 hover:bg-sky-500/10 text-xs font-semibold"
                      disabled={resettingIp}
                      onClick={() => {
                        setNewServerIpInput(selected.server_ip || "");
                        setResetIpModalOpen(true);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      {resettingIp ? "Resetting IP..." : "Reset Server IP"}
                    </Button>

                    {accessMap[selected.server_id] === "approved" ? (
                      <>
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs py-1">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Access Approved
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs font-semibold"
                          onClick={() => handleOpenConfig(selected.server_id)}
                        >
                          <Settings className="h-3.5 w-3.5 mr-1" />
                          Configuration
                        </Button>
                      </>
                    ) : accessMap[selected.server_id] === "pending" ? (
                      <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 text-xs py-1">
                        <Clock className="h-3.5 w-3.5 mr-1 animate-spin" /> Pending Owner Approval
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 text-xs font-semibold"
                        disabled={requestingAccess}
                        onClick={() => void handleRequestAccess(selected.server_id)}
                      >
                        <Lock className="h-3.5 w-3.5 mr-1" />
                        {requestingAccess ? "Requesting..." : "Request Access"}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs font-semibold"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Blacklist Server
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Ban logs ({bans.length})
              </p>
              {bansLoading ? (
                <p className="text-sm text-slate-500">Loading bans...</p>
              ) : bans.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No bans recorded for this server.</p>
              ) : (
                bans.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-4 flex flex-col md:flex-row gap-4 items-start transition-all hover:border-white/20"
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      {b.discord_id ? (
                        <img
                          src={
                            b.discord_avatar_url ||
                            `/api/public/discord-avatar/${b.discord_id}?size=128`
                          }
                          alt=""
                          className="h-12 w-12 rounded-full border border-white/15 object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
                          <User className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-sm text-white">
                          {b.player_name ||
                            formatUser(
                              b.discord_id || b.player_id || "?",
                              b.discord_username,
                              b.discord_display_name,
                            )}
                        </p>
                        {b.is_active === 0 || b.is_active === false ? (
                          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                            Unbanned / Inactive
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-red-500/50 bg-red-500/10 text-red-400">
                            Active Ban
                          </Badge>
                        )}
                      </div>

                      {/* Discord details */}
                      {b.discord_id ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-sky-400 font-medium">
                            {formatUser(b.discord_id, b.discord_username, b.discord_display_name)}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                            ID: {b.discord_id}
                          </span>
                        </div>
                      ) : null}

                      {/* Reason */}
                      <p className="text-xs text-slate-200 bg-white/5 p-2 rounded-md border border-white/5">
                        <strong className="text-slate-400">Reason:</strong> {b.reason || "No reason specified"}
                      </p>

                      {/* Identifiers (License, Steam, FiveM) */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {b.identifiers?.license ? (
                          <span className="text-[10px] font-mono bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2 py-0.5 rounded">
                            license: {b.identifiers.license}
                          </span>
                        ) : null}
                        {b.identifiers?.steam ? (
                          <span className="text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                            steam: {b.identifiers.steam}
                          </span>
                        ) : null}
                        {b.identifiers?.fivem ? (
                          <span className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                            fivem: {b.identifiers.fivem}
                          </span>
                        ) : null}
                        {b.identifiers?.discord && b.identifiers.discord !== b.discord_id ? (
                          <span className="text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                            discord: {b.identifiers.discord}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[10px] text-slate-500 pt-1">
                        Banned by <span className="text-slate-400 font-medium">{b.banned_by || "System"}</span> · {formatDt(b.created_at)}
                      </p>
                    </div>

                    {/* Ban evidence thumbnail / video */}
                    {b.screenshot_proxy_url || b.screenshot_url ? (
                      <div className="shrink-0 space-y-1">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold text-center">Ban Clip / Evidence</p>
                        <BanEvidenceThumb
                          proxyUrl={b.screenshot_proxy_url}
                          directUrl={b.screenshot_url}
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a server to view ban logs
          </CardContent>
        )}
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Blacklist / Remove Server Panel
            </DialogTitle>
            <DialogDescription>
              {selected?.display_name} will be blacklisted and disabled immediately. Owner access will be revoked. A detailed reason is mandatory and will be logged for admin audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-reason" className="text-white font-medium">
              Blacklist Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Provide a mandatory reason for blacklisting this server (min 3 characters)..."
              rows={4}
              className="bg-background/50 border-white/10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting || deleteReason.trim().length < 3}>
              Confirm Blacklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct Reset / Change Server IP Modal */}
      <Dialog open={resetIpModalOpen} onOpenChange={setResetIpModalOpen}>
        <DialogContent className="bg-[#090e17] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-sky-400">
              <RotateCcw className="h-5 w-5" />
              Reset / Change Server IP
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Update the registered IP address for <span className="font-mono text-white">{selected?.display_name}</span>. Enter the new IP address or leave blank to clear the IP lock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="server-ip-input" className="text-xs font-bold text-slate-300 block mb-1">
                New Server IP Address
              </Label>
              <Input
                id="server-ip-input"
                value={newServerIpInput}
                onChange={(e) => setNewServerIpInput(e.target.value)}
                placeholder="e.g. 185.220.101.5:30120 or clear"
                className="bg-black/50 border-white/10 font-mono text-sm text-white"
              />
            </div>
            <div>
              <Label htmlFor="server-ip-reason" className="text-xs font-bold text-slate-300 block mb-1">
                Reason for IP Reset / Change <span className="text-amber-400">*</span>
              </Label>
              <Input
                id="server-ip-reason"
                value={resetIpReason}
                onChange={(e) => setResetIpReason(e.target.value)}
                placeholder="e.g. Client requested server host migration"
                className="bg-black/50 border-white/10 text-xs text-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetIpModalOpen(false)} disabled={resettingIp}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
              onClick={() => selected && void handleResetIp(selected.server_id)}
              disabled={resettingIp}
            >
              {resettingIp ? "Saving..." : "Save & Reset IP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
