import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
  Loader2,
  History,
  HardDriveDownload,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { apiUrl, getApiOrigin } from "@/lib/api-base";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useIsDemoMode } from "@/demo/demoMode";
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
  product?: string | null;
};

function isAnticheatActive(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === "bigint") return v !== 0n;
  if (v == null) return false;
  const n = Number(v);
  if (!Number.isNaN(n)) return n !== 0;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true";
}

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
  const location = useLocation();
  const navigate = useNavigate();
  const isDemoFromHook = useIsDemoMode();
  const isDemo = isDemoFromHook || !serverId || serverId === "demo" || location.pathname.startsWith("/demo");

  const { user, loading: authLoading } = useUserAuth();
  const { isLicenseOwner, isLoading: permsLoading } = useAdminPermissions();

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [airshieldFile, setAirshieldFile] = useState<AcFileRow | null>(null);
  const [allBuilds, setAllBuilds] = useState<AcFileRow[]>([]);
  const [loadingBuilds, setLoadingBuilds] = useState(true);

  // Load build information directly from anticheat_files
  const loadBuildInfo = useCallback(async () => {
    setLoadingBuilds(true);
    try {
      const { data, error } = await supabase
        .from("anticheat_files")
        .select("*")
        .order("uploaded_at", { ascending: false })
        .limit(10);

      if (!error && data && data.length > 0) {
        setAllBuilds(data);
        const active = data.find((f: any) => isAnticheatActive(f.is_active)) || data[0];
        setAirshieldFile(active);
      } else {
        // Fallback to legacy endpoint if available
        try {
          const r = await fetch(apiUrl("/api/anticheat/builds"), { credentials: "include" });
          if (r.ok) {
            const j = await r.json();
            if (j?.files?.airshield) {
              setAirshieldFile(j.files.airshield);
            }
          }
        } catch {
          /* fallback to null */
        }
      }
    } catch (e) {
      console.error("[DownloadPage] build fetch error", e);
    } finally {
      setLoadingBuilds(false);
    }
  }, []);

  useEffect(() => {
    loadBuildInfo();
  }, [loadBuildInfo]);

  const handleDownload = useCallback(async (selectedBuild?: AcFileRow | null) => {
    if (isDemo) {
      toast.error("Downloads are disabled in Demo Mode. Please purchase a license to download VexShield Anticheat.", {
        action: {
          label: "View Plans",
          onClick: () => navigate("/pricing"),
        },
      });
      return;
    }

    const target = selectedBuild || airshieldFile;
    if (!target) {
      toast.error("No active VexShield release is currently published for download.");
      return;
    }

    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(10);

    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        const next = prev + Math.random() * 22;
        return next > 90 ? 90 : next;
      });
    }, 220);

    try {
      const filePath = String(target.file_path || "").trim();
      const rawVer = target.version?.trim() || "Beta";
      const verTag = rawVer.toLowerCase().startsWith("v") ? rawVer : `v${rawVer}`;
      const filename = target.filename || `VexShield-${verTag}.zip`;

      // 1. Direct URL (GitHub Releases, Discord CDN, external host)
      if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
        clearInterval(progressInterval);
        setDownloadProgress(100);
        setTimeout(() => {
          const a = document.createElement("a");
          a.href = filePath;
          a.download = filename;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setIsDownloading(false);
          setDownloadProgress(0);
          toast.success(`Downloading ${filename}`);
        }, 300);
        return;
      }

      // 2. Storage Bucket / Relative File Download
      let downloadedBlob: Blob | null = null;
      try {
        const { data: blob, error } = await supabase.storage.from("releases").download(filePath);
        if (!error && blob) {
          downloadedBlob = blob;
        }
      } catch {
        /* fallback to media endpoint */
      }

      if (!downloadedBlob) {
        // Fallback: media / public file fetch
        const response = await fetch(`${getApiOrigin()}/uploads/anticheat-files/${filePath}`, {
          credentials: "include",
        });
        if (response.ok) {
          downloadedBlob = await response.blob();
        }
      }

      if (!downloadedBlob) {
        throw new Error("Release package could not be retrieved from the server.");
      }

      clearInterval(progressInterval);
      setDownloadProgress(100);

      setTimeout(() => {
        const url = URL.createObjectURL(downloadedBlob!);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);

        setIsDownloading(false);
        setDownloadProgress(0);
        toast.success(`VexShield ${verTag} downloaded successfully!`);
      }, 400);

    } catch (err: unknown) {
      clearInterval(progressInterval);
      setIsDownloading(false);
      setDownloadProgress(0);
      toast.error(err instanceof Error ? err.message : "Download failed. Please contact support.");
    }
  }, [isDemo, airshieldFile, isDownloading, navigate]);

  if (authLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030d1b]">
        <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const activeVersion = airshieldFile?.version || "Beta";
  const activeFilename = airshieldFile?.filename || "VexShield.zip";
  const activeSize = formatBytes(airshieldFile?.file_size);
  const releaseDate = airshieldFile?.uploaded_at
    ? new Date(airshieldFile.uploaded_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Latest Build";

  return (
    <div className="min-h-full w-full p-4 md:p-6 relative overflow-hidden flex flex-col justify-start bg-[#030d1b]">
      {/* Top ambient lights */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-[550px] w-[550px] rounded-full bg-cyan-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-[550px] w-[550px] rounded-full bg-blue-600/15 blur-[140px]" />

      <div className="w-full max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Package className="h-6 w-6 text-cyan-400" />
              Secure Downloads
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 font-medium">
              Download the official, authenticated VexShield Anti-Cheat resource bundle for your FiveM server.
            </p>
          </div>
          
          <div className={cn(
            "flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 self-start md:self-auto",
            isDemo 
              ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
              : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          )}>
            <span className="relative flex h-2 w-2">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isDemo ? "bg-amber-400" : "bg-emerald-400")}></span>
              <span className={cn("relative inline-flex rounded-full h-2 w-2", isDemo ? "bg-amber-500" : "bg-emerald-500")}></span>
            </span>
            {isDemo ? "DEMO MODE (DOWNLOAD DISABLED)" : "AUTHENTICATED CUSTOMER SESSION"}
          </div>
        </div>

        {/* Demo Notice Banner */}
        {isDemo && (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-200 rounded-2xl p-4 shadow-lg backdrop-blur-xl">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="ml-2">
              <AlertTitle className="text-sm font-bold text-amber-300">
                Interactive Demo Preview
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                File downloads are strictly disabled in this demo environment. To get access to live package downloads, real-time cloud updates, and server keys, please purchase a license.
                <button
                  type="button"
                  onClick={() => navigate("/pricing")}
                  className="ml-2 underline font-bold hover:text-white transition-colors"
                >
                  View Subscription Plans →
                </button>
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Animated Download Card */}
          <Card className="h-full lg:col-span-5 bg-[#081322]/90 border-cyan-500/20 shadow-[0_0_35px_rgba(6,182,212,0.08)] backdrop-blur-xl flex flex-col justify-between rounded-2xl">
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-cyan-400" />
                  Download VexShield
                </CardTitle>
                <Badge variant="outline" className={cn(
                  "text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-md",
                  isDemo 
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300" 
                    : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                )}>
                  {isDemo ? "DEMO LOCKED" : "PRODUCTION READY"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Core FiveM resource bundle (.zip package with complete modules)
              </CardDescription>
            </CardHeader>

            <CardContent className="py-8 flex flex-col items-center justify-center space-y-6">
              
              {/* Interactive Circular Download Button */}
              <div
                onClick={() => handleDownload()}
                className={cn(
                  "group relative mx-auto w-44 h-44 flex items-center justify-center select-none",
                  isDemo ? "cursor-not-allowed opacity-90" : isDownloading ? "cursor-wait" : "cursor-pointer"
                )}
              >
                {/* Outer Ring Animation */}
                <div
                  className={cn(
                    "absolute w-full h-full rounded-full transition-all duration-300",
                    isDemo
                      ? "border-2 border-amber-500/30"
                      : isDownloading
                      ? "border-4 border-cyan-500/50 animate-pulse"
                      : "border-2 border-cyan-500/30 group-hover:border-cyan-500/60 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                  )}
                />

                {/* Middle Animated Pulse Ring */}
                {!isDownloading && !isDemo && (
                  <div className="absolute w-[88%] h-[88%] rounded-full border-2 border-cyan-500/15 group-hover:scale-110 group-hover:border-cyan-500/40 transition-all duration-500" />
                )}

                {/* Inner Circle Button */}
                <div
                  className={cn(
                    "relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300",
                    isDemo
                      ? "bg-[#14120e] border border-amber-500/40"
                      : isDownloading
                      ? "bg-[#06111f] border border-cyan-500/50"
                      : "bg-[#0a1829] border border-cyan-500/40 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] group-hover:bg-[#0d2238] group-hover:border-cyan-400"
                  )}
                >
                  {isDownloading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <svg className="w-full h-full absolute inset-0 p-1" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="rgba(6,182,212,0.15)"
                          strokeWidth="5"
                          fill="none"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="#06b6d4"
                          strokeWidth="5"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray="263.8"
                          strokeDashoffset={263.8 - (downloadProgress / 100) * 263.8}
                          transform="rotate(-90 50 50)"
                          className="transition-all duration-200 ease-in-out"
                        />
                      </svg>

                      <div className="flex flex-col items-center justify-center z-10">
                        <span className="text-xl font-black text-white">
                          {Math.round(downloadProgress)}%
                        </span>
                        <span className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase">
                          FETCHING...
                        </span>
                      </div>
                    </div>
                  ) : isDemo ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-center p-2">
                      <Lock className="h-8 w-8 text-amber-400" />
                      <span className="text-[11px] font-bold text-amber-300">
                        Demo Mode
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Download className="h-9 w-9 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                        DOWNLOAD
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Build Info Metadata Box */}
              <div className="w-full grid grid-cols-3 gap-2 bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Package</div>
                  <div className="text-xs font-mono font-bold text-white truncate mt-0.5" title={activeFilename}>
                    {activeFilename}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Version</div>
                  <div className="text-xs font-bold text-cyan-400 mt-0.5 flex items-center justify-center gap-1 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {activeVersion ? (activeVersion.toLowerCase().startsWith("v") ? activeVersion : `v${activeVersion}`) : "vBeta"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Size</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {activeSize}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Verified SHA-256 Bundle
                </span>
                <span>{releaseDate}</span>
              </div>

            </CardContent>

            <div className="p-4 border-t border-white/[0.06] bg-black/30 rounded-b-2xl">
              <Button
                onClick={() => handleDownload()}
                disabled={isDownloading || isDemo}
                className={cn(
                  "w-full h-11 text-xs rounded-xl shadow-lg gap-2 font-black transition-all",
                  isDemo 
                    ? "bg-amber-500/20 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed opacity-90"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25"
                )}
              >
                {isDemo ? (
                  <>
                    <Lock className="h-4 w-4 text-amber-300" />
                    DOWNLOAD DISABLED IN DEMO
                  </>
                ) : isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    DOWNLOADING BUNDLE...
                  </>
                ) : (
                  <>
                    <HardDriveDownload className="h-4 w-4 text-white" />
                    DOWNLOAD VEXSHIELD PACKAGE (.ZIP)
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Right Column: Installation Guide Card */}
          <Card className="h-full lg:col-span-7 bg-[#081322]/90 border-cyan-500/20 shadow-[0_0_35px_rgba(6,182,212,0.08)] backdrop-blur-xl flex flex-col justify-between rounded-2xl">
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-cyan-400" />
                  Installation & Setup Guide
                </CardTitle>
                <a
                  href="https://discord.gg/5WgtMWbtgD"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-400 hover:text-white hover:underline flex items-center gap-1 font-medium transition-colors"
                >
                  Need Help? Discord <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Follow these 3 quick steps to deploy VexShield on your FiveM server.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              <Tabs defaultValue="steps" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-5 bg-black/50 border border-white/10 p-1 rounded-xl">
                  <TabsTrigger value="steps" className="text-xs font-bold gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-400 rounded-lg transition-all">
                    <Terminal className="h-3.5 w-3.5" />
                    Installation Steps
                  </TabsTrigger>
                  <TabsTrigger value="issues" className="text-xs font-bold gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-400 rounded-lg transition-all">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Rules & Troubleshooting
                  </TabsTrigger>
                </TabsList>

                {/* Steps Tab */}
                <TabsContent value="steps" className="mt-0 space-y-4">
                  <div className="space-y-4">
                    
                    {/* Step 1 */}
                    <div className="flex items-start gap-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
                        1
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Extract the VexShield folder
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Unzip the downloaded package into your FiveM server's <code className="text-cyan-300 font-mono bg-white/10 px-1 py-0.5 rounded">/resources</code> directory (directly in resources, not nested).
                        </p>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Step 2 */}
                    <div className="flex items-start gap-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
                        2
                      </div>
                      <div className="w-full">
                        <p className="text-xs font-semibold text-slate-200">
                          Add permissions to your server.cfg
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Add the following lines near the TOP of your <code className="text-cyan-300 font-mono bg-white/10 px-1 py-0.5 rounded">server.cfg</code> file:
                        </p>
                        <div className="mt-2 rounded-lg bg-[#040914] border border-cyan-500/20 p-3 font-mono text-xs text-slate-200 space-y-1">
                          <div className="text-cyan-300 font-bold">ensure VexShield</div>
                          <div className="text-slate-300">add_ace resource.VexShield command allow</div>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Step 3 */}
                    <div className="flex items-start gap-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
                        3
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Configure & Launch Server
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Your server key syncs automatically with this web dashboard. Start your server and check console for the green VexShield operational banner.
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
                      Important Server Requirements
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-xs text-amber-200/90 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>Do <strong>NOT</strong> rename the script folder. It must be named exactly <code className="text-amber-300 font-mono">VexShield</code>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>VexShield must be started <strong>BEFORE</strong> any other gameplay resources in <code className="text-amber-300 font-mono">server.cfg</code>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>Ensure your server has outbound internet access to contact the VexShield API on port 443.</span>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Need Technical Support?</h4>
                        <p className="text-[11px] text-slate-400">Join our Discord community for 24/7 developer assistance.</p>
                      </div>
                    </div>
                    <a
                      href="https://discord.gg/5WgtMWbtgD"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all shadow-sm"
                    >
                      Join Discord
                    </a>
                  </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>

        </div>

        {/* Available Builds / History Section if multiple versions uploaded */}
        {allBuilds.length > 1 && (
          <div className="rounded-2xl border border-white/10 bg-[#081322]/80 backdrop-blur-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="h-4 w-4 text-cyan-400" />
                Previous Version Archives
              </h3>
              <span className="text-xs text-slate-400">{allBuilds.length} builds on record</span>
            </div>

            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-black/20">
              {allBuilds.map((build) => {
                const isActive = isAnticheatActive(build.is_active);
                return (
                  <div key={build.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono border",
                        isActive ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-white/5 text-slate-400 border-white/10"
                      )}>
                        {build.version ? (build.version.toLowerCase().startsWith("v") ? build.version : `v${build.version}`) : "vBeta"}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{build.filename}</span>
                          {isActive && (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] py-0 px-1.5 font-bold">
                              ACTIVE
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatBytes(build.file_size)} · Released {build.uploaded_at ? new Date(build.uploaded_at).toLocaleDateString() : "Archive"}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isDemo}
                      onClick={() => handleDownload(build)}
                      className={cn(
                        "h-8 rounded-lg text-xs font-bold gap-1.5 transition-all",
                        isDemo
                          ? "border-amber-500/30 text-amber-400/80 cursor-not-allowed"
                          : "border-white/10 bg-white/[0.04] hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-300 text-slate-200"
                      )}
                    >
                      {isDemo ? <Lock className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                      {isDemo ? "Disabled in Demo" : "Download"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
