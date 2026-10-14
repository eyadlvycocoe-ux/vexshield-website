import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TiltPanel3D } from "./TiltPanel3D";

type Accent = "sky" | "emerald" | "violet" | "amber";

const ACCENT: Record<Accent, { border: string; glow: string; caption: string }> = {
  sky: {
    border: "border-sky-500/35",
    glow: "shadow-[0_0_48px_rgba(0,149,255,0.14)]",
    caption: "text-sky-300/95",
  },
  emerald: {
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_48px_rgba(34,197,94,0.12)]",
    caption: "text-emerald-400/95",
  },
  violet: {
    border: "border-violet-500/35",
    glow: "shadow-[0_0_48px_rgba(88,101,242,0.14)]",
    caption: "text-violet-300/95",
  },
  amber: {
    border: "border-amber-500/35",
    glow: "shadow-[0_0_48px_rgba(245,158,11,0.12)]",
    caption: "text-amber-300/95",
  },
};

type Props = {
  caption: string;
  accent?: Accent;
  children: ReactNode;
  className?: string;
};

export function ProductShowcase3D({ caption, accent = "sky", children, className }: Props) {
  const a = ACCENT[accent];
  return (
    <TiltPanel3D className={className} float>
      <figure
        className={cn(
          "home-product-showcase overflow-hidden rounded-2xl border bg-[#0c101c]/95 backdrop-blur-sm",
          a.border,
          a.glow,
        )}
      >
        <div
          className={cn(
            "border-b border-white/[0.06] bg-[#0d1422]/90 px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider",
            a.caption,
          )}
        >
          {caption}
        </div>
        <div className="home-product-media relative p-3 sm:p-4">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_42%,rgba(255,255,255,0.05)_50%,transparent_58%)] hero-shimmer opacity-60" />
          {children}
        </div>
      </figure>
    </TiltPanel3D>
  );
}
