"use client";

import React from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import { CustomerTransactionStatus } from "@/types/customer";

/**
 * One rendering of transaction state for the whole portal.
 * Previously each page carried its own `statusTone` switch, which is how
 * `DISPUTED` ended up rendered as neutral-grey on one screen and missing
 * entirely on another. §15 of the brief requires every authoritative state to
 * render correctly, so the mapping lives here and nowhere else.
 */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONE: Record<CustomerTransactionStatus, StatusTone> = {
  SUCCESSFUL: "success",
  PENDING: "warning",
  PROCESSING: "warning",
  FAILED: "danger",
  REVERSED: "info",
  CANCELLED: "info",
  DISPUTED: "danger",
};

/**
 * Status → locale key. Exposed because a locale key must never be built by
 * string concatenation (`transactions.status${status}` produced
 * `transactions.statusSUCCESSFUL`, a key that does not exist, and the UI
 * rendered the raw key to the customer). One map, three consumers.
 */
const LABEL_KEY: Record<CustomerTransactionStatus, string> = {
  SUCCESSFUL: "transactions.statusSuccess",
  PENDING: "transactions.statusPending",
  PROCESSING: "transactions.statusProcessing",
  FAILED: "transactions.statusFailed",
  REVERSED: "transactions.statusReversed",
  CANCELLED: "transactions.statusCancelled",
  DISPUTED: "transactions.statusDisputed",
};

export function transactionStatusLabelKey(status: CustomerTransactionStatus): string {
  return LABEL_KEY[status] ?? "transactions.statusPending";
}

/** Terminal = nothing further will happen, so no live refresh is warranted. */
export const TERMINAL_STATUSES: CustomerTransactionStatus[] = [
  "SUCCESSFUL",
  "FAILED",
  "REVERSED",
  "CANCELLED",
];

export function isLiveStatus(status: CustomerTransactionStatus): boolean {
  return !TERMINAL_STATUSES.includes(status);
}

export const TransactionStatusBadge: React.FC<{
  status: CustomerTransactionStatus;
  t: (key: string) => string;
  className?: string;
}> = ({ status, t, className }) => {
  const live = isLiveStatus(status);
  return (
    <StatusBadge tone={TONE[status] ?? "neutral"} dot={live} className={className}>
      {t(LABEL_KEY[status] ?? "transactions.statusPending")}
    </StatusBadge>
  );
};

export default TransactionStatusBadge;
