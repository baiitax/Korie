/**
 * KoriePay — Transaction Receipt Data Contract
 * ---------------------------------------------------------------------------
 * A strongly-typed, customer-safe projection of a transaction used by the
 * receipt UI, the image/PDF renderer and the receipt API. It is ALWAYS derived
 * from the same authoritative `CustomerTransaction` record the transaction
 * list/detail/notification use — it never independently recalculates amounts,
 * fees or statuses.
 *
 * Only customer-appropriate fields are exposed. Account/card numbers are
 * always masked by the caller via `maskAccountNumber`. No fabricated values
 * (no invented provider refs, rates, certifications).
 */

import {
  CustomerTransaction,
  CustomerTransactionStatus,
  CustomerTransactionType,
  CustomerCurrency,
  CustomerUser,
} from "@/types/customer";
import { maskAccountNumber } from "@/lib/money";

/** Direction of value movement relative to the customer. */
export type ReceiptDirection = "INWARD" | "OUTWARD";

/**
 * A single key/value row in the receipt's "details" block, ordered for clarity.
 */
export interface ReceiptRow {
  label: string;
  value: string;
  /** Renders the label as a section heading rather than a row. */
  heading?: boolean;
  /** Marks the row as the prominent "total" line. */
  emphasized?: boolean;
  /** Allows a value to be copied (e.g. reference / token). */
  copyable?: boolean;
}

/**
 * One verified lifecycle step (only steps that actually happened, in order).
 */
export interface ReceiptTimelineStep {
  title: string;
  description: string;
  timestamp: string;
  status: "COMPLETED" | "CURRENT" | "FAILED";
}

/**
 * The complete, typed receipt view-model.
 */
export interface TransactionReceiptData {
  /** Unique receipt/document identifier derived from the transaction. */
  receiptId: string;
  documentType: string;
  /** Public transaction reference (e.g. KP-XXXXXXXX). */
  publicReference: string;
  /** Optional provider reference, masked/short where appropriate. */
  providerReference?: string;
  transactionType: CustomerTransactionType;
  transactionTypeLabel: string;
  status: CustomerTransactionStatus;
  amount: number;
  currency: CustomerCurrency;
  direction: ReceiptDirection;
  fee: number;
  totalAmount: number;
  /** Cross-currency fields, populated only when present on the transaction. */
  sourceCurrency?: CustomerCurrency;
  destinationCurrency?: CustomerCurrency;
  exchangeRateExponent?: number;
  exchangeRate?: number;
  destinationAmount?: number;
  /** Display-safe (masked) party fields. */
  senderName?: string;
  senderAccountMasked?: string;
  senderBank?: string;
  recipientName?: string;
  recipientAccountMasked?: string;
  recipientBank?: string;
  /** Provider biller token (only for bill transactions that carry one). */
  billerToken?: string;
  billerProvider?: string;
  /** Deterministic, chronological timeline of events that actually occurred. */
  timeline: ReceiptTimelineStep[];
  /** Human timestamps for header/footer. */
  generatedAt: string;
  transactionDateLabel: string;
  transactionTimeLabel: string;
  /** Currency-aware amount labels. */
  amountLabel: string;
  feeLabel: string;
  totalLabel: string;
  /** Structured rows for the detail block (kept DRY with the renderer). */
  rows: ReceiptRow[];
  /** Customer-facing supporting note. */
  disclaimer: string;
}

/** Map the app's transaction status to the receipt's authoritative status. */
function mapStatus(status: CustomerTransactionStatus): CustomerTransactionStatus {
  return status;
}

