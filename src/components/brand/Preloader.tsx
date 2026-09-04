"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

/**
 * KoriePay brand reveal.
 *
 * A brief (sub-second), NON-blocking brand moment shown only on the first
 * entry within a session. It uses an indeterminate spinner rather than fake
 * progress percentages, so it never claims progress the backend did not
 * provide. After reveal, content is already rendered beneath it.
 */
export const Preloader: React.FC = () => {
  const [phase, setPhase] = useState<"enter" | "exit" | "done">("enter");

  useEffect(() => {
    // Only show once per session; subsequent loads are instant.
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

  return (
    <div
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#070b17] transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.12) 0%, rgba(245, 158, 11, 0.05) 40%, #070b17 80%)",
      }}
      aria-hidden
    >
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative h-14 w-44 sm:w-52">
          <Image
            src="/brand/koriepay-logo-white.png"
            alt="KoriePay"
            fill
            priority
            className="object-contain drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]"
          />
        </div>

        {/* Indeterminate branded loader — not a fake percentage */}
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
        </div>
      </div>
    </div>
  );
};

export default Preloader;
