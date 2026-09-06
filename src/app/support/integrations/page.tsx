"use client";

// =============================================================================
// File: src/app/support/integrations/page.tsx
// Description: Integrations (spec §12) — the banking & provider nodes that
// actually exist in this deployment (from the circuit-breaker registry via
// the health engine) plus the support channels the platform carries.
// No simulated connections, no fake status.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, MessageSquare, Phone, Radio } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { ErrorState, HealthDot, LoadingPanel, OfflineBanner, SectionCard, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

interface HealthItem {
  key: string;
  label: string;
  status: string;
  detail: string;
  checkedAt: string;
}

export default function IntegrationsPage() {
  const { t, activeOfficer, isOnline } = useSupportOps();
  const [health, setHealth] = useState<HealthItem[] | null>(null);
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
    setHealth(res.items);
    setLoading(false);
  }, [activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const banking = useMemo(() => health?.filter((h) => h.key === "banking_apis" || h.key === "transaction_engine") ?? [], [health]);
  const platform = useMemo(() => health?.filter((h) => h.key !== "banking_apis" && h.key !== "transaction_engine") ?? [], [health]);

  const channels = [
    { key: "IN_APP", icon: <MessageSquare className="h-4 w-4" /> },
    { key: "EMAIL", icon: <MessageSquare className="h-4 w-4" /> },
    { key: "WHATSAPP", icon: <MessageSquare className="h-4 w-4" /> },
    { key: "PHONE", icon: <Phone className="h-4 w-4" /> },
    { key: "AGENT_COUNTER", icon: <Building2 className="h-4 w-4" /> },
    { key: "API", icon: <Radio className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.integrations")}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{t("supportOps.integrations.source")}</p>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && !health && <LoadingPanel rows={5} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!loading && health && (
        <>
          <SectionCard title={t("supportOps.integrations.providers")}>
            <div className="space-y-2">
              {banking.length === 0 && <p className="py-4 text-center text-xs text-[var(--muted)]">{t("supportOps.common.noData")}</p>}
              {banking.map((h) => (
                <div key={h.key} className="flex items-start gap-3 rounded-[10px] bg-[var(--surface-2)] px-3 py-2.5">
                  <HealthDot status={h.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-[var(--foreground)]">{h.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">{h.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--muted)]">{t("supportOps.integrations.circuit")}: {h.status}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title={t("supportOps.nav.systemHealth")}>
              <div className="space-y-2">
                {platform.map((h) => (
                  <div key={h.key} className="flex items-center gap-2.5 rounded-[10px] bg-[var(--surface-2)] px-3 py-2">
                    <HealthDot status={h.status} />
                    <p className="flex-1 text-xs font-bold text-[var(--foreground)]">{h.label}</p>
                    <span className="text-[10px] text-[var(--muted)]">{relTime(h.checkedAt, t)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title={t("supportOps.integrations.channels")}>
              <div className="space-y-2">
                {channels.map((c) => (
                  <div key={c.key} className="flex items-center gap-2.5 rounded-[10px] bg-[var(--surface-2)] px-3 py-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-primary)]">{c.icon}</span>
                    <p className="flex-1 text-xs font-bold text-[var(--foreground)]">{t(`supportOps.channels.${c.key}`)}</p>
                    <span className="rounded-full bg-[var(--state-success-soft)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--state-success)]">
                      {t("supportOps.integrations.connected")}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
