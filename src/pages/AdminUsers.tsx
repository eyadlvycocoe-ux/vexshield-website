import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { DiscordAvatar } from "@/components/DiscordAvatar";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";
import { apiUrl, ensureMutationCsrf, apiMutationHeaders } from "@/lib/api-base";
import { clearSiteStaffCache } from "@/lib/site-staff-cache";
import { AssignStaffRoleModal, STAFF_ROLES } from "@/components/AssignStaffRoleModal";
import { getRoleByLevel } from "@/lib/roles";
import { ArrowLeft, RefreshCw, Search, Server, Shield, ShieldAlert, User, Users, LifeBuoy, Ban, UserCheck, Coins, Home } from "lucide-react";

interface GuildInfo {
  id: string;
  name?: string;
  icon?: string;
}

interface DiscordUser {
  discord_id: string;
  username: string | null;
  display_name: string | null;
  avatar: string | null;
  email: string | null;
  connected_at: string | null;
  bio: string | null;
  guilds: GuildInfo[] | null;
  funds: number | null;
  is_admin: number | null;
  admin_level?: number | null;
  /** Help desk staff flag (maps to is_support in DB). Named `desk` to avoid ad-blocker URL filters. */
  desk: number | null;
  staff_role?: string | null;
  staff_permissions?: string[] | null;
  plan_tier?: number | null;
  tokens_daily?: number | null;
  tokens_purchased?: number | null;
}

interface OwnedServer {
  server_id: string;
  display_name: string | null;
  status: string | null;
  expires_at: string | null;
  owner_email: string | null;
}

interface AdminServer {
  server_id: string;
  display_name: string | null;
  status: string | null;
  expires_at: string | null;
  owner_email: string | null;
  permissions: string[];
}

