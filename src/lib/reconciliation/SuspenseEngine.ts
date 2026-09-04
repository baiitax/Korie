import { SuspenseAgingSchedule } from '@/types/reconciliationEngine';
import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';

export interface SuspenseItemRecord {
  id: string;
  itemReference: string;
  accountCode: string; // 7100, 7200, 7300
  amountMinor: number;
  currency: 'NGN' | 'XOF' | 'USD';
  sourceReference: string;
  providerCode: string;
  reason: string;
  ageDays: number;
  status: 'OPEN' | 'INVESTIGATING' | 'PENDING_APPROVAL' | 'RESOLVED' | 'WRITTEN_OFF';
  ownerDesk: string;
  makerId?: string;
  checkerId?: string;
  resolutionAction?: string;
  resolutionJournalId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export class SuspenseEngine {
  private static suspenseItems: Map<string, SuspenseItemRecord> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialSuspense();
    }
  }

  private static seedInitialSuspense() {
    if (this.suspenseItems.size > 0) return;

    this.parkInSuspense({
      accountCode: '7100',
      amountMinor: 450_000_00,
      currency: 'NGN',
      sourceReference: 'NIP-CR-0902003',
      providerCode: 'PROVIDUS_BANK_NG',
      reason: 'Unmatched inbound NIP deposit awaiting customer identification',
    });
  }

  /**
   * Quarantines funds into a controlled suspense account.
   */
  public static parkInSuspense(params: {
    accountCode: '7100' | '7200' | '7300';
    amountMinor: number;
    currency: 'NGN' | 'XOF' | 'USD';
    sourceReference: string;
    providerCode: string;
    reason: string;
    ownerDesk?: string;
  }): SuspenseItemRecord {
    const id = `susp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = `SUSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const item: SuspenseItemRecord = {
      id,
      itemReference: ref,
      accountCode: params.accountCode,
      amountMinor: params.amountMinor,
      currency: params.currency,
      sourceReference: params.sourceReference,
      providerCode: params.providerCode,
      reason: params.reason,
      ageDays: 0,
      status: 'OPEN',
      ownerDesk: params.ownerDesk || 'TREASURY_OPS',
      createdAt: new Date().toISOString(),
    };

    this.suspenseItems.set(id, item);
    return item;
  }

  /**
   * Computes the authoritative 6-stage Suspense Aging Schedule.
   */
  public static getAgingSchedule(currency: 'NGN' | 'XOF' | 'USD' = 'NGN'): SuspenseAgingSchedule {
    this.ensureInitialized();
    const activeItems = Array.from(this.suspenseItems.values()).filter(
      item => item.currency === currency && (item.status === 'OPEN' || item.status === 'INVESTIGATING' || item.status === 'PENDING_APPROVAL')
    );

    let total = 0;
    let b0to1 = 0;
    let b2to3 = 0;
    let b4to7 = 0;
    let b8to14 = 0;
    let b15to30 = 0;
    let b30Plus = 0;
    let criticalCount = 0;

    for (const item of activeItems) {
      total += item.amountMinor;

      if (item.ageDays <= 1) {
        b0to1 += item.amountMinor;
      } else if (item.ageDays <= 3) {
        b2to3 += item.amountMinor;
      } else if (item.ageDays <= 7) {
        b4to7 += item.amountMinor;
      } else if (item.ageDays <= 14) {
        b8to14 += item.amountMinor;
      } else if (item.ageDays <= 30) {
        b15to30 += item.amountMinor;
        criticalCount++;
      } else {
        b30Plus += item.amountMinor;
        criticalCount++;
      }
    }

    return {
      currency,
      totalSuspenseMinor: total,
      bucket0to1DayMinor: b0to1,
      bucket2to3DaysMinor: b2to3,
      bucket4to7DaysMinor: b4to7,
      bucket8to14DaysMinor: b8to14,
      bucket15to30DaysMinor: b15to30,
      bucket30PlusDaysMinor: b30Plus,
      itemCount: activeItems.length,
      criticalEscalationCount: criticalCount,
    };
  }

  /**
   * MAKER: Submits a suspense resolution proposal.
   */
  public static submitResolution(params: {
    suspenseId: string;
    action: 'MATCH_TO_TRANSACTION' | 'RETURN_FUNDS' | 'POST_TO_CUSTOMER' | 'POST_TO_MERCHANT' | 'ACCOUNTING_ADJUSTMENT' | 'WRITE_OFF';
    targetAccountCode: string;
    justification: string;
    makerId: string;
  }): SuspenseItemRecord {
    const item = this.suspenseItems.get(params.suspenseId);
    if (!item) throw new Error(`Suspense item ${params.suspenseId} not found.`);

    item.status = 'PENDING_APPROVAL';
    item.resolutionAction = params.action;
    item.makerId = params.makerId;
    this.suspenseItems.set(params.suspenseId, item);
    return item;
  }

  /**
   * CHECKER: Approves resolution and posts balancing double-entry journal.
   */
  public static approveResolution(params: {
    suspenseId: string;
    targetAccountCode: string;
    checkerId: string;
  }): SuspenseItemRecord {
    const item = this.suspenseItems.get(params.suspenseId);
    if (!item) throw new Error(`Suspense item ${params.suspenseId} not found.`);
    if (item.status !== 'PENDING_APPROVAL') {
      throw new Error(`Suspense item must be in PENDING_APPROVAL status.`);
    }

    if (item.makerId === params.checkerId) {
      throw new Error(`Maker-Checker violation: User cannot approve their own suspense resolution.`);
    }

    // Post Double-entry Journal: Debit Suspense Account, Credit Target Account
    const journal = DoubleEntryLedgerEngine.postJournalEntry({
      journalNumber: `JE-${item.itemReference}-RELEASE`,
      ruleCode: 'RULE_SUSPENSE_RESOLUTION_v1',
      ruleVersion: 'v1',
      description: `Suspense Release [${item.itemReference}] to [${params.targetAccountCode}]`,
      currency: item.currency,
      totalDebit: item.amountMinor,
      totalCredit: item.amountMinor,
      lines: [
        {
          id: `jl_susp_${item.id}_1`,
          journalEntryId: '',
          accountCode: item.accountCode, // Debit Suspense reduces suspense liability
          accountName: `Suspense Clearance ${item.accountCode}`,
          category: 'SUSPENSE',
          direction: 'DEBIT',
          debitAmount: item.amountMinor,
          creditAmount: 0,
          currency: item.currency,
          narration: `Suspense clearing for ${item.itemReference}`,
          dimension: { country: item.currency === 'XOF' ? 'NE' : 'NG', currency: item.currency },
          createdAt: new Date().toISOString(),
        },
        {
          id: `jl_susp_${item.id}_2`,
          journalEntryId: '',
          accountCode: params.targetAccountCode, // Credit target (e.g. 2010 Customer Deposits)
          accountName: `Target Allocation ${params.targetAccountCode}`,
          category: 'LIABILITY',
          direction: 'CREDIT',
          debitAmount: 0,
          creditAmount: item.amountMinor,
          currency: item.currency,
          narration: `Release of ${item.itemReference} into ${params.targetAccountCode}`,
          dimension: { country: item.currency === 'XOF' ? 'NE' : 'NG', currency: item.currency },
          createdAt: new Date().toISOString(),
        },
      ],
      effectiveAt: new Date().toISOString(),
      createdBy: `${params.checkerId} (Checker) & ${item.makerId} (Maker)`,
      sourceSystem: 'KORIEPAY_SUSPENSE_ENGINE',
      sourceReference: item.itemReference,
    });

    item.status = 'RESOLVED';
    item.checkerId = params.checkerId;
    item.resolutionJournalId = journal.id;
    item.resolvedAt = new Date().toISOString();

    this.suspenseItems.set(params.suspenseId, item);
    return item;
  }

  public static getSuspenseItems(): SuspenseItemRecord[] {
    return Array.from(this.suspenseItems.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
