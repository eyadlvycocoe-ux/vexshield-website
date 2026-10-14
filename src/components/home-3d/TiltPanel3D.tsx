import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  intensity?: number;
  float?: boolean;
};

export function TiltPanel3D({
  children,
  className,
  innerClassName,
  intensity = 1,
  float = false,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const baseTransform = float ? "rotateX(2deg) rotateY(-2deg) translateZ(12px)" : "translateZ(6px)";
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      const rx = (-ny * 11 * intensity).toFixed(2);
      const ry = (nx * 14 * intensity).toFixed(2);
      const tz = (26 * intensity).toFixed(2);
      el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px) scale(1.015)`;
    },
    [intensity, reduced],
  );

  useEffect(() => {
    const el = panelRef.current;
    if (!el || reduced) return;
    el.style.transform = baseTransform;
  }, [baseTransform, reduced]);

  const onLeave = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.transform = reduced ? "" : baseTransform;
  }, [baseTransform, reduced]);

  return (
    <div
      className={cn("home-tilt-scene", className)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div
        ref={panelRef}
        className={cn("home-tilt-panel", float && "home-tilt-panel--float", innerClassName)}
      >
        {children}
      </div>
    </div>
  );
}
