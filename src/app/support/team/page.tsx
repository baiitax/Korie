"use client";
// Team — the officer roster (real data from the store).
import React, { useCallback, useEffect, useState } from "react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { ErrorState, LoadingPanel, OfflineBanner, ToneBadge, initials } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, SupportOfficerDto } from "@/services/supportOpsClient";

export default function TeamPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [rows, setRows] = useState<SupportOfficerDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.officers(activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, [activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.team")}</h1>
      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && <LoadingPanel rows={6} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && rows && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((o) => (
            <div key={o.id} className="rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 backdrop-blur-[var(--glass-blur-01)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-primary)] text-xs font-extrabold text-[var(--brand-on-primary)]">
                  {initials(o.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold text-[var(--foreground)]">{o.fullName}</p>
                  <p className="text-[11px] text-[var(--muted)]">{t(`supportOps.roles.${o.role}`)}</p>
                </div>
                <ToneBadge tone={o.active ? "success" : "neutral"}>{o.active ? t("supportOps.common.active") : t("supportOps.common.disabled")}</ToneBadge>
              </div>
              <p className="mt-2 text-[11px] text-[var(--muted)]">
                {o.languages.join(" · ")} · {o.jurisdictions.map((j) => t(`supportOps.jurisdictions.${j}`)).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
