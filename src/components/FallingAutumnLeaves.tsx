import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const AUTUMN_FILLS = [
  "#2d1f16",
  "#3d2a1f",
  "#4a3224",
  "#5c3d2a",
  "#6b4423",
  "#7a4a28",
  "#8b4513",
  "#8f5c3a",
  "#a0522d",
  "#a67c52",
  "#6d4c3b",
  "#8b2942",
  "#b7410e",
  "#c45c26",
  "#c9a227",
  "#b8860b",
  "#6b8e23",
];

interface Leaf {
  id: number;
  leftPct: number;
  delay: number;
  duration: number;
  size: number;
  fill: string;
  variant: 0 | 1 | 2;
  flip: boolean;
  swayDuration: number;
  swayPx: number;
  tiltDeg: number;
  driftMid: string;
  driftEnd: string;
  layerOpacity: number;
}

function LeafSvg({ variant, fill }: { variant: 0 | 1 | 2; fill: string }) {
  if (variant === 1) {
    return (
      <svg width="100%" height="100%" viewBox="0 0 32 40" fill="none" aria-hidden>
        <path
          d="M16 2 C10 12 4 22 6 32 C8 38 14 40 16 38 C18 40 24 38 26 32 C28 22 22 12 16 2Z"
          fill={fill}
        />
        <path
          d="M16 8 V34"
          stroke="rgba(0,0,0,0.22)"
          strokeWidth="0.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (variant === 2) {
    return (
      <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none" aria-hidden>
        <path
          d="M20 3 L25 14 L38 17 L27 24 L29 38 L20 29 L11 38 L13 24 L2 17 L15 14 Z"
          fill={fill}
        />
        <path
          d="M20 12 V30"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 36 28" fill="none" aria-hidden>
      <path
        d="M4 14 C8 4 18 0 28 6 C34 10 34 18 28 22 C20 28 10 26 4 18 C2 16 2 16 4 14Z"
        fill={fill}
      />
      <path
        d="M18 6 Q14 14 18 22"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.6"
        fill="none"
      />
    </svg>
  );
}

const LEAF_COUNT = 10;

export function FallingAutumnLeaves() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const leaves = useMemo(() => {
    return Array.from({ length: LEAF_COUNT }, (_, i) => {
      const driftA = 20 + Math.random() * 48;
      const driftB = -(15 + Math.random() * 40);
      return {
        id: i,
        leftPct: Math.random() * 104 - 2,
        delay: Math.random() * 18,
        duration: 11 + Math.random() * 16,
        size: 12 + Math.floor(Math.random() * 16),
        fill: AUTUMN_FILLS[Math.floor(Math.random() * AUTUMN_FILLS.length)],
        variant: (i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0) as 0 | 1 | 2,
        flip: Math.random() > 0.5,
        swayDuration: 2.2 + Math.random() * 2.4,
        swayPx: 10 + Math.random() * 14,
        tiltDeg: 10 + Math.random() * 14,
        driftMid: `${driftA.toFixed(1)}px`,
        driftEnd: `${driftB.toFixed(1)}px`,
        layerOpacity: 0.55 + Math.random() * 0.35,
      } satisfies Leaf;
    });
  }, []);

  if (!mounted || reduceMotion || typeof document === "undefined") return null;

  const layer = (
    <div
      className="autumn-leaves-layer pointer-events-none fixed inset-0 z-[45] overflow-hidden opacity-[0.5] sm:opacity-[0.56] md:opacity-[0.62]"
      aria-hidden
    >
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="absolute will-change-transform"
          style={
            {
              left: `${leaf.leftPct}%`,
              top: "-64px",
              width: leaf.size,
              height: leaf.size * 1.14,
              opacity: leaf.layerOpacity,
              "--leaf-drift-mid": leaf.driftMid,
              "--leaf-drift-end": leaf.driftEnd,
              animation: `autumnLeafFall ${leaf.duration}s cubic-bezier(0.4, 0.02, 0.2, 0.98) ${leaf.delay}s infinite`,
            } as CSSProperties
          }
        >
          <div
            className="h-full w-full [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.28))]"
            style={
              {
                transform: leaf.flip ? "scaleX(-1)" : undefined,
                "--sway": `${leaf.swayPx}px`,
                "--tilt": `${leaf.tiltDeg}deg`,
                animation: `autumnLeafSway ${leaf.swayDuration}s ease-in-out ${leaf.delay * 0.3}s infinite alternate`,
              } as CSSProperties
            }
          >
            <LeafSvg variant={leaf.variant} fill={leaf.fill} />
          </div>
        </div>
      ))}
    </div>
  );

  return createPortal(layer, document.body);
}
