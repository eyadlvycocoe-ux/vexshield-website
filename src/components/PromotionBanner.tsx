import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, X, ArrowRight  } from "lucide-react";
import { apiUrl } from "@/lib/api-base";
import { pickBestPromotion, promotionLabel, type Promotion } from "@/lib/promotions";

const DISMISS_KEY = "aircore.promoBanner.dismissed";

/** Reset the layout offset other components reserve for the banner. */
function clearOffset() {
  document.documentElement.style.setProperty("--promo-h", "0px");
}

/**
 * Site-wide top banner shown whenever there is an active promotion.
 * Picks the strongest active promotion and links visitors to the pricing page.
 * Dismissals are remembered per-promotion (sessionStorage) so a fresh sale re-shows.
 */
export function PromotionBanner() {
  const { t } = useTranslation();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

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

  const visible = !!promo && dismissedId !== promo.id;
  const barRef = useRef<HTMLDivElement | null>(null);

  // Publish the banner height so fixed headers / page content can offset for it.
  useLayoutEffect(() => {
    if (!visible) {
      clearOffset();
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const setH = () => document.documentElement.style.setProperty("--promo-h", `${el.offsetHeight}px`);
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearOffset();
    };
  }, [visible]);

  if (!visible || !promo) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, promo.id);
    } catch {
      /* ignore */
    }
    setDismissedId(promo.id);
  };

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 top-0 z-[60] isolate overflow-hidden border-b border-white/10 bg-gradient-to-r from-primary via-[#0095ff] to-accent text-white"
    >
      {/* moving shimmer */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[promo-shimmer_3.5s_linear_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5 text-center">
        <span className="hidden items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur sm:inline-flex">
          <Sparkles className="h-3.5 w-3.5" />
          {t("promoBanner.limited")}
        </span>
        <p className="flex min-w-0 items-center justify-center gap-2 truncate text-sm font-semibold sm:text-[15px]">
          <span className="truncate font-extrabold">{promo.title}</span>
          <span className="hidden h-3.5 w-px shrink-0 bg-white/35 sm:block" aria-hidden />
          <span className="shrink-0 rounded-md bg-black/20 px-1.5 py-0.5 text-xs font-black uppercase tracking-wide sm:text-sm">
            {promotionLabel(promo)}
          </span>
        </p>
        <Link
          to="/pricing"
          className="group inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3.5 py-1 text-xs font-bold text-[#0a0a0a] shadow-sm transition-transform hover:scale-105 sm:text-[13px]"
        >
          {t("promoBanner.cta")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("promoBanner.dismiss")}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default PromotionBanner;
