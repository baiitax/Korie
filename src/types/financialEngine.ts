export type AccountingCategory = 
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE'
  | 'CONTROL'
  | 'SUSPENSE'
  | 'CLEARING'
  | 'MEMO';

export type JournalDirection = 'DEBIT' | 'CREDIT';

export type JournalStatus = 
  | 'DRAFT'
  | 'VALIDATING'
  | 'READY'
  | 'POSTING'
  | 'POSTED'
  | 'REJECTED'
  | 'VOIDED'
  | 'REVERSED';

export type AccountingPeriodStatus = 
  | 'OPEN'
  | 'SOFT_CLOSED'
  | 'CLOSED'
  | 'LOCKED';

export type HoldReasonCode = 
  | 'PENDING_PAYMENT'
  | 'RISK_HOLD'
  | 'COMPLIANCE_HOLD'
  | 'CHARGEBACK_RESERVE'
  | 'SETTLEMENT_RESERVE';

export type SettlementBatchStatus = 
  | 'CREATED'
  | 'CALCULATING'
  | 'VALIDATING'
  | 'READY'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'SETTLED'
  | 'FAILED'
  | 'PARTIALLY_SETTLED'
  | 'RECONCILIATION_REQUIRED';

export type DiscrepancyType = 
  | 'MISSING_IN_LEDGER'
  | 'MISSING_AT_PROVIDER'
  | 'AMOUNT_MISMATCH'
  | 'STATUS_DRIFT'
  | 'CURRENCY_MISMATCH'
  | 'DUPLICATE_EXTERNAL';

export interface ChartOfAccountItem {
  code: string; // e.g. "1110", "2010"
  name: string;
  category: AccountingCategory;
  normalBalance: JournalDirection; // ASSET/EXPENSE -> DEBIT; LIABILITY/EQUITY/REVENUE -> CREDIT
  description: string;
  currency: 'NGN' | 'XOF' | 'USD' | 'MULTI';
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  isActive: boolean;
}

export interface AccountingDimension {
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  currency: 'NGN' | 'XOF' | 'USD';
  legalEntity?: string;
  product?: string;
  channel?: string;
  customerId?: string;
  agentId?: string;
  merchantId?: string;
  aggregatorId?: string;
  partnerId?: string;
  providerId?: string;
  costCenter?: string;
  branchRegion?: string;
  settlementBatchId?: string;
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountCode: string; // references chart_of_accounts
  accountName: string;
  category: AccountingCategory;
  direction: JournalDirection;
  debitAmount: number; // minor units (strictly integer >= 0)
  creditAmount: number; // minor units (strictly integer >= 0)
  currency: 'NGN' | 'XOF' | 'USD';
  narration: string;
  dimension: AccountingDimension;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  journalNumber: string; // e.g. "JE-2026-0903-0001"
  transactionId?: string;
  eventId?: string;
  ruleCode: string; // e.g. "RULE_CROSS_BORDER_TRANSFER_v1"
  ruleVersion: string;
  description: string;
  currency: 'NGN' | 'XOF' | 'USD';
  totalDebit: number; // minor units
  totalCredit: number; // minor units
  status: JournalStatus;
  lines: JournalLine[];
  effectiveAt: string;
  postedAt?: string;
  createdAt: string;
  createdBy: string;
  sourceSystem: string;
  sourceReference: string;
  idempotencyKey?: string;
  reversalJournalId?: string;
}

export interface AccountBalanceProjection {
  accountCode: string;
  accountName: string;
  category: AccountingCategory;
  currency: 'NGN' | 'XOF' | 'USD';
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  postedDebitTotal: number;
  postedCreditTotal: number;
  calculatedBalance: number; // Derived from posted journal lines
  lockedHolds: number;
  availableBalance: number;
  lastJournalId: string;
  lastRebuiltAt: string;
  isBalanced: boolean;
}

export interface AccountingRuleDef {
  ruleCode: string;
  name: string;
  version: string;
  transactionType: string;
  product: string;
  country: 'NG' | 'NE' | 'CROSS_BORDER';
  currency: 'NGN' | 'XOF';
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'DRAFT';
  approvedBy: string;
  template: {
    debitAccountCode: string;
    creditAccountCode: string;
    feeDebitAccountCode?: string;
    feeCreditAccountCode?: string;
    commissionDebitAccountCode?: string;
    commissionCreditAccountCode?: string;
    taxDebitAccountCode?: string;
    taxCreditAccountCode?: string;
  };
}

export interface SuspenseRecord {
  id: string;
  suspenseAccountCode: string; // e.g. "7100"
  amount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  sourceReference: string;
  providerCode: string;
  reason: string;
  ageDays: number;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED' | 'WRITTEN_OFF';
  ownerDesk: string;
  resolutionJournalId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface DailyCloseRecord {
  id: string;
  closeDate: string; // YYYY-MM-DD
  status: 'COMPLETED' | 'EXCEPTION_PENDING' | 'IN_PROGRESS';
  totalJournalsPosted: number;
  totalDebitVolume: number;
  totalCreditVolume: number;
  isEquationBalanced: boolean;
  unresolvedExceptionsCount: number;
  closedBy: string;
  closedAt: string;
  metrics: {
    customerFundsNgn: number;
    customerFundsXof: number;
    providusCashNgn: number;
    korisCashXof: number;
    feeRevenueNgn: number;
    commissionExpenseNgn: number;
    suspenseNgn: number;
    suspenseXof: number;
  };
}

export interface FinancialAdjustmentRequest {
  id: string;
  requestNumber: string;
  targetAccountCode: string;
  offsetAccountCode: string;
  amount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  direction: JournalDirection;
  reason: string;
  supportingEvidence: string;
  makerId: string;
  makerEmail: string;
  makerRole: string;
  checkerId?: string;
  checkerEmail?: string;
  checkerRole?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'POSTED';
  generatedJournalId?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface TrialBalanceReport {
  asOfDate: string;
  reportingCurrency: 'NGN' | 'XOF';
  accounts: {
    code: string;
    name: string;
    category: AccountingCategory;
    debitBalance: number;
    creditBalance: number;
  }[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}
