"use client";

import React from "react";
import { TransactionReceiptData } from "@/lib/receipt";
import KorieLogo from "@/components/brand/KorieLogo";

/**
 * ReceiptDocument — the canonical, premium bank-grade receipt layout.
 *
 * It is a single, header-less, print-ready document (fixed A4-ish "paper"
 * proportions). Both the on-screen modal preview and the exported PNG/PDF
 * render THIS component, so the receipt always matches the authoritative
 * transaction record and any export looks identical to what's on screen.
 *
 * Design notes:
 *  - Light "paper" background so it reads as a printed financial document,
 *    not a dark dashboard screenshot.
 *  - The amount is the strongest visual element; status is shown with BOTH
 *    colour and text (never colour alone).
 *  - Account numbers are masked; no fabricated card numbers, CVV, provider
 *    refs, rates or certifications.
 */
export const ReceiptDocument: React.FC<{
  data: TransactionReceiptData;
  localeLabels: Record<string, string>;
}> = ({ data, localeLabels }) => {
  const L = (key: string) => localeLabels[key] ?? key;

  const isSuccess = data.status === "SUCCESSFUL";
  const isPending = data.status === "PENDING" || data.status === "PROCESSING";
  const isFailed = data.status === "FAILED";
  const isReversed = data.status === "REVERSED" || data.status === "CANCELLED";

  const statusTone = isSuccess
    ? "success"
    : isPending
    ? "warning"
    : isFailed
    ? "danger"
    : "info";

  const statusPill = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-slate-100 text-slate-600 border-slate-200",
  }[statusTone];

  const statusText = {
    success: L("receipt.statusSuccessful"),
    warning: L("receipt.statusPending"),
    danger: L("receipt.statusFailed"),
    info: L("receipt.statusReversed"),
  }[statusTone];

  const sign = data.direction === "INWARD" ? "+" : "−";

  // Group rows for the detail block.
  const detailRows = data.rows;

  return (
    <div className="receipt-paper w-full max-w-md mx-auto bg-white text-slate-900 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.12),0_20px_40px_-24px_rgba(15,23,42,0.4)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KorieLogo variant="compact" theme="dark" height={26} />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">{L("receipt.title")}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              {L("receipt.subheading")}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            {data.documentType}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {new Date(data.generatedAt).toLocaleDateString("en-GB")}
          </div>
        </div>
      </div>

      {/* Status + Amount hero */}
      <div className="px-6 py-6 text-center">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusPill}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusText}
        </span>

        <div className="mt-4 text-[10px] uppercase tracking-wider text-slate-400 font-mono">
          {data.direction === "INWARD" ? L("receipt.amountReceivedLabel") : L("receipt.amountSentLabel")}
        </div>
        <div className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums font-mono">
          {sign}{data.amountLabel}
        </div>
        <div className="mt-1 text-xs text-slate-500">{data.transactionTypeLabel}</div>
      </div>

      {/* Biller token (only if present) */}
      {data.billerToken && (
        <div className="mx-6 mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold">
            ⚡ {L("receipt.tokenLabel")}
          </div>
          <div className="text-lg font-mono font-extrabold tracking-[0.15em] text-slate-900 select-all">
            {data.billerToken}
          </div>
        </div>
      )}

      {/* Detail rows */}
      <div className="px-6 pb-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 divide-y divide-slate-100 text-xs overflow-hidden">
          {detailRows.map((row, idx) =>
            row.heading ? (
              <div key={idx} className="px-3.5 pt-3 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {L(row.label)}
              </div>
            ) : row.emphasized ? (
              <div key={idx} className="flex items-center justify-between px-3.5 py-3 bg-slate-100/60">
                <span className="font-bold text-slate-900">{L(row.label)}</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{row.value}</span>
              </div>
            ) : (
              <div key={idx} className="flex items-center justify-between px-3.5 py-3">
                <span className="text-slate-500">{L(row.label)}</span>
                <span className="text-slate-800 font-medium break-all text-right max-w-[55%]">{row.value}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Cross-currency note */}
      {(data.exchangeRate != null || data.destinationAmount != null) && (
        <div className="mx-6 mt-4 rounded-xl border border-slate-100 px-4 py-3 text-left">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            {L("receipt.crossCurrencyTitle")}
          </div>
          {data.exchangeRate != null && (
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">{L("receipt.exchangeRate")}</span>
              <span className="font-mono font-semibold text-slate-800">
                1 {data.sourceCurrency} = {data.exchangeRate} {data.destinationCurrency}
              </span>
            </div>
          )}
          {data.destinationAmount != null && data.destinationCurrency && (
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">{L("receipt.amountReceived")}</span>
              <span className="font-mono font-semibold text-slate-800">
                {data.destinationCurrency} {data.destinationAmount.toLocaleString("en-US", { maximumFractionDigits: data.destinationCurrency === "XOF" ? 0 : 2 })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Timeline (only steps that happened) */}
      {data.timeline.length > 0 && (
        <div className="px-6 pt-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            {L("receipt.timelineTitle")}
          </div>
          <div className="mt-2 border-l-2 border-slate-200 pl-3 ml-1 text-xs space-y-2.5">
            {data.timeline.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="text-slate-800 font-medium">{step.title}</div>
                {step.description && <div className="text-[10px] text-slate-500">{step.description}</div>}
                <div className="text-[10px] font-mono text-slate-400">{step.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-5 mt-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center leading-relaxed">{L(data.disclaimer)}</p>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <span className="font-bold text-slate-500">KoriePay</span>
          <span>·</span>
          <span className="truncate max-w-[60%]">{data.publicReference}</span>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDocument;
