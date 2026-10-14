import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PlayerKickBanDialog({
  open,
  onOpenChange,
  action,
  playerName,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "kick" | "ban" | null;
  playerName: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const isKick = action === "kick";
  const title = isKick ? "Kick player" : "Ban player";
  const trimmed = reason.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/15 bg-[#0F1017] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter a reason for {isKick ? "kicking" : "banning"}{" "}
            <span className="font-semibold text-white">{playerName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="moderation-reason" className="text-slate-300">
            Reason
          </Label>
          <Textarea
            id="moderation-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isKick ? "Reason for kick…" : "Reason for ban…"}
            rows={3}
            disabled={loading}
            className="border-white/15 bg-[#141722] text-white placeholder:text-slate-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && trimmed) {
                e.preventDefault();
                onConfirm(trimmed);
              }
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="border-white/20 bg-transparent text-slate-200 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || !trimmed}
            onClick={() => onConfirm(trimmed)}
            className={
              isKick
                ? "bg-amber-500 font-semibold text-black hover:bg-amber-400"
                : "bg-red-600 font-semibold text-white hover:bg-red-500"
            }
          >
            {loading ? "Sending…" : isKick ? "Confirm kick" : "Confirm ban"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
