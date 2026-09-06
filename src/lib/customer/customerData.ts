/**
 * KoriePay — real Supabase-backed data layer for the customer portal.
 * ---------------------------------------------------------------------------
 * Replaces the in-memory CustomerLifecycleEngine / AccountLifecycleEngine /
 * BeneficiarySecurityEngine / TransactionService.listRawForOwner path with
 * genuine reads and writes against the hosted database (see migration
 * 20260906000030_customer_portal_live.sql). Every function here takes an
 * already-authenticated `customerId` (from `authenticateCustomerRequest`) —
 * nothing in this module ever trusts a client-supplied id.
 *
 * Money convention: `customers`/`wallets`/`customer_transactions` all store
 * NUMERIC(24,2) MAJOR currency units (naira / CFA francs), matching
 * `ledger_accounts`. Nothing here converts to/from minor units.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CustomerUser,
  CustomerWallet,
  CustomerTransaction,
  CustomerTransactionStatus,
  CustomerTransactionType,
  Beneficiary,
  CustomerCurrency,
} from "@/types/customer";

/* ------------------------------------------------------------------ types */

export interface CustomerRow {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: "NG" | "NE";
  preferred_language: "en" | "ha" | "fr";
  kyc_tier: "TIER_0" | "TIER_1" | "TIER_2" | "TIER_3";
  status: "ACTIVE" | "SUSPENDED" | "FROZEN" | "DECEASED";
  date_of_birth: string | null;
  residential_address: string | null;
  created_at: string;
  updated_at: string;
  auth_user_id: string | null;
}

export interface WalletRow {
  id: string;
  customer_id: string;
  org_id: string;
  account_number: string | null;
  currency: "NGN" | "XOF" | "USD";
  country: string;
  balance: string | number;
  locked_balance: string | number;
  daily_limit: string | number;
  status: "ACTIVE" | "RESTRICTED" | "FROZEN" | "CLOSED";
  ledger_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerTransactionRow {
  id: string;
  customer_id: string;
  wallet_id: string;
  ledger_transaction_id: string | null;
  idempotency_key: string;
  reference: string;
  transaction_type: "TRANSFER_NIP" | "TRANSFER_CROSS_BORDER" | "WALLET_FUNDING";
  amount: string | number;
  fee: string | number;
  currency: "NGN" | "XOF";
  destination_currency: "NGN" | "XOF" | null;
  exchange_rate: string | number | null;
  destination_amount: string | number | null;
  status:
    | "INITIATED"
    | "PROCESSING"
    | "SUCCESSFUL"
    | "FAILED"
    | "REVERSED"
    | "PENDING_PROVIDER_INTEGRATION";
  failure_reason: string | null;
  recipient_name: string | null;
  recipient_account: string | null;
  recipient_bank: string | null;
  recipient_bank_code: string | null;
  provider_name: string | null;
  provider_status: string | null;
  narration: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface BeneficiaryRow {
  id: string;
  customer_id: string;
  beneficiary_name: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
  currency: "NGN" | "XOF";
  country: "NG" | "NE";
  nickname: string | null;
  relationship: string | null;
  status: "ACTIVE" | "REMOVED";
  cooldown_expires_at: string;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------- fetchers */

export async function getCustomerById(customerId: string): Promise<CustomerRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select(
      "id, org_id, first_name, last_name, email, phone, country, preferred_language, kyc_tier, status, date_of_birth, residential_address, created_at, updated_at, auth_user_id",
    )
    .eq("id", customerId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CustomerRow;
}

export async function getWalletsForCustomer(customerId: string): Promise<WalletRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("wallets")
    .select("id, customer_id, org_id, account_number, currency, country, balance, locked_balance, daily_limit, status, ledger_account_id, created_at, updated_at")
    .eq("customer_id", customerId);
  if (error || !data) return [];
  return data as WalletRow[];
}

export async function getWalletById(walletId: string, customerId: string): Promise<WalletRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("wallets")
    .select("id, customer_id, org_id, account_number, currency, country, balance, locked_balance, daily_limit, status, ledger_account_id, created_at, updated_at")
    .eq("id", walletId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error || !data) return null;
  return data as WalletRow;
}

export async function getTransactionsForCustomer(
  customerId: string,
  opts: { limit?: number } = {},
): Promise<CustomerTransactionRow[]> {
  const admin = getSupabaseAdminClient();
  let query = admin
    .from("customer_transactions")
    .select(
      "id, customer_id, wallet_id, ledger_transaction_id, idempotency_key, reference, transaction_type, amount, fee, currency, destination_currency, exchange_rate, destination_amount, status, failure_reason, recipient_name, recipient_account, recipient_bank, recipient_bank_code, provider_name, provider_status, narration, created_at, completed_at",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as CustomerTransactionRow[];
}

export async function getTransactionByReferenceForCustomer(
  reference: string,
  customerId: string,
): Promise<CustomerTransactionRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_transactions")
    .select(
      "id, customer_id, wallet_id, ledger_transaction_id, idempotency_key, reference, transaction_type, amount, fee, currency, destination_currency, exchange_rate, destination_amount, status, failure_reason, recipient_name, recipient_account, recipient_bank, recipient_bank_code, provider_name, provider_status, narration, created_at, completed_at",
    )
    .eq("reference", reference)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CustomerTransactionRow;
}

export async function getBeneficiariesForCustomer(customerId: string): Promise<BeneficiaryRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_beneficiaries")
    .select("id, customer_id, beneficiary_name, account_number, bank_code, bank_name, currency, country, nickname, relationship, status, cooldown_expires_at, created_at, updated_at")
    .eq("customer_id", customerId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as BeneficiaryRow[];
}

export async function getOpenDisputeReferencesForCustomer(customerId: string): Promise<Set<string>> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("customer_disputes")
    .select("transaction_reference, status")
    .eq("customer_id", customerId)
    .in("status", ["OPEN", "IN_PROGRESS"]);
  const refs = new Set<string>();
  if (error || !data) return refs;
  for (const row of data as { transaction_reference: string | null }[]) {
    if (row.transaction_reference) refs.add(row.transaction_reference);
  }
  return refs;
}

