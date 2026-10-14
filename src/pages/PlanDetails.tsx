import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Check, Shield, MessageSquare, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatEur } from "@/lib/format-eur";
import { useActivePromotions } from "@/hooks/useActivePromotions";
import { applyPromotion, bestPackagePromotion, promotionLabel } from "@/lib/promotions";
import { formatPlanBillingSuffix, resolvePlanFeatures } from "@/lib/pricing-plans";

const BRAND_IMAGE = "/logo.png";
const DISCORD_BUY_URL = "https://discord.gg/5WgtMWbtgD";

type PricingPlan = {
  id: string;
  plan_name: string;
  price: string | number;
  duration?: string | null;
  features?: unknown;
};

export default function PlanDetails() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const { promotions } = useActivePromotions();

  const parsePrice = (p: string | number | null | undefined) => {
    if (p === null || p === undefined) return 0;
    const normalized = String(p).replace(",", ".");
    const match = normalized.match(/[\d.]+/);
    return match ? Number(match[0]) : 0;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: planData } = await supabase
          .from("pricing_plans")
          .select("*")
          .eq("id", planId)
          .maybeSingle();
        setPlan((planData as PricingPlan | null) || null);
      } catch {
        setPlan(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [planId]);

  const basePrice = parsePrice(plan?.price);
  const packagePromotion = planId ? bestPackagePromotion(promotions, planId, basePrice) : null;
  const promotedPrice = applyPromotion(basePrice, packagePromotion);
  const price = packagePromotion ? promotedPrice.final : basePrice;

  const handleOrderOnDiscord = () => {
    window.open(DISCORD_BUY_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#0a0e17] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.12),transparent_60%)] pointer-events-none" />
      <div className="pointer-events-none fixed -top-40 right-0 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[140px]" />
      <div className="pointer-events-none fixed bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[160px]" />

      <div className="relative z-10">
        <header className="container mx-auto px-4 py-6 flex justify-between items-center backdrop-blur-sm gap-3">
          <Link to="/" className="flex items-center space-x-3 transition-opacity hover:opacity-80">
            <img src={BRAND_IMAGE} alt="VexShield Logo" className="h-11 w-11 object-contain" />
            <span className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              VexShield
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl border-white/10 bg-white/[0.04] text-xs font-semibold">
              <Home className="h-4 w-4 mr-1.5 text-sky-400" />
              Home
            </Button>
            <Button onClick={() => navigate("/pricing")} variant="outline" className="rounded-xl border-white/10 bg-white/[0.04] text-xs font-semibold">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              All Plans
            </Button>
          </div>
        </header>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-zinc-400 animate-pulse">
                Loading plan details...
              </div>
            ) : !plan ? (
              <Card className="p-8 text-center bg-[#0d121f] border-white/10 text-white">
                <p className="text-zinc-400 mb-4">Plan not found or no longer available.</p>
                <Button onClick={() => navigate("/pricing")} className="bg-sky-500 hover:bg-sky-400">
                  View All Plans
                </Button>
              </Card>
            ) : (
              <Card className="rounded-2xl border border-white/10 bg-[#0d1322]/90 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-blue-950/40">
                <CardHeader className="p-0 pb-6 border-b border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
                      Protection Tier
                    </span>
                    {packagePromotion && (
                      <span className="text-xs font-bold uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        Sale {promotionLabel(packagePromotion)}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-2xl md:text-3xl font-extrabold text-white mt-3">
                    {plan.plan_name?.replace(/AirShield Pack Pack/gi, "VexShield").replace(/AirShield Pack/gi, "VexShield").replace(/AirShield/gi, "VexShield")}
                  </CardTitle>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-extrabold text-white">
                      {formatEur(price)}
                    </span>
                    <span className="text-sm font-semibold text-zinc-400">
                      / {formatPlanBillingSuffix(plan.duration)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-0 pt-6 space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      What's Included:
                    </div>
                    <ul className="space-y-2.5">
                      {resolvePlanFeatures(plan).map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-200">
                          <Check className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Discord Ticket Purchase Notice */}
                  <div className="rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/10 p-4 space-y-2 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <MessageSquare className="h-4 w-4 text-[#5865F2] shrink-0" />
                      Direct Discord Purchase
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      All licenses and payments are processed directly through our official Discord server. Join the server, open a ticket in <span className="text-sky-300 font-mono">#order-ticket</span>, and our team will activate your license immediately.
                    </p>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-2 space-y-3">
                    <Button
                      type="button"
                      onClick={handleOrderOnDiscord}
                      className="w-full h-12 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] font-bold text-white shadow-lg shadow-[#5865F2]/30 flex items-center justify-center gap-2.5 text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Order on Discord (discord.gg/5WgtMWbtgD)
                      <ExternalLink className="h-4 w-4 ml-1 opacity-70" />
                    </Button>
                    <p className="text-[11px] text-zinc-500 text-center">
                      Payment methods accepted in Discord: PayPal, Bank Transfer, Crypto, CashPlus
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
