// Transaction Recovery, Reversals, Refunds, Disputes & Chargeback Types

export type PaymentState = 'INITIATED' | 'PROCESSING' | 'PROVIDER_PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';
export type FinancialState = 'UNPOSTED' | 'POSTED' | 'COMPENSATED' | 'REVERSED';
export type SettlementState = 'UNSETTLED' | 'PENDING' | 'SETTLED' | 'FAILED';
export type ReconciliationState = 'UNMATCHED' | 'MATCHED' | 'RECONCILED' | 'EXCEPTION_BREAK';

export interface TransactionAttemptRecord {
  id: string;
  transactionReference: string;
  providerId: string;
  attemptNumber: number;
  idempotencyKey: string;
  providerReference?: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'UNKNOWN';
  errorCode?: string;
  latencyMs: number;
  retryable: boolean;
  createdAt: string;
}

export interface RecoveryCaseRecord {
  id: string;
  caseReference: string;
  transactionReference: string;
  customerId: string;
  customerName?: string;
  providerId: string;
  failureCategory:
    | 'PROVIDER_TIMEOUT'
    | 'UNKNOWN_PROVIDER_STATE'
    | 'NETWORK_FAILURE'
    | 'DUPLICATE_DEBIT'
    | 'SETTLEMENT_BREAK'
    | 'PARTIAL_SUCCESS';
  financialExposure: number;
  currency: 'NGN' | 'XOF' | 'USD';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status:
    | 'QUEUED'
    | 'INVESTIGATING'
    | 'PROVIDER_QUERY'
    | 'RETRY_PENDING'
    | 'REVERSAL_PENDING'
    | 'REFUND_PENDING'
    | 'MANUAL_REVIEW'
    | 'RESOLVED'
    | 'FAILED';
  assignedTeam: string;
  assignedUser?: string;
  slaDueAt: string;
  isSlaBreached: boolean;
  resolutionCode?: string;
  resolutionReason?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface PaymentRefundRecord {
  id: string;
  refundReference: string;
  originalTransactionReference: string;
  customerId: string;
  customerName?: string;
  originalAmount: number;
  refundAmount: number;
  remainingRefundableAmount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  refundType: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'MERCHANT_INITIATED' | 'CUSTOMER_REQUESTED' | 'SYSTEM_REFUND';
  status: 'REQUESTED' | 'VALIDATING' | 'APPROVAL_PENDING' | 'APPROVED' | 'SUBMITTED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  refundReason: string;
  requestedBy: string;
  approvedBy?: string;
  glJournalId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentReversalRecord {
  id: string;
  reversalReference: string;
  originalTransactionReference: string;
  reversalAmount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  reversalType: 'FULL_REVERSAL' | 'PARTIAL_REVERSAL' | 'AUTOMATIC_REVERSAL' | 'MANUAL_REVERSAL';
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
  reason: string;
  authorizedBy: string;
  glJournalId?: string;
  createdAt: string;
}

export interface DisputeCaseRecord {
  id: string;
  disputeReference: string;
  transactionReference: string;
  claimantId: string;
  claimantName?: string;
  claimantType: 'CUSTOMER' | 'MERCHANT' | 'AGENT';
  category:
    | 'DUPLICATE_CHARGE'
    | 'TRANSACTION_NOT_RECOGNIZED'
    | 'GOODS_NOT_RECEIVED'
    | 'SERVICE_NOT_RECEIVED'
    | 'POS_CASH_DISPENSE_ERROR'
    | 'AGENT_COMMISSION_DISPUTE'
    | 'OTHER';
  claimAmount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status:
    | 'OPENED'
    | 'TRIAGED'
    | 'UNDER_REVIEW'
    | 'INFORMATION_REQUESTED'
    | 'EVIDENCE_COLLECTED'
    | 'INVESTIGATION'
    | 'DECISION_PENDING'
    | 'RESOLVED';
  heldReserveAmount: number;
  slaDueAt: string;
  isSlaBreached: boolean;
  resolutionOutcome?:
    | 'CUSTOMER_FAVOUR'
    | 'MERCHANT_FAVOUR'
    | 'PROVIDER_FAVOUR'
    | 'REFUND_EXECUTED'
    | 'REVERSAL_EXECUTED'
    | 'NO_ACTION';
  decisionNotes?: string;
  decidedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  evidence?: DisputeEvidenceRecord[];
}

export interface DisputeEvidenceRecord {
  id: string;
  disputeId: string;
  evidenceType: string;
  fileName: string;
  fileHashSha256: string;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ChargebackCaseRecord {
  id: string;
  chargebackReference: string;
  disputeId?: string;
  transactionReference: string;
  networkSource: string; // NIBSS, GIM_UEMOA, VISA, MASTERCARD
  chargebackAmount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  reasonCode: string;
  status:
    | 'CHARGEBACK_RECEIVED'
    | 'CHARGEBACK_REVIEW'
    | 'CHARGEBACK_ACCEPTED'
    | 'CHARGEBACK_CONTESTED'
    | 'REPRESENTMENT'
    | 'ARBITRATION'
    | 'FINAL_LOSS'
    | 'FINAL_WIN';
  responseDeadline: string;
  representmentEvidenceRef?: string;
  createdAt: string;
}
