import { Suspense, lazy, memo, useCallback, useEffect, useRef, useState } from "react";
import { Shield, Zap  } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCounterAnimation } from "@/hooks/use-counter-animation";
import { useEnable3D } from "@/components/home-3d/use-enable-3d";

const Hero3DCanvas = lazy(() => import("@/components/Hero3DCanvas"));

type StatBadgeProps = {
  label: string;
  value: number;
  accent?: "sky" | "cyan";
  className?: string;
  depthClass?: string;
};

const StatBadge = memo(function StatBadge({
  label,
  value,
  accent = "sky",
  className,
  depthClass = "hero-depth-near",
}: StatBadgeProps) {
  const animated = useCounterAnimation(value, { duration: 2200 });
  const formatted =
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(value % 1_000_000 < 100_000 ? 0 : 1)}M`
      : value >= 10_000
        ? `${Math.round(value / 1000)}K`
        : value >= 1000
          ? `${(value / 1000).toFixed(1)}K`
          : animated.toLocaleString();

  return (
    <div className={cn("hero-stat-badge", depthClass, className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border px-5 py-4 backdrop-blur-xl",
          accent === "cyan"
            ? "border-cyan-400/35 bg-gradient-to-br from-cyan-950/80 to-slate-950/90 shadow-[0_0_40px_rgba(34,211,238,0.18)]"
            : "border-sky-400/35 bg-gradient-to-br from-sky-950/80 to-slate-950/90 shadow-[0_0_40px_rgba(56,189,248,0.18)]",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.08)_50%,transparent_60%)] hero-shimmer" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p
          className={cn(
            "mt-1 text-3xl font-bold tabular-nums text-white md:text-4xl",
            accent === "cyan" && "text-cyan-300",
          )}
        >
          {formatted}
        </p>
      </div>
    </div>
  );
});

export type Hero3DPresentationProps = {
  heroImage: string;
  dashboardAlt: string;
  totalServers: number;
  totalBans: number;
  serversLabel: string;
  bansLabel: string;
};

export function Hero3DPresentation({
  heroImage,
  dashboardAlt,
  totalServers,
  totalBans,
  serversLabel,
  bansLabel,
}: Hero3DPresentationProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rx: 8, ry: -14, tz: 0 });
  const reducedMotion = useRef(false);
  const enable3D = useEnable3D();

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion.current) return;
    const el = sceneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMouse({ x: nx, y: ny });
    setTilt({
      rx: 8 - ny * 10,
      ry: -14 + nx * 14,
      tz: 24,
    });
  }, []);

  const onPointerLeave = useCallback(() => {
    setMouse({ x: 0, y: 0 });
    setTilt({ rx: 8, ry: -14, tz: 0 });
  }, []);

  return (
    <div
      ref={sceneRef}
      className="hero-3d-scene relative mx-auto aspect-[4/3] w-full max-w-[640px] md:max-w-none md:aspect-[16/11] lg:aspect-[16/10]"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-[radial-gradient(ellipse_at_50%_50%,rgba(14,165,233,0.22),transparent_65%)] blur-2xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_55%)]" />

      {/* Three.js particle field (desktop / capable devices only) */}
      {enable3D ? (
        <Suspense fallback={null}>
          <Hero3DCanvas
            className="pointer-events-none absolute inset-0 z-0 opacity-90"
            mouseX={mouse.x}
            mouseY={mouse.y}
          />
        </Suspense>
      ) : null}

      {/* Floor grid */}
      <div className="hero-grid-floor pointer-events-none absolute bottom-[8%] left-1/2 z-[1] h-[45%] w-[130%] -translate-x-1/2" />

      {/* Orbiting rings (CSS 3D) */}
      <div className="pointer-events-none absolute left-1/2 top-[42%] z-[2] h-48 w-48 -translate-x-1/2 -translate-y-1/2 md:h-64 md:w-64">
        <div className="hero-orbit-ring absolute inset-0 rounded-full border border-sky-400/25" />
        <div className="hero-orbit-ring hero-orbit-ring--reverse absolute inset-3 rounded-full border border-indigo-400/20" />
        <div className="hero-orbit-ring hero-orbit-ring--slow absolute inset-8 rounded-full border border-cyan-300/15" />
      </div>

      {/* 3D stage */}
      <div
        ref={stageRef}
        className="hero-3d-stage absolute inset-0 z-[3] flex items-center justify-center"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${tilt.tz}px)`,
        }}
      >
        {/* Dashboard panel */}
        <div className="hero-dashboard-panel relative w-[88%] max-w-[520px]">
          <div className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-sky-500/40 via-transparent to-indigo-500/30 blur-md" />
          <div className="hero-scanlines relative overflow-hidden rounded-2xl border border-sky-400/40 bg-gradient-to-br from-slate-900/90 to-slate-950/95 shadow-[0_40px_80px_rgba(0,0,0,0.55),0_0_60px_rgba(14,165,233,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <img
              src={heroImage}
              alt={dashboardAlt}
              width={1600}
              height={1000}
              className="block h-full w-full object-cover object-center select-none"
              draggable={false}
              fetchPriority="high"
              decoding="async"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-sky-500/25 via-transparent to-violet-500/15" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.35)_100%)]" />
          </div>

          {/* Holographic shield chip */}
          <div className="hero-depth-mid absolute -bottom-5 -left-3 flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-slate-950/85 px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 text-black shadow-[0_0_20px_rgba(56,189,248,0.5)]">
              <Shield className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">Live Shield</p>
              <p className="flex items-center gap-1 text-xs font-semibold text-white">
                <Zap className="h-3 w-3 text-emerald-400" fill="currentColor" />
                Active protection
              </p>
            </div>
          </div>
        </div>

        {/* Floating stats - different Z depth */}
        <StatBadge
          label={serversLabel}
          value={totalServers}
          accent="sky"
          className="absolute -left-2 top-[6%] md:-left-8 md:top-[4%]"
          depthClass="hero-depth-far"
        />
        <StatBadge
          label={bansLabel}
          value={totalBans}
          accent="cyan"
          className="absolute -right-1 top-[2%] md:-right-6 md:-top-2"
          depthClass="hero-depth-near"
        />
      </div>

      {/* Foreground light streak */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-[4] h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent shadow-[0_0_24px_rgba(56,189,248,0.8)]" />
    </div>
  );
}

