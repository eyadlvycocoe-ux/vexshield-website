import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiUrl, apiMutationHeaders, ensureMutationCsrf } from "@/lib/api-base";
import { formatBanDateTime } from "@/lib/ban-dates";
import {
  ArrowLeft,
  RefreshCw,
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface RemovalRequest {
  id: string;
  server_id: string;
  server_name?: string | null;
  ban_id: string;
  player_name?: string | null;
  player_id?: string | null;
  ban_reason?: string | null;
  ban_mode?: string | null;
  ban_still_active?: number | boolean;
  requested_by_discord_id: string;
  requested_by_email?: string | null;
  reason: string;
  proofs: string[];
  status: "pending" | "approved" | "denied" | string;
  reviewed_by_discord_id?: string | null;
  reviewer_level?: number | null;
  review_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

interface Counts {
  pending: number;
  approved: number;
  denied: number;
}

function statusBadge(status: string) {
  if (status === "pending") {
    return (
      <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" variant="outline">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" variant="outline">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20" variant="outline">
      <XCircle className="mr-1 h-3 w-3" />
      Denied
    </Badge>
  );
}

export default function AdminBanRemovalRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RemovalRequest[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, denied: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "denied">("pending");
  const [reviewTarget, setReviewTarget] = useState<RemovalRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "denied">("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const loadRequests = useCallback(
    async (showToast = false) => {
      try {
        const qs = statusFilter === "all" ? "" : `?status=${statusFilter}`;
        const res = await fetch(apiUrl(`/api/admin/ban-removal-requests${qs}`), {
          credentials: "include",
          headers: { "X-AirCore-Client": "1" },
        });
        if (res.status === 403) {
          setForbidden(true);
          return;
        }
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Failed to load removal requests");
        setForbidden(false);
        setRequests(Array.isArray(body.requests) ? body.requests : []);
        if (body.counts) setCounts(body.counts);
        if (showToast) toast.success("Requests refreshed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load removal requests");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    setLoading(true);
    void loadRequests();
  }, [loadRequests]);

  const submitReview = async () => {
    if (!reviewTarget) return;
    setReviewing(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl(`/api/admin/ban-removal-requests/${encodeURIComponent(reviewTarget.id)}/review`), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ decision: reviewDecision, review_note: reviewNote.trim() || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Review failed");
      toast.success(
        reviewDecision === "approved"
          ? "Approved — the record is now hidden from Ban History (statistics preserved)."
          : "Denied — the record stays visible in Ban History.",
      );
      setReviewTarget(null);
      setReviewNote("");
      void loadRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setReviewing(false);
    }
  };

  if (forbidden) {
    return (
      <div className="min-h-screen p-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(239,68,68,0.08),transparent_50%)] pointer-events-none" />
        <div className="max-w-3xl mx-auto space-y-6 relative z-10 flex flex-col items-center justify-center min-h-[60vh]">
          <Gavel className="h-12 w-12 text-rose-500/60" />
          <h1 className="text-xl font-black text-white">Staff level 4+ required</h1>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Ban History removal requests can only be reviewed by staff with level 4 (Moderator) or higher.
          </p>
          <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Button>
        </div>
      </div>
    );
  }

  const visibleRequests = statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter);

  return (
    <div className="min-h-screen p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.07),transparent_50%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate("/admin")} className="border-white/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Gavel className="h-6 w-6 text-sky-400" />
                Ban History Removal Requests
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Server owners request removal of historical bans — approve to hide the record (statistics preserved), deny to keep it.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              setRefreshing(true);
              await loadRequests(true);
            }}
            disabled={refreshing}
            className="gap-2 border-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-amber-500/20 bg-card/40 backdrop-blur">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-black tabular-nums text-amber-300">{counts.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-card/40 backdrop-blur">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-black tabular-nums text-emerald-300">{counts.approved}</p>
            </CardContent>
          </Card>
          <Card className="border-rose-500/20 bg-card/40 backdrop-blur">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Denied
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-black tabular-nums text-rose-300">{counts.denied}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(["pending", "approved", "denied", "all"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className={
                statusFilter === s
                  ? "bg-sky-500 hover:bg-sky-400 text-white font-bold capitalize"
                  : "border-white/10 capitalize"
              }
            >
              {s}
            </Button>
          ))}
        </div>

        {/* Requests */}
        <Card className="border-white/10 bg-card/40 backdrop-blur">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base font-black">Requests</CardTitle>
            <CardDescription className="text-xs">
              {loading ? "Loading..." : `${visibleRequests.length} request(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
              </div>
            ) : visibleRequests.length === 0 ? (
              <div className="py-16 text-center">
                <Gavel className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-muted-foreground">No {statusFilter === "all" ? "" : statusFilter} requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Server</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Player</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Ban reason</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Removal reason</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Proofs</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Requested</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRequests.map((r) => (
                      <TableRow key={r.id} className="border-white/10">
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold">{r.server_name || r.server_id}</div>
                          <div className="text-[11px] text-muted-foreground">
                            by {r.requested_by_email || r.requested_by_discord_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold">{r.player_name || "Unknown"}</div>
                          <div className="text-[11px] text-muted-foreground">{r.ban_mode || ""}</div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <p className="truncate text-xs text-muted-foreground" title={r.ban_reason || ""}>
                            {r.ban_reason || "—"}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-[240px]">
                          <p className="truncate text-xs" title={r.reason}>
                            {r.reason}
                          </p>
                          {r.review_note ? (
                            <p className="truncate text-[11px] text-muted-foreground" title={r.review_note}>
                              Note: {r.review_note}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {r.proofs?.length ? (
                            <div className="flex flex-col gap-0.5">
                              {r.proofs.slice(0, 2).map((p, i) => (
                                <a
                                  key={i}
                                  href={p}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Proof {i + 1}
                                </a>
                              ))}
                              {r.proofs.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">+{r.proofs.length - 2} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatBanDateTime(r.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "pending" ? (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setReviewTarget(r);
                                  setReviewDecision("approved");
                                  setReviewNote("");
                                }}
                                className="h-8 gap-1.5 bg-emerald-500 font-bold text-white hover:bg-emerald-400"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setReviewTarget(r);
                                  setReviewDecision("denied");
                                  setReviewNote("");
                                }}
                                className="h-8 gap-1.5 bg-rose-500 font-bold text-white hover:bg-rose-400"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Deny
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {r.reviewed_at ? formatBanDateTime(r.reviewed_at) : ""}
                              {r.reviewer_level ? ` · L${r.reviewer_level}` : ""}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review confirm dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
        <DialogContent className="border-white/15 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDecision === "approved" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400" />
              )}
              {reviewDecision === "approved" ? "Approve removal request" : "Deny removal request"}
            </DialogTitle>
            <DialogDescription>
              {reviewDecision === "approved"
                ? `The ban record for ${reviewTarget?.player_name || "this player"} will be hidden from Ban History. Homepage statistics stay untouched.`
                : `The ban record for ${reviewTarget?.player_name || "this player"} stays visible in Ban History. The owner can submit a new request later.`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Review note (optional)
            </label>
            <Textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Visible to the server owner in the decision notification..."
              className="text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitReview()}
              disabled={reviewing}
              className={
                reviewDecision === "approved"
                  ? "bg-emerald-500 font-bold text-white hover:bg-emerald-400"
                  : "bg-rose-500 font-bold text-white hover:bg-rose-400"
              }
            >
              {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm {reviewDecision === "approved" ? "approval" : "denial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
