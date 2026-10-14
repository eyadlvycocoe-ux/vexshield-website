import { useEffect, useState } from "react";

/**
 * Decides whether to load the heavy three.js WebGL effects.
 * Returns false on devices/conditions where it would hurt performance:
 * reduced-motion, small/mobile screens, data-saver or slow networks,
 * low CPU cores or low device memory. CSS fallbacks still render everywhere.
 */
export function useEnable3D(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const evaluate = (): boolean => {
      if (typeof window === "undefined") return false;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

      // Mobile / small screens: skip WebGL, keep CSS effects.
      if (window.matchMedia("(max-width: 900px)").matches) return false;
      if (window.matchMedia("(pointer: coarse)").matches) return false;

      const nav = navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
        deviceMemory?: number;
      };

      if (nav.connection?.saveData) return false;
      const eff = nav.connection?.effectiveType;
      if (eff && (eff === "slow-2g" || eff === "2g" || eff === "3g")) return false;

      if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return false;
      if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) return false;

      return true;
    };

    // Defer to idle so it never competes with first paint.
    const run = () => setEnabled(evaluate());
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 600);
    return () => window.clearTimeout(t);
  }, []);

  return enabled;
}
