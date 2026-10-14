import { lazy, Suspense, useMemo } from "react";
import { useLocation } from "react-router-dom";

const FallingAutumnLeaves = lazy(() =>
  import("@/components/FallingAutumnLeaves").then((m) => ({ default: m.FallingAutumnLeaves })),
);

const MARKETING_PATHS = new Set([
  "/",
  "/pricing",
  "/faqs",
  "/partners",
  "/help-center",
  "/documentation",
  "/terms",
  "/privacy",
  "/refund",
]);

function isMarketingRoute(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/plan/")) return true;
  return false;
}

/** Decorative animation — only on light marketing pages, not dashboards. */
export function SeasonalEffects() {
  return null;
}
