import { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Loader2, Trash2, Edit, ShieldCheck, UserCheck, Check, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { Users, Zap, KeyRound } from "lucide-react";
import { LoadingPanel } from "@/components/ui/loading-spinner";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiMutationHeaders, apiUrl, ensureCsrfCookie, fetchWithTimeout, isCsrfErrorMessage } from "@/lib/api-base";
import { useAdminPermissions, canEditPage } from "@/hooks/useAdminPermissions";
import { getAdminPermissionLabel, normalizeAdminPermissions } from "@/lib/admin-permissions";
import { AddAdminModal } from '@/components/AddAdminModal';
import { EditPermissionsModal } from '@/components/EditPermissionsModal';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FallingPapers } from "@/components/FallingPapers";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { readConnectedServer } from "@/lib/connected-server";
import { cn } from "@/lib/utils";

interface Admin {
  email: string;
  isOwner: boolean;
  avatarUrl?: string;
  displayName?: string;
  permissions?: string[];
}

export default function Admins() {
  const { toast } = useToast();
  const { isOwner, isLoading: permsLoading } = useAdminPermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [pendingAdmins, setPendingAdmins] = useState<Admin[]>([]);
  const pendingAdminsRef = useRef<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingTimedOut = useLoadingTimeout(loading || permsLoading, 18_000);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  
  // Get server connection info from route params or connected server session
  const { serverId: routeServerId } = useParams<{ serverId?: string }>();
  const connectedServer = readConnectedServer();
  const serverId = routeServerId || connectedServer?.server_id || '';
  const licenseKey = connectedServer?.license_key || '';

  const pendingStorageKey = `pending_admins:${serverId || 'unknown'}`;
  const loadPendingFromStorage = (): Admin[] => {
    try {
      const raw = sessionStorage.getItem(pendingStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const now = Date.now();
      return parsed
        .filter((x: any) => x && typeof x === "object")
        .filter((x: any) => typeof x.email === "string" && x.email.trim())
        .filter((x: any) => !x.addedAt || (now - Number(x.addedAt)) < 30 * 60 * 1000)
        .map((x: any) => ({
          email: String(x.email),
          isOwner: false,
          permissions: Array.isArray(x.permissions) ? normalizeAdminPermissions(x.permissions) : ['all'],
        } as Admin));
    } catch {
      return [];
    }
  };

  const savePendingToStorage = (list: Admin[]) => {
    try {
      const payload = list.map((a) => ({
        email: a.email,
        permissions: normalizeAdminPermissions(a.permissions || ['all']),
        addedAt: Date.now(),
      }));
      sessionStorage.setItem(pendingStorageKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
  };
  
  const loadAdmins = async () => {
    if (!serverId || !licenseKey) {
      setLoading(false);
      toast({
        title: "Error",
        description: "Please connect to a server first",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'list_admins',
          server_id: serverId,
          license_key: licenseKey
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to load admins');
      }
      
      const body = (data as any)?.data ?? data;
      const ownerEmailFromFn = (body as any)?.owner_email || (body as any)?.ownerEmail || '';
      const ownerAvatarFromFn = (body as any)?.owner_avatar_url || (body as any)?.ownerAvatarUrl;
      const ownerNameFromFn = (body as any)?.owner_display_name || (body as any)?.ownerDisplayName;
      setOwnerEmail(ownerEmailFromFn || '');
      
      // Format admin list
      const adminList: Admin[] = [];
      
      // Add owner first
      if (ownerEmailFromFn) {
        adminList.push({
          email: ownerEmailFromFn,
          isOwner: true,
          avatarUrl: ownerAvatarFromFn,
          displayName: ownerNameFromFn,
          permissions: ['all']
        });
      }
      
      // Add regular admins (now with avatar data and permissions)
      const adminsFromFn = (body as any)?.admins || (body as any)?.Admins || (body as any)?.admin_list || (body as any)?.adminList;
      if (adminsFromFn && Array.isArray(adminsFromFn)) {
        adminsFromFn.forEach((admin: any) => {
          const adminEmail = typeof admin === 'string' ? admin : admin.email;
          // Skip if this is the owner (already added)
          if ((adminEmail || '').trim().toLowerCase() !== (ownerEmailFromFn || '').trim().toLowerCase()) {
            adminList.push({
              email: adminEmail,
              isOwner: false,
              avatarUrl: typeof admin === 'object' ? admin.avatar_url : undefined,
              displayName: typeof admin === 'object' ? admin.display_name : undefined,
              permissions: typeof admin === 'object' && Array.isArray(admin.permissions)
                ? normalizeAdminPermissions(admin.permissions)
                : ['all']
            });
          }
        });
      }

      // Fallback: if function didn't return anything usable, load from DB directly
      if (adminList.length === 0) {
        const { data: serverRow } = await supabase
          .from('servers')
          .select('owner_email')
          .eq('server_id', serverId)
          .maybeSingle();

        const ownerFromDb = (serverRow as any)?.owner_email as string | null | undefined;
        if (ownerFromDb) {
          setOwnerEmail(ownerFromDb);
          adminList.push({
            email: ownerFromDb,
            isOwner: true,
            permissions: ['all'],
          });
        }

        const { data: adminRows } = await supabase
          .from('server_admins')
          .select('user_id, permissions')
          .eq('server_id', serverId);

        const userIds = Array.from(new Set((adminRows || []).map((r: any) => r.user_id).filter(Boolean)));
        const { data: profiles } = userIds.length
          ? await supabase.from('profiles').select('id, email, display_name').in('id', userIds)
          : { data: [] as any[] };

        const profileById = new Map<string, any>();
        (profiles || []).forEach((p: any) => { if (p?.id) profileById.set(p.id, p); });

        (adminRows || []).forEach((r: any) => {
          const p = profileById.get(r.user_id);
          const email = p?.email;
          if (!email) return;
          if ((email || '').trim().toLowerCase() === (ownerFromDb || '').trim().toLowerCase()) return;
          adminList.push({
            email,
            isOwner: false,
            displayName: p?.display_name || undefined,
            permissions: Array.isArray(r.permissions) ? normalizeAdminPermissions(r.permissions) : ['all'],
          });
        });
      }

      const mergePending = (base: Admin[]) => {
        const existing = new Set(base.map(a => (a.email || "").trim().toLowerCase()));
        const stillPending: Admin[] = [];
        const merged = [...base];
        for (const p of pendingAdminsRef.current) {
          const key = (p.email || "").trim().toLowerCase();
          if (!key) continue;
          if (!existing.has(key)) {
            merged.push(p);
            stillPending.push(p);
          }
        }
        // Keep only those not yet visible from source
        pendingAdminsRef.current = stillPending;
        setPendingAdmins(stillPending);
        savePendingToStorage(stillPending);
        return merged;
      };

      // Optional: enrich display names from profiles (discord_users is staff-only via /api/db)
      const mergedList = mergePending(adminList);
      const emails = Array.from(new Set(mergedList.map((a) => (a.email || "").trim()).filter(Boolean)));
      let enriched = mergedList;
      if (emails.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('email, display_name')
            .in('email', emails);
          const profileByEmail = new Map<string, { display_name: string | null }>();
          (profiles || []).forEach((p: { email?: string; display_name?: string | null }) => {
            if (p?.email) {
              profileByEmail.set(String(p.email).trim().toLowerCase(), {
                display_name: p.display_name ?? null,
              });
            }
          });
          enriched = mergedList.map((a) => {
            const key = (a.email || "").trim().toLowerCase();
            const prof = profileByEmail.get(key);
            return {
              ...a,
              displayName: a.displayName || prof?.display_name || undefined,
            };
          });
        } catch {
          /* profiles optional - list_admins already includes avatars from server */
        }
      }
      setAdmins(enriched);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Get current user email
    supabase.auth.getUser().then(({ data }) => {
      setCurrentEmail(data.user?.email ?? null);
    }).finally(() => {
      const initialPending = loadPendingFromStorage();
      pendingAdminsRef.current = initialPending;
      setPendingAdmins(initialPending);
      loadAdmins();
    });
  }, []);
  
  const handleAdminAdded = (adminEmail: string, permissions: string[]) => {
    // Optimistic UI: keep the new admin visible until backend list catches up.
    const normalized = (adminEmail || "").trim().toLowerCase();
    if (normalized) {
      const pending: Admin = {
        email: adminEmail.trim(),
        isOwner: false,
        permissions: permissions?.length ? normalizeAdminPermissions(permissions) : ['all'],
      };
      setPendingAdmins(prev => {
        const exists = prev.some(a => (a.email || "").trim().toLowerCase() === normalized);
        const next = exists ? prev : [...prev, pending];
        pendingAdminsRef.current = next;
        savePendingToStorage(next);
        return next;
      });
      setAdmins(prev => {
        const exists = prev.some(a => (a.email || "").trim().toLowerCase() === normalized);
        return exists ? prev : [...prev, pending];
      });
    }

    // Edge function / DB sync can be eventually consistent.
    // Do a few retries so newly-added admins appear reliably.
    loadAdmins();
    window.setTimeout(() => loadAdmins(), 1500);
    window.setTimeout(() => loadAdmins(), 4000);
  };

  const normalizeEmail = (v: string | null | undefined) => (v || "").trim().toLowerCase();
  const ownerEmailFallback = normalizeEmail(connectedServer?.owner_email);
  const ownerEmailNormalized = normalizeEmail(ownerEmail) || ownerEmailFallback;
  const currentEmailNormalized = normalizeEmail(currentEmail);
  const canAddAdmins = isOwner || (!!currentEmailNormalized && !!ownerEmailNormalized && currentEmailNormalized === ownerEmailNormalized);
  const canDeleteAdmins = canAddAdmins; // Only owner can delete
  const canEditAdmins = canAddAdmins; // Only owner can edit permissions

  const handleDeleteClick = (admin: Admin) => {
    if (admin.isOwner) {
      toast({
        title: "Cannot Delete",
        description: "You cannot delete the server owner.",
        variant: "destructive",
      });
      return;
    }
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (admin: Admin) => {
    if (admin.isOwner) {
      toast({
        title: "Cannot Edit",
        description: "Owner has full permissions by default.",
        variant: "destructive",
      });
      return;
    }
    setAdminToEdit(admin);
    setEditModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!adminToDelete || !serverId || !licenseKey) return;

    try {
      const targetEmail = (adminToDelete.email || "").trim();
      const targetKey = targetEmail.toLowerCase();

      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'remove_admin',
          server_id: serverId,
          license_key: licenseKey,
          admin_email: targetEmail,
          performed_by: currentEmail || ownerEmail || 'dashboard',
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete admin');
      }

      // Also remove from server_admins so MyServers + permissions stop immediately.
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', targetKey)
          .maybeSingle();

        if ((profile as any)?.id) {
          await supabase
            .from('server_admins')
            .delete()
            .eq('server_id', serverId)
            .eq('user_id', (profile as any).id);
        }
      } catch {
        // ignore
      }

      // Remove from pending cache so it doesn't re-appear
      try {
        setPendingAdmins((prev) => {
          const next = prev.filter((a) => (a.email || "").trim().toLowerCase() !== targetKey);
          pendingAdminsRef.current = next;
          const storageKey = `pending_admins:${serverId || 'unknown'}`;
          sessionStorage.setItem(storageKey, JSON.stringify(next.map((a) => ({
            email: a.email,
            permissions: normalizeAdminPermissions(a.permissions || ['all']),
            addedAt: Date.now(),
          }))));
          return next;
        });
      } catch {
        // ignore
      }

      // Optimistic remove from current table
      setAdmins((prev) => prev.filter((a) => (a.email || "").trim().toLowerCase() !== targetKey));

      toast({
        title: "Success",
        description: `Admin ${targetEmail} has been removed.`,
      });

      setDeleteDialogOpen(false);
      setAdminToDelete(null);
      loadAdmins();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (admin.displayName && admin.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6 bg-[#0F1017] text-white">
      <div className="w-full space-y-4 relative z-10 max-w-7xl mx-auto">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Administrators</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage team members and configure permissions for your server dashboard.
            </p>
          </div>

          {canAddAdmins && (
            <Button 
              onClick={() => setAdminModalOpen(true)}
              className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 rounded-lg shadow-sm transition-all"
              disabled={loading || permsLoading}
            >
              <UserPlus className="w-3.5 h-3.5 text-white" />
              <span>Add Admin</span>
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <Card className="rounded-xl border border-white/[0.08] bg-[#0c1017] p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search administrators by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 bg-black/40 border-white/10 text-xs text-white placeholder:text-zinc-500 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500/40"
            />
          </div>
        </Card>

        {/* Admins Table Card */}
        <Card className="bg-[#0c1017] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <h2 className="font-semibold text-sm text-white">Team Members</h2>
              <Badge variant="secondary" className="text-[10px] bg-white/10 text-zinc-300">
                {filteredAdmins.length}
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading || permsLoading ? (
              <LoadingPanel
                label={permsLoading ? "Loading permissions" : "Loading administrators"}
                compact
                timedOut={loadingTimedOut}
                onRetry={() => void loadAdmins()}
                className="p-8"
              />
            ) : filteredAdmins.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 text-zinc-500">
                  <Users className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-white mb-1">No administrators found</p>
                <p className="text-xs text-zinc-500">
                  {searchQuery ? "No administrators match your search query." : "No team members have been added yet."}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-white/[0.08] bg-black/20">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400">
                      User
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400">
                      Permissions
                    </th>
                    {(canDeleteAdmins || canEditAdmins) && (
                      <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredAdmins.map((admin, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 rounded-lg border border-white/10">
                            {admin.avatarUrl && (
                              <AvatarImage src={admin.avatarUrl} alt={admin.displayName || admin.email} />
                            )}
                            <AvatarFallback className="bg-white/10 text-white font-bold text-xs">
                              {(admin.displayName || admin.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            {admin.displayName && (
                              <p className="text-white font-semibold text-xs">{admin.displayName}</p>
                            )}
                            <p className={admin.displayName ? "text-[11px] text-zinc-400" : "text-white text-xs font-medium"}>
                              {admin.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant="outline" 
                          className={admin.isOwner 
                            ? "bg-blue-500/15 text-blue-300 border-blue-500/30 font-semibold text-[10px] px-2 py-0.5 rounded" 
                            : "bg-white/5 text-zinc-300 border-white/15 font-semibold text-[10px] px-2 py-0.5 rounded"
                          }
                        >
                          {admin.isOwner ? "Owner" : "Admin"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {admin.isOwner ? (
                            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">
                              Full Management Access
                            </Badge>
                          ) : admin.permissions && admin.permissions.length > 0 ? (
                            admin.permissions.includes('all') ? (
                              <Badge variant="secondary" className="text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">All Pages</Badge>
                            ) : (
                              normalizeAdminPermissions(admin.permissions).slice(0, 3).map(perm => (
                                <Badge key={perm} variant="outline" className="text-[10px] border-white/10 text-zinc-300">{getAdminPermissionLabel(perm)}</Badge>
                              ))
                            )
                          ) : (
                            <span className="text-xs text-zinc-500">None</span>
                          )}
                          {!admin.isOwner && admin.permissions && admin.permissions.length > 3 && !admin.permissions.includes('all') && (
                            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">+{admin.permissions.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      {(canDeleteAdmins || canEditAdmins) && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {!admin.isOwner && canEditAdmins && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(admin);
                                }}
                                className="h-7 px-2.5 text-xs font-medium gap-1 text-zinc-300 hover:text-white border-white/10 hover:bg-white/10 rounded-lg"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </Button>
                            )}
                            {!admin.isOwner && canDeleteAdmins && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(admin);
                                }}
                                className="h-7 px-2 text-xs font-medium gap-1 text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/10 rounded-lg"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <AddAdminModal 
        open={adminModalOpen} 
        onOpenChange={setAdminModalOpen} 
        onAdminAdded={handleAdminAdded}
        serverId={serverId}
        licenseKey={licenseKey}
        performedByEmail={currentEmail || ownerEmail || undefined}
      />

      {/* Edit Permissions Modal */}
      {adminToEdit && (
        <EditPermissionsModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          adminEmail={adminToEdit.email}
          currentPermissions={adminToEdit.permissions || ['all']}
          serverId={serverId}
          licenseKey={licenseKey}
          performedByEmail={currentEmail || ownerEmail || undefined}
          onPermissionsUpdated={loadAdmins}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {adminToDelete?.email} as an admin? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export interface WhitelistEntry {
  identifier: string;
  discordId?: string;
  name: string;
  whitelist: boolean;
  menu: boolean;
  bypass?: string[];
  access?: string[];
  legacyWhitelist?: boolean;
  legacyMenu?: boolean;
}

const AIRSHIELD_ADMIN_BYPASS = [
  "Anti Noclip",
  "Anti Noclip2",
  "Anti Noclip3",
  "Anti Noclip4",
  "Anti Noclip5",
  "Anti Bebetter Noclip",
  "Anti Parachute Noclip",
  "Anti Force Fall",
  "Armour Detection",
  "Anti invisible",
  "Anti invisible2",
  "Anti Teleport",
  "Anti Teleport2",
  "Anti TP To Waypoint",
  "Anti Teleport To Waypoint",
  "Anti TPVehicleToPlayer",
  "Anti Speedhack",
  "Anti Fast Run",
  "Anti SuperJump",
  "Anti SuperJump2",
  "Anti Night/ThermalVision",
  "Anti Infinite Stamina",
  "Anti Spectate",
  "Anti Look Around",
  "Anti Freecam",
  "Anti Freecam2",
  "Anti Freecam3",
  "Anti Freecam #4",
  "Anti Freecam #5",
  "Anti Freecam #6",
  "Anti Block Input",
  "Anti LUA Input",
  "Anti Physic Gun",
  "Anti Player Blips",
  "Anti Spoof Name",
  "Anti OCR",
  "Anti Fling",
  "Anti Pickup Object/Ped",
  "Anti Crash",
  "Anti Super Punch",
  "Anti Model Changer",
  "Anti Ped Scale",
  "Anti Camera Rotation",
  "Anti Rape Player",
  "Anti Player Harassment",
  "Anti Lua Freeze",
  "Anti Player On Fire",
  "Anti Freeze Player",
  "Anti Ragdoll Abuse",
  "Anti Launch Player",
  "Anti Task Clear Loop",
  "Anti Animation Injection",
  "Anti Player Attach",
  "Anti SetEntityCoords Loop",
  "Anti Player Collision Disable",
  "Anti Infinite Roll",
  "Anti Infinite Combat Roll",
  "Anti Heal Spam",
  "Anti Godmode",
  "Anti Npc Hijack",
  "Anti Solo Session",
  "Anti Clear Tasks",
  "Anti Aggresive Peds",
  "Blacklisted Particles",
  "Anti Progress Props Crash",
  "Progress Props Crash Attempt",
  "Anti Object Spam Crash",
  "Object Spam Crash Attempt",
  "Anti Spawn Props",
  "Anti Object Spawn",
  "Anti Spawn Weapon",
  "Anti Spawn Weapon2",
  "Anti Spawn Weapon3",
  "Anti Spoofed Damage/Weapon",
  "Anti Shoot Without Weapon",
  "Anti NoRecoil",
  "Anti NoReload",
  "Anti Explosion Bullet",
  "Anti Explosion Bullet2",
  "Anti Infinite Ammo",
  "Anti Give Money",
  "Anti Kill Punch",
  "Anti Weapon Damage Changer",
  "Anti Blacklisted Weapon",
  "Anti Carry Vehicle",
  "Anti Throw Vehicle",
  "Anti Boost vehicle",
  "Anti Vehicle Spam",
  "Vehicle Spam Detected",
  "Anti Bring Vehicle",
  "Bring Vehicle Detected",
  "Anti Bring All Vehicles",
  "Bring All Vehicles Detected",
  "Anti Repair Vehicle",
  "Repair Vehicle Detected",
  "Anti Delete Vehicle",
  "Delete Vehicle Detected",
  "Anti Bug Vehicle",
  "Bug Vehicle Detected",
  "Anti Spawn Vehicle/Entity",
  "Anti Spawn Entity",
  "Anti Vehicle Weapon",
  "Anti Plate Changer",
  "Anti Launch/Fly Vehicle",
  "Anti Car Speed Hack",
  "Anti Kick Player Form Vehicle",
  "Anti Entity Manipulation",
  "Anti Possess Vehicle",
  "Anti Clone Player",
  "Anti Vehicle Mod Abuse",
  "Anti Spawn Ped",
  "Anti Vehicle Dirt Manipulation",
  "Anti Blacklisted Vehicle",
  "Anti Blacklisted Ped",
  "Anti Ai Explosion",
  "Anti Explosion",
  "Anti Silent Explosion",
  "Anti Phone Explosion",
  "Anti Invisible Explosion",
  "Anti Inaudible Explosion",
  "Anti Cipher",
  "Anti Spoof",
  "Anti Vpn",
  "Anti Afk",
  "Anti Stop Resource",
  "stop resource",
  "Anti Unknown Resource",
  "Anti Spam Trigger",
  "Anti Trigger Event",
  "blacklisted Trigger",
  "Anti Unknown Trigger",
  "Anti Event Token Bypass",
  "Anti Resource Injection",
  "Anti Voice Exploits",
  "Anti Global Voice",
  "Anti Inventory Exploit",
  "Anti Overlay",
  "Anti Cheat Overlay2",
  "Anti Menu Texture",
  "Cheat Ai Detection",
  "Anti Lua Menu",
  "Anti NUI Blocker",
  "Anti DevTools",
  "Anti Cheat Menu",
  "Anti Cheat Menu Functions",
  "Anti Cheat Spawn Functions",
  "Anti Cheat Teleport Functions",
  "Anti Cheat Weapon Functions",
  "Anti Cheat Vehicle Functions",
  "Anti Cheat Ped Functions",
  "Anti Cheat Object Functions",
  "Anti Lua Executor",
  "Anti AC Scanner",
  "Anti Unauthorized Admin",
  "Anti Exploit Events",
  "Anti License Clear",
  "Anti Weapon Components",
  "Anti Horn Boost",
  "Anti Sound Exploit",
  "Anti Specific Menu",
  "Anti Bytecode Injection",
  "Anti Global Function Hook",
  "Anti Native Hook",
  "Anti Loadstring",
  "Anti Citizen.Invoke Abuse",
  "Anti Export Hijack",
  "Anti Shared Object Override",
  "Anti Resource Rename Bypass",
  "Anti Cheat Explosion Functions",
  "Anti Cheat Spectate",
  "Anti Cheat Force Functions",
  "Anti Cheat Clone Functions",
  "Anti Cheat Cage Functions",
  "Anti Cheat Inventory Exploit",
  "Anti cheat Menu",
  "Anti cheat Menu Functions",
  "Anti cheat API Functions",
  "Anti cheat Spectate",
  "Anti cheat Bypass Functions",
  "Anti Tiny Ped",
  "Anti Kill",
  "Anti Kill2",
  "Anti Kill All",
  "Anti Taze",
  "Anti Aim Bot",
  "Anti Silent Aim",
  "Anti Silent Kill",
  "Anti Remote Melee",
  "Silent Kill Detected",
  "Remote Melee",
  "Anti Cheat Entity Rain",
  "Anti Attach Vehicle/Prop to Player",
  "Anti Attach Object to Player",
  "Anti Unauthorized Entity Spawn",
  "Anti Spawn Vehicle",
  "Anti Spawn Vehicle2",
  "Anti Spawn Vehicle3",
  "Anti Rapid Fire",
  "Anti Fast Shoot",
  "Anti Recoil Manip",
  "Anti Hitbox Manip",
  "Anti Damage Changer",
  "Anti Pickup Collection",
  "Anti Ai HitBox Changer",
  "Anti No Headshot",
  "Anti Bigger Hitbox",
  "Anti Bypass Afk Injection",
  "Anti Magic Bullet",
  "Anti Aimlock",
];

// Stored in admin.json as a single "*" entry; the server treats it as "bypass every detection".
const AIRSHIELD_FULL_BYPASS = "*";

const AIRSHIELD_ADMIN_ACCESS = ["Admin Menu"];

const AIRSHIELD_BYPASS_GROUPS = [
  {
    title: "Player",
    description: "Health, armor, visibility and player state checks.",
    matches: (permission: string) =>
      /Godmode|Heal|Armour|invisible|Invisible|Stamina|Clear Tasks|Ragdoll|Fake Death|Kill|Taze|OCR|Player Blips|Look Around|Block Input|LUA Input|Physic Gun|Fling|Force Fall/i.test(permission),
  },
  {
    title: "Movement",
    description: "Noclip, teleport, freecam and speed detections.",
    matches: (permission: string) =>
      /Noclip|Freecam|Teleport|TP To Waypoint|TPVehicle|Speedhack|Fast Run|SuperJump|Advanced Freecam|Parachute/i.test(permission),
  },
  {
    title: "Weapon",
    description: "Weapon spawn, ammo, recoil and damage checks.",
    matches: (permission: string) =>
      /Weapon|Ammo|NoRecoil|NoReload|Explosion Bullet|Shoot Without Weapon|Damage Changer|Silent Aim|Aim Bot|Magic Bullet|Rapid Fire|Fast Shoot|Recoil Manip/i.test(permission),
  },
  {
    title: "Vehicle",
    description: "Vehicle spawn, abuse, boost and plate checks.",
    matches: (permission: string) =>
      /Vehicle|Plate|Car Speed|Carry Vehicle|Throw Vehicle|Boost vehicle|Bring Vehicle|Repair Vehicle|Delete Vehicle|Bug Vehicle|Launch\/Fly|Possess Vehicle/i.test(permission),
  },
  {
    title: "Entity",
    description: "Entity, ped, object and world manipulation.",
    matches: (permission: string) =>
      /Entity|Object|Ped|Npc|Pickup|Particles|Props|Aggresive Peds|SetEntityCoords|Collision|Attach|Animation|Model Changer|Rape|Harassment|Lua Freeze|Player On Fire|Hitbox|Tiny Ped|No Headshot/i.test(permission),
  },
  {
    title: "Explosion",
    description: "Explosion, particle and blast related protections.",
    matches: (permission: string) =>
      /Explosion|Ai Explosion|Silent Explosion|Phone Explosion|Invisible Explosion|Inaudible Explosion|Blacklisted Particles/i.test(permission),
  },
  {
    title: "Resource",
    description: "Resource, trigger and server integrity checks.",
    matches: (permission: string) =>
      /Resource|Trigger|Stop Resource|Unknown Resource|Spam Trigger|blacklisted Trigger|Export Hijack|Shared Object|Cipher|Spoof|Vpn|Afk|Event Token/i.test(permission),
  },
  {
    title: "Injection",
    description: "Menu, executor, hook and injection detections.",
    matches: (permission: string) =>
      /Cheat|Lua|NUI|DevTools|Executor|AC Scanner|DLL|Bytecode|Global Function|Native Hook|Loadstring|Citizen\.Invoke|Susano|TZX|Skript|Unauthorized Admin|Exploit Events|Overlay|Texture/i.test(permission),
  },
  {
    title: "Other",
    description: "Additional protections not matched above.",
    matches: () => true,
  },
];

/** VexShield player whitelist (html/admin.json) - scoped bypass/access per Discord ID. */
export function WhitelistAdmin() {
  const { toast } = useToast();
  const { isOwner, permissions, isLoading: permsLoading } = useAdminPermissions();
  const canEdit = isOwner || canEditPage(permissions, "settings");
  const { serverId: routeServerId } = useParams<{ serverId?: string }>();
  const [connectedServerId, setConnectedServerId] = useState<string>(
    () => routeServerId || readConnectedServer()?.server_id || ""
  );

  useEffect(() => {
    const handleConnectedChange = () => {
      const activeId = routeServerId || readConnectedServer()?.server_id || "";
      if (activeId) setConnectedServerId(activeId);
    };
    window.addEventListener("aircore:connected-server", handleConnectedChange);
    return () => window.removeEventListener("aircore:connected-server", handleConnectedChange);
  }, [routeServerId]);

  const serverId = routeServerId || connectedServerId || readConnectedServer()?.server_id || "";

  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playerIdentifier, setPlayerIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedBypass, setSelectedBypass] = useState<string[]>([]);
  const [selectedAccess, setSelectedAccess] = useState<string[]>(["Admin Menu"]);
  const [editingIdentifier, setEditingIdentifier] = useState<string | null>(null);
  const [detectionSearch, setDetectionSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const whitelistLoadTimedOut = useLoadingTimeout(loading, 15_000);

  const loadEntries = async () => {
    const activeServerId = serverId || routeServerId || readConnectedServer()?.server_id || "";
    if (!activeServerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetchWithTimeout(
        apiUrl(`/api/servers/${encodeURIComponent(activeServerId)}/airshield-whitelist`),
        {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", "X-AirCore-Client": "1" },
        },
        12_000,
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setEntries(Array.isArray(j.entries) ? j.entries : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load whitelist";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const persistEntries = async (list: WhitelistEntry[], successTitle: string, successDescription: string) => {
    const activeServerId = serverId || routeServerId || readConnectedServer()?.server_id || "";
    if (!activeServerId) return false;
    await ensureCsrfCookie();
    const url = apiUrl(`/api/servers/${encodeURIComponent(activeServerId)}/airshield-whitelist`);
    const body = JSON.stringify({ entries: list });

    const doPut = () =>
      fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: apiMutationHeaders(),
        body,
      });

    let r = await doPut();
    let j = (await r.json().catch(() => ({}))) as { error?: string; entries?: WhitelistEntry[] };

    if (!r.ok && r.status === 403 && isCsrfErrorMessage(j.error || "")) {
      await ensureCsrfCookie(true);
      r = await doPut();
      j = (await r.json().catch(() => ({}))) as { error?: string; entries?: WhitelistEntry[] };
    }

    if (!r.ok) {
      const msg = j.error || `HTTP ${r.status}`;
      if (isCsrfErrorMessage(msg)) {
        throw new Error("Session security token expired - refresh the page or sign in again.");
      }
      throw new Error(msg);
    }

    setEntries(Array.isArray(j.entries) ? j.entries : list);
    toast({ title: successTitle, description: successDescription });
    return true;
  };

  useEffect(() => {
    void ensureCsrfCookie();
  }, []);

  useEffect(() => {
    if (!permsLoading) loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, routeServerId, permsLoading]);

  const normalizeIdentifierInput = (raw: string) => {
    const compact = raw.trim().replace(/\s+/g, "");
    const discordId = compact.replace(/^discord:/i, "");
    if (/^\d{17,20}$/.test(discordId)) return `discord:${discordId}`;
    const prefixed = compact.match(/^(license2?|steam|fivem|discord|xbl|live):(.+)$/i);
    if (prefixed) {
      const prefix = prefixed[1].toLowerCase();
      const value = prefixed[2];
      if (prefix === "discord" && !/^\d{17,20}$/.test(value)) return "";
      return value && value.length <= 128 ? `${prefix}:${value.toLowerCase()}` : "";
    }
    if (/^[a-f0-9]{32,64}$/i.test(compact)) return `license:${compact.toLowerCase()}`;
    return "";
  };

  const getEntryIdentifier = (entry: WhitelistEntry) =>
    entry.identifier || (entry.discordId ? `discord:${entry.discordId}` : "");

  const toggleValue = (list: string[], value: string, checked: boolean) =>
    checked ? Array.from(new Set([...list, value])) : list.filter((item) => item !== value);

  const detectionQuery = detectionSearch.trim().toLowerCase();
  const assignedBypassPermissions = new Set<string>();
  const groupedBypassPermissions = AIRSHIELD_BYPASS_GROUPS.map((group) => {
    const items = AIRSHIELD_ADMIN_BYPASS.filter((permission) => {
      if (assignedBypassPermissions.has(permission)) return false;
      if (!group.matches(permission)) return false;
      if (detectionQuery && !permission.toLowerCase().includes(detectionQuery)) return false;
      return true;
    });
    items.forEach((permission) => assignedBypassPermissions.add(permission));
    return { ...group, items };
  }).filter((group) => group.items.length > 0);

  const filteredEntries = entries.filter((entry) => {
    const query = staffSearch.trim().toLowerCase();
    if (!query) return true;
    return `${entry.name || ""} ${getEntryIdentifier(entry)}`.toLowerCase().includes(query);
  });

  const resetEditor = () => {
    setPlayerIdentifier("");
    setDisplayName("");
    setSelectedBypass([]);
    setSelectedAccess(["Admin Menu"]);
    setEditingIdentifier(null);
  };

  const handleAdd = async () => {
    const identifier = normalizeIdentifierInput(playerIdentifier);
    if (!identifier) {
      toast({ title: "Invalid identifier", description: "Enter a Discord ID or Rockstar license, for example discord:123 or license:abcd.", variant: "destructive" });
      return;
    }
    const name = displayName.trim() || identifier;
    // When every detection is selected, store a single "*" marker so the server applies a true
    // full bypass (covers detections whose reason does not resolve to a named protection).
    const bypass =
      selectedBypass.length === AIRSHIELD_ADMIN_BYPASS.length
        ? [AIRSHIELD_FULL_BYPASS]
        : selectedBypass;
    const access = selectedAccess;
    if (bypass.length === 0 && access.length === 0) {
      toast({ title: "Select permissions", description: "Choose at least one bypass or access permission.", variant: "destructive" });
      return;
    }
    if (entries.some((e) => getEntryIdentifier(e) === identifier && getEntryIdentifier(e) !== editingIdentifier)) {
      toast({ title: "Already listed", description: "This identifier is already on the whitelist.", variant: "destructive" });
      return;
    }
    const nextEntry = {
      identifier,
      discordId: identifier.startsWith("discord:") ? identifier.slice("discord:".length) : undefined,
      name,
      whitelist: false,
      menu: false,
      bypass,
      access,
    };
    const next = editingIdentifier
      ? entries.map((entry) => (getEntryIdentifier(entry) === editingIdentifier ? nextEntry : entry))
      : [...entries, nextEntry];
    setSaving(true);
    try {
      await persistEntries(
        next,
        editingIdentifier ? "Updated & saved" : "Added & saved",
        `${name} is saved. admin.json will sync without removed permissions.`
      );
      resetEditor();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (identifier: string) => {
    const next = entries.filter((e) => getEntryIdentifier(e) !== identifier);
    setSaving(true);
    try {
      await persistEntries(next, "Removed & saved", "Whitelist updated on the server.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: WhitelistEntry) => {
    const identifier = getEntryIdentifier(entry);
    setEditingIdentifier(identifier);
    setPlayerIdentifier(identifier);
    setDisplayName(entry.name || identifier);
    const storedBypass = Array.isArray(entry.bypass) ? entry.bypass : [];
    setSelectedBypass(
      storedBypass.includes(AIRSHIELD_FULL_BYPASS) ? [...AIRSHIELD_ADMIN_BYPASS] : storedBypass,
    );
    setSelectedAccess(Array.isArray(entry.access) ? entry.access : []);
  };

  const handleSave = async () => {
    if (!serverId) return;
    setSaving(true);
    try {
      await persistEntries(
        entries,
        "Whitelist saved",
        "admin.json updated and sync queued for your game server."
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ---- Derived stats & helpers for the redesigned UI ----
  const totalEntries = entries.length;
  const fullBypassCount = entries.filter(
    (e) => Array.isArray(e.bypass) && e.bypass.includes(AIRSHIELD_FULL_BYPASS),
  ).length;
  const partialBypassCount = entries.filter(
    (e) => Array.isArray(e.bypass) && e.bypass.length > 0 && !e.bypass.includes(AIRSHIELD_FULL_BYPASS),
  ).length;
  const accessCount = entries.filter((e) => Array.isArray(e.access) && e.access.length > 0).length;

  const setGroupSelection = (items: string[], checked: boolean) =>
    setSelectedBypass((current) =>
      checked ? Array.from(new Set([...current, ...items])) : current.filter((p) => !items.includes(p)),
    );
  const groupAllSelected = (items: string[]) =>
    items.length > 0 && items.every((p) => selectedBypass.includes(p));
  const allBypassSelected = selectedBypass.length === AIRSHIELD_ADMIN_BYPASS.length;

  const detectedIdentifier = (() => {
    const v = playerIdentifier.trim().replace(/\s+/g, "");
    if (!v) return null;
    const norm = normalizeIdentifierInput(v);
    if (!norm) return { ok: false, label: "Unrecognized format" } as const;
    if (norm.startsWith("discord:")) return { ok: true, label: "Discord ID" } as const;
    if (norm.startsWith("license2:")) return { ok: true, label: "Rockstar license2" } as const;
    if (norm.startsWith("license:")) return { ok: true, label: "Rockstar license" } as const;
    return { ok: true, label: norm.split(":")[0] } as const;
  })();

  const statCards = [
    { label: "Staff Listed", value: totalEntries, icon: Users, tint: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/10" },
    { label: "Full Bypass", value: fullBypassCount, icon: Zap, tint: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/10" },
    { label: "Scoped Bypass", value: partialBypassCount, icon: ShieldCheck, tint: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" },
    { label: "Admin Menu", value: accessCount, icon: KeyRound, tint: "text-indigo-400", border: "border-indigo-500/20", bg: "bg-indigo-500/10" },
  ];

  return (
    <div className="relative min-h-screen p-4 md:p-6 bg-[#080b14] text-slate-100 font-['Inter',sans-serif]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(6,182,212,0.04),transparent_60%)] -z-10" />
      <FallingPapers />

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-6">
        {/* ========================================================================= */}
        {/* HERO HEADER & LIVE TELEMETRY CARDS                                        */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1222]/80 backdrop-blur-xl p-5 md:p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0 border border-white/20">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Whitelist Admin</h1>
                  <Badge className="bg-cyan-500/15 text-cyan-300 font-mono text-[10px] border border-cyan-500/30 font-bold uppercase tracking-wider">
                    Staff ACL Matrix
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  Configure scoped anti-cheat exemptions and in-game administrative menu permissions per player. Saved to{" "}
                  <code className="rounded bg-black/60 border border-white/10 px-1.5 py-0.5 text-xs text-cyan-300 font-mono">html/admin.json</code> and synced directly to game server runtime.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={cn(
                    "flex items-center gap-3.5 rounded-xl border p-3.5 transition-all shadow-sm bg-[#080d19]/90",
                    s.border
                  )}
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 shrink-0", s.bg, s.tint)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-black text-white tabular-nums tracking-tight">{s.value}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STAFF ACCESS CONFIGURATOR (ADD / EDIT)                                    */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1222]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                {editingIdentifier ? <Edit className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {editingIdentifier ? "Edit Staff Permissions" : "Add Staff Member"}
                </h2>
                <p className="text-xs text-slate-400">
                  {editingIdentifier
                    ? `Modifying privileges for ${displayName || editingIdentifier}`
                    : "Exempt specific Discord ID or Rockstar license from detection rules."}
                </p>
              </div>
            </div>

            {editingIdentifier && canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetEditor}
                disabled={saving}
                className="text-slate-400 hover:text-white rounded-lg text-xs font-semibold h-8"
              >
                Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wl-player-identifier" className="text-xs font-semibold text-slate-300">
                Discord ID or Rockstar License
              </Label>
              <Input
                id="wl-player-identifier"
                placeholder="discord:1240611764823920670 or license:abcd..."
                value={playerIdentifier}
                onChange={(e) => setPlayerIdentifier(e.target.value)}
                disabled={!canEdit}
                className="h-10 bg-[#050813] border-white/10 text-xs text-white placeholder:text-slate-500 font-mono rounded-xl focus-visible:ring-1 focus-visible:ring-cyan-500/40"
              />
              {detectedIdentifier ? (
                <p className={cn("flex items-center gap-1.5 text-xs font-medium", detectedIdentifier.ok ? "text-emerald-400" : "text-rose-400")}>
                  <span className={cn("inline-block h-1.5 w-1.5 rounded-full", detectedIdentifier.ok ? "bg-emerald-400" : "bg-rose-400")} />
                  {detectedIdentifier.ok ? `Identified: ${detectedIdentifier.label}` : detectedIdentifier.label}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">Supports Discord ID (17–20 digits) or Rockstar license hash.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wl-name" className="text-xs font-semibold text-slate-300">
                Staff Display Name
              </Label>
              <Input
                id="wl-name"
                placeholder="e.g. Lead Admin Alex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!canEdit}
                className="h-10 bg-[#050813] border-white/10 text-xs text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-1 focus-visible:ring-cyan-500/40"
              />
            </div>
          </div>

          {/* Bypass permissions matrix */}
          <div className="space-y-3.5 rounded-xl border border-white/10 bg-[#050813] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <Label className="text-xs font-bold text-white uppercase tracking-wider">Detection Bypass Rules</Label>
                <Badge className="bg-amber-500/10 text-amber-400 font-mono font-bold text-[10px] border border-amber-500/20">
                  {selectedBypass.length}/{AIRSHIELD_ADMIN_BYPASS.length} Selected
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!canEdit}
                  onClick={() => setSelectedBypass(allBypassSelected ? [] : [...AIRSHIELD_ADMIN_BYPASS])}
                  className={cn(
                    "h-8 gap-1.5 text-xs font-bold rounded-lg px-3 transition-all",
                    allBypassSelected
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                      : "bg-white hover:bg-zinc-200 text-black shadow-sm"
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                  {allBypassSelected ? "Clear Full Bypass" : "Full Bypass (All Detections)"}
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={detectionSearch}
                onChange={(e) => setDetectionSearch(e.target.value)}
                placeholder="Filter detection rules (e.g. Noclip, AimBot, Spawn Weapon)..."
                className="h-9 pl-9 bg-[#080d19] border-white/10 text-xs text-white placeholder:text-slate-500 rounded-lg"
              />
            </div>

            <div className="max-h-[32rem] overflow-y-auto rounded-xl pr-1 space-y-3">
              {groupedBypassPermissions.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No detections match your search.</p>
              ) : (
                <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                  {groupedBypassPermissions.map((group) => {
                    const allSel = groupAllSelected(group.items);
                    const selCount = group.items.filter((p) => selectedBypass.includes(p)).length;
                    return (
                      <div key={group.title} className="rounded-xl border border-white/10 bg-[#080d19] p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{group.title}</h3>
                              <p className="text-[11px] text-slate-400 mt-0.5">{group.description}</p>
                            </div>
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setGroupSelection(group.items, !allSel)}
                              className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300 transition hover:bg-white hover:text-black disabled:opacity-50"
                            >
                              {allSel ? "Clear" : "All"}
                            </button>
                          </div>

                          <div className="mb-2.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-cyan-400 transition-all"
                                style={{ width: `${(selCount / group.items.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold tabular-nums text-slate-400">
                              {selCount}/{group.items.length}
                            </span>
                          </div>

                          <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                            {group.items.map((permission) => {
                              const checked = selectedBypass.includes(permission);
                              return (
                                <Label
                                  key={permission}
                                  className={cn(
                                    "flex min-h-7 cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                                    checked
                                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                                      : "border-white/[0.04] bg-white/[0.01] hover:border-white/10 text-slate-400"
                                  )}
                                >
                                  <span className="truncate">{permission}</span>
                                  <Checkbox
                                    checked={checked}
                                    disabled={!canEdit}
                                    onCheckedChange={(c) => setSelectedBypass((current) => toggleValue(current, permission, c === true))}
                                    className="border-white/30 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 data-[state=checked]:text-black"
                                  />
                                </Label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Access permissions card */}
          <div className="space-y-2.5 rounded-xl border border-white/10 bg-[#050813] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-400" />
              <Label className="text-xs font-bold text-white uppercase tracking-wider">In-Game Privileges</Label>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {AIRSHIELD_ADMIN_ACCESS.map((permission) => {
                const checked = selectedAccess.includes(permission);
                return (
                  <Label
                    key={permission}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all",
                      checked
                        ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-200"
                        : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!canEdit}
                      onCheckedChange={(c) => setSelectedAccess((current) => toggleValue(current, permission, c === true))}
                      className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 data-[state=checked]:text-white"
                    />
                    <span>{permission} (F6 / /vexmenu HUD Access)</span>
                  </Label>
                );
              })}
            </div>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                onClick={() => void handleAdd()}
                disabled={saving}
                className="h-10 gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs px-6 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : editingIdentifier ? (
                  <Edit className="h-4 w-4 text-white" />
                ) : (
                  <UserPlus className="h-4 w-4 text-white" />
                )}
                {editingIdentifier ? "Update & Save" : "Add to Whitelist"}
              </Button>
              <p className="text-[11px] text-slate-500 font-medium">
                Saves directly into <code className="text-slate-400 font-mono">html/admin.json</code> snapshot for automatic client sync.
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* WHITELISTED STAFF DIRECTORY                                               */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1222]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Users className="h-5 w-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Whitelisted Staff Members</h2>
              <Badge className="bg-cyan-500/10 text-cyan-300 font-mono text-xs border border-cyan-500/20 font-bold">
                {filteredEntries.length}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <Input
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff by name or ID..."
                  className="h-9 pl-9 bg-[#050813] border-white/10 text-xs text-white placeholder:text-slate-500 rounded-lg sm:w-60"
                />
              </div>

              {canEdit && (
                <Button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="h-9 gap-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs px-4 shadow-sm"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-black" /> : <ShieldCheck className="h-3.5 w-3.5 text-black" />}
                  Save & Sync
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingPanel
              label="Loading whitelist"
              compact
              timedOut={whitelistLoadTimedOut}
              onRetry={() => void loadEntries()}
              className="py-8"
            />
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-white/10 bg-[#050813] py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400">
                <Users className="h-5 w-5" />
              </div>
              <p className="font-bold text-xs text-white">No staff whitelisted yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Add a Discord ID or Rockstar license above to grant anti-cheat bypasses.
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No staff match your search criteria.</p>
          ) : (
            <ul className="space-y-2">
              {filteredEntries.map((e) => {
                const identifier = getEntryIdentifier(e);
                const isFull = Array.isArray(e.bypass) && e.bypass.includes(AIRSHIELD_FULL_BYPASS);
                const bypassCount = Array.isArray(e.bypass) ? e.bypass.length : 0;
                const initial = (e.name || identifier || "?").replace(/^[a-z0-9]+:/i, "").charAt(0).toUpperCase();

                return (
                  <li
                    key={identifier}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#050813] px-4 py-3 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-300">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-xs text-white">{e.name || identifier}</p>
                        <p className="truncate font-mono text-[11px] text-slate-400">{identifier}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {isFull ? (
                        <Badge className="gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          <Zap className="h-3 w-3 text-amber-400" />
                          Full Bypass
                        </Badge>
                      ) : bypassCount > 0 ? (
                        <Badge className="gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          <ShieldCheck className="h-3 w-3 text-emerald-400" />
                          {bypassCount} Bypasses
                        </Badge>
                      ) : null}

                      {Array.isArray(e.access) && e.access.length > 0 ? (
                        <Badge className="gap-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                          <KeyRound className="h-3 w-3 text-indigo-400" />
                          Admin Menu
                        </Badge>
                      ) : null}

                      {canEdit && (
                        <div className="flex items-center gap-1 ml-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={saving}
                            onClick={() => handleEdit(e)}
                            aria-label="Edit permissions"
                            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={saving}
                            onClick={() => void handleRemove(identifier)}
                            aria-label="Remove"
                            className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

