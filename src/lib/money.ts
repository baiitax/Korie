/**
 * KoriePay currency localization utilities.
 *
 * Central, locale-aware money formatting for the multi-currency customer
 * experience. Every financial figure in the portal should flow through here
 * so NGN and XOF (and USD) render with the correct symbol, grouping and
 * decimal precision, and never get visually conflated.
 */
import { CustomerCurrency } from "@/types/customer";

export interface CurrencyMeta {
  code: CustomerCurrency;
  /** Display symbol/prefix, locale-aware. */
  symbol: string;
  /** Full human name (English by default; localized by consumers where needed). */
  name: string;
  /** Short label, e.g. for badges. */
  short: string;
  minFraction: number;
  maxFraction: number;
  /** Emoji flag used in currency badges. */
  flag: string;
  /** Country short code the currency is primarily associated with. */
  country: "NG" | "NE" | "US";
}

export const CURRENCY_META: Record<CustomerCurrency, CurrencyMeta> = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    short: "Naira",
    minFraction: 2,
    maxFraction: 2,
    flag: "🇳🇬",
    country: "NG",
  },
  XOF: {
    code: "XOF",
    symbol: "CFA",
    name: "West African CFA Franc",
    short: "CFA Franc",
    minFraction: 0,
    maxFraction: 0,
    flag: "🇳🇪",
    country: "NE",
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    short: "US Dollar",
    minFraction: 2,
    maxFraction: 2,
    flag: "🇺🇸",
    country: "US",
  },
};

export function getCurrencyMeta(currency: CustomerCurrency): CurrencyMeta {
  return CURRENCY_META[currency] ?? CURRENCY_META.NGN;
}

/**
 * Format an amount for a currency.
 *
 * NGN  -> ₦2,450,000.00
 * XOF  -> CFA 1,250,000
 * USD  -> $1,420.50
 *
 * Uses comma grouping (consistent across currencies for cross-currency
 * scannability) with per-currency symbols and decimal precision. XOF is an
 * integer currency (0 decimals), NGN/USD show 2.
 */
export function formatMoney(
  amount: number,
  currency: CustomerCurrency = "NGN",
  options?: {
    withSign?: boolean;
    forceDecimals?: boolean;
  },
): string {
  const meta = getCurrencyMeta(currency);
  const fractionDigits = options?.forceDecimals ? meta.maxFraction : meta.maxFraction;
  const body = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: options?.forceDecimals ? meta.minFraction : fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  const symbolPrefix = currency === "XOF" ? "CFA " : meta.symbol;
  const sign = options?.withSign ? (amount < 0 ? "−" : "+") : "";
  return `${sign}${symbolPrefix}${body}`;
}

/**
 * Mask an account number for display, e.g. "0123984123" -> "•••• •••• 4123".
 * Keeps only the trailing 4 digits, which is safe for identification without
 * exposing the full number.
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return "•••• ••••";
  const digits = String(accountNumber).replace(/\s+/g, "");
  const last4 = digits.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Human last-updated label.
 */
export function formatLastUpdated(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
