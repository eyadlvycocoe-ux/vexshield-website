import { useState, useEffect, Fragment } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, UserCheck, Crown, Briefcase, Zap, Search, Headphones, MessageSquare, Star, Check } from "lucide-react";
import { toast } from "sonner";
import { apiUrl, apiMutationHeaders, ensureMutationCsrf } from "@/lib/api-base";
import {
  ADMIN_PERMISSION_DEFINITIONS,
  normalizeAdminPermissions,
  toggleAdminPermissionSelection,
} from "@/lib/admin-permissions";

export interface StaffRoleDefinition {
  level: number;
  id: string;
  label: string;
  category: "management" | "admin" | "moderation" | "support" | "member";
  badgeColor: string;
  icon: any;
  defaultPermissions: string[];
}

export const STAFF_ROLES: StaffRoleDefinition[] = [
  {
    level: 9,
    id: "head_management",
    label: "Head Management (Lvl 9)",
    category: "management",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    icon: Crown,
    defaultPermissions: ["all"],
  },
  {
    level: 8,
    id: "management",
    label: "Management (Lvl 8)",
    category: "management",
    badgeColor: "bg-purple-400/20 text-purple-400 border-purple-400/30",
    icon: Briefcase,
    defaultPermissions: ["dashboard", "users", "servers", "admins", "settings", "activity"],
  },
  {
    level: 7,
    id: "head_admin",
    label: "Head Admin (Lvl 7)",
    category: "admin",
    badgeColor: "bg-red-600/20 text-red-300 border-red-500/40",
    icon: Shield,
    defaultPermissions: ["dashboard", "users", "players", "warns", "kicks", "bans", "servers", "console", "resources"],
  },
  {
    level: 6,
    id: "admin",
    label: "Admin (Lvl 6)",
    category: "admin",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: Zap,
    defaultPermissions: ["dashboard", "players", "warns", "kicks", "bans", "servers", "console"],
  },
  {
    level: 5,
    id: "head_moderator",
    label: "Head Moderator (Lvl 5)",
    category: "moderation",
    badgeColor: "bg-blue-600/20 text-blue-300 border-blue-500/40",
    icon: Search,
    defaultPermissions: ["dashboard", "players", "search", "warns", "kicks", "bans", "blacklist-detections"],
  },
  {
    level: 4,
    id: "moderator",
    label: "Moderator (Lvl 4)",
    category: "moderation",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: UserCheck,
    defaultPermissions: ["dashboard", "players", "warns", "kicks", "bans"],
  },
  {
    level: 3,
    id: "head_support",
    label: "Head Support (Lvl 3)",
    category: "support",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    icon: Headphones,
    defaultPermissions: ["dashboard", "players", "search", "warns", "kicks"],
  },
  {
    level: 2,
    id: "support",
    label: "Support (Lvl 2)",
    category: "support",
    badgeColor: "bg-sky-400/20 text-sky-400 border-sky-400/30",
    icon: MessageSquare,
    defaultPermissions: ["dashboard", "players", "search", "warns:view", "kicks:view"],
  },
  {
    level: 1,
    id: "trial_support",
    label: "Trial Support (Lvl 1)",
    category: "support",
    badgeColor: "bg-amber-600/20 text-amber-400 border-amber-600/30",
    icon: Star,
    defaultPermissions: ["dashboard", "players:view", "search"],
  },
];

interface AssignStaffRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    discord_id: string;
    username?: string | null;
    display_name?: string | null;
    admin_level?: number | null;
    staff_role?: string | null;
    staff_permissions?: string[] | null;
  } | null;
  onSaved?: () => void;
}

const GROUP_LABEL: Record<string, string> = {
  core: "Core Access",
  moderation: "Moderation Permissions",
  management: "Management & Server Access",
};

