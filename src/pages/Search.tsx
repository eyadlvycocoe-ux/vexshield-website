import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon, User, Loader2, Coins, Search as SearchIcon2, Crown, CheckCircle2, Gift, CreditCard, Check, Star, Home, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  apiMutationHeaders,
  apiUrl,
  ensureCsrfCookie,
  fetchPaypalServerReady,
} from "@/lib/api-base";
import { getPayPalSdk } from "@/lib/paypal-types";
import {
  SEARCH_TIMEOUT_MS,
  EMPTY_CHEAT_SERVERS,
  type BlacklistedUser,
  type BlacklistedProof,
  fetchLookupEnrich,
  fetchServerBansLazy,
  applySearchPayload,
  fetchBotOnlyFallback,
  applyBotInstantPayload,
  startParallelCheatLookups,
  snowflakeFromQuery,
  minimalDiscord,
  safeLikePattern,
} from "@/lib/user-lookup-search";
import type { BotBanEntry } from "@/components/BlacklistLivePanel";
import {
  PlayerLookupDashboard,
  type LookupProfile,
  type LookupDiscord,
  type CheatServerMembership,
  type CheatServerIntel,
  type ServerBanHit,
} from "@/components/PlayerLookupDashboard";
import {
  getCreditState,
  consumeCredit,
  getRemainingCredits,
} from "@/lib/lookup-credits";
import { useUserAuth } from "@/contexts/UserAuthContext";

type View = "dashboard" | "search" | "pricing";

