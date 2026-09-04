"use client";

import React, { useEffect, useState, useRef } from "react";
import type { FullScreenOptions } from "./LoadingContext";
import KpayLoader from "./KpayLoader";

interface KpayFullScreenLoaderProps {
  open: boolean;
  options?: FullScreenOptions;
  onHidden?: () => void;
  /** i18n `t` from useLanguage so strings stay translated. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const CONTEXT_KEY: Record<string, string> = {
  public: "loading.public",
  customer: "loading.customer",
  agency: "loading.agency",
  merchant: "loading.merchant",
  aggregator: "loading.aggregator",
  compliance: "loading.compliance",
  support: "loading.support",
  developer: "loading.developer",
  admin: "loading.admin",
  auth: "loading.authSecuring",
  transaction: "loading.processTransaction",
};

/**
 * Full-screen KoriePay preloader — light-first, glassmorphic, brand-centred.
 * Used ONLY for genuinely blocking work: app bootstrap, auth/security
 * resolution, or an explicit sticky request. Uses an indeterminate progress
 * ring (never a fabricated %), fades in/out, respects reduced motion, and
 * exposes a non-trapping `status` region for assistive tech.
 */
export const KpayFullScreenLoader: React.FC<KpayFullScreenLoaderProps> = ({
  open,
  options,
  onHidden,
  t,
}) => {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  const [exiting, setExiting] = useState(false);
  // Prevent flashing on the very first client render when closed.
  const first = useRef(true);

  useEffect(() => {
    if (open) {
      first.current = false;
      setRender(true);
      // Next frame → CSS transition in.
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    if (render && !first.current) {
      setExiting(true);
      setShown(false);
      const fin = setTimeout(() => {
        setRender(false);
        setExiting(false);
        onHidden?.();
      }, 260);
      return () => clearTimeout(fin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!render) return null;

  const kind = options?.kind || "bootstrap";
  const message =
    options?.message ||
    (kind === "auth"
      ? t("loading.authSecuring")
      : kind === "security"
        ? t("loading.securityVerifying")
        : kind === "custom"
          ? options?.message || t("common.loading")
          : t("loading.initial"));

  const tagline = options?.tagline || t("loading.tagline");
  const bootstrap = kind === "bootstrap";
  const markSize = bootstrap ? "md" : "md";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${
        shown && !exiting ? "opacity-100" : "opacity-0"
      }`}
      style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
      data-reduced-motion
    >
      {/* Light-first canvas + ambient glows */}
      <div className="absolute inset-0 kp-loader-surface" aria-hidden />

      {/* Ambience orb behind the stage */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-72 w-72 rounded-full bg-[var(--brand-soft)] blur-3xl kp-glow-pulse" />
      </div>

      {/* Premium glass stage */}
      <div
        className={`relative w-full max-w-md rounded-3xl p-8 sm:p-10 kp-loader-stage flex flex-col items-center text-center gap-6 ${
          shown && !exiting ? "kp-anim-reveal" : ""
        }`}
        style={{ transform: shown && !exiting ? undefined : "scale(0.98)" }}
      >
        <KpayLoader
          markSize={markSize}
          progress={bootstrap ? "none" : "ring"}
          lockup={bootstrap}
          message={message}
          tagline={tagline}
        />

        {/* Thin indeterminate line for extra pacing — not fake progress */}
        {!bootstrap && (
          <div className="w-full max-w-[200px]">
            <div className="kp-indeterminate-track h-1 w-full">
              <div className="kp-indeterminate-bar h-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KpayFullScreenLoader;
