"use client";

// =============================================================================
// File: src/app/support/audit/page.tsx
// Description: Audit Trail (spec §52/§90) — immutable support audit log.
// view_audit capability enforced server-side (supervisor+).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { ErrorState, LoadingPanel, OfflineBanner, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

interface AuditRow {
  id: string;
  timestamp: string;
  officerId: string;
  officerName: string;
  officerRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  jurisdiction: string;
}

const PAGE = 50;

export default function AuditPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.audit({ limit: String(limit) });
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setTotal(res.total);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.audit.title")}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{loading || !rows ? "" : `${total}`}</p>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && <LoadingPanel rows={8} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && (
        <p className="py-8 text-center text-xs text-[var(--muted)]">{t("supportOps.audit.none")}</p>
      )}
      {!loading && !error && rows && rows.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
            {rows.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-[var(--card-border)] px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--foreground-muted)]">{a.action}</span>
                    <span className="text-[10px] font-bold text-[var(--muted)]">
                      {a.entityType} · {a.entityId} · {t(`supportOps.jurisdictions.${a.jurisdiction}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--foreground)]">{a.details}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-extrabold text-[var(--foreground)]">{a.officerName}</p>
                  <p className="text-[10px] text-[var(--muted)]">{t(`supportOps.roles.${a.officerRole}`)}</p>
                  <p className="mt-0.5 text-[10px] tabular-nums text-[var(--muted)]">{relTime(a.timestamp, t)}</p>
                </div>
              </div>
            ))}
          </div>
          {total > limit && (
            <button
              onClick={() => setLimit((l) => l + PAGE)}
              className="mx-auto block rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-extrabold text-[var(--brand-primary)] hover:bg-[var(--surface-3)]"
            >
              {t("supportOps.common.loading").replace("…", "")} +{PAGE}
            </button>
          )}
        </>
      )}
    </div>
  );
}
