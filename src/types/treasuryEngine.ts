export type LiquidityClassification = 
  | 'AVAILABLE' 
  | 'RESTRICTED' 
  | 'RESERVED' 
  | 'COMMITTED' 
  | 'PENDING' 
  | 'EXPECTED' 
  | 'UNAVAILABLE';

export type LiquidityHorizon = 
  | 'NOW' 
  | 'INTRADAY' 
  | 'TODAY' 
  | 'TOMORROW' 
  | 'T+2' 
  | '7_DAYS' 
  | '30_DAYS' 
  | '90_DAYS';

export type ForecastConfidence = 
  | 'CONFIRMED' 
  | 'HIGH_CONFIDENCE' 
  | 'ESTIMATED' 
  | 'LOW_CONFIDENCE';

export type FundingRequestStatus = 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'EXECUTED' 
  | 'FAILED';

export interface TreasuryAccountNode {
  accountCode: string;
  accountName: string;
  accountType: 'BANK_VAULT' | 'PROVIDER_FLOAT' | 'SETTLEMENT_PAYABLE' | 'RESERVE' | 'SUSPENSE';
  bankOrProviderName: string;
  countryCode: 'NG' | 'NE';
  currency: 'NGN' | 'XOF' | 'USD';
  ledgerBalanceMinor: number;
  availableBalanceMinor: number;
  lockedHoldsMinor: number;
  status: 'ACTIVE' | 'RESTRICTED' | 'DORMANT';
}

export interface AvailableLiquidityBreakdown {
  currency: 'NGN' | 'XOF' | 'USD';
  totalLiquidAssetsMinor: number;
  eligibleBankCashMinor: number;
  eligibleProviderCashMinor: number;
  deductions: {
    restrictedFundsMinor: number;
    committedSettlementsMinor: number;
    rollingReservesMinor: number;
    activeHoldsMinor: number;
  };
  availableLiquidityMinor: number;
  targetSafetyBufferMinor: number;
  netLiquiditySurplusMinor: number;
  liquidityStatus: 'HEALTHY_SURPLUS' | 'ADEQUATE' | 'LOW_LIQUIDITY' | 'CRITICAL_SHORTFALL';
}

export interface LiquidityForecastItem {
  id: string;
  horizon: LiquidityHorizon;
  currency: 'NGN' | 'XOF';
  expectedInflowMinor: number;
  expectedOutflowMinor: number;
  projectedNetLiquidityMinor: number;
  confidence: ForecastConfidence;
  inflowBreakdown: {
    customerFundingMinor: number;
    merchantReceiptsMinor: number;
    agentFundingMinor: number;
    providerSettlementMinor: number;
  };
  outflowBreakdown: {
    merchantSettlementMinor: number;
    customerWithdrawalMinor: number;
    agentCashOutMinor: number;
    operatingObligationsMinor: number;
  };
  calculatedAt: string;
}

export interface LiquidityStressTestResult {
  id: string;
  scenarioName: string;
  currency: 'NGN' | 'XOF';
  baselineAvailableMinor: number;
  simulatedSurgeOutflowMinor: number;
  simulatedInflowDelayMinor: number;
  simulatedAvailableMinor: number;
  shortfallAmountMinor: number;
  isBreached: boolean;
  timeToBreachHours: number;
  requiredRebalancingMinor: number;
  recommendations: string[];
  executedBy: string;
  executedAt: string;
}

export interface TreasuryFundingRequest {
  id: string;
  requestReference: string;
  sourceAccountCode: string;
  destinationAccountCode: string;
  sourceAccountName: string;
  destinationAccountName: string;
  amountMinor: number;
  currency: 'NGN' | 'XOF' | 'USD';
  purpose: string;
  priority: 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: FundingRequestStatus;
  makerId: string;
  makerEmail: string;
  checkerId?: string;
  checkerEmail?: string;
  journalEntryId?: string;
  createdAt: string;
  approvedAt?: string;
  executedAt?: string;
}

export interface FxPositionSummary {
  currencyPair: 'NGN/XOF' | 'USD/NGN' | 'EUR/XOF';
  baseCurrency: 'NGN' | 'USD' | 'EUR';
  quoteCurrency: 'XOF' | 'NGN';
  netExposureBaseMinor: number;
  averageAcquisitionRate: number;
  currentReferenceRate: number;
  unrealizedPnlMinor: number;
  realizedPnlMinor: number;
  maxExposureLimitMinor: number;
  utilizationPct: number;
  status: 'SAFE' | 'WARNING' | 'BREACH';
}

export interface TreasuryAlert {
  id: string;
  alertType: 
    | 'LOW_LIQUIDITY' 
    | 'CRITICAL_LIQUIDITY' 
    | 'SETTLEMENT_PRESSURE' 
    | 'BANK_CONCENTRATION' 
    | 'FX_EXPOSURE' 
    | 'RESERVE_BREACH';
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  currency: 'NGN' | 'XOF';
  amountMinor?: number;
  actionRequired: string;
  createdAt: string;
}
