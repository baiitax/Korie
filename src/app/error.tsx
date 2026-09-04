"use client";

import { useEffect } from "react";
import Link from "next/link";
import KpayBrandMark from "@/components/loading/KpayBrandMark";

/**
 * Global error boundary. NEVER surfaces stack traces, SQL, provider secrets,
 * tokens, internal URLs or IDs — only a safe, human message with a retry and
 * a way back home. Localised through the language provider is not available
 * here (errors are rare), so we keep copy short and neutral.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("KoriePay global error:", error?.message || error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-md kp-loader-stage rounded-3xl p-8 sm:p-10 text-center space-y-5">
        <div className="flex justify-center">
          <KpayBrandMark size="sm" glow />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-[var(--foreground)]">
            Something went wrong
          </h1>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            We couldn&apos;t complete that request. Your funds and data are safe.
            Please try again, or return to your dashboard.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={reset}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
