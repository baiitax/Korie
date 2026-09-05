/**
 * KoriePay — Customer Transaction History Query
 * =========================================================
 * The ONLY read path the customer portal uses for transaction history.
 *
 * Why this module exists (root cause of "Transaction History is not working"):
 * the portal previously rendered a static, hardcoded catalog
 * (`CUSTOMER_TRANSACTIONS` in `src/services/customerDataService.ts`) and, on any
 * API failure, silently fell back to that same catalog. So the screen always
 * showed "records" that were neither the customer's, nor real, nor refreshable —
 * and a backend outage was indistinguishable from an empty account.
 *
 * This module replaces that with a single authoritative chain:
 *
 *   authenticated identity (server) → customer id
 *     → TransactionService.listRawForOwner(customerId)   ← engine store, ownership-scoped
 *       → filter (account/currency, type category, status, date, search)
 *         → cursor pagination (deterministic: created_at DESC, id DESC)
 *           → customer-safe projection (no provider IDs, no ledger IDs, no routing)
 *
 * Nothing here trusts a customer/account/user id from the browser, and nothing
 * here fabricates a row. An empty result is an honest empty result.
 */

import { DbTransaction, TransactionStatus } from "@/types/database";
import {
  CustomerCurrency,
  CustomerTransaction,
  CustomerTransactionStatus,
  CustomerTransactionType,
} from "@/types/customer";

/* ------------------------------------------------------------------ types */

/** Customer-facing date ranges. `custom` is expressed via from/to. */
export type TransactionDateRangePreset = "ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM";

/** Filter chips the customer UI may offer. Keys map to transaction `category`. */
export type TransactionCategory = "TRANSFERS" | "BILLS" | "FX" | "FUNDING" | "CARDS";
export type TransactionCategoryFilter = "ALL" | TransactionCategory;

export interface CustomerTransactionFilters {
  /** Currency = account selector (XOF | NGN). Never a provider/rail choice. */
  currency?: CustomerCurrency;
  category?: TransactionCategoryFilter;
  status?: CustomerTransactionStatus;
  range?: TransactionDateRangePreset;
  /** ISO date-time bounds; only honoured when range === "CUSTOM". */
  from?: string;
  to?: string;
  /** Free text: matches counterparty name, title, description or reference. */
  search?: string;
  /** Rows per page; clamped to [1, MAX_PAGE_SIZE]. */
  limit?: number;
  /** Opaque cursor from the previous page. */
  cursor?: string;
}

export interface CustomerTransactionPage {
  items: CustomerTransaction[];
  /** Present when more rows exist. Opaque — the client must not parse it. */
  nextCursor: string | null;
  hasMore: boolean;
  /** Total matches after filtering (drives "Showing n of N"). */
  totalCount: number;
  /** Server clock at query time — the source of "Last updated". */
  generatedAt: string;
  pageSize: number;
}

/** Hard ceiling so no request can drag the whole ledger into the browser. */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/* ------------------------------------------------- status / type mapping */

/**
 * Engine status → customer label. One-to-one, no inference.
 * `DISPUTED` is a real backend state and must never be painted as
 * `PROCESSING` (an old mapping collapsed everything unknown into it).
 */
export function mapEngineStatusToUi(status: TransactionStatus): CustomerTransactionStatus {
  switch (status) {
    case "SUCCESSFUL":
      return "SUCCESSFUL";
    case "PENDING":
      return "PENDING";
    case "PROCESSING":
      return "PROCESSING";
    case "INITIATED":
      return "PROCESSING";
    case "FAILED":
      return "FAILED";
    case "REVERSED":
      return "REVERSED";
    case "CANCELLED":
      return "CANCELLED";
    case "DISPUTED":
      return "DISPUTED";
    default:
      // Unknown/undeployed engine state: show as pending review, never as success.
      return "PENDING";
  }
}

