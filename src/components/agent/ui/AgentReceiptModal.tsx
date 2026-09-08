"use client";

// =============================================================================
// Agent operation receipt — light design. Shows the REAL ledger journal id +
// payment reference recorded by the engine for the operation.
// =============================================================================

import React from "react";
import { useAgentPortal } from "../AgentContext";
import { AgentModal, AgentChip, statusTone } from "./AgentUi";
import { CheckCircle2, X, Printer, ReceiptText } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { AgentPortalOperationType } from "@/types/agentPortal";

export function formatAgentDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AgentReceiptModal() {
  const { isReceiptOpen, closeReceipt, selectedReceipt } = useAgentPortal();

  if (!isReceiptOpen || !selectedReceipt) return null;
  const op: AgentPortalOperationType = selectedReceipt;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Reference", value: <span className="font-mono text-xs">{op.reference}</span> },
    op.ledgerJournalId
      ? { label: "Ledger journal", value: <span className="font-mono text-xs">{op.ledgerJournalId}</span> }
      : null,
    { label: "Type", value: op.type },
    { label: "Amount", value: formatMoney(op.amount, op.currency) },
    { label: "Customer fee", value: formatMoney(op.customerFee || 0, op.currency) },
    { label: "Agent commission", value: formatMoney(op.agentCommission || 0, op.currency) },
    op.customerName ? { label: "Customer", value: op.customerName } : null,
    op.customerBank ? { label: "Destination bank", value: `${op.customerBank}${op.customerAccount ? ` (••${op.customerAccount.slice(-4)})` : ""}` } : null,
    { label: "Terminal", value: <span className="font-mono text-xs">{op.terminalId}</span> },
    { label: "Completed", value: formatAgentDateTime(op.completedAt || op.createdAt) },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  return (
    <AgentModal open onClose={closeReceipt} labelledBy="agent-receipt-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <ReceiptText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="agent-receipt-title" className="text-base font-bold text-stone-900">
              {op.title}
            </h2>
            <div className="mt-0.5 flex items-center gap-2">
              <AgentChip label={op.status} tone={statusTone(op.status)} />
              {op.type === "CASH_OUT" ? <AgentChip label="Cash-out" tone="amber" /> : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={closeReceipt}
          aria-label="Close receipt"
          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-100">
        <p className="font-mono text-2xl font-bold text-stone-900">
          {formatMoney(op.amount + (op.customerFee || 0), op.currency)}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-600">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Recorded on the engine ledger · {formatAgentDateTime(op.createdAt)}
        </p>
      </div>

      <dl className="mt-4 divide-y divide-stone-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-4 py-2.5">
            <dt className="text-xs text-stone-500">{r.label}</dt>
            <dd className="text-right text-xs font-semibold text-stone-800">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </button>
        <button
          type="button"
          onClick={closeReceipt}
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
        >
          Done
        </button>
      </div>
    </AgentModal>
  );
}
