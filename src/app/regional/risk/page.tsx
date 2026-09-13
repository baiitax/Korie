"use client";

import React, { useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
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
  if (["CRITICAL", "HIGH"].includes(s)) return "bg-rose-500/10 text-rose-500 border-rose-500/30";
  if (s === "MEDIUM") return "bg-amber-500/10 text-amber-500 border-amber-500/30";
  return "bg-slate-500/10 text-slate-400 border-slate-500/30";
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

  if (managerError) {
    return (
      <div className="p-6 sm:p-8">
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--muted)]">{t("session.error")}</div>
      </div>
    );
  }

  const openAlerts = (alerts ?? []).filter((a) => a.status === "OPEN");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{t("risk.title")}</h1>
        <p className="text-sm text-[var(--muted)] mt-1 max-w-2xl">{t("risk.subtitle")}</p>
      </div>

      {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-500">{error}</div>}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
          {t("risk.alerts")} · {openAlerts.length}
        </h2>
        {alerts === null ? (
          <div className="h-20 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
        ) : openAlerts.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
            <ShieldAlert className="w-8 h-8 mx-auto text-[var(--muted)] mb-3" />
            <div className="text-sm font-semibold">{t("risk.emptyAlerts")}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {openAlerts.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">{a.alert_type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityPill(a.severity)}`}>{a.severity}</span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {a.aggregator ? `${a.aggregator.code} · ${a.aggregator.name}` : ""} {a.entity_type ? `· ${a.entity_type}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--muted)]">{formatDate(a.detected_at)}</div>
                </div>
                {a.details && typeof a.details === "object" && Object.keys(a.details).length > 0 && (
                  <pre className="mt-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(a.details, null, 2)}
                  </pre>
                )}
                {a.recommended_action && (
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    <span className="font-semibold">{t("risk.col.action")}:</span> {a.recommended_action}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
          {t("risk.exceptions")} · {exceptions?.filter((e) => !e.resolved_at).length ?? 0}
        </h2>
        {exceptions === null ? (
          <div className="h-20 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse" />
        ) : exceptions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
            <FileWarning className="w-8 h-8 mx-auto text-[var(--muted)] mb-3" />
            <div className="text-sm font-semibold">{t("risk.emptyExceptions")}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.map((e) => (
              <div key={e.id} className={`p-4 rounded-2xl bg-[var(--surface)] border ${e.resolved_at ? "border-[var(--border)] opacity-70" : "border-amber-500/30"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">{e.category}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityPill(e.severity)}`}>{e.severity}</span>
                      {e.reference && <span className="text-[10px] font-mono text-[var(--muted)]">{e.reference}</span>}
                    </div>
                    {e.description && <div className="text-xs text-[var(--muted)] mt-1">{e.description}</div>}
                    {e.affected_entity && <div className="text-[11px] text-[var(--muted)] mt-0.5">{e.affected_entity} · {e.current_state}</div>}
                  </div>
                  <div className="text-xs text-[var(--muted)] whitespace-nowrap">
                    {formatDate(e.detected_at)}
                    {e.resolved_at && <div className="text-teal-500">{e.resolved_at ? formatDate(e.resolved_at) : ""}</div>}
                  </div>
                </div>
                {e.recommended_action && (
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    <span className="font-semibold">{t("risk.col.action")}:</span> {e.recommended_action}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
