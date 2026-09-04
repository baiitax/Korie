"use client";

import React from "react";
import KpayBrandMark, { KpayMarkSize } from "./KpayBrandMark";
import { KpayProgress } from "./KpayProgress";

/**
 * KoriePay core loader — the brand mark orbiting a refined progress ring,
 * or a thin line beneath it. This is the shared visual language for:
 * full screen, page, section and transaction loaders.
 *
 * Motion is restricted to transform/opacity (GPU-friendly) and is frozen by
 * the `prefers-reduced-motion` layer. Progress is indeterminate by default —
 * never a fabricated percentage.
 */

interface KpayLoaderProps {
  markSize?: KpayMarkSize;
  /** "ring" surrounds the mark; "line" sits beneath it; "none" = mark only. */
  progress?: "ring" | "line" | "none";
  message?: string;
  tagline?: string;
  /** Real progress only. Omit → indeterminate (no fake %). */
  progressValue?: number;
  align?: "center" | "start";
  compact?: boolean;
  /** Use full lockup (mark + wordmark) instead of the bare icon. */
  lockup?: boolean;
  className?: string;
}

export const KpayLoader: React.FC<KpayLoaderProps> = ({
  markSize = "md",
  progress = "ring",
  message,
  tagline,
  progressValue,
  align = "center",
  compact = false,
  lockup = false,
  className = "",
}) => {
  const alignCls = align === "center" ? "items-center text-center" : "items-start text-left";
  const r = markSize === "lg" ? 54 : markSize === "xl" ? 72 : markSize === "2xl" ? 88 : markSize === "md" ? 40 : markSize === "sm" ? 30 : 24;
  const ringBuf = 10;
  const box = (r + ringBuf) * 2;

  return (
    <div className={`flex flex-col items-center gap-4 ${alignCls} ${className}`}>
      {lockup ? (
        <KpayBrandMark size={markSize} lockup breathe={progress !== "none"} glow />
      ) : (
        <div className="relative" style={{ width: box, height: box }}>
          {/* Brand progress ring (indeterminate) */}
          {progress === "ring" && (
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 kp-loader-ring"
              aria-hidden
            >
              <defs>
                <linearGradient id="kp-ring-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--brand-primary)" />
                  <stop offset="100%" stopColor="var(--brand-secondary)" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--surface-3)" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="url(#kp-ring-grad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="72 217"
              />
            </svg>
          )}

          {/* The mark sits inside the ring, or centered when no ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <KpayBrandMark size={markSize} breathe={progress === "ring"} glow />
          </div>
        </div>
      )}

      {!compact && (message || tagline) && (
        <div className="space-y-1">
          {tagline && (
            <p className="text-sm font-semibold tracking-wide text-[var(--foreground)]">
              {tagline}
            </p>
          )}
          {message && (
            <p className="text-sm text-[var(--muted)]" role="status" aria-live="polite">
              {message}
            </p>
          )}
        </div>
      )}

      {(progress === "line" || lockup) && (
        <div className="w-full max-w-[240px]">
          <KpayProgress value={progressValue} size="sm" />
        </div>
      )}
    </div>
  );
};

export default KpayLoader;