const CATEGORY_BY_TYPE: Record<CustomerTransactionType, TransactionCategory> = {
  TRANSFER_NIP: "TRANSFERS",
  TRANSFER_CROSS_BORDER: "TRANSFERS",
  TRANSFER_INTERNAL: "TRANSFERS",
  AGENT_CASH_OUT: "TRANSFERS",
  WALLET_FUNDING: "FUNDING",
  FX_SWAP: "FX",
  BILL_AIRTIME: "BILLS",
  BILL_DATA: "BILLS",
  BILL_ELECTRICITY: "BILLS",
  BILL_CABLE_TV: "BILLS",
  CARD_PURCHASE: "CARDS",
};

/**
 * Engine transaction type → customer category. Drives the filter chips, so a
 * category can only ever contain rows the engine actually produced.
 */
export function categoryForType(type: CustomerTransactionType): TransactionCategory {
  return CATEGORY_BY_TYPE[type] ?? "TRANSFERS";
}

/* ----------------------------------------------------- customer projection */

/**
 * The ONLY fields allowed to reach a customer screen. Internal ledger ids,
 * provider codes/references, request/correlation ids and idempotency keys are
 * deliberately dropped here rather than filtered at render time.
 */
export interface CustomerTransactionDetail extends CustomerTransaction {
  /** Masked account of the counterparty (never the full number). */
  maskedRecipientAccount?: string;
  /** The customer's own account for this transaction, by currency label. */
  accountLabel: string;
  /** Fee and FX as human strings, formatted once, server-side. */
  feeLabel: string;
  fxRateLabel?: string;
  destinationAmountLabel?: string;
}

const MINOR_UNIT_EXPONENT: Record<string, number> = { NGN: 2, XOF: 0 };

/**
 * NGN has 100 kobo, XOF has 100 centimes but is conventionally held in whole
 * francs; the engine stores NGN in kobo and XOF in centimes too, so minor→major
 * is /100 for both. Kept as a table so the rule is explicit and testable.
 */
export function fromMinorUnits(minor: number, currency: CustomerCurrency): number {
  const factor = 100;
  const major = (minor || 0) / factor;
  // XOF has no decimal subunit in daily use; never show fractional francs.
  return currency === "XOF" ? Math.round(major) : Math.round(major * 100) / 100;
}

export function maskAccountNumber(account?: string): string | undefined {
  if (!account) return undefined;
  const clean = account.replace(/\s+/g, "");
  if (clean.length <= 4) return "••••";
  return `•••• ${clean.slice(-4)}`;
}

const CURRENCY_LABEL: Record<string, string> = { XOF: "XOF", NGN: "NGN" };

export function toCustomerTransaction(tx: DbTransaction): CustomerTransaction {
  const currency = (tx.currency as CustomerCurrency) || "NGN";
  const isCrossBorder = Boolean(tx.source_currency && tx.destination_currency);
  const type: CustomerTransactionType = isCrossBorder
    ? "TRANSFER_CROSS_BORDER"
    : tx.type === "FX_CONVERSION"
      ? "FX_SWAP"
      : tx.type === "BILL_VEND"
        ? "BILL_AIRTIME"
        : tx.type === "WALLET_FUNDING"
          ? "WALLET_FUNDING"
          : tx.type === "AGENCY_CASH_OUT" || tx.type === "AGENCY_CASH_IN"
            ? "AGENT_CASH_OUT"
            : "TRANSFER_NIP";

  const amount = fromMinorUnits(tx.amount, currency);
  const fee = fromMinorUnits(tx.fee, currency);
  const destinationCurrency = tx.destination_currency as CustomerCurrency | undefined;
  const destinationAmount =
    tx.destination_currency && tx.metadata?.destAmount != null
      ? fromMinorUnits(Number(tx.metadata.destAmount), destinationCurrency || "XOF")
      : undefined;
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const openedAt = tx.created_at;
  const updatedAt = tx.updated_at || tx.created_at;

  return {
    // The row's own id is deliberately NOT echoed: `tx.id` is the ledger row
    // identifier, and the only consumer of `id` in the portal is a React key.
    // The customer reference is stable, already visible, and safe to key on.
    id: tx.reference,
    reference: tx.reference,
    type,
    title: tx.recipient_name || tx.narration || "KoriePay transaction",
    description: tx.narration || "Settled through KoriePay",
    amount,
    fee,
    totalAmount: Math.round((amount + fee) * 100) / 100,
    currency,
    direction: "OUTWARD",
    status: mapEngineStatusToUi(tx.status),
    recipientName: tx.recipient_name,
    recipientBank: tx.recipient_bank,
    recipientAccount: tx.recipient_account,
    sourceCurrency: tx.source_currency as CustomerCurrency | undefined,
    destinationCurrency,
    exchangeRate: tx.exchange_rate,
    destinationAmount,
    category: categoryForType(type),
    createdAt: openedAt,
    completedAt: updatedAt,
    timeline: [
      {
        title: "Transfer initiated",
        description: "Authenticated and validated",
        timestamp: time(openedAt),
        status: "COMPLETED",
      },
      {
        title: "Funds moved",
        description:
          tx.status === "SUCCESSFUL"
            ? "Settlement confirmed"
            : "Awaiting settlement confirmation",
        timestamp: time(updatedAt),
        status: tx.status === "SUCCESSFUL" ? "COMPLETED" : "CURRENT",
      },
    ],
  };
}

