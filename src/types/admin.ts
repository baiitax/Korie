export type CountryCode = "NG" | "NE" | "GLOBAL";
export type CurrencyCode = "NGN" | "XOF" | "USD" | "EUR" | "GBP";

export type BankingNodeId = "providus_ng" | "koris_ne" | "korie_core";
export type NodeHealthStatus = "ONLINE" | "DEGRADED" | "OFFLINE" | "MAINTENANCE" | "UNKNOWN";

export interface BankingNode {
  id: BankingNodeId;
  name: string;
  institution: string;
  country: "Nigeria" | "Niger Republic" | "Global";
  countryCode: CountryCode;
  currency: CurrencyCode;
  health: NodeHealthStatus;
  apiBaseUrl: string;
  latencyMs: number;
  uptime24h: number;
  successRate: number;
  volume24h: number;
  lastSuccessfulRequest: string;
  lastFailedRequest?: string;
  authStatus: "AUTHENTICATED" | "EXPIRING_SOON" | "TOKEN_EXPIRED" | "NOT_CONFIGURED";
  webhookStatus: "ACTIVE" | "DEGRADED" | "STANDBY";
  settlementStatus: "SETTLED_T0" | "PROCESSING" | "PENDING_RECONCILIATION";
  reconciliationStatus: "MATCHED" | "EXCEPTIONS_PENDING" | "UNRECONCILED";
  supportedServices: string[];
  isFailoverActive: boolean;
  failoverNodeId?: BankingNodeId;
}

export type TransactionStatus =
  | "INITIATED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCESSFUL"
  | "FAILED"
  | "REVERSED"
  | "CANCELLED"
  | "DISPUTED";

export type TransactionType =
  | "TRANSFER_NIP"
  | "TRANSFER_WAEMU"
  | "TRANSFER_CROSS_BORDER"
  | "AGENCY_CASH_IN"
  | "AGENCY_CASH_OUT"
  | "MERCHANT_QR_PAYMENT"
  | "MERCHANT_POS_PAYMENT"
  | "BDC_FX_SWAP"
  | "BILL_PAYMENT_UTILITY"
  | "WALLET_FUNDING"
  | "SETTLEMENT_PAYOUT";

export interface Transaction {
  id: string;
  reference: string;
  providerReference?: string;
  correlationId: string;
  country: "Nigeria" | "Niger Republic";
  countryCode: CountryCode;
  type: TransactionType;
  channel: "MOBILE_APP" | "POS_TERMINAL" | "WEB_CHECKOUT" | "REST_API" | "USSD" | "BDC_PORTAL";
  amount: number;
  fee: number;
  netAmount: number;
  currency: CurrencyCode;
  sourceCurrency?: CurrencyCode;
  destinationCurrency?: CurrencyCode;
  exchangeRate?: number;
  sourceAmount?: number;
  destinationAmount?: number;
  status: TransactionStatus;
  sender: {
    id: string;
    name: string;
    accountNumber?: string;
    bankName?: string;
    walletId?: string;
  };
  recipient: {
    id: string;
    name: string;
    accountNumber?: string;
    bankName?: string;
    walletId?: string;
  };
  provider: {
    nodeId: BankingNodeId;
    name: string;
    responseCode?: string;
    responseMessage?: string;
    latencyMs?: number;
  };
  timeline: {
    step: string;
    status: "COMPLETED" | "FAILED" | "PENDING";
    timestamp: string;
    detail?: string;
  }[];
  createdAt: string;
  completedAt?: string;
  ipAddress?: string;
  deviceSignature?: string;
  riskScore: number; // 0 to 100
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isFlaggedForAML: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: "Nigeria" | "Niger Republic";
  countryCode: CountryCode;
  kycTier: "TIER_1" | "TIER_2" | "TIER_3";
  kycStatus: "APPROVED" | "PENDING_REVIEW" | "REJECTED" | "EXPIRED";
  nationalIdNumber?: string; // Masked e.g. NIN 234****981
  bvn?: string; // Masked e.g. 223****123
  walletId: string;
  availableBalance: number;
  ledgerBalance: number;
  currency: CurrencyCode;
  totalTransactions: number;
  totalVolume: number;
  riskStatus: "NORMAL" | "MONITORED" | "RESTRICTED" | "SUSPENDED";
  status: "ACTIVE" | "INACTIVE" | "FROZEN" | "SUSPENDED";
  createdAt: string;
  lastLoginAt: string;
  devicesCount: number;
}

export interface Agent {
  id: string;
  businessName: string;
  agentName: string;
  phone: string;
  email: string;
  country: "Nigeria" | "Niger Republic";
  countryCode: CountryCode;
  stateOrRegion: string;
  lgaOrCity: string;
  terminalCount: number;
  activeTerminalId?: string;
  walletId: string;
  floatBalance: number;
  commissionEarned24h: number;
  commissionTotal: number;
  currency: CurrencyCode;
  cashInVolume30d: number;
  cashOutVolume30d: number;
  transactionCount30d: number;
  successRate: number;
  status: "ACTIVE" | "LOW_FLOAT" | "INACTIVE" | "SUSPENDED" | "PENDING_KYC";
  liquidityStatus: "HEALTHY" | "LOW_FLOAT_WARNING" | "CRITICAL_EMPTY";
  riskScore: number;
  createdAt: string;
}