function getDisplayName(user: any): string {
  if (!user) return "Guest";
  const meta = user.user_metadata || user.userMetadata || {};
  return (
    meta.global_name ||
    meta.full_name ||
    meta.name ||
    user.email?.split("@")[0] ||
    "User"
  );
}

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = location.pathname.startsWith("/demo");
  const { user } = useUserAuth();
  const navState = location.state as { prefilledQuery?: string; autoSearch?: boolean; view?: View } | null;
  const urlQuery = searchParams.get("q")?.trim() || "";
  const prefilled = navState?.prefilledQuery || urlQuery;

  const [view, setView] = useState<View>(navState?.view || "dashboard");
  const [query, setQuery] = useState(prefilled || "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [credits, setCredits] = useState(() => getCreditState());
  const [totalLookups, setTotalLookups] = useState(0);
  const [redeemCode, setRedeemCode] = useState("");
  const autoSearchRan = useRef(false);

  const searchAbortRef = useRef<AbortController | null>(null);
  const cheatAbortRef = useRef<AbortController | null>(null);
  const searchGenRef = useRef(0);

  const [blacklistedUser, setBlacklistedUser] = useState<BlacklistedUser | null>(null);

  // PayPal state for pricing cards
  const [paypalServerReady, setPaypalServerReady] = useState<boolean | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ duration: string; price: number } | null>(null);
  const paypalContainer1Ref = useRef<HTMLDivElement | null>(null);
  const paypalContainer3Ref = useRef<HTMLDivElement | null>(null);
  const paypalContainerLifeRef = useRef<HTMLDivElement | null>(null);
  const planParamsRef = useRef<{ duration: string; price: number } | null>(null);
  const [discordUser, setDiscordUser] = useState<LookupDiscord | null>(null);
  const [profile, setProfile] = useState<LookupProfile | null>(null);
  const [proofs, setProofs] = useState<BlacklistedProof[]>([]);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [botBans, setBotBans] = useState<BotBanEntry[]>([]);
  const [serverBans, setServerBans] = useState<ServerBanHit[]>([]);
  const [cheatServers, setCheatServers] = useState<CheatServerMembership | null>(null);
  const [cheatServersLoading, setCheatServersLoading] = useState(false);
  const [cheatIntel, setCheatIntel] = useState<CheatServerIntel | null>(null);
  const [cheatIntelLoading, setCheatIntelLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [asuAsData, setAsuAsData] = useState<any>(null);

  const searchSetters = {
    setBotBans, setServerBans, setIsBlacklisted, setBlacklistedUser,
    setProofs, setProfile, setDiscordUser, setCheatServers, setCheatServersLoading, setAsuAsData,
  };

  useEffect(() => {
    const iv = window.setInterval(() => setCredits(getCreditState()), 5000);
    return () => window.clearInterval(iv);
  }, []);

  // PayPal SDK loading
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
    const envId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
    const clientId = envId && envId.length > 0 ? envId : "test";
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR`;
    script.async = true;
    script.dataset.paypalSdk = "true";
    script.onload = () => setSdkReady(true);
    script.onerror = () => toast.error("Failed to load PayPal SDK");
    document.body.appendChild(script);
  }, [paypalServerReady]);

  // PayPal button rendering for each pricing plan
  const renderPaypalButton = useCallback(
    (container: HTMLDivElement | null, price: number, duration: string) => {
      if (!container || !sdkReady || !getPayPalSdk() || !user || paypalServerReady !== true) return;
      if (price <= 0) return;

      container.innerHTML = "";
      const paypal = getPayPalSdk();
      if (!paypal) return;

      const planData = { duration, price };

      try {
        paypal
          .Buttons({
            style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
            createOrder: async () => {
              planParamsRef.current = planData;
              await ensureCsrfCookie();
              const res = await fetch(apiUrl('/api/paypal/create-order'), {
                method: "POST",
                credentials: "include",
                headers: apiMutationHeaders(),
                body: JSON.stringify({
                  kind: "shop",
                  products: { airshield: true },
                  duration: duration,
                }),
              });
              const j = await res.json().catch(() => ({}));
              if (!res.ok) {
                if (res.status === 401) throw new Error(j.error || "Sign in again to complete payment.");
                if (j.code === "PAYPAL_NOT_CONFIGURED") throw new Error(j.error || "Payment service unavailable");
                if (j.code === "PAYPAL_UPSTREAM" && j.error) throw new Error(String(j.error));
                throw new Error(j.error || "Could not create order");
              }
              return j.orderId;
            },
            onApprove: async (data) => {
              setProcessing(true);
              try {
                await ensureCsrfCookie();
                const res = await fetch(apiUrl('/api/paypal/capture-order'), {
                  method: "POST",
                  credentials: "include",
                  headers: apiMutationHeaders(),
                  body: JSON.stringify({ orderID: data.orderID }),
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(j.error || "Capture failed");
                toast.success("Payment complete! Check your email for details.");
                navigate("/my-servers");
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "Payment failed");
              } finally {
                setProcessing(false);
              }
            },
            onError: (err) => {
              console.error("PayPal Error:", err);
              toast.error("PayPal could not start. Please reload the page and try again.");
            },
          })
          .render(container);
      } catch (e) {
        console.warn("PayPal render error:", e);
      }
    },
    [sdkReady, paypalServerReady, user, navigate]
  );

  // Render PayPal buttons when view is pricing
  useEffect(() => {
    if (view !== "pricing" || !sdkReady || paypalServerReady !== true || !user) return;
    // Defer rendering to let refs attach
    const t = window.setTimeout(() => {
      renderPaypalButton(paypalContainer1Ref.current, 5, "1month");
      renderPaypalButton(paypalContainer3Ref.current, 12, "3month");
      renderPaypalButton(paypalContainerLifeRef.current, 25, "permanent");
    }, 100);
    return () => window.clearTimeout(t);
  }, [view, sdkReady, paypalServerReady, user, renderPaypalButton]);

  const resetResults = useCallback(() => {
    setQuery("");
    setSearched(false);
    setBlacklistedUser(null);
    setDiscordUser(null);
    setProfile(null);
    setProofs([]);
    setIsBlacklisted(false);
    setServerBans([]);
    setBotBans([]);
    setCheatServers(null);
    setCheatIntel(null);
    setCredits(getCreditState());
  }, []);

  const goToSearch = useCallback(() => {
    resetResults();
    setView("search");
  }, [resetResults]);

  const goToDashboard = useCallback(() => {
    setView("dashboard");
  }, []);

  const goToPricing = useCallback(() => {
    setView("pricing");
  }, []);

  const handleRedeem = useCallback(() => {
    if (!redeemCode.trim()) return toast.error("Enter a redeem code");
    toast.success("Redeem code submitted! Check your email for confirmation.");
    setRedeemCode("");
  }, [redeemCode]);

  const handleSearch = useCallback(
    async (overrideQuery?: string, options?: { fromAuto?: boolean }) => {
      if (isDemo) {
        const { makeDemoData } = await import("@/demo/demoData");
        const demo = makeDemoData();
        const r = demo.searchDemo;
        setSearched(true);
        setIsBlacklisted(r.blacklisted);
        setBlacklistedUser(r.blacklist as BlacklistedUser);
        setDiscordUser(r.discord as LookupDiscord);
        setProofs(r.proofs as BlacklistedProof[]);
        setProfile(null);
        setServerBans([]);
        setBotBans([]);
        setTotalLookups((p) => p + 1);
        return;
      }

      const trimmedQuery = (overrideQuery ?? query).trim().replace(/\s+/g, "");
      if (!trimmedQuery) return toast.error("Please enter a Discord ID, license hash, or username");

      const isId = /^\d{17,19}$/.test(trimmedQuery) || /^discord:\d{17,19}$/i.test(trimmedQuery);
      const isLicense =
        /^license:[a-f0-9]{30,50}$/i.test(trimmedQuery) || /^[a-f0-9]{30,50}$/i.test(trimmedQuery);
      if (!isId && !isLicense && !safeLikePattern(trimmedQuery)) {
        return toast.error("Enter a valid Discord ID (17-19 digits)");
      }

      if (!isDemo) {
        const remaining = getRemainingCredits();
        if (remaining < 1) {
          toast.error("No lookups remaining. Wait for credits to refresh.");
          setCredits(getCreditState());
          return;
        }
        if (!consumeCredit()) {
          toast.error("Failed to consume credit. Try again.");
          return;
        }
        setCredits(getCreditState());
      }

      searchAbortRef.current?.abort();
      cheatAbortRef.current?.abort();
      const abort = new AbortController();
      searchAbortRef.current = abort;
      const gen = ++searchGenRef.current;

      const snowflake = snowflakeFromQuery(trimmedQuery);

      setLoading(true);
      setBlacklistedUser(null);
      setDiscordUser(snowflake ? minimalDiscord(snowflake) : null);
      setProfile(snowflake ? { discord_id: snowflake, player_name: null } : null);
      setProofs([]);
      setIsBlacklisted(false);
      setBotBans([]);
      setServerBans([]);
      setCheatServers(snowflake ? EMPTY_CHEAT_SERVERS : null);
      setCheatServersLoading(Boolean(snowflake));
      setCheatIntel(null);
      setCheatIntelLoading(Boolean(snowflake));
      setEnriching(true);
      setSearched(true);

      const timeoutId = window.setTimeout(() => abort.abort(), SEARCH_TIMEOUT_MS);

      if (snowflake) {
        setLoading(false);
        setEnriching(false);
        setTotalLookups((p) => p + 1);

        void fetchBotOnlyFallback(snowflake, abort.signal).then((json) => {
          if (gen !== searchGenRef.current || abort.signal.aborted || !json) return;
          applyBotInstantPayload(json, snowflake, searchSetters);
        });

        window.setTimeout(() => {
          if (gen !== searchGenRef.current || abort.signal.aborted) return;
          cheatAbortRef.current?.abort();
          const cheatAbort = new AbortController();
          cheatAbortRef.current = cheatAbort;
          startParallelCheatLookups(snowflake, gen, cheatAbort, setCheatServers, setCheatServersLoading, setCheatIntel, setCheatIntelLoading, searchGenRef);
        }, 60);

        window.setTimeout(() => {
          if (gen !== searchGenRef.current || abort.signal.aborted) return;
          void fetchLookupEnrich(trimmedQuery, abort.signal, { core: true })
            .then((json) => {
              if (gen !== searchGenRef.current || abort.signal.aborted) return;
              applySearchPayload(json, snowflake, searchSetters);
            })
            .catch((error) => {
              if (gen !== searchGenRef.current) return;
              if (!(error instanceof Error && error.name === "AbortError")) {
                console.error("Enrich lookup failed:", error);
              }
            });
        }, 180);

        window.setTimeout(() => {
          if (gen !== searchGenRef.current || abort.signal.aborted) return;
          void fetchServerBansLazy(trimmedQuery, abort.signal).then((bans) => {
            if (gen !== searchGenRef.current || abort.signal.aborted) return;
            if (bans.length) setServerBans(bans);
          });
        }, 420);

        window.clearTimeout(timeoutId);
        return;
      }

      try {
        const json = await fetchLookupEnrich(trimmedQuery, abort.signal, { core: true });
        if (gen !== searchGenRef.current) return;
        if (!json) throw new Error("Lookup failed. Make sure you are logged in.");
        applySearchPayload(json, null, searchSetters);
        setTotalLookups((p) => p + 1);

        void fetchServerBansLazy(trimmedQuery, abort.signal).then((bans) => {
          if (gen !== searchGenRef.current || abort.signal.aborted) return;
          if (bans.length) setServerBans(bans);
        });
      } catch (error) {
        if (gen !== searchGenRef.current) return;
        if (error instanceof Error && error.name === "AbortError") {
          if (!options?.fromAuto) toast.error("Search timed out. Try again.");
        } else {
          console.error("Search failed:", error);
          toast.error("Search failed. Make sure you are logged in.");
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (gen === searchGenRef.current) setLoading(false);
      }
    },
    [query, isDemo, searchSetters],
  );

  const runSearchNow = useCallback(() => handleSearch(), [handleSearch]);

  useEffect(() => {
    if (autoSearchRan.current) return;
    if (!prefilled || !isDemo) return;
    autoSearchRan.current = true;
    setView("search");
    void handleSearch(prefilled);
  }, [prefilled, isDemo, handleSearch]);

  const hasResult = Boolean(blacklistedUser || discordUser || profile);
  const displayName = getDisplayName(user);

  if (view === "pricing") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#06080d]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={goToDashboard}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-bold"
            >
              <Home className="h-3.5 w-3.5 mr-1.5 text-sky-400" />
              Back to Home
            </Button>
          </div>

          {/* Redeem Code */}
          <Card className="mb-8 border-white/[0.08] bg-white/[0.03] p-6">
            <div className="mb-1 flex items-center gap-2 text-base font-semibold text-white">
              <Gift className="h-5 w-5 text-blue-400" /> Redeem Code
            </div>
            <p className="mb-4 text-sm text-slate-400">Have a redeem code? Enter it below to activate your subscription.</p>
            <div className="flex gap-2">
              <Input
                className="h-10 flex-1 border-white/[0.1] bg-white/[0.05] text-white placeholder:text-slate-600"
                placeholder="INC-XXXXXXXX"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
              />
              <Button onClick={handleRedeem} className="bg-white/10 text-white hover:bg-white/20">Redeem</Button>
            </div>
          </Card>

          {!user && (
            <div className="mb-6 text-center">
              <p className="text-sm text-slate-400 mb-3">Sign in to purchase a plan</p>
              <Button onClick={() => navigate("/auth")} className="bg-blue-600 text-white hover:bg-blue-500">Sign In</Button>
            </div>
          )}

          {/* 3 Pricing Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* 1 Month */}
            <Card className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#0f0f0f] p-6 md:p-8 transition-all duration-500 hover:border-zinc-600/90">
              <div className="relative z-[2]">
                <h3 className="text-lg font-bold text-white">Air Lookup (1 Month)</h3>
                <p className="mt-1.5 text-sm text-slate-400">Perfect for testing and short-term projects</p>
                <div className="mt-5 flex flex-wrap items-baseline gap-2">
                  <span className="text-[clamp(1.8rem,3vw,2.5rem)] font-black leading-none text-white tabular-nums">5</span>
                  <span className="text-sm text-slate-500">/ month</span>
                </div>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Unlimited lookups</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> No rate limits</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Ad-free experience</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Premium discounts</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> See Risk Score</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Priority support</li>
              </ul>
              <Button
                className="relative z-[2] mt-6 w-full rounded-xl border-0 bg-[#5865F2] hover:bg-[#4752C4] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/25 flex items-center justify-center gap-2"
                onClick={() => window.open("https://discord.gg/5WgtMWbtgD", "_blank", "noopener,noreferrer")}
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Order via Discord
              </Button>
            </Card>

            {/* 3 Months */}
            <Card className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#0f0f0f] p-6 md:p-8 transition-all duration-500 hover:border-zinc-600/90">
              <div className="relative z-[2]">
                <h3 className="text-lg font-bold text-white">Air Lookup (3 Months)</h3>
                <p className="mt-1.5 text-sm text-slate-400">Great value for established servers</p>
                <div className="mt-5 flex flex-wrap items-baseline gap-2">
                  <span className="text-[clamp(1.8rem,3vw,2.5rem)] font-black leading-none text-white tabular-nums">12</span>
                  <span className="text-sm text-slate-500">/ 3 months</span>
                </div>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> 3 Months Access</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> No rate limits</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Ad-free experience</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Premium discounts</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> See Risk Score</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Priority support</li>
              </ul>
              <Button
                className="relative z-[2] mt-6 w-full rounded-xl border-0 bg-[#5865F2] hover:bg-[#4752C4] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/25 flex items-center justify-center gap-2"
                onClick={() => window.open("https://discord.gg/5WgtMWbtgD", "_blank", "noopener,noreferrer")}
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Order via Discord
              </Button>
            </Card>

            {/* Lifetime */}
            <Card className="relative flex flex-col overflow-hidden rounded-2xl border border-[#0095ff]/40 bg-[#0f0f0f] p-6 md:p-8 shadow-[0_20px_60px_rgba(0,149,255,0.15)] transition-all duration-500 scale-[1.02] z-[1]">
              <div className="absolute right-3 top-3 rounded-full bg-[#0095ff] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                <Star className="mr-1 inline h-3 w-3 fill-white" />
                MOST POPULAR
              </div>
              <div className="relative z-[2]">
                <h3 className="text-lg font-bold text-white">Air Lookup (Lifetime)</h3>
                <p className="mt-1.5 text-sm text-slate-400">The ultimate choice for professional communities</p>
                <div className="mt-5 flex flex-wrap items-baseline gap-2">
                  <span className="text-[clamp(1.8rem,3vw,2.5rem)] font-black leading-none text-white tabular-nums">25</span>
                  <span className="text-sm text-slate-500">/ forever</span>
                </div>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Unlimited lookups forever</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> No rate limits</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Ad-free experience</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Premium discounts</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> See Risk Score</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> Priority support</li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0095ff]" strokeWidth={2.5} /> One-time payment</li>
              </ul>
              <Button
                className="relative z-[2] mt-6 w-full rounded-xl border-0 bg-[#5865F2] hover:bg-[#4752C4] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/25 flex items-center justify-center gap-2"
                onClick={() => window.open("https://discord.gg/5WgtMWbtgD", "_blank", "noopener,noreferrer")}
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Order via Discord
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (view === "search") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#06080d]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(59,130,246,0.06),transparent)]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 md:py-12">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <img src="/logo.png" alt="VexShield" className="h-8 w-auto" />
              <span className="text-lg font-bold text-white">VexShield</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
                className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-bold"
              >
                <Home className="h-3.5 w-3.5 mr-1.5 text-sky-400" />
                Back to Home
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToDashboard}
                className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-bold"
              >
                Dashboard
              </Button>
            </div>
          </div>
          <div className="mb-12 text-center">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-400/80">
              Player Intelligence
            </p>
            <h1 className="text-[clamp(2.2rem,6vw,4.5rem)] font-black tracking-tight text-white">
              Search players instantly
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
              Look up Discord IDs, license hashes, or usernames. Each search uses one credit from your free daily allowance.
            </p>
          </div>

          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <SearchIcon className="pointer-events-none ml-3 h-5 w-5 text-slate-500" />
                <Input
                  className="h-12 min-w-0 flex-1 border-0 bg-transparent pl-2 pr-3 text-base text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Discord ID, license hash, or username"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearchNow()}
                />
                <div className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-300 sm:flex">
                  <Coins className="h-4 w-4" />
                  <span>{credits.remaining} credits</span>
                </div>
                <Button
                  onClick={runSearchNow}
                  disabled={loading}
                  className="h-10 shrink-0 rounded-xl bg-blue-600 px-6 text-white hover:bg-blue-500"
                  size="sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-slate-600">
              Free: 2 lookups per 10 minutes
            </p>
          </div>

          {loading && (
            <div className="mx-auto mt-12 max-w-2xl">
              <Card className="flex flex-col items-center gap-3 border-white/[0.08] bg-white/[0.03] p-12 backdrop-blur">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm text-slate-400">Looking up player...</p>
              </Card>
            </div>
          )}

          {searched && !loading && !hasResult && (
            <div className="mx-auto mt-12 max-w-2xl">
              <Card className="border-white/[0.08] bg-white/[0.03] p-10 text-center backdrop-blur">
                <User className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                <p className="font-medium text-white">No results found</p>
                <p className="mt-1 text-sm text-slate-500">Try a valid Discord ID (17-19 digits)</p>
              </Card>
            </div>
          )}

          {!loading && hasResult && (
            <div className="mx-auto mt-12 max-w-4xl">
              {enriching && (
                <p className="mb-4 text-center text-xs text-slate-500">Syncing ban data...</p>
              )}
              <PlayerLookupDashboard
                profile={profile}
                discord={discordUser}
                cheatServers={cheatServers}
                cheatServersLoading={cheatServersLoading}
                cheatIntel={cheatIntel}
                cheatIntelLoading={cheatIntelLoading}
                serverBans={serverBans}
                botBans={botBans}
                isBlacklisted={isBlacklisted}
                blacklistedUser={blacklistedUser}
                blacklistedReason={blacklistedUser?.reason}
                proofs={proofs}
                skipDiscordEnrich
                asuAs={asuAsData}
              />
              <div className="mt-6 flex items-center gap-4">
                <button
                  type="button"
                  onClick={resetResults}
                  className="text-sm font-semibold text-slate-400 transition hover:text-white"
                >
                  New Lookup
                </button>
                <button
                  type="button"
                  onClick={goToDashboard}
                  className="text-sm font-semibold text-slate-400 transition hover:text-white"
                >
                  Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080b12]">
      {/* Grid pattern background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 md:py-12">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <img src="/logo.png" alt="VexShield" className="h-8 w-auto" />
            <span className="text-lg font-bold text-white">VexShield Intelligence</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-bold"
          >
            <Home className="h-3.5 w-3.5 mr-1.5 text-sky-400" />
            Back to Home
          </Button>
        </div>

        {/* Welcome */}
        <div className="mb-10">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-400/70">Dashboard</p>
          <h1 className="text-3xl font-black text-white md:text-4xl">Welcome back, <span className="text-blue-400">{displayName}</span></h1>
          <p className="mt-2 text-sm text-slate-500">Manage your account and view your lookup history</p>
        </div>

        {/* Stats cards */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition hover:border-white/[0.12]">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-[40px] transition group-hover:bg-emerald-500/20" />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="max-w-[180px] leading-tight">Credits<br /><span className="text-[10px] text-slate-600">replenish every 10 min</span></span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Coins className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-white">{credits.remaining}<span className="ml-1 text-lg text-slate-600">/ {credits.total}</span></p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition hover:border-white/[0.12]">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/10 blur-[40px] transition group-hover:bg-blue-500/20" />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Lookups</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <SearchIcon2 className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-white">{totalLookups}</p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition hover:border-white/[0.12]">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/10 blur-[40px] transition group-hover:bg-blue-500/20" />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Account Status</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Crown className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Free
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <CreditCard className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <span className="text-base font-bold text-white">Quick Actions</span>
          </div>
          <p className="mb-4 mt-1 text-[13px] text-slate-500">Get more credits or start a lookup</p>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={goToPricing}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:border-blue-500/20 hover:bg-blue-500/5 hover:text-white"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Crown className="h-4 w-4 text-blue-400" />
              </div>
              Buy Premium <span className="text-slate-600">(No more ads and limits)</span>
            </button>
            <button
              type="button"
              onClick={goToSearch}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:border-blue-500/20 hover:bg-blue-500/5 hover:text-white"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <SearchIcon2 className="h-4 w-4 text-blue-400" />
              </div>
              New Lookup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}