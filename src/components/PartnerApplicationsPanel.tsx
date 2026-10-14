import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ExternalLink, RefreshCw, Users, X  } from "lucide-react";
import { toast } from "sonner";
import { apiMutationHeaders, apiUrl, ensureMutationCsrf } from "@/lib/api-base";

export interface PartnerApplication {
  id: string;
  user_id: string;
  discord_username?: string | null;
  server_name: string;
  server_type: string;
  peak_players: number;
  discord_link: string;
  logo_url?: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  partnership_id?: string | null;
  created_at: string;
}

const SERVER_TYPE_LABELS: Record<string, string> = {
  rp: "Roleplay (RP)",
  pvp: "PVP",
  rp_pvp: "RP + PVP",
  freeroam: "Freeroam",
  other: "Other",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

interface PartnerApplicationsPanelProps {
  compact?: boolean;
}

export function PartnerApplicationsPanel({ compact = false }: PartnerApplicationsPanelProps) {
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [approveTarget, setApproveTarget] = useState<PartnerApplication | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PartnerApplication | null>(null);
  const [approveLogo, setApproveLogo] = useState("");
  const [approveOrder, setApproveOrder] = useState("0");
  const [rejectNotes, setRejectNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const q = filter !== "all" ? `?status=${encodeURIComponent(filter)}` : "";
      const res = await fetch(apiUrl(`/partner-applications${q}`), { credentials: "include" });
      if (res.ok) {
        setApplications(await res.json());
      } else {
        toast.error("Failed to load partner applications");
      }
    } catch {
      toast.error("Failed to load partner applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, [filter]);

  const openApprove = (app: PartnerApplication) => {
    setApproveTarget(app);
    setApproveLogo(app.logo_url || "");
    setApproveOrder("0");
  };

  const openReject = (app: PartnerApplication) => {
    setRejectTarget(app);
    setRejectNotes("");
  };

  const submitReview = async (status: "approved" | "rejected") => {
    const target = status === "approved" ? approveTarget : rejectTarget;
    if (!target) return;

    setProcessing(true);
    try {
      await ensureMutationCsrf();
      const body: Record<string, unknown> = { status };
      if (status === "approved") {
        body.logo_url = approveLogo.trim();
        body.display_order = parseInt(approveOrder, 10) || 0;
      } else {
        body.admin_notes = rejectNotes.trim() || null;
      }

      const res = await fetch(apiUrl(`/partner-applications/${target.id}`), {
        method: "PATCH",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || "Update failed");

      toast.success(status === "approved" ? "Application approved" : "Application rejected");
      setApproveTarget(null);
      setRejectTarget(null);
      await loadApplications();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setProcessing(false);
    }
  };

  const filtered = applications;

  return (
    <Card className={compact ? "border-primary/20 bg-card/50 backdrop-blur" : "border-orange-500/20 bg-orange-500/5"}>
      <CardHeader className={compact ? undefined : "pb-3"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Partner Applications
            </CardTitle>
            <CardDescription>Review Official Partner requests — accept or refuse</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void loadApplications()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading applications…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No applications found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => (
              <div
                key={app.id}
                className="rounded-lg border border-white/10 bg-background/40 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{app.server_name}</p>
                      <Badge variant={STATUS_BADGE[app.status] || "outline"}>{app.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {app.discord_username ? `@${app.discord_username}` : app.user_id} ·{" "}
                      {new Date(app.created_at).toLocaleString()}
                    </p>
                  </div>
                  {app.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openApprove(app)}>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openReject(app)}>
                        <X className="h-4 w-4 mr-1" />
                        Refuse
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Server type</p>
                    <p>{SERVER_TYPE_LABELS[app.server_type] || app.server_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Peak players</p>
                    <p>{app.peak_players.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Discord</p>
                    <a
                      href={app.discord_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline inline-flex items-center gap-1 break-all"
                    >
                      {app.discord_link}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                </div>
                {app.admin_notes ? (
                  <p className="text-xs text-slate-400 border-t border-white/5 pt-2">
                    Notes: {app.admin_notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept partner application</DialogTitle>
            <DialogDescription>
              Approve <strong>{approveTarget?.server_name}</strong> as an Official Partner. A logo URL is required to publish on the partners page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Logo URL *</Label>
              <Input
                value={approveLogo}
                onChange={(e) => setApproveLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <Label>Display order</Label>
              <Input
                type="number"
                value={approveOrder}
                onChange={(e) => setApproveOrder(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={() => void submitReview("approved")} disabled={processing || !approveLogo.trim()}>
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuse partner application</DialogTitle>
            <DialogDescription>
              Decline the application from <strong>{rejectTarget?.server_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for refusal (internal / sent to applicant)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void submitReview("rejected")} disabled={processing}>
              Refuse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
