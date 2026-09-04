import { 
  SettlementBatch, 
  SettlementBatchState, 
  SettlementEligibilityBreakdown, 
  SettlementReserveHold, 
  SettlementType 
} from '@/types/settlementEngine';
import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';

export class SettlementEngine {
  private static batches: Map<string, SettlementBatch> = new Map();
  private static reserves: Map<string, SettlementReserveHold> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialBatches();
    }
  }

  private static seedInitialBatches() {
    if (this.batches.size > 0) return;

    this.createBatch({
      settlementType: 'MERCHANT_SETTLEMENT',
      partnerId: 'merch_jumia_ng',
      partnerName: 'Jumia Nigeria Retail Ltd',
      partnerType: 'MERCHANT',
      countryCode: 'NG',
      currency: 'NGN',
      grossAmountMinor: 18_124_000_00,
      feeDeductionsMinor: 0,
      reserveRateBps: 500, // 5% rolling reserve
      transactionCount: 420,
      payoutBankCode: '058',
      payoutAccountNumber: '0123456789',
      payoutAccountName: 'Jumia Technologies NG Ltd',
      makerId: 'usr_settle_maker',
      makerEmail: 'settlement.analyst@koriepay.internal',
    });
  }

  // Explicit valid state transitions
  private static validTransitions: Record<SettlementBatchState, SettlementBatchState[]> = {
    DRAFT: ['CALCULATING', 'CANCELLED'],
    CALCULATING: ['PENDING_REVIEW', 'FAILED', 'CANCELLED'],
    PENDING_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['SUBMITTED', 'CANCELLED'],
    SUBMITTED: ['PROCESSING', 'FAILED'],
    PROCESSING: ['SETTLED', 'PARTIALLY_SETTLED', 'FAILED'],
    PARTIALLY_SETTLED: ['SETTLED', 'FAILED'],
    SETTLED: ['REVERSED', 'DISPUTED'],
    FAILED: ['CALCULATING', 'CANCELLED'],
    REJECTED: ['DRAFT', 'CANCELLED'],
    CANCELLED: [],
    REVERSED: [],
    DISPUTED: ['SETTLED', 'REVERSED'],
  };

  /**
   * Calculates net eligible settlement volume for a partner.
   */
  public static calculateEligibility(params: {
    partnerId: string;
    grossVolumeMinor: number;
    refundsMinor?: number;
    chargebacksMinor?: number;
    feesMinor?: number;
    commissionsMinor?: number;
    taxRateBps?: number; // e.g. 750 bps = 7.5%
    rollingReserveRateBps?: number; // e.g. 500 bps = 5%
    activeHoldsMinor?: number;
    previousSettledMinor?: number;
  }): SettlementEligibilityBreakdown {
    const refunds = params.refundsMinor || 0;
    const chargebacks = params.chargebacksMinor || 0;
    const fees = params.feesMinor || 0;
    const commissions = params.commissionsMinor || 0;
    const prevSettled = params.previousSettledMinor || 0;
    const activeHolds = params.activeHoldsMinor || 0;

    const tax = params.taxRateBps ? Math.round((fees * params.taxRateBps) / 10000) : 0;
    const reserve = params.rollingReserveRateBps ? Math.round((params.grossVolumeMinor * params.rollingReserveRateBps) / 10000) : 0;

    const totalDeductions = refunds + chargebacks + fees + commissions + tax + reserve + activeHolds + prevSettled;
    const netPayable = params.grossVolumeMinor - totalDeductions;

    return {
      grossEligibleMinor: params.grossVolumeMinor,
      refundDeductionsMinor: refunds,
      chargebackDeductionsMinor: chargebacks,
      feeDeductionsMinor: fees,
      commissionDeductionsMinor: commissions,
      taxDeductionsMinor: tax,
      rollingReserveHeldMinor: reserve,
      activeDisputeHoldsMinor: activeHolds,
      previousSettledMinor: prevSettled,
      netPayableMinor: Math.max(0, netPayable),
      isEligible: netPayable > 0,
      rejectionReason: netPayable <= 0 ? 'Total deductions exceed gross volume.' : undefined,
    };
  }

  /**
   * MAKER: Creates a new settlement batch.
   */
  public static createBatch(params: {
    settlementType: SettlementType;
    partnerId: string;
    partnerName: string;
    partnerType: 'MERCHANT' | 'AGENT' | 'AGGREGATOR' | 'PROVIDER';
    countryCode: 'NG' | 'NE';
    currency: 'NGN' | 'XOF';
    grossAmountMinor: number;
    feeDeductionsMinor?: number;
    reserveRateBps?: number;
    transactionCount: number;
    payoutBankCode: string;
    payoutAccountNumber: string;
    payoutAccountName: string;
    settlementWindow?: 'T+0' | 'T+1' | 'T+2' | 'SAME_DAY';
    makerId: string;
    makerEmail: string;
  }): SettlementBatch {
    const eligibility = this.calculateEligibility({
      partnerId: params.partnerId,
      grossVolumeMinor: params.grossAmountMinor,
      feesMinor: params.feeDeductionsMinor || 0,
      rollingReserveRateBps: params.reserveRateBps || 500, // 5% default reserve
    });

    if (!eligibility.isEligible) {
      throw new Error(`Partner is not eligible for settlement: ${eligibility.rejectionReason}`);
    }

    const id = `sb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = `SETTLE-${params.countryCode}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const batch: SettlementBatch = {
      id,
      batchReference: ref,
      settlementType: params.settlementType,
      partnerId: params.partnerId,
      partnerName: params.partnerName,
      partnerType: params.partnerType,
      countryCode: params.countryCode,
      currency: params.currency,
      sourceAccountCode: params.currency === 'NGN' ? '2050' : '2060', // Merchant Payables
      destinationAccountCode: params.currency === 'NGN' ? '1010' : '1020', // Bank Settlement Pool
      grossAmountMinor: eligibility.grossEligibleMinor,
      feesMinor: eligibility.feeDeductionsMinor,
      taxesMinor: eligibility.taxDeductionsMinor,
      reservesHeldMinor: eligibility.rollingReserveHeldMinor,
      netAmountMinor: eligibility.netPayableMinor,
      transactionCount: params.transactionCount,
      status: 'PENDING_REVIEW',
      payoutBankCode: params.payoutBankCode,
      payoutAccountNumber: params.payoutAccountNumber,
      payoutAccountName: params.payoutAccountName,
      settlementWindow: params.settlementWindow || 'T+1',
      scheduledAt: new Date().toISOString(),
      makerId: params.makerId,
      makerEmail: params.makerEmail,
      createdAt: new Date().toISOString(),
    };

    this.batches.set(id, batch);
    return batch;
  }

  /**
   * CHECKER: Approves settlement batch and commits double-entry journal.
   */
  public static approveBatch(params: {
    batchId: string;
    checkerId: string;
    checkerEmail: string;
  }): SettlementBatch {
    const batch = this.batches.get(params.batchId);
    if (!batch) throw new Error(`Batch ${params.batchId} not found.`);
    if (batch.status !== 'PENDING_REVIEW') {
      throw new Error(`Batch must be in PENDING_REVIEW status to be approved. Current: ${batch.status}`);
    }

    // Segregation of duties rule
    if (batch.makerId === params.checkerId) {
      throw new Error(`Maker-Checker violation: Maker cannot approve their own settlement batch.`);
    }

    // Commit Double-Entry Settlement Journal:
    // Debit: 2050/2060 (Merchant Payables liability reduced)
    // Credit: 1010/1020 (Bank Settlement pool reduced)
    const journal = DoubleEntryLedgerEngine.postJournalEntry({
      journalNumber: `JE-${batch.batchReference}`,
      ruleCode: batch.currency === 'NGN' ? 'RULE_MERCHANT_SETTLEMENT_NGN_v1' : 'RULE_MERCHANT_SETTLEMENT_NGN_v1',
      ruleVersion: 'v1',
      description: `Settlement Payout [${batch.batchReference}] for ${batch.partnerName} (${batch.payoutAccountNumber})`,
      currency: batch.currency,
      totalDebit: batch.netAmountMinor,
      totalCredit: batch.netAmountMinor,
      lines: [
        {
          id: `jl_set_${batch.id}_1`,
          journalEntryId: '',
          accountCode: batch.sourceAccountCode,
          accountName: 'Merchant Payables Liability',
          category: 'LIABILITY',
          direction: 'DEBIT',
          debitAmount: batch.netAmountMinor,
          creditAmount: 0,
          currency: batch.currency,
          narration: `Clearing payable for ${batch.batchReference}`,
          dimension: { country: batch.countryCode, currency: batch.currency, merchantId: batch.partnerId },
          createdAt: new Date().toISOString(),
        },
        {
          id: `jl_set_${batch.id}_2`,
          journalEntryId: '',
          accountCode: batch.destinationAccountCode,
          accountName: 'Bank Settlement Operating Pool',
          category: 'ASSET',
          direction: 'CREDIT',
          debitAmount: 0,
          creditAmount: batch.netAmountMinor,
          currency: batch.currency,
          narration: `Outflow to ${batch.payoutAccountName}`,
          dimension: { country: batch.countryCode, currency: batch.currency, merchantId: batch.partnerId },
          createdAt: new Date().toISOString(),
        },
      ],
      effectiveAt: new Date().toISOString(),
      createdBy: `${params.checkerEmail} (Checker) & ${batch.makerEmail} (Maker)`,
      sourceSystem: 'KORIEPAY_SETTLEMENT_ENGINE',
      sourceReference: batch.batchReference,
    });

    batch.status = 'APPROVED';
    batch.checkerId = params.checkerId;
    batch.checkerEmail = params.checkerEmail;
    batch.approvedAt = new Date().toISOString();
    batch.journalEntryId = journal.id;

    this.batches.set(params.batchId, batch);
    return batch;
  }

  /**
   * Dispatches the approved settlement batch to the commercial bank rail.
   */
  public static executeBatchDisbursement(batchId: string): SettlementBatch {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error(`Batch ${batchId} not found.`);
    if (batch.status !== 'APPROVED') {
      throw new Error(`Batch must be in APPROVED status before execution.`);
    }

    batch.status = 'SETTLED';
    batch.providerPayoutReference = `NIP-PAY-${Date.now()}`;
    batch.settledAt = new Date().toISOString();

    this.batches.set(batchId, batch);
    return batch;
  }

  public static getBatches(): SettlementBatch[] {
    this.ensureInitialized();
    return Array.from(this.batches.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static getBatchById(id: string): SettlementBatch | undefined {
    this.ensureInitialized();
    return this.batches.get(id);
  }
}
