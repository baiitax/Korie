import { SupportedLanguage } from "./customer";

export type AggregatorCountry = "NG" | "NE";
export type AggregatorCurrency = "NGN" | "XOF" | "USD";

export type AggregatorRole =
  | "AGGREGATOR_OWNER"
  | "AGGREGATOR_ADMIN"
  | "OPERATIONS_MANAGER"
  | "FINANCE_MANAGER"
  | "COMPLIANCE_OFFICER"
  | "RISK_OFFICER"
  | "FIELD_OFFICER"
  | "AUDITOR"
  | "ANALYST";

export type AggregatorAgentStatus =
  | "ACTIVE"
  | "PENDING"
  | "SUSPENDED"
  | "INACTIVE"
  | "RESTRICTED"
  | "DEACTIVATED";

export type AggregatorMerchantStatus =
  | "ACTIVE"
  | "PENDING"
  | "SUSPENDED"
  | "RESTRICTED"
  | "INACTIVE"
  | "CLOSED";

export type AggregatorTxStatus =
  | "INITIATED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCESSFUL"
  | "FAILED"
  | "REVERSED"
  | "CANCELLED"
  | "REFUNDED"
  | "DISPUTED";

export type AggregatorTxType =
  | "CASH_IN"
  | "CASH_OUT"
  | "TRANSFER"
  | "PAYMENT"
  | "BILL_PAYMENT"
  | "AIRTIME"
  | "DATA"
  | "PAYMENT_LINK"
  | "INVOICE"
  | "REFUND"
  | "PAYOUT"
  | "SETTLEMENT"
  | "REVERSAL"
  | "LIQUIDITY_FLOAT";

export type NetworkHealthStatus = "HEALTHY" | "NORMAL" | "WATCH" | "DEGRADED" | "CRITICAL";

export interface AggregatorOrganization {
  id: string;
  name: string;
  code: string;
  rcNumber: string;
  country: AggregatorCountry;
  currency: AggregatorCurrency;
  tier: "TIER_1_SUPER_AGGREGATOR" | "TIER_2_REGIONAL_AGGREGATOR";
  status: "ACTIVE" | "SUSPENDED" | "REVIEW";
  territoriesCovered: string[];
  headquarters: string;
  contactEmail: string;
  contactPhone: string;
  walletBalance: number;
  availableLiquidity: number;
  escrowBalance: number;
  pendingCommissions: number;
  settledCommissionsThisMonth: number;
  totalNetworkTPVToday: number;
  totalNetworkTPVMonth: number;
  totalNetworkTransactionsToday: number;
  activeAgentsCount: number;
  inactiveAgentsCount: number;
  activeMerchantsCount: number;
  inactiveMerchantsCount: number;
  settlementBank: string;
  settlementAccountMasked: string;
  providerNodeNG: "Providus Bank Nigeria (Connected)" | "Providus Bank (Degraded)" | "Awaiting Provider";
  providerNodeNE: "Coris Bank Niger Republic (Connected)" | "Coris Bank (Degraded)" | "Awaiting Provider";
  createdAt: string;
}

export interface AggregatedAgent {
  id: string;
  agentCode: string;
  fullName: string;
  businessName: string;
  phone: string;
  email?: string;
  country: AggregatorCountry;
  state: string;
  lga: string;
  territoryId: string;
  territoryName: string;
  branchName?: string;
  status: AggregatorAgentStatus;
  kycTier: "TIER_1" | "TIER_2" | "TIER_3";
  kycStatus: "VERIFIED" | "PENDING_REVIEW" | "ACTION_REQUIRED" | "EXPIRED";
  walletBalance: number;
  cashInDrawer: number;
  totalLiquidity: number;
  todayTransactionsCount: number;
  todayVolume: number;
  todayCommission: number;
  monthlyVolume: number;
  successRate: number;
  posTerminalCount: number;
  lastActiveAt: string;
  riskStatus: "LOW" | "MEDIUM" | "HIGH" | "FLAGGED";
  registeredAt: string;
}

export interface AggregatedMerchant {
  id: string;
  merchantCode: string;
  businessName: string;
  tradingName: string;
  contactPerson: string;
  phone: string;
  email: string;
  country: AggregatorCountry;
  category: string;
  territoryName: string;
  branchName: string;
  status: AggregatorMerchantStatus;
  kybStatus: "VERIFIED" | "PENDING_REVIEW" | "REJECTED";
  todayVolume: number;
  todayTxCount: number;
  monthVolume: number;
  averageTicket: number;
  settlementBank: string;
  settlementAccountMasked: string;
  disputeRate: number;
  refundRate: number;
  riskState: "NORMAL" | "WATCH" | "HIGH_RISK";
  lastActivityAt: string;
  registeredAt: string;
}

export interface AggregatedTerritory {
  id: string;
  name: string;
  code: string;
  country: AggregatorCountry;
  stateOrRegion: string;
  lgaOrCommune: string;
  supervisorName: string;
  supervisorPhone: string;
  activeAgentsCount: number;
  activeMerchantsCount: number;
  todayTPV: number;
  monthlyTPV: number;
  aggregatorCommissionToday: number;
  liquidityHealth: NetworkHealthStatus;
  riskLevel: "LOW" | "ELEVATED" | "CRITICAL";
}

export interface AggregatorTransactionTimelineStep {
  stage: "CREATED" | "INITIATED" | "PROCESSING" | "PROVIDER_DISPATCH" | "CONFIRMED" | "LEDGER_POSTED" | "SETTLED";
  timestamp: string;
  status: "COMPLETED" | "CURRENT" | "FAILED" | "PENDING";
  description: string;
}