export function AssignStaffRoleModal({ open, onOpenChange, user, onSaved }: AssignStaffRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const initialRole = user.staff_role || null;
      setSelectedRole(initialRole);
      if (user.staff_permissions && Array.isArray(user.staff_permissions)) {
        setSelectedPermissions(normalizeAdminPermissions(user.staff_permissions));
      } else {
        const foundRole = STAFF_ROLES.find((r) => r.id === initialRole || r.level === user.admin_level);
        setSelectedPermissions(foundRole ? foundRole.defaultPermissions : ["dashboard"]);
      }
    }
  }, [user, open]);

  const handleRoleSelect = (roleId: string | null) => {
    setSelectedRole(roleId);
    if (!roleId) {
      setSelectedPermissions([]);
      return;
    }
    const foundRole = STAFF_ROLES.find((r) => r.id === roleId);
    if (foundRole) {
      setSelectedPermissions(normalizeAdminPermissions(foundRole.defaultPermissions));
    }
  };

  const handlePermissionToggle = (permId: string, checked: boolean) => {
    setSelectedPermissions((prev) => toggleAdminPermissionSelection(prev, permId, checked));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await ensureMutationCsrf();
      const foundRole = STAFF_ROLES.find((r) => r.id === selectedRole);
      const targetLevel = foundRole ? foundRole.level : 0;

      const res = await fetch(apiUrl(`/api/admin/users/${user.discord_id}/staff-role`), {
        method: "PATCH",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          admin_level: targetLevel,
          staff_role: selectedRole,
          permissions: normalizeAdminPermissions(selectedPermissions),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update staff role & permissions");
      }

      toast.success(`Role (Level ${targetLevel}) & permissions updated for ${user.display_name || user.username || user.discord_id}`);
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving role & permissions");
    } finally {
      setLoading(false);
    }
  };

  const groups = ["core", "moderation", "management"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#090e17] border border-white/10 text-white max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl rounded-2xl p-6">
        <DialogHeader className="pb-3 border-b border-white/10">
          <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-400" />
            Assign Role & Permissions
          </DialogTitle>
          <p className="text-xs text-slate-400 mt-1">
            Target User: <span className="font-mono text-white font-bold">{user?.display_name || user?.username || user?.discord_id}</span>
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Step 1: Select Staff Role Tier */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              1. Select Staff Role Tier
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STAFF_ROLES.map((r) => {
                const IconComponent = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleSelect(r.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/15 text-white shadow-lg shadow-orange-500/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/5 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-orange-500 text-white" : "bg-white/10 text-slate-400"}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{r.label}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{r.category}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-orange-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-right">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-300"
                onClick={() => handleRoleSelect(null)}
              >
                Clear Role (Standard User)
              </Button>
            </div>
          </div>

          {/* Step 2: Custom Permissions Checklist */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              2. Custom Permissions Checklist
            </Label>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4 max-h-[320px] overflow-y-auto">
              {selectedPermissions.includes("all") && (
                <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs flex items-center gap-2">
                  <Crown className="h-4 w-4 shrink-0" />
                  <span>Full Access is enabled. This user has access to all pages and management features.</span>
                </div>
              )}
              {groups.map((group) => {
                const items = ADMIN_PERMISSION_DEFINITIONS.filter((p) => p.group === group);
                if (!items.length) return null;
                return (
                  <Fragment key={group}>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-1">
                      {GROUP_LABEL[group] ?? group}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.id);
                        return (
                          <div
                            key={perm.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
                              isChecked ? "border-orange-500/40 bg-orange-500/10" : "border-white/5 bg-white/[0.01] hover:border-white/15"
                            }`}
                          >
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={isChecked}
                              onCheckedChange={(c) => handlePermissionToggle(perm.id, !!c)}
                              disabled={loading || (perm.id !== "all" && selectedPermissions.includes("all"))}
                              className="mt-0.5 border-white/30 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white"
                            />
                            <div className="min-w-0 flex-1">
                              <Label htmlFor={`perm-${perm.id}`} className="font-bold text-xs text-white cursor-pointer block">
                                {perm.label}
                              </Label>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{perm.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-white/10 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="border-white/10 bg-white/5 hover:bg-white/10">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold px-6 shadow-lg shadow-orange-500/20">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Role & Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
