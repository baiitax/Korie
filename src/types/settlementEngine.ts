export type SettlementType =
  | 'CUSTOMER_SETTLEMENT'
  | 'MERCHANT_SETTLEMENT'
  | 'AGENT_SETTLEMENT'
  | 'AGGREGATOR_SETTLEMENT'
  | 'PROVIDER_SETTLEMENT'
  | 'BANK_SETTLEMENT'
  | 'COMMISSION_SETTLEMENT'
  | 'REFUND_SETTLEMENT'
  | 'CHARGEBACK_SETTLEMENT'
  | 'FX_SETTLEMENT'
  | 'INTERCOMPANY_SETTLEMENT';

export type SettlementBatchState =
  | 'DRAFT'
  | 'CALCULATING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'PARTIALLY_SETTLED'
  | 'SETTLED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REVERSED'
  | 'DISPUTED';

export interface SettlementEligibilityBreakdown {
  grossEligibleMinor: number;
  refundDeductionsMinor: number;
  chargebackDeductionsMinor: number;
  feeDeductionsMinor: number;
  commissionDeductionsMinor: number;
  taxDeductionsMinor: number; // e.g. 7.5% VAT
  rollingReserveHeldMinor: number; // e.g. 5% rolling reserve
  activeDisputeHoldsMinor: number;
  previousSettledMinor: number;
  netPayableMinor: number; // Gross - (Refunds + Chargebacks + Fees + Commissions + Taxes + Reserves + Holds + PrevSettled)
  isEligible: boolean;
  rejectionReason?: string;
}

export interface SettlementBatch {
  id: string;
  batchReference: string;
  settlementType: SettlementType;
  partnerId: string;
  partnerName: string;
  partnerType: 'MERCHANT' | 'AGENT' | 'AGGREGATOR' | 'PROVIDER';
  countryCode: 'NG' | 'NE';
  currency: 'NGN' | 'XOF';
  sourceAccountCode: string; // e.g. "2050" Merchant Payables
  destinationAccountCode: string; // e.g. "1010" Providus Bank Pool
  grossAmountMinor: number;
  feesMinor: number;
  taxesMinor: number;
  reservesHeldMinor: number;
  netAmountMinor: number;
  transactionCount: number;
  status: SettlementBatchState;
  payoutBankCode: string;
  payoutAccountNumber: string;
  payoutAccountName: string;
  settlementWindow: 'T+0' | 'T+1' | 'T+2' | 'SAME_DAY';
  scheduledAt: string;
  initiatedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  settledAt?: string;
  providerPayoutReference?: string;
  journalEntryId?: string;
  makerId: string;
  makerEmail: string;
  checkerId?: string;
  checkerEmail?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface SettlementItem {
  id: string;
  batchId: string;
  transactionId: string;
  transactionReference: string;
  grossAmountMinor: number;
  feeAmountMinor: number;
  netAmountMinor: number;
  currency: 'NGN' | 'XOF';
  postedAt: string;
}

export interface SettlementReserveHold {
  id: string;
  partnerId: string;
  batchId?: string;
  reserveType: 'ROLLING_RISK' | 'CHARGEBACK' | 'COMPLIANCE' | 'DISPUTE';
  amountMinor: number;
  currency: 'NGN' | 'XOF';
  rateBps: number; // e.g. 500 bps = 5%
  holdStatus: 'ACTIVE' | 'RELEASED' | 'CAPTURED';
  expiresAt: string;
  createdAt: string;
  releasedAt?: string;
}
