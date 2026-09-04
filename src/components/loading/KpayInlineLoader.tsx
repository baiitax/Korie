"use client";

import React from "react";

/** Minimal, inline KoriePay spinner for small surfaces (buttons, chips) — no glass. */
export type KpayInlineSize = "xs" | "sm" | "md";

const SIZES: Record<KpayInlineSize, { box: string; ring: string }> = {
  xs: { box: "h-3.5 w-3.5", ring: "border-2" },
  sm: { box: "h-4 w-4", ring: "border-2" },
  md: { box: "h-5 w-5", ring: "border-[2.5px]" },
};

export const KpayInlineLoader: React.FC<{
  size?: KpayInlineSize;
  className?: string;
  label?: string;
}> = ({ size = "sm", className = "", label }) => {
  const s = SIZES[size];
  return (
    <span
      className={`inline-block ${s.box} ${s.ring} animate-spin rounded-full border-[var(--border)] border-t-[var(--brand-primary)] ${className}`}
      role="status"
      aria-label={label || "Loading"}
      aria-live="polite"
    />
  );
};

export default KpayInlineLoader;