interface GlobalBan {
  id: string;
  discord_id: string | null;
  email: string | null;
  ip_address: string | null;
  username: string | null;
  reason: string;
  banned_by: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  metadata: any;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [users, setUsers] = useState<DiscordUser[]>([]);
  const [bans, setBans] = useState<Map<string, GlobalBan>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedUser, setSelectedUser] = useState<DiscordUser | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [ownedServers, setOwnedServers] = useState<OwnedServer[]>([]);
  const [adminServers, setAdminServers] = useState<AdminServer[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [blacklistedMap, setBlacklistedMap] = useState<Map<string, { name: string | null; reason: string | null }>>(new Map());

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [serversModalOpen, setServersModalOpen] = useState(false);
  const [fundsModalOpen, setFundsModalOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const openRoleModal = (user: DiscordUser) => {
    setSelectedUser(user);
    setRoleModalOpen(true);
  };

  const [profileUsername, setProfileUsername] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [fundsAmount, setFundsAmount] = useState("");
  const [updatingFunds, setUpdatingFunds] = useState(false);
  const [updatingSupport, setUpdatingSupport] = useState(false);

  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    loadUsers();
    loadBlacklistedServers();
    loadBans();
  }, [staffOk, staffChecking]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/discord-users"), {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "X-AirCore-Client": "1" },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Failed to load users");
      }
      const data = (await res.json()) as DiscordUser[];
      setUsers(
        (data || []).map((user) => ({
          ...user,
          guilds: Array.isArray(user.guilds) ? user.guilds : [],
        })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBlacklistedServers = async () => {
    const { data, error } = await supabase
      .from('blacklisted_discord_servers')
      .select('discord_server_id, server_name, reason');

    if (!error && data) {
      const map = new Map<string, { name: string | null; reason: string | null }>();
      data.forEach((entry) => {
        map.set(entry.discord_server_id, { name: entry.server_name, reason: entry.reason });
      });
      setBlacklistedMap(map);
    }
  };

  const loadBans = async () => {
    try {
      const res = await fetch(apiUrl("/api/admin/global-bans"), {
        credentials: "include",
        headers: { "X-AirCore-Client": "1" },
      });
      if (!res.ok) return;
      const data = await res.json();
      const banMap = new Map<string, GlobalBan>();
      data.forEach((ban: GlobalBan) => {
        if (ban.discord_id) {
          banMap.set(ban.discord_id, ban);
        }
      });
      setBans(banMap);
    } catch (e) {
      console.error("Failed to load bans:", e);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUsers(), loadBans()]);
    setRefreshing(false);
    toast.success('Users refreshed');
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter((user) => {
      const username = String(user.username || "").toLowerCase();
      const dname = String(user.display_name || "").toLowerCase();
      const email = String(user.email || "").toLowerCase();
      const discordId = String(user.discord_id || "").toLowerCase();
      
      return (
        username.includes(term) ||
        dname.includes(term) ||
        email.includes(term) ||
        discordId.includes(term)
      );
    });
  }, [users, searchTerm]);

  const loadUserServers = async (user: DiscordUser) => {
    setServersLoading(true);
    setOwnedServers([]);
    setAdminServers([]);
    setSelectedUserId(null);

    try {
      if (user.email) {
        const emailNorm = String(user.email).trim().toLowerCase();
        const res = await fetch(apiUrl("/api/admin/servers"), { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load servers");
        const allServers = (await res.json()) as OwnedServer[];
        const owned = allServers.filter(
          (s) => s.owner_email && String(s.owner_email).trim().toLowerCase() === emailNorm,
        );
        setOwnedServers(owned);

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        const userId = profile?.id || null;
        setSelectedUserId(userId);

        if (userId) {
          const { data: adminRows } = await supabase
            .from('server_admins')
            .select('server_id, permissions, servers(display_name, status, expires_at, owner_email)')
            .eq('user_id', userId);

          const formattedAdmins = (adminRows || []).map((row: any) => ({
            server_id: row.server_id,
            permissions: Array.isArray(row.permissions) ? row.permissions : [],
            display_name: row.servers?.display_name || null,
            status: row.servers?.status || null,
            expires_at: row.servers?.expires_at || null,
            owner_email: row.servers?.owner_email || null
          })) as AdminServer[];
          setAdminServers(formattedAdmins);
        }
      }
    } catch (error) {
      console.error('Error loading user servers:', error);
      toast.error('Failed to load user servers');
    } finally {
      setServersLoading(false);
    }
  };

  const openProfileModal = async (user: DiscordUser) => {
    setSelectedUser(user);
    setProfileUsername(user.username || '');
    setProfileDisplayName(user.display_name || '');
    setProfileBio(user.bio || '');
    await loadUserServers(user);
    setProfileModalOpen(true);
  };

  const openServersModal = async (user: DiscordUser) => {
    setSelectedUser(user);
    await loadUserServers(user);
    setServersModalOpen(true);
  };

  const openFundsModal = (user: DiscordUser) => {
    setSelectedUser(user);
    setFundsAmount('');
    setFundsModalOpen(true);
  };

  const openBanModal = (user: DiscordUser) => {
    setSelectedUser(user);
    setBanReason("");
    setBanModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;
    setSavingProfile(true);

    try {
      await ensureMutationCsrf();
      const profileRes = await fetch(apiUrl(`/api/admin/users/${selectedUser.discord_id}/profile`), {
        method: 'PATCH',
        credentials: 'include',
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          username: profileUsername,
          display_name: profileDisplayName || null,
          bio: profileBio,
        }),
      });
      if (!profileRes.ok) {
        const j = await profileRes.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Profile update failed');
      }

      if (selectedUser.email) {
        await supabase
          .from('profiles')
          .update({ display_name: profileDisplayName || profileUsername })
          .eq('email', selectedUser.email);
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.discord_id === selectedUser.discord_id
            ? {
                ...user,
                username: profileUsername,
                display_name: profileDisplayName || null,
                bio: profileBio,
              }
            : user
        )
      );
      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              username: profileUsername,
              display_name: profileDisplayName || null,
              bio: profileBio,
            }
          : null
      );
      toast.success('Profile updated');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveAdminAccess = async (serverId: string) => {
    if (!selectedUser) return;
    if (!confirm('Remove admin access for this server?')) return;

    try {
      await ensureMutationCsrf();
      const res = await fetch(
        apiUrl(`/api/admin/users/${selectedUser.discord_id}/server-admins/${encodeURIComponent(serverId)}`),
        {
          method: 'DELETE',
          credentials: 'include',
          headers: apiMutationHeaders(),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Failed to remove admin access');
      }
      setAdminServers((prev) => prev.filter((server) => server.server_id !== serverId));
      toast.success('Admin access removed');
    } catch (error) {
      console.error('Error removing server admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove admin access');
    }
  };

  const handleDeleteOwnedServer = async (serverId: string) => {
    if (!confirm('Delete this server? This cannot be undone.')) return;
    const { error } = await supabase
      .from('servers')
      .delete()
      .eq('server_id', serverId);

    if (error) {
      toast.error('Failed to delete server');
      return;
    }

    setOwnedServers((prev) => prev.filter((server) => server.server_id !== serverId));
    toast.success('Server deleted');
  };

  const updateFunds = async (type: 'add' | 'remove' | 'set') => {
    if (!selectedUser) return;
    const amount = Number(fundsAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid amount');
      return;
    }

    const currentFunds = selectedUser.funds || 0;
    let nextFunds = currentFunds;
    if (type === 'add') nextFunds = currentFunds + amount;
    if (type === 'remove') nextFunds = currentFunds - amount;
    if (type === 'set') nextFunds = amount;

    nextFunds = Math.max(0, nextFunds);
    setUpdatingFunds(true);

    await ensureMutationCsrf();
    const fundsRes = await fetch(apiUrl(`/api/admin/users/${selectedUser.discord_id}/funds`), {
      method: 'PATCH',
      credentials: 'include',
      headers: apiMutationHeaders(),
      body: JSON.stringify({ funds: nextFunds }),
    });
    if (!fundsRes.ok) {
      const j = await fundsRes.json().catch(() => ({}));
      toast.error((j as { error?: string }).error || 'Failed to update funds');
      setUpdatingFunds(false);
      return;
    }

    setUsers((prev) =>
      prev.map((user) =>
        user.discord_id === selectedUser.discord_id
          ? { ...user, funds: nextFunds }
          : user
      )
    );
    setSelectedUser((prev) => (prev ? { ...prev, funds: nextFunds } : prev));
    setFundsAmount('');
    toast.success('Funds updated');
    setUpdatingFunds(false);
  };

  const toggleSupportStatus = async (user: DiscordUser) => {
    setUpdatingSupport(true);
    const newStatus = user.desk ? 0 : 1;

    try {
      await ensureMutationCsrf();
      const supportRes = await fetch(apiUrl(`/api/admin/users/${user.discord_id}/desk-role`), {
        method: 'PATCH',
        credentials: 'include',
        headers: apiMutationHeaders(),
        body: JSON.stringify({ desk: newStatus }),
      });
      if (!supportRes.ok) {
        const j = await supportRes.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Failed to update support status');
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.discord_id === user.discord_id ? { ...u, desk: newStatus } : u
        )
      );
      if (selectedUser?.discord_id === user.discord_id) {
        setSelectedUser({ ...selectedUser, desk: newStatus });
      }
      clearSiteStaffCache();
      toast.success(
        newStatus
          ? "Help Desk assigned - the user should refresh the page to see the Support panel."
          : "Help Desk access removed.",
      );
    } catch (error) {
      console.error('Help Desk update failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update support status');
    } finally {
      setUpdatingSupport(false);
    }
  };

  const createBan = async () => {
    if (!selectedUser || !banReason) {
      toast.error("Reason is required");
      return;
    }
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl("/api/admin/global-bans"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          discord_id: selectedUser.discord_id,
          email: selectedUser.email,
          username: selectedUser.display_name || selectedUser.username,
          reason: banReason
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create ban");
      }
      toast.success("User banned successfully");
      setBanModalOpen(false);
      loadBans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to ban user");
    }
  };

  const deleteBan = async (user: DiscordUser) => {
    const ban = bans.get(user.discord_id);
    if (!ban) return;
    if (!confirm("Are you sure you want to unban this user?")) return;
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/api/admin/global-bans/${ban.id}`), {
        method: "DELETE",
        credentials: "include",
        headers: apiMutationHeaders()
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete ban");
      }
      toast.success("User unbanned successfully");
      loadBans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unban user");
    }
  };

  const formatExpires = (date: string | null) => {
    if (!date) return 'Permanent';
    return new Date(date).toLocaleDateString();
  };

  const renderGuilds = () => {
    if (!selectedUser) return null;
    const guilds = Array.isArray(selectedUser.guilds) ? selectedUser.guilds : [];
    const blacklisted = guilds.filter((guild) => blacklistedMap.has(guild.id));
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Guilds</h4>
          <Badge variant="secondary">{guilds.length} total</Badge>
        </div>
        {guilds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No guilds found</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/20">
            {guilds.map((guild) => {
              const isBlacklisted = blacklistedMap.has(guild.id);
              const blacklistInfo = blacklistedMap.get(guild.id);
              return (
                <div key={guild.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{guild.name || 'Unknown Guild'}</p>
                    <p className="text-xs text-muted-foreground">{guild.id}</p>
                  </div>
                  {isBlacklisted && (
                    <Badge variant="destructive" className="text-xs">
                      Blacklisted {blacklistInfo?.name ? `  ${blacklistInfo.name}` : ''}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {blacklisted.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            User is in {blacklisted.length} blacklisted guild{blacklisted.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  const formatFunds = (amount: number | null | undefined) => `${"\u20AC"}${(amount ?? 0).toFixed(2)}`;

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verifying access?
      </div>
    );
  }
  if (!staffOk) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground px-6">
        <p>Admin access required.</p>
        <Button type="button" variant="outline" onClick={() => navigate('/')}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                User Management
              </h1>
              <p className="text-muted-foreground">Manage Discord users, servers, and funds</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2 text-sky-400" />
              Home
            </Button>
            <Button onClick={refresh} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/global-bans")}>
              <Ban className="h-4 w-4 mr-2" />
              Global Bans
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username, display name, email, or Discord ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table className="table-fixed" containerClassName="overflow-x-hidden">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32%]">User</TableHead>
                  <TableHead className="w-[18%]">Discord ID</TableHead>
                  <TableHead className="w-[22%]">Email</TableHead>
                  <TableHead className="w-[10%]">Funds</TableHead>
                  <TableHead className="w-[18%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.discord_id}>
                    <TableCell className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <DiscordAvatar
                          discordId={user.discord_id}
                          avatarHash={user.avatar}
                          skipProfileFetch
                          name={user.display_name || user.username || "User"}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="font-medium truncate">{user.display_name || user.username || 'Unknown'}</p>
                            {typeof user.admin_level === 'number' && user.admin_level > 0 ? (
                              <Badge className={`${getRoleByLevel(user.admin_level).badgeColor} text-[10px] h-4 px-1.5 shrink-0 font-bold`}>
                                Lvl {user.admin_level} · {getRoleByLevel(user.admin_level).label}
                              </Badge>
                            ) : user.staff_role ? (
                              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] h-4 px-1.5 shrink-0 font-bold">
                                {STAFF_ROLES.find((r) => r.id === user.staff_role)?.label || user.staff_role}
                              </Badge>
                            ) : null}
                            {bans.has(user.discord_id) && (
                              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] h-4 px-1.5 shrink-0">
                                Banned
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.username ? `@${user.username}` : 'No handle'}
                            {user.connected_at
                              ? ` - ${new Date(user.connected_at).toLocaleDateString()}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <code
                        className="text-[11px] bg-muted px-1.5 py-0.5 rounded block truncate"
                        title={user.discord_id}
                      >
                        {user.discord_id}
                      </code>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span className="text-sm truncate block" title={user.email || undefined}>
                        {user.email || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {formatFunds(user.funds)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openRoleModal(user)}
                          className="h-8 px-2.5 text-xs font-bold shrink-0 gap-1.5 border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          <span>
                            {user.staff_role
                              ? (STAFF_ROLES.find((r) => r.id === user.staff_role)?.label || user.staff_role)
                              : "+ Assign Role"}
                          </span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs font-medium shrink-0 gap-1.5 border-white/10 hover:bg-white/10 text-slate-200"
                          onClick={() => openProfileModal(user)}
                        >
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>Profile</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs font-medium shrink-0 gap-1.5 border-white/10 hover:bg-white/10 text-slate-200"
                          onClick={() => openServersModal(user)}
                        >
                          <Server className="h-3.5 w-3.5 text-slate-400" />
                          <span>Servers</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs font-medium shrink-0 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => openFundsModal(user)}
                        >
                          <Coins className="h-3.5 w-3.5" />
                          <span>Funds</span>
                        </Button>

                        {bans.has(user.discord_id) ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 px-2.5 text-xs font-bold shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => deleteBan(user)}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Unban</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-2.5 text-xs font-bold shrink-0 gap-1.5"
                            onClick={() => openBanModal(user)}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>Ban</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Profile Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View and edit user details</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <DiscordAvatar
                  discordId={selectedUser.discord_id}
                  avatarHash={selectedUser.avatar}
                  skipProfileFetch
                  name={selectedUser.display_name || selectedUser.username || "User"}
                  size="xl"
                />
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedUser.display_name || selectedUser.username || 'Unknown'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    @{selectedUser.username || 'unknown'}   Discord ID: {selectedUser.discord_id}
                  </p>
                  <p className="text-sm text-muted-foreground">Email: {selectedUser.email || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discord username (handle)</label>
                  <Input
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    placeholder="e.g. airshield_user"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display name</label>
                  <Input
                    value={profileDisplayName}
                    onChange={(e) => setProfileDisplayName(e.target.value)}
                    placeholder="Shown name in Discord"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Bio</label>
                  <Textarea
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {renderGuilds()}

              <div className="space-y-3">
                <h4 className="font-semibold">Servers</h4>
                {serversLoading ? (
                  <p className="text-sm text-muted-foreground">Loading servers...</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Owned Servers ({ownedServers.length})</p>
                      {ownedServers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No owned servers</p>
                      ) : (
                        <div className="space-y-2">
                          {ownedServers.map((server) => (
                            <div key={server.server_id} className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                              <div>
                                <p className="font-medium">{server.display_name || server.server_id}</p>
                                <p className="text-xs text-muted-foreground">Expires: {formatExpires(server.expires_at)}</p>
                              </div>
                              <Badge variant="secondary">Owner</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Admin Servers ({adminServers.length})</p>
                      {adminServers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No admin servers</p>
                      ) : (
                        <div className="space-y-2">
                          {adminServers.map((server) => (
                            <div key={server.server_id} className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                              <div>
                                <p className="font-medium">{server.display_name || server.server_id}</p>
                                <p className="text-xs text-muted-foreground">Expires: {formatExpires(server.expires_at)}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {server.permissions.length > 0 ? (
                                    server.permissions.map((perm) => (
                                      <Badge key={perm} variant="outline" className="text-xs capitalize">
                                        {perm}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="outline" className="text-xs">No permissions</Badge>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline">Admin</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProfileModalOpen(false)}>Close</Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Servers Modal */}
      <Dialog open={serversModalOpen} onOpenChange={setServersModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>User Servers</DialogTitle>
            <DialogDescription>Manage owned servers and admin access</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {serversLoading ? (
                <p className="text-sm text-muted-foreground">Loading servers...</p>
              ) : (
                <>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Owned Servers ({ownedServers.length})</h4>
                    {ownedServers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No owned servers</p>
                    ) : (
                      ownedServers.map((server) => (
                        <div key={server.server_id} className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                          <div>
                            <p className="font-medium">{server.display_name || server.server_id}</p>
                            <p className="text-xs text-muted-foreground">Expires: {formatExpires(server.expires_at)}</p>
                          </div>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteOwnedServer(server.server_id)}>
                            Delete
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Admin Servers ({adminServers.length})</h4>
                    {adminServers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No admin servers</p>
                    ) : (
                      adminServers.map((server) => (
                        <div key={server.server_id} className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                          <div>
                            <p className="font-medium">{server.display_name || server.server_id}</p>
                            <p className="text-xs text-muted-foreground">Expires: {formatExpires(server.expires_at)}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {server.permissions.length > 0 ? (
                                server.permissions.map((perm) => (
                                  <Badge key={perm} variant="outline" className="text-xs capitalize">
                                    {perm}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-xs">No permissions</Badge>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleRemoveAdminAccess(server.server_id)}>
                            Remove Access
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setServersModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Funds Modal */}
      <Dialog open={fundsModalOpen} onOpenChange={setFundsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Funds</DialogTitle>
            <DialogDescription>Adjust the user's wallet balance</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                <span className="text-sm text-muted-foreground">Current Funds</span>
                <Badge variant="secondary">{formatFunds(selectedUser.funds)}</Badge>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  min="0"
                  value={fundsAmount}
                  onChange={(e) => setFundsAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" disabled={updatingFunds} onClick={() => updateFunds('add')}>
                  Add
                </Button>
                <Button variant="outline" disabled={updatingFunds} onClick={() => updateFunds('remove')}>
                  Remove
                </Button>
                <Button disabled={updatingFunds} onClick={() => updateFunds('set')}>
                  Set
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Modal */}
      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Create a global ban for this user. Bans will block by Discord ID and Email.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <DiscordAvatar
                  discordId={selectedUser.discord_id}
                  avatarHash={selectedUser.avatar}
                  skipProfileFetch
                  name={selectedUser.display_name || selectedUser.username || "User"}
                  size="md"
                />
                <div>
                  <p className="font-medium">{selectedUser.display_name || selectedUser.username}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email || 'No email'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Why this user is being banned"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBanModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={createBan}>Ban User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Role & Permissions Assignment Modal */}
      <AssignStaffRoleModal
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        user={selectedUser}
        onSaved={loadUsers}
      />
    </div>
  );
}

