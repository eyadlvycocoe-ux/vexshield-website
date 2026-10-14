import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check, Sparkles, Star, Home } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo, useRef } from "react";
const BRAND_IMAGE = "/logo.png";
const DISCORD_BUY_URL = "https://discord.gg/5WgtMWbtgD";
import { toast } from "sonner";
import {
  apiMutationHeaders,
  apiUrl,
  ensureCsrfCookie,
  fetchPaypalServerReady,
} from "@/lib/api-base";
import { useTranslation } from "react-i18next";
import {
  formatPlanBillingSuffix,
  isLifetimePackPopular,
  resolvePlanFeatures,
  resolvePlanSubtitle,
  sortPricingPlans,
} from "@/lib/pricing-plans";
import { formatEur, formatEurMinus, toEurNumber } from "@/lib/format-eur";
import {
  applyPromotion,
  bestPackagePromotion,
  calculatePromotionDiscount,
  isPromotionActive,
  promotionLabel,
  type Promotion,
} from "@/lib/promotions";
import { getPayPalSdk } from "@/lib/paypal-types";

type ProductKey = "airshield";

type PricingPlan = {
  id: string;
  plan_name: string;
  plan_subtitle?: string | null;
  subtitle?: string | null;
  price: string | number;
  duration?: string | null;
  features?: unknown;
  display_order?: number | null;
  billing_type?: string | null;
  billing_cycle?: string | null;
  payment_type?: string | null;
  is_subscription?: boolean | number | null;
};

type BillingMode = "one_time" | "subscription";

const DEFAULT_MATRIX = {
  byDuration: {
    "1month": { airshield: 19.99 },
    "3month": { airshield: 49.99 },
    permanent: { airshield: 99.99 },
  },
  durations: ["1month", "3month", "permanent"] as string[],
};

function durationLabel(d: string) {
  if (d === "1month") return "1 month";
  if (d === "3month") return "3 months";
  if (d === "permanent" || d === "lifetime") return "Lifetime";
  return d;
}

function planBillingMode(plan: PricingPlan): BillingMode | null {
  if (plan.is_subscription === true || plan.is_subscription === 1) return "subscription";
  const raw = `${plan.billing_type || ""} ${plan.billing_cycle || ""} ${plan.payment_type || ""}`.toLowerCase();
  if (!raw.trim()) return null;
  if (raw.includes("subscription") || raw.includes("recurring") || raw.includes("monthly")) return "subscription";
  if (raw.includes("one_time") || raw.includes("one-time") || raw.includes("onetime") || raw.includes("once")) {
    return "one_time";
  }
  return null;
}

