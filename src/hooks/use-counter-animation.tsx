import { useEffect, useState } from "react";

type CounterOptions = {
  duration?: number; // total duration in ms
  overshoot?: boolean; // briefly overshoot then settle to target
};

export function useCounterAnimation(target: number, options: CounterOptions = {}) {
  const { duration = 900, overshoot = true } = options;
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let rafId: number;
    const startValue = 0;
    const overshootValue = overshoot ? Math.round(target * 1.08 + 3) : target;
    const half = Math.max(200, Math.floor(duration * (overshoot ? 0.55 : 1)));

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;

      if (overshoot && elapsed <= half) {
        const progress = Math.min(elapsed / half, 1);
        const easeFast = 1 - Math.pow(1 - progress, 3); // quick ramp-up
        const current = Math.max(0, Math.floor(startValue + (overshootValue - startValue) * easeFast));
        setCount(current);
        rafId = requestAnimationFrame(animate);
        return;
      }

      const settleElapsed = overshoot ? elapsed - half : elapsed;
      const totalSettle = overshoot ? duration - half : duration;
      const progress = Math.min(settleElapsed / Math.max(totalSettle, 1), 1);

      // easeOutBack-like settling
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const easeOutBack = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);

      const from = overshoot ? overshootValue : startValue;
      const current = Math.max(0, Math.floor(from + (target - from) * easeOutBack));
      setCount(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, overshoot]);

  return count;
}
