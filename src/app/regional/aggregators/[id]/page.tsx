"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, LoadingRows, ErrorNote, Pill, KeyValue, EmptyState, statusPillKind } from "@/components/regional/ui";

interface Agg360 {
  identity: { id: string; code: string; name: string; legalEntity: string | null; rcNumber: string | null; status: string; kyb: string; tier: string; country: string; currency: string | null; regions: { name: string; state: string; code: string }[]; assignedManager: string; contact: { email: string | null; phone: string | null }; settlementBank: string | null; registeredAt: string };
  network: { agentsTotal: number; agentsActive: number; agentsDormant: number; agentsNew30d: number; agentList: { id: string; code: string; name: string; state: string; status: string; activity: string }[] };
  financial: { byType: Record<string, Record<string, { count: number; volume: number }>>, byStatus30: Record<string, number>, commissions: Record<string, { earned: number; settled: number; count: number }> };
  liquidity: { accounts: { kind: string; name: string; currency: string | null; balance: number | null; locked: number | null }[]; agentFloatByCurrency: Record<string, number> };
  risk: { alerts: any[]; openAlerts: number };
  support: { tickets: any[]; open: number };
  timeline: { at: string; action: string; actor: string; detail?: string }[];
}

export default function Aggregator360Page() {
  const params = useParams<{ id: string }>();
  const { t, formatCurrency, formatDate, manager, managerError } = useRegional();
  const [data, setData] = useState<Agg360 | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager || !params.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch(`/api/regional/aggregators/${params.id}`);
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "AGGREGATOR_FAILED");
        else if (!cancelled) setData(json.data);
      } catch {
        setError("REGIONAL_SESSION_UNAVAILABLE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manager, params.id]);

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {error && <ErrorNote message={error} />}
      {!data && !error ? (
        <LoadingRows rows={6} />
      ) : data ? (
        <>
          <PageHeader title={data.identity.name} subtitle={`${data.identity.code} · ${t("aggregators.detail")}`}>
            <Pill kind={statusPillKind(data.identity.status)}>{data.identity.status}</Pill>
            <Pill kind="muted">KYB {data.identity.kyb}</Pill>
          </PageHeader>

          {/* Identity */}
          <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-sm font-bold mb-3">{t("aggregators.identity")}</h2>
            <KeyValue
              rows={[
                [t("settings.country"), data.identity.country],
                [t("aggregators.col.regions"), data.identity.regions.map((r) => r.state).join(", ")],
                [t("session.managerFor"), data.identity.assignedManager],
                ["KYC tier", data.identity.tier],
                [t("customers.verification"), data.identity.kyb],
                [t("settings.territory") + " (bank)", data.identity.settlementBank ?? "—"],
                [t("kyc.col.uploaded"), formatDate(data.identity.registeredAt)],
                ["RC", data.identity.rcNumber ?? "—"],
                [t("support.col.ticket"), data.identity.contact.email ?? "—"],
              ]}
            />
          </section>

          {/* Network */}
          <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-sm font-bold mb-3">{t("aggregators.network")}</h2>
            <KeyValue
              rows={[
                [t("aggregators.agentsTotal"), String(data.network.agentsTotal)],
                [t("aggregators.agentsActive"), String(data.network.agentsActive)],
                [t("aggregators.agentsDormant"), String(data.network.agentsDormant)],
                [t("aggregators.agentsNew"), String(data.network.agentsNew30d)],
              ]}
            />
            {data.network.agentList.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.network.agentList.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-[11px]">
                    <span className="font-mono text-[var(--foreground-muted)]">{a.code}</span> {a.name}
                    <Pill kind={a.status === "ACTIVE" ? "ok" : "muted"}>{a.status}</Pill>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Financial */}
          <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-sm font-bold mb-3">{t("aggregators.financial")}</h2>
            {Object.keys(data.financial.byType).length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">{t("transactions.empty_transactions")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase text-[var(--foreground-muted)]">
                      <th className="py-2 font-semibold">{t("transactions.col.type")}</th>
                      <th className="py-2 font-semibold text-right">{t("performance.count")}</th>
                      <th className="py-2 font-semibold text-right">{t("performance.volume")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.financial.byType).map(([type, byCur]) =>
                      Object.entries(byCur).map(([cur, v]) => (
                        <tr key={type + cur} className="border-t border-[var(--border)]">
                          <td className="py-2">{type} <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{cur}</span></td>
                          <td className="py-2 text-right font-mono">{v.count}</td>
                          <td className="py-2 text-right font-mono">{formatCurrency(v.volume, cur)}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {Object.keys(data.financial.commissions).length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                {Object.entries(data.financial.commissions).map(([cur, c]) => (
                  <div key={cur} className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                    <div className="font-mono font-bold text-[10px] text-[var(--foreground-muted)] mb-1">{cur}</div>
                    <div className="flex justify-between"><span>{t("aggregators.commissionsEarned")}</span><b>{formatCurrency(c.earned, cur)}</b></div>
                    <div className="flex justify-between"><span>{t("aggregators.commissionsSettled")}</span><b>{formatCurrency(c.settled, cur)}</b></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Liquidity */}
          <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-sm font-bold mb-3">{t("aggregators.liquidity")}</h2>
            {data.liquidity.accounts.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)] mb-3">{t("common.none")}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                {data.liquidity.accounts.map((a) => (
                  <div key={a.kind} className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono font-bold text-[var(--foreground-muted)]">{a.kind}</div>
                    <div className="text-sm font-bold font-mono">{a.balance !== null ? formatCurrency(a.balance, a.currency ?? "NGN") : "—"}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)]">{t("aggregators.reserved")}: {a.locked !== null ? formatCurrency(a.locked, a.currency ?? "NGN") : "—"}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.liquidity.agentFloatByCurrency).map(([cur, v]) => (
                <span key={cur} className="px-3 py-1.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono">
                  {t("aggregators.agentFloat")} · {cur}: <b>{formatCurrency(v, cur)}</b>
                </span>
              ))}
            </div>
          </section>

          {/* Risk + support */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h2 className="text-sm font-bold mb-3">{t("aggregators.risk")} · {data.risk.openAlerts}</h2>
              {data.risk.alerts.length === 0 ? (
                <div className="text-xs text-[var(--foreground-muted)]">{t("risk.emptyAlerts")}</div>
              ) : (
                <div className="space-y-2">
                  {data.risk.alerts.slice(0, 6).map((a) => (
                    <div key={a.id} className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <b>{a.alert_type}</b>
                        <Pill kind={String(a.severity).match(/CRITICAL|HIGH/i) ? "bad" : "warn"}>{a.severity}</Pill>
                      </div>
                      <div className="text-[var(--foreground-muted)] mt-1">{formatDate(a.detected_at)} · {a.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h2 className="text-sm font-bold mb-3">{t("aggregators.support")} · {data.support.open}</h2>
              {data.support.tickets.length === 0 ? (
                <div className="text-xs text-[var(--foreground-muted)]">{t("support.emptyInbox")}</div>
              ) : (
                <div className="space-y-2">
                  {data.support.tickets.slice(0, 6).map((tk) => (
                    <div key={tk.id} className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <b className="font-mono">{tk.ticket_number}</b>
                        <Pill kind={statusPillKind(tk.status)}>{tk.status}</Pill>
                      </div>
                      <div className="mt-1">{tk.subject}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Timeline */}
          <section className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <h2 className="text-sm font-bold mb-3">{t("aggregators.timeline")}</h2>
            {data.timeline.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">{t("aggregators.noTimeline")}</div>
            ) : (
              <ol className="relative border-l border-[var(--border)] ml-2 space-y-4">
                {data.timeline.map((e, i) => (
                  <li key={i} className="pl-4 relative">
                    <div className="absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]" />
                    <div className="text-xs font-bold">{e.action}</div>
                    <div className="text-[11px] text-[var(--foreground-muted)]">
                      {formatDate(e.at)} · {e.actor}
                      {e.detail ? ` — ${e.detail}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
