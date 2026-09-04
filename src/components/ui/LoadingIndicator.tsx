"use client";

import React from "react";

interface LoadingIndicatorProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  className?: string;
  inline?: boolean;
}

/**
 * KoriePay branded loading indicator. A lightweight radial spinner with a
 * subtle glow and an optional contextual message. Used for data/API loading,
 * not as a full-screen preloader.
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = "md",
  message,
  className = "",
  inline = false,
}) => {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-9 w-9" };
  const ring = { sm: "border-2", md: "border-[3px]", lg: "border-4" };

  const spinner = (
    <span
      className={`${sizes[size]} ${ring[size]} inline-block animate-spin rounded-full border-slate-300 border-t-emerald-500 ${
        inline ? "" : "block"
      }`}
      role="status"
      aria-label={message || "Loading"}
    />
  );

  return (
    <div
      className={`${inline ? "inline-flex" : "flex flex-col"} items-center justify-center gap-2.5 ${className}`}
      role="status"
      aria-live="polite"
    >
      {inline ? (
        <span className="inline-flex items-center gap-2">
          {spinner}
          {message && <span className="text-xs text-[var(--muted)]">{message}</span>}
        </span>
      ) : (
        <>
          {spinner}
          {message && (
            <span className="text-sm font-medium text-[var(--muted)] text-center">
              {message}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default LoadingIndicator;
