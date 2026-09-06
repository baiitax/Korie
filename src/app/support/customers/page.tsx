"use client";

// =============================================================================
// File: src/app/support/customers/page.tsx
// Description: Customers — search & browse (spec §56). Server-side search;
// results carry masked PII only.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, RiskBadge } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

interface CustomerRow {
  id: string;
  name: string;
  country: string;
  status: string;
  kycTier: string;
  riskLevel: string;
  source: string;
  openTickets: number;
}

export default function CustomersPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.searchCustomers(q, activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, [q, activeOfficer?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isOnline) void load();
    }, q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [isOnline, load, q]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.customers")}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{t("supportOps.customers.searchPlaceholder")}</p>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("supportOps.customers.searchPlaceholder")}
          aria-label={t("supportOps.customers.searchPlaceholder")}
          className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand-border)]"
        />
      </div>

      {loading && <LoadingPanel rows={6} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && (
        <EmptyState title={t("supportOps.customers.noResults")} hint={t("supportOps.customers.noResultsHint")} />
      )}
      {!loading && !error && rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
          {rows.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/support/customers/${c.id}`)}
              className="flex w-full items-center gap-3 border-b border-[var(--card-border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-2)]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-soft-strong)] text-xs font-extrabold text-[var(--brand-primary)]">
                {c.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-extrabold text-[var(--foreground)]">{c.name}</p>
                <p className="truncate text-[11px] text-[var(--muted)]">
                  {c.id} · {t(`supportOps.jurisdictions.${c.country}`)} · {t(`supportOps.customers.kyc`)}: {c.kycTier}
                </p>
              </div>
              <RiskBadge level={c.riskLevel} t={t} />
              {c.openTickets > 0 && (
                <span className="rounded-full bg-[var(--state-info-soft)] px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-[var(--state-info)]">
                  {c.openTickets}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
