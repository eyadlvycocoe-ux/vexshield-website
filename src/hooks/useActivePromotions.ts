import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base";
import type { Promotion } from "@/lib/promotions";

export function useActivePromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/promotions/active`, {
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setPromotions(data.promotions || []);
      } catch {
        if (!cancelled) setPromotions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { promotions, loading };
}
