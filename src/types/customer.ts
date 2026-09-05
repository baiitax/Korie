export type SupportedLanguage = "en" | "ha" | "fr";

export type CustomerCountry = "NG" | "NE";

export type CustomerCurrency = "NGN" | "XOF" | "USD";

export type CustomerTransactionType =
  | "TRANSFER_NIP"
  | "TRANSFER_CROSS_BORDER"
  | "TRANSFER_INTERNAL"
  | "BILL_AIRTIME"
  | "BILL_DATA"
  | "BILL_ELECTRICITY"
  | "BILL_CABLE_TV"
  | "CARD_PURCHASE"
  | "WALLET_FUNDING"
  | "AGENT_CASH_OUT"
  | "FX_SWAP";

export type CustomerTransactionStatus =
  | "SUCCESSFUL"
  | "PENDING"
  | "PROCESSING"
  | "FAILED"
  | "REVERSED"
  | "CANCELLED"
  /** Real engine state (ledger DISPUTED) — was missing from the UI set, which
   *  meant a disputed row could not be rendered honestly. */
  | "DISPUTED";

export interface CustomerUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  country: CustomerCountry;
  countryName: string;
  avatarUrl?: string;
  kycTier: "TIER_1" | "TIER_2" | "TIER_3";
  kycStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" | "REJECTED";
  preferredLanguage: SupportedLanguage;
  bvnMasked?: string;
  ninMasked?: string;
  cniMasked?: string;
  registeredAt: string;
  mfaEnabled: boolean;
  biometricEnabled: boolean;
}

export interface CustomerWallet {
  id: string;
  currency: CustomerCurrency;
  symbol: string;
  availableBalance: number;
  ledgerBalance: number;
  pendingBalance: number;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  status: "ACTIVE" | "FROZEN" | "RESTRICTED";
  dailyLimit: number;
  dailySpent: number;
  isPrimary: boolean;
}

export interface CustomerTransactionTimelineEvent {
  title: string;
  description: string;
  timestamp: string;
  status: "COMPLETED" | "CURRENT" | "FAILED";
}

export interface CustomerTransaction {
  id: string;
  reference: string;
  providerReference?: string;
  type: CustomerTransactionType;
  title: string;
  description: string;
  amount: number;
  fee: number;
  totalAmount: number;
  currency: CustomerCurrency;
  direction: "INWARD" | "OUTWARD";
  status: CustomerTransactionStatus;
  recipientName?: string;
  recipientBank?: string;
  recipientAccount?: string;
  senderName?: string;
  senderBank?: string;
  senderAccount?: string;
  sourceCurrency?: CustomerCurrency;
  destinationCurrency?: CustomerCurrency;
  exchangeRate?: number;
  destinationAmount?: number;
  billerCategory?: string;
  billerProvider?: string;
  billerCustomerToken?: string;
  timeline: CustomerTransactionTimelineEvent[];
  createdAt: string;
  completedAt?: string;
  category: "TRANSFERS" | "BILLS" | "CARDS" | "FX" | "FUNDING";
}

export interface Beneficiary {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  currency: CustomerCurrency;
  country: CustomerCountry;
  avatarColor: string;
  lastTransferDate?: string;
  isFavorite: boolean;
}

export interface VirtualCard {
  id: string;
  cardholderName: string;
  maskedPan: string;
  expiryMonth: string;
  expiryYear: string;
  cardType: "VIRTUAL" | "PHYSICAL";
  brand: "VISA" | "MASTERCARD";
  currency: CustomerCurrency;
  balance: number;
  spendingLimitMonthly: number;
  spentThisMonth: number;
  status: "ACTIVE" | "FROZEN" | "BLOCKED";
  billingAddress: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: "TRANSACTION_DISPUTE" | "ACCOUNT_ACCESS" | "KYC" | "BILL_PAYMENT" | "GENERAL";
  transactionReference?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  lastReplyBy: string;
  lastReplyAt: string;
  createdAt: string;
  messages: {
    id: string;
    sender: "CUSTOMER" | "SUPPORT_AGENT";
    senderName: string;
    message: string;
    timestamp: string;
    attachments?: string[];
  }[];
}

export interface SecuritySession {
  id: string;
  deviceName: string;
  browser: string;
  ipAddressMasked: string;
  locationApprox: string;
  isCurrentSession: boolean;
  lastActive: string;
  createdAt: string;
}

export interface TrustedDevice {
  id: string;
  deviceName: string;
  deviceType: "MOBILE_IOS" | "MOBILE_ANDROID" | "DESKTOP";
  lastUsed: string;
  registeredAt: string;
}

export interface FXRateQuote {
  fromCurrency: CustomerCurrency;
  toCurrency: CustomerCurrency;
  buyRate: number;
  sellRate: number;
  midRate: number;
  spreadPercent: number;
  lastUpdated: string;
  source: string;
}

export interface BillProviderOption {
  id: string;
  name: string;
  code: string;
  category: "AIRTIME" | "DATA" | "ELECTRICITY" | "CABLE_TV" | "INTERNET";
  country: CustomerCountry;
  logoIcon: string;
  plans?: {
    id: string;
    name: string;
    amount: number;
    validity?: string;
  }[];
}
