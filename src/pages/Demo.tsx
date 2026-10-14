import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users,
  Car,
  UserX,
  Box,
  Shield,
  Activity,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Ban,
  Home,
  Eye,
  Copy,
  Pencil,
  Check,
  X,
 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FallingPapers } from "@/components/FallingPapers";
import { buildAnalyticsSeries } from "@/lib/dashboard-analytics";
import { MetricCard, DistributionDonutChart, ServerAnalyticsChart } from "@/components/dashboard/DashboardCharts";
import { toast } from "sonner";

const DEMO_LICENSE_KEY = "demo-a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const DEMO_IP = "127.0.0.1:30120";

const mockPlayers = [
  { player_id: "1", player_name: "ProGamer2024", ping: 23, status: "online" as const },
  { player_id: "2", player_name: "RacingKing", ping: 45, status: "online" as const },
  { player_id: "3", player_name: "NightRider", ping: 67, status: "online" as const },
  { player_id: "4", player_name: "SilentStorm", ping: 34, status: "online" as const },
  { player_id: "5", player_name: "PhoenixX", ping: 89, status: "afk" as const },
];

const mockRecentActions = [
  { type: "ban" as const, player: "Hacker123", reason: "Anti Noclip Detection", time: "2 min ago" },
  { type: "kick" as const, player: "Suspect456", reason: "Anti Speedhack", time: "15 min ago" },
  { type: "warn" as const, player: "NewPlayer99", reason: "Suspicious behavior", time: "32 min ago" },
  { type: "detection" as const, player: "UnknownX", reason: "Anti Godmode triggered", time: "1 hour ago" },
];

const demoStats = {
  playerCount: 52,
  peakPlayers: 89,
  totalBans: 234,
  totalKicks: 156,
  totalWarns: 89,
};

