export type ProductKey = "airshield";

export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  target_scope: "all" | "product" | "package";
  target_product: ProductKey | null;
  target_package: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | number;
  created_at?: string | null;
  updated_at?: string | null;
};

export function isPromotionActive(promotion: Promotion, now = new Date()): boolean {
  if (!promotion || promotion.is_active === false || promotion.is_active === 0) return false;
  if (promotion.starts_at && new Date(promotion.starts_at) > now) return false;
  if (promotion.ends_at && new Date(promotion.ends_at) < now) return false;
  return true;
}

export function promotionAppliesToProduct(promotion: Promotion, product: ProductKey): boolean {
  if (!isPromotionActive(promotion)) return false;
  if (promotion.target_scope === "all") return true;
  return promotion.target_scope === "product" && promotion.target_product === product;
}

export function promotionAppliesToPackage(promotion: Promotion, packageId: string): boolean {
  if (!isPromotionActive(promotion)) return false;
  if (promotion.target_scope === "all") return true;
  return promotion.target_scope === "package" && promotion.target_package === packageId;
}

export function calculatePromotionDiscount(price: number, promotion: Promotion | null): number {
  const base = Math.max(0, Math.round((Number(price) || 0) * 100) / 100);
  if (!promotion || base <= 0) return 0;
  const value = Number(promotion.discount_value) || 0;
  const discount =
    promotion.discount_type === "fixed"
      ? value
      : base * (Math.min(100, Math.max(0, value)) / 100);
  return Math.max(0, Math.min(base, Math.round(discount * 100) / 100));
}

export function applyPromotion(price: number, promotion: Promotion | null) {
  const discount = calculatePromotionDiscount(price, promotion);
  return {
    original: Math.max(0, Math.round((Number(price) || 0) * 100) / 100),
    discount,
    final: Math.max(0, Math.round((Number(price) - discount) * 100) / 100),
  };
}

export function bestProductPromotion(promotions: Promotion[], product: ProductKey, price = 100): Promotion | null {
  let best: Promotion | null = null;
  let bestDiscount = 0;
  for (const promotion of promotions) {
    if (!promotionAppliesToProduct(promotion, product)) continue;
    const discount = calculatePromotionDiscount(price, promotion);
    if (discount > bestDiscount) {
      best = promotion;
      bestDiscount = discount;
    }
  }
  return best;
}

export function bestPackagePromotion(promotions: Promotion[], packageId: string, price: number): Promotion | null {
  let best: Promotion | null = null;
  let bestDiscount = 0;
  for (const promotion of promotions) {
    if (!promotionAppliesToPackage(promotion, packageId)) continue;
    const discount = calculatePromotionDiscount(price, promotion);
    if (discount > bestDiscount) {
      best = promotion;
      bestDiscount = discount;
    }
  }
  return best;
}

export function promotionLabel(promotion: Promotion): string {
  return promotion.discount_type === "percent"
    ? `${Number(promotion.discount_value).toFixed(0)}% off`
    : `${Number(promotion.discount_value).toFixed(2)} off`;
}

/** Human-readable countdown until a promotion ends. Returns null when no end date or already ended. */
export function promotionTimeLeft(endsAt: string | null, now = new Date()): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  const ms = end.getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

export type PromotionCountdown = {
  days: number;
  hours: number;
  mins: number;
  secs: number;
};

/** Live countdown parts for UI timers. Returns null when no end date or already ended. */
export function promotionCountdown(endsAt: string | null, now = new Date()): PromotionCountdown | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  const ms = end.getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86_400);
  const hours = Math.floor((totalSecs % 86_400) / 3_600);
  const mins = Math.floor((totalSecs % 3_600) / 60);
  const secs = totalSecs % 60;
  return { days, hours, mins, secs };
}

/** Pick the best active promotion (same logic as the top banner). */
export function pickBestPromotion(promotions: Promotion[]): Promotion | null {
  const active = promotions.filter((p) => isPromotionActive(p));
  if (!active.length) return null;
  return [...active].sort((a, b) => {
    if (a.target_scope === "all" && b.target_scope !== "all") return -1;
    if (b.target_scope === "all" && a.target_scope !== "all") return 1;
    return (Number(b.discount_value) || 0) - (Number(a.discount_value) || 0);
  })[0];
}