/** Human label for a transaction type, e.g. TRANSFER_NIP -> "Transfer (NIP)". */
export function receiptTypeLabel(type: CustomerTransactionType): string {
  const map: Record<CustomerTransactionType, string> = {
    TRANSFER_NIP: "Transfer (NIP)",
    TRANSFER_CROSS_BORDER: "Cross-Border Transfer",
    TRANSFER_INTERNAL: "Internal Transfer",
    BILL_AIRTIME: "Airtime Top-Up",
    BILL_DATA: "Mobile Data",
    BILL_ELECTRICITY: "Electricity Token",
    BILL_CABLE_TV: "Cable TV",
    CARD_PURCHASE: "Card Purchase",
    WALLET_FUNDING: "Wallet Funding",
    AGENT_CASH_OUT: "Agent Cash-Out",
    FX_SWAP: "Currency Exchange",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

/**
 * Build a typed receipt view-model from the authoritative transaction record.
 * This is the single source of truth for every receipt surface.
 */
export function buildReceiptData(
  tx: CustomerTransaction,
  customer?: Pick<CustomerUser, "fullName" | "email" | "id">,
  locale: "en" | "fr" | "ha" = "en",
): TransactionReceiptData {
  const date = new Date(tx.createdAt);
  const dateLabel = date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeLabel = date.toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const direction: ReceiptDirection = tx.direction;
  const isCrossCurrency = !!(tx.sourceCurrency && tx.destinationCurrency);

  const rows: ReceiptRow[] = [];

  if (tx.reference) {
    rows.push({ label: "transactionReference", value: tx.reference, copyable: true });
  }
  if (tx.providerReference) {
    rows.push({ label: "sessionReference", value: tx.providerReference.slice(0, 24) });
  }
  rows.push({ label: "transactionTypeLabel", value: receiptTypeLabel(tx.type) });
  rows.push({ label: "dateTime", value: `${dateLabel} · ${timeLabel}` });

  if (tx.senderName) {
    rows.push({ label: "senderDetails", value: tx.senderName });
    if (tx.senderBank) rows.push({ label: "senderBank", value: tx.senderBank, heading: true });
  }
  if (tx.senderAccount) {
    rows.push({ label: "senderAccountMasked", value: maskAccountNumber(tx.senderAccount) });
  }

  if (tx.recipientName) {
    rows.push({ label: "recipientDetails", value: tx.recipientName });
    if (tx.recipientBank) rows.push({ label: "recipientBank", value: tx.recipientBank, heading: true });
  }
  if (tx.recipientAccount) {
    rows.push({ label: "recipientAccountMasked", value: maskAccountNumber(tx.recipientAccount) });
  }

  if (isCrossCurrency && tx.exchangeRate != null) {
    rows.push({ label: "exchangeRate", value: tx.exchangeRate.toLocaleString("en-US", { maximumFractionDigits: 4 }) });
  }
  if (isCrossCurrency && tx.destinationAmount != null && tx.destinationCurrency) {
    rows.push({ label: "amountReceived", value: `${tx.destinationCurrency} ${tx.destinationAmount.toLocaleString("en-US", { maximumFractionDigits: tx.destinationCurrency === "XOF" ? 0 : 2 })}` });
  }

  if (tx.billerCustomerToken) {
    rows.push({ label: "billerToken", value: tx.billerCustomerToken, copyable: true });
  }
  if (tx.billerProvider) {
    rows.push({ label: "billerProvider", value: tx.billerProvider });
  }

  // Always include the amount, fee and total — in that order, from the record.
  rows.push({ label: "grossAmount", value: formatAmount(tx.amount, tx.currency) });
  rows.push({ label: "serviceFee", value: formatAmount(tx.fee, tx.currency) });
  rows.push({ label: "totalDebited", value: formatAmount(tx.totalAmount, tx.currency), emphasized: true });

  const timeline: ReceiptTimelineStep[] = (tx.timeline ?? []).map((s) => ({
    title: s.title,
    description: s.description,
    timestamp: s.timestamp,
    status: s.status,
  }));

  return {
    receiptId: `${tx.reference}-${tx.id.slice(-4)}`,
    documentType: "receiptDocumentType",
    publicReference: tx.reference,
    providerReference: tx.providerReference,
    transactionType: tx.type,
    transactionTypeLabel: receiptTypeLabel(tx.type),
    status: mapStatus(tx.status),
    amount: tx.amount,
    currency: tx.currency,
    direction,
    fee: tx.fee,
    totalAmount: tx.totalAmount,
    sourceCurrency: tx.sourceCurrency,
    destinationCurrency: tx.destinationCurrency,
    exchangeRate: tx.exchangeRate,
    destinationAmount: tx.destinationAmount,
    senderName: tx.senderName,
    senderAccountMasked: tx.senderAccount ? maskAccountNumber(tx.senderAccount) : undefined,
    senderBank: tx.senderBank,
    recipientName: tx.recipientName,
    recipientAccountMasked: tx.recipientAccount ? maskAccountNumber(tx.recipientAccount) : undefined,
    recipientBank: tx.recipientBank,
    billerToken: tx.billerCustomerToken,
    billerProvider: tx.billerProvider,
    timeline,
    generatedAt: new Date().toISOString(),
    transactionDateLabel: dateLabel,
    transactionTimeLabel: timeLabel,
    amountLabel: formatAmount(tx.amount, tx.currency),
    feeLabel: formatAmount(tx.fee, tx.currency),
    totalLabel: formatAmount(tx.totalAmount, tx.currency),
    rows,
    disclaimer: "receiptDisclaimer",
  };
}

/** Currency-aware amount formatting with no leading symbol on XOF beyond "CFA ". */
function formatAmount(amount: number, currency: CustomerCurrency): string {
  if (currency === "XOF") {
    return `CFA ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  const symbol = currency === "NGN" ? "₦" : "$";
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type { CustomerTransaction };
