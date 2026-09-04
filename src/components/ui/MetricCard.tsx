"use client";

import React from "react";
import { TrendingDown, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

export type MetricTone =
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trend?: {
    direction: "up" | "down";
    value: string;
    positive?: boolean;
  };
  hint?: string;
  tone?: MetricTone;
  className?: string;
  level?: "02" | "03";
}

const toneClasses: Record<MetricTone, { icon: string; trend: string }> = {
  brand: { icon: "text-[var(--brand-primary)] bg-[var(--brand-soft)]", trend: "text-[var(--brand-primary)]" },
  success: { icon: "text-[var(--success)] bg-[var(--success-soft)]", trend: "text-[var(--success)]" },
  warning: { icon: "text-[var(--warning)] bg-[var(--warning-soft)]", trend: "text-[var(--warning)]" },
  danger: { icon: "text-[var(--danger)] bg-[var(--danger-soft)]", trend: "text-[var(--danger)]" },
  neutral: { icon: "text-[var(--muted)] bg-[var(--surface-2)]", trend: "text-[var(--muted)]" },
};

/**
 * Financial metric card. A premium glass surface with a large, tabular value,
 * a small contextual label, an optional trend indicator and a subtle icon.
 * Purpose-built so monetary figures dominate visually and remain easy to scan.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  trend,
  hint,
  tone = "brand",
  className = "",
  level = "02",
}) => {
  const cls = toneClasses[tone];
  return (
    <div className={`glass-${level} rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${cls.icon}`}>
            {icon}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-2xl font-bold tabular text-[var(--foreground)] leading-tight tracking-tight">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-[11px] font-medium text-[var(--muted)]">{hint}</div>
          )}
        </div>

        {trend && (
          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${cls.trend}`}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