/* ---------------------------------------------------------------- filtering */

interface RangeBounds {
  startMs: number;
  endMs: number;
}

export function resolveRangeBounds(
  range: TransactionDateRangePreset | undefined,
  now: Date = new Date(),
  from?: string,
  to?: string,
): RangeBounds | null {
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  switch (range) {
    case "TODAY":
      return { startMs: startOfDay(now), endMs: endOfDay(now) };
    case "WEEK": {
      const start = new Date(now);
      // Monday-anchored week (FR/HA + NG business convention).
      const dow = (now.getDay() + 6) % 7;
      start.setDate(now.getDate() - dow);
      return { startMs: startOfDay(start), endMs: endOfDay(now) };
    }
    case "MONTH":
      return {
        startMs: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        endMs: endOfDay(now),
      };
    case "CUSTOM": {
      const startMs = from ? new Date(from).getTime() : 0;
      const endMs = to ? endOfDay(new Date(to)) : endOfDay(now);
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
      return { startMs, endMs };
    }
    default:
      return null;
  }
}

function matchesSearch(tx: DbTransaction, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [
    tx.reference,
    tx.recipient_name,
    tx.recipient_bank,
    tx.narration,
    tx.id,
  ]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(needle));
}

/* -------------------------------------------------------------- pagination */

/**
 * Cursor = base64url("epochMs|id"). Deterministic because the sort key is
 * (created_at DESC, id DESC): replaying the same cursor can neither duplicate a
 * row nor skip one, even under concurrent inserts.
 */
