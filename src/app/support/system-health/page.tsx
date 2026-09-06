"use client";

// =============================================================================
// File: src/app/support/system-health/page.tsx
// Description: System Health (spec §15/§16) — deep health derived from
// HealthCheckEngine.getDeepHealth(): ledger integrity, circuit breakers →
// real banking nodes (Providus Bank NG, Coris Bank NE), KYC queue, treasury
// liquidity, safe mode. Nothing here is simulated.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { ErrorState, HealthDot, LoadingPanel, OfflineBanner, SectionCard, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

export default function SystemHealthPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [items, setItems] = useState<{ key: string; label: string; status: string; detail: string; checkedAt: string }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.health(activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setItems(res.items);
    setLoading(false);
  }, [activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const issues = items?.filter((i) => i.status !== "OPERATIONAL").length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.systemHealth.title")}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">
            {items && !loading
              ? issues > 0
                ? t("supportOps.systemHealth.issues")
                : t("supportOps.systemHealth.allOperational")
              : ""}
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={!isOnline || loading}
          className="flex items-center gap-1.5 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-extrabold text-[var(--brand-primary)] hover:bg-[var(--surface-3)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> {t("supportOps.common.retry")}
        </button>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && !items && <LoadingPanel rows={7} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && items && (
        <div className="space-y-3">
          {items.map((item) => (
            <SectionCard key={item.key} tone={item.status === "DOWN" ? "danger" : item.status === "DEGRADED" ? "warning" : undefined}>
              <div className="flex items-start gap-3">
                <HealthDot status={item.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[13px] font-extrabold text-[var(--foreground)]">{item.label}</h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        item.status === "OPERATIONAL"
                          ? "bg-[var(--state-success-soft)] text-[var(--state-success)]"
                          : item.status === "DEGRADED"
                            ? "bg-[var(--state-warning-soft)] text-[var(--state-warning)]"
                            : "bg-[var(--state-danger-soft)] text-[var(--state-danger)]"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-muted)]">{item.detail}</p>
                  <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                    {t("supportOps.systemHealth.lastChecked", { time: relTime(item.checkedAt, t) })}
                  </p>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
