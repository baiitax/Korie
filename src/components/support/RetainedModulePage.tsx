"use client";

// =============================================================================
// File: src/components/support/RetainedModulePage.tsx
// Description: Read-mostly retained operational modules (playbooks,
// incidents, automation, QA, training, capacity) rebuilt on the new data
// path — one store, one client, one visual language. Rendered as a
// generic table so each legacy module keeps working with zero mock
// hydration in React.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { ErrorState, LoadingPanel, OfflineBanner, SectionCard, ToneBadge } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

interface Column {
  key: string;
  labelKey: string; // i18n key or literal
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

type ModuleKey = "playbooks" | "incidents" | "automationRules" | "qaReviews" | "training" | "capacity";

export function RetainedModulePage({
  module,
  titleKey,
  columns,
}: {
  module: ModuleKey;
  titleKey: string;
  columns: Column[];
}) {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.retainedModules();
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    const data = res[module];
    if (Array.isArray(data)) setRows(data as Record<string, unknown>[]);
    else setRows(data ? [data as Record<string, unknown>] : []);
    setLoading(false);
  }, [module]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const label = (c: Column) => (c.labelKey.startsWith("supportOps.") ? t(c.labelKey) : c.labelKey);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">{t(titleKey)}</h1>
      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && <LoadingPanel rows={5} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && rows && rows.length === 0 && (
        <SectionCard>
          <p className="py-6 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>
        </SectionCard>
      )}
      {!loading && rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
          {rows.map((row, i) => (
            <div key={(row.id as string) ?? i} className="border-b border-[var(--card-border)] px-4 py-3 last:border-b-0">
              {columns.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {columns.map((c) => (
                    <div key={c.key}>
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">{label(c)}</p>
                      <div className="mt-0.5 text-xs font-bold text-[var(--foreground)]">
                        {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "—")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-[11px] text-[var(--foreground-muted)]">
                  {JSON.stringify(row, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusTone({ value }: { value: unknown }) {
  const v = String(value ?? "").toUpperCase();
  const tone =
    v === "ACTIVE" || v === "PUBLISHED" || v === "PASSED" || v === "RESOLVED" || v === "OPERATIONAL"
      ? "success"
      : v === "OVERDUE" || v === "FAILED" || v === "CRITICAL"
        ? "danger"
        : v === "DRAFT" || v === "PENDING" || v === "IN_PROGRESS"
          ? "warning"
          : "neutral";
  return <ToneBadge tone={tone}>{String(value ?? "—")}</ToneBadge>;
}
