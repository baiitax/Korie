"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  Download,
  FileSpreadsheet,
} from "lucide-react";

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "No data available for this period.\n";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n") + "\n";
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AggregatorReportsPage() {
  const { aggregator, agents, merchants, territories, transactions, commissions, settlements, complianceRecords, auditLog, formatDate } = useAggregator();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reports = [
    {
      id: "network-transactions",
      title: "Network Transaction Export",
      description: "Every transaction currently loaded for your network: reference, entity, type, amount, status.",
      count: transactions.length,
      build: () =>
        toCsv(
          transactions.map((tx) => ({
            reference: tx.reference,
            correlationId: tx.correlationId,
            entity: tx.agentName || tx.merchantName || "",
            territory: tx.territoryName,
            type: tx.type,
            channel: tx.channel,
            amount: tx.amount,
            currency: aggregator.currency,
            status: tx.status,
            createdAt: (tx as any).createdAt || "",
          })),
        ),
    },
    {
      id: "agent-directory",
      title: "Agent Network Directory Export",
      description: "Every agent in your network with wallet float, cash-in-drawer, and today's volume.",
      count: agents.length,
      build: () =>
        toCsv(
          agents.map((a) => ({
            agentCode: a.agentCode,
            fullName: a.fullName,
            businessName: a.businessName,
            territory: a.territoryName,
            lga: a.lga,
            status: a.status,
            walletBalance: a.walletBalance,
            cashInDrawer: a.cashInDrawer,
            todayVolume: a.todayVolume,
          })),
        ),
    },
    {
      id: "merchant-directory",
      title: "Merchant Network Directory Export",
      description: "Every merchant in your network with settlement status and volume.",
      count: merchants.length,
      build: () =>
        toCsv(
          merchants.map((m: any) => ({
            merchantCode: m.merchantCode,
            businessName: m.businessName,
            territory: m.territoryName,
            status: m.status,
            todayVolume: m.todayVolume,
          })),
        ),
    },
    {
      id: "territory-performance",
      title: "Territory Performance Export",
      description: "Per-territory agent/merchant counts, TPV, commission, liquidity health, and risk level.",
      count: territories.length,
      build: () =>
        toCsv(
          territories.map((t) => ({
            name: t.name,
            code: t.code,
            country: t.country,
            activeAgents: t.activeAgentsCount,
            activeMerchants: t.activeMerchantsCount,
            todayTPV: t.todayTPV,
            monthlyTPV: t.monthlyTPV,
            commissionToday: t.aggregatorCommissionToday,
            liquidityHealth: t.liquidityHealth,
            riskLevel: t.riskLevel,
          })),
        ),
    },
    {
      id: "settlement-batches",
      title: "Settlement Batch Statement",
      description: "Every settlement batch: gross volume, fees, refunds, and net commission settled.",
      count: settlements.length,
      build: () =>
        toCsv(
          settlements.map((s: any) => ({
            batchReference: s.batchReference,
            settlementDate: s.settlementDate,
            currency: s.currency,
            grossNetworkVolume: s.grossNetworkVolume,
            totalInterchangeFees: s.totalInterchangeFees,
            refundsAdjusted: s.refundsAdjusted,
            netCommissionSettled: s.netAggregatorCommissionSettled,
            status: s.status,
            settledAt: s.settledAt || "",
          })),
        ),
    },
    {
      id: "compliance-queue",
      title: "Compliance / KYC-KYB Queue Export",
      description: "Every compliance document record and its decision status.",
      count: complianceRecords.length,
      build: () =>
        toCsv(
          complianceRecords.map((c) => ({
            entityType: c.entityType,
            entityName: c.entityName,
            territory: c.territoryName,
            documentType: c.documentType,
            status: c.status,
            submittedAt: c.submittedAt,
            reviewNotes: c.reviewNotes || "",
          })),
        ),
    },
    {
      id: "audit-trail",
      title: "Audit Trail Export",
      description: "Every recorded staff action against your network, with actor and result.",
      count: auditLog.length,
      build: () =>
        toCsv(
          auditLog.map((a) => ({
            action: a.action,
            targetType: a.targetType,
            targetId: a.targetId,
            actor: a.actorName,
            actorRole: a.actorRole,
            result: a.result,
            reason: a.reason || "",
            createdAt: a.createdAt,
          })),
        ),
    },
  ];

  const handleDownload = (id: string, title: string, build: () => string) => {
    setDownloadingId(id);
    const csv = build();
    downloadCsv(`${id}-${aggregator.code}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    setDownloadingId(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Aggregator Network Reports</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Export real, currently-loaded network data as CSV. Every export reflects live data from your account —
          there is no separate report-generation backend yet, so these are direct exports of what is on screen
          elsewhere in the portal.
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div
            key={r.id}
            className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]">
                  CSV
                </span>
              </div>

              <h3 className="text-base font-bold text-[var(--foreground)] mt-3">{r.title}</h3>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">{r.description}</p>
            </div>

            <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[var(--foreground-muted)]">{r.count} rows</span>
              <button
                onClick={() => handleDownload(r.id, r.title, r.build)}
                disabled={downloadingId === r.id || r.count === 0}
                className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingId === r.id ? "Generating..." : r.count === 0 ? "No data" : "Download CSV"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
