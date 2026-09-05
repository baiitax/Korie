"use client";

import React from "react";
import { useCustomer } from "../CustomerContext";
import { DataErrorState } from "./CustomerStateViews";
import { KpayPageLoader } from "@/components/loading";
import { RefreshCw } from "lucide-react";

/**
 * Wraps screens that cannot render without a resolved customer profile.
 *
 * Why: the portal previously seeded a fabricated `CURRENT_CUSTOMER` (name,
 * email, tier) into context, so every page rendered instantly — including when
 * the backend was down. That made an outage look like a healthy account, which
 * is the exact defect class this rebuild targets. `customer` is now `null`
 * until the authoritative read succeeds, and every identity-dependent screen
 * must pass through this gate so the three states stay distinguishable.
 */
export const CustomerProfileGate: React.FC<{
  children: React.ReactNode;
  /** Shown as the accessible label for the in-flight state. */
  labelKey?: string;
}> = ({ children, labelKey = "common.loading" }) => {
  const { customer, portalPhase, portalError, refreshPortal, t } = useCustomer();

  if (customer) return <>{children}</>;

  if (portalPhase === "error" && portalError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <DataErrorState
          error={portalError}
          onRetry={() => void refreshPortal()}
          retryLabel={t("common.tryAgain")}
          surface="generic"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4" aria-busy="true">
      <span className="sr-only">{t(labelKey)}</span>
      <KpayPageLoader message={t(labelKey)} />
      <div className="sr-only" aria-hidden="false">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--foreground-muted)]" />
      </div>
    </div>
  );
};

export default CustomerProfileGate;
