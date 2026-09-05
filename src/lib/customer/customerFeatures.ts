/**
 * KoriePay — Customer Product Configuration (single source of truth)
 * ---------------------------------------------------------------------------
 * Niger-first, XOF-first product positioning. This config is the ONLY place
 * that decides customer-visible currency priority and the AVAILABILITY state of
 * every service. Components and pages read these flags instead of hardcoding
 * "is this service available?" logic, so a service can move from COMING_SOON to
 * AVAILABLE without rebuilding the UI (see directive §48).
 *
 * Currency policy:
 *   - XOF is the primary customer currency (Niger-first).
 *   - NGN is secondary.
 *   - USD is NOT customer-visible. It may exist internally only; it never
 *     surfaces as a customer balance, card, selector or portfolio.
 *
 * Service status model (directive §49): AVAILABLE | COMING_SOON | MAINTENANCE | DISABLED.
 */

import { CustomerCurrency, SupportedLanguage } from "@/types/customer";

export type ServiceStatus = "AVAILABLE" | "COMING_SOON" | "MAINTENANCE" | "DISABLED";

export type CustomerServiceId =
  | "cards"
  | "airtime"
  | "data"
  | "electricity"
  | "cable"
  | "bills"
  | "fx"
  | "adashi"
  | "sendMoney"
  | "fund"
  /** In-store merchant QR checkout — no rails wired, so it is not sellable. */
  | "merchantQr";

export interface CustomerService {
  id: CustomerServiceId;
  status: ServiceStatus;
  /** When COMING_SOON, a short customer-facing description. */
  comingSoonLabel?: string;
}

/** Non-blocking permission to allow balance visibility toggle (privacy control). */
export interface CustomerConfig {
  /** Primary customer currency (Niger-first). Always XOF. */
  primaryCurrency: CustomerCurrency;
  /** Ordered list of customer-visible currencies — XOF first, then NGN. */
  customerCurrencies: CustomerCurrency[];
  /** USD is never customer-visible. Kept internal only. */
  usdCustomerVisible: boolean;
  services: Record<CustomerServiceId, CustomerService>;
  defaultLanguage: SupportedLanguage;
}

export const CUSTOMER_CONFIG: CustomerConfig = {
  primaryCurrency: "XOF",
  customerCurrencies: ["XOF", "NGN"],
  usdCustomerVisible: false,
  defaultLanguage: "fr",
  services: {
    cards: {
      id: "cards",
      status: "COMING_SOON",
      comingSoonLabel:
        "KoriePay Cards are coming soon. We’re building a secure card experience for everyday payments and financial access.",
    },
    airtime: {
      id: "airtime",
      status: "COMING_SOON",
      comingSoonLabel: "Airtime services are currently being prepared.",
    },
    data: {
      id: "data",
      status: "COMING_SOON",
      comingSoonLabel: "Data services are currently being prepared.",
    },
    electricity: {
      id: "electricity",
      status: "COMING_SOON",
      comingSoonLabel: "Electricity payment is currently being prepared.",
    },
    cable: {
      id: "cable",
      status: "COMING_SOON",
      comingSoonLabel: "Cable TV subscription is currently being prepared.",
    },
    bills: {
      id: "bills",
      status: "COMING_SOON",
      comingSoonLabel: "Bills payments are currently being prepared.",
    },
    fx: {
      id: "fx",
      status: "AVAILABLE",
    },
    adashi: {
      id: "adashi",
      status: "AVAILABLE",
    },
    sendMoney: {
      id: "sendMoney",
      status: "AVAILABLE",
    },
    fund: {
      id: "fund",
      status: "AVAILABLE",
    },
    merchantQr: {
      id: "merchantQr",
      status: "COMING_SOON",
      comingSoonLabel:
        "QR payments at merchants are coming soon. We’re finishing the merchant settlement rail first.",
    },
  },
};

/** Returns the configured status for a service; defaults to COMING_SOON. */
export function getServiceStatus(id: CustomerServiceId): ServiceStatus {
  return CUSTOMER_CONFIG.services[id]?.status ?? "COMING_SOON";
}

export function isServiceAvailable(id: CustomerServiceId): boolean {
  return getServiceStatus(id) === "AVAILABLE";
}

/** Sort wallets so XOF is first, NGN second, then everything else. */
export function orderCurrenciesXofFirst<
  T extends { currency: CustomerCurrency },
>(items: T[]): T[] {
  const rank: Record<string, number> = { XOF: 0, NGN: 1 };
  return [...items]
    .filter((w) => CUSTOMER_CONFIG.customerCurrencies.includes(w.currency))
    .sort((a, b) => (rank[a.currency] ?? 99) - (rank[b.currency] ?? 99));
}
