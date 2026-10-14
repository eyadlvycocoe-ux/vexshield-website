import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LifeBuoy,
  ArrowLeft,
  Server,
  Plus,
  Circle,
  ShieldCheck,
  Sparkles,
  Activity,
  Clock,
  Shield,
  Users,
  Radio,
  ExternalLink,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { apiMutationHeaders, apiUrl, ensureMutationCsrf } from "@/lib/api-base";
import { useRequireSiteSupport } from "@/hooks/useRequireSiteSupport";
import { SupportDeskServersPanel } from "@/components/SupportDeskServersPanel";
import { PartnerApplicationsPanel } from "@/components/PartnerApplicationsPanel";
import { cn } from "@/lib/utils";

interface ServerQuota {
  month_key: string;
  quota: Record<string, number>;
  used: Record<string, boolean>;
}

export default function StaffPanel() {
  const navigate = useNavigate();
  const { ok, checking } = useRequireSiteSupport();
  const [quota, setQuota] = useState<ServerQuota | null>(null);
  const [creatingServer, setCreatingServer] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newServerIp, setNewServerIp] = useState("");
  const [newServerName, setNewServerName] = useState("");
  const [panelTab, setPanelTab] = useState<"servers" | "partners">("servers");
  const [onDuty, setOnDuty] = useState(false);
  const [dutyUpdatedAt, setDutyUpdatedAt] = useState<string | null>(null);
  const [dutyLoading, setDutyLoading] = useState(true);
  const [dutySaving, setDutySaving] = useState(false);

  const loadQuota = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/desk/server-quota"), { credentials: "include" });
      if (res.ok) setQuota(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const loadDuty = useCallback(async () => {
    setDutyLoading(true);
    try {
      const res = await fetch(apiUrl("/desk/duty"), { credentials: "include" });
      if (res.ok) {
        const j = (await res.json()) as { on_duty?: boolean; updated_at?: string | null };
        setOnDuty(!!j.on_duty);
        setDutyUpdatedAt(j.updated_at || null);
      }
    } catch {
      /* ignore */
    } finally {
      setDutyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ok || checking) return;
    void loadQuota();
    void loadDuty();
  }, [ok, checking, loadQuota, loadDuty]);

  const toggleDuty = async (next: boolean) => {
    setDutySaving(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl("/desk/duty"), {
        method: "PATCH",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ on_duty: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || "Failed to update duty");
      setOnDuty(!!(j as { on_duty?: boolean }).on_duty);
      setDutyUpdatedAt((j as { updated_at?: string | null }).updated_at || null);
      toast.success(next ? "You are now on duty" : "You are now off duty");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update duty");
      void loadDuty();
    } finally {
      setDutySaving(false);
    }
  };

  const openCreateServerModal = () => {
    setNewServerIp("");
    setNewServerName("");
    setCreateModalOpen(true);
  };

  const createSupportServer = async () => {
    const serverIp = newServerIp.trim();
    if (!serverIp) {
      toast.error("Server IP is required");
      return;
    }
    setCreatingServer(true);
    try {
      await ensureMutationCsrf();
      const res = await fetch(apiUrl("/desk/servers"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          duration: "1month",
          server_ip: serverIp,
          display_name: newServerName.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Create failed");
      toast.success(`Server ${j.server_id} created (1 month)`);
      setCreateModalOpen(false);
      await loadQuota();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create server");
    } finally {
      setCreatingServer(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050B14] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-500" />
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400/80">Authenticating Staff Gate...</span>
        </div>
      </div>
    );
  }

  if (!ok) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050B14] text-slate-300 p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-rose-500/10 blur-[140px]" />
        <div className="relative z-10 max-w-md w-full text-center space-y-5 rounded-2xl border border-rose-500/20 bg-[#081322]/90 backdrop-blur-xl p-8 shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Access Restricted</h2>
            <p className="text-xs text-zinc-400 mt-1.5">Elevated staff permissions are required to enter the Support Center.</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isQuotaUsed = !!quota?.used?.["1month"];

  return (
    <div className="min-h-screen bg-[#040811] text-slate-100 relative overflow-hidden font-['Inter',sans-serif]">
      {/* Dynamic Ambient Glows */}
      <div className="pointer-events-none absolute -top-48 left-1/4 h-[600px] w-[600px] rounded-full bg-amber-500/10 blur-[160px]" />
      <div className="pointer-events-none absolute top-1/3 -right-36 h-[600px] w-[600px] rounded-full bg-cyan-600/10 blur-[160px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[150px]" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col min-h-screen gap-6 relative z-10">
        {/* Top Operations Header */}
        <div className="rounded-2xl border border-white/10 bg-[#081220]/80 backdrop-blur-xl p-5 md:p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white shrink-0 h-10 w-10 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Support Command Center
                </h1>
                <span className="text-[10px] font-mono tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  LEVEL 2+ DESK
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl">
                Real-time server management, ban investigation, partner processing, and live staff duty coordination.
              </p>
            </div>
          </div>

          {/* Right Action Cluster: Duty Switch & Segmented Tabs */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Duty Card Pill */}
            <div
              className={cn(
                "flex items-center gap-3 px-3.5 py-2 rounded-xl border backdrop-blur-md transition-all",
                onDuty
                  ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : "border-white/10 bg-white/[0.03]"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Circle
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 transition-colors",
                    onDuty ? "fill-emerald-400 text-emerald-400" : "fill-slate-500 text-slate-500"
                  )}
                />
                {onDuty && (
                  <span className="absolute h-4 w-4 rounded-full bg-emerald-400/40 animate-ping" />
                )}
              </div>
              <div className="min-w-0 pr-1">
                <p className="text-xs font-bold leading-none text-white">
                  {dutyLoading ? "Syncing..." : onDuty ? "On Duty" : "Off Duty"}
                </p>
                {dutyUpdatedAt && (
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 text-slate-500" />
                    {new Date(dutyUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <Switch
                checked={onDuty}
                disabled={dutyLoading || dutySaving}
                onCheckedChange={(v) => void toggleDuty(v)}
                className="data-[state=checked]:bg-emerald-500"
                aria-label="Toggle support duty"
              />
            </div>

            {/* Segmented View Switcher */}
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPanelTab("servers")}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  panelTab === "servers"
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Server className="h-3.5 w-3.5" />
                Fleet & Bans
              </button>
              <button
                type="button"
                onClick={() => setPanelTab("partners")}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  panelTab === "partners"
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                Partner Ingestion
              </button>
            </div>
          </div>
        </div>

        {/* Quota Banner */}
        {quota && (
          <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.08)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Monthly Server Allocation Quota</h3>
                  <span className="text-[11px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
                    {quota.month_key}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Staff members are entitled to generate 1 verified 1-month test server per billing month.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                size="sm"
                variant={isQuotaUsed ? "secondary" : "default"}
                disabled={isQuotaUsed || creatingServer}
                onClick={openCreateServerModal}
                className={cn(
                  "rounded-xl h-10 px-4 text-xs font-bold transition-all gap-1.5",
                  isQuotaUsed
                    ? "bg-white/[0.05] border border-white/10 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/20"
                )}
              >
                <Plus className="h-4 w-4" />
                {isQuotaUsed ? "Monthly Quota Claimed" : "Provision 1-Month Server"}
              </Button>
            </div>
          </div>
        )}

        {/* Create Server Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="sm:max-w-md bg-[#081322] border-white/10 text-white rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <DialogHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-white">Provision Support Server</DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Auto-generates a 1-month enterprise license key tied to the host IP.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Server Host IP / Domain *</Label>
                <Input
                  placeholder="e.g. 172.96.140.62"
                  value={newServerIp}
                  onChange={(e) => setNewServerIp(e.target.value)}
                  className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus-visible:ring-amber-500/40"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500">The public IPv4 address where this FXServer instance is hosted.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Server Label / Community Name</Label>
                <Input
                  placeholder="e.g. VexShield Roleplay Community"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus-visible:ring-amber-500/40"
                />
              </div>

              <div className="pt-2">
                <Button
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/25"
                  disabled={creatingServer || !newServerIp.trim()}
                  onClick={() => void createSupportServer()}
                >
                  {creatingServer ? "Generating License..." : "Confirm & Launch Server"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Panel Content Area */}
        <div className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-[#081322]/60 backdrop-blur-xl p-4 sm:p-6 shadow-[0_0_40px_rgba(0,0,0,0.3)] overflow-auto">
          {panelTab === "servers" ? <SupportDeskServersPanel /> : <PartnerApplicationsPanel />}
        </div>
      </div>
    </div>
  );
}
