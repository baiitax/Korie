"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

export const Preloader: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Check if user already saw the preloader in this session for lightning fast snappy subsequent page loads
    const hasLoaded = sessionStorage.getItem("koriepay_loaded");
    if (hasLoaded) {
      setLoading(false);
      setShouldRender(false);
      return;
    }

    // Smooth simulated high-performance loader (0 -> 100 in ~600ms)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setLoading(false);
            sessionStorage.setItem("koriepay_loaded", "true");
            setTimeout(() => setShouldRender(false), 400); // fade out duration
          }, 150);
          return 100;
        }
        const increment = Math.floor(Math.random() * 25) + 15;
        return Math.min(100, prev + increment);
      });
    }, 60);

    return () => clearInterval(interval);
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080d1a] transition-all duration-400 ease-out ${
        loading ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
      }`}
      style={{
        backgroundImage: "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.12) 0%, rgba(245, 158, 11, 0.06) 40%, #080d1a 80%)",
      }}
    >
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center">
        {/* Soft atmospheric ambient glow */}
        <div className="absolute -inset-10 bg-gradient-to-tr from-brand-teal-500/20 via-brand-yellow-500/15 to-brand-orange-500/20 rounded-full blur-3xl opacity-75 animate-pulse-slow" />

        {/* Logo and Icon Centerpiece */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-48 h-16 sm:w-56 sm:h-18 mb-4">
            <Image
              src="/brand/koriepay-logo-white.png"
              alt="KoriePay"
              width={320}
              height={90}
              className="object-contain w-full h-full drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]"
              priority
            />
          </div>

          {/* Subtitle / Hausa Tagline with Region */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs tracking-wider uppercase text-emerald-400 font-medium font-mono">
              🇳🇬 Nigeria
            </span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-xs text-slate-300 font-medium">
              Financial Infrastructure
            </span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-xs tracking-wider uppercase text-amber-400 font-medium font-mono">
              🇳🇪 Niger
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-56 h-1 bg-slate-800/80 rounded-full overflow-hidden border border-white/5 relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Subtle status text */}
          <div className="flex items-center justify-between w-56 mt-2 text-[11px] text-slate-400 font-mono">
            <span>Connecting nodes...</span>
            <span className="text-emerald-400">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
