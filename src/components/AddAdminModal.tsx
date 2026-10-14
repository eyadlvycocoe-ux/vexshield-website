import { Fragment, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield  } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ADMIN_PERMISSION_DEFINITIONS,
  normalizeAdminPermissions,
  toggleAdminPermissionSelection,
} from "@/lib/admin-permissions";

interface AddAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdminAdded: (adminEmail: string, permissions: string[]) => void;
  serverId: string;
  licenseKey: string;
  performedByEmail?: string;
}

const GROUP_LABEL: Record<string, string> = {
  core: "General",
  moderation: "Moderation",
  management: "Management",
};

export function AddAdminModal({ open, onOpenChange, onAdminAdded, serverId, licenseKey, performedByEmail }: AddAdminModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['all']);

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setSelectedPermissions((prev) => toggleAdminPermissionSelection(prev, permissionId, checked));
  };

  const handleAddAdmin = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email is required.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPermissions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one permission.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'add_admin',
          server_id: serverId,
          license_key: licenseKey,
          admin_email: email.trim(),
          permissions: normalizeAdminPermissions(selectedPermissions),
          performed_by: performedByEmail || 'dashboard'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to add admin');
      }

      const payload = data as { error?: string; success?: boolean } | null;
      if (payload && typeof payload === 'object' && payload.error) {
        throw new Error(payload.error);
      }

      toast({
        title: "Admin added",
        description: `${email.trim()} can open this server from My Servers after signing in.`,
      });

      const addedEmail = email.trim();
      const perms = normalizeAdminPermissions(selectedPermissions);
      setEmail("");
      setSelectedPermissions(['all']);
      onOpenChange(false);
      onAdminAdded(addedEmail, perms);
    } catch (error) {
      toast({
        title: "Could not add admin",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const groups = ['core', 'moderation', 'management'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border border-white/10 text-white sm:max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="flex items-center gap-3 text-lg font-black tracking-tight text-white">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            Add administrator
          </DialogTitle>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Use the same email they use to sign in. They will see this server on <span className="text-white font-bold">My Servers</span> with the access you choose below.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-zinc-400">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#050505] border-white/10 text-xs text-white placeholder:text-zinc-500 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-white/20"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2.5">
            <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <Shield className="w-4 h-4 text-white" />
              Permissions
            </Label>
            <div className="rounded-xl border border-white/[0.08] bg-[#050505] max-h-[min(52vh,420px)] overflow-y-auto p-3 space-y-4">
              {selectedPermissions.includes('all') && (
                <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-zinc-300">
                  Full access is active. Turn it off to choose individual page permissions.
                </p>
              )}
              {groups.map((group) => {
                const items = ADMIN_PERMISSION_DEFINITIONS.filter((p) => p.group === group);
                if (items.length === 0) return null;
                return (
                  <Fragment key={group}>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 px-1">
                      {GROUP_LABEL[group] ?? group}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((permission) => (
                        <div
                          key={permission.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all ${
                            selectedPermissions.includes(permission.id)
                              ? 'bg-white/[0.08] border border-white/20'
                              : 'hover:bg-white/[0.03] border border-transparent'
                          }`}
                        >
                          <Checkbox
                            id={`add-${permission.id}`}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(permission.id, checked as boolean)
                            }
                            disabled={isLoading || (permission.id !== 'all' && selectedPermissions.includes('all'))}
                            className="mt-0.5 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                          />
                          <div className="grid gap-0.5 leading-snug min-w-0">
                            <label
                              htmlFor={`add-${permission.id}`}
                              className="text-xs font-bold text-white cursor-pointer"
                            >
                              {permission.label}
                            </label>
                            <p className="text-[11px] text-zinc-400">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleAddAdmin}
            className="w-full h-11 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-white/10 transition-all"
            disabled={isLoading}
          >
            {isLoading ? "Adding..." : "Add administrator"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
