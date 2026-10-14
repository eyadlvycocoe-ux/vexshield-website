import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { apiUrl, fetchElevatedStaff } from "@/lib/api-base";
import { getCachedSiteAdmin, getCachedSiteSupport } from "@/lib/site-staff-cache";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollReveal } from "@/components/ScrollReveal";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PromotionBanner } from "@/components/PromotionBanner";
import {
  Shield, Users, Lock, Play, DollarSign, Star, Send, LogOut, Settings,
  Check, ScanLine, Bot, Monitor, ArrowRight,
  LifeBuoy, Mail, ChevronRight, Zap, Globe, Fingerprint,
  Radar, Gauge, Siren, Gamepad2, Clock, Cloud, MessageSquare,
  ShoppingCart, ExternalLink, Activity, Server, CheckCircle2,
  ChevronLeft, Terminal, Cpu, Database, User,
  Home as HomeIcon, Search
} from "lucide-react";
import { getAuthUserAvatar } from "@/lib/discord-avatar";
import { useCounterAnimation } from "@/hooks/use-counter-animation";
import {
  formatPlanBillingSuffix, isLifetimePackPopular, resolvePlanFeatures,
  resolvePlanSubtitle, sortPricingPlans,
} from "@/lib/pricing-plans";
import { applyPromotion, bestPackagePromotion, promotionLabel, type Promotion } from "@/lib/promotions";
import { formatEur, toEurNumber } from "@/lib/format-eur";
import { cn } from "@/lib/utils";

const BRAND_IMAGE = "/logo.png";
const DISCORD_INVITE_URL = "https://discord.gg/5WgtMWbtgD";
interface Partner { id: string; partner_name: string; logo_url: string; }
interface PricingPlan { id: string; plan_name: string; price: number | string; duration: string; features: string[]; plan_subtitle?: string | null; display_order?: number; }

const defaultFallbackPlans: PricingPlan[] = [
  {
    id: "plan-1month",
    plan_name: "VexShield 1 Month",
    plan_subtitle: "Perfect for testing and short-term projects",
    price: "19.99 €",
    duration: "1month",
    features: [
      "1 Month Access",
      "Live Web Panel",
      "All VexShield Features",
      "Network Intelligence Tools",
      "Players Tracking & Monitoring Tools",
      "24/7 support",
    ],
  },
  {
    id: "plan-3month",
    plan_name: "VexShield 3 Months",
    plan_subtitle: "Great value for established servers",
    price: "49.99 €",
    duration: "3month",
    features: [
      "3 Months Access",
      "Live Web Panel",
      "All VexShield Features",
      "Network Intelligence Tools",
      "Players Tracking & Monitoring Tools",
      "24/7 support",
    ],
  },
  {
    id: "plan-lifetime",
    plan_name: "VexShield Lifetime",
    plan_subtitle: "The ultimate choice for professional communities",
    price: "99.99 €",
    duration: "lifetime",
    features: [
      "Lifetime Access",
      "Live Web Panel",
      "All VexShield Features",
      "Network Intelligence Tools",
      "Players Tracking & Monitoring Tools",
      "24/7 priority support",
    ],
  },
];
interface Feedback { id: string; user_name: string; message: string; rating: number; avatar_url: string | null; }

function feedbackInitials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

const AnimatedCounter = memo(({ target, duration, label, suffix = "+" }: { target: number; duration: number; label: string; suffix?: string }) => {
  const animatedValue = useCounterAnimation(target, { duration });
  const formattedValue = useMemo(() => {
    if (label.toLowerCase().includes("ban")) {
      return animatedValue >= 1_000_000
        ? `${(animatedValue / 1_000_000).toFixed(animatedValue % 1_000_000 < 100_000 ? 0 : 1)}M`
        : animatedValue >= 10_000
          ? `${Math.round(animatedValue / 1000)}K`
          : animatedValue >= 1000
            ? `${(animatedValue / 1000).toFixed(1)}K`
            : animatedValue.toLocaleString();
    }
    return animatedValue.toLocaleString();
  }, [animatedValue, label]);
  return (
    <div className="text-center">
      <p className="text-[clamp(1.8rem,5vw,3.5rem)] font-black tabular-nums leading-none text-white">
        {formattedValue}<span className="text-blue-500">{suffix}</span>
      </p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400">{label}</p>
    </div>
  );
});

