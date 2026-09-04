export type MatchResultType =
  | 'EXACT_MATCH'
  | 'MATCHED_BY_REFERENCE'
  | 'MATCHED_BY_COMPOSITE'
  | 'PARTIAL_MATCH'
  | 'DUPLICATE'
  | 'MISSING_INTERNAL'
  | 'MISSING_EXTERNAL'
  | 'AMOUNT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'DATE_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'FEE_MISMATCH'
  | 'SETTLEMENT_MISMATCH'
  | 'UNAUTHORIZED_TRANSACTION'
  | 'INVALID_REFERENCE'
  | 'DUPLICATE_EXTERNAL'
  | 'SUSPENSE_REQUIRED'
  | 'MANUAL_REVIEW';

export type ReconciliationRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type ReconciliationSourceType =
  | 'INTERNAL_TRANSACTION'
  | 'LEDGER'
  | 'PROVIDER_REPORT'
  | 'BANK_STATEMENT'
  | 'SETTLEMENT_FILE'
  | 'MERCHANT_REPORT'
  | 'AGENT_REPORT'
  | 'MANUAL_EVIDENCE';

export type ExceptionSeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFORMATIONAL';

export type ExceptionStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'INVESTIGATING'
  | 'PENDING_MAKER_CHECKER'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'WRITTEN_OFF';

export type RootCauseCategory =
  | 'PROVIDER_DELAY'
  | 'PROVIDER_ERROR'
  | 'BANK_DELAY'
  | 'DUPLICATE'
  | 'WRONG_AMOUNT'
  | 'WRONG_ACCOUNT'
  | 'WRONG_CURRENCY'
  | 'FEE_DIFFERENCE'
  | 'FX_DIFFERENCE'
  | 'TIMING_DIFFERENCE'
  | 'MISSING_TRANSACTION'
  | 'MISSING_SETTLEMENT'
  | 'WEBHOOK_FAILURE'
  | 'FILE_IMPORT_ERROR'
  | 'INTERNAL_POSTING_ERROR'
  | 'MANUAL_ERROR'
  | 'FRAUD_SUSPECTED'
  | 'UNKNOWN';

export interface CanonicalReconciliationRecord {
  id: string;
  runId: string;
  sourceId: string;
  sourceType: ReconciliationSourceType;
  sourceRecordReference: string;
  transactionReference?: string;
  providerReference?: string;
  externalReference?: string;
  accountReference: string;
  recordType: 'DEBIT' | 'CREDIT';
  direction: 'INBOUND' | 'OUTBOUND';
  currency: 'NGN' | 'XOF' | 'USD';
  amountMinor: number; // integer minor units
  feeMinor: number;
  netAmountMinor: number;
  valueDate: string; // ISO Date
  transactionDate: string;
  settlementDate?: string;
  matchStatus: MatchResultType;
  confidenceScore: number; // 0 to 100
  matchedRecordId?: string;
  rawReference?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ReconciliationRun {
  id: string;
  runReference: string;
  reconciliationType: '4_WAY_CORE' | 'BANK_STATEMENT' | 'PROVIDER_CLEARING' | 'MERCHANT_SETTLEMENT' | 'AGENT_FLOAT';
  entityId?: string;
  countryCode: 'NG' | 'NE' | 'CROSS_BORDER';
  currency: 'NGN' | 'XOF' | 'USD';
  providerId: string;
  sourcePeriodStart: string;
  sourcePeriodEnd: string;
  startedAt: string;
  completedAt?: string;
  status: ReconciliationRunStatus;
  recordsProcessed: number;
  recordsMatched: number;
  recordsUnmatched: number;
  recordsPartial: number;
  recordsException: number;
  totalExpectedAmountMinor: number;
  totalActualAmountMinor: number;
  differenceAmountMinor: number;
  matchAccuracyPct: number;
  initiatedBy: string;
  ruleVersion: string;
  createdAt: string;
}

export interface ReconciliationException {
  id: string;
  exceptionReference: string;
  runId: string;
  transactionId?: string;
  settlementBatchId?: string;
  providerId: string;
  providerReference?: string;
  exceptionType: MatchResultType;
  severity: ExceptionSeverity;
  expectedAmountMinor: number;
  actualAmountMinor: number;
  differenceMinor: number;
  currency: 'NGN' | 'XOF' | 'USD';
  status: ExceptionStatus;
  assignedTo?: string;
  assignedDesk?: string;
  slaDueAt: string;
  isSlaBreached: boolean;
  rootCause?: RootCauseCategory;
  resolutionNotes?: string;
  resolutionCode?: string;
  makerId?: string;
  checkerId?: string;
  compensatingJournalId?: string;
  evidenceReferences: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface SuspenseAgingSchedule {
  currency: 'NGN' | 'XOF' | 'USD';
  totalSuspenseMinor: number;
  bucket0to1DayMinor: number;
  bucket2to3DaysMinor: number;
  bucket4to7DaysMinor: number;
  bucket8to14DaysMinor: number;
  bucket15to30DaysMinor: number;
  bucket30PlusDaysMinor: number;
  itemCount: number;
  criticalEscalationCount: number;
}

export interface BankStatementModel {
  id: string;
  statementReference: string;
  bankAccountId: string;
  bankCode: string; // e.g. "058" Providus Bank
  bankName: string;
  accountNumber: string;
  currency: 'NGN' | 'XOF' | 'USD';
  statementDate: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  totalCreditsMinor: number;
  totalDebitsMinor: number;
  lineCount: number;
  isIntegrityVerified: boolean; // opening + credits - debits == closing
  fileHash: string;
  importedAt: string;
  importedBy: string;
}

export interface BankStatementLine {
  id: string;
  statementId: string;
  sequenceNumber: number;
  valueDate: string;
  bookingDate: string;
  direction: 'CREDIT' | 'DEBIT';
  amountMinor: number;
  currency: 'NGN' | 'XOF' | 'USD';
  bankReference: string;
  narrative: string;
  channel?: string;
  counterpartyAccount?: string;
  counterpartyName?: string;
  isReconciled: boolean;
  reconciledTransactionId?: string;
}

export interface Transaction360Trace {
  businessTransaction: {
    id: string;
    reference: string;
    type: string;
    product: string;
    amountMinor: number;
    feeMinor: number;
    currency: string;
    status: string;
    sender: string;
    receiver: string;
    createdAt: string;
  };
  accountingLedger: {
    journalId?: string;
    journalNumber?: string;
    postedAt?: string;
    debitLines: { accountCode: string; name: string; amountMinor: number }[];
    creditLines: { accountCode: string; name: string; amountMinor: number }[];
    isBalanced: boolean;
  };
  providerExecution: {
    providerCode: string;
    providerReference: string;
    status: string;
    amountMinor: number;
    respondedAt: string;
    isVerified: boolean;
  };
  settlementDetails: {
    batchId?: string;
    batchNumber?: string;
    status?: string;
    eligibleAmountMinor?: number;
    netPayableMinor?: number;
    settledAt?: string;
  };
  bankStatement: {
    statementReference?: string;
    bankName?: string;
    bankReference?: string;
    valueDate?: string;
    statementAmountMinor?: number;
    isMatched: boolean;
  };
  reconciliationSummary: {
    matchResult: MatchResultType;
    confidenceScore: number;
    discrepancyMinor: number;
    hasOpenException: boolean;
    exceptionId?: string;
  };
}