export default function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [funds, setFunds] = useState<number>(0);
  const [isIndividual, setIsIndividual] = useState(false);
  const [showIndividualSetting, setShowIndividualSetting] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>("subscription");

  // Shop state
  const [matrix, setMatrix] = useState<{
    byDuration: Record<string, Record<ProductKey, number>>;
    durations: string[];
  }>(DEFAULT_MATRIX);
  const [sel, setSel] = useState<Record<ProductKey, boolean>>({
    airshield: true,
  });
  const [useWallet, setUseWallet] = useState(true);
  const [duration, setDuration] = useState("1month");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  /** null = still checking API; false = server missing PayPal env; true = can load SDK */
  const [paypalServerReady, setPaypalServerReady] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/site-settings'));
      const settings = await res.json();
      setShowIndividualSetting(settings.show_individual_buy !== 'false');
    } catch (e) {
      console.error('Failed to fetch settings');
    }
  };

  useEffect(() => {
    fetchPaypalServerReady().then((p) => setPaypalServerReady(p.ready));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderStatus = params.get("order_status");
    const orderNumber = params.get("order_number");

    if (orderStatus === "paypal_success" && orderNumber) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const captureOrder = async () => {
        try {
          await ensureCsrfCookie();
          const res = await fetch(apiUrl("/api/orders/paypal-capture"), {
            method: "POST",
            credentials: "include",
            headers: apiMutationHeaders(),
            body: JSON.stringify({ order_number: orderNumber }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success(
              `Payment confirmed! Order ${orderNumber} fulfilled. Your Redeem Code and PDF receipt have been sent via Discord DM & Email!`,
              { duration: 8000 }
            );
          }
        } catch (err) {
          console.error("Failed to capture PayPal order:", err);
        }
      };
      captureOrder();
    } else if (orderStatus === "success" && orderNumber) {
      window.history.replaceState({}, document.title, window.location.pathname);
      toast.success(
        `Payment confirmed! Order ${orderNumber} fulfilled. Your Redeem Code and PDF receipt have been sent via Discord DM & Email!`,
        { duration: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    if (paypalServerReady === true && user) void ensureCsrfCookie();
  }, [paypalServerReady, user]);

  useEffect(() => {
    fetch(apiUrl('/api/shop/prices'))
      .then((r) => r.json())
      .then((j) => {
        if (j && j.byDuration && j.durations?.length) {
          setMatrix({
            byDuration: j.byDuration as Record<string, Record<ProductKey, number>>,
            durations: j.durations,
          });
        }
        setPromotions(Array.isArray(j?.promotions) ? j.promotions : []);
      })
      .catch(() => {});
  }, []);

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

  const linePrices = useMemo(() => {
    const bd = matrix.byDuration[duration] || matrix.byDuration["1month"];
    const base = bd || DEFAULT_MATRIX.byDuration["1month"];
    return { ...DEFAULT_MATRIX.byDuration["1month"], ...base };
  }, [matrix, duration]);

  const rawSubtotal = useMemo(() => {
    let t = 0;
    if (sel.airshield) t += linePrices.airshield;
    return Math.round(t * 100) / 100;
  }, [sel, linePrices]);

  const checkoutPromotion = useMemo(() => {
    let best: Promotion | null = null;
    let discount = 0;
    for (const promotion of promotions) {
      if (!isPromotionActive(promotion)) continue;
      let base = 0;
      if (promotion.target_scope === "all") {
        base = rawSubtotal;
      } else if (promotion.target_scope === "product" && promotion.target_product && sel[promotion.target_product]) {
        base = linePrices[promotion.target_product] ?? 0;
      }
      const nextDiscount = calculatePromotionDiscount(base, promotion);
      if (nextDiscount > discount) {
        best = promotion;
        discount = nextDiscount;
      }
    }
    return { promotion: best, discount };
  }, [linePrices, promotions, rawSubtotal, sel]);

  const discountedLinePrices = useMemo(() => {
    const out = {} as Record<ProductKey, { original: number; final: number; promotion: Promotion | null }>;
    (["airshield"] as ProductKey[]).forEach((product) => {
      const original = linePrices[product] ?? 0;
      const promotion =
        checkoutPromotion.promotion?.target_scope === "product" &&
        checkoutPromotion.promotion.target_product === product
          ? checkoutPromotion.promotion
          : checkoutPromotion.promotion?.target_scope === "all" &&
              checkoutPromotion.promotion.discount_type === "percent"
            ? checkoutPromotion.promotion
            : null;
      const applied = applyPromotion(original, promotion);
      out[product] = { original: applied.original, final: applied.final, promotion };
    });
    return out;
  }, [checkoutPromotion.promotion, linePrices]);

  const subtotal = Math.max(0, Math.round((rawSubtotal - checkoutPromotion.discount) * 100) / 100);

  const subtotalAfterCoupon = Math.max(0, Math.round((subtotal - couponDiscount) * 100) / 100);
  const walletApplied = useWallet ? Math.min(funds, subtotalAfterCoupon) : 0;
  const toPay = Math.max(0, Math.round((subtotalAfterCoupon - walletApplied) * 100) / 100);
  const visiblePlans = useMemo(() => {
    const hasBillingMetadata = plans.some((plan) => planBillingMode(plan) !== null);
    if (!hasBillingMetadata) return plans;
    return plans.filter((plan) => {
      const mode = planBillingMode(plan);
      return mode === null || mode === billingMode;
    });
  }, [billingMode, plans]);

  const applyCoupon = async () => {
    if (!user) {
      toast.error("Sign in first");
      return;
    }
    const code = couponCode.trim();
    if (!code) {
      setCouponDiscount(0);
      setCouponApplied(null);
      return;
    }
    setApplyingCoupon(true);
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl("/api/shop/validate-coupon"), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({ code, products: sel, duration }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Invalid coupon");
      setCouponDiscount(toEurNumber(j.discount));
      setCouponApplied(String(j.code || code).toUpperCase());
      toast.success(`Coupon applied: -${formatEur(j.discount)}`);
    } catch (e: unknown) {
      setCouponDiscount(0);
      setCouponApplied(null);
      toast.error(e instanceof Error ? e.message : "Invalid coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  useEffect(() => {
    if (couponApplied) {
      setCouponDiscount(0);
      setCouponApplied(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, duration]);

  // PayPal integration for shop
  const paramsRef = useRef({ sel, useWallet, duration, couponCode: couponApplied });
  useEffect(() => {
    paramsRef.current = { sel, useWallet, duration, couponCode: couponApplied };
  }, [sel, useWallet, duration, couponApplied]);

  useEffect(() => {
    if (
      !isIndividual ||
      paypalServerReady !== true ||
      !sdkReady ||
      !getPayPalSdk() ||
      !containerRef.current ||
      !user
    )
      return;
    
    const container = containerRef.current;
    const paypal = getPayPalSdk();
    if (!container || !paypal) return;

    container.innerHTML = "";

    if (toPay <= 0) return;

    try {
      paypal
        .Buttons({
          style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
          createOrder: async () => {
            const {
              sel: latestSel,
              useWallet: latestUseWallet,
              duration: latestDuration,
              couponCode: latestCoupon,
            } = paramsRef.current;
            // Convert { airshield: true, airpc: false } ? ["airshield"]
            const selectedProducts = (Object.keys(latestSel) as ProductKey[]).filter(
              (k) => latestSel[k],
            );
            if (selectedProducts.length === 0) {
              throw new Error("Select at least one product");
            }
            await ensureCsrfCookie();
            const res = await fetch(apiUrl('/api/paypal/create-order'), {
              method: "POST",
              credentials: "include",
              headers: apiMutationHeaders(),
              body: JSON.stringify({
                kind: "shop",
                products: selectedProducts,
                use_wallet: latestUseWallet,
                duration: latestDuration,
                coupon_code: latestCoupon || undefined,
              }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
              if (res.status === 401) {
                throw new Error(j.error || "Sign in again to complete payment.");
              }
              if (j.code === "wallet_only") {
                toast.info("Use 'Pay with wallet' below.");
                throw new Error("wallet_only");
              }
              if (j.code === "PAYPAL_NOT_CONFIGURED") {
                throw new Error(j.error || "Payment service unavailable");
              }
              if (j.code === "PAYPAL_UPSTREAM" && j.error) {
                throw new Error(String(j.error));
              }
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
              toast.success("Payment complete. Access your servers in Dashboard.");
              navigate("/my-servers");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "Payment failed");
            } finally {
              setProcessing(false);
            }
          },
          onError: (err) => {
            console.error("PayPal Error:", err);
            toast.error(
              "PayPal could not start. Please reload the page and try again.",
            );
          },
        })
        .render(container);
    } catch (e) {
      console.warn("PayPal render error:", e);
    }
  }, [isIndividual, paypalServerReady, sdkReady, toPay, user, couponApplied, useWallet, duration, sel, navigate]);

  const payWalletOnly = async () => {
    if (!user) {
      toast.error("Sign in first");
      return;
    }
    setProcessing(true);
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl('/api/shop/pay-with-wallet'), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          products: sel,
          duration,
          coupon_code: couponApplied || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Payment failed");
      toast.success("Purchase complete. Access your servers in Dashboard.");
      navigate("/my-servers");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setProcessing(false);
    }
  };

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const response = await fetch(apiUrl('/api/home-pricing'));
      const data = await response.json();
      if (!response.ok) {
        setPlans([]);
        return;
      }
      let list = Array.isArray(data) ? sortPricingPlans(data) : [];
      // Prioritize AirShield Anticheat plans and deduplicate by duration
      const anticheatOnly = list.filter((p: PricingPlan) =>
        p.plan_name?.toLowerCase().includes("anticheat")
      );
      if (anticheatOnly.length > 0) {
        list = anticheatOnly;
      }
      // Deduplicate by duration so only 1 plan exists per duration (1month, 3month, permanent)
      const seenDurations = new Set<string>();
      const uniqueList: PricingPlan[] = [];
      for (const p of list) {
        const dur = p.duration || "1month";
        if (!seenDurations.has(dur)) {
          seenDurations.add(dur);
          uniqueList.push(p);
        }
      }
      setPlans(uniqueList);
    } catch (error) {
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleBuy = (_plan: PricingPlan) => {
    window.open(DISCORD_BUY_URL, "_blank", "noopener,noreferrer");
  };


  return (
    <div className="min-h-screen overflow-hidden bg-[#0F1017] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02),transparent_50%)] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6 flex justify-between items-center backdrop-blur-sm gap-3">
          <Link to="/" className="flex items-center space-x-3 animate-fade-in transition-opacity hover:opacity-80">
            <img src={BRAND_IMAGE} alt="VexShield Logo" className="h-12 w-12 object-contain" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              VexShield
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/')} variant="outline" className="animate-fade-in rounded-xl">
              <Home className="h-4 w-4 mr-2 text-sky-400" />
              {t("nav.home", "Back to Home")}
            </Button>
          </div>
        </header>

        {/* Pricing Section   Wave-style */}
        <section className="bg-[#0F1017] border-y border-white/[0.06] py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-14 animate-fade-in">
                <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
                  {t("pricingPage.title")}
                </h1>
                <p className="text-lg text-[#94a3b8] max-w-2xl mx-auto mb-8 leading-relaxed">
                  {t("pricingPage.subtitle")}
                </p>

                <div className="mx-auto max-w-2xl mb-12 rounded-2xl border border-[#5865F2]/40 bg-[#5865F2]/10 p-4 text-center backdrop-blur-md shadow-[0_0_30px_rgba(88,101,242,0.15)]">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-white">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    All Purchases are Handled Exclusively via Discord Support Tickets
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed">
                    Website payment gateways are disabled. Click any plan below to join our Discord (<span className="text-sky-300 font-semibold font-mono">discord.gg/5WgtMWbtgD</span>) and open a ticket for instant license activation.
                  </p>
                </div>
              </div>

              {plansLoading && (
                <p className="text-center text-[#94a3b8] py-12">{t("pricingPage.loading")}</p>
              )}
              {!plansLoading && plans.length === 0 && (
                <p className="text-center text-[#94a3b8] py-12 max-w-lg mx-auto leading-relaxed">
                  {t("pricingPage.emptyPlans", { api: "/api", table: "pricing_plans" })}
                </p>
              )}
              {!plansLoading && plans.length > 0 && (
                <div className="mb-8 flex justify-center">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#071327]/85 px-4 py-2 shadow-[0_18px_45px_rgba(0,0,0,0.25)] backdrop-blur">
                    <button
                      type="button"
                      onClick={() => setBillingMode("one_time")}
                      className={`text-xs font-bold transition-colors ${
                        billingMode === "one_time" ? "text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t("pricingPage.oneTime")}
                    </button>
                    <button
                      type="button"
                      aria-label={t("pricingPage.billingToggleAria")}
                      onClick={() => setBillingMode((mode) => (mode === "one_time" ? "subscription" : "one_time"))}
                      className="relative h-6 w-11 rounded-full bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-black transition-all duration-200 ${
                          billingMode === "subscription" ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingMode("subscription")}
                      className={`text-xs font-bold transition-colors ${
                        billingMode === "subscription" ? "text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t("pricingPage.subscription")}
                    </button>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-500/60 text-[10px] font-bold text-slate-400" title={t("pricingPage.billingToggleHint")}>
                      i
                    </span>
                  </div>
                </div>
              )}
              <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
                {!plansLoading &&
                  visiblePlans.map((plan, index) => {
                    const features = resolvePlanFeatures(plan);
                    const isPopular = isLifetimePackPopular(plan);
                    const subtitle = resolvePlanSubtitle(plan);
                    const planBasePrice = toEurNumber(plan.price);
                    const planPromotion = bestPackagePromotion(promotions, String(plan.id), planBasePrice);
                    const planPricing = applyPromotion(planBasePrice, planPromotion);

                    return (
                      <Card
                        key={plan.id}
                        className={`relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl bg-[#0f0f0f] p-8 animate-fade-in md:p-9 ${
                          isPopular
                            ? "border-2 border-[#0095ff]/40 shadow-[0_24px_80px_rgba(0,149,255,0.18)] z-[1]"
                            : "border border-zinc-800/90 hover:border-zinc-600/90"
                        }`}
                        style={{ animationDelay: `${index * 0.08}s` }}
                      >
                        {isPopular && (
                          <>
                            <div className="absolute right-4 top-4 flex max-w-[calc(100%-2rem)] items-center gap-1 rounded-full bg-[#0095ff] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
                              <Star className="h-3.5 w-3.5 fill-white text-white" />
                              {t("pricingPage.mostPopular")}
                            </div>
                          </>
                        )}
                        {planPromotion && (
                          <div className={`absolute ${isPopular ? "top-14" : "top-4"} right-4 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md`}>
                            Sale {promotionLabel(planPromotion)}
                          </div>
                        )}

                        <div className="relative z-[2] min-h-[150px] pb-5 text-left">
                          <CardTitle className="pr-20 text-xl font-bold tracking-tight text-white">
                            {plan.plan_name?.replace(/AirShield Pack Pack/gi, "VexShield").replace(/AirShield Pack/gi, "VexShield").replace(/AirShield/gi, "VexShield")}
                          </CardTitle>
                          {subtitle ? (
                            <p className="mt-2 min-h-[40px] text-sm leading-snug text-[#94a3b8]">{subtitle}</p>
                          ) : null}
                          <div className="mt-6 flex min-h-[48px] flex-wrap items-baseline gap-x-2 gap-y-1">
                            {planPromotion ? (
                              <span className="text-lg font-semibold tabular-nums text-zinc-500 line-through">
                                {formatEur(planPricing.original)}
                              </span>
                            ) : null}
                            <span className="text-4xl md:text-[2.65rem] font-bold tabular-nums text-white leading-none">
                              {planPromotion ? formatEur(planPricing.final) : plan.price}
                            </span>
                            <span className="text-sm text-[#64748b]">
                              / {formatPlanBillingSuffix(plan.duration)}
                            </span>
                          </div>
                        </div>

                        <CardContent className="relative z-[2] flex flex-1 flex-col p-0">
                          <ul className="flex-1 space-y-3">
                            {features.map((feature: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-3">
                                <Check className="h-4 w-4 text-[#0095ff] shrink-0 mt-0.5" strokeWidth={2.5} />
                                <span className="text-sm text-white/90 leading-relaxed">{feature}</span>
                              </li>
                            ))}
                          </ul>

                          <Button
                            onClick={() => handleBuy(plan)}
                            className={`mt-8 h-12 w-full rounded-full text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all ${
                              isPopular
                                ? "bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-lg shadow-[#5865F2]/30 border-0"
                                : "bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-white border border-[#5865F2]/40"
                            }`}
                          >
                            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                            </svg>
                            Order via Discord
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>

              <div className="mx-auto mt-12 max-w-5xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <div className="relative overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-r from-orange-950/30 via-[#0f0f0f] to-orange-950/20 p-6 shadow-[0_20px_70px_rgba(249,115,22,0.12)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(249,115,22,0.16),transparent_35%)]" />
                  <div className="relative z-[1] flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-xl bg-orange-500/10 p-2 ring-1 ring-orange-400/20">
                        <Sparkles className="h-5 w-5 text-orange-300" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-white">Premium Package</h2>
                        <p className="mt-1 text-sm font-medium text-slate-400">
                          Expert installation and configuration service
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="text-left sm:text-right">
                        <div className="text-3xl font-black text-orange-400">�5</div>
                        <div className="text-xs text-slate-500">One-time payment</div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => window.open(DISCORD_BUY_URL, "_blank", "noopener,noreferrer")}
                        className="h-12 rounded-full bg-orange-500 px-8 font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400"
                      >
                        Get Premium
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-16 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <p className="text-muted-foreground mb-4">
                  {t("pricingPage.questionsDiscord")}
                </p>
                <Button onClick={() => window.open(DISCORD_BUY_URL, "_blank")} variant="outline" size="lg">
                  {t("pricingPage.joinDiscord")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground border-t border-border/50">
          <div className="flex flex-col items-center gap-4">
            <p>{t("pricingPage.footerCopyright")}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
