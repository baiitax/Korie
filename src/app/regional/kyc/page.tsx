"use client";

import React, { useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill } from "@/components/regional/ui";
import { FileCheck2, Lock } from "lucide-react";

interface KycData {
  agentKycStatus: Record<string, number>;
  agentKycDocs: { pending: number; list: { agentCode: string; agentName: string; documentType: string; status: string; uploadedAt: string }[] };
  customerVerification: Record<string, number>;
  aggregatorKyb: Record<string, number>;
  readOnly: boolean;
  note: string;
}

export default function RegionalKycPage() {
  const { t, formatDate, manager, managerError } = useRegional();
  const [data, setData] = useState<KycData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/kyc");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "KYC_FAILED");
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

  const Buckets = ({ title, buckets }: { title: string; buckets: Record<string, number> }) => (
    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
      <h2 className="text-sm font-bold mb-3">{title}</h2>
      <div className="space-y-1.5 text-xs">
        {Object.keys(buckets).length === 0 ? <div className="text-[var(--foreground-muted)]">{t("common.none")}</div> : Object.entries(buckets).map(([k, v]) => (
          <div key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("kyc.title")} subtitle={t("kyc.subtitle")} />
      <p className="-mt-3 text-[11px] text-[var(--foreground-muted)] flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />{t("kyc.readOnlyNote")}</p>

      {error && <ErrorNote message={error} />}
      {!data && !error ? (
        <LoadingRows />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Buckets title={t("kyc.agentStatus")} buckets={data.agentKycStatus} />
            <Buckets title={t("kyc.aggKyb")} buckets={data.aggregatorKyb} />
            <Buckets title={t("kyc.customerVer")} buckets={data.customerVerification} />
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h2 className="text-sm font-bold mb-3">{t("kyc.pendingDocs")}</h2>
              <div className="text-3xl font-bold text-amber-500">{data.agentKycDocs.pending}</div>
              <Pill kind="muted">{t("kyc.readOnly")}</Pill>
            </div>
          </div>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)] mb-3">{t("kyc.pendingDocs")}</h2>
            {data.agentKycDocs.list.length === 0 ? (
              <EmptyState icon={FileCheck2} title={t("kyc.empty")} />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-[var(--surface)] text-left text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                      <th className="px-4 py-3 font-semibold">{t("kyc.col.agent")}</th>
                      <th className="px-4 py-3 font-semibold">{t("kyc.col.doc")}</th>
                      <th className="px-4 py-3 font-semibold">{t("kyc.col.status")}</th>
                      <th className="px-4 py-3 font-semibold">{t("kyc.col.uploaded")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agentKycDocs.list.map((d, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{d.agentName}</div>
                          <div className="text-[11px] font-mono text-[var(--foreground-muted)]">{d.agentCode}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">{d.documentType}</td>
                        <td className="px-4 py-3"><Pill kind="warn">{d.status}</Pill></td>
                        <td className="px-4 py-3 text-xs text-[var(--foreground-muted)] whitespace-nowrap">{formatDate(d.uploadedAt)}</td>
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
