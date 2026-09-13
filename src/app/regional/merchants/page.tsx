"use client";

import React, { useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, StatCard, Pill, statusPillKind } from "@/components/regional/ui";
import { Store } from "lucide-react";

interface MerchantsData {
  territoryMerchants: number;
  merchants: { id: string; code: string; businessName: string; tradingName: string | null; country: string; currency: string | null; category: string; tier: string; status: string; kyb: string; aggregator: string | null; registeredAt: string }[];
  aggregatorDistribution: { aggregator: string; count: number }[];
  countryKpis: { total: number; active: number; pending: number; verified: number; restricted: number; byCategory: Record<string, number> };
  note: string;
}

export default function RegionalMerchantsPage() {
  const { t, formatDate, manager, managerError } = useRegional();
  const [data, setData] = useState<MerchantsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/merchants");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "MERCHANTS_FAILED");
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
      <PageHeader title={t("merchants.title")} subtitle={t("merchants.subtitle")} />

      {error && <ErrorNote message={error} />}
      {!data && !error ? (
        <LoadingRows />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard icon={Store} label={t("merchants.territory")} value={String(data.territoryMerchants)} />
            <StatCard label={t("merchants.country")} value={String(data.countryKpis.total)} hint={t("merchants.pending") + ": " + data.countryKpis.pending} />
            <StatCard label={t("merchants.active")} value={String(data.countryKpis.active)} tone="good" />
            <StatCard label={t("merchants.verified")} value={String(data.countryKpis.verified)} />
            <StatCard label={t("merchants.restricted")} value={String(data.countryKpis.restricted)} tone={data.countryKpis.restricted > 0 ? "bad" : "default"} />
          </div>
          <p className="text-[11px] text-[var(--foreground-muted)]">{data.note}</p>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h2 className="text-sm font-bold mb-3">{t("merchants.distribution")}</h2>
              {data.aggregatorDistribution.length === 0 ? (
                <div className="text-xs text-[var(--foreground-muted)]">{t("merchants.empty")}</div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {data.aggregatorDistribution.map((d, i) => (
                    <div key={i} className="flex justify-between gap-2"><span className="truncate">{d.aggregator}</span><b>{d.count}</b></div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h2 className="text-sm font-bold mb-3">{t("merchants.byCategory")}</h2>
              <div className="space-y-1.5 text-xs">
                {Object.keys(data.countryKpis.byCategory).length === 0 ? <div className="text-[var(--foreground-muted)]">{t("common.none")}</div> : Object.entries(data.countryKpis.byCategory).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></div>
                ))}
              </div>
            </div>
          </section>

          <section>
            {data.merchants.length === 0 ? (
              <EmptyState icon={Store} title={t("merchants.empty")} />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                      <th className="px-4 py-3 font-semibold">{t("merchants.title")}</th>
                      <th className="px-4 py-3 font-semibold">{t("merchants.byCategory")}</th>
                      <th className="px-4 py-3 font-semibold">{t("aggregators.col.aggregator")}</th>
                      <th className="px-4 py-3 font-semibold">KYB</th>
                      <th className="px-4 py-3 font-semibold">{t("common.status")}</th>
                      <th className="px-4 py-3 font-semibold">{t("kyc.col.uploaded")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.merchants.map((m) => (
                      <tr key={m.id} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{m.businessName}</div>
                          <div className="text-[11px] font-mono text-[var(--foreground-muted)]">{m.code} · {m.currency}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">{m.category}</td>
                        <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] max-w-[220px] truncate">{m.aggregator || "—"}</td>
                        <td className="px-4 py-3"><Pill kind={m.kyb === "VERIFIED" ? "ok" : "warn"}>{m.kyb}</Pill></td>
                        <td className="px-4 py-3"><Pill kind={statusPillKind(m.status)}>{m.status}</Pill></td>
                        <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] whitespace-nowrap">{formatDate(m.registeredAt)}</td>
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
