import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Bot,
  ExternalLink,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Terminal,
  Webhook,
  Radio,
  Sparkles,
  Info,
  Server,
  RefreshCw,
  Send,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsDemoMode } from "@/demo/demoMode";
import { readConnectedServer } from "@/lib/connected-server";
import { cn } from "@/lib/utils";

const DISCORD_BOT_CLIENT_ID = "1541173111356002407";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

interface WebhookData {
  logsWebhook?: string;
  logsLeave?: string;
  logsConnection?: string;
  logsBans?: string;
  punishmentsWebhook?: string;
}

export default function BotManager() {
  const { serverId } = useParams();
  const isDemo = useIsDemoMode();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookData>({});
  const [serverInfo, setServerInfo] = useState<{ displayName: string; licenseKey: string; ip: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingBan, setTestingBan] = useState(false);

  const activeServerId = isDemo ? "DEMO-SERVER" : serverId || readConnectedServer()?.server_id;

  useEffect(() => {
    async function loadData() {
      if (isDemo || !activeServerId) {
        setServerInfo({
          displayName: "Elite PvP Server",
          licenseKey: "ASHLD-7480ED680277766514808DAC1F313830335833F9",
          ip: "84.75.24.96:30120",
        });
        setWebhooks({
          logsWebhook: "https://discord.com/api/webhooks/123456789/logs",
          logsLeave: "https://discord.com/api/webhooks/123456789/logsLeave",
          logsConnection: "https://discord.com/api/webhooks/123456789/logsConnection",
          logsBans: "https://discord.com/api/webhooks/123456789/logsBans",
          punishmentsWebhook: "https://discord.com/api/webhooks/123456789/punishments",
        });
        setLoading(false);
        return;
      }

      try {
        const [settingsRes, connectionRes] = await Promise.all([
          supabase.from("server_settings").select("settings").eq("server_id", activeServerId).maybeSingle(),
          supabase.from("discord_bot_connections").select("*").eq("server_id", activeServerId).maybeSingle(),
        ]);

        if (settingsRes.data?.settings) {
          const parsed = typeof settingsRes.data.settings === "object"
            ? settingsRes.data.settings
            : JSON.parse((settingsRes.data.settings as string) || "{}");

          if (parsed.discord_webhooks) {
            setWebhooks(parsed.discord_webhooks);
          }
        }

        const session = readConnectedServer();
        setServerInfo({
          displayName: session?.display_name || activeServerId,
          licenseKey: session?.license_key || "Unknown License",
          ip: session?.ip || "Unknown IP",
        });
      } catch (err) {
        console.error("Failed to load bot manager data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeServerId, isDemo]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestBanTrigger = async () => {
    setTestingBan(true);
    try {
      if (isDemo) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        toast.success("Demo ban test trigger sent to Discord bot successfully!");
        return;
      }

      const res = await fetch("/api/servers/post-jail-ban-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server_id: activeServerId,
          player_name: "TestCheater_99",
          discord_id: "123456789012345678",
          reason: "Anti Spawn Vehicle (Drop On Player) (Time: PERMA)",
          duration: "PERMA",
          server_name: serverInfo?.displayName || "VexShield Server",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to trigger test ban");
      }

      toast.success("Test ban notification sent to Discord punishments channel!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send test ban message to Discord");
    } finally {
      setTestingBan(false);
    }
  };

  const luaSnippet = `Config.logsBans = "${webhooks.logsBans || ""}"
Config.logsConnection = "${webhooks.logsConnection || ""}"
Config.logsLeave = "${webhooks.logsLeave || ""}"
Config.logsWebhook = "${webhooks.logsWebhook || ""}"`;

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto text-foreground">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-r from-[#0B1120] via-[#0F172A] to-[#090D16] p-6 md:p-8 shadow-2xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Bot className="h-9 w-9 text-white" />
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-[#0B1120]">
                <Zap className="h-3 w-3 text-black fill-black" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  Official Bot Manager
                </h1>
                <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 font-semibold px-2.5 py-0.5">
                  VexShield Network
                </Badge>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Connect and manage the VexShield Network Discord Bot for automated ban embeds, jail notifications, live server telemetry, and instant Discord logging.
              </p>
            </div>
          </div>

          {/* Primary CTA Button to Add Bot to Discord */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold shadow-lg shadow-[#5865F2]/25 hover:shadow-[#5865F2]/40 transition-all duration-300 gap-2.5 rounded-xl px-6 py-6"
              onClick={() => window.open(BOT_INVITE_URL, "_blank")}
            >
              <Bot className="h-5 w-5 fill-white/20" />
              <span>Add Bot to Discord</span>
              <ExternalLink className="h-4 w-4 ml-1 opacity-80" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Status & Setup Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Setup Steps & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Add Card */}
          <Card className="border-white/10 bg-[#0C1017]/90 backdrop-blur-xl shadow-xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white">Bot Integration & Slash Commands</CardTitle>
                    <CardDescription className="text-slate-400">
                      Follow 3 simple steps to integrate the official bot into your Discord server.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Step 1 */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-slate-900/40 hover:border-blue-500/20 transition-all">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-sm">
                  1
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white">Invite the Bot</h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Authorize <strong className="text-white">VexShield Network Bot</strong> into your Discord server with administrator permissions.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-slate-900/40 hover:border-blue-500/20 transition-all">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm">
                  2
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-white">Connect Server License</h4>
                  <p className="text-xs text-slate-400">
                    Run the following command in any channel of your Discord server to link your VexShield license key:
                  </p>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-xs text-blue-300">
                    <span>
                      /connect license:<span className="text-amber-300">{serverInfo?.licenseKey || "YOUR_LICENSE"}</span> ip:<span className="text-emerald-300">{serverInfo?.ip || "YOUR_SERVER_IP"}</span>
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-slate-400 hover:text-white"
                      onClick={() => copyToClipboard(`/connect license:${serverInfo?.licenseKey || ""} ip:${serverInfo?.ip || ""}`, "Slash Command")}
                    >
                      {copiedKey === "Slash Command" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-slate-900/40 hover:border-blue-500/20 transition-all">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm">
                  3
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-white">Automated Webhooks & Channel Setup</h4>
                  <p className="text-xs text-slate-400">
                    Execute <code className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">/create</code> in Discord. The bot will automatically build category channels, generate webhooks, and save them directly to your website database.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px]">
                      #logs
                    </Badge>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px]">
                      #logsBans
                    </Badge>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px]">
                      #logsConnection
                    </Badge>
                    <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400 text-[11px]">
                      💀・punishments
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webhooks & Lua Config */}
          <Card className="border-white/10 bg-[#0C1017]/90 backdrop-blur-xl shadow-xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Webhook className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white">Active Webhooks & Config.lua</CardTitle>
                    <CardDescription className="text-slate-400">
                      Synced webhooks ready for your FiveM server configuration.
                    </CardDescription>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 hover:border-blue-500/40 text-slate-300 gap-1.5 text-xs"
                  onClick={() => copyToClipboard(luaSnippet, "Config.lua")}
                >
                  {copiedKey === "Config.lua" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy Lua Config
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="relative rounded-xl border border-white/10 bg-black/80 p-4 font-mono text-xs text-slate-300 space-y-1.5 overflow-x-auto">
                <div className="text-slate-500 pb-1">-- VexShield Auto-Generated Webhook Config</div>
                <div className="text-blue-400"><span className="text-purple-400">Config.logsBans</span> = <span className="text-amber-300">"{webhooks.logsBans || "Pending /create command..."}"</span></div>
                <div className="text-blue-400"><span className="text-purple-400">Config.logsConnection</span> = <span className="text-amber-300">"{webhooks.logsConnection || "Pending /create command..."}"</span></div>
                <div className="text-blue-400"><span className="text-purple-400">Config.logsLeave</span> = <span className="text-amber-300">"{webhooks.logsLeave || "Pending /create command..."}"</span></div>
                <div className="text-blue-400"><span className="text-purple-400">Config.logsWebhook</span> = <span className="text-amber-300">"{webhooks.logsWebhook || "Pending /create command..."}"</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Bot Live Status & Test Trigger */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-white/10 bg-[#0C1017]/90 backdrop-blur-xl shadow-xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                  Bot Service Status
                </CardTitle>
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold px-2">
                  ONLINE
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-slate-400">Bot Name</span>
                <span className="font-semibold text-white">VexShield Network</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-slate-400">Client ID</span>
                <span className="font-mono text-slate-300">{DISCORD_BOT_CLIENT_ID}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-slate-400">HTTP API Endpoint</span>
                <span className="font-mono text-emerald-400">http://127.0.0.1:5055</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Spoiler Mentions</span>
                <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300">
                  ||@everyone|| Enabled
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Test Trigger Card */}
          <Card className="border-white/10 bg-[#0C1017]/90 backdrop-blur-xl shadow-xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-400" />
                Test Bot Embed Notification
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Send a sample ban punishment card to your Discord <code className="text-rose-400">💀・punishments</code> channel to verify formatting and spoiler tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Button
                variant="outline"
                className="w-full border-blue-500/30 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-300 font-semibold gap-2 transition-all duration-300"
                onClick={handleTestBanTrigger}
                disabled={testingBan}
              >
                {testingBan ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{testingBan ? "Sending Embed..." : "Test Send Ban Card"}</span>
              </Button>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-xl">
            <CardContent className="p-4 flex items-start gap-3 text-xs text-amber-200/90">
              <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <p>
                Ensure the bot has permission to send messages and embed links in the target channels. Webhook channels automatically sync whenever you re-run <code className="text-amber-300 font-mono">/create</code>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