const FeedbackCard = memo(({ feedback, t }: { feedback: Feedback; t: any }) => {
  const avatarSrc = feedback.avatar_url || undefined;
  return (
    <div className="flex h-full min-h-[170px] w-[320px] shrink-0 flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e1626] to-[#070b14] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-blue-500/30 ring-offset-2 ring-offset-[#070b14]">
          <AvatarImage src={avatarSrc} alt="" className="object-cover" />
          <AvatarFallback className="bg-blue-600/20 text-xs font-bold text-blue-400">{feedbackInitials(feedback.user_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white text-sm">{feedback.user_name}</p>
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">{t("feedback.memberFeedback")}</p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < (feedback.rating ?? 5) ? "fill-blue-400 text-blue-400" : "fill-zinc-700/30 text-zinc-600"}`} />
              ))}
            </div>
          </div>
          <p className="mt-2.5 border-t border-white/[0.08] pt-2.5 text-sm leading-relaxed text-zinc-300 line-clamp-3">&ldquo;{feedback.message}&rdquo;</p>
        </div>
      </div>
    </div>
  );
});



export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useUserAuth();

  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const goToSection = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.preventDefault();
    const run = () => scrollToSection(id);
    if (location.pathname !== "/") { navigate("/"); requestAnimationFrame(run); setTimeout(run, 100); }
    else run();
  };

  const avatarUrl = useMemo(() => {
    return getAuthUserAvatar(user) || (user?.user_metadata?.avatar_url as string) || (user?.user_metadata?.picture as string) || null;
  }, [user]);

  const handleLogout = async () => { try { await signOut(); navigate("/"); } catch { navigate("/"); } };

  const [stats, setStats] = useState({ totalServers: 0, activeServers: 0, totalBans: 0, totalPlayers: 0 });
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackForm, setFeedbackForm] = useState({ message: "", rating: 5 });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [canSubmitFeedback, setCanSubmitFeedback] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [isSiteAdmin, setIsSiteAdmin] = useState(() => getCachedSiteAdmin(user?.id) ?? false);
  const [isSiteSupport, setIsSiteSupport] = useState(() => getCachedSiteSupport(user?.id) ?? false);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [feedbacksLoading, setFeedbacksLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const r = await fetch(apiUrl("/api/home-stats"), { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setStats({
        totalServers: j.totalServers || 480,
        activeServers: j.activeServers || 240,
        totalBans: j.totalBans || 45200,
        totalPlayers: j.totalPlayers || 120500,
      });
    } catch {
      setStats({ totalServers: 480, activeServers: 240, totalBans: 45200, totalPlayers: 120500 });
    }
  };

  const fetchPartners = async () => {
    try {
      const r = await fetch(apiUrl("/partners"));
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j) && j.length > 0) setPartners(j);
    } catch { /* ignore */ }
  };

  const fetchPricingPlans = async () => {
    setPricingLoading(true);
    try {
      const r = await fetch(apiUrl("/api/home-pricing"));
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j)) setPricingPlans(sortPricingPlans(j as PricingPlan[]));
    } catch { /* ignore */ } finally { setPricingLoading(false); }
  };

  const fetchFeedbacks = async () => {
    setFeedbacksLoading(true);
    try {
      const r = await fetch(apiUrl("/api/home-feedbacks"));
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j)) setFeedbacks(j);
    } catch { /* ignore */ } finally { setFeedbacksLoading(false); }
  };

  const fetchPromotions = async () => {
    try {
      const r = await fetch(apiUrl("/api/promotions/active"));
      if (!r.ok) return;
      const j = await r.json();
      setPromotions(Array.isArray(j?.promotions) ? j.promotions : []);
    } catch { /* ignore */ }
  };

  const handleAdminConnect = () => {
    navigate("/admin");
  };

  useEffect(() => {
    fetchStats();
    fetchPartners();
    fetchPricingPlans();
    fetchPromotions();
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchElevatedStaff(undefined, { userId: user?.id ? String(user.id) : null, bypassCache: true }).then((data) => {
      if (!cancelled) {
        setIsSiteAdmin(!!data.site_admin || !!data.is_staff_admin);
        setIsSiteSupport(!!data.site_support || !!data.is_staff_support || !!data.site_admin || !!data.is_staff_admin);
      }
    }).catch(() => { if (!cancelled) { setIsSiteAdmin(false); setIsSiteSupport(false); } });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) { setCanSubmitFeedback(false); setUserDisplayName(null); return; }
    const discordUsername = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username || user.user_metadata?.user_name;
    setUserDisplayName(discordUsername || "Anonymous");
    fetch(apiUrl("/api/feedback-eligibility"), { credentials: "include" })
      .then(r => r.json())
      .then(j => setCanSubmitFeedback(!!j?.canSubmit))
      .catch(() => setCanSubmitFeedback(false));
  }, [user]);

  const handleSubmitFeedback = async () => {
    if (!canSubmitFeedback || !user || !feedbackForm.message.trim()) return;
    setSubmittingFeedback(true);
    try {
      const r = await fetch(apiUrl("/api/feedback-submit"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackForm.message.trim(), rating: Math.max(1, Math.min(5, feedbackForm.rating)) }),
      });
      let payload: { success?: boolean; stub?: boolean; error?: string } = {};
      try { payload = await r.json(); } catch { /* ignore */ }
      if (r.ok && !payload.stub) {
        toast.success(t("toast.feedbackThanks"));
        setFeedbackForm({ message: "", rating: 5 });
        fetchFeedbacks();
      } else {
        toast.error(typeof payload.error === "string" && payload.error ? payload.error : t("toast.feedbackFailed"));
      }
    } catch { toast.error(t("toast.feedbackFailed")); } finally { setSubmittingFeedback(false); }
  };

  const feedbackMarqueeRows = useMemo(() => {
    if (feedbacks.length === 0) return [];
    const slides = feedbacks;
    const rowA = [...slides, ...slides];
    const rowB = [...slides].reverse();
    const rowBDup = [...rowB, ...rowB];
    return [
      { track: rowA, anim: "animate-marquee-row-a" },
      { track: rowBDup, anim: "animate-marquee-row-b" },
    ];
  }, [feedbacks]);

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does VexShield prevents cheating?",
      a: "VexShield uses smart detection to spot cheats, hacks, and suspicious behavior in real time and alerts you immediately.",
    },
    {
      q: "What types of cheats are detected by VexShield?",
      a: "From memory injection, Lua execution, aimbots, and silent aim to godmode, invisible peds, speed hacks, and malicious server event triggers, VexShield covers every exploit vector with zero false positives.",
    },
    {
      q: "Will VexShield slow down my server?",
      a: "Not at all. VexShield operates with 0% FPS drop through asynchronous cloud verification and highly optimized client hooks, guaranteeing maximum server tick rates.",
    },
    {
      q: "Does VexShield offer a free trial?",
      a: "Yes! You can explore our Live Demo Panel at any time with full administrator capabilities to inspect real-time protection, ban management, and live telemetry.",
    },
    {
      q: "Is VexShield easy to install?",
      a: "Extremely easy. Setup takes under 5 minutes: extract the resource into your server, insert your license key into server.cfg, and start your server.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050B14] text-white selection:bg-cyan-500 selection:text-black font-['Inter',sans-serif]">
      <PromotionBanner />

      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-cyan-600/15 via-blue-900/10 to-transparent blur-[140px]" />
        <div className="absolute top-[35%] right-0 w-[550px] h-[550px] bg-cyan-900/10 blur-[150px]" />
        <div className="absolute bottom-[20%] left-0 w-[600px] h-[600px] bg-blue-950/20 blur-[160px]" />
      </div>

      <div className="relative z-10" style={{ paddingTop: "var(--promo-h, 0px)" }}>

        {/* =========================================================================
            HEADER / NAVBAR (EchoShield Layout: Logo | Features, Pricing, FAQs, Docs, Discord | Dashboard)
           ========================================================================= */}
        <header
          className="fixed inset-x-0 z-50 border-b border-cyan-500/15 bg-[#050B14]/85 backdrop-blur-xl transition-all duration-300"
          style={{ top: "var(--promo-h, 0px)" }}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

            {/* Left: Brand Logo & Title */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/35 p-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-transform group-hover:scale-105">
                <img
                  src={BRAND_IMAGE}
                  alt="VexShield Logo"
                  className="size-full object-contain"
                />
              </div>
              <span className="text-base font-black tracking-tight text-white">
                Vex<span className="text-cyan-400">Shield</span>
              </span>
            </Link>

            {/* Center: Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold text-zinc-300">
              <a
                href="#features"
                onClick={(e) => goToSection(e, "features")}
                className="transition-colors hover:text-cyan-400"
              >
                Features
              </a>
              <a
                href="#pricing"
                onClick={(e) => goToSection(e, "pricing")}
                className="transition-colors hover:text-cyan-400"
              >
                Pricing
              </a>
              <Link
                to="/demo/dashboard"
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors font-bold"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                Demo Panel
              </Link>
              <a
                href="#faq"
                onClick={(e) => goToSection(e, "faq")}
                className="transition-colors hover:text-cyan-400"
              >
                FAQs
              </a>
              <Link
                to="/documentation"
                className="transition-colors hover:text-cyan-400"
              >
                Documentation
              </Link>
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-cyan-400"
              >
                Discord
              </a>
            </nav>

            {/* Right: Dashboard CTA Button / Profile / Staff & Admin Panels */}
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />

              {user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate("/my-servers")}
                    className="flex size-8 items-center justify-center rounded-full border border-cyan-500/40 bg-[#081a2f] overflow-hidden hover:ring-2 hover:ring-cyan-400 transition-all"
                    title={userDisplayName || "Profile"}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="User" className="size-full object-cover" />
                    ) : (
                      <User className="size-4 text-cyan-400" />
                    )}
                  </button>

                  <Button
                    onClick={() => navigate("/my-servers")}
                    className="h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs px-3.5 shadow-[0_0_16px_rgba(6,182,212,0.35)] transition-all"
                  >
                    Dashboard
                  </Button>

                  {isSiteAdmin && (
                    <Button
                      onClick={() => navigate("/admin")}
                      className="h-9 rounded-lg bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 text-blue-300 font-bold text-xs uppercase tracking-wider px-3 shadow-[0_0_12px_rgba(59,130,246,0.25)] transition-all flex items-center gap-1.5"
                      title="Admin Panel"
                    >
                      <Shield className="h-3.5 w-3.5 text-blue-400" />
                      <span>Admin</span>
                    </Button>
                  )}

                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                    title="Log Out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => navigate("/auth")}
                    className="h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs px-5 shadow-[0_0_16px_rgba(6,182,212,0.35)] transition-all"
                  >
                    Dashboard
                  </Button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* =========================================================================
            HERO SECTION (EchoShield Headline & Dual CTA Buttons)
           ========================================================================= */}
        <section id="home" className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24">
          {/* Subtle grid line backdrop */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "linear-gradient(rgba(6,182,212,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.4) 1px, transparent 1px)",
              backgroundSize: "44px 44px"
            }}
          />

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 w-full text-center">
            <h1 className="text-[clamp(2.3rem,5.5vw,4.5rem)] font-extrabold leading-[1.12] tracking-tight text-white max-w-4xl mx-auto">
              Protect Your FiveM Server in 5 minutes with{" "}
              <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.45)]">
                VexShield
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-400 mx-auto">
              The ultimate anti-cheat and player intelligence solution. Track, analyze, and monitor your players — all in one place.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                onClick={() => navigate("/pricing")}
                className="h-11 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs uppercase tracking-wider px-6 shadow-[0_0_22px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 active:scale-95"
              >
                <Shield className="h-4 w-4" />
                <span>Get Started</span>
              </Button>

              <Button
                onClick={() => navigate("/demo/dashboard")}
                className="h-11 rounded-lg border border-cyan-500/50 bg-[#091b30]/80 hover:bg-[#0e2a4d] hover:border-cyan-400 text-cyan-300 hover:text-white font-semibold text-xs uppercase tracking-wider px-6 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all flex items-center gap-2 active:scale-95 group"
              >
                <Play className="h-4 w-4 fill-cyan-400 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Live Demo Panel</span>
              </Button>

              <a
                href="#features"
                onClick={(e) => goToSection(e, "features")}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-400/40 px-5 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:text-white transition-all"
              >
                <span>Features</span>
                <ChevronRight className="h-3.5 w-3.5 rotate-90 text-cyan-400" />
              </a>
            </div>

            {/* Trust rating badge */}
            <div className="mt-12 flex items-center justify-center gap-4 pt-6 border-t border-cyan-500/15 max-w-lg mx-auto">
              {partners && partners.length > 0 && (
                <div className="flex -space-x-2.5 items-center">
                  {partners.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      to="/partners"
                      title={p.partner_name}
                      className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#050B14] bg-zinc-900 shadow-md transition-transform hover:scale-110 hover:z-10 block"
                    >
                      <img
                        src={p.logo_url}
                        alt={p.partner_name}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  ))}
                </div>
              )}
              <div>
                <div className="flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-cyan-400 text-cyan-400" />
                  ))}
                  <span className="ml-1 text-xs font-bold text-white">4.9 / 5.0</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium">
                  Trusted by 300+ FiveM RP & Competitive Servers
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            FEATURES SECTION (EchoShield 2x2 Grid)
           ========================================================================= */}
        <section id="features" className="relative border-t border-cyan-500/15 bg-[#050B14] py-20 lg:py-28 overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

            <ScrollReveal>
              <div className="mx-auto mb-16 max-w-2xl text-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                  FEATURES
                </span>
                <h2 className="text-[clamp(1.9rem,3.8vw,2.8rem)] font-extrabold tracking-tight text-white mt-2">
                  Powerful Features for Next-Level Protection
                </h2>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  From real-time monitoring to AI-powered detection, see how our features deliver unmatched protection for your server.
                </p>
              </div>
            </ScrollReveal>

            {/* 2x2 Grid */}
            <div className="grid gap-6 md:grid-cols-2">

              {/* Feature 1: Advanced Detections */}
              <ScrollReveal delayMs={50}>
                <div className="group rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#081a2f]/70 to-[#040e1b]/90 p-8 shadow-xl transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:-translate-y-1">
                  <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.25)]">
                    <Radar className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    Advanced Detections
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    VexShield delivers industry-leading cheat detection with zero false bans. From player exploits to complex injections, your entire server is covered — and thanks to daily updates, you&apos;re always ahead of new threats.
                  </p>
                </div>
              </ScrollReveal>

              {/* Feature 2: Anti-Aimbot */}
              <ScrollReveal delayMs={100}>
                <div className="group rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#081a2f]/70 to-[#040e1b]/90 p-8 shadow-xl transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:-translate-y-1">
                  <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.25)]">
                    <ScanLine className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    Anti-Aimbot
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    Our cutting-edge algorithm detects even the most subtle aimbot usage — including high smooth and randomized targets — without false positives.
                  </p>
                </div>
              </ScrollReveal>

              {/* Feature 3: Event Protection */}
              <ScrollReveal delayMs={150}>
                <div className="group rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#081a2f]/70 to-[#040e1b]/90 p-8 shadow-xl transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:-translate-y-1">
                  <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.25)]">
                    <Zap className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    Event Protection
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    Automatically secures and encrypts all client & server events — obfuscating names and payloads to block exploiters before they even start.
                  </p>
                </div>
              </ScrollReveal>

              {/* Feature 4: Network Intelligence */}
              <ScrollReveal delayMs={200}>
                <div className="group rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#081a2f]/70 to-[#040e1b]/90 p-8 shadow-xl transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:-translate-y-1">
                  <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.25)]">
                    <Globe className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    Network Intelligence
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    VexShield analyzes player behavior across our entire ecosystem — identifying suspicious patterns and known cheaters before they even join your server.
                  </p>
                </div>
              </ScrollReveal>

            </div>

          </div>
        </section>

        {/* =========================================================================
            SHOWCASE SECTION (EchoShield Centered Video & CTA)
           ========================================================================= */}
        <section className="relative border-t border-cyan-500/15 bg-[#050B14] py-20 lg:py-28 overflow-hidden">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">

            <ScrollReveal>
              <div className="mb-12">
                <h2 className="text-[clamp(1.9rem,3.8vw,2.8rem)] font-extrabold tracking-tight text-white">
                  See VexShield in Action
                </h2>
                <p className="mt-3 text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                  Watch how VexShield provides enterprise-grade FiveM protection through advanced detection and automated enforcement
                </p>
              </div>
            </ScrollReveal>

            {/* Video Showcase Card */}
            <ScrollReveal delayMs={80}>
              <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#071322] shadow-[0_0_40px_rgba(6,182,212,0.2)]">
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <YouTubeEmbed videoId="a9A5feovE3o" title="VexShield FiveM Anticheat in Action" />
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() => navigate("/pricing")}
                  className="h-11 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs uppercase tracking-wider px-7 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all active:scale-95"
                >
                  Get Started Now
                </Button>
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* =========================================================================
            PRICING SECTION (Original Dynamic DB Plans with Full Text, Pricing & Everything)
           ========================================================================= */}
        <section id="pricing" className="relative border-t border-cyan-500/15 bg-[#050B14] py-20 lg:py-28 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            <ScrollReveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">PRICING PACKAGES</span>
                <h2 className="text-[clamp(1.9rem,3.8vw,2.8rem)] font-extrabold tracking-tight text-white mt-2">
                  Flexible Server Protection Plans
                </h2>
                <p className="mt-3 text-sm text-zinc-400">Choose the ideal protection tier for your FiveM server.</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Purchases & licenses are delivered via Discord Support Tickets
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delayMs={70}>
              <div className="grid max-w-5xl mx-auto gap-6 md:grid-cols-2 xl:grid-cols-3">
                {pricingLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="h-[420px] rounded-3xl border border-white/10 bg-white/[0.03] animate-pulse" />
                  ))
                ) : (
                  (pricingPlans.length > 0 ? pricingPlans : defaultFallbackPlans).map((plan) => {
                    const isPopular = isLifetimePackPopular(plan);
                    const subtitle = resolvePlanSubtitle(plan);
                    const features = resolvePlanFeatures(plan);
                    const planBasePrice = toEurNumber(plan.price);
                    const planPromotion = bestPackagePromotion(promotions, String(plan.id), planBasePrice);
                    const planPricing = applyPromotion(planBasePrice, planPromotion);

                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          "relative flex flex-col justify-between overflow-hidden rounded-3xl border p-8 transition-all duration-300",
                          isPopular
                            ? "border-cyan-400/60 bg-gradient-to-b from-[#0a2340] to-[#051427] shadow-2xl shadow-cyan-950/50 scale-[1.03]"
                            : "border-cyan-500/20 bg-[#071526]/90 hover:border-cyan-400/40"
                        )}
                      >
                        {isPopular && (
                          <div className="absolute top-4 right-4 rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black shadow-md">
                            ★ MOST POPULAR
                          </div>
                        )}

                        <div>
                          <h4 className="text-xl font-bold text-white">
                            {plan.plan_name?.replace(/AirShield Pack Pack/gi, "VexShield").replace(/AirShield Pack/gi, "VexShield").replace(/AirShield/gi, "VexShield")}
                          </h4>
                          {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}

                          <div className="mt-6 flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white tabular-nums">
                              {planPromotion ? formatEur(planPricing.final) : (typeof plan.price === "number" ? formatEur(plan.price) : plan.price)}
                            </span>
                            <span className="text-xs font-semibold text-zinc-400">/ {formatPlanBillingSuffix(plan.duration)}</span>
                          </div>

                          <ul className="mt-8 space-y-3">
                            {features.map((f, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-8 pt-6 border-t border-cyan-500/20">
                          <Button
                            onClick={() => window.open(DISCORD_INVITE_URL, "_blank", "noopener,noreferrer")}
                            className={cn(
                              "w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                              isPopular
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30"
                                : "bg-white/[0.06] hover:bg-cyan-500/20 hover:border-cyan-400/40 text-white border border-cyan-500/25"
                            )}
                          >
                            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                            </svg>
                            ORDER VIA DISCORD
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* =========================================================================
            FAQ SECTION (EchoShield Accordion Style)
           ========================================================================= */}
        <section id="faq" className="relative border-t border-cyan-500/15 bg-[#050B14] py-20 lg:py-28 overflow-hidden">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

            <ScrollReveal>
              <div className="mb-12 text-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                  FAQ
                </span>
                <h2 className="text-[clamp(1.9rem,3.8vw,2.8rem)] font-extrabold tracking-tight text-white mt-2">
                  Frequently Asked Questions
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Got questions? We&apos;ve got answers.
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="overflow-hidden rounded-xl border border-cyan-500/20 bg-[#071526]/80 transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-cyan-500/5"
                    >
                      <span className="text-sm font-semibold text-white pr-4">
                        {faq.q}
                      </span>
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-cyan-400 text-base font-bold">
                        {isOpen ? "×" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-cyan-500/10">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* =========================================================================
            BOTTOM CALL-TO-ACTION (EchoShield: NEED HELP? VEXSHIELD + 3 Counters + CTA Buttons)
           ========================================================================= */}
        <section className="relative border-t border-cyan-500/15 bg-gradient-to-b from-[#050B14] via-[#061427] to-[#040e1c] py-24 overflow-hidden text-center">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">

            <ScrollReveal>
              <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] font-black uppercase tracking-tight text-white leading-none">
                NEED HELP?
                <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(6,182,212,0.45)]">
                  VEXSHIELD
                </span>
              </h2>

              {/* 3 Metric Counters */}
              <div className="mt-14 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div>
                  <p className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                    2<span className="text-cyan-400">+</span>
                  </p>
                  <p className="mt-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    YEARS EXPERIENCE
                  </p>
                </div>

                <div>
                  <p className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                    {stats.activeServers > 0 ? stats.activeServers : 31}<span className="text-cyan-400">+</span>
                  </p>
                  <p className="mt-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    SERVERS PROTECTED
                  </p>
                </div>

                <div>
                  <p className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                    {stats.totalBans >= 1000 ? `${(stats.totalBans / 1000).toFixed(0)}.000` : "4.000"}<span className="text-cyan-400">+</span>
                  </p>
                  <p className="mt-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    BANS ISSUED
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
                <Button
                  onClick={() => navigate("/pricing")}
                  className="h-11 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider px-8 shadow-[0_0_24px_rgba(6,182,212,0.45)] transition-all flex items-center gap-2 active:scale-95"
                >
                  <span>GET STARTED NOW</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.open(DISCORD_INVITE_URL, "_blank")}
                  className="h-11 rounded-lg border border-cyan-500/30 bg-[#07182d]/80 hover:bg-[#0c2443] hover:border-cyan-400/50 text-white font-bold text-xs uppercase tracking-wider px-7 transition-all flex items-center gap-2"
                >
                  <span>JOIN DISCORD</span>
                  <svg className="w-4 h-4 fill-cyan-400" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </Button>
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* =========================================================================
            FOOTER (Clean EchoShield Style)
           ========================================================================= */}
        <footer className="relative border-t border-cyan-500/15 bg-[#030912] text-white py-12 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-cyan-500/10">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/35 p-1 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                  <img src={BRAND_IMAGE} alt="VexShield" className="size-full object-contain" />
                </div>
                <span className="font-extrabold text-sm text-white">
                  Vex<span className="text-cyan-400">Shield</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
                <a href="#features" onClick={(e) => goToSection(e, "features")} className="hover:text-cyan-400 transition-colors">Features</a>
                <a href="#pricing" onClick={(e) => goToSection(e, "pricing")} className="hover:text-cyan-400 transition-colors">Pricing</a>
                <Link to="/demo/dashboard" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">Demo Panel</Link>
                <a href="#faq" onClick={(e) => goToSection(e, "faq")} className="hover:text-cyan-400 transition-colors">FAQs</a>
                <Link to="/documentation" className="hover:text-cyan-400 transition-colors">Documentation</Link>
                <Link to="/help-center" className="hover:text-cyan-400 transition-colors">Support</Link>
                <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Discord</a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-zinc-500">
              <p>Copyright © {new Date().getFullYear()} VexShield. All Rights Reserved.</p>
              <div className="flex items-center gap-4">
                <Link to="/admin" className="hover:text-zinc-400 transition-colors">Admin Panel</Link>
                <Link to="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
                <Link to="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
