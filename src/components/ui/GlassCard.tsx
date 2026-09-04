"use client";

import React from "react";

export type GlassLevel = "01" | "02" | "03" | "modal";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: GlassLevel;
  interactive?: boolean;
  as?: React.ElementType;
}

/**
 * KoriePay glass surface. Wraps the 4-level Glassmorphism design language in a
 * single primitive so every portal reuses the same disciplined look.
 *
 * - "01" subtle   — toolbars, filters, secondary panels
 * - "02" standard — financial cards, dashboard panels, widgets
 * - "03" premium  — hero balance cards, major summaries, CTA surfaces
 * - "modal"       — dialogs, confirmations, security prompts
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  level = "02",
  interactive = false,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}) => {
  return (
    <Tag
      className={`rounded-2xl glass-${level} ${
        interactive ? "cursor-pointer transition-transform duration-200 hover:-translate-y-0.5" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default GlassCard;