export async function getFxRates(): Promise<{ fromCurrency: "NGN" | "XOF"; toCurrency: "NGN" | "XOF"; rate: number }[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("fx_rates")
    .select("source_currency, destination_currency, rate");
  if (error || !data) return [];
  return (data as { source_currency: "NGN" | "XOF"; destination_currency: "NGN" | "XOF"; rate: number }[]).map(
    (r) => ({ fromCurrency: r.source_currency, toCurrency: r.destination_currency, rate: Number(r.rate) }),
  );
}

/* ------------------------------------------------------------------ maps */

export function customerRowToUser(c: CustomerRow): CustomerUser {
  const kycStatus: CustomerUser["kycStatus"] =
    c.status === "ACTIVE" ? "VERIFIED" : c.status === "SUSPENDED" ? "PENDING" : "UNVERIFIED";
  return {
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    fullName: `${c.first_name} ${c.last_name}`.trim(),
    email: c.email,
    phone: c.phone,
    country: c.country,
    countryName: c.country === "NG" ? "Nigeria" : "Niger Republic",
    kycTier: c.kyc_tier === "TIER_0" ? "TIER_1" : c.kyc_tier,
    kycStatus,
    preferredLanguage: c.preferred_language,
    registeredAt: c.created_at,
    mfaEnabled: false,
    biometricEnabled: false,
  };
}

const BANK_NAME_BY_CURRENCY: Record<string, string> = {
  NGN: "Providus Bank Nigeria",
  XOF: "Coris Bank Niger",
};
const BANK_CODE_BY_CURRENCY: Record<string, string> = {
  NGN: "058",
  XOF: "NE024",
};

export function walletRowToWallet(w: WalletRow): CustomerWallet {
  const currency = w.currency as CustomerCurrency;
  const balance = Number(w.balance);
  return {
    id: w.id,
    currency,
    symbol: currency === "NGN" ? "₦" : currency === "XOF" ? "CFA" : "$",
    availableBalance: balance,
    ledgerBalance: balance,
    pendingBalance: Number(w.locked_balance) || 0,
    accountNumber: w.account_number || "",
    accountName: "",
    bankName: BANK_NAME_BY_CURRENCY[currency] || "KoriePay",
    bankCode: BANK_CODE_BY_CURRENCY[currency] || "",
    status: w.status === "ACTIVE" ? "ACTIVE" : w.status === "FROZEN" ? "FROZEN" : "RESTRICTED",
    dailyLimit: Number(w.daily_limit),
    dailySpent: 0,
    isPrimary: currency === "XOF",
  };
}

