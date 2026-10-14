import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles, X  } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-base";
import { cn } from "@/lib/utils";
import {
  pickBestPromotion,
  promotionCountdown,
  promotionLabel,
  type Promotion,
} from "@/lib/promotions";

const BRAND_LOGO = "/logo.png";
const DISMISS_KEY = "aircore.promoModal.dismissed";

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-3 backdrop-blur-sm">
      <span className="text-2xl font-black tabular-nums leading-none text-white">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
    </div>
  );
}

/**
 * Welcome card shown once per session when an active promotion exists.
 */
export function PromotionWelcomeModal() {
  const { t } = useTranslation();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    try {
      setDismissedId(sessionStorage.getItem(DISMISS_KEY));
    } catch {
      /* ignore */
    }
    let cancelled = false;
    fetch(apiUrl("/api/promotions/active"))
      .then((r) => (r.ok ? r.json() : { promotions: [] }))
      .then((j) => {
        if (cancelled) return;
        setPromotions(Array.isArray(j?.promotions) ? j.promotions : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const promo = useMemo(() => pickBestPromotion(promotions), [promotions]);
  const countdown = useMemo(
    () => (promo ? promotionCountdown(promo.ends_at, now) : null),
    [promo, now],
  );

  useEffect(() => {
    if (!promo || dismissedId === promo.id) return;
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [promo, dismissedId]);

  useEffect(() => {
    if (!open || !promo?.ends_at) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [open, promo?.ends_at]);

  const dismiss = () => {
    if (promo) {
      try {
        sessionStorage.setItem(DISMISS_KEY, promo.id);
      } catch {
        /* ignore */
      }
      setDismissedId(promo.id);
    }
    setOpen(false);
  };

  if (!promo) return null;

  const discount = promotionLabel(promo).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent
        className={cn(
          "max-w-[440px] gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none",
          "[&>button.absolute]:hidden",
        )}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#080d14] shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_60px_rgba(0,149,255,0.12)]">
          {/* Top accent + glow */}
          <div className="h-1 bg-gradient-to-r from-sky-400 via-[#0095ff] to-blue-600" />
          <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-blue-600/15 blur-3xl" />

          <button
            type="button"
            onClick={dismiss}
            aria-label={t("promoModal.dismiss")}
            className="absolute right-3 top-4 z-10 rounded-full border border-white/10 bg-black/30 p-2 text-slate-400 backdrop-blur-sm transition-colors hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative px-6 pb-6 pt-5">
            {/* Brand row */}
            <div className="mb-6 flex items-center justify-between gap-3 pr-10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-1.5">
                  <img src={BRAND_LOGO} alt="" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-base font-bold leading-tight text-white">VexShield</p>
                  <p className="text-[11px] font-medium text-slate-500">FiveM protection suite</p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-300">
                <Sparkles className="h-3 w-3" />
                {t("promoBanner.limited")}
              </span>
            </div>

            {/* Hero discount */}
            <div className="mb-5 text-center">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400/90">
                {t("promoModal.discount")}
              </p>
              <p className="bg-gradient-to-b from-white to-sky-200 bg-clip-text text-5xl font-black leading-none tracking-tight text-transparent sm:text-[3.25rem]">
                {discount}
              </p>
            </div>

            {/* Title + description */}
            <div className="mb-5 space-y-2 text-center">
              <DialogTitle className="text-xl font-bold leading-snug text-white sm:text-2xl">
                {promo.title}
              </DialogTitle>
              {promo.description ? (
                <DialogDescription className="mx-auto max-w-sm text-sm leading-relaxed text-slate-400">
                  {promo.description}
                </DialogDescription>
              ) : null}
            </div>

            {/* Countdown */}
            {countdown ? (
              <div className="mb-6">
                <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("promoModal.endsIn")}
                </p>
                <div className="flex gap-2">
                  <CountdownCell value={countdown.days} label={t("promoModal.days")} />
                  <CountdownCell value={countdown.hours} label={t("promoModal.hours")} />
                  <CountdownCell value={countdown.mins} label={t("promoModal.mins")} />
                  <CountdownCell value={countdown.secs} label={t("promoModal.secs")} />
                </div>
              </div>
            ) : (
              <p className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-center text-sm text-amber-200/90">
                {t("promoModal.limitedNote")}
              </p>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                asChild
                className="h-12 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-base font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-400 hover:to-blue-500 hover:shadow-sky-500/35"
                onClick={dismiss}
              >
                <Link to="/pricing" className="inline-flex items-center justify-center gap-2">
                  {t("promoModal.cta")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <button
                type="button"
                onClick={dismiss}
                className="w-full py-1 text-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-300"
              >
                {t("promoModal.later")}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PromotionWelcomeModal;
