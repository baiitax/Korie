"use client";

import React from "react";
import { useLanguage } from "@/components/ui/LanguageContext";
import KpayFullScreenLoader from "./KpayFullScreenLoader";

/**
 * The 8 authenticated KoriePay portals, each with its own translated
 * loading message (see `loading.<key>` in every locale file).
 */
export type PortalLoadingContext =
  | "admin"
  | "agency"
  | "aggregator"
  | "compliance"
  | "customer"
  | "developer"
  | "merchant"
  | "support";

/**
 * One shared, full-screen KoriePay preloader for every portal's session
 * bootstrap (auth/session check, first profile fetch).
 *
 * Before this existed, the loading experience was inconsistent across the
 * app: Admin and Compliance each drew their own small pulsing-logo splash
 * (different markup, no brand motion), the Customer portal alone got the
 * rich glassmorphic brand loader (KpayFullScreenLoader + network motif),
 * and Agent, Merchant, Aggregator, Developer and Support showed nothing at
 * all — the shell chrome and placeholder data rendered instantly while the
 * real session check or first profile fetch was still in flight, which
 * reads as a broken or half-loaded product on a slow connection.
 *
 * `PortalPreloader` renders the exact same design language (brand mark,
 * indeterminate progress ring, cross-border network motif, glass stage)
 * everywhere, driven by the same `KpayFullScreenLoader` already used for
 * the customer bootstrap — so "loading the workspace" now looks and feels
 * identical no matter which portal a customer, agent, merchant, aggregator
 * operator, developer, support officer or admin signs into.
 */
export const PortalPreloader: React.FC<{ context: PortalLoadingContext }> = ({ context }) => {
  const { t } = useLanguage();
  return (
    <KpayFullScreenLoader
      open
      options={{
        kind: "bootstrap",
        message: t(`loading.${context}`),
        tagline: t("loading.tagline"),
      }}
      t={t}
    />
  );
};

export default PortalPreloader;
