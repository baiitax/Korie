"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill } from "@/components/regional/ui";
import { ShieldAlert, FileWarning } from "lucide-react";

interface RiskAlert {
  id: string;
  alert_type: string;
  severity: string;
  entity_type: string | null;
  agent_id: string | null;
  merchant_id: string | null;
  details: any;
  recommended_action: string | null;
  status: string;
  detected_at: string;
  aggregator?: { code: string; name: string };
}
interface ExceptionRow {
  id: string;
  reference: string | null;
  category: string;
  severity: string;
  affected_entity: string | null;
  current_state: string | null;
  description: string | null;
  recommended_action: string | null;
  detected_at: string;
  resolved_at: string | null;
}

function severityPill(sev: string) {
  const s = (sev || "").toUpperCase();
  if (["CRITICAL", "HIGH"].includes(s)) return <Pill kind="bad">{sev}</Pill>;
  if (s === "MEDIUM") return <Pill kind="warn">{sev}</Pill>;
  return <Pill kind="muted">{sev}</Pill>;
}

export default function RegionalRiskPage() {
  const { t, formatDate, manager, managerError } = useRegional();
  const [alerts, setAlerts] = useState<RiskAlert[] | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/risk");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "RISK_FAILED");
        else if (!cancelled) {
          setAlerts(json.data.alerts);
          setExceptions(json.data.exceptions);
        }
      } catch {
        setError("REGIONAL_SESSION_UNAVAILABLE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manager]);

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  const openAlerts = (alerts ?? []).filter((a) => a.status === "OPEN");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("risk.title")} subtitle={t("risk.subtitle")} />
      <p className="-mt-3 text-[11px] text-[var(--foreground-muted)]">{t("risk.viewInvestigate")} · <Link href="/regional/support" className="text-[var(--brand-primary)] hover:underline">{t("support.newEscalation")} →</Link></p>

      {error && <ErrorNote message={error} />}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("risk.alerts")} · {openAlerts.length}</h2>
        {alerts === null && !error ? (
          <LoadingRows rows={3} />
        ) : openAlerts.length === 0 ? (
          <EmptyState icon={ShieldAlert} title={t("risk.emptyAlerts")} />
        ) : (
          <div className="space-y-3">
            {openAlerts.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">{a.alert_type}</span>
                      {severityPill(a.severity)}
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)] mt-1">
                      {a.aggregator ? `${a.aggregator.code} · ${a.aggregator.name}` : ""} {a.entity_type ? `· ${a.entity_type}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)]">{formatDate(a.detected_at)}</div>
                </div>
                {a.details && typeof a.details === "object" && Object.keys(a.details).length > 0 && (
                  <pre className="mt-3 p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[11px] font-mono overflow-x-auto">{JSON.stringify(a.details, null, 2)}</pre>
                )}
                {a.recommended_action && (
                  <div className="mt-2 text-xs text-[var(--foreground-muted)]"><span className="font-semibold">{t("risk.col.action")}:</span> {a.recommended_action}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("risk.exceptions")} · {exceptions?.filter((e) => !e.resolved_at).length ?? 0}</h2>
        {exceptions === null && !error ? (
          <LoadingRows rows={3} />
        ) : exceptions && exceptions.length === 0 ? (
          <EmptyState icon={FileWarning} title={t("risk.emptyExceptions")} />
        ) : (
          <div className="space-y-3">
            {(exceptions ?? []).map((e) => (
              <div key={e.id} className={`p-4 rounded-2xl bg-[var(--surface)] border ${e.resolved_at ? "border-[var(--border)] opacity-70" : "border-amber-500/30"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">{e.category}</span>
                      {severityPill(e.severity)}
                      {e.reference && <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{e.reference}</span>}
                    </div>
                    {e.description && <div className="text-xs text-[var(--foreground-muted)] mt-1">{e.description}</div>}
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)] whitespace-nowrap">
                    {formatDate(e.detected_at)}
                    {e.resolved_at && <div className="text-[var(--brand-primary)]">{formatDate(e.resolved_at)}</div>}
                  </div>
                </div>
                {e.recommended_action && (
                  <div className="mt-2 text-xs text-[var(--foreground-muted)]"><span className="font-semibold">{t("risk.col.action")}:</span> {e.recommended_action}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
