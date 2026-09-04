"use client";

import React from "react";
import KpayLoader from "./KpayLoader";
import { KpayMarkSize } from "./KpayBrandMark";

/** In-content page loader (not full-screen) — a compact centred brand loader. */
export const KpayPageLoader: React.FC<{
  message?: string;
  markSize?: KpayMarkSize;
  className?: string;
  minHeight?: string;
}> = ({ message, markSize = "md", className = "", minHeight = "min-h-[40vh]" }) => (
  <div
    className={`flex ${minHeight} w-full items-center justify-center ${className}`}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <KpayLoader markSize={markSize} progress="ring" message={message} compact />
  </div>
);

export default KpayPageLoader;
