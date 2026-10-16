import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { useUserAuth } from "@/contexts/UserAuthContext";

import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { toast } from "sonner";

import { User, Server, Shield, Save, ArrowLeft, Edit2, 

  Crown, Users, Calendar, ExternalLink, Wallet,

  Monitor, Smartphone, Globe, Clock, MapPin, Ticket

 } from "lucide-react";

import { Coins, ChevronRight, ArrowRight, Loader2 } from "lucide-react";

import { FallingPapers } from "@/components/FallingPapers";



import {

  apiMutationHeaders,

  apiUrl,

  ensureCsrfCookie,

  fetchPaypalServerReady,

  getApiBaseUrl,

  isCsrfErrorMessage,

} from "@/lib/api-base";

import { formatEur, toEurNumber } from "@/lib/format-eur";



declare global {

  interface Window {

    paypal: any;

  }

}



interface ServerInfo {

  server_id: string;

  display_name: string | null;

  status: string | null;

  expires_at: string | null;

  isOwner: boolean;

}



interface UserSession {

  id: string;

  ip_address: string;

  country: string | null;

  location: string | null;

  device: string | null;

  created_at: string;

  last_active: string;

}



type InvoiceKind = "wallet" | "shop" | "renew";



interface InvoiceRow {

  id: string;

  kind: InvoiceKind;

  amount: number;

  currency: "EUR";

  paypal_order_id: string | null;

  created_at: string;

  details: any;

}



interface RenewQuote {

  server_id: string;

  currency: "EUR";

  eligible: boolean;

  code: string;

  reason: string | null;

  expires_at: string | null;

  renewed_expires_at: string | null;

  subtotal: number;

  duration: "1month";

  adds_days: number;

}



