import { Fragment, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2  } from "lucide-react";
import {
  ADMIN_PERMISSION_DEFINITIONS,
  SUPPORT_GRANTABLE_PERMISSION_IDS,
} from "@/lib/admin-permissions";

const GROUP_LABEL: Record<string, string> = {
  core: "General",
  moderation: "Moderation",
  management: "Management",
  support: "Support desk",
};

const GRANTABLE = ADMIN_PERMISSION_DEFINITIONS.filter((p) =>
  SUPPORT_GRANTABLE_PERMISSION_IDS.has(p.id),
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supportLabel: string;
  initialPermissions?: string[];
  confirmLabel?: string;
  onConfirm: (permissions: string[]) => Promise<void>;
};

export function SupportAccessPermissionsDialog({
  open,
  onOpenChange,
  supportLabel,
  initialPermissions = ["dashboard"],
  confirmLabel = "Save",
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<string[]>(initialPermissions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(initialPermissions.length ? initialPermissions : ["dashboard"]);
      setError(null);
    }
  }, [open, initialPermissions]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((p) => p !== id);
    });
  };

  const handleConfirm = async () => {
    if (selected.length === 0) {
      setError("Select at least one page or action.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(selected);
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const groups = ["core", "moderation", "management", "support"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Support panel access</DialogTitle>
          <p className="text-sm text-muted-foreground font-normal">{supportLabel}</p>
          <p className="text-xs text-muted-foreground font-normal">
            Choose which pages this support staff member can use. They will not see the rest of the panel.
          </p>
        </DialogHeader>

        <div className="rounded-xl border border-border/60 bg-muted/15 max-h-[min(52vh,420px)] overflow-y-auto p-3 space-y-4">
          {groups.map((group) => {
            const items = GRANTABLE.filter((p) => p.group === group);
            if (items.length === 0) return null;
            return (
              <Fragment key={group}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90 px-1">
                  {GROUP_LABEL[group] ?? group}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {items.map((permission) => (
                    <div
                      key={permission.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        selected.includes(permission.id)
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:border-muted-foreground/25"
                      }`}
                    >
                      <Checkbox
                        id={`support-perm-${permission.id}`}
                        checked={selected.includes(permission.id)}
                        onCheckedChange={(checked) => toggle(permission.id, !!checked)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`support-perm-${permission.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {permission.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
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

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
