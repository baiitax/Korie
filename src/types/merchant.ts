import { SupportedLanguage } from "./customer";

export type MerchantCountry = "NG" | "NE";
export type MerchantCurrency = "NGN" | "XOF" | "USD";

export type PaymentChannel =
  | "CARD"
  | "CARD_POS"
  | "BANK_TRANSFER"
  | "QR_CODE"
  | "PAYMENT_LINK"
  | "USSD"
  | "WALLET"
  | "POS_TERMINAL";

export type PaymentStatus =
  | "SUCCESSFUL"
  | "PENDING"
  | "PROCESSING"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "DISPUTED"
  | "CANCELLED";

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type SettlementStatus =
  | "SCHEDULED"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "ON_HOLD";

export type MerchantRole =
  | "MERCHANT_OWNER"
  | "ADMIN"
  | "FINANCE_MANAGER"
  | "BRANCH_MANAGER"
  | "CASHIER"
  | "DEVELOPER"
  | "AUDITOR";

export interface MerchantOrganization {
  id: string;
  businessName: string;
  tradingName: string;
  merchantCode: string;
  cacNumber: string;
  tinNumber: string;
  email: string;
  phone: string;
  registrationNumber?: string;
  country: MerchantCountry;
  currency: MerchantCurrency;
  category: string;
  tier: "TIER_1" | "TIER_2" | "ENTERPRISE";
  kybStatus: "VERIFIED" | "PENDING";
  availableBalance: number;
  pendingSettlement: number;
  totalGrossSalesToday: number;
  totalGrossVolume: number;
  settlementBank: string;
  settlementAccountMasked: string;
  activeQRCodesCount: number;
  activePOSCount: number;
  branchesCount: number;
  createdAt: string;
}

export interface MerchantBranch {
  id: string;
  merchantId?: string;
  branchName: string;
  branchCode?: string;
  address: string;
  city: string;
  state?: string;
  stateOrRegion?: string;
  country: string;
  managerName?: string;
  virtualNuban?: string;
  posTerminalsCount?: number;
  todaySales?: number;
  todayGrossSales: number;
  todayTransactionsCount?: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface MerchantStaffUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  branchId?: string;
  branchName?: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  lastLoginAt?: string;
  permissions: string[];
}

export interface MerchantPaymentTransaction {
  id: string;
  reference: string;
  providerReference?: string;
  orderId?: string;
  invoiceId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: MerchantCurrency;
  paymentMethod: string;
  channel?: PaymentChannel;
  narration: string;
  status: string;
  branchId?: string;
  branchName: string;
  cashierName?: string;
  createdAt: string;
  settledAt?: string;
}

export interface MerchantPaymentLink {
  id: string;
  title: string;
  description?: string;
  slug: string;
  url: string;
  type?: "SINGLE" | "REUSABLE" | "SUBSCRIPTION";
  amount?: number;
  currency: MerchantCurrency;
  status: "ACTIVE" | "EXPIRED" | "PAUSED";
  totalPaymentsCount?: number;
  totalCollected: number;
  successfulPaymentsCount: number;
  totalVolume?: number;
  redirectUrl?: string;
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  total?: number;
}

export interface MerchantInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  totalAmount?: number;
  currency: MerchantCurrency;
  status: string;
  issueDate?: string;
  dueDate: string;
  virtualAccountNuban?: string;
  virtualAccountBank?: string;
  notes?: string;
  paidAmount?: number;
  paidAt?: string;
  createdAt: string;
}

export interface MerchantCustomerCRM {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  totalSpent: number;
  totalSpend?: number;
  totalTransactionsCount: number;
  transactionsCount?: number;
  lastTransactionDate: string;
  lastPurchaseDate?: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface MerchantSettlementBatch {
  id: string;
  batchReference: string;
  nibssSessionId: string;
  settlementDate?: string;
  grossAmount: number;
  totalFees: number;
  processingFees?: number;
  refundsDeducted?: number;
  netAmount: number;
  currency: MerchantCurrency;
  bankName: string;
  accountNumber: string;
  settlementBank?: string;
  settlementAccountMasked?: string;
  status: string;
  reference?: string;
  transactionCount: number;
  transactionsIncludedCount?: number;
  settledAt: string;
}

export interface MerchantDisputeRecord {
  id: string;
  disputeReference?: string;
  transactionReference?: string;
  customerName: string;
  amount: number;
  currency: MerchantCurrency;
  reason: string;
  status: string;
  evidenceDeadline?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface MerchantApiKey {
  id: string;
  keyName: string;
  name?: string;
  publicKey: string;
  secretKeyMasked: string;
  environment: "PRODUCTION" | "SANDBOX";
  lastUsedAt?: string;
  createdAt: string;
}

export interface MerchantWebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: "ACTIVE" | "FAILING" | "DISABLED";
  secretMasked?: string;
  successRate?: number;
  lastDelivery?: string;
}
