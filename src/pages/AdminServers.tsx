import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Server, Trash2, Plus, ArrowLeft, Eye, EyeOff, Pencil, RefreshCw, Key, Clock, Mail, Globe, ExternalLink, Users, CalendarPlus, RotateCcw, Home, Copy, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";
import { apiMutationHeaders, apiUrl, ensureCsrfCookie, getApiBaseUrl, isCsrfErrorMessage } from "@/lib/api-base";
import { setConnectedServer } from "@/lib/connected-server";

interface ServerConfig {
  id: string;
  server_id: string;
  server_ip?: string;
  license_key: string;
  display_name?: string;
  owner_email?: string;
  status: string;
  created_at: string;
  last_update?: string;
  expires_at?: string;
  player_count?: number;
  ent_airshield?: number | boolean;
  ent_airscanner?: number | boolean;
  ent_airpc?: number | boolean;
  soft_deleted_at?: string | null;
  purge_after?: string | null;
  deletion_reason?: string | null;
}

export default function AdminServers() {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditServerModal, setShowEditServerModal] = useState(false);
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [addTimeServer, setAddTimeServer] = useState<ServerConfig | null>(null);
  const [addTimeOption, setAddTimeOption] = useState<'1week' | '1month' | '3month' | 'custom'>('1month');
  const [customAddTime, setCustomAddTime] = useState('');
  const [visibleLicenseKeys, setVisibleLicenseKeys] = useState<Set<string>>(new Set());
  const [newServer, setNewServer] = useState({
    server_ip: '',
    license_key: '',
    display_name: '',
    owner_email: '',
    expiration: '1month' as '1week' | '1month' | '3month' | '6month' | '1year' | 'permanent' | 'custom',
    customDate: '',
    ent_airshield: true,
  });
  const [createdKeyData, setCreatedKeyData] = useState<{
    license_key: string;
    server_id: string;
    expires_at: string | null;
    display_name?: string;
    owner_email?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    loadServers();
  }, [staffOk, staffChecking]);

  const loadServers = async () => {
    try {
      const res = await fetch(apiUrl("/api/admin/servers"), {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "X-AirCore-Client": "1" },
      });
      const raw = await res.text();
      let serversData: ServerConfig[] = [];
      if (res.ok) {
        serversData = raw ? JSON.parse(raw) : [];
      } else {
        console.warn("Admin servers API failed:", res.status, raw.slice(0, 200));
        toast.error("Failed to load servers from the server");
      }

      setServers(
        serversData.map((s) => ({
          ...s,
          player_count: s.player_count ?? 0,
        })),
      );
    } catch (e) {
      console.error("loadServers:", e);
      toast.error("Failed to load servers");
      setServers([]);
    }
  };

  const generateServerId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `VexShield-${segment}`;
  };

  const generateLicenseKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment1 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const segment2 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `VEXSHIELD-${segment1}-${segment2}`;
  };

  const calculateExpirationDate = (expiration: string, customDate?: string) => {
    if (expiration === 'permanent') return null;
    if (expiration === 'custom' && customDate) {
      return new Date(customDate).toISOString();
    }
    const now = new Date();
    if (expiration === '1week') {
      now.setDate(now.getDate() + 7);
    } else if (expiration === '1month') {
      now.setMonth(now.getMonth() + 1);
    } else if (expiration === '3month') {
      now.setMonth(now.getMonth() + 3);
    } else if (expiration === '6month') {
      now.setMonth(now.getMonth() + 6);
    } else if (expiration === '1year') {
      now.setFullYear(now.getFullYear() + 1);
    }
    return now.toISOString();
  };

  const handleAddServer = async () => {
    if (newServer.expiration === 'custom' && !newServer.customDate) {
      toast.error("Please select a custom expiration date");
      return;
    }

    const licenseKey = generateLicenseKey();
    const expiresAt = calculateExpirationDate(newServer.expiration, newServer.customDate);
    const serverId = generateServerId();

    const serverIp = newServer.server_ip.trim() || null;
    const ownerEmail = newServer.owner_email.trim() || null;

    const newServerData = {
      id: `offline-${Date.now()}`,
      server_id: serverId,
      server_ip: serverIp,
      license_key: licenseKey,
      display_name: newServer.display_name.trim() || null,
      owner_email: ownerEmail,
      status: 'offline',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      ent_airshield: 1,
    };

    try {
      await ensureCsrfCookie();
      let res = await fetch(apiUrl("/api/admin/servers"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          server_id: newServerData.server_id,
          server_ip: newServerData.server_ip,
          license_key: newServerData.license_key,
          display_name: newServerData.display_name,
          owner_email: newServerData.owner_email,
          status: newServerData.status,
          expires_at: newServerData.expires_at,
          ent_airshield: 1,
        }),
      });
      let raw = await res.text();
      let payload: { error?: string } | null = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        /* ignore */
      }
      if (!res.ok && res.status === 403 && isCsrfErrorMessage(payload?.error || "")) {
        await ensureCsrfCookie(true);
        res = await fetch(apiUrl("/api/admin/servers"), {
          method: "POST",
          credentials: "include",
          headers: apiMutationHeaders(),
          body: JSON.stringify({
            server_id: newServerData.server_id,
            server_ip: newServerData.server_ip,
            license_key: newServerData.license_key,
            display_name: newServerData.display_name,
            owner_email: newServerData.owner_email,
            status: newServerData.status,
            expires_at: newServerData.expires_at,
            ent_airshield: 1,
          }),
        });
        raw = await res.text();
        try {
          payload = raw ? JSON.parse(raw) : null;
        } catch {
          payload = null;
        }
      }
      if (!res.ok) {
        const msg = payload?.error || `Failed to create license key (${res.status})`;
        if (isCsrfErrorMessage(msg)) {
          toast.error("Session security token expired — refresh the page or sign in again.");
        } else {
          toast.error(msg);
        }
        return;
      }
      toast.success("License Key Generated Successfully!");
      setCreatedKeyData({
        license_key: licenseKey,
        server_id: serverId,
        expires_at: expiresAt,
        display_name: newServer.display_name,
        owner_email: ownerEmail,
      });
    } catch (e) {
      console.error("Create key failed:", e);
      toast.error("Failed to generate license key");
      return;
    }

    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/servers-backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: newServerData.server_id,
          server_ip: newServerData.server_ip,
          license_key: newServerData.license_key,
          expires_at: newServerData.expires_at
        }),
      });
    } catch (e) {
      console.warn('Backup upsert failed', e);
    }

    setShowAddModal(false);
    setNewServer({
      server_ip: '',
      license_key: '',
      display_name: '',
      owner_email: '',
      expiration: '1month',
      customDate: '',
      ent_airshield: true,
    });
    loadServers();
  };

  // Auto-sync offline servers loop
  useEffect(() => {
    const syncOffline = async () => {
      const offlineServersStr = localStorage.getItem('offline_servers');
      if (!offlineServersStr) return;
      const offlineServers = JSON.parse(offlineServersStr) as ServerConfig[];
      if (offlineServers.length === 0) return;

      const stillOffline = [];
      
      for (const server of offlineServers) {
        try {
          await ensureCsrfCookie();
          const res = await fetch(apiUrl("/api/admin/servers"), {
            method: "POST",
            credentials: "include",
            headers: apiMutationHeaders(),
            body: JSON.stringify({
              server_id: server.server_id,
              server_ip: server.server_ip,
              license_key: server.license_key,
              display_name: server.display_name,
              owner_email: server.owner_email,
              status: server.status,
              expires_at: server.expires_at,
              ent_airshield: server.ent_airshield !== undefined ? (server.ent_airshield ? 1 : 0) : 1,
              ent_airscanner: server.ent_airscanner ? 1 : 0,
              ent_airpc: server.ent_airpc ? 1 : 0,
            }),
          });
          if (!res.ok) {
            stillOffline.push(server);
          } else {
            toast.success(`Successfully synced offline server ${server.server_ip}!`);
          }
        } catch {
          stillOffline.push(server);
        }
      }

      localStorage.setItem('offline_servers', JSON.stringify(stillOffline));
      if (stillOffline.length < offlineServers.length) loadServers(); // Reload if some synced
    };

    const interval = setInterval(syncOffline, 10000); // Try every 10 secs
    syncOffline(); // Also try immediately on mount
    return () => clearInterval(interval);
  }, []);

  const handleDeleteServer = async (server: ServerConfig) => {
    if (
      !confirm(
        `Remove server "${server.display_name || server.server_ip}"? It will be disabled for 7 days (restorable), then permanently deleted if not restored.`,
      )
    )
      return;

    const { error } = await supabase.from('servers').delete().eq('id', server.id);
    if (error) {
      toast.error("Failed to delete server");
      return;
    }

    toast.success("Server marked for removal (7-day restore window)");
    loadServers();
  };

  const handleRestoreServer = async (server: ServerConfig) => {
    const restoreUrl = apiUrl(
      `/api/admin/servers/${encodeURIComponent(server.server_id)}/restore`,
    );
    const postRestore = () =>
      fetch(restoreUrl, {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
      });

    try {
      await ensureCsrfCookie();
      let res = await postRestore();
      let j = (await res.json().catch(() => ({}))) as { error?: string; license_key?: string };
      if (!res.ok && res.status === 403 && isCsrfErrorMessage(j.error || "")) {
        await ensureCsrfCookie(true);
        res = await postRestore();
        j = (await res.json().catch(() => ({}))) as { error?: string; license_key?: string };
      }
      if (!res.ok) {
        const msg = j.error || "Failed";
        if (isCsrfErrorMessage(msg)) {
          toast.error("Session security token expired — refresh the page or sign in again.");
        } else {
          throw new Error(msg);
        }
        return;
      }
      if (j.license_key) {
        toast.success(`Server restored. New license key: ${j.license_key}`, { duration: 12000 });
      } else {
        toast.success("Server restored");
      }
      loadServers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    }
  };

  const handleEditServer = (server: ServerConfig) => {
    setEditingServer(server);
    setShowEditServerModal(true);
  };

  const handleOpenAddTime = (server: ServerConfig) => {
    setAddTimeServer(server);
    setAddTimeOption('1month');
    setCustomAddTime('');
    setShowAddTimeModal(true);
  };

  const patchAdminServer = async (
    serverId: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }> => {
    const url = apiUrl(`/api/admin/servers/${encodeURIComponent(serverId)}`);
    const doFetch = () =>
      fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify(body),
      });

    try {
      await ensureCsrfCookie();
      let res = await doFetch();
      let payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok && res.status === 403 && isCsrfErrorMessage(payload.error || "")) {
        await ensureCsrfCookie(true);
        res = await doFetch();
        payload = (await res.json().catch(() => ({}))) as { error?: string };
      }
      if (!res.ok) {
        return { ok: false, error: payload.error || `Request failed (${res.status})` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  };

  const handleAddTime = async () => {
    if (!addTimeServer) return;

    let newExpiresAt: Date;
    const currentExpiry = addTimeServer.expires_at ? new Date(addTimeServer.expires_at) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();

    switch (addTimeOption) {
      case '1week':
        newExpiresAt = new Date(baseDate);
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);
        break;
      case '1month':
        newExpiresAt = new Date(baseDate);
        newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
        break;
      case '3month':
        newExpiresAt = new Date(baseDate);
        newExpiresAt.setMonth(newExpiresAt.getMonth() + 3);
        break;
      case 'custom':
        if (!customAddTime) {
          toast.error("Please select a date");
          return;
        }
        newExpiresAt = new Date(customAddTime);
        break;
      default:
        return;
    }

    const result = await patchAdminServer(addTimeServer.server_id, {
      expires_at: newExpiresAt.toISOString(),
    });

    if (!result.ok) {
      toast.error(result.error || "Failed to extend time");
      return;
    }

    toast.success(`License extended until ${newExpiresAt.toLocaleDateString()}`);
    setShowAddTimeModal(false);
    setAddTimeServer(null);
    loadServers();
  };

  const handleConnectToServer = (server: ServerConfig) => {
    setConnectedServer({
      server_id: server.server_id,
      license_key: server.license_key,
      display_name: server.display_name,
      status: server.status,
      owner_email: server.owner_email,
      ent_airshield: server.ent_airshield !== undefined ? server.ent_airshield : 1,
      ent_airscanner: server.ent_airscanner ?? 0,
      ent_airpc: server.ent_airpc ?? 0,
      is_admin_panel: true,
    });
    navigate(`/${server.server_id}/dashboard`);
  };

  const handleUpdateServer = async () => {
    if (!editingServer) return;

    if (!Number(editingServer.ent_airshield ?? 1)) {
      toast.error("VexShield entitlement must be enabled for this license.");
      return;
    }

    const result = await patchAdminServer(editingServer.server_id, {
      display_name: editingServer.display_name,
      owner_email: editingServer.owner_email,
      server_ip: editingServer.server_ip,
      ent_airshield: Number(editingServer.ent_airshield ?? 1) ? 1 : 0,
    });

    if (!result.ok) {
      toast.error(result.error || "Failed to update server");
      return;
    }

    toast.success("Server updated");
    setShowEditServerModal(false);
    setEditingServer(null);
    loadServers();
  };

  const toggleLicenseVisibility = (serverId: string) => {
    setVisibleLicenseKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serverId)) {
        newSet.delete(serverId);
      } else {
        newSet.add(serverId);
      }
      return newSet;
    });
  };

  const copyLicenseKey = (licenseKey: string) => {
    navigator.clipboard.writeText(licenseKey);
    toast.success("License key copied to clipboard");
  };

  const getStatusColor = (status: string) => {
    return status === 'online' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40';
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Permanent';
    return new Date(dateStr).toLocaleDateString();
  };

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verifying access?
      </div>
    );
  }
  if (!staffOk) return null;

  return (
    <div className="min-h-screen p-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.12),transparent_50%)] pointer-events-none" />
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Server className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Server Management</h1>
              <p className="text-sm text-muted-foreground">Manage all registered servers</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2 text-sky-400" />
              Home
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </div>
        </div>

        {/* Create License Key Button */}
        <Card className="mb-6 border-blue-500/20 bg-[#0c1324]/80 backdrop-blur shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <Key className="h-5 w-5 text-blue-400" />
              Create License Key
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs">
              Generate a new VexShield license key with expiration duration for clients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-lg shadow-blue-600/20 rounded-xl">
              <Key className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </CardContent>
        </Card>

        {/* Servers List Section */}
        <Card className="mb-6 border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  All Servers ({servers.length})
                </CardTitle>
                <CardDescription>View, edit, and manage all registered servers</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadServers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {servers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No servers registered yet</p>
            ) : (
              <div className="space-y-4">
                {servers.map((server) => (
                  <Card key={server.id} className="bg-background/50 border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          {/* Server name and status */}
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-lg">{server.display_name || server.server_ip || 'Unnamed Server'}</h4>
                            <Badge variant="outline" className={getStatusColor(server.status)}>
                              {server.status}
                            </Badge>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {server.player_count || 0} players
                            </Badge>
                            {Number(server.ent_airshield ?? 1) ? (
                              <Badge variant="outline" className="text-xs border-sky-500/40 text-sky-300">VexShield</Badge>
                            ) : null}
                            {server.soft_deleted_at ? (
                              <Badge variant="destructive" className="text-xs">
                                Pending removal
                                {server.purge_after
                                  ? ` ? permanent ${new Date(server.purge_after).toLocaleString()}`
                                  : ""}
                              </Badge>
                            ) : null}
                          </div>

                          {/* Server ID badge */}
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs">
                              ID: {server.server_id}
                            </Badge>
                          </div>

                          {/* Server details grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">IP:</span>
                              <span className="font-mono">{server.server_ip || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Owner:</span>
                              <span className="truncate max-w-[150px]">{server.owner_email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Expires:</span>
                              <span>{formatDate(server.expires_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Created:</span>
                              <span>{new Date(server.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* License Key */}
                          <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                            <Key className="h-4 w-4 text-primary" />
                            <span className="text-sm text-muted-foreground">License:</span>
                            <code className="font-mono text-sm flex-1">
                              {visibleLicenseKeys.has(server.id) 
                                ? server.license_key 
                                : '????????????????????'}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggleLicenseVisibility(server.id)}
                            >
                              {visibleLicenseKeys.has(server.id) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            {visibleLicenseKeys.has(server.id) && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyLicenseKey(server.license_key)}
                              >
                                Copy
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 ml-4 justify-end">
                          <Button variant="default" size="sm" onClick={() => handleConnectToServer(server)}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Connect
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenAddTime(server)} title="Add Time">
                            <CalendarPlus className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditServer(server)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {server.soft_deleted_at ? (
                            <Button variant="secondary" size="sm" onClick={() => handleRestoreServer(server)}>
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          ) : null}
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteServer(server)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Key Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-md bg-[#0c1324] border-white/10 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Key className="h-5 w-5 text-blue-400" />
                Create License Key
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                Select key expiration duration. Server IP and Owner details are optional.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-semibold text-zinc-300">Expiration / Key Duration *</Label>
                <Select
                  value={newServer.expiration}
                  onValueChange={(value: '1week' | '1month' | '3month' | '6month' | '1year' | 'permanent' | 'custom') => 
                    setNewServer({ ...newServer, expiration: value })
                  }
                >
                  <SelectTrigger className="bg-[#070b16] border-white/10 text-white rounded-xl h-10 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c1324] border-white/10 text-white">
                    <SelectItem value="1week">1 Week (7 Days)</SelectItem>
                    <SelectItem value="1month">1 Month (30 Days)</SelectItem>
                    <SelectItem value="3month">3 Months</SelectItem>
                    <SelectItem value="6month">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year (365 Days)</SelectItem>
                    <SelectItem value="permanent">Lifetime / Permanent</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newServer.expiration === 'custom' && (
                <div>
                  <Label className="text-xs font-semibold text-zinc-300">Custom Expiration Date *</Label>
                  <Input
                    type="date"
                    className="bg-[#070b16] border-white/10 text-white rounded-xl h-10 mt-1"
                    value={newServer.customDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewServer({ ...newServer, customDate: e.target.value })}
                  />
                </div>
              )}

              <Button onClick={handleAddServer} className="w-full h-11 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-white shadow-lg shadow-blue-600/20">
                <Key className="h-4 w-4 mr-2" />
                Generate Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Key Created Success Modal */}
        <Dialog open={!!createdKeyData} onOpenChange={(open) => { if (!open) setCreatedKeyData(null); }}>
          <DialogContent className="sm:max-w-md bg-[#0c1324] border-blue-500/30 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-blue-400 font-bold">
                <Key className="h-6 w-6 text-blue-400" />
                License Key Created!
              </DialogTitle>
              <DialogDescription className="text-zinc-300 text-xs">
                Your new VexShield License Key is generated and ready to share with your client.
              </DialogDescription>
            </DialogHeader>

            {createdKeyData && (
              <div className="space-y-4 pt-2">
                {/* Key Display Box */}
                <div className="rounded-xl border border-blue-500/40 bg-blue-950/40 p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">License Key</span>
                  <div className="flex items-center justify-between gap-2 bg-[#070b16] border border-blue-500/20 rounded-lg p-2.5">
                    <code className="text-base font-mono font-bold text-white tracking-wide truncate">
                      {createdKeyData.license_key}
                    </code>
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(createdKeyData.license_key);
                        setCopiedKey(true);
                        toast.success("Key copied to clipboard!");
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white shrink-0 font-bold text-xs"
                    >
                      {copiedKey ? <Check className="h-4 w-4 mr-1 text-emerald-300" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copiedKey ? "Copied" : "Copy Key"}
                    </Button>
                  </div>
                </div>

                {/* Key Details */}
                <div className="rounded-xl border border-white/10 bg-[#070b16] p-3 text-xs space-y-2 text-zinc-300">
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-400">Expiration:</span>
                    <span className="font-semibold text-emerald-400">
                      {createdKeyData.expires_at ? new Date(createdKeyData.expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Lifetime / Permanent'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setCreatedKeyData(null)}
                  className="w-full bg-white hover:bg-zinc-100 text-black font-bold rounded-xl"
                >
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Server Modal */}
        <Dialog open={showEditServerModal} onOpenChange={setShowEditServerModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Server</DialogTitle>
              <DialogDescription>
                Update server details
              </DialogDescription>
            </DialogHeader>
            {editingServer && (
              <div className="space-y-4">
                <div>
                  <Label>Server IP</Label>
                  <Input
                    value={editingServer.server_ip || ''}
                    onChange={(e) => setEditingServer({ ...editingServer, server_ip: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={editingServer.display_name || ''}
                    onChange={(e) => setEditingServer({ ...editingServer, display_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Owner Email</Label>
                  <Input
                    value={editingServer.owner_email || ''}
                    onChange={(e) => setEditingServer({ ...editingServer, owner_email: e.target.value })}
                  />
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                  <div className="text-sm font-medium">License products</div>
                  <p className="text-xs text-muted-foreground">
                    License JSON includes ent_* flags; AirPC is usually a download-only add-on.
                  </p>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={!!Number(editingServer.ent_airshield ?? 1)}
                      onCheckedChange={(c) => setEditingServer({ ...editingServer, ent_airshield: !!c })}
                    />
                    VexShield
                  </label>
                </div>
                <Button onClick={handleUpdateServer} className="w-full">
                  Update Server
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Time Modal */}
        <Dialog open={showAddTimeModal} onOpenChange={setShowAddTimeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5 text-primary" />
                Extend License Time
              </DialogTitle>
              <DialogDescription>
                Add time to {addTimeServer?.display_name || addTimeServer?.server_id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">Current Expiration</Label>
                <Badge variant="outline" className="text-sm">
                  {addTimeServer?.expires_at 
                    ? new Date(addTimeServer.expires_at).toLocaleDateString() 
                    : 'Permanent'}
                </Badge>
              </div>
              
              <div>
                <Label className="mb-3 block">Add Time</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={addTimeOption === '1week' ? 'default' : 'outline'}
                    onClick={() => setAddTimeOption('1week')}
                    className="w-full"
                  >
                    +1 Week
                  </Button>
                  <Button
                    variant={addTimeOption === '1month' ? 'default' : 'outline'}
                    onClick={() => setAddTimeOption('1month')}
                    className="w-full"
                  >
                    +1 Month
                  </Button>
                  <Button
                    variant={addTimeOption === '3month' ? 'default' : 'outline'}
                    onClick={() => setAddTimeOption('3month')}
                    className="w-full"
                  >
                    +3 Months
                  </Button>
                </div>
              </div>
              
              <div>
                <Button
                  variant={addTimeOption === 'custom' ? 'default' : 'outline'}
                  onClick={() => setAddTimeOption('custom')}
                  className="w-full mb-2"
                >
                  Custom Date
                </Button>
                {addTimeOption === 'custom' && (
                  <Input
                    type="date"
                    value={customAddTime}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCustomAddTime(e.target.value)}
                  />
                )}
              </div>
              
              <Button onClick={handleAddTime} className="w-full">
                <CalendarPlus className="h-4 w-4 mr-2" />
                Extend License
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