export default function Demo() {
  const navigate = useNavigate();
  const [analyticsSeries, setAnalyticsSeries] = useState(
    buildAnalyticsSeries(Array(24).fill(demoStats.playerCount), Array(24).fill(0)),
  );
  const [licenseVisible, setLicenseVisible] = useState(false);
  const [ipDraft, setIpDraft] = useState(DEMO_IP);
  const [serverIp, setServerIp] = useState(DEMO_IP);
  const [ipEditing, setIpEditing] = useState(false);

  useEffect(() => {
    const players = Array.from({ length: 24 }, (_, i) =>
      i === 23 ? demoStats.playerCount : Math.floor(120 + Math.sin(i / 3) * 90 + Math.random() * 25),
    );
    const bans = Array.from({ length: 24 }, (_, i) =>
      Math.max(0, Math.floor(4 + Math.sin(i / 2) * 3 + Math.random() * 2)),
    );
    setAnalyticsSeries(buildAnalyticsSeries(players, bans));
  }, []);

  const protectionStats = useMemo(
    () => [
      { name: "Anti Noclip", detections: Math.floor(demoStats.totalBans * 0.3) },
      { name: "Anti Godmode", detections: Math.floor(demoStats.totalBans * 0.2) },
      { name: "Anti Speedhack", detections: Math.floor(demoStats.totalBans * 0.25) },
      { name: "Anti Teleport", detections: Math.floor(demoStats.totalBans * 0.15) },
      { name: "Anti Aimbot", detections: Math.floor(demoStats.totalBans * 0.1) },
    ],
    [],
  );

  const actionBreakdown = useMemo(
    () => [
      { name: "Bans", value: demoStats.totalBans },
      { name: "Kicks", value: demoStats.totalKicks },
      { name: "Warns", value: demoStats.totalWarns },
    ],
    [],
  );

  const detectionBreakdown = useMemo(
    () => protectionStats.map((s) => ({ name: s.name.replace(/^Anti /, ""), value: s.detections })),
    [protectionStats],
  );

  const copyLicense = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_LICENSE_KEY);
      toast.success("License key copied (demo)");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleSaveIp = () => {
    const trimmed = ipDraft.trim();
    if (!trimmed) {
      toast.error("Server IP is required");
      return;
    }
    setServerIp(trimmed);
    setIpEditing(false);
    toast.success("Server IP updated (demo)");
  };

  const demoAction = (label: string) => {
    toast.info(`${label} — demo only`);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden p-3 md:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.08),transparent_50%)]" />
      <FallingPapers />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden">
        {/* Server Header */}
        <Card className="shrink-0 border-white/[0.08] bg-[#0a101c]/95 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">Demo FiveM Server</h1>
                <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500">
                  <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  Online
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Last update: {new Date().toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
              <div className="min-w-[5.5rem] text-center">
                <p className="text-[13px] font-medium text-slate-400">AC Version</p>
                <p className="text-lg font-bold tabular-nums text-sky-400">6.0.0.8</p>
              </div>
              <div className="min-w-[14rem]">
                <p className="text-[13px] font-medium text-slate-400">Server IP</p>
                <div className="mt-1 flex items-center gap-2">
                  {ipEditing ? (
                    <>
                      <input
                        value={ipDraft}
                        onChange={(e) => setIpDraft(e.target.value)}
                        className="h-9 w-44 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-200 outline-none focus:border-sky-500/40"
                        placeholder="e.g. 127.0.0.1:30120"
                      />
                      <Button size="sm" className="h-9 bg-sky-500 text-black hover:bg-sky-400" onClick={handleSaveIp}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
                        onClick={() => {
                          setIpDraft(serverIp);
                          setIpEditing(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-sm text-slate-200">{serverIp}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 gap-2 border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
                        onClick={() => setIpEditing(true)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="min-w-[18rem]">
                <p className="text-[13px] font-medium text-slate-400">License Key</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-mono text-sm text-slate-200">
                    {licenseVisible ? DEMO_LICENSE_KEY : "••••••••••••••••••••"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
                    onClick={() => setLicenseVisible((v) => !v)}
                    title={licenseVisible ? "Hide" : "Show"}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 gap-2 border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
                    onClick={copyLicense}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">License</p>
                <p className="font-bold text-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Expires</p>
                <p className="font-bold text-green-500">Never</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard icon={Users} label="Connections" value={demoStats.playerCount} accent="emerald" />
          <MetricCard icon={TrendingUp} label="Total Players" value={demoStats.peakPlayers} accent="cyan" />
          <MetricCard icon={UserX} label="Kicks" value={demoStats.totalKicks} accent="rose" />
          <MetricCard icon={Ban} label="Bans" value={demoStats.totalBans} accent="rose" />
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-2 overflow-hidden">
          <div className="grid min-h-0 grid-cols-1 gap-2 xl:grid-cols-12">
            <div className="min-h-0 xl:col-span-6">
              <ServerAnalyticsChart data={analyticsSeries} />
            </div>
            <div className="min-h-0 xl:col-span-3">
              <DistributionDonutChart
                title="Drop Reasons"
                subtitle="last 24h"
                data={actionBreakdown}
                centerLabel="drops"
              />
            </div>
            <div className="min-h-0 xl:col-span-3">
              <DistributionDonutChart
                title="Detections"
                subtitle="last 24h"
                data={detectionBreakdown}
                centerLabel="bans"
              />
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-12">
            <Card className="flex min-h-0 flex-col border-white/[0.08] bg-[#0a101c]/95 p-3 lg:col-span-4">
              <div className="mb-1.5 flex shrink-0 items-center justify-between">
                <h3 className="text-sm font-semibold">Online Players</h3>
                <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500">
                  {demoStats.playerCount}
                </Badge>
              </div>
              <div className="min-h-0 flex-1 space-y-1 overflow-hidden">
                {mockPlayers.map((player) => (
                  <div
                    key={player.player_id}
                    className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2 py-1.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${player.status === "online" ? "bg-green-500" : "bg-yellow-500"}`}
                      />
                      <span className="truncate text-xs font-medium">{player.player_name}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{player.ping}ms</span>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-1.5 h-7 shrink-0 border-white/[0.08] bg-white/[0.03] text-xs"
                onClick={() => navigate("/demo/players")}
              >
                View All Players
              </Button>
            </Card>

            <Card className="flex min-h-0 flex-col border-white/[0.08] bg-[#0a101c]/95 p-3 lg:col-span-4">
              <div className="mb-1.5 flex shrink-0 items-center justify-between">
                <h3 className="text-sm font-semibold">Recent Actions</h3>
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="space-y-1 overflow-hidden">
                {mockRecentActions.slice(0, 4).map((action, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {action.type === "ban" && <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                      {action.type === "kick" && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500" />}
                      {action.type === "warn" && <Eye className="h-3.5 w-3.5 shrink-0 text-orange-500" />}
                      {action.type === "detection" && <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{action.player}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{action.reason}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{action.time}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex min-h-0 flex-col border-white/[0.08] bg-[#0a101c]/95 p-3 lg:col-span-4">
              <h3 className="mb-2 shrink-0 text-sm font-semibold">Quick Actions</h3>
              <div className="flex flex-col justify-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start gap-2 border-white/[0.08] bg-white/[0.03] text-xs"
                  onClick={() => demoAction("Delete All Vehicles")}
                >
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                  Delete All Vehicles
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start gap-2 border-white/[0.08] bg-white/[0.03] text-xs"
                  onClick={() => demoAction("Delete All NPCs")}
                >
                  <UserX className="h-3.5 w-3.5 text-muted-foreground" />
                  Delete All NPCs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start gap-2 border-white/[0.08] bg-white/[0.03] text-xs"
                  onClick={() => demoAction("Delete All Objects")}
                >
                  <Box className="h-3.5 w-3.5 text-muted-foreground" />
                  Delete All Objects
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
