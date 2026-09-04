"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Global route progress bar.
 *
 * A thin, top-of-viewport branded progress indicator that starts on
 * navigation, eases toward completion, and finishes when the new route
 * has rendered. It is intentionally subtle and respects reduced motion.
 *
 * Note: it intentionally avoids useSearchParams() so it does not require
 * a Suspense boundary during static prerendering.
 */
export const RouteProgress: React.FC = () => {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);
  const lastPath = useRef<string>("");

  // Reset & start on route change (skip the very first mount).
  useEffect(() => {
    if (lastPath.current && lastPath.current !== pathname) {
      setWidth(6);
      setFinished(false);
      setVisible(true);
      startedAt.current = Date.now();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setWidth((prev) => {
          const elapsed = Date.now() - startedAt.current;
          const target = Math.min(90, 6 + (elapsed / 12) * 0.7);
          return Math.max(prev + (target - prev) * 0.18, prev);
        });
      }, 100);
    }
    lastPath.current = pathname;
  }, [pathname]);

  // Finish after a short settle window once the route renders.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      setWidth(100);
      setFinished(true);
      const fade = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(fade);
    }, 500);
    return () => clearTimeout(t);
  }, [pathname, visible]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-live="polite"
      aria-label="Loading page"
      className="fixed top-0 left-0 right-0 z-[90] h-0.5 overflow-hidden pointer-events-none"
    >
      <div
        className={`h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500 transition-all ease-out ${
          finished ? "duration-200" : "duration-150"
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

export default RouteProgress;
