"use client";

import React, { forwardRef, useRef } from "react";
import { KpayInlineLoader } from "./KpayInlineLoader";

export type KpayButtonVariant = "primary" | "secondary" | "tertiary" | "danger";

/** KoriePay button. While `loading`, it is disabled and inert so it can never
 *  initiate the same financial action twice; dimensions are preserved so the
 *  layout never jumps. The label swaps to a contextual loading label. */
interface KpayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: KpayButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
}

const VARIANT: Record<KpayButtonVariant, string> = {
  primary:
    "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] shadow-lg shadow-[var(--brand-soft)]",
  secondary:
    "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
  tertiary:
    "bg-transparent text-[var(--brand-primary)] hover:bg-[var(--brand-soft)]",
  danger:
    "bg-[var(--danger)] text-white hover:opacity-90 shadow-lg shadow-[var(--danger-soft)]",
};

export const KpayButton = forwardRef<HTMLButtonElement, KpayButtonProps>(
  (
    {
      variant = "primary",
      loading = false,
      loadingLabel,
      disabled,
      className = "",
      children,
      fullWidth,
      onClick,
      ...rest
    },
    ref
  ) => {
    // Keep a ref to original handler and lock the "loading" snapshot.
    const clickRef = useRef(onClick);
    clickRef.current = onClick;

    const isDisabled = disabled || loading;

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      clickRef.current?.(e);
    };

    return (
      <button
        ref={ref}
        type={rest.type || "button"}
        {...rest}
        disabled={isDisabled}
        onClick={handleClick}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        aria-live="polite"
        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] disabled:opacity-60 disabled:cursor-not-allowed ${VARIANT[variant]} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
      >
        {loading && <KpayInlineLoader size="sm" className="text-current" />}
        {loading && loadingLabel ? loadingLabel : children}
      </button>
    );
  }
);

KpayButton.displayName = "KpayButton";
export default KpayButton;
