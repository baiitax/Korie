"use client";

import React, { useRef, useState, useEffect } from "react";
import { useCustomer } from "../CustomerContext";
import { formatMoney } from "@/lib/money";
import { buildReceiptData, TransactionReceiptData } from "@/lib/receipt";
import { translateNamespace } from "@/locales";
import ReceiptDocument from "./ReceiptDocument";
import { downloadReceiptPng, downloadReceiptPdf } from "@/lib/captureReceipt";
import { portalFetch } from "@/lib/customerPortalClient";
import {
  X,
  Share2,
  Copy,
  AlertTriangle,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

export const TransactionReceiptModal: React.FC = () => {
  const {
    isReceiptModalOpen,
    selectedReceiptTx: tx,
    closeReceipt,
    openDispute,
    language,
    t,
  } = useCustomer();

  const receiptRef = useRef<HTMLDivElement>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [receiptData, setReceiptData] = useState<TransactionReceiptData | null>(null);
  // "server" when the receipt came from the verified receipt API; "local" when
  // the UI fell back to building it from the session transaction (offline/static).
  const [receiptSource, setReceiptSource] = useState<"server" | "local">("local");

  const labelMap = (key: string) => labels[key] ?? key;

  const handleCopy = () => {
    if (!tx) return;
    navigator.clipboard.writeText(tx.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleShare = async () => {
    if (!tx) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `KoriePay Receipt — ${tx.reference}`,
          text: `${labelMap("receipt.title")}: ${formatMoney(tx.amount, tx.currency)}. ${labelMap("receipt.transactionReference")}: ${tx.reference}`,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadPng = async () => {
    if (!receiptRef.current || !tx) return;
    setIsExporting(true);
    try {
      await downloadReceiptPng(receiptRef.current, `koriepay-receipt-${tx.reference}`);
    } catch {
      /* image export unsupported — fall back to print */
      downloadReceiptPdf();
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = () => {
    downloadReceiptPdf();
  };

  const resolveLabels = (lang: string) => setLabels(translateNamespace(lang as "en" | "fr" | "ha", "receipt"));

  useEffect(() => {
    if (isReceiptModalOpen) resolveLabels(language);
  }, [language, isReceiptModalOpen]);

  useEffect(() => {
    if (isReceiptModalOpen && tx) {
      // Consume the verified receipt API first; the server is the authoritative
      // source for amounts/fees/status/provider refs. Fall back to building the
      // receipt from the session transaction only if the API is unreachable.
      let cancelled = false;
      const txId = tx.id || tx.reference;
      const local = buildReceiptData(tx);
      setReceiptSource("local");
      setReceiptData(local);

      (async () => {
        try {
          const res = await portalFetch(`/api/customer/receipts/${txId}`);
          if (res.ok) {
            const json = await res.json();
            const serverReceipt = json?.data?.receipt;
            if (serverReceipt && !cancelled) {
              // The server returns the receipt already built from the
              // authoritative transaction record — use it verbatim.
              setReceiptData(serverReceipt as TransactionReceiptData);
              setReceiptSource("server");
            }
          }
        } catch {
          /* keep local fallback */
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [isReceiptModalOpen, tx]);

  if (!isReceiptModalOpen || !tx || !receiptData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="receipt-print-root relative w-full max-w-lg rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              {labelMap("receipt.receiptDocumentType")} · {tx.reference}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                receiptSource === "server"
                  ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"
              }`}
            >
              {receiptSource === "server" ? "Verified" : "Preview"}
            </span>
          </div>
          <button
            onClick={closeReceipt}
            className="p-1.5 rounded-full hover:bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt preview (the exact document that gets exported) */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-[var(--surface-elevated)]">
          <div ref={receiptRef} className="grid place-items-center">
            <ReceiptDocument data={receiptData} localeLabels={labels} />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => { closeReceipt(); openDispute(tx); }}
            className="flex items-center gap-1.5 text-xs text-[var(--danger)] hover:text-[var(--danger)] font-semibold"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{labelMap("receipt.reportIssue")}</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{labelMap("receipt.shareReceipt")}</span>
            </button>
            <button
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-colors disabled:opacity-50"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{labelMap("receipt.downloadImage")}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{labelMap("receipt.downloadPdf")}</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{labelMap("receipt.copyReference")}</span>
              {copiedRef && <span className="text-[10px] text-white/80 ml-1">✓</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionReceiptModal;
