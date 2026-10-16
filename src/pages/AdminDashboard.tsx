import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Server,
  LogOut,
  Trash2,
  Plus,
  Home,
  Upload,
  FileArchive,
  Ban,
  Users,
  Ticket,
  ShoppingBag,
  Settings,
  Bell,
  ScrollText,
  Database,
  Gavel,
  Shield,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Tag,
  Radio,
  FileText,
  Check,
  Bot,
  Activity,
  TrendingUp,
  Zap,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getApiBaseUrl, apiUrl, getStoredAuthToken } from "@/lib/api-base";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";
import { PartnerApplicationsPanel } from "@/components/PartnerApplicationsPanel";
import { cn } from "@/lib/utils";

/** Storage key on disk (neutral naming). */
function buildReleaseObjectKey(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const ext = dot >= 0 ? originalName.slice(dot) : "";
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 12);
  return `pkg-${Date.now()}-${rand}${ext}`;
}

const RELEASES_BUCKET = "releases";

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

interface AnticheatFile {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  version: string;
  uploaded_at: string;
  is_active: boolean | number;
  product?: string;
}

export default function AdminDashboard() {
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [anticheatFiles, setAnticheatFiles] = useState<AnticheatFile[]>([]);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"builds" | "plans" | "prices" | "partners">("builds");
  const [refreshingStats, setRefreshingStats] = useState(false);

  // Live Telemetry Stats
  const [telemetry, setTelemetry] = useState({
    servers: 0,
    bans: 0,
    users: 0,
    plans: 0,
    loading: true,
  });

  const [newPartner, setNewPartner] = useState({
    partner_name: "",
    logo_url: "",
    discord_url: "",
    display_order: 0,
  });

  const [newPricing, setNewPricing] = useState({
    plan_name: "",
    plan_subtitle: "",
    duration: "1month",
    price: "",
    features: "",
    display_order: 0,
  });

  const [fileVersion, setFileVersion] = useState("");
  const [uploadProduct, setUploadProduct] = useState<"airshield">("airshield");
  const [shopPriceRows, setShopPriceRows] = useState<any[]>([]);
  const [shopPriceDraft, setShopPriceDraft] = useState<Record<string, string>>({});
  const [shopLoading, setShopLoading] = useState(false);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifProduct, setNotifProduct] = useState<"airshield" | "all">("all");
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  const navigate = useNavigate();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();

  const SHOP_DURATION_KEYS = ["1month", "3month", "permanent"] as const;
  const SHOP_DURATION_LABELS: Record<string, string> = {
    "1month": "1 Month Access",
    "3month": "3 Months Access",
    permanent: "Lifetime Access",
  };

  useEffect(() => {
    if (!staffOk || staffChecking) return;
    loadAllData();
  }, [staffOk, staffChecking]);

  const loadAllData = async () => {
    setRefreshingStats(true);
    await Promise.all([
      loadTelemetryStats(),
      loadPartnerships(),
      loadPricingPlans(),
      loadAnticheatFiles(),
      loadShopPrices(),
      loadSiteSettings(),
    ]);
    setRefreshingStats(false);
  };

  const loadTelemetryStats = async () => {
    try {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(apiUrl("/api/auth/session?view=stats"), {
        credentials: "include",
        cache: "no-store",
        headers,
      });
      if (res.ok) {
        const stats = await res.json();
        setTelemetry({
          servers: stats.servers ?? 0,
          bans: stats.bans ?? 0,
          users: stats.users ?? 0,
          plans: stats.plans ?? 0,
          loading: false,
        });
        return;
      }
    } catch {
      /* fallback to supabase client */
    }

    try {
      const [serversRes, bansRes, usersRes, plansRes] = await Promise.all([
        supabase.from("servers").select("id"),
        supabase.from("global_bans").select("id"),
        supabase.from("discord_users").select("discord_id"),
        supabase.from("pricing_plans").select("id"),
      ]);

      setTelemetry({
        servers: Array.isArray(serversRes.data) ? serversRes.data.length : 0,
        bans: Array.isArray(bansRes.data) ? bansRes.data.length : 0,
        users: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
        plans: Array.isArray(plansRes.data) ? plansRes.data.length : 0,
        loading: false,
      });
    } catch {
      setTelemetry((prev) => ({ ...prev, loading: false }));
    }
  };

  const loadSiteSettings = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/site-settings`);
      const data = await res.json();
      setSiteSettings(data);
    } catch {
      /* ignore */
    }
  };

  const loadPartnerships = async () => {
    const { data, error } = await supabase
      .from("partnerships")
      .select("*")
      .order("display_order", { ascending: true });
    if (!error) setPartnerships(data || []);
  };

  const loadPricingPlans = async () => {
    const { data } = await supabase
      .from("pricing_plans")
      .select("*")
      .order("display_order", { ascending: true });

    let list = data || [];
    const anticheatPlans = list.filter((p: any) =>
      p.plan_name?.toLowerCase().includes("anticheat") ||
      p.plan_name?.toLowerCase().includes("vexshield") ||
      p.plan_name?.toLowerCase().includes("airshield")
    );
    if (anticheatPlans.length > 0) {
      list = anticheatPlans;
    }
    setPricingPlans(list);
  };

  const loadAnticheatFiles = async () => {
    const { data, error } = await supabase
      .from("anticheat_files")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (!error) setAnticheatFiles(data || []);
  };

  const loadShopPrices = async () => {
    setShopLoading(true);
    try {
      let { data, error } = await supabase
        .from("shop_product_prices")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) {
        toast.error("Could not load shop prices.");
        return;
      }
      if (!data || data.length === 0) {
        const seed = await fetch(`${getApiBaseUrl()}/admin/seed-shop-prices`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!seed.ok) return;
        const r2 = await supabase
          .from("shop_product_prices")
          .select("*")
          .order("display_order", { ascending: true });
        data = r2.data;
      }
      setShopPriceRows(data || []);
      const draft: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        draft[`${r.product_key}:${r.duration_key}`] = String(r.price_usd ?? "");
      });
      setShopPriceDraft(draft);
    } finally {
      setShopLoading(false);
    }
  };

  const saveAllShopPrices = async () => {
    try {
      for (const row of shopPriceRows) {
        const key = `${row.product_key}:${row.duration_key}`;
        const val = parseFloat(shopPriceDraft[key]);
        if (!Number.isFinite(val) || val < 0) {
          toast.error(`Invalid price for ${row.duration_key}`);
          return;
        }
        const { error } = await supabase
          .from("shop_product_prices")
          .update({ price_usd: val })
          .eq("id", row.id);
        if (error) throw error;
      }
      toast.success("Shop prices saved successfully");
      loadShopPrices();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save shop prices");
    }
  };

  const resetShopPricesFromFile = async () => {
    if (!confirm("Reset all shop prices to system defaults?")) return;
    setShopLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/seed-shop-prices`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      if (res.ok) {
        toast.success("Shop prices reset to defaults");
        loadShopPrices();
      }
    } finally {
      setShopLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxMb = 250;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`File size must be at most ${maxMb}MB`);
      return;
    }

    if (!fileVersion) {
      toast.error("Please enter a version number (e.g. 1.0.0)");
      return;
    }

    setUploading(true);
    try {
      const filePath = buildReleaseObjectKey(file.name);
      const { error: uploadError } = await supabase.storage
        .from(RELEASES_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const sameProduct = anticheatFiles.filter(
        (f) => (f.product || "airshield") === uploadProduct
      );
      const shouldBeActive = sameProduct.length === 0 ? 1 : 0;

      const { error: dbError } = await supabase.from("anticheat_files").insert({
        filename: file.name,
        file_path: filePath,
        file_size: file.size,
        version: fileVersion,
        is_active: shouldBeActive,
        uploaded_at: new Date().toISOString(),
        product: uploadProduct,
      });

      if (dbError) throw dbError;

      toast.success("VexShield package uploaded successfully");
      setFileVersion("");
      loadAnticheatFiles();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleAnticheatActive = async (fileId: string, currentStatus: boolean | number) => {
    const nextActive = isAnticheatActive(currentStatus) ? 0 : 1;
    try {
      if (nextActive === 1) {
        await supabase
          .from("anticheat_files")
          .update({ is_active: 0 })
          .eq("product", "airshield");
      }
      const { error } = await supabase
        .from("anticheat_files")
        .update({ is_active: nextActive })
        .eq("id", fileId);

      if (error) throw error;
      toast.success(nextActive === 1 ? "Build set to Active Production" : "Build disabled");
      loadAnticheatFiles();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update build status");
    }
  };

  const handleDeleteAnticheatFile = async (file: AnticheatFile) => {
    if (!confirm(`Delete ${file.filename}?`)) return;
    try {
      await supabase.storage.from(RELEASES_BUCKET).remove([file.file_path]);
      const { error } = await supabase.from("anticheat_files").delete().eq("id", file.id);
      if (error) throw error;
      toast.success("File deleted");
      loadAnticheatFiles();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete file");
    }
  };

  const handleBroadcast = async () => {
    if (!notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/broadcast-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ product: notifProduct, message: notifMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Broadcast failed");
      toast.success(`Notification broadcast to ${data.count} users!`);
      setShowNotifModal(false);
      setNotifMessage("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingNotif(false);
    }
  };

  const handleAddPartner = async () => {
    if (!newPartner.partner_name || !newPartner.logo_url) {
      toast.error("Partner name and logo URL are required");
      return;
    }
    const { error } = await supabase.from("partnerships").insert(newPartner);
    if (error) {
      toast.error("Failed to add partner");
      return;
    }
    toast.success("Partner registered");
    setShowPartnerModal(false);
    setNewPartner({ partner_name: "", logo_url: "", discord_url: "", display_order: 0 });
    loadPartnerships();
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm("Remove this partner?")) return;
    const { error } = await supabase.from("partnerships").delete().eq("id", id);
    if (!error) {
      toast.success("Partner removed");
      loadPartnerships();
    }
  };

  const handleEditPricing = (plan: any) => {
    setEditingPlanId(plan.id);
    const cleanName = String(plan.plan_name || "").replace(/AirShield/gi, "VexShield");
    setNewPricing({
      plan_name: cleanName,
      plan_subtitle: plan.plan_subtitle != null ? String(plan.plan_subtitle) : "",
      duration: plan.duration,
      price: plan.price,
      features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
      display_order: plan.display_order || 0,
    });
    setShowPricingModal(true);
  };

  const handleSavePricing = async () => {
    if (!newPricing.plan_name || !newPricing.price) {
      toast.error("Plan name and price are required");
      return;
    }
    const featuresArray = newPricing.features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    const planName = newPricing.plan_name.replace(/AirShield/gi, "VexShield");

    if (editingPlanId) {
      const { error } = await supabase
        .from("pricing_plans")
        .update({
          plan_name: planName,
          plan_subtitle: newPricing.plan_subtitle.trim() || null,
          duration: newPricing.duration,
          price: newPricing.price,
          features: featuresArray,
          display_order: newPricing.display_order,
        })
        .eq("id", editingPlanId);

      if (error) {
        toast.error((error as any)?.message || "Failed to update plan");
        return;
      }
      toast.success("Plan updated");
    } else {
      const { error } = await supabase.from("pricing_plans").insert({
        plan_name: planName,
        plan_subtitle: newPricing.plan_subtitle.trim() || null,
        duration: newPricing.duration,
        price: newPricing.price,
        features: featuresArray,
        display_order: newPricing.display_order,
        is_active: true,
      });
      if (error) {
        toast.error((error as any)?.message || "Failed to create plan");
        return;
      }
      toast.success("Plan created");
    }

    setShowPricingModal(false);
    setEditingPlanId(null);
    setNewPricing({
      plan_name: "",
      plan_subtitle: "",
      duration: "1month",
      price: "",
      features: "",
      display_order: 0,
    });
    loadPricingPlans();
  };

  const handleDeletePricing = async (id: string) => {
    if (!confirm("Delete this pricing plan?")) return;
    const { error } = await supabase.from("pricing_plans").delete().eq("id", id);
    if (!error) {
      toast.success("Plan deleted");
      loadPricingPlans();
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${getApiBaseUrl()}/auth/signout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    }
    navigate("/auth");
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-500" />
          <span className="text-xs font-mono tracking-widest text-cyan-400">AUTHENTICATING ROOT CLEARANCE...</span>
        </div>
      </div>
    );
  }

  if (!staffOk) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] text-slate-300 p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-md w-full text-center space-y-5 rounded-2xl border border-rose-500/30 bg-[#081322]/90 backdrop-blur-xl p-8 shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Access Denied</h2>
            <p className="text-xs text-zinc-400 mt-1.5">You do not possess root administrative permissions.</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white">
            <Home className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Redesigned Command Matrix Data — Cleaned according to user specifications
  const NAVIGATION_HUBS = [
    {
      category: "Infrastructure & Fleet",
      badge: "Core Fleet",
      items: [
        {
          title: "Server Fleet",
          desc: "Manage registered servers, licenses & hardware",
          icon: Server,
          route: "/admin/servers",
          color: "from-cyan-500/20 to-blue-600/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
        },
        {
          title: "Shared Configs",
          desc: "Browse community cloud configuration presets",
          icon: Layers,
          route: "/admin/shared-configs",
          color: "from-teal-500/20 to-emerald-600/20 text-teal-400 border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.15)]",
        },
      ],
    },
    {
      category: "Staff & Intelligence",
      badge: "Audit & RBAC",
      items: [
        {
          title: "User Directory",
          desc: "All Discord users, roles, and balance ledger",
          icon: Users,
          route: "/admin/users",
          color: "from-sky-500/20 to-cyan-600/20 text-sky-400 border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.15)]",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 relative overflow-hidden font-['Inter',sans-serif]">
      {/* Background Cybernetic Orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[750px] w-[750px] rounded-full bg-cyan-500/10 blur-[180px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[700px] w-[700px] rounded-full bg-blue-600/10 blur-[180px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[550px] w-[550px] rounded-full bg-violet-600/10 blur-[170px]" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 relative z-10">
        
        {/* ========================================================================= */}
        {/* TOP COMMAND BAR HEADER                                                    */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-cyan-500/25 bg-[#081322]/85 backdrop-blur-2xl p-5 md:p-6 shadow-[0_0_60px_rgba(6,182,212,0.15)] flex flex-wrap items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] shrink-0 border border-white/20">
              <Shield className="h-7 w-7 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>VexShield</span>
                  <span className="text-cyan-400">Control Matrix</span>
                </h1>
                <span className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-cyan-300 bg-cyan-500/15 border border-cyan-500/35 px-2.5 py-0.5 rounded-full font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  LEVEL 9 ROOT
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  ENCRYPTED C2
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl">
                Global anticheat network coordinator, client licensing daemon, ban sync & billing hub.
              </p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5 relative z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25 text-slate-200 text-xs font-semibold gap-1.5 h-10 px-3.5 transition-all shadow-md"
            >
              <Home className="h-3.5 w-3.5 text-cyan-400" />
              Platform Home
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={refreshingStats}
              className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-500/40 text-slate-200 text-xs font-semibold gap-1.5 h-10 px-3.5 transition-all shadow-md"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-cyan-400", refreshingStats && "animate-spin")} />
              Sync
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold gap-1.5 h-10 px-3.5 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LIVE TELEMETRY & SYSTEM HUD (3-Metric Balanced Cybernetic Grid)           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Servers */}
          <div className="rounded-2xl border border-cyan-500/20 bg-[#081322]/80 backdrop-blur-xl p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Protected Fleet</span>
              <div className="h-9 w-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Server className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {telemetry.loading ? "..." : telemetry.servers}
            </div>
            <p className="text-[11px] text-cyan-400/90 mt-1 flex items-center gap-1">
              <Activity className="h-3 w-3" /> Real-time FiveM servers online
            </p>
          </div>

          {/* Card 2: Users */}
          <div className="rounded-2xl border border-sky-500/20 bg-[#081322]/80 backdrop-blur-xl p-5 shadow-lg relative overflow-hidden group hover:border-sky-500/40 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Discord User Base</span>
              <div className="h-9 w-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {telemetry.loading ? "..." : telemetry.users}
            </div>
            <p className="text-[11px] text-sky-400/90 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Authenticated owner accounts
            </p>
          </div>

          {/* Card 3: Store Plans */}
          <div className="rounded-2xl border border-emerald-500/20 bg-[#081322]/80 backdrop-blur-xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Subscriptions</span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Ticket className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {telemetry.loading ? "..." : telemetry.plans}
            </div>
            <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Public storefront packages
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NAVIGATION COMMAND MATRIX                                                 */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              Command Matrix & System Subsystems
            </h2>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full font-semibold">
              3 CORE MODULES
            </span>
          </div>

          <div className="space-y-7">
            {NAVIGATION_HUBS.map((hub) => (
              <div key={hub.category} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {hub.category}
                  </p>
                  <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {hub.badge}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {hub.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        onClick={() => navigate(item.route)}
                        className="group relative rounded-2xl border border-white/10 bg-[#07101c]/80 hover:bg-[#0c182b] hover:border-cyan-500/50 p-4 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.18)] hover:-translate-y-1 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="flex items-start gap-3.5 relative z-10">
                          <div className={cn("p-2.5 rounded-xl border shrink-0 bg-gradient-to-br transition-all duration-300 group-hover:scale-110", item.color)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                              <span className="truncate">{item.title}</span>
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-cyan-400 shrink-0 ml-1" />
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed group-hover:text-slate-300 transition-colors">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LIVE CONFIGURATION & PACKAGE ENGINE                                       */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-cyan-500/20 bg-[#081322]/85 backdrop-blur-2xl p-5 md:p-7 shadow-[0_0_60px_rgba(0,0,0,0.6)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-cyan-400" />
                Live Configuration & Package Engine
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage downloadable builds, storefront subscription packs, direct price overrides, and community partners.
              </p>
            </div>

            {/* Segmented Tab Controls */}
            <div className="flex items-center bg-black/60 border border-white/10 p-1.5 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab("builds")}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === "builds"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <FileArchive className="h-3.5 w-3.5" />
                Build Releases
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("plans")}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === "plans"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Ticket className="h-3.5 w-3.5" />
                Pricing Packs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("prices")}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === "prices"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Store Overrides
              </button>
            </div>
          </div>

          {/* TAB 1: BUILDS & RELEASES */}
          {activeTab === "builds" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Upload New VexShield Package</h3>
                    <p className="text-xs text-slate-400">Accepts .zip or .rar up to 250MB. Tied to automatic download on client dashboard.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <Input
                    placeholder="Build Version (e.g. 2.5.0)"
                    value={fileVersion}
                    onChange={(e) => setFileVersion(e.target.value)}
                    className="w-full sm:w-48 bg-black/50 border-white/10 rounded-xl h-10 text-xs text-white"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".zip,.rar"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <div className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold px-4 h-10 flex items-center gap-2 shadow-md shadow-cyan-500/25 transition-all">
                      <Upload className="h-4 w-4" />
                      {uploading ? "Deploying..." : "Choose File"}
                    </div>
                  </label>
                </div>
              </div>

              {/* Releases List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  Active VexShield Distributions
                </h3>

                {anticheatFiles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-slate-500 text-xs">
                    No release packages uploaded yet. Deploy your first VexShield package above.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {anticheatFiles.map((file) => {
                      const active = isAnticheatActive(file.is_active);
                      return (
                        <div
                          key={file.id}
                          className={cn(
                            "rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4 transition-all",
                            active
                              ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                              : "border-white/10 bg-[#07101c]/70"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                              active
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : "bg-white/5 text-slate-400 border-white/10"
                            )}>
                              <FileArchive className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-bold text-white">{file.filename}</span>
                                <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 font-mono text-[10px]">
                                  v{file.version}
                                </Badge>
                                {active && (
                                  <Badge className="bg-emerald-500/25 text-emerald-300 border-emerald-500/40 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                    ACTIVE BUILD
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                {formatFileSize(file.file_size)} · Released {new Date(file.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={active ? "default" : "outline"}
                              className={cn(
                                "h-9 rounded-xl text-xs font-bold transition-all",
                                active
                                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
                              )}
                              onClick={() => handleToggleAnticheatActive(file.id, file.is_active)}
                            >
                              {active ? "Active" : "Activate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                              onClick={() => handleDeleteAnticheatFile(file)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRICING PLANS */}
          {activeTab === "plans" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Subscription Package Tiers</h3>
                  <p className="text-xs text-slate-400">Configures customer pricing cards displayed on /pricing and the store landing.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPlanId(null);
                    setNewPricing({ plan_name: "VexShield Anticheat", plan_subtitle: "", duration: "1month", price: "", features: "", display_order: 0 });
                    setShowPricingModal(true);
                  }}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold gap-1.5 h-9 shadow-md shadow-cyan-500/25"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Package
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pricingPlans.map((plan) => {
                  const sanitizedPlanName = String(plan.plan_name || "").replace(/AirShield/gi, "VexShield");
                  return (
                    <div
                      key={plan.id}
                      className="rounded-2xl border border-white/10 bg-[#07101c]/85 p-5 space-y-4 hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />

                      <div className="space-y-2 relative z-10">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-base">{sanitizedPlanName}</h4>
                          <Badge variant="outline" className="border-cyan-500/35 text-cyan-300 font-mono text-[10px] bg-cyan-500/10">
                            {plan.duration}
                          </Badge>
                        </div>
                        {plan.plan_subtitle && (
                          <p className="text-xs text-slate-400 line-clamp-2">{plan.plan_subtitle}</p>
                        )}
                        <p className="text-2xl font-black text-cyan-400 font-mono">{plan.price}</p>
                        {Array.isArray(plan.features) && plan.features.length > 0 && (
                          <ul className="text-xs text-slate-400 space-y-1.5 pt-3 border-t border-white/5">
                            {plan.features.slice(0, 4).map((f: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                <span className="line-clamp-1">{f}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-white/5 relative z-10">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl border-white/10 bg-white/[0.04] text-xs font-semibold hover:border-white/20"
                          onClick={() => handleEditPricing(plan)}
                        >
                          Edit Plan
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl text-rose-400 hover:bg-rose-500/10"
                          onClick={() => handleDeletePricing(plan.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: STORE OVERRIDES */}
          {activeTab === "prices" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">VexShield Store Price Matrix</h3>
                  <p className="text-xs text-slate-400">Override base checkout costs in USD directly on the database store table.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-white/10 text-xs"
                    onClick={resetShopPricesFromFile}
                    disabled={shopLoading}
                  >
                    Reset Defaults
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/25"
                    onClick={saveAllShopPrices}
                    disabled={shopLoading}
                  >
                    Save All Prices
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SHOP_DURATION_KEYS.map((dur) => {
                  const key = `airshield:${dur}`;
                  return (
                    <div key={dur} className="rounded-2xl border border-white/10 bg-[#07101c]/80 p-5 space-y-3 hover:border-cyan-500/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-bold text-white block">VexShield Anticheat</Label>
                          <span className="text-[11px] text-slate-400">{SHOP_DURATION_LABELS[dur]}</span>
                        </div>
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 font-mono text-[10px] bg-cyan-500/10">
                          USD
                        </Badge>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="29.99"
                        value={shopPriceDraft[key] ?? ""}
                        onChange={(e) => setShopPriceDraft({ ...shopPriceDraft, [key]: e.target.value })}
                        className="bg-black/50 border-white/10 h-11 rounded-xl text-sm font-mono text-cyan-300 focus-visible:ring-cyan-500/40"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: BROADCAST ALERT                                                    */}
      {/* ========================================================================= */}
      <Dialog open={showNotifModal} onOpenChange={setShowNotifModal}>
        <DialogContent className="max-w-md bg-[#081322] border-white/10 text-white rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)]">
          <DialogHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Broadcast Global Alert</DialogTitle>
                <DialogDescription className="text-xs text-slate-400">Sends instant notification to dashboard banners & Discord DMs.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Audience Scope</Label>
              <Select value={notifProduct} onValueChange={(v: any) => setNotifProduct(v)}>
                <SelectTrigger className="bg-black/50 border-white/10 h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#081322] border-white/10">
                  <SelectItem value="all">All Licensed Users</SelectItem>
                  <SelectItem value="airshield">VexShield Server Owners Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Message Content</Label>
              <Textarea
                placeholder="Write your announcement or alert bulletin..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                className="bg-black/50 border-white/10 rounded-xl min-h-[120px] text-xs focus-visible:ring-cyan-500/40"
              />
            </div>

            <Button
              className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25"
              onClick={handleBroadcast}
              disabled={sendingNotif || !notifMessage.trim()}
            >
              {sendingNotif ? "Transmitting..." : "Send Announcement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ADD PARTNER                                                        */}
      {/* ========================================================================= */}
      <Dialog open={showPartnerModal} onOpenChange={setShowPartnerModal}>
        <DialogContent className="sm:max-w-md bg-[#081322] border-white/10 text-white rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)]">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-lg font-bold text-white">Register Community Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Partner Organization Name *</Label>
              <Input
                value={newPartner.partner_name}
                onChange={(e) => setNewPartner({ ...newPartner, partner_name: e.target.value })}
                className="bg-black/50 border-white/10 h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Logo Image URL (PNG/SVG) *</Label>
              <Input
                value={newPartner.logo_url}
                onChange={(e) => setNewPartner({ ...newPartner, logo_url: e.target.value })}
                className="bg-black/50 border-white/10 h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Discord Community Link (Optional)</Label>
              <Input
                value={newPartner.discord_url}
                onChange={(e) => setNewPartner({ ...newPartner, discord_url: e.target.value })}
                placeholder="https://discord.gg/..."
                className="bg-black/50 border-white/10 h-10 rounded-xl text-xs"
              />
            </div>
            <Button onClick={handleAddPartner} className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-md shadow-cyan-500/25">
              Save Partner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PRICING                                                 */}
      {/* ========================================================================= */}
      <Dialog
        open={showPricingModal}
        onOpenChange={(open) => {
          setShowPricingModal(open);
          if (!open) {
            setEditingPlanId(null);
            setNewPricing({ plan_name: "", plan_subtitle: "", duration: "1month", price: "", features: "", display_order: 0 });
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#081322] border-white/10 text-white rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)]">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-lg font-bold text-white">
              {editingPlanId ? "Edit Subscription Pack" : "Create Subscription Pack"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Plan Name *</Label>
              <Input
                value={newPricing.plan_name}
                onChange={(e) => setNewPricing({ ...newPricing, plan_name: e.target.value })}
                className="bg-black/50 border-white/10 h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Subtitle (Optional)</Label>
              <Input
                value={newPricing.plan_subtitle}
                onChange={(e) => setNewPricing({ ...newPricing, plan_subtitle: e.target.value })}
                placeholder="e.g. Recommended for competitive roleplay servers"
                className="bg-black/50 border-white/10 h-10 rounded-xl text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Display Price *</Label>
                <Input
                  value={newPricing.price}
                  onChange={(e) => setNewPricing({ ...newPricing, price: e.target.value })}
                  placeholder="$29.99"
                  className="bg-black/50 border-white/10 h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Duration</Label>
                <Select value={newPricing.duration} onValueChange={(v) => setNewPricing({ ...newPricing, duration: v })}>
                  <SelectTrigger className="bg-black/50 border-white/10 h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#081322] border-white/10">
                    <SelectItem value="1month">1 Month</SelectItem>
                    <SelectItem value="3month">3 Months</SelectItem>
                    <SelectItem value="permanent">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Feature Bullet Points (one per line)</Label>
              <Textarea
                value={newPricing.features}
                onChange={(e) => setNewPricing({ ...newPricing, features: e.target.value })}
                className="bg-black/50 border-white/10 rounded-xl text-xs min-h-[90px]"
              />
            </div>
            <Button onClick={handleSavePricing} className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-md shadow-cyan-500/25">
              {editingPlanId ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
