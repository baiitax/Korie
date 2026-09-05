export type CurrencyCode = 'NGN' | 'XOF' | 'USD';

export type LedgerAccountType = 
  | 'ASSET'       // e.g. Settlement Pool, Bank Reserve at Providus / Coris
  | 'LIABILITY'   // e.g. Customer Wallet Balance, Merchant Escrow Balance
  | 'EQUITY'      // e.g. KoriePay Capital Reserve
  | 'REVENUE'     // e.g. Transaction Fees, Cross-Border FX Margins, Interchange
  | 'EXPENSE';    // e.g. Provider Network Fees, NIP Switch Fees, SMS Gateway Fees

export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export type LedgerPostingStatus = 'PENDING' | 'COMMITTED' | 'REVERSED' | 'DISPUTED';

export type MinorUnitsAmount = number; // Always integer representing kobo / minor units (e.g. ₦1,000.00 = 100000)

export interface Money {
  amount: MinorUnitsAmount;
  currency: CurrencyCode;
  precision: number; // 2 for NGN, 0 for XOF, 2 for USD
  formatted: string;
}

export interface LedgerAccount {
  id: string;
  orgId: string;
  accountNumber: string;
  name: string;
  type: LedgerAccountType;
  currency: CurrencyCode;
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  balance: MinorUnitsAmount;
  lockedBalance: MinorUnitsAmount;
  availableBalance: MinorUnitsAmount;
  status: 'ACTIVE' | 'RESTRICTED' | 'FROZEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  accountName?: string;
  entryType: LedgerEntryType;
  amount: MinorUnitsAmount;
  currency: CurrencyCode;
  narration: string;
  createdAt: string;
}

export interface LedgerTransaction {
  id: string;
  orgId: string;
  transactionReference: string;
  externalReference?: string;
  description: string;
  totalAmount: MinorUnitsAmount;
  currency: CurrencyCode;
  status: LedgerPostingStatus;
  entries: LedgerEntry[];
  outboxEventId?: string;
  postedAt: string;
  createdAt: string;
}

export interface LedgerAccountBalance {
  accountId: string;
  currency: CurrencyCode;
  totalDebits: MinorUnitsAmount;
  totalCredits: MinorUnitsAmount;
  computedBalance: MinorUnitsAmount;
  lockedBalance: MinorUnitsAmount;
  availableBalance: MinorUnitsAmount;
  lastReconciledAt: string;
}

export interface WalletHold {
  id: string;
  walletId: string;
  accountId: string;
  amount: MinorUnitsAmount;
  currency: CurrencyCode;
  reason: string;
  reference: string;
  status: 'ACTIVE' | 'RELEASED' | 'CAPTURED';
  expiresAt: string;
  createdAt: string;
}
