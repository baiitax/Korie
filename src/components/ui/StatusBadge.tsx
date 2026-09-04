"use client";

import React from "react";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "kp-badge-success",
  warning: "kp-badge-warning",
  danger: "kp-badge-danger",
  info: "kp-badge-info",
  brand: "kp-badge-brand",
  neutral: "bg-[var(--surface-3)] text-[var(--foreground)]",
};

/**
 * StatusBadge — communicates state with BOTH a color and a text label so
 * status is never conveyed by colour alone (WCAG 2.2 AA).
 */
export const StatusBadge: React.FC<{
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}> = ({ tone = "neutral", children, dot = true, className = "" }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
};

export default StatusBadge;