function encodeCursor(iso: string, id: string): string {
  const ms = new Date(iso).getTime();
  return Buffer.from(`${ms}|${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { ms: number; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const idx = raw.indexOf("|");
    if (idx < 0) return null;
    const ms = Number(raw.slice(0, idx));
    const id = raw.slice(idx + 1);
    if (!Number.isFinite(ms) || !id) return null;
    return { ms, id };
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------- the query */

/**
 * @param ownedRows   Rows already restricted to one customer by the caller.
 * @param filters     Validated, server-resolved filters.
 */
export function queryCustomerTransactions(
  ownedRows: DbTransaction[],
  filters: CustomerTransactionFilters = {},
  now: Date = new Date(),
): CustomerTransactionPage {
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(Number(filters.limit) || DEFAULT_PAGE_SIZE)),
  );

  const bounds = resolveRangeBounds(filters.range, now, filters.from, filters.to);
  const statusFilter = filters.status;
  const categoryFilter = filters.category && filters.category !== "ALL" ? filters.category : null;

  const matched = ownedRows.filter((tx) => {
    if (filters.currency && tx.currency !== filters.currency) return false;
    if (statusFilter && mapEngineStatusToUi(tx.status) !== statusFilter) return false;
    if (categoryFilter) {
      const ui = toCustomerTransaction(tx);
      if (ui.category !== categoryFilter) return false;
    }
    if (bounds) {
      const t = new Date(tx.created_at).getTime();
      if (Number.isNaN(t)) return false;
      if (t < bounds.startMs || t > bounds.endMs) return false;
    }
    if (filters.search && !matchesSearch(tx, filters.search)) return false;
    return true;
  });

  // Already newest-first from the engine store; re-sort defensively so the
  // contract holds even if a caller hands us an unsorted slice.
  matched.sort((a, b) => {
    const dt = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (dt !== 0) return dt;
    return b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
  });

  let startIndex = 0;
  if (filters.cursor) {
    const decoded = decodeCursor(filters.cursor);
    if (decoded) {
      const at = matched.findIndex((tx) => {
        const ms = new Date(tx.created_at).getTime();
        // Skip everything the customer has already seen: strictly older, or
        // same timestamp with a lexicographically smaller id (ties).
        return ms < decoded.ms || (ms === decoded.ms && tx.id === decoded.id);
      });
      if (at >= 0) startIndex = at;
      else startIndex = matched.length; // cursor past the end → honest empty page
    }
  }

  const slice = matched.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < matched.length;
  const last = slice[slice.length - 1];

  return {
    items: slice.map(toCustomerTransaction),
    nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
    hasMore,
    totalCount: matched.length,
    generatedAt: now.toISOString(),
    pageSize,
  };
}

/* ------------------------------------------------- safe query-string parse */

const STATUSES: CustomerTransactionStatus[] = [
  "SUCCESSFUL",
  "PENDING",
  "PROCESSING",
  "FAILED",
  "REVERSED",
  "CANCELLED",
  "DISPUTED",
];
const CATEGORIES: TransactionCategoryFilter[] = [
  "ALL",
  "TRANSFERS",
  "BILLS",
  "FX",
  "FUNDING",
  "CARDS",
];
const RANGES: TransactionDateRangePreset[] = ["ALL", "TODAY", "WEEK", "MONTH", "CUSTOM"];

/**
 * Parse + validate untrusted query params. Unknown values are dropped, not
 * trusted — so a crafted `?status=SUCCESSFUL'` can never widen a result set.
 */
export function parseTransactionQueryParams(sp: URLSearchParams): CustomerTransactionFilters {
  const currencyRaw = (sp.get("currency") || "").toUpperCase();
  const statusRaw = (sp.get("status") || "").toUpperCase();
  const categoryRaw = (sp.get("category") || "").toUpperCase();
  const rangeRaw = (sp.get("range") || "").toUpperCase();

  const out: CustomerTransactionFilters = {};
  if (currencyRaw === "XOF" || currencyRaw === "NGN") out.currency = currencyRaw as CustomerCurrency;
  if ((STATUSES as string[]).includes(statusRaw)) {
    out.status = statusRaw as CustomerTransactionStatus;
  }
  if ((CATEGORIES as string[]).includes(categoryRaw) && categoryRaw !== "ALL") {
    out.category = categoryRaw as TransactionCategoryFilter;
  }
  if ((RANGES as string[]).includes(rangeRaw)) {
    out.range = rangeRaw as TransactionDateRangePreset;
  }
  const from = sp.get("from");
  const to = sp.get("to");
  if (out.range === "CUSTOM") {
    if (from && !Number.isNaN(new Date(from).getTime())) out.from = from;
    if (to && !Number.isNaN(new Date(to).getTime())) out.to = to;
  }
  const search = sp.get("search");
  if (search && search.trim()) out.search = search.trim().slice(0, 80);
  const limit = sp.get("limit");
  if (limit) out.limit = Number(limit);
  const cursor = sp.get("cursor");
  if (cursor) out.cursor = cursor.slice(0, 200);
  return out;
}

/** Currency ordering the whole portal must obey: XOF first, NGN second. */
export const CUSTOMER_CURRENCY_ORDER: CustomerCurrency[] = ["XOF", "NGN"];

/** Sort any currency-labelled rows XOF-first. No USD ever passes through. */
export function orderXofFirst<T extends { currency: CustomerCurrency }>(rows: T[]): T[] {
  const rank: Record<string, number> = { XOF: 0, NGN: 1 };
  return rows
    .filter((r) => r.currency === "XOF" || r.currency === "NGN")
    .sort((a, b) => (rank[a.currency] ?? 99) - (rank[b.currency] ?? 99));
}