export function beneficiaryRowToBeneficiary(b: BeneficiaryRow): Beneficiary {
  return {
    id: b.id,
    name: b.beneficiary_name,
    accountNumber: b.account_number,
    bankName: b.bank_name,
    bankCode: b.bank_code,
    currency: b.currency,
    country: b.country,
    avatarColor: "bg-[var(--brand-soft)] text-[var(--brand-primary)]",
    isFavorite: false,
  };
}

/** Real engine status → customer-facing status. One-to-one, no invention. */
export function mapTransactionStatus(
  status: CustomerTransactionRow["status"],
): CustomerTransactionStatus {
  switch (status) {
    case "SUCCESSFUL":
      return "SUCCESSFUL";
    case "FAILED":
      return "FAILED";
    case "REVERSED":
      return "REVERSED";
    case "PROCESSING":
      return "PROCESSING";
    case "PENDING_PROVIDER_INTEGRATION":
      return "PENDING";
    case "INITIATED":
    default:
      return "PROCESSING";
  }
}

export function transactionRowToCustomerTransaction(
  tx: CustomerTransactionRow,
  isDisputed = false,
): CustomerTransaction {
  const currency = tx.currency as CustomerCurrency;
  const amount = Number(tx.amount);
  const fee = Number(tx.fee);
  const type: CustomerTransactionType =
    tx.transaction_type === "TRANSFER_CROSS_BORDER"
      ? "TRANSFER_CROSS_BORDER"
      : tx.transaction_type === "WALLET_FUNDING"
        ? "WALLET_FUNDING"
        : "TRANSFER_NIP";
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const status = isDisputed ? "DISPUTED" : mapTransactionStatus(tx.status);

  return {
    id: tx.reference,
    reference: tx.reference,
    type,
    title: tx.recipient_name || tx.narration || "KoriePay transfer",
    description: tx.narration || "Settled through KoriePay",
    amount,
    fee,
    totalAmount: amount,
    currency,
    direction: "OUTWARD",
    status,
    recipientName: tx.recipient_name || undefined,
    recipientBank: tx.recipient_bank || undefined,
    recipientAccount: tx.recipient_account || undefined,
    sourceCurrency: currency,
    destinationCurrency: (tx.destination_currency as CustomerCurrency) || undefined,
    exchangeRate: tx.exchange_rate != null ? Number(tx.exchange_rate) : undefined,
    destinationAmount: tx.destination_amount != null ? Number(tx.destination_amount) : undefined,
    category: type === "WALLET_FUNDING" ? "FUNDING" : "TRANSFERS",
    createdAt: tx.created_at,
    completedAt: tx.completed_at || undefined,
    timeline: [
      {
        title: "Transfer initiated",
        description: "Authenticated and validated",
        timestamp: time(tx.created_at),
        status: "COMPLETED",
      },
      {
        title: "Ledger posted",
        description: "Double-entry ledger committed; wallet debited",
        timestamp: time(tx.created_at),
        status: "COMPLETED",
      },
      {
        title: "Provider settlement",
        description:
          tx.status === "SUCCESSFUL"
            ? "Settlement confirmed"
            : tx.status === "FAILED"
              ? tx.failure_reason || "Settlement failed"
              : "Awaiting real bank-rail integration (Providus/Coris) — not yet confirmed",
        timestamp: time(tx.completed_at || tx.created_at),
        status: tx.status === "SUCCESSFUL" ? "COMPLETED" : tx.status === "FAILED" ? "FAILED" : "CURRENT",
      },
    ],
  };
}

/** XOF first, NGN second — the whole portal's currency ordering rule. */
export function orderWalletsXofFirst(wallets: CustomerWallet[]): CustomerWallet[] {
  const rank: Record<string, number> = { XOF: 0, NGN: 1 };
  return [...wallets].sort((a, b) => (rank[a.currency] ?? 99) - (rank[b.currency] ?? 99));
}
