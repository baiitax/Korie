"use client";

import React from "react";
import { TransactionReceiptData } from "@/lib/receipt";
import KorieLogo from "@/components/brand/KorieLogo";

/**
 * ReceiptDocument — the SHORT, professional, share-ready receipt.
 *
 * Compact hierarchy (directive §32–§37), fast to read and easy to share:
 *   1. KORIEPAY + "Transaction Receipt"
 *   2. Status (colour + text, never colour alone)
 *   3. Amount (dominant, tabular)
 *   4. To / From (recipient → sender)
 *   5. Account (masked)
 *   6. Reference
 *   7. Date · Time
 *   8. Fee
 *   Optional: Exchange Rate + Recipient Receives (cross-currency only)
 *
 * No technical infrastructure, no provider jargon, no long timeline. Rendered
 * from the authoritative `buildReceiptData` view-model; this is the exact
 * document exported as image/PDF and shown on-screen.
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

  const statusTone = isSuccess ? "success" : isPending ? "warning" : isFailed ? "danger" : "info";
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
  const isCrossCurrency = data.exchangeRate != null || data.destinationAmount != null;

  // "From" account label — currency + masked number if available.
  const fromAccount = data.senderAccountMasked
    ? `${data.destinationCurrency || data.currency} Account ${data.senderAccountMasked}`
    : `${data.currency} Account`;

  return (
    <div className="receipt-paper w-full max-w-sm mx-auto bg-white text-slate-900 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.12),0_20px_40px_-24px_rgba(15,23,42,0.4)]">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 text-center border-b border-slate-100">
        <div className="flex items-center justify-center gap-2">
          <KorieLogo variant="compact" theme="dark" height={22} />
          <span className="text-sm font-extrabold tracking-tight">KORIEPAY</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
          {L("receipt.title")}
        </div>
      </div>

      {/* Status + Amount hero */}
      <div className="px-5 py-5 text-center">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusPill}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusText}
        </span>
        <div className="mt-3 text-3xl font-extrabold tracking-tight tabular-nums font-mono">
          {sign}{data.amountLabel}
        </div>
        <div className="mt-1 text-xs text-slate-500">{data.transactionTypeLabel}</div>
      </div>

      {/* To / From */}
      <div className="px-5 divide-y divide-slate-100 text-[13px]">
        {data.recipientName && (
          <div className="flex items-center justify-between py-3">
            <span className="text-slate-500 text-xs">{L("receipt.to")}</span>
            <span className="font-semibold text-slate-900 text-right max-w-[60%]">{data.recipientName}</span>
          </div>
        )}
        <div className="flex items-center justify-between py-3">
          <span className="text-slate-500 text-xs">{L("receipt.from")}</span>
          <span className="font-semibold text-slate-900 text-right max-w-[60%]">{fromAccount}</span>
        </div>

        {/* Cross-currency note (only when applicable) */}
        {isCrossCurrency && (
          <>
            {data.exchangeRate != null && (
              <div className="flex items-center justify-between py-3">
                <span className="text-slate-500 text-xs">{L("receipt.exchangeRate")}</span>
                <span className="font-mono font-semibold text-slate-900">
                  1 {data.sourceCurrency} = {data.exchangeRate} {data.destinationCurrency}
                </span>
              </div>
            )}
            {data.destinationAmount != null && data.destinationCurrency && (
              <div className="flex items-center justify-between py-3">
                <span className="text-slate-500 text-xs">{L("receipt.amountReceived")}</span>
                <span className="font-mono font-semibold text-slate-900">
                  {data.destinationCurrency} {data.destinationAmount.toLocaleString("en-US", { maximumFractionDigits: data.destinationCurrency === "XOF" ? 0 : 2 })}
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between py-3">
          <span className="text-slate-500 text-xs">{L("receipt.transactionReference")}</span>
          <span className="font-mono font-semibold text-slate-900 select-all">{data.publicReference}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-slate-500 text-xs">{L("receipt.date")}</span>
          <span className="font-mono font-semibold text-slate-900">
            {data.transactionDateLabel} · {data.transactionTimeLabel}
          </span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-slate-500 text-xs">{L("receipt.serviceFee")}</span>
          <span className="font-mono font-semibold text-slate-900">{data.feeLabel}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 mt-1 border-t border-slate-100 text-center">
        <div className="text-[11px] font-extrabold tracking-tight">KoriePay</div>
        <p className="mt-1 text-[9px] text-slate-400 leading-relaxed">{L(data.disclaimer)}</p>
      </div>
    </div>
  );
};

export default ReceiptDocument;
