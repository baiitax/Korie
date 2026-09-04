import { SupportedLanguage } from "./customer";

export type AgentCountry = "NG" | "NE";

export type AgentCurrency = "NGN" | "XOF";

export type LiquidityHealthStatus = "HEALTHY" | "WATCH" | "LOW" | "CRITICAL";

export type AgencyTransactionType =
  | "CASH_IN"
  | "CASH_OUT"
  | "TRANSFER_NIP"
  | "TRANSFER_CROSS_BORDER"
  | "BILL_AIRTIME"
  | "BILL_DATA"
  | "BILL_ELECTRICITY"
  | "BILL_CABLE_TV";

export type AgencyTransactionStatus =
  | "INITIATED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCESSFUL"
  | "FAILED"
  | "REVERSED"
  | "CANCELLED"
  | "DISPUTED";

export interface AgentUser {
  id: string;
  agentCode: string;
  agentName: string;
  businessName: string;
  phone: string;
  email: string;
  country: AgentCountry;
  countryName: string;
  stateOrRegion: string;
  cityOrLGA: string;
  tier: "TIER_1" | "TIER_2" | "SUPER_AGENT";
  status: "ACTIVE" | "SUSPENDED" | "RESTRICTED";
  kycStatus: "VERIFIED" | "PENDING";
  preferredLanguage: SupportedLanguage;
  terminalId: string;
  dailyCashLimit: number;
  dailyCashSpent: number;
  commissionBalance: number;
}

export interface AgentLiquidity {
  walletFloat: number;
  cashInHand: number;
  totalLiquidity: number;
  reservedFloat: number;
  pendingSettlement: number;
  currency: AgentCurrency;
  health: LiquidityHealthStatus;
  cashThresholdMin: number;
  todayCashInVolume: number;
  todayCashOutVolume: number;
}

export interface AgentCustomer {
  id: string;
  fullName: string;
  phone: string;
  accountNumberMasked: string;
  bankName: string;
  bankCode: string;
  kycTier: "TIER_1" | "TIER_2" | "TIER_3";
  isVerified: boolean;
  totalTransactionsCount: number;
  lastActivityDate: string;
}

export interface AgencyTransaction {
  id: string;
  reference: string;
  providerReference?: string;
  type: AgencyTransactionType;
  title: string;
  amount: number;
  customerFee: number;
  agentCommission: number;
  totalAmount: number;
  currency: AgentCurrency;
  status: AgencyTransactionStatus;
  customerName: string;
  customerPhone?: string;
  customerAccount?: string;
  customerBank?: string;
  terminalId: string;
  agentId: string;
  billerProvider?: string;
  billerToken?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AgentCommissionRecord {
  id: string;
  transactionReference: string;
  serviceType: AgencyTransactionType;
  transactionAmount: number;
  commissionEarned: number;
  currency: AgentCurrency;
  status: "EARNED" | "PENDING_SETTLEMENT" | "PAID";
  timestamp: string;
}

export interface DailyCashReconciliation {
  id: string;
  reconciliationDate: string;
  openingCash: number;
  todayCashIn: number;
  todayCashOut: number;
  expectedClosingCash: number;
  actualPhysicalCash: number;
  difference: number;
  status: "BALANCED" | "DISCREPANCY" | "SUBMITTED" | "APPROVED";
  notes?: string;
  submittedAt: string;
  reviewedBy?: string;
}

export interface AgentTerminalInfo {
  terminalId: string;
  model: string;
  serialNumber: string;
  status: "ACTIVE" | "OFFLINE" | "MAINTENANCE";
  batteryLevel: number;
  networkType: "4G" | "WIFI" | "GPRS";
  signalStrength: number;
  lastSyncTime: string;
  appVersion: string;
}

export interface AgencyRiskAlert {
  id: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  transactionReference?: string;
  timestamp: string;
  isResolved: boolean;
}
