"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "@/components/ui/ThemeContext";

export type KpayMarkSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE: Record<KpayMarkSize, number> = {
  xs: 32,
  sm: 40,
  md: 56,
  lg: 72,
  xl: 96,
  "2xl": 120,
};

interface KpayBrandMarkProps {
  size?: KpayMarkSize;
  /** Use the wordmark lockup (mark + "KoriePay"). Defaults to the icon mark. */
  lockup?: boolean;
  /** Enable the slow ambient breathe for the mark. */
  breathe?: boolean;
  /** Theme-aware glow behind the mark. */
  glow?: boolean;
  className?: string;
}

/**
 * KoriePay brand mark, reusing the real repo logo asset (never redrawn).
 * The mark is a teal + amber glass "K" that reads on both light and dark,
 * so the same asset works for Day and Night. Theme only switches the glow.
 */
export const KpayBrandMark: React.FC<KpayBrandMarkProps> = ({
  size = "md",
  lockup = false,
  breathe = false,
  glow = false,
  className = "",
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const px = SIZE[size];

  if (lockup) {
    // Full lockup: mark + wordmark. Dark theme uses the white variant.
    const src = isDark ? "/brand/koriepay-logo-white.png" : "/brand/koriepay-logo-full.png";
    const width = size === "xs" ? 150 : size === "sm" ? 176 : size === "md" ? 210 : size === "lg" ? 250 : 280;
    const height = Math.round((width * 934) / 4226);
    return (
      <div
        className={`relative ${breathe ? "kp-loader-breathe" : ""} ${className}`}
        style={{ width, height }}
      >
        <Image
          src={src}
          alt="KoriePay"
          fill
          priority
          sizes="280px"
          className={`object-contain ${glow ? "kp-brand-glow" : ""}`}
        />
      </div>
    );
  }

  // Icon mark (no wordmark) — square-ish, scales cleanly in a ring.
  return (
    <div className={`relative ${className}`} style={{ width: px, height: px }}>
      <Image
        src="/brand/koriepay-icon-tight.png"
        alt="KoriePay mark"
        fill
        priority
        sizes="120px"
        className={`object-contain ${breathe ? "kp-loader-breathe" : ""} ${glow ? "kp-brand-glow" : ""}`}
      />
    </div>
  );
};

export default KpayBrandMark;
