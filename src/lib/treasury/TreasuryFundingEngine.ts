import { 
  TreasuryFundingRequest, 
  FundingRequestStatus 
} from '@/types/treasuryEngine';
import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';

export class TreasuryFundingEngine {
  private static requests: Map<string, TreasuryFundingRequest> = new Map();
  private static processedIdempotencyKeys: Set<string> = new Set();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialRequests();
    }
  }

  private static seedInitialRequests() {
    if (this.requests.size > 0) return;

    const req1: TreasuryFundingRequest = {
      id: 'tf_req_20260903_001',
      requestReference: 'TFR-20260903-5512',
      sourceAccountCode: '1010', // Providus Vault
      destinationAccountCode: '2050', // Settlement Pool
      sourceAccountName: 'Providus Bank Nigeria Settlement Vault',
      destinationAccountName: 'Merchant Undisbursed Settlement Pool',
      amountMinor: 1_721_780_000,
      currency: 'NGN',
      purpose: 'Daily T+1 Merchant Settlement Pool Float Top-up',
      priority: 'URGENT',
      status: 'APPROVED',
      makerId: 'usr_maker_treasury_01',
      makerEmail: 'treasury.analyst@koriepay.internal',
      checkerId: 'usr_checker_cfo_99',
      checkerEmail: 'cfo.director@koriepay.internal',
      journalEntryId: 'je_funding_001',
      createdAt: '2026-09-03T10:00:00Z',
      approvedAt: '2026-09-03T10:30:00Z',
      executedAt: '2026-09-03T10:30:05Z',
    };
    this.requests.set(req1.id, req1);
  }

  public static createFundingRequest(params: {
    sourceAccountCode: string;
    destinationAccountCode: string;
    sourceAccountName?: string;
    destinationAccountName?: string;
    amountMinor: number;
    currency?: 'NGN' | 'XOF' | 'USD';
    purpose: string;
    priority?: 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL';
    makerId: string;
    makerEmail: string;
    idempotencyKey?: string;
  }): TreasuryFundingRequest {
    this.ensureInitialized();

    if (params.idempotencyKey && this.processedIdempotencyKeys.has(params.idempotencyKey)) {
      const existing = Array.from(this.requests.values()).find(r => r.makerId === params.makerId);
      if (existing) return existing;
    }

    const ref = `TFR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `tf_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const request: TreasuryFundingRequest = {
      id,
      requestReference: ref,
      sourceAccountCode: params.sourceAccountCode,
      destinationAccountCode: params.destinationAccountCode,
      sourceAccountName: params.sourceAccountName || `Treasury Account [${params.sourceAccountCode}]`,
      destinationAccountName: params.destinationAccountName || `Treasury Account [${params.destinationAccountCode}]`,
      amountMinor: params.amountMinor,
      currency: params.currency || 'NGN',
      purpose: params.purpose,
      priority: params.priority || 'NORMAL',
      status: 'PENDING_APPROVAL',
      makerId: params.makerId,
      makerEmail: params.makerEmail,
      createdAt: new Date().toISOString(),
    };

    if (params.idempotencyKey) {
      this.processedIdempotencyKeys.add(params.idempotencyKey);
    }

    this.requests.set(id, request);
    return request;
  }

  public static approveFundingRequest(params: {
    requestId: string;
    checkerId: string;
    checkerEmail: string;
  }): TreasuryFundingRequest {
    this.ensureInitialized();
    const req = this.requests.get(params.requestId);
    if (!req) {
      throw new Error(`Treasury funding request ${params.requestId} not found.`);
    }

    if (req.status !== 'PENDING_APPROVAL') {
      throw new Error(`Funding request ${req.requestReference} is already ${req.status}.`);
    }

    // Four-Eyes Segregation of Duties
    if (req.makerId === params.checkerId || req.makerEmail.toLowerCase() === params.checkerEmail.toLowerCase()) {
      throw new Error('Maker-Checker Violation: Initiator cannot approve their own funding request.');
    }

    // Post Double-Entry Journal Entry in Core Financial Engine
    const now = new Date().toISOString();
    const journal = DoubleEntryLedgerEngine.postJournalEntry({
      journalNumber: `JE-TFR-${Date.now().toString().slice(-6)}`,
      ruleCode: 'RULE_TREASURY_REBALANCING_v1',
      ruleVersion: 'v1',
      description: `Treasury Rebalancing: ${req.sourceAccountName} -> ${req.destinationAccountName} (${req.purpose})`,
      currency: req.currency as any,
      totalDebit: req.amountMinor,
      totalCredit: req.amountMinor,
      lines: [
        {
          id: `jl_tfr_deb_${Date.now()}`,
          journalEntryId: '',
          accountCode: req.destinationAccountCode,
          accountName: req.destinationAccountName,
          category: 'ASSET',
          direction: 'DEBIT',
          debitAmount: req.amountMinor,
          creditAmount: 0,
          currency: req.currency as any,
          narration: `Rebalancing Inflow to ${req.destinationAccountCode}`,
          dimension: { country: req.currency === 'XOF' ? 'NE' : 'NG', currency: req.currency },
          createdAt: now,
        },
        {
          id: `jl_tfr_cred_${Date.now()}`,
          journalEntryId: '',
          accountCode: req.sourceAccountCode,
          accountName: req.sourceAccountName,
          category: 'ASSET',
          direction: 'CREDIT',
          debitAmount: 0,
          creditAmount: req.amountMinor,
          currency: req.currency as any,
          narration: `Rebalancing Outflow from ${req.sourceAccountCode}`,
          dimension: { country: req.currency === 'XOF' ? 'NE' : 'NG', currency: req.currency },
          createdAt: now,
        },
      ],
      effectiveAt: now,
      createdBy: params.checkerEmail,
      sourceSystem: 'KORIEPAY_TREASURY',
      sourceReference: req.requestReference,
    });

    req.status = 'APPROVED';
    req.checkerId = params.checkerId;
    req.checkerEmail = params.checkerEmail;
    req.approvedAt = now;
    req.executedAt = now;
    req.journalEntryId = journal.id;

    return req;
  }

  public static getAllRequests(): TreasuryFundingRequest[] {
    this.ensureInitialized();
    return Array.from(this.requests.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
