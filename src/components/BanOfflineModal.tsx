import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { X, Ban  } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BanOfflineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  serverId?: string;
}

/** Parse a comma/newline-separated identifier string into a structured object */
function parseIdentifiers(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith("license2:"))        result.license2 = part;
    else if (part.startsWith("license3:"))   result.license3 = part;
    else if (part.startsWith("license4:"))   result.license4 = part;
    else if (part.startsWith("license5:"))   result.license5 = part;
    else if (part.startsWith("license:"))    result.license  = part;
    else if (part.startsWith("steam:"))      result.steam    = part;
    else if (part.startsWith("fivem:"))      result.fivem    = part;
    else if (part.startsWith("discord:"))    result.discord  = part;
    else if (part.startsWith("ip:"))         result.ip       = part;
    else if (part.startsWith("xbl:"))        result.xbl      = part;
    else if (part.startsWith("live:"))       result.live     = part;
    else if (part.startsWith("guid:"))       result.guid     = part;
    else if (part.startsWith("seed:"))       result.seed     = part;
    else if (part.startsWith("gameid:"))     result.gameid   = part;
    else if (part.startsWith("redm:"))       result.redm     = part;
    else if (part.startsWith("thor:"))       result.thor     = part;
    else if (part.startsWith("twitch:"))     result.twitch   = part;
    else if (part.startsWith("vbl:"))        result.vbl      = part;
    else if (part.startsWith("ros:"))        result.ros      = part;
  }
  return result;
}

export function BanOfflineModal({ open, onOpenChange, canEdit = true, serverId }: BanOfflineModalProps) {
  const { toast } = useToast();
  const [name, setName]             = useState("");
  const [reason, setReason]         = useState("");
  const [identifiers, setIdentifiers] = useState("");
  const [isBanning, setIsBanning]   = useState(false);

  const handleBan = async () => {
    if (!name.trim() || !reason.trim() || !identifiers.trim()) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const parsed = parseIdentifiers(identifiers);
    const license = parsed.license || parsed.license2 || parsed.fivem || parsed.steam || "";

    if (!license) {
      toast({ title: "Error", description: "At least one of: license:, steam:, fivem: is required.", variant: "destructive" });
      return;
    }

    setIsBanning(true);
    try {
      const connectedServerStr = sessionStorage.getItem('connected_server');
      let licenseKey: string | null = null;
      if (connectedServerStr) {
        try { licenseKey = JSON.parse(connectedServerStr)?.license_key ?? null; } catch { /* */ }
      }

      const sid = serverId || JSON.parse(connectedServerStr || '{}')?.server_id;

      await supabase.functions.invoke('server-command', {
        body: {
          server_id: sid,
          license_key: licenseKey,
          command_type: 'offline_ban',
          command_data: {
            name:       name.trim(),
            reason:     reason.trim(),
            license:    parsed.license   || "Onbekend",
            license2:   parsed.license2  || "Onbekend",
            license3:   parsed.license3  || "Onbekend",
            license4:   parsed.license4  || "Onbekend",
            license5:   parsed.license5  || "Onbekend",
            steam:      parsed.steam     || "Onbekend",
            fivem:      parsed.fivem     || "Onbekend",
            discord:    parsed.discord   || "Onbekend",
            ip:         parsed.ip        || "Onbekend",
            xbl:        parsed.xbl       || "Onbekend",
            live:       parsed.live      || "Onbekend",
            guid:       parsed.guid      || "Onbekend",
            seed:       parsed.seed      || "Onbekend",
            gameid:     parsed.gameid    || "Onbekend",
            redm:       parsed.redm      || "Onbekend",
            thor:       parsed.thor      || "Onbekend",
            twitch:     parsed.twitch    || "Onbekend",
            vbl:        parsed.vbl       || "Onbekend",
            ros:        parsed.ros       || "Onbekend",
            hardware_id: parsed.license2 || parsed.license || "Onbekend",
            tokens:     [],
          },
        },
      });

      toast({ title: "Player Banned", description: `${name} has been added to ban.json.` });
      setName(""); setReason(""); setIdentifiers("");
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to send ban command.", variant: "destructive" });
    } finally {
      setIsBanning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg animate-scale-in">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Offline Ban
            </DialogTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Ban an offline player — writes directly to ban.json</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Player Name</Label>
            <Input id="name" placeholder="e.g. PlayerXYZ" value={name}
              onChange={e => setName(e.target.value)} className="bg-background" disabled={!canEdit} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" placeholder="Reason for the ban" value={reason}
              onChange={e => setReason(e.target.value)} className="bg-background resize-none" rows={2} disabled={!canEdit} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="identifiers">Identifiers</Label>
            <Textarea
              id="identifiers"
              placeholder={`license:abc123\nlicense2:xyz\nsteam:1100001...\ndiscord:1234567890\nip:1.2.3.4\nfivem:abc`}
              value={identifiers}
              onChange={e => setIdentifiers(e.target.value)}
              className="bg-background resize-none font-mono text-xs"
              rows={5}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              One identifier per line. At least one of <code className="text-primary">license:</code>, <code className="text-primary">steam:</code>, or <code className="text-primary">fivem:</code> is required.
            </p>
          </div>

          <Button onClick={handleBan} disabled={!canEdit || isBanning}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2">
            <Ban className="w-4 h-4" />
            {isBanning ? "Banning..." : "Ban Player"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
