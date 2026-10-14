import { Fragment, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2  } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ADMIN_PERMISSION_DEFINITIONS,
  normalizeAdminPermissions,
  toggleAdminPermissionSelection,
} from "@/lib/admin-permissions";

interface EditPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminEmail: string;
  currentPermissions: string[];
  serverId: string;
  licenseKey: string;
  performedByEmail?: string;
  onPermissionsUpdated: () => void;
}

const GROUP_LABEL: Record<string, string> = {
  core: "General",
  moderation: "Moderation",
  management: "Management",
};

export function EditPermissionsModal({
  open,
  onOpenChange,
  adminEmail,
  currentPermissions,
  serverId,
  licenseKey,
  performedByEmail,
  onPermissionsUpdated
}: EditPermissionsModalProps) {
  const { toast } = useToast();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(currentPermissions);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedPermissions(normalizeAdminPermissions(currentPermissions));
  }, [currentPermissions, open]);

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setSelectedPermissions((prev) => toggleAdminPermissionSelection(prev, permissionId, checked));
  };

  const handleSave = async () => {
    if (selectedPermissions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one permission",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'update_permissions',
          server_id: serverId,
          license_key: licenseKey,
          admin_email: adminEmail,
          permissions: normalizeAdminPermissions(selectedPermissions),
          performed_by: performedByEmail || 'dashboard'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to update permissions');
      }

      const payload = data as { error?: string } | null;
      if (payload && typeof payload === 'object' && payload.error) {
        throw new Error(payload.error);
      }

      toast({
        title: "Saved",
        description: `Permissions updated for ${adminEmail}`,
      });

      onPermissionsUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update permissions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const groups = ['core', 'moderation', 'management'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-black text-white">Edit permissions</DialogTitle>
          <p className="text-xs text-zinc-400 font-mono">{adminEmail}</p>
        </DialogHeader>

        <div className="rounded-xl border border-white/[0.08] bg-[#050505] max-h-[min(52vh,420px)] overflow-y-auto p-3.5 space-y-4">
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
                <div className="grid grid-cols-1 gap-2">
                  {items.map((permission) => (
                    <div
                      key={permission.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        selectedPermissions.includes(permission.id)
                          ? 'border-white/20 bg-white/[0.08]'
                          : 'border-white/[0.04] bg-white/[0.01] hover:border-white/10'
                      }`}
                    >
                      <Checkbox
                        id={`edit-perm-${permission.id}`}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                        disabled={isLoading || (permission.id !== 'all' && selectedPermissions.includes('all'))}
                        className="mt-0.5 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`edit-perm-${permission.id}`}
                          className="font-bold text-xs text-white cursor-pointer"
                        >
                          {permission.label}
                        </Label>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Fragment>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
            className="h-10 rounded-xl border-white/10 bg-[#141414] hover:bg-[#1a1a1e] text-zinc-300 hover:text-white text-xs font-bold px-4"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="h-10 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs px-6 shadow-lg shadow-white/10"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin text-black" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