export interface Merchant {
  id: string;
  businessName: string;
  ownerName: string;
  businessType: string;
  country: "Nigeria" | "Niger Republic";
  countryCode: CountryCode;
  city: string;
  settlementBank: string;
  settlementAccountMasked: string;
  walletId: string;
  currency: CurrencyCode;
  grossSales30d: number;
  netSettlementPending: number;
  successRate: number;
  disputeCount: number;
  activeQRCodes: number;
  activePOSTerminals: number;
  status: "ACTIVE" | "PENDING_VERIFICATION" | "RESTRICTED";
  createdAt: string;
}

export interface BDCOperator {
  id: string;
  operatorName: string;
  licenseNumber: string;
  country: "Nigeria" | "Niger Republic";
  countryCode: CountryCode;
  primaryCorridor: "Kano ⇄ Maradi" | "Lagos ⇄ Niamey" | "Katsina ⇄ Dan-Issa" | "Sokoto ⇄ Birni N'Konni";
  treasuryNGN: number;
  treasuryXOF: number;
  treasuryUSD: number;
  dailyTradingVolume: number;
  buyRateSpread: number;
  sellRateSpread: number;
  status: "ACTIVE" | "AUDIT_PENDING" | "SUSPENDED";
  complianceScore: number; // 0 to 100
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  reference: string;
  entryType: "DEBIT" | "CREDIT";
  accountType: "CUSTOMER_WALLET" | "AGENT_FLOAT" | "MERCHANT_SETTLEMENT" | "BDC_TREASURY" | "FEE_REVENUE" | "BANK_CLEARING";
  accountIdentifier: string;
  currency: CurrencyCode;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  actor: string;
  timestamp: string;
}

export interface ReconciliationException {
  id: string;
  transactionId: string;
  providerReference: string;
  nodeId: BankingNodeId;
  countryCode: CountryCode;
  expectedAmount: number;
  actualAmount: number;
  discrepancy: number;
  currency: CurrencyCode;
  type: "MISMATCH" | "MISSING_INTERNAL" | "MISSING_PROVIDER" | "DUPLICATE" | "TIMING_DIFFERENCE";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "VERIFIED";
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementBatch {
  id: string;
  batchReference: string;
  destinationNode: BankingNodeId;
  countryCode: CountryCode;
  entityCount: number;
  grossAmount: number;
  fees: number;
  netAmount: number;
  currency: CurrencyCode;
  status: "PENDING_APPROVAL" | "PROCESSING" | "COMPLETED" | "FAILED" | "DISPUTED";
  scheduledFor: string;
  completedAt?: string;
  authorizedBy?: string;
}

export interface RiskAlert {
  id: string;
  category: "VELOCITY_SPIKE" | "CROSS_BORDER_ANOMALY" | "HIGH_VALUE_SWAP" | "MULTIPLE_PIN_FAILURES" | "GEOGRAPHIC_IMPOSSIBILITY" | "FLOAT_DRAIN";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  entityType: "CUSTOMER" | "AGENT" | "BDC" | "MERCHANT" | "TRANSACTION";
  entityId: string;
  entityName: string;
  countryCode: CountryCode;
  description: string;
  riskScore: number;
  status: "NEW" | "UNDER_REVIEW" | "ACTION_TAKEN" | "FALSE_POSITIVE" | "RESOLVED";
  detectedAt: string;
}

export interface MakerCheckerRequest {
  id: string;
  actionType: "WALLET_FREEZE" | "WALLET_UNFREEZE" | "SETTLEMENT_OVERRIDE" | "LIMIT_ADJUSTMENT" | "MANUAL_RECONCILIATION_ENTRY" | "ROLE_CHANGE" | "PROVIDER_FAILOVER";
  resourceType: string;
  resourceId: string;
  resourceName: string;
  countryCode: CountryCode;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED" | "CANCELLED";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface AuditEvent {
  id: string;
  actor: {
    id: string;
    email: string;
    role: string;
    ipAddress: string;
  };
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  reason?: string;
  countryCode: CountryCode;
  timestamp: string;
}

export interface SystemHealthMetrics {
  coreEngineStatus: "HEALTHY" | "DEGRADED" | "OUTAGE";
  activeWebsockets: number;
  databaseConnectionPool: {
    active: number;
    idle: number;
    max: number;
    avgQueryLatencyMs: number;
  };
  nodes: BankingNode[];
  apiGatewayLatencyMs: number;
  queueBacklog: number;
  lastHealthCheck: string;
}
