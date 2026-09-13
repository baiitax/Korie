"use client";

import React, { useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, StatCard, Pill } from "@/components/regional/ui";
import { UserCircle, ShieldCheck } from "lucide-react";

interface CustomersData {
  country: string;
  kpis: { total: number; new30d: number; active: number; restricted: number; byTier: Record<string, number>; byStatus: Record<string, number> };
  verification: Record<string, number>;
  agencyServed30d: number;
  agencyAcquisitionByAgent: { agentCode: string; agentName: string; state: string; customers: number }[];
  agencyCustomers: { name: string; phone: string; agent: string; kycTier: string | null; verified: boolean | null; txCount: number | null; lastActivity: string | null }[];
}

export default function RegionalCustomersPage() {
  const { t, formatDate, manager, managerError } = useRegional();
  const [data, setData] = useState<CustomersData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/customers");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "CUSTOMERS_FAILED");
        else if (!cancelled) setData(json.data);
      } catch {
        setError("REGIONAL_SESSION_UNAVAILABLE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manager]);

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("customers.title")} subtitle={t("customers.subtitle")} />
      <p className="-mt-3 text-[11px] text-[var(--foreground-muted)] flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />{t("customers.piiNote")}</p>

      {error && <ErrorNote message={error} />}
      {!data && !error ? (
        <LoadingRows />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard icon={UserCircle} label={t("customers.total")} value={String(data.kpis.total)} />
            <StatCard label={t("customers.new30d")} value={String(data.kpis.new30d)} tone="good" />
            <StatCard label={t("customers.active")} value={String(data.kpis.active)} />
            <StatCard label={t("customers.restricted")} value={String(data.kpis.restricted)} tone={data.kpis.restricted > 0 ? "bad" : "default"} />
            <StatCard label={t("customers.agencyServed")} value={String(data.agencyServed30d)} tone="good" />
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h2 className="text-sm font-bold mb-3">{t("customers.byTier")}</h2>
              <div className="space-y-1.5 text-xs">
                {Object.keys(data.kpis.byTier).length === 0 ? <div className="text-[var(--foreground-muted)]">{t("common.none")}</div> : Object.entries(data.kpis.byTier).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h2 className="text-sm font-bold mb-3">{t("customers.verification")}</h2>
              <div className="space-y-1.5 text-xs">
                {Object.keys(data.verification).length === 0 ? <div className="text-[var(--foreground-muted)]">{t("common.none")}</div> : Object.entries(data.verification).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h2 className="text-sm font-bold mb-3">{t("customers.acquisition")}</h2>
              {data.agencyAcquisitionByAgent.length === 0 ? (
                <div className="text-xs text-[var(--foreground-muted)]">{t("common.none")}</div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {data.agencyAcquisitionByAgent.map((a) => (
                    <div key={a.agentCode} className="flex justify-between"><span className="truncate">{a.agentCode} · {a.agentName}</span><b>{a.customers}</b></div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("customers.walkIn")}</h2>
            {data.agencyCustomers.length === 0 ? (
              <EmptyState icon={UserCircle} title={t("customers.noWalkIn")} />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                      <th className="px-4 py-3 font-semibold">{t("transactions.col.customer")}</th>
                      <th className="px-4 py-3 font-semibold">{t("agents.col.agent")}</th>
                      <th className="px-4 py-3 font-semibold">KYC</th>
                      <th className="px-4 py-3 font-semibold text-right">{t("dashboard.txns")}</th>
                      <th className="px-4 py-3 font-semibold">{t("commissions.lastEarned")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agencyCustomers.map((c, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3 text-xs">{c.name} · <span className="text-[var(--foreground-muted)] font-mono">{c.phone}</span></td>
                        <td className="px-4 py-3 text-xs font-mono">{c.agent}</td>
                        <td className="px-4 py-3 text-xs">{c.kycTier ?? "—"} {c.verified !== null && <Pill kind={c.verified ? "ok" : "warn"}>{c.verified ? "✓" : "…"}</Pill>}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{c.txCount ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-[var(--foreground-muted)]">{formatDate(c.lastActivity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