export interface AggregatorTransaction {
  id: string;
  reference: string;
  correlationId: string;
  providerReference: string;
  entityType: "AGENT" | "MERCHANT" | "AGGREGATOR_DIRECT";
  agentId?: string;
  agentName?: string;
  merchantId?: string;
  merchantName?: string;
  customerName: string;
  customerPhone?: string;
  country: AggregatorCountry;
  territoryName: string;
  type: AggregatorTxType;
  channel: "CARD_POS" | "BANK_TRANSFER" | "QR_CODE" | "USSD" | "WALLET" | "PAYMENT_LINK";
  amount: number;
  fee: number;
  agentCommission: number;
  aggregatorCommission: number;
  netSettledToEntity: number;
  currency: AggregatorCurrency;
  status: AggregatorTxStatus;
  providerNode: string;
  failureReason?: string;
  settlementStatus: "SCHEDULED" | "SETTLED" | "PENDING" | "EXCLUDED";
  createdAt: string;
  timeline: AggregatorTransactionTimelineStep[];
}

export interface AggregatorLiquidityPosition {
  aggregatorMainWallet: number;
  aggregatorReserveWallet: number;
  totalAgentFloatLiquidity: number;
  totalMerchantSettlementFloat: number;
  estimatedCashInNetworkDrawer: number;
  networkLiquidityHealth: NetworkHealthStatus;
  agentsUnderMinimumThresholdCount: number;
  agentsRequiringFloatCount: number;
}

export interface AggregatorCommissionSummary {
  todayEarned: number;
  thisWeekEarned: number;
  thisMonthEarned: number;
  pendingClearance: number;
  approvedForPayout: number;
  settledToBank: number;
  lifetimeTotal: number;
  byService: {
    serviceName: string;
    volume: number;
    commission: number;
    percentage: number;
  }[];
}

export interface AggregatorSettlementRecord {
  id: string;
  batchReference: string;
  nibssSessionId?: string;
  providerRef: string;
  settlementDate: string;
  grossNetworkVolume: number;
  totalInterchangeFees: number;
  refundsAdjusted: number;
  netAggregatorCommissionSettled: number;
  currency: AggregatorCurrency;
  destinationBank: string;
  destinationAccountMasked: string;
  status: "SCHEDULED" | "PROCESSING" | "COMPLETED" | "FAILED" | "ON_HOLD";
  includedTransactionsCount: number;
  settledAt?: string;
}

export interface AggregatorReconciliationRecord {
  id: string;
  date: string;
  channelOrEntity: string;
  providerNode: string;
  internalLedgerTotal: number;
  providerGatewayTotal: number;
  bankSettledTotal: number;
  varianceAmount: number;
  variancePercentage: number;
  status: "MATCHED" | "PARTIALLY_MATCHED" | "MISMATCH" | "MISSING" | "PENDING_REVIEW" | "RESOLVED";
  discrepancyCount: number;
  notes?: string;
}

export interface AggregatorExceptionRecord {
  id: string;
  reference: string;
  category: "PAYMENT" | "WALLET" | "SETTLEMENT" | "AGENT" | "MERCHANT" | "PROVIDER" | "COMPLIANCE" | "RECONCILIATION";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedEntity: string;
  detectedAt: string;
  currentState: "OPEN" | "INVESTIGATING" | "ACTION_REQUIRED" | "RESOLVED";
  owner: string;
  description: string;
  recommendedAction: string;
}

export interface AggregatorRiskAlert {
  id: string;
  alertType: "VELOCITY_ANOMALY" | "REPEATED_FAILURES" | "UNUSUAL_CASHOUT" | "LOCATION_JUMP" | "SETTLEMENT_SPIKE";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  entityType: "AGENT" | "MERCHANT";
  entityName: string;
  entityId: string;
  details: string;
  recommendedAction: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  detectedAt: string;
}

export interface AggregatorComplianceRecord {
  id: string;
  entityType: "AGENT" | "MERCHANT";
  entityId: string;
  entityName: string;
  territoryName: string;
  documentType: "CAC_CERTIFICATE" | "NIN_BVN_VALIDATION" | "PASSPORT_PHOTO" | "UTILITY_BILL" | "TIN_VERIFICATION";
  submittedAt: string;
  status: "PENDING_REVIEW" | "NEEDS_MORE_INFO" | "APPROVED" | "REJECTED" | "EXPIRED";
  reviewNotes?: string;
}

export interface AggregatorServiceHealth {
  serviceId: string;
  serviceName: string;
  category: "AGENCY_CASH" | "BANK_TRANSFER" | "CARD_POS" | "VAS_BILLS" | "PAYMENT_LINKS" | "SETTLEMENT_NODE";
  country: AggregatorCountry;
  status: "AVAILABLE" | "DEGRADED" | "UNAVAILABLE" | "MAINTENANCE";
  uptimePercentage: number;
  averageLatencyMs: number;
  lastIncidentReported?: string;
  providerNode: string;
}

export interface AggregatorTeamMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: AggregatorRole;
  territoryScope: string[];
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  lastLoginAt: string;
  permissions: string[];
}

export interface AggregatorTarget {
  id: string;
  title: string;
  metricType: "TPV" | "TRANSACTION_COUNT" | "ACTIVE_AGENTS" | "NEW_MERCHANTS" | "REVENUE";
  targetValue: number;
  currentActual: number;
  unit: string;
  period: "MONTHLY_Q3_2026" | "WEEKLY" | "ANNUAL";
  deadline: string;
}
