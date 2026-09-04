"use client";

import React from "react";

export interface KpayProgressProps {
  /** 0..100. When omitted → indeterminate. Real % only; never fabricate. */
  value?: number;
  /** Show the numeric % readout. Only meaningful with a real value. */
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

/** Horizontal brand progress. Indeterminate by default (no fake %). */
export const KpayProgress: React.FC<KpayProgressProps> = ({
  value,
  showLabel = false,
  size = "md",
  className = "",
  label,
}) => {
  const height = { sm: "h-1", md: "h-1.5", lg: "h-2" }[size];

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
          {showLabel && typeof value === "number" && (
            <span className="text-xs font-semibold tabular text-[var(--foreground)]">
              {Math.round(value)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`${height} w-full overflow-hidden rounded-full bg-[var(--surface-3)]`}
        role="progressbar"
        aria-valuenow={typeof value === "number" ? Math.round(value) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Loading"}
        aria-hidden={typeof value !== "number"}
      >
        {typeof value === "number" ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          />
        ) : (
          <div className="kp-indeterminate-track h-full w-full rounded-full">
            <div className="kp-indeterminate-bar h-full" />
          </div>
        )}
      </div>
    </div>
  );
};

export default KpayProgress;
