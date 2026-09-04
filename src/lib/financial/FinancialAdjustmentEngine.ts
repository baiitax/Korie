import { FinancialAdjustmentRequest, JournalDirection } from '@/types/financialEngine';
import { DoubleEntryLedgerEngine } from './DoubleEntryLedgerEngine';
import { getAccountByCode } from './ChartOfAccounts';

export class FinancialAdjustmentEngine {
  private static requests: Map<string, FinancialAdjustmentRequest> = new Map();

  /**
   * MAKER: Submit adjustment request
   */
  public static submitAdjustmentRequest(params: {
    targetAccountCode: string;
    offsetAccountCode: string;
    amount: number; // minor units
    currency: 'NGN' | 'XOF' | 'USD';
    direction: JournalDirection;
    reason: string;
    supportingEvidence: string;
    makerId: string;
    makerEmail: string;
    makerRole: string;
  }): FinancialAdjustmentRequest {
    if (params.amount <= 0 || !Number.isInteger(params.amount)) {
      throw new Error(`Adjustment amount must be a positive integer in minor units.`);
    }

    const targetAcc = getAccountByCode(params.targetAccountCode);
    const offsetAcc = getAccountByCode(params.offsetAccountCode);

    if (!targetAcc || !offsetAcc) {
      throw new Error(`Target account ${params.targetAccountCode} or Offset account ${params.offsetAccountCode} is invalid.`);
    }

    if (params.targetAccountCode === params.offsetAccountCode) {
      throw new Error(`Target and offset accounts cannot be the same.`);
    }

    const id = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const requestNumber = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const req: FinancialAdjustmentRequest = {
      id,
      requestNumber,
      targetAccountCode: params.targetAccountCode,
      offsetAccountCode: params.offsetAccountCode,
      amount: params.amount,
      currency: params.currency,
      direction: params.direction,
      reason: params.reason,
      supportingEvidence: params.supportingEvidence,
      makerId: params.makerId,
      makerEmail: params.makerEmail,
      makerRole: params.makerRole,
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
    };

    this.requests.set(id, req);
    return req;
  }

  /**
   * CHECKER: Approve adjustment request and post balanced journal
   */
  public static approveAdjustmentRequest(params: {
    requestId: string;
    checkerId: string;
    checkerEmail: string;
    checkerRole: string;
  }): FinancialAdjustmentRequest {
    const req = this.requests.get(params.requestId);
    if (!req) {
      throw new Error(`Adjustment request ${params.requestId} not found.`);
    }
    if (req.status !== 'PENDING_APPROVAL') {
      throw new Error(`Adjustment request is already ${req.status}.`);
    }

    // Dual-control Maker-Checker assertion
    if (req.makerId === params.checkerId) {
      throw new Error(`Maker-Checker violation: The user who created the adjustment request cannot approve it.`);
    }

    const targetAcc = getAccountByCode(req.targetAccountCode)!;
    const offsetAcc = getAccountByCode(req.offsetAccountCode)!;
    const isTargetDebit = req.direction === 'DEBIT';

    // Post double entry journal
    const journal = DoubleEntryLedgerEngine.postJournalEntry({
      journalNumber: `JE-${req.requestNumber}`,
      ruleCode: 'RULE_MANUAL_FINANCIAL_ADJUSTMENT_v1',
      ruleVersion: 'v1',
      description: `Manual Financial Adjustment [${req.requestNumber}]: ${req.reason}`,
      currency: req.currency,
      totalDebit: req.amount,
      totalCredit: req.amount,
      lines: [
        {
          id: `jl_${req.id}_1`,
          journalEntryId: '',
          accountCode: req.targetAccountCode,
          accountName: targetAcc.name,
          category: targetAcc.category,
          direction: isTargetDebit ? 'DEBIT' : 'CREDIT',
          debitAmount: isTargetDebit ? req.amount : 0,
          creditAmount: isTargetDebit ? 0 : req.amount,
          currency: req.currency,
          narration: `Adjustment Target: ${req.reason}`,
          dimension: {
            country: req.currency === 'XOF' ? 'NE' : 'NG',
            currency: req.currency,
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: `jl_${req.id}_2`,
          journalEntryId: '',
          accountCode: req.offsetAccountCode,
          accountName: offsetAcc.name,
          category: offsetAcc.category,
          direction: isTargetDebit ? 'CREDIT' : 'DEBIT',
          debitAmount: isTargetDebit ? 0 : req.amount,
          creditAmount: isTargetDebit ? req.amount : 0,
          currency: req.currency,
          narration: `Adjustment Offset: ${req.reason}`,
          dimension: {
            country: req.currency === 'XOF' ? 'NE' : 'NG',
            currency: req.currency,
          },
          createdAt: new Date().toISOString(),
        },
      ],
      effectiveAt: new Date().toISOString(),
      createdBy: `${params.checkerEmail} (Checker) & ${req.makerEmail} (Maker)`,
      sourceSystem: 'KORIEPAY_MAKER_CHECKER_ENGINE',
      sourceReference: req.requestNumber,
    });

    req.status = 'APPROVED';
    req.checkerId = params.checkerId;
    req.checkerEmail = params.checkerEmail;
    req.checkerRole = params.checkerRole;
    req.generatedJournalId = journal.id;
    req.reviewedAt = new Date().toISOString();

    this.requests.set(req.id, req);
    return req;
  }

  /**
   * CHECKER: Reject adjustment request
   */
  public static rejectAdjustmentRequest(params: {
    requestId: string;
    checkerId: string;
    checkerEmail: string;
    checkerRole: string;
    rejectionReason: string;
  }): FinancialAdjustmentRequest {
    const req = this.requests.get(params.requestId);
    if (!req) {
      throw new Error(`Adjustment request ${params.requestId} not found.`);
    }
    if (req.status !== 'PENDING_APPROVAL') {
      throw new Error(`Adjustment request is already ${req.status}.`);
    }

    if (req.makerId === params.checkerId) {
      throw new Error(`Maker-Checker violation: The user who created the adjustment request cannot reject it.`);
    }

    req.status = 'REJECTED';
    req.checkerId = params.checkerId;
    req.checkerEmail = params.checkerEmail;
    req.checkerRole = params.checkerRole;
    req.reason = `${req.reason} | Rejection: ${params.rejectionReason}`;
    req.reviewedAt = new Date().toISOString();

    this.requests.set(req.id, req);
    return req;
  }

  public static getRequests(): FinancialAdjustmentRequest[] {
    return Array.from(this.requests.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
