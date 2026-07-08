"use client";

import { useEffect, useState } from "react";

/**
 * Counts from 0 to `target` once `started` becomes true.
 * Renders the final value immediately when the user prefers reduced motion.
 */
export function useCountUp(target: number, started: boolean, duration = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!started) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      if (reduced) {
        setValue(target);
        return;
      }
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, started, duration]);

  return value;
}