export default function ProfileSettings() {

  const { user, loading: authLoading } = useUserAuth();

  const navigate = useNavigate();

  

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");

  const [bio, setBio] = useState("");

  const [discordId, setDiscordId] = useState("");

  const [discordAvatar, setDiscordAvatar] = useState("");

  const [email, setEmail] = useState("");

  const [servers, setServers] = useState<ServerInfo[]>([]);

  const [funds, setFunds] = useState(0);

  const [redeemOpen, setRedeemOpen] = useState(false);

  const [redeemCode, setRedeemCode] = useState("");

  const [redeeming, setRedeeming] = useState(false);

  const [sessions, setSessions] = useState<UserSession[]>([]);

  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  const [invoicesLoading, setInvoicesLoading] = useState(false);







  const [renewOpen, setRenewOpen] = useState(false);

  const [renewServerId, setRenewServerId] = useState<string | null>(null);

  const [renewQuote, setRenewQuote] = useState<RenewQuote | null>(null);

  const [renewUsingWallet, setRenewUsingWallet] = useState(true);

  const [renewProcessing, setRenewProcessing] = useState(false);

  const renewPaypalContainerRef = useRef<HTMLDivElement | null>(null);

  const [sdkReady, setSdkReady] = useState(false);

  const [paypalServerReady, setPaypalServerReady] = useState<boolean | null>(null);



  const clientId = useMemo(() => {

    const envId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;

    return envId && envId.length > 0 ? envId : "test";

  }, []);



  useEffect(() => {

    if (!authLoading && !user) {

      navigate('/');

      return;

    }

    

    if (user) {

      loadProfile();

    }

  }, [user, authLoading, navigate]);



  const loadProfile = async () => {

    if (!user) return;

    

    try {

      // Get Discord user data

      const discordIdFromMeta = user.user_metadata?.provider_id || user.user_metadata?.sub;

      setDiscordId(discordIdFromMeta || "");

      setDiscordAvatar(user.user_metadata?.avatar_url || user.user_metadata?.picture || "");

      setEmail(user.email || "");

      

      // Get profile from profiles table

      const { data: profile } = await supabase

        .from('profiles')

        .select('display_name, email')

        .eq('id', user.id)

        .single();

      

      if (profile) {

        setDisplayName(profile.display_name || user.user_metadata?.full_name || "");

      }

      

      let discordRes = await fetch(apiUrl('/api/auth/session?view=profile'), {
        credentials: 'include',
      });

      if (discordRes.ok) {
        const discordUser = (await discordRes.json()) as {
          bio?: string | null;
          username?: string | null;
          display_name?: string | null;
          funds?: number;
          tokens_total?: number;
          tokens_daily?: number;
          tokens_purchased?: number;
          daily_allowance?: number;
          plan_tier?: number;
          two_factor_enabled?: boolean;
        };
        setBio(discordUser.bio || '');
        if (!displayName && (discordUser.display_name || discordUser.username)) {
          setDisplayName(discordUser.display_name || discordUser.username || '');
        }
        setFunds(toEurNumber(discordUser.funds));
      }

      let serversRes = await fetch(apiUrl('/api/auth/session?view=servers'), {
        credentials: 'include',
      });

      if (serversRes.ok) {

        const serverList = (await serversRes.json()) as ServerInfo[];

        setServers(serverList);

      } else {

        setServers([]);

      }

      

      // Load sessions

      loadSessions();

      loadInvoices();

    } catch (error) {

      console.error('Error loading profile:', error);

      toast.error('Failed to load profile');

    } finally {

      setLoading(false);

    }

  };



  const handleSave = async () => {

    if (!user) return;

    

    setSaving(true);

    try {

      // Update profiles table

      const { error: profileError } = await supabase

        .from('profiles')

        .update({ display_name: displayName })

        .eq('id', user.id);

      

      if (profileError) throw profileError;

      

      // Update discord_users table

      if (discordId) {

        const { error: discordError } = await supabase

          .from('discord_users')

          .update({ 

            bio: bio,

            display_name: displayName 

          })

          .eq('discord_id', discordId);

        

        if (discordError) throw discordError;

      }

      

      toast.success('Profile updated successfully');

    } catch (error: any) {

      console.error('Error saving profile:', error);

      toast.error(error.message || 'Failed to save profile');

    } finally {

      setSaving(false);

    }

  };



  const handleRedeem = async () => {

    if (!user || !discordId) return;

    const codeValue = redeemCode.trim();

    if (!codeValue) {

      toast.error('Please enter a redeem code');

      return;

    }



    setRedeeming(true);

    try {

      await ensureCsrfCookie();

      const redeemRequest = () =>

        fetch(`${getApiBaseUrl()}/redeem`, {

          method: "POST",

          credentials: "include",

          headers: apiMutationHeaders(),

          body: JSON.stringify({ code: codeValue }),

        });

      let res = await redeemRequest();

      let j = await res.json().catch(() => ({}));

      if (!res.ok && res.status === 403 && isCsrfErrorMessage(String(j.error || ""))) {

        await ensureCsrfCookie(true);

        res = await redeemRequest();

        j = await res.json().catch(() => ({}));

      }

      if (!res.ok) {

        toast.error(j.error || "Redeem failed");

        return;

      }

      const added = toEurNumber(j.added);

      setFunds((f) => toEurNumber(f) + added);

      setRedeemCode('');

      setRedeemOpen(false);

      toast.success(`Redeemed ${formatEur(added)} successfully`);

    } catch (error: any) {

      console.error('Redeem failed:', error);

      toast.error(error.message || 'Failed to redeem code');

    } finally {

      setRedeeming(false);

    }

  };





  const loadSessions = async () => {

    if (!user) return;

    setSessionsLoading(true);

    try {

      const res = await fetch(apiUrl('/api/users/me/sessions'), {

        credentials: 'include'

      });

      if (res.ok) {

        const data = await res.json();

        setSessions(data);

      }

    } catch (error) {

      console.error('Error loading sessions:', error);

    } finally {

      setSessionsLoading(false);

    }

  };



  const loadInvoices = async () => {

    if (!user) return;

    setInvoicesLoading(true);

    try {

      const res = await fetch(`${getApiBaseUrl()}/invoices`, { credentials: "include" });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(j.error || "Failed to load invoices");

      setInvoices(Array.isArray(j.invoices) ? j.invoices : []);

    } catch (e: any) {

      console.error("Error loading invoices:", e);

      setInvoices([]);

    } finally {

      setInvoicesLoading(false);

    }

  };



  const getDeviceIcon = (ua: string | null) => {

    if (!ua) return <Monitor className="w-4 h-4" />;

    const lower = ua.toLowerCase();

    if (lower.includes('iphone') || lower.includes('android') || lower.includes('mobile')) {

      return <Smartphone className="w-4 h-4" />;

    }

    return <Monitor className="w-4 h-4" />;

  };



  const parseDeviceName = (ua: string | null) => {

    if (!ua) return "Unknown Device";

    if (ua.includes('Windows')) return "Windows PC";

    if (ua.includes('Macintosh')) return "Mac";

    if (ua.includes('iPhone')) return "iPhone";

    if (ua.includes('Android')) return "Android Device";

    if (ua.includes('Linux')) return "Linux PC";

    return "Web Browser";

  };



  const formatFunds = (amount: number) => formatEur(amount);



  useEffect(() => {

    fetchPaypalServerReady().then((p) => setPaypalServerReady(p.ready));

  }, []);



  useEffect(() => {

    if (paypalServerReady === true && user) void ensureCsrfCookie();

  }, [paypalServerReady, user]);



  useEffect(() => {

    if (paypalServerReady !== true) return;

    const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk="true"]');

    if (existing) {

      setSdkReady(true);

      return;

    }

    const script = document.createElement("script");

    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR`;

    script.async = true;

    script.dataset.paypalSdk = "true";

    script.onload = () => setSdkReady(true);

    script.onerror = () => toast.error("Failed to load PayPal SDK");

    document.body.appendChild(script);

  }, [clientId, paypalServerReady]);



  const openRenew = async (serverId: string) => {

    setRenewProcessing(true);

    try {

      const res = await fetch(`${getApiBaseUrl()}/servers/${encodeURIComponent(serverId)}/renew-quote`, {

        credentials: "include",

      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(j.error || "Failed to load renewal quote");

      setRenewServerId(serverId);

      setRenewQuote(j as RenewQuote);

      setRenewUsingWallet(true);

      setRenewOpen(true);

    } catch (e: any) {

      toast.error(e?.message || "Failed to open renewal");

    } finally {

      setRenewProcessing(false);

    }

  };



  const renewWithWallet = async () => {

    if (!renewServerId) return;

    setRenewProcessing(true);

    try {

      await ensureCsrfCookie();

      const res = await fetch(`${getApiBaseUrl()}/servers/${encodeURIComponent(renewServerId)}/renew-with-wallet`, {

        method: "POST",

        credentials: "include",

        headers: apiMutationHeaders(),

      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(j.error || "Renewal failed");

      toast.success("Renewal complete");

      setRenewOpen(false);

      setRenewQuote(null);

      setRenewServerId(null);

      await loadProfile();

    } catch (e: any) {

      toast.error(e?.message || "Renewal failed");

    } finally {

      setRenewProcessing(false);

    }

  };



  const renewToPay = Math.max(

    0,

    toEurNumber(renewQuote?.subtotal) - (renewUsingWallet ? toEurNumber(funds) : 0),

  );



  useEffect(() => {

    if (!renewOpen) return;

    if (paypalServerReady !== true || !sdkReady || !window.paypal || !renewPaypalContainerRef.current) return;

    if (!renewQuote?.eligible) return;

    if (renewToPay <= 0) return;



    renewPaypalContainerRef.current.innerHTML = "";

    try {

      window.paypal

        .Buttons({

          style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },

          createOrder: async () => {

            if (!renewServerId) throw new Error("missing_server_id");

            await ensureCsrfCookie();

            const res = await fetch(`${getApiBaseUrl()}/paypal/create-order`, {

              method: "POST",

              credentials: "include",

              headers: apiMutationHeaders(),

              body: JSON.stringify({ kind: "renew", server_id: renewServerId, use_wallet: renewUsingWallet }),

            });

            const j = await res.json().catch(() => ({}));

            if (!res.ok) {

              if (res.status === 401) throw new Error(j.error || "Sign in again to complete payment.");

              throw new Error(j.error || "Could not create order");

            }

            return j.orderId;

          },

          onApprove: async (data: any) => {

            setRenewProcessing(true);

            try {

              await ensureCsrfCookie();

              const res = await fetch(`${getApiBaseUrl()}/paypal/capture-order`, {

                method: "POST",

                credentials: "include",

                headers: apiMutationHeaders(),

                body: JSON.stringify({ orderID: data.orderID }),

              });

              const j = await res.json().catch(() => ({}));

              if (!res.ok) throw new Error(j.error || "Capture failed");

              toast.success("Renewal complete");

              setRenewOpen(false);

              setRenewQuote(null);

              setRenewServerId(null);

              await loadProfile();

            } catch (e: any) {

              toast.error(e?.message || "Renewal failed");

            } finally {

              setRenewProcessing(false);

            }

          },

          onError: () => toast.error("PayPal could not start. Please reload and try again."),

        })

        .render(renewPaypalContainerRef.current);

    } catch {

      toast.error("Failed to initialize PayPal");

    }

  }, [renewOpen, paypalServerReady, sdkReady, renewQuote?.eligible, renewToPay, renewServerId, renewUsingWallet]);

  const [configOpen, setConfigOpen] = useState(false);

  const [configServerId, setConfigServerId] = useState<string | null>(null);

  const [configForm, setConfigForm] = useState({ name: '', ip: '', email: '' });

  const [configSaving, setConfigSaving] = useState(false);



  const openConfigure = (server: ServerInfo) => {

    setConfigServerId(server.server_id);

    setConfigForm({ name: server.display_name || '', ip: '', email: email || '' });

    setConfigOpen(true);

  };



  const saveConfigure = async () => {

    if (!configServerId || !user) return;

    if (!configForm.name || !configForm.ip || !configForm.email) {

      toast.error('Please fill all fields');

      return;

    }

    setConfigSaving(true);

    try {

      await ensureCsrfCookie();

      const configureUrl = apiUrl(

        `/api/users/me/servers/${encodeURIComponent(configServerId)}/configure`,

      );

      const res = await fetch(configureUrl, {

        method: "PATCH",

        credentials: "include",

        headers: apiMutationHeaders(),

        body: JSON.stringify({

          display_name: configForm.name,

          server_ip: configForm.ip,

        }),

      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) throw new Error(payload.error || "Failed to configure server");

      toast.success('Server configured');

      setConfigOpen(false);

      await loadProfile();

    } catch (e: any) {

      toast.error(e?.message || 'Failed to configure');

    } finally {

      setConfigSaving(false);

    }

  };



  if (authLoading || loading) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#05080f]">

        <div className="h-12 w-12 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />

      </div>

    );

  }



  const ownedCount = servers.filter((s) => s.isOwner).length;

  const adminCount = servers.filter((s) => !s.isOwner).length;



  return (

    <div className="relative min-h-screen bg-[#030712] text-white">

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(56,189,248,0.14),transparent_55%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(251,191,36,0.06),transparent_40%)]" />

      <FallingPapers />



      <div className="container relative z-10 mx-auto max-w-6xl px-4 py-6 md:py-10">

        <button

          type="button"

          onClick={() => navigate("/")}

          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"

        >

          <ArrowLeft className="h-4 w-4" />

          Back to home

        </button>



        {/* Hero banner */}

        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">

          <div className="absolute inset-0 bg-gradient-to-br from-sky-600/25 via-[#0c1525] to-[#070b12]" />

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

          <div className="relative p-6 md:p-8">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

                <div className="relative mx-auto shrink-0 sm:mx-0">

                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-sky-400/50 to-amber-400/30 blur-md opacity-70" />

                  {discordAvatar ? (

                    <img

                      src={discordAvatar}

                      alt="Avatar"

                      className="relative h-24 w-24 rounded-2xl border-2 border-white/20 object-cover shadow-xl md:h-28 md:w-28"

                    />

                  ) : (

                    <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] md:h-28 md:w-28">

                      <User className="h-12 w-12 text-sky-300" />

                    </div>

                  )}

                </div>

                <div className="min-w-0 text-center sm:text-left">

                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">Your account</p>

                  <h1 className="mt-1 truncate text-2xl font-bold tracking-tight md:text-3xl">

                    {displayName || "User"}

                  </h1>

                  <p className="mt-1 truncate text-sm text-slate-400">{email}</p>

                  {discordId ? (

                    <Badge className="mt-3 border-[#5865F2]/40 bg-[#5865F2]/15 text-[#c4b5fd]">

                      Discord linked

                    </Badge>

                  ) : null}

                </div>

              </div>

              <div className="flex flex-wrap justify-center gap-2 lg:justify-end">

                <Button

                  size="sm"

                  variant="outline"

                  className="border-white/15 bg-white/[0.04] hover:bg-white/[0.08]"

                  onClick={() => navigate("/pricing")}

                >

                  Shop

                  <ChevronRight className="ml-1 h-4 w-4" />

                </Button>

              </div>

            </div>

          </div>

        </div>



        {/* Stats strip */}

        <div className="mb-8 grid grid-cols-1 gap-3">

          <div className="rounded-xl border border-white/[0.08] bg-[#0a0f18]/80 p-4 backdrop-blur-sm">

            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Servers</p>

            <p className="mt-1 text-2xl font-bold tabular-nums">{servers.length}</p>

            <p className="mt-0.5 text-xs text-slate-500">{ownedCount} owned, {adminCount} admin</p>

          </div>

        </div>



        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <Card className="overflow-hidden border-white/[0.08] bg-[#0a0f18]/90 lg:col-span-2">

            <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-4">

              <h2 className="flex items-center gap-2 text-lg font-semibold">

                <Edit2 className="h-5 w-5 text-sky-400" />

                Profile details

              </h2>

              <p className="mt-0.5 text-xs text-slate-500">How you appear on search results and feedback</p>

            </div>

            <div className="space-y-5 p-6">

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-300">Display name</label>

                <Input

                  value={displayName}

                  onChange={(e) => setDisplayName(e.target.value)}

                  placeholder="Your display name"

                  className="h-11 border-white/10 bg-[#05080f] text-white"

                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-300">Bio</label>

                <Textarea

                  value={bio}

                  onChange={(e) => setBio(e.target.value)}

                  placeholder="Tell us about yourself..."

                  className="min-h-[120px] border-white/10 bg-[#05080f] text-white"

                  maxLength={500}

                />

                <p className="mt-1.5 text-xs text-slate-500">{bio.length}/500 characters</p>

              </div>

              <Button onClick={handleSave} disabled={saving} className="bg-sky-500 hover:bg-sky-400">

                <Save className="mr-2 h-4 w-4" />

                {saving ? "Saving..." : "Save changes"}

              </Button>

            </div>

          </Card>



          <div className="space-y-4">



            <Card className="border-white/[0.08] bg-[#0a0f18]/90 p-5">

              <h3 className="mb-3 flex items-center gap-2 font-semibold">

                <Shield className="h-5 w-5 text-sky-400" />

                Security

              </h3>

              <p className="text-xs leading-relaxed text-slate-500">

                Review recent sessions below. If you see unfamiliar activity, change your Discord password and contact support.

              </p>

            </Card>

          </div>

        </div>



        <Card className="mt-6 overflow-hidden border-white/[0.08] bg-[#0a0f18]/90">

          <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-6 py-4">

            <h2 className="flex items-center gap-2 text-lg font-semibold">

              <Server className="h-5 w-5 text-sky-400" />

              Your servers

            </h2>

            <Button

              size="sm"

              variant="outline"

              className="border-white/10"

              onClick={() => navigate("/pricing")}

            >

              Get a license

            </Button>

          </div>

          <div className="p-6">

            {servers.length === 0 ? (

              <div className="py-10 text-center text-slate-500">

                <Server className="mx-auto mb-2 h-12 w-12 opacity-40" />

                <p>No servers found</p>

                <p className="text-sm">Purchase a license to get started</p>

              </div>

            ) : (

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                {servers.map((server) => (

                  <div 

                    key={server.server_id}

                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:border-sky-500/30"

                  >

                    <div className="flex items-start justify-between mb-2">

                      <div className="flex items-center gap-2">

                        <h4 className="font-medium">{server.display_name || server.server_id}</h4>

                        {server.isOwner ? (

                          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-xs">

                            <Crown className="w-3 h-3 mr-1" />

                            Owner

                          </Badge>

                        ) : (

                          <Badge variant="outline" className="text-xs">

                            <Users className="w-3 h-3 mr-1" />

                            Admin

                          </Badge>

                        )}

                      </div>

                      <div className="flex items-center gap-2">

                        {server.isOwner && server.expires_at ? (

                          <Button

                            size="sm"

                            variant="secondary"

                            disabled={renewProcessing}

                            onClick={() => openRenew(server.server_id)}

                          >

                            Renew 1 month

                          </Button>

                        ) : null}

                        {server.display_name && server.status !== 'unconfigured' ? (

                          <ExternalLink 

                            className="w-4 h-4 text-muted-foreground cursor-pointer"

                            onClick={() => navigate(`/${server.server_id}/dashboard`)}

                          />

                        ) : (

                          <Button size="sm" onClick={() => openConfigure(server)}>Configure</Button>

                        )}

                      </div>

                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500">

                      <div className="flex items-center gap-1.5">

                        <span className={`h-2 w-2 rounded-full ${

                          server.status === 'online' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : (server.status === 'unconfigured' ? 'bg-amber-400' : 'bg-slate-500')

                        }`} />

                        <span className="capitalize">{server.status || 'offline'}</span>

                      </div>

                      {server.expires_at && (

                        <div className="flex items-center gap-1">

                          <Calendar className="w-3 h-3" />

                          Expires: {new Date(server.expires_at).toLocaleDateString()}

                        </div>

                      )}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </Card>



        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

          <Card className="overflow-hidden border-white/[0.08] bg-[#0a0f18]/90">

            <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-4">

              <h2 className="flex items-center gap-2 text-lg font-semibold">

                <Clock className="h-5 w-5 text-sky-400" />

                Recent sessions

              </h2>

            </div>

            <div className="p-6">

            

            {sessionsLoading ? (

               <div className="flex justify-center py-8">

                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />

               </div>

            ) : sessions.length === 0 ? (

              <div className="py-8 text-center text-slate-500">

                <p>No recent sessions found</p>

              </div>

            ) : (

              <div className="space-y-3">

                {sessions.map((session) => (

                  <div 

                    key={session.id}

                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"

                  >

                    <div className="flex items-center gap-4">

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">

                        {getDeviceIcon(session.device)}

                      </div>

                      <div>

                        <p className="flex items-center gap-2 text-sm font-medium">

                          {parseDeviceName(session.device)}

                          <Badge variant="outline" className="h-4 border-white/10 py-0 text-[10px] text-slate-400">{session.ip_address}</Badge>

                        </p>

                        <p className="flex items-center gap-1 text-xs text-slate-500">

                          <MapPin className="h-3 w-3" />

                          {session.location || "Unknown"}, {session.country || "Unknown"}

                        </p>

                      </div>

                    </div>

                    <div className="text-right">

                      <p className="text-xs text-slate-500">Logged in</p>

                      <p className="text-xs font-medium text-slate-300">{new Date(session.created_at).toLocaleString()}</p>

                    </div>

                  </div>

                ))}

                <p className="mt-2 text-center text-[10px] italic text-slate-500">

                  Showing your last 10 login sessions for security monitoring.

                </p>

              </div>

            )}

            </div>

          </Card>



          <Card className="overflow-hidden border-white/[0.08] bg-[#0a0f18]/90">

            <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-4">

              <h2 className="flex items-center gap-2 text-lg font-semibold">

                <Ticket className="h-5 w-5 text-sky-400" />

                Invoices

              </h2>

            </div>

            <div className="p-6">



            {invoicesLoading ? (

              <div className="flex justify-center py-8">

                <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />

              </div>

            ) : invoices.length === 0 ? (

              <div className="py-8 text-center text-slate-500">

                <p>No invoices found</p>

              </div>

            ) : (

              <div className="space-y-3">

                {invoices.slice(0, 20).map((inv) => (

                  <div

                    key={inv.id}

                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"

                  >

                    <div className="space-y-0.5">

                      <p className="text-sm font-medium text-slate-200">

                        {inv.kind === "wallet"

                          ? "Wallet top-up"

                          : inv.kind === "renew"

                            ? "License renewal (30 days)"

                            : "Server purchase"}

                      </p>

                      <p className="text-xs text-slate-500">

                        {new Date(inv.created_at).toLocaleString()}

                        {inv.paypal_order_id ? ` - PayPal: ${inv.paypal_order_id}` : ""}

                      </p>

                    </div>

                    <div className="text-right">

                      <p className="text-sm font-semibold text-emerald-300">{formatEur(inv.amount)}</p>

                    </div>

                  </div>

                ))}

                {invoices.length > 20 ? (

                  <p className="mt-2 text-center text-[10px] italic text-slate-500">

                    Showing latest 20 invoices (out of {invoices.length}).

                  </p>

                ) : null}

              </div>

            )}

            </div>

          </Card>

        </div>

      </div>



      {/* Renew License Modal */}

      <Dialog

        open={renewOpen}

        onOpenChange={(open) => {

          setRenewOpen(open);

          if (!open) {

            setRenewServerId(null);

            setRenewQuote(null);

          }

        }}

      >

        <DialogContent className="sm:max-w-lg">

          <DialogHeader>

            <DialogTitle>Renew license (30 days)</DialogTitle>

            <DialogDescription>

              Renewals are manual. You can renew only in the last 5 days before expiry, or up to 5 days after expiry.

            </DialogDescription>

          </DialogHeader>



          {!renewQuote ? (

            <div className="py-6 text-sm text-muted-foreground">Loading...</div>

          ) : !renewQuote.eligible ? (

            <div className="space-y-2">

              <Badge variant="outline">Not eligible</Badge>

              <p className="text-sm text-muted-foreground">{renewQuote.reason || "Renewal not available."}</p>

            </div>

          ) : (

            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-3 text-sm">

                <div className="flex justify-between bg-muted/30 p-3 rounded">

                  <span>Subtotal</span>

                  <span className="font-semibold">{formatEur(renewQuote.subtotal)}</span>

                </div>

                <div className="flex justify-between bg-muted/30 p-3 rounded">

                  <span>Your Funds</span>

                  <span className="font-semibold">{formatEur(funds)}</span>

                </div>

                <div className="col-span-2 flex items-center justify-between bg-muted/20 p-3 rounded">

                  <label className="flex items-center gap-2">

                    <input

                      type="checkbox"

                      checked={renewUsingWallet}

                      onChange={(e) => setRenewUsingWallet(e.target.checked)}

                    />

                    Use my funds

                  </label>

                  <span className="font-semibold">To pay: {formatEur(renewToPay)}</span>

                </div>

                <div className="col-span-2 flex justify-between p-3 rounded border">

                  <span>New expiry</span>

                  <span className="font-bold">

                    {renewQuote.renewed_expires_at ? new Date(renewQuote.renewed_expires_at).toLocaleDateString() : "-"}

                  </span>

                </div>

              </div>



              {renewToPay <= 0 ? (

                <Button disabled={renewProcessing} onClick={renewWithWallet}>

                  {renewProcessing ? "Processing..." : "Renew with wallet"}

                </Button>

              ) : paypalServerReady === false ? (

                <p className="text-sm text-amber-200/90">

                  PayPal is not enabled on the API server (set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET, restart).

                </p>

              ) : (

                <div className="space-y-2">

                  <div ref={renewPaypalContainerRef} />

                </div>

              )}

            </div>

          )}



          <DialogFooter>

            <Button variant="outline" onClick={() => setRenewOpen(false)}>

              Close

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      {/* Configure Server Modal */}

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>

        <DialogContent className="sm:max-w-lg">

          <DialogHeader>

            <DialogTitle>Configure Server</DialogTitle>

            <DialogDescription>Enter server details to finish setup.</DialogDescription>

          </DialogHeader>

          <div className="space-y-4">

            <div>

              <label className="block text-sm font-medium mb-2">Server Name</label>

              <Input value={configForm.name} onChange={e => setConfigForm({ ...configForm, name: e.target.value })} />

            </div>

            <div>

              <label className="block text-sm font-medium mb-2">Server IP</label>

              <Input value={configForm.ip} onChange={e => setConfigForm({ ...configForm, ip: e.target.value })} />

            </div>

            <div>

              <label className="block text-sm font-medium mb-2">Owner Email</label>

              <Input type="email" value={configForm.email} onChange={e => setConfigForm({ ...configForm, email: e.target.value })} />

            </div>

          </div>

          <DialogFooter>

            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>

            <Button onClick={saveConfigure} disabled={configSaving}>{configSaving ? 'Saving...' : 'Save'}</Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      {/* Redeem Code Modal */}

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>

        <DialogContent className="sm:max-w-md">

          <DialogHeader>

            <DialogTitle>Redeem Code</DialogTitle>

            <DialogDescription>Enter your redeem code to add funds.</DialogDescription>

          </DialogHeader>

          <div className="space-y-3">

            <label className="text-sm font-medium">Redeem Code</label>

            <Input

              value={redeemCode}

              onChange={(e) => setRedeemCode(e.target.value)}

              placeholder="VEXSHIELD-XXXXX-XXXXX"

            />

          </div>

          <DialogFooter>

            <Button variant="outline" onClick={() => setRedeemOpen(false)}>Cancel</Button>

            <Button onClick={handleRedeem} disabled={redeeming}>

              {redeeming ? 'Redeeming...' : 'Redeem'}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>

  );

}

