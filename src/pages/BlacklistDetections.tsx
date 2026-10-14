import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Search, Shield, Users, Ban, RefreshCw, UserCheck, Eye, RotateCcw, Info, Power  } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FallingPapers } from "@/components/FallingPapers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DiscordAvatar } from "@/components/DiscordAvatar";
import type { Tables } from "@/integrations/supabase/types";
import { useIsDemoMode } from "@/demo/demoMode";
import { makeDemoData } from "@/demo/demoData";
import { apiMutationHeaders, apiUrl, ensureCsrfCookie } from "@/lib/api-base";

type BlockedUser = Tables<'bans'>;

interface DiscordUserInfo {
  discord_id: string;
  username: string | null;
  avatar: string | null;
  guilds: unknown;
}

export default function BlacklistDetections() {
  const { serverId } = useParams();
  const isDemo = useIsDemoMode();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [discordUsers, setDiscordUsers] = useState<Map<string, DiscordUserInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [blacklistBlockEnabled, setBlacklistBlockEnabled] = useState<boolean | null>(null);
  const [blockToggleSaving, setBlockToggleSaving] = useState(false);

  const fetchBlockedUsers = async () => {
    if (isDemo) {
      const demo = makeDemoData();
      // Create a few fake "discord_blacklist" ban rows
      const fakeRows: any[] = demo.bans.slice(0, 10).map((b, i) => ({
        id: `demo-bl-${i + 1}`,
        server_id: "demo",
        type: "discord_blacklist",
        player_name: b.playerName,
        player_id: b.playerId,
        reason: b.description,
        created_at: b.createdAt,
        mode: "Anticheat",
        metadata: {
          discord_id: b.metadata.discord ? String(b.metadata.discord) : undefined,
          reason_code: "global_blacklist_match",
          matched: ["discord", "license", "steam"].slice(0, (i % 3) + 1),
        },
        exempted_by_server: [],
        is_active: true,
      }));

      const userMap = new Map<string, DiscordUserInfo>();
      for (const row of fakeRows) {
        const dc = row.metadata?.discord_id;
        if (!dc) continue;
        userMap.set(dc, {
          discord_id: dc,
          username: `demo_user_${String(dc).slice(-4)}`,
          avatar: null,
          guilds: [
            { id: "1", name: "Demo RP" },
            { id: "2", name: "Atlas RP" },
          ],
        });
      }

      setBlockedUsers(fakeRows as any);
      setDiscordUsers(userMap);
      setBlacklistBlockEnabled(true);
      setLoading(false);
      return;
    }
    if (!serverId) {
      setLoading(false);
      return;
    }

    try {
      const cached = sessionStorage.getItem(`blacklist_block_${serverId}`);
      if (cached === "0") setBlacklistBlockEnabled(false);
      else if (cached === "1") setBlacklistBlockEnabled(true);

      const res = await fetch(apiUrl(`/api/servers/${encodeURIComponent(serverId)}/blacklist-detections`), {
        credentials: 'include',
        headers: { Accept: 'application/json', 'X-AirCore-Client': '1' },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load detections');
      const data = (body.data || []) as BlockedUser[];
      setBlockedUsers(data);
      if (typeof body.blacklist_block_enabled === 'boolean') {
        setBlacklistBlockEnabled(body.blacklist_block_enabled);
        sessionStorage.setItem(
          `blacklist_block_${serverId}`,
          body.blacklist_block_enabled ? "1" : "0"
        );
      } else {
        const blockRes = await fetch(apiUrl(`/api/servers/${encodeURIComponent(serverId)}/blacklist-block`), {
          credentials: 'include',
          headers: { Accept: 'application/json', 'X-AirCore-Client': '1' },
        });
        const blockBody = await blockRes.json().catch(() => ({}));
        if (blockRes.ok && typeof blockBody.blacklist_block_enabled === 'boolean') {
          setBlacklistBlockEnabled(blockBody.blacklist_block_enabled);
        } else {
          setBlacklistBlockEnabled(true);
        }
      }

      const profiles = (body.discord_users || {}) as Record<string, DiscordUserInfo>;
      const userMap = new Map<string, DiscordUserInfo>();
      Object.entries(profiles).forEach(([id, user]) => {
        userMap.set(id, user);
      });
      setDiscordUsers(userMap);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      toast.error('Failed to load blacklist detections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, [serverId, isDemo]);

  const handleBlacklistBlockToggle = async (enabled: boolean) => {
    if (isDemo) {
      setBlacklistBlockEnabled(enabled);
      toast.success(enabled ? 'Blacklist block enabled (demo)' : 'Blacklist block disabled (demo)');
      return;
    }
    if (!serverId) return;

    const previous = blacklistBlockEnabled;
    setBlacklistBlockEnabled(enabled);
    setBlockToggleSaving(true);
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl(`/api/servers/${encodeURIComponent(serverId)}/blacklist-block`), {
        method: 'PUT',
        credentials: 'include',
        headers: apiMutationHeaders(),
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update blacklist block');
      const saved = data.blacklist_block_enabled !== false;
      setBlacklistBlockEnabled(saved);
      if (serverId) {
        sessionStorage.setItem(`blacklist_block_${serverId}`, saved ? "1" : "0");
      }
      toast.success(
        saved
          ? 'Blacklist block enabled — anticheat will ban matching players within a second'
          : 'Blacklist block disabled — applied on your server within a second'
      );
    } catch (error) {
      console.error('Error updating blacklist block:', error);
      setBlacklistBlockEnabled(previous);
      toast.error('Failed to update blacklist block setting');
    } finally {
      setBlockToggleSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBlockedUsers();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleServerUnban = async (user: BlockedUser) => {
    setProcessing(true);
    try {
      const metadata = user.metadata as Record<string, unknown>;
      const discordId = metadata?.discord_id as string;

      const currentExempted = user.exempted_by_server || [];
      if (currentExempted.includes(serverId!)) {
        toast.info('User is already on the whitelist for this server');
        return;
      }

      await ensureCsrfCookie();
      const res = await fetch(apiUrl(`/api/servers/${encodeURIComponent(serverId!)}/blacklist-detection/exempt`), {
        method: 'POST',
        credentials: 'include',
        headers: apiMutationHeaders(),
        body: JSON.stringify({ ban_id: user.id, exempt: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Whitelist failed');

      toast.success(`${user.player_name || discordId} added to whitelist for this server`);
      setShowDetailsModal(false);
      fetchBlockedUsers();
    } catch (error) {
      console.error('Error exempting user:', error);
      toast.error('Failed to add user to whitelist');
    } finally {
      setProcessing(false);
    }
  };

  const handleReban = async (user: BlockedUser) => {
    setProcessing(true);
    try {
      const metadata = user.metadata as Record<string, unknown>;
      const discordId = metadata?.discord_id as string;

      await ensureCsrfCookie();
      const res = await fetch(apiUrl(`/api/servers/${encodeURIComponent(serverId!)}/blacklist-detection/exempt`), {
        method: 'POST',
        credentials: 'include',
        headers: apiMutationHeaders(),
        body: JSON.stringify({ ban_id: user.id, exempt: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Re-ban failed');

      toast.success(`User ${user.player_name || discordId} has been re-banned on this server`);
      setShowDetailsModal(false);
      fetchBlockedUsers();
    } catch (error) {
      console.error('Error re-banning user:', error);
      toast.error('Failed to re-ban user');
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = blockedUsers.filter(user => {
    const metadata = user.metadata as Record<string, unknown>;
    const discordId = metadata?.discord_id as string || '';
    const blacklistedGuild = metadata?.blacklisted_guild as string || '';
    
    return user.player_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.player_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blacklistedGuild.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const activeCount = blockedUsers.filter(u => u.is_active && !u.exempted_by_server?.includes(serverId!)).length;
  const exemptedCount = blockedUsers.filter(u => u.exempted_by_server?.includes(serverId!)).length;

  return (
    <div className="relative min-h-full w-full p-4 md:p-6 bg-[#0F1017] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.02),transparent_55%)] -z-10" />
      <FallingPapers />
      
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-white">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              Blacklist Detections
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Users who tried to join from blacklisted Discord servers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Card className="px-4 py-2.5 flex items-center gap-3 bg-[#0a0a0a] border-white/10 rounded-2xl shadow-xl">
              <Power
                className={`h-4 w-4 ${
                  blacklistBlockEnabled === true ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              />
              <div className="text-right">
                <Label htmlFor="blacklist-block-toggle" className="text-xs font-bold text-white cursor-pointer">
                  Blacklist Block
                </Label>
                <p className="text-[10px] text-zinc-400">
                  {blacklistBlockEnabled === null
                    ? 'Loading…'
                    : blacklistBlockEnabled
                      ? 'On — active'
                      : 'Off — disabled'}
                </p>
              </div>
              <Switch
                id="blacklist-block-toggle"
                checked={blacklistBlockEnabled === true}
                disabled={blockToggleSaving || loading || blacklistBlockEnabled === null}
                onCheckedChange={handleBlacklistBlockToggle}
              />
            </Card>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="h-10 border-white/10 bg-[#141414] hover:bg-[#1a1a1e] text-zinc-300 hover:text-white font-bold text-xs px-4 rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {blacklistBlockEnabled === false && (
          <Card className="p-4 bg-amber-500/10 border-amber-500/30 rounded-2xl">
            <p className="text-xs font-medium text-amber-300">
              Blacklist Block is off. The anticheat will not auto-ban or log new blacklist detections until you turn it back on.
            </p>
          </Card>
        )}

        {/* Info Banner */}
        <Card className="p-4 bg-[#0a0a0a] border-white/10 rounded-2xl shadow-xl">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-white mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-xs text-white">How Blacklist Detection Works</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                When someone tries to join while on the VexShield global blacklist or a blacklisted Discord server, a detection is logged here.
                Use the Blacklist Block toggle above to enable or disable automatic bans on your FiveM server.
                Use Whitelist to allow them on your server only — they can still be blocked elsewhere until you re-ban.
              </p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 bg-gradient-to-b from-[#0c1017] to-[#04060a] border-white/[0.08] hover:border-blue-500/30 rounded-2xl shadow-2xl transition-all">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-sm shadow-blue-500/10">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-white tabular-nums">{activeCount}</p>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Active Blocks</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-b from-[#0c1017] to-[#04060a] border-white/[0.08] hover:border-blue-500/30 rounded-2xl shadow-2xl transition-all">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-sm shadow-blue-500/10">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-blue-400 tabular-nums">{blockedUsers.length}</p>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Total Detections</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-b from-[#0c1017] to-[#04060a] border-white/[0.08] hover:border-blue-500/30 rounded-2xl shadow-2xl transition-all">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-sm shadow-blue-500/10">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-white tabular-nums">{exemptedCount}</p>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Whitelisted</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-3.5 bg-[#0a0a0a] border-white/10 rounded-2xl shadow-xl">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by player name, Discord ID, or blacklisted server..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-10 bg-[#050505] border-white/10 text-xs text-white placeholder:text-zinc-500 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500/40"
            />
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden border-white/10 bg-[#0a0a0a] rounded-2xl shadow-2xl">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
              <p className="text-xs text-zinc-500">Loading detections...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-xs text-zinc-400 font-medium">No blacklist detections for this server</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/10 bg-white/[0.02]">
                  <TableHead className="text-zinc-400 font-bold uppercase text-[11px]">User</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[11px]">Discord ID</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[11px]">Blacklisted Server</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[11px]">Reason</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[11px]">Status</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[11px]">Date</TableHead>
                  <TableHead className="text-right text-zinc-400 font-bold uppercase text-[11px] pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const metadata = user.metadata as Record<string, unknown>;
                  const discordId = metadata?.discord_id as string || '';
                  const discordInfo = discordUsers.get(discordId);
                  const isExempted = user.exempted_by_server?.includes(serverId!) || !user.is_active;

                  return (
                    <TableRow 
                      key={user.id} 
                      className={`hover:bg-white/[0.04] border-white/[0.06] transition-colors ${isExempted ? 'bg-white/[0.02]' : ''}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {discordInfo ? (
                            <DiscordAvatar
                              discordId={discordInfo.discord_id}
                              avatarHash={discordInfo.avatar}
                              name={discordInfo.username || 'User'}
                              size="md"
                            />
                          ) : (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-white/10 text-white font-bold text-xs">
                                {(user.player_name || 'U')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <p className="font-bold text-xs text-white">{discordInfo?.username || user.player_name || 'Unknown'}</p>
                            <p className="text-[11px] text-zinc-500 font-mono">{user.player_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-[11px] font-mono bg-[#141414] border border-white/10 px-2 py-1 rounded-lg text-zinc-300">{discordId}</code>
                      </TableCell>
                      <TableCell>
                        <span className="text-rose-400 font-semibold text-xs">
                          {metadata?.blacklisted_guild as string || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-zinc-400 max-w-[220px] truncate" title={(metadata?.blacklist_reason as string) || user.reason || ''}>
                          {(metadata?.blacklist_reason as string) || user.reason || '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {isExempted ? (
                          <Badge className="bg-white/10 text-white border-white/20 text-[10px] font-bold">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Whitelisted
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] font-bold">
                            <Ban className="h-3 w-3 mr-1" />
                            Blocked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-zinc-400">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right pr-5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 shrink-0 p-0 rounded-xl border-white/10 bg-[#141414] hover:bg-[#111722] hover:border-blue-500/30 text-zinc-300 hover:text-white"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetailsModal(true);
                            }}
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {isExempted ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 shrink-0 p-0 rounded-xl font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
                              onClick={() => handleReban(user)}
                              disabled={processing}
                              title="Re-ban on this server"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 w-8 shrink-0 p-0 rounded-xl font-extrabold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                              onClick={() => handleServerUnban(user)}
                              disabled={processing}
                              title="Whitelist on this server"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Detection Details
            </DialogTitle>
            <DialogDescription>
              View details and manage whitelist for this user
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (() => {
            const metadata = selectedUser.metadata as Record<string, unknown>;
            const discordId = metadata?.discord_id as string || '';
            const discordInfo = discordUsers.get(discordId);
            const isExempted = selectedUser.exempted_by_server?.includes(serverId!) || !selectedUser.is_active;

            return (
              <div className="space-y-4">
                <div className={`flex items-center gap-4 p-4 rounded-lg ${isExempted ? 'bg-success/10 border border-success/30' : 'bg-muted/30'}`}>
                  {discordInfo ? (
                    <DiscordAvatar
                      discordId={discordInfo.discord_id}
                      avatarHash={discordInfo.avatar}
                      name={discordInfo.username || 'User'}
                      size="lg"
                    />
                  ) : (
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/20 text-primary text-xl">
                        {(selectedUser.player_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{discordInfo?.username || selectedUser.player_name}</h3>
                    <p className="text-muted-foreground text-sm">Discord: {discordId}</p>
                    {isExempted && (
                      <Badge className="mt-2 bg-success/20 text-success">Whitelisted on this server</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <p className="text-xs text-muted-foreground mb-1">Blacklisted Server</p>
                    <p className="font-medium text-destructive text-sm">{metadata?.blacklisted_guild as string}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Detection Date</p>
                    <p className="font-medium text-sm">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Blacklist reason</p>
                  <p className="font-medium text-sm">{(metadata?.blacklist_reason as string) || selectedUser.reason || '—'}</p>
                </div>

                {isExempted && (
                  <div className="p-3 bg-success/10 rounded-lg border border-success/30">
                    <p className="text-success font-medium">✓ This user is on the whitelist for this server</p>
                    <p className="text-sm text-muted-foreground mt-1">They can join your server even while on the global or Discord blacklist.</p>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
            {selectedUser && (
              selectedUser.exempted_by_server?.includes(serverId!) || !selectedUser.is_active ? (
                <Button
                  variant="destructive"
                  onClick={() => selectedUser && handleReban(selectedUser)}
                  disabled={processing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Re-ban User'}
                </Button>
              ) : (
                <Button
                  className="bg-success hover:bg-success/90"
                  onClick={() => selectedUser && handleServerUnban(selectedUser)}
                  disabled={processing}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Whitelist'}
                </Button>
              )
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}