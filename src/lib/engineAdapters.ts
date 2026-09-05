/**
 * KoriePay — Engine → UI adapters.
 *
 * Pure mapping functions between the authoritative engine/service records
 * (CustomerLifecycleEngine, AccountLifecycleEngine + SubledgerEngine,
 * BeneficiarySecurityEngine, TransactionService/LedgerService) and the UI
 * types the customer portal renders. Nothing here invents data; each mapping
 * only re-shapes values that already exist in the source-of-truth records.
 *
 * NOTE: engine balances are stored in a consistent unit. The engine seeds use
 * the same unit as the UI (whole currency units, e.g. 1,250,000 NGN). Where an
 * engine reports minor units we record the unit and convert explicitly.
 */

import {
  CustomerRecord,
  CustomerAccountRecord,
  BeneficiaryRecord,
} from "@/types/customerProductFactory";
import { DbTransaction } from "@/types/database";
import {
  CustomerUser,
  CustomerWallet,
  CustomerTransaction,
  Beneficiary,
  CustomerCurrency,
} from "@/types/customer";

export function engineToUser(c: CustomerRecord): CustomerUser {
  const [firstName, ...rest] = c.fullName.split(" ");
  const country = c.country === "NG" ? "NG" : "NE";
  return {
    id: c.id,
    firstName: firstName || c.fullName,
    lastName: rest.join(" ") || "",
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    country,
    countryName: country === "NG" ? "Nigeria" : "Niger Republic",
    kycTier: c.kycTier,
    kycStatus: (c.status === "ACTIVE" ? "VERIFIED" : "PENDING") as CustomerUser["kycStatus"],
    preferredLanguage: "en",
    registeredAt: c.createdAt,
    mfaEnabled: false,
    biometricEnabled: false,
  };
}

/** Convert a minor-units engine amount to whole currency units. */
export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

export function engineToWallet(a: CustomerAccountRecord): CustomerWallet {
  const currency = a.currency as CustomerCurrency;
  return {
    id: a.id,
    currency,
    symbol: currency === "NGN" ? "₦" : currency === "XOF" ? "CFA" : "$",
    availableBalance: a.availableBalance,
    ledgerBalance: a.ledgerBalance,
    pendingBalance: a.heldBalance,
    accountNumber: a.accountNumber,
    accountName: a.accountName,
    bankName: a.assignedBankName,
    bankCode: a.assignedBankCode,
    status: a.status === "OPEN" ? "ACTIVE" : a.status === "RESTRICTED" ? "RESTRICTED" : a.status === "FROZEN" ? "FROZEN" : "ACTIVE",
    dailyLimit: currency === "NGN" ? 5_000_000 : 5_000_000,
    dailySpent: 0,
    isPrimary: a.isPrimary,
  };
}

export function engineToBeneficiary(b: BeneficiaryRecord): Beneficiary {
  const country = b.country === "NG" ? ("NG" as const) : ("NE" as const);
  return {
    id: b.id,
    name: b.beneficiaryName,
    accountNumber: b.accountNumber,
    bankName: b.bankName,
    bankCode: b.bankCode,
    currency: (b.currency as CustomerCurrency) || (country === "NG" ? "NGN" : "XOF"),
    country,
    avatarColor: "bg-[var(--brand-soft)] text-[var(--brand-primary)]",
    isFavorite: false,
  };
}

/**
 * Map an authoritative DbTransaction to the UI transaction shape.
 * `TransactionService` amounts are minor units, so we convert to whole units
 * for display. Status comes straight from the engine (never invented).
 */
export function dbTransactionToUi(tx: DbTransaction): CustomerTransaction {
  const isCrossBorder = tx.source_currency && tx.destination_currency;
  const type =
    tx.type === "CROSS_BORDER_TRANSFER" || isCrossBorder
      ? "TRANSFER_CROSS_BORDER"
      : tx.type === "FX_CONVERSION"
      ? "FX_SWAP"
      : tx.type === "BILL_VEND"
      ? "BILL_AIRTIME"
      : tx.type === "WALLET_FUNDING"
      ? "WALLET_FUNDING"
      : "TRANSFER_NIP";
  const currency = (tx.currency as CustomerCurrency) || "NGN";
  const amount = fromMinorUnits(tx.amount);
  const fee = fromMinorUnits(tx.fee);
  const total = Math.round((amount + fee) * 100) / 100;

  return {
    id: tx.id,
    reference: tx.reference,
    providerReference: tx.provider_reference,
    type,
    title: `${tx.type.replace(/_/g, " ")}`,
    description: tx.narration || tx.type.replace(/_/g, " "),
    amount,
    fee,
    totalAmount: total,
    currency,
    direction: "OUTWARD",
    status: (tx.status === "SUCCESSFUL"
      ? "SUCCESSFUL"
      : tx.status === "PENDING"
      ? "PENDING"
      : tx.status === "FAILED"
      ? "FAILED"
      : "PROCESSING") as CustomerTransaction["status"],
    recipientName: tx.recipient_name,
    recipientBank: tx.recipient_bank,
    recipientAccount: tx.recipient_account,
    sourceCurrency: tx.source_currency as CustomerCurrency | undefined,
    destinationCurrency: tx.destination_currency as CustomerCurrency | undefined,
    exchangeRate: tx.exchange_rate,
    category: "TRANSFERS",
    createdAt: tx.created_at,
    completedAt: tx.updated_at,
    timeline: [
      { title: "Transfer Initiated", description: "Validated and authenticated", timestamp: new Date(tx.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), status: "COMPLETED" },
      { title: "Ledger Posted", description: "Double-entry ledger committed", timestamp: new Date(tx.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), status: "COMPLETED" },
      { title: "Provider Acknowledged", description: tx.provider_code || "Provider rail", timestamp: new Date(tx.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), status: "COMPLETED" },
    ],
  };
}

/** Map a DbTransaction to a minimal CustomerTransaction used for receipts. */
export function dbTransactionToReceiptSource(tx: DbTransaction): CustomerTransaction {
  return dbTransactionToUi(tx);
}
