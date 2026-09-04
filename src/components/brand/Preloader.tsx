"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "@/components/ui/ThemeContext";

/**
 * KoriePay brand reveal.
 *
 * A brief (sub-second), NON-blocking brand moment shown only on the first
 * entry within a session. It uses an indeterminate spinner rather than fake
 * progress percentages, so it never claims progress the backend did not
 * provide. The logo + surface are theme-aware so the mark is always visible.
 */
export const Preloader: React.FC = () => {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<"enter" | "exit" | "done">("enter");

  useEffect(() => {
    const hasLoaded = sessionStorage.getItem("koriepay_loaded");
    if (hasLoaded) {
      setPhase("done");
      return;
    }

    // Reveal quickly, then fade out. No fake progress.
    const exit = setTimeout(() => setPhase("exit"), 550);
    const finish = setTimeout(() => {
      sessionStorage.setItem("koriepay_loaded", "true");
      setPhase("done");
    }, 950);
    return () => {
      clearTimeout(exit);
      clearTimeout(finish);
    };
  }, []);

  if (phase === "done") return null;

  const visible = phase === "enter";
  const isDark = theme === "dark";
  const logoSrc = isDark
    ? "/brand/koriepay-logo-white.png"
    : "/brand/koriepay-logo-full.png";
  const bg = isDark
    ? "radial-gradient(circle at 50% 50%, rgba(16,185,129,0.12) 0%, rgba(245,158,11,0.05) 40%, #070b17 80%)"
    : "radial-gradient(circle at 50% 50%, rgba(13,148,136,0.1) 0%, rgba(217,119,6,0.04) 40%, #f4f7fb 80%)";

  return (
    <div
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[var(--background)] transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ backgroundImage: bg }}
      aria-hidden
    >
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative h-14 w-44 sm:w-52">
          <Image
            src={logoSrc}
            alt="KoriePay"
            fill
            priority
            className={`object-contain ${
              isDark
                ? "drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                : "drop-shadow-[0_2px_10px_rgba(16,24,40,0.08)]"
            }`}
          />
        </div>

        {/* Indeterminate branded loader — not a fake percentage */}
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--brand-primary)]" />
        </div>
      </div>
    </div>
  );
};

export default Preloader;
