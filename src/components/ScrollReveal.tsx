import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger when multiple siblings reveal */
  delayMs?: number;
  /** `3d` adds perspective depth on scroll-in */
  variant?: "default" | "3d";
};

export function ScrollReveal({ children, className, delayMs = 0, variant = "default" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const applyEntry = (entry: IntersectionObserverEntry) => {
      if (entry.target !== el) return;
      setVisible(entry.isIntersecting);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) applyEntry(entry);
      },
      { rootMargin: "0px 0px -8% 0px", threshold: [0, 0.05, 0.1, 0.15] },
    );

    io.observe(el);

    try {
      for (const entry of io.takeRecords()) applyEntry(entry);
    } catch {
      /* ignore */
    }

    const nudge = () => {
      try {
        for (const entry of io.takeRecords()) applyEntry(entry);
      } catch {
        /* disconnected */
      }
    };

    // Reduced nudging - only one RAF and one short timeout
    let raf = requestAnimationFrame(nudge);
    const t0 = window.setTimeout(nudge, 150);

    const onPageShow = () => nudge();
    window.addEventListener("pageshow", onPageShow);

    return () => {
      io.disconnect();
      clearTimeout(t0);
      cancelAnimationFrame(raf);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        variant === "3d" ? "scroll-reveal-home-3d" : "scroll-reveal-home",
        visible && "scroll-reveal-home--in",
        className,
      )}
      style={
        visible && delayMs > 0
          ? { transitionDelay: `${delayMs}ms` }
          : { transitionDelay: "0ms" }
      }
    >
      {children}
    </div>
  );
}
