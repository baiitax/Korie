// =============================================================================
// File: src/types/agentProducts.ts
// Description: Agent product-services view models (Stage 4) — billers, cards,
// FX corridor desk, account opening. Every figure is projected from engine
// stores/seeds by the agent BFF; the browser never holds product truth.
// =============================================================================

export type AgentBillerCategory = "AIRTIME" | "DATA" | "ELECTRICITY" | "CABLE_TV" | "INTERNET" | "WATER";

export interface AgentBiller {
  billerId: string;
  category: AgentBillerCategory;
  name: string;
  /** Fixed naira service charge applied per payment (whole ₦). */
  serviceChargeNgn: number;
  minAmountNgn: number;
  maxAmountNgn: number;
  /** Optional pre-set denominations for airtime/data top-ups. */
  denominationsNgn?: number[];
  status: "ACTIVE" | "SUSPENDED";
  /** Commission split rule applied to the service charge. */
  feeRuleApplied: string;
}

export interface AgentCardProduct {
  productId: string;
  productCode: string;
  name: string;
  description: string;
  networkLabel: string;
  issueFeeNgn: number;
  deliveryEstimateDays: string;
  status: "ACTIVE" | "INACTIVE";
  minKycTier: string;
  feeRuleApplied: string;
}

export type AgentCardApplicationStatus =
  | "APPLICATION_RECEIVED"
  | "KYC_VERIFIED"
  | "AT_ISSUER"
  | "ISSUED"
  | "DELIVERED"
  | "CANCELLED";

export interface AgentCardApplication {
  id: string;
  applicationReference: string;
  cardProductId: string;
  cardProductCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  accountNumber: string;
  kycTier: string;
  status: AgentCardApplicationStatus;
  issueFeeNgn: number;
  agentCommissionNgn: number;
  ledgerJournalId?: string;
  feeReference?: string;
  maskedCardRef?: string;
  statusHistory: { status: AgentCardApplicationStatus; at: string; by: string }[];
  createdAt: string;
  updatedAt: string;
}

export type AgentFxDirection = "BUY_XOF" | "SELL_XOF";

export type AgentFxOrderStatus = "COMPLETED" | "REJECTED";

export interface AgentFxOrder {
  id: string;
  orderReference: string;
  direction: AgentFxDirection;
  currencyPair: string;
  /** XOF quantity of the order. */
  xofAmount: number;
  /** Whole naira leg (charge for BUY_XOF, payout for SELL_XOF). */
  ngnAmount: number;
  /** Engine reference rate in XOF per ₦ (as the treasury corridor quotes it). */
  referenceRate: number;
  /** Desk applied rate in ₦ per XOF (reference ± seeded spread). */
  appliedRate: number;
  marginNgn: number;
  agentCommissionNgn: number;
  ledgerJournalId?: string;
  status: AgentFxOrderStatus;
  rejectionReason?: string;
  customerName?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AgentProductKpi {
  product: "CASH_IN" | "CASH_OUT" | "ACCOUNT_OPENING" | "BILL_PAYMENT" | "CARD_APPLICATION" | "FX_CONVERSION";
  todayCount: number;
  todayVolume: number;
}

export interface AgentServicesOverview {
  limits: {
    singleTransactionNgn: number;
    billMinNgn: number;
    billMaxNgn: number;
    fxSingleMaxNgn: number;
    fxDailyMaxNgn: number;
    cardIssueFeeMaxNgn: number;
  };
  catalogs: {
    activeBillers: number;
    billerCategories: string[];
    activeCardProducts: number;
    openableAccounts: number;
    fxCorridor: { pair: string; referenceRate: number; status: string } | null;
    usdCorridor: { pair: string; referenceRate: number; status: string } | null;
  };
  today: AgentProductKpi[];
  generatedAt: string;
}
