import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Package, 
  ShieldCheck, 
  Terminal, 
  AlertTriangle, 
  HelpCircle, 
  ExternalLink,
  CheckCircle2,
  FileCode,
  Lock,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-base";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type AcFileRow = {
  id: string;
  filename: string;
  file_path: string;
  file_size: number | null;
  version: string | null;
  uploaded_at: string | null;
  is_active: boolean | number | null;
};

function formatBytes(bytes?: number | null) {
  if (bytes == null || Number(bytes) <= 0) return "1.6 MB";
  const kb = 1024;
  const mb = kb * 1024;
  if (bytes < kb) return `${bytes} B`;
  if (bytes < mb) return `${(bytes / kb).toFixed(1)} KB`;
  return `${(bytes / mb).toFixed(1)} MB`;
}

export default function DownloadPage() {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const location = window.location;
  const isDemo = !serverId || serverId === "demo" || window.location.pathname.startsWith("/demo");

  const { user, loading: authLoading } = useUserAuth();
  const { isLicenseOwner, isLoading: permsLoading } = useAdminPermissions();

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [airshieldFile, setAirshieldFile] = useState<AcFileRow | null>(null);

  useEffect(() => {
    if (isDemo) return; // In demo mode, permit viewing page but disable downloading
    if (authLoading || permsLoading) return;
    if (!user) return;
    if (!isLicenseOwner) {
      toast.error("Only the license owner can access downloads for this server.");
      navigate(serverId ? `/${serverId}/dashboard` : "/");
    }
  }, [authLoading, permsLoading, user, isLicenseOwner, navigate, serverId, isDemo]);

  useEffect(() => {
    const loadBuildInfo = async () => {
      try {
        const r = await fetch(apiUrl("/api/anticheat/builds"), { credentials: "include" });
        if (r.ok) {
          const j = await r.json();
          if (j?.files?.airshield) {
            setAirshieldFile(j.files.airshield);
          }
        }
      } catch (e) {
        console.error("[DownloadPage] build fetch error", e);
      }
    };
    loadBuildInfo();
  }, []);

  const handleDownload = useCallback(async () => {
    if (isDemo) {
      toast.error("Downloads are disabled in Demo Mode. Please purchase a license to download VexShield Anticheat.", {
        action: {
          label: "View Plans",
          onClick: () => navigate("/pricing"),
        },
      });
      return;
    }

    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(10);

    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        const next = prev + Math.random() * 18;
        return next > 90 ? 90 : next;
      });
    }, 250);

    try {
      const response = await fetch(apiUrl("/api/anticheat/download?product=airshield"), {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      clearInterval(progressInterval);
      setDownloadProgress(100);

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "VexShield.zip";
      if (contentDisposition && contentDisposition.includes("filename=")) {
        filename = contentDisposition.split("filename=")[1].replace(/"/g, "").trim();
      }

      setTimeout(() => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsDownloading(false);
        setDownloadProgress(0);
        toast.success("VexShield Anticheat downloaded successfully!");

        supabase.from("notifications")
          .update({ is_read: true })
          .eq("type", "new_update")
          .then(() => {})
          .catch(() => {});
      }, 400);

    } catch (err: unknown) {
      clearInterval(progressInterval);
      setIsDownloading(false);
      setDownloadProgress(0);
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }, [isDownloading]);

  if (authLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1017]">
        <Loader2 className="h-10 w-10 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-4 md:p-6 relative overflow-hidden flex flex-col justify-start bg-[#0F1017]">
      {/* Top glowing ambient effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(56,189,248,0.12),transparent_50%)] pointer-events-none z-0" />

      <div className="w-full max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Package className="h-6 w-6 text-sky-400" />
              Secure Downloads
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 font-medium">
              Download the latest version of VexShield Anti-Cheat for your server.
            </p>
          </div>
          
          <div className={cn(
            "flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 self-start md:self-auto",
            isDemo 
              ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
              : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
          )}>
            <span className="relative flex h-2 w-2">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isDemo ? "bg-amber-400" : "bg-emerald-400")}></span>
              <span className={cn("relative inline-flex rounded-full h-2 w-2", isDemo ? "bg-amber-500" : "bg-emerald-500")}></span>
            </span>
            {isDemo ? "Demo Preview (Download Disabled)" : "Authorized License Session"}
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Animated Download Card */}
          <Card className="h-full lg:col-span-5 bg-[#0a0a0a] border-white/10 shadow-2xl flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  Download VexShield
                </CardTitle>
                <Badge variant="outline" className={cn(
                  "text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-md",
                  isDemo 
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300" 
                    : "border-blue-500/30 bg-blue-500/10 text-blue-400"
                )}>
                  {isDemo ? "DEMO MODE" : "PRODUCTION READY"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Core Server Anticheat framework (.zip / .rar)
              </CardDescription>
            </CardHeader>

            <CardContent className="py-8 flex flex-col items-center justify-center space-y-6">
              
              {/* Interactive Circular Download Button */}
              <div
                onClick={handleDownload}
                className={`
                  group relative mx-auto w-44 h-44 flex items-center justify-center
                  ${isDownloading ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {/* Outer Ring Animation */}
                <div
                  className={`
                    absolute w-full h-full rounded-full transition-all duration-300
                    ${isDownloading
                      ? "border-4 border-blue-500/40 animate-pulse"
                      : "border-2 border-blue-500/20 group-hover:border-blue-500/50 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(56,189,248,0.2)]"
                    }
                  `}
                />

                {/* Middle Animated Pulse Ring */}
                {!isDownloading && (
                  <div className="absolute w-[88%] h-[88%] rounded-full border-2 border-blue-500/10 group-hover:scale-110 group-hover:border-blue-500/30 transition-all duration-500" />
                )}

                {/* Inner Circle Button */}
                <div
                  className={`
                    relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center
                    shadow-2xl bg-[#0c1017] border border-blue-500/30 transition-all duration-300
                    ${isDownloading ? "bg-[#06080d]" : "group-hover:shadow-[0_0_30px_rgba(56,189,248,0.25)] group-hover:bg-[#111722] group-hover:border-blue-500/60"}
                  `}
                >
                  {isDownloading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      {/* Circular Progress SVG */}
                      <svg className="w-full h-full absolute inset-0 p-1" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="rgba(56,189,248,0.1)"
                          strokeWidth="5"
                          fill="none"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="#38bdf8"
                          strokeWidth="5"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray="263.8"
                          strokeDashoffset={263.8 - (downloadProgress / 100) * 263.8}
                          transform="rotate(-90 50 50)"
                          className="transition-all duration-300 ease-in-out"
                        />
                      </svg>

                      {/* Percentage Display */}
                      <div className="flex flex-col items-center justify-center z-10">
                        <span className="text-xl font-black text-white">
                          {Math.round(downloadProgress)}%
                        </span>
                        <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
                          Downloading...
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Download className="h-9 w-9 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-white">
                        {isDemo ? "Demo Mode" : "Download"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Build Info Metadata Box */}
              <div className="w-full grid grid-cols-3 gap-2 bg-[#050505] border border-white/10 rounded-xl p-3 text-center">
                <div>
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">File Name</div>
                  <div className="text-xs font-mono font-bold text-white truncate mt-0.5">
                    {airshieldFile?.filename || "VexShield.zip"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Version</div>
                  <div className="text-xs font-bold text-blue-400 mt-0.5 flex items-center justify-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    v{airshieldFile?.version || "1.0"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Package Size</div>
                  <div className="text-xs font-bold text-zinc-200 mt-0.5">
                    {formatBytes(airshieldFile?.file_size)}
                  </div>
                </div>
              </div>

            </CardContent>

            <div className="p-4 border-t border-white/[0.06] bg-black/40 rounded-b-xl">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className={cn(
                  "w-full h-11 text-xs rounded-xl shadow-lg gap-2 font-black transition-all",
                  isDemo 
                    ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                    : "bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-[0_2px_14px_rgba(124,58,237,0.35)]"
                )}
              >
                <Download className="h-4 w-4 text-white" />
                {isDemo ? "DOWNLOAD DISABLED IN DEMO" : isDownloading ? "Downloading Bundle..." : "DOWNLOAD BUNDLE (.ZIP)"}
              </Button>
            </div>
          </Card>

          {/* Right Column: Installation Guide Card */}
          <Card className="h-full lg:col-span-7 bg-[#0a0a0a] border-white/10 shadow-2xl flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-white" />
                  Installation Guide
                </CardTitle>
                <a
                  href="https://discord.gg/5WgtMWbtgD"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-zinc-400 hover:text-white hover:underline flex items-center gap-1 font-medium transition-colors"
                >
                  Read documentation <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Follow these quick steps to install and start VexShield on your FiveM server.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              <Tabs defaultValue="steps" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-5 bg-[#0F1017] border border-white/10 p-1 rounded-xl">
                  <TabsTrigger value="steps" className="text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 rounded-lg transition-all">
                    <Terminal className="h-3.5 w-3.5" />
                    Quick Installation Steps
                  </TabsTrigger>
                  <TabsTrigger value="issues" className="text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400 rounded-lg transition-all">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Common Issues
                  </TabsTrigger>
                </TabsList>

                {/* Steps Tab */}
                <TabsContent value="steps" className="mt-0 space-y-4">
                  <div className="space-y-4">
                    
                    {/* Step 1 */}
                    <div className="flex items-start gap-3 bg-[#050505] p-3.5 rounded-xl border border-white/5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white border border-white/20 text-xs font-bold">
                        1
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Extract the VexShield folder
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Unzip the downloaded package into your FiveM server's <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">/resources</code> directory (directly in resources, not nested).
                        </p>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Step 2 */}
                    <div className="flex items-start gap-3 bg-[#050505] p-3.5 rounded-xl border border-white/5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white border border-white/20 text-xs font-bold">
                        2
                      </div>
                      <div className="w-full">
                        <p className="text-xs font-semibold text-slate-200">
                          Add permissions to your server.cfg
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Add the following code lines near the TOP of your <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">server.cfg</code> file:
                        </p>
                        <div className="mt-2 rounded-lg bg-[#0F1017] border border-white/10 p-3 font-mono text-xs text-zinc-200 space-y-1">
                          <div className="text-white font-semibold">ensure VexShield</div>
                          <div className="text-zinc-300">add_ace resource.VexShield command allow</div>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Step 3 */}
                    <div className="flex items-start gap-3 bg-[#050505] p-3.5 rounded-xl border border-white/5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white border border-white/20 text-xs font-bold">
                        3
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Configure & Start your server
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Customize your anticheat options in <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">VexShield/config.lua</code> or via this website dashboard, then start your server.
                        </p>
                      </div>
                    </div>

                  </div>
                </TabsContent>

                {/* Issues Tab */}
                <TabsContent value="issues" className="mt-0 space-y-4">
                  <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-200 rounded-xl p-3.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <AlertTitle className="text-xs font-bold text-amber-300 ml-2">
                      Important Rules & Common Issues
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-xs text-amber-200/90 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>You <strong>CANNOT</strong> rename the script folder. It must be named exactly <code className="text-amber-300 font-mono">VexShield</code>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>VexShield must be started <strong>BEFORE</strong> any other gameplay resources in <code className="text-amber-300 font-mono">server.cfg</code>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>The folder must be placed directly inside <code className="text-amber-300 font-mono">/resources</code>, not inside subfolders.</span>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 rounded-xl border border-white/10 bg-[#050505] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/10 border border-white/20 text-white">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Need Technical Support?</h4>
                        <p className="text-[11px] text-slate-400">Join our Discord community for 24/7 assistance.</p>
                      </div>
                    </div>
                    <a
                      href="https://discord.gg/5WgtMWbtgD"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-bold transition-colors"
                    >
                      Join Discord
                    </a>
                  </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
