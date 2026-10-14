export type PlanRow = {
  id: string;
  plan_name: string;
  duration?: string;
  price: string;
  features?: unknown;
  plan_subtitle?: string | null;
  display_order?: number;
};

const DURATION_ORDER: Record<string, number> = {
  "1month": 0,
  "3month": 1,
  "3months": 1,
  permanent: 2,
  lifetime: 2,
};

export function sortPricingPlans<T extends { duration?: string; display_order?: number }>(plans: T[]): T[] {
  return [...plans].sort((a, b) => {
    const da = DURATION_ORDER[String(a.duration || "").toLowerCase()] ?? 99;
    const db = DURATION_ORDER[String(b.duration || "").toLowerCase()] ?? 99;
    if (da !== db) return da - db;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });
}

export function isLifetimePackPopular(plan: { duration?: string }): boolean {
  const d = String(plan.duration || "").toLowerCase();
  return d === "permanent" || d === "lifetime";
}

const DEFAULT_SUBTITLE: Record<string, string> = {
  "1month": "Perfect for testing and short-term projects",
  "3month": "Great value for established servers",
  "3months": "Great value for established servers",
  permanent: "The ultimate choice for professional communities",
  lifetime: "The ultimate choice for professional communities",
};

export function resolvePlanSubtitle(plan: { duration?: string; plan_subtitle?: string | null }): string {
  const s = plan.plan_subtitle != null ? String(plan.plan_subtitle).trim() : "";
  if (s) return s;
  const d = String(plan.duration || "").toLowerCase();
  return DEFAULT_SUBTITLE[d] || "";
}

export function defaultPackFeatures(duration: string | undefined): string[] {
  const d = String(duration || "").toLowerCase();
  let access = "1 Month Access";
  if (d === "3month" || d === "3months") access = "3 Months Access";
  if (d === "permanent" || d === "lifetime") access = "Lifetime Access";
  return [
    access,
    "Live Web Panel",
    "All VexShield Features",
    "Network Intelligence Tools",
    "Players Tracking & Monitoring Tools",
    "24/7 support",
  ];
}

export function resolvePlanFeatures(plan: { features?: unknown; duration?: string }): string[] {
  const raw = plan.features;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x) => String(x));
  }
  return defaultPackFeatures(plan.duration);
}

/** Suffix after "/" under price, e.g. "month", "3 months", "forever" */
export function formatPlanBillingSuffix(duration: string | undefined): string {
  const d = String(duration || "").toLowerCase().replace(/\s+/g, "");
  if (d === "1month") return "month";
  if (d === "3month" || d === "3months") return "3 months";
  if (d === "permanent" || d === "lifetime") return "forever";
  return duration || "";
}
