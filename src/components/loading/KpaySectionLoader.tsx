"use client";

import React from "react";
import { KpayInlineLoader } from "./KpayInlineLoader";

/** Small widget/section loader — inline brand mark, does not block the page. */
export const KpaySectionLoader: React.FC<{
  message?: string;
  className?: string;
}> = ({ message, className = "" }) => (
  <div
    className={`flex items-center justify-center gap-2.5 py-6 ${className}`}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <KpayInlineLoader size="md" />
    {message && <span className="text-sm text-[var(--muted)]">{message}</span>}
  </div>
);

export default KpaySectionLoader;
