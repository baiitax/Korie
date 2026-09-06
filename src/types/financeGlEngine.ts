// Type definitions for Tier-1 General Ledger, Subledgers, Dimensions, and Financial Reporting

export type AccountCategory =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE'
  | 'CLEARING'
  | 'SUSPENSE';

export type NormalBalanceSide = 'DEBIT' | 'CREDIT';
export type EntrySide = 'DEBIT' | 'CREDIT';

export type FinancialLegalEntity = 'KORIE_NIGERIA_LTD' | 'KORIE_NIGER_SA' | 'KORIE_HOLDINGS';
export type FinancialProduct = 'WALLET_P2P' | 'MERCHANT_CHECKOUT' | 'AGENCY_BANKING' | 'FX_REMITTANCE' | 'TREASURY';
export type FinancialChannel = 'NIP' | 'CARD' | 'USSD' | 'VIRTUAL_ACCOUNT' | 'CASH_DESK' | 'DIRECT_DEBIT' | 'SAHEL_SWITCH' | 'SYSTEM';
export type FinancialProvider = 'PROVIDUS_NG' | 'KORIS_NE' | 'INTERSWITCH' | 'NIBSS' | 'INTERNAL';

export type SubledgerType =
  | 'CUSTOMER_WALLET'
  | 'MERCHANT_PAYABLE'
  | 'AGENT_FLOAT'
  | 'PROVIDER_CLEARING'
  | 'COMMISSION_PAYABLE'
  | 'ESCROW_POOL';

export type PeriodStatus = 'OPEN' | 'SOFT_CLOSED' | 'CLOSED' | 'LOCKED';

export interface GLAccount {
  id: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  normalBalance: NormalBalanceSide;
  parentAccountCode?: string;
  currency: string;
  isSubledgerControl: boolean;
  subledgerType?: SubledgerType;
  isActive: boolean;
  allowManualPosting: boolean;
  description?: string;
  currentBalance: number;
}

export interface AccountingPeriod {
  id: string;
  periodName: string; // '2026-09'
  startDate: string;
  endDate: string;
  fiscalYear: number;
  fiscalMonth: number;
  status: PeriodStatus;
  closedBy?: string;
  closedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  createdAt: string;
}

export interface GLJournalLine {
  id?: string;
  journalId?: string;
  accountCode: string;
  entrySide: EntrySide;
  amount: number;
  currency: string;
  
  // 8 Mandatory Analytical Dimensions
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  legalEntity: FinancialLegalEntity;
  product: FinancialProduct;
  channel: FinancialChannel;
  provider?: FinancialProvider;
  costCenter?: string;
  profitCenter?: string;
  
  // Subledger Linkage
  subledgerId?: string;
  subledgerEntityType?: string;
  
  lineNarration?: string;
  createdAt?: string;
}

export interface GLJournal {
  id: string;
  journalNumber: string;
  periodId: string;
  journalDate: string;
  entryType: 'STANDARD' | 'PAYMENT_SETTLEMENT' | 'FX_REVALUATION' | 'PERIOD_CLOSING' | 'MANUAL_ADJUSTMENT' | 'REVERSAL';
  sourceModule: 'PAYMENT_SWITCH' | 'WALLET_SUBLEDGER' | 'TREASURY' | 'RECONCILIATION' | 'MANUAL';
  sourceReference?: string;
  paymentId?: string;
  narration: string;
  currency: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'POSTED' | 'REVERSED';
  reversalJournalId?: string;
  postedBy?: string;
  lines: GLJournalLine[];
  createdAt: string;
}

export interface SubledgerAccount {
  id: string;
  subledgerType: SubledgerType;
  entityId: string;
  accountCode: string;
  currency: string;
  country: string;
  currentBalance: number;
  heldBalance: number;
  availableBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  currency: string;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
}

export interface TrialBalanceReport {
  period: string;
  generatedAt: string;
  currency: string;
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface IncomeStatementRow {
  accountCode: string;
  accountName: string;
  category: 'REVENUE' | 'EXPENSE';
  amount: number;
}

export interface IncomeStatementReport {
  period: string;
  generatedAt: string;
  currency: string;
  revenueRows: IncomeStatementRow[];
  expenseRows: IncomeStatementRow[];
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  profitMarginPercent: number;
}

export interface BalanceSheetReport {
  period: string;
  generatedAt: string;
  currency: string;
  assetRows: { accountCode: string; accountName: string; amount: number }[];
  liabilityRows: { accountCode: string; accountName: string; amount: number }[];
  equityRows: { accountCode: string; accountName: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean; // Assets == Liabilities + Equity
}

export interface ForensicTraceRecord {
  paymentId: string;
  paymentReference: string;
  createdAt: string;
  amount: number;
  currency: string;
  businessState: string;
  financialState: string;
  settlementState: string;
  reconciliationState: string;
  activeProvider: string;
  attemptsCount: number;
  webhookCount: number;
  journalNumber?: string;
  journalBalanced?: boolean;
  subledgerMutated?: boolean;
  subledgerAvailableBalance?: number;
}
