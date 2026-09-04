// Financial Planning, ALM, Funding Facilities & Balance-Sheet Types

export type LiquidityHealthTier = 'HEALTHY' | 'WATCH' | 'ELEVATED' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';

export type MaturityBucketCode =
  | '0_1_DAY'
  | '2_7_DAYS'
  | '8_30_DAYS'
  | '31_90_DAYS'
  | '91_180_DAYS'
  | '181_365_DAYS'
  | '1_2_YEARS'
  | '2_5_YEARS'
  | '5_YEARS_PLUS';

export interface TreasuryBookRecord {
  id: string;
  bookCode: string;
  bookName: string;
  legalEntity: string;
  country: 'NG' | 'NE' | 'GB' | 'US';
  baseCurrency: 'NGN' | 'XOF' | 'USD' | 'EUR' | 'GBP';
  status: 'ACTIVE' | 'RESTRICTED' | 'CLOSED';
  createdAt: string;
}

export interface AlmMaturityBucket {
  bucketCode: MaturityBucketCode;
  bucketLabel: string;
  currency: 'NGN' | 'XOF' | 'USD';
  contractualInflows: number;
  contractualOutflows: number;
  contractualNetGap: number;
  behaviouralInflows: number;
  behaviouralOutflows: number;
  behaviouralNetGap: number;
  cumulativeGap: number;
}

export interface AlmAssumptionRecord {
  id: string;
  assumptionCode: string;
  name: string;
  category: 'WALLET_STICKINESS' | 'MERCHANT_SETTLEMENT_RUNOFF' | 'AGENT_FLOAT_VOLATILITY' | 'INTEREST_RATE_SENSITIVITY';
  version: string;
  effectiveDate: string;
  coreDepositRetentionPct: number;
  volatileRunoffPct: number;
  status: 'APPROVED' | 'DRAFT' | 'DEPRECATED';
  approvedBy: string;
}

export interface FundingFacilityRecord {
  id: string;
  facilityCode: string;
  lenderName: string;
  facilityType: 'REVOLVING_CREDIT' | 'OVERDRAFT_LINE' | 'STANDBY_LIQUIDITY' | 'TERM_LOAN' | 'INTERCOMPANY_LOAN';
  legalEntity: string;
  currency: 'NGN' | 'XOF' | 'USD';
  totalCommittedLimit: number;
  utilizedAmount: number;
  availableUndrawn: number;
  interestRateSpreadPct: number;
  maturityDate: string;
  covenantsSummary: string;
  status: 'ACTIVE' | 'FROZEN' | 'EXPIRED';
}

export interface TreasuryDealTicket {
  id: string;
  dealReference: string;
  facilityId?: string;
  dealType: 'FACILITY_DRAWDOWN' | 'FACILITY_REPAYMENT' | 'INTERCOMPANY_TRANSFER' | 'FX_SPOT_CONVERSION' | 'NOSTRO_SWEEP';
  amount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  makerId: string;
  checkerId?: string;
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTED' | 'SETTLED' | 'RECONCILED';
  glJournalId?: string;
  valueDate: string;
  settlementDate: string;
  createdAt: string;
}

export interface ThreeStatementForecast {
  id: string;
  forecastCode: string;
  versionName: 'BASE_CASE' | 'UPSIDE' | 'DOWNSIDE' | 'BOARD_PLAN';
  horizon: '1_MONTH' | '3_MONTHS' | '12_MONTHS' | '36_MONTHS';
  currency: 'NGN' | 'XOF';
  
  // Income Statement (P&L)
  revenueTotal: number;
  directCostsTotal: number;
  grossMargin: number;
  operatingOverhead: number;
  fundingInterestExpense: number;
  netProfit: number;
  
  // Balance Sheet
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  
  // Cash Flow Statement
  operatingCashflow: number;
  investingCashflow: number;
  financingCashflow: number;
  netTreasuryCashChange: number;
  endingCashBalance: number;
  
  createdAt: string;
}

export interface CapitalPositionRecord {
  id: string;
  country: 'NG' | 'NE';
  currency: 'NGN' | 'XOF';
  paidUpCapital: number;
  retainedEarnings: number;
  statutoryReserves: number;
  currentPeriodProfit: number;
  totalQualifyingCapital: number;
  regulatoryMinimumCapital: number;
  capitalHeadroom: number;
  solvencyRatioPct: number;
  updatedAt: string;
}

export interface UnitEconomicsRecord {
  productCode: string;
  productName: string;
  monthlyVolumeCount: number;
  monthlyVolumeValue: number;
  grossRevenue: number;
  interchangeAndRailCosts: number;
  agentCommissions: number;
  fundingCostAllocated: number;
  contributionMargin: number;
  marginPercentage: number;
}

export interface ReverseStressTestResult {
  scenarioName: string;
  maximumDailyWithdrawalSpike: number;
  maximumSettlementDelayDays: number;
  maximumSurvivableDaysBeforeCrisis: number;
  criticalBreachFactor: string;
  recommendedBackstopBuffer: number;
}
