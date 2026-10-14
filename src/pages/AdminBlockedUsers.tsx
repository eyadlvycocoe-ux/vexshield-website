import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, Search, Shield, Users, Ban, RefreshCw, UserCheck, Eye, RotateCcw  } from "lucide-react";
import { toast } from "sonner";
import { FallingPapers } from "@/components/FallingPapers";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DiscordAvatar } from "@/components/DiscordAvatar";
import type { Tables } from "@/integrations/supabase/types";

type BlockedUser = Tables<'bans'>;

interface DiscordUserInfo {
  discord_id: string;
  username: string | null;
  avatar: string | null;
  guilds: Array<{ id: string; name: string; icon?: string }> | null;
}

export default function AdminBlockedUsers() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [discordUsers, setDiscordUsers] = useState<Map<string, DiscordUserInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchBlockedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('bans')
        .select('*')
        .eq('type', 'discord_blacklist')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlockedUsers(data || []);

      const discordIds = new Set<string>();
      (data || []).forEach(ban => {
        const metadata = ban.metadata as Record<string, unknown>;
        const discordId = metadata?.discord_id as string;
        if (discordId) discordIds.add(discordId);
      });

      if (discordIds.size > 0) {
        const { data: discordData } = await supabase
          .from('discord_users')
          .select('discord_id, username, avatar, guilds')
          .in('discord_id', Array.from(discordIds));

        const userMap = new Map<string, DiscordUserInfo>();
        (discordData || []).forEach(user => {
          userMap.set(user.discord_id, {
            discord_id: user.discord_id,
            username: user.username,
            avatar: user.avatar,
            guilds: Array.isArray(user.guilds) ? user.guilds as Array<{ id: string; name: string; icon?: string }> : null
          });
        });
        setDiscordUsers(userMap);
      }
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    fetchBlockedUsers();
  }, [staffOk, staffChecking]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBlockedUsers();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleGlobalUnban = async (user: BlockedUser) => {
    setProcessing(true);
    try {
      const metadata = user.metadata as Record<string, unknown>;
      const discordId = metadata?.discord_id as string;

      if (!discordId) {
        toast.error('Cannot unban: Missing Discord ID');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-discord-guilds', {
        body: { action: 'global_unban', discord_id: discordId }
      });

      if (error || !data?.success) {
        throw error || new Error(data?.error || 'Unban failed');
      }

      toast.success(`Globally unbanned user ${user.player_name || discordId}`);
      setShowDetailsModal(false);
      fetchBlockedUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    } finally {
      setProcessing(false);
    }
  };

  const handleGlobalReban = async (user: BlockedUser) => {
    setProcessing(true);
    try {
      const metadata = user.metadata as Record<string, unknown>;
      const discordId = metadata?.discord_id as string;
      const blacklistedGuild = metadata?.blacklisted_guild as string;

      if (!discordId) {
        toast.error('Cannot reban: Missing Discord ID');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-discord-guilds', {
        body: {
          action: 'global_reban',
          discord_id: discordId,
          reason: user.reason,
          blacklisted_guild: blacklistedGuild,
          player_name: user.player_name
        }
      });

      if (error || !data?.success) {
        throw error || new Error(data?.error || 'Reban failed');
      }

      toast.success(`Globally re-banned user ${user.player_name || discordId}`);
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
      user.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.server_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blacklistedGuild.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Group by discord_id to show unique users
  const uniqueUsers = new Map<string, { user: BlockedUser; servers: string[]; allBans: BlockedUser[]; discordInfo?: DiscordUserInfo }>();
  filteredUsers.forEach(ban => {
    const metadata = ban.metadata as Record<string, unknown>;
    const discordId = metadata?.discord_id as string || ban.player_id;
    
    if (uniqueUsers.has(discordId)) {
      const entry = uniqueUsers.get(discordId)!;
      entry.servers.push(ban.server_id);
      entry.allBans.push(ban);
      // Use the most recent ban as the representative
      if (ban.created_at && entry.user.created_at && ban.created_at > entry.user.created_at) {
        entry.user = ban;
      }
    } else {
      uniqueUsers.set(discordId, {
        user: ban,
        servers: [ban.server_id],
        allBans: [ban],
        discordInfo: discordUsers.get(discordId)
      });
    }
  });

  const activeCount = blockedUsers.filter(u => u.is_active).length;
  const inactiveCount = blockedUsers.filter(u => !u.is_active).length;
  const uniqueServers = new Set(blockedUsers.map(u => u.server_id)).size;

  // Check if a user (by discord_id) has any active bans
  const isUserActive = (discordId: string) => {
    const entry = uniqueUsers.get(discordId);
    return entry?.allBans.some(b => b.is_active) || false;
  };

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verifying access...
      </div>
    );
  }
  if (!staffOk) return null;

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(239,68,68,0.08),transparent_50%)] pointer-events-none" />
      <FallingPapers />
      
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                Blacklist Detections
              </h1>
              <p className="text-muted-foreground">
                Users banned for joining blacklisted Discord servers
              </p>
            </div>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-destructive/10 border-destructive/30">
            <div className="flex items-center gap-3">
              <Ban className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-3xl font-bold text-destructive">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active Bans</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-success/10 border-success/30">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-success" />
              <div>
                <p className="text-3xl font-bold text-success">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Unbanned</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-warning/10 border-warning/30">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-warning" />
              <div>
                <p className="text-3xl font-bold text-warning">{uniqueUsers.size}</p>
                <p className="text-sm text-muted-foreground">Unique Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-primary/10 border-primary/30">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="text-3xl font-bold text-primary">{uniqueServers}</p>
                <p className="text-sm text-muted-foreground">Affected Servers</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by player name, Discord ID, server, or blacklisted guild..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading blocked users...</p>
            </div>
          ) : uniqueUsers.size === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-muted-foreground">No blacklist detections found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Discord ID</TableHead>
                  <TableHead>Blacklisted Server</TableHead>
                  <TableHead>Banned In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(uniqueUsers.entries()).map(([discordId, { user, servers, discordInfo }]) => {
                  const metadata = user.metadata as Record<string, unknown>;
                  const userActive = isUserActive(discordId);
                  return (
                    <TableRow key={discordId} className={!userActive ? 'bg-success/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {discordInfo?.avatar ? (
                            <DiscordAvatar
                              discordId={discordInfo.discord_id}
                              avatarHash={discordInfo.avatar}
                              name={discordInfo.username || 'User'}
                              size="md"
                            />
                          ) : (
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {(user.player_name || 'U')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <p className="font-medium">{discordInfo?.username || user.player_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{user.player_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {discordId}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-destructive font-medium">
                          {metadata?.blacklisted_guild as string || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{servers.length} server{servers.length > 1 ? 's' : ''}</Badge>
                      </TableCell>
                      <TableCell>
                        {userActive ? (
                          <Badge variant="destructive">
                            <Ban className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-success/20 text-success border-success/30">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Unbanned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          {userActive ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-success hover:bg-success/90"
                              onClick={() => handleGlobalUnban(user)}
                              disabled={processing}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Unban All
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleGlobalReban(user)}
                              disabled={processing}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Re-ban All
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Blacklist Detection Details
            </DialogTitle>
            <DialogDescription>
              View full details and manage this blocked user
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (() => {
            const metadata = selectedUser.metadata as Record<string, unknown>;
            const discordId = metadata?.discord_id as string || '';
            const discordInfo = discordUsers.get(discordId);
            const userBans = blockedUsers.filter(b => {
              const m = b.metadata as Record<string, unknown>;
              return m?.discord_id === discordId;
            });
            const userServers = userBans.map(b => b.server_id);
            const userActive = userBans.some(b => b.is_active);

            return (
              <div className="space-y-6">
                <div className={`flex items-center gap-4 p-4 rounded-lg ${userActive ? 'bg-muted/30' : 'bg-success/10 border border-success/30'}`}>
                  {discordInfo?.avatar ? (
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
                    <p className="text-muted-foreground">Discord ID: {discordId}</p>
                    <p className="text-sm text-muted-foreground">Player ID: {selectedUser.player_id}</p>
                    {!userActive && (
                      <Badge className="mt-2 bg-success/20 text-success">Globally Unbanned</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                    <p className="text-sm text-muted-foreground mb-1">Blacklisted Server</p>
                    <p className="font-medium text-destructive">{metadata?.blacklisted_guild as string || 'Unknown'}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Reason</p>
                    <p className="font-medium">{selectedUser.reason}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Banned In Servers</p>
                    <p className="font-medium">{userServers.length} server(s)</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userServers.slice(0, 5).map(s => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                      {userServers.length > 5 && (
                        <Badge variant="outline" className="text-xs">+{userServers.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Detection Date</p>
                    <p className="font-medium">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>

                {/* User's Discord Guilds */}
                {discordInfo?.guilds && Array.isArray(discordInfo.guilds) && discordInfo.guilds.length > 0 && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">User's Discord Servers ({discordInfo.guilds.length})</p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {discordInfo.guilds.map((guild: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {guild.name || guild.id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
            {selectedUser && (() => {
              const metadata = selectedUser.metadata as Record<string, unknown>;
              const discordId = metadata?.discord_id as string || '';
              const userBans = blockedUsers.filter(b => {
                const m = b.metadata as Record<string, unknown>;
                return m?.discord_id === discordId;
              });
              const userActive = userBans.some(b => b.is_active);

              return userActive ? (
                <Button
                  variant="default"
                  className="bg-success hover:bg-success/90"
                  onClick={() => selectedUser && handleGlobalUnban(selectedUser)}
                  disabled={processing}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Global Unban (All Servers)'}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => selectedUser && handleGlobalReban(selectedUser)}
                  disabled={processing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Re-ban (All Servers)'}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

