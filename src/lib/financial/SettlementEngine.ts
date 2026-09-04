import { SettlementBatchStatus } from '@/types/financialEngine';
import { DoubleEntryLedgerEngine } from './DoubleEntryLedgerEngine';
import { AccountingRuleEngine } from './AccountingRuleEngine';

export interface SettlementBatchModel {
  id: string;
  batchNumber: string;
  partnerId: string;
  partnerName: string;
  partnerType: 'MERCHANT' | 'AGENT' | 'AGGREGATOR';
  currency: 'NGN' | 'XOF';
  grossAmount: number;
  feeDeductions: number;
  reserveDeductions: number;
  netPayable: number;
  itemCount: number;
  status: SettlementBatchStatus;
  payoutBankCode: string;
  payoutAccountNumber: string;
  payoutAccountName: string;
  settlementRule: 'T+1' | 'T+0' | 'T+2';
  journalEntryId?: string;
  payoutReference?: string;
  createdAt: string;
  settledAt?: string;
}

export class SettlementEngine {
  private static batches: Map<string, SettlementBatchModel> = new Map();

  /**
   * Create and calculate a merchant settlement batch.
   */
  public static createMerchantBatch(params: {
    partnerId: string;
    partnerName: string;
    currency: 'NGN' | 'XOF';
    grossAmount: number;
    feeDeductions: number;
    reserveHoldAmount?: number;
    itemCount: number;
    payoutBankCode: string;
    payoutAccountNumber: string;
    payoutAccountName: string;
  }): SettlementBatchModel {
    const batchId = `sb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const batchNumber = `SETTLE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const reserve = params.reserveHoldAmount || 0;
    const net = params.grossAmount - params.feeDeductions - reserve;

    if (net < 0) {
      throw new Error(`Net payable cannot be negative: Gross=${params.grossAmount}, Fees=${params.feeDeductions}, Reserve=${reserve}`);
    }

    const batch: SettlementBatchModel = {
      id: batchId,
      batchNumber,
      partnerId: params.partnerId,
      partnerName: params.partnerName,
      partnerType: 'MERCHANT',
      currency: params.currency,
      grossAmount: params.grossAmount,
      feeDeductions: params.feeDeductions,
      reserveDeductions: reserve,
      netPayable: net,
      itemCount: params.itemCount,
      status: 'READY',
      payoutBankCode: params.payoutBankCode,
      payoutAccountNumber: params.payoutAccountNumber,
      payoutAccountName: params.payoutAccountName,
      settlementRule: 'T+1',
      createdAt: new Date().toISOString(),
    };

    this.batches.set(batchId, batch);
    return batch;
  }

  /**
   * Execute settlement batch: posts ledger journal and dispatches payout.
   */
  public static executeBatchPayout(batchId: string, operator: string = 'AUTOMATED_SETTLEMENT_WORKER'): SettlementBatchModel {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Settlement batch ${batchId} not found.`);
    }
    if (batch.status === 'SETTLED') {
      throw new Error(`Batch ${batchId} has already been settled.`);
    }

    // Generate balanced double entry lines
    // Debit: 2050 (Merchant Payables)
    // Credit: 1010 (Providus Settlement Pool NGN)
    const ruleCode = batch.currency === 'NGN' ? 'RULE_MERCHANT_SETTLEMENT_NGN_v1' : 'RULE_MERCHANT_SETTLEMENT_NGN_v1';
    
    const lines = AccountingRuleEngine.generateLines({
      journalEntryId: '',
      ruleCode,
      principalAmount: batch.netPayable,
      currency: batch.currency,
      dimension: {
        country: batch.currency === 'NGN' ? 'NG' : 'NE',
        currency: batch.currency,
        merchantId: batch.partnerId,
        settlementBatchId: batch.id,
      },
      narration: `Merchant Settlement Payout for Batch ${batch.batchNumber} to ${batch.partnerName}`,
    });

    const journal = DoubleEntryLedgerEngine.postJournalEntry({
      journalNumber: `JE-${batch.batchNumber}`,
      ruleCode,
      ruleVersion: 'v1',
      description: `Settlement Disbursement to ${batch.partnerName} (${batch.payoutAccountNumber})`,
      currency: batch.currency,
      totalDebit: batch.netPayable,
      totalCredit: batch.netPayable,
      lines,
      effectiveAt: new Date().toISOString(),
      createdBy: operator,
      sourceSystem: 'KORIEPAY_SETTLEMENT_ENGINE',
      sourceReference: batch.batchNumber,
    });

    batch.status = 'SETTLED';
    batch.journalEntryId = journal.id;
    batch.payoutReference = `PAY-NIP-${Date.now()}`;
    batch.settledAt = new Date().toISOString();

    this.batches.set(batchId, batch);
    return batch;
  }

  public static getAllBatches(): SettlementBatchModel[] {
    return Array.from(this.batches.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static getBatch(batchId: string): SettlementBatchModel | undefined {
    return this.batches.get(batchId);
  }
}
