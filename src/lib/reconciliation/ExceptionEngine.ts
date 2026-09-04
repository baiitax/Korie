import { 
  ReconciliationException, 
  ExceptionSeverity, 
  ExceptionStatus, 
  MatchResultType, 
  RootCauseCategory 
} from '@/types/reconciliationEngine';
import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';

export class ExceptionEngine {
  private static exceptions: Map<string, ReconciliationException> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialExceptions();
    }
  }

  private static seedInitialExceptions() {
    if (this.exceptions.size > 0) return;

    this.createException({
      runId: 'run_20260902_001',
      transactionId: 'txn_nip_450k',
      providerId: 'PROVIDUS_BANK_NG',
      providerReference: 'NIP-CR-0902003',
      exceptionType: 'MISSING_INTERNAL',
      expectedAmountMinor: 450_000_00,
      actualAmountMinor: 0,
      currency: 'NGN',
      rootCause: 'TIMING_DIFFERENCE',
      assignedDesk: 'TREASURY_RECON_DESK',
    });
  }

  /**
   * Evaluates exception severity based on variance amount, discrepancy type, and exposure.
   */
  public static calculateSeverity(params: {
    discrepancyType: MatchResultType;
    varianceMinor: number;
    currency: 'NGN' | 'XOF' | 'USD';
  }): { severity: ExceptionSeverity; slaHours: number } {
    const isNgn = params.currency === 'NGN';
    const thresholdHighMinor = isNgn ? 500_000_00 : 250_000_00; // ₦500k / 250k CFA
    const thresholdCriticalMinor = isNgn ? 5_000_000_00 : 2_500_000_00; // ₦5M / 2.5M CFA

    if (
      params.discrepancyType === 'UNAUTHORIZED_TRANSACTION' ||
      params.discrepancyType === 'DUPLICATE_EXTERNAL' ||
      params.varianceMinor >= thresholdCriticalMinor
    ) {
      return { severity: 'CRITICAL', slaHours: 4 };
    }

    if (
      params.discrepancyType === 'AMOUNT_MISMATCH' &&
      params.varianceMinor >= thresholdHighMinor
    ) {
      return { severity: 'HIGH', slaHours: 12 };
    }

    if (params.discrepancyType === 'MISSING_EXTERNAL' || params.discrepancyType === 'MISSING_INTERNAL') {
      return { severity: 'HIGH', slaHours: 12 };
    }

    if (params.discrepancyType === 'FEE_MISMATCH' || params.discrepancyType === 'DATE_MISMATCH') {
      return { severity: 'LOW', slaHours: 72 };
    }

    return { severity: 'MEDIUM', slaHours: 24 };
  }

  /**
   * Creates a formal reconciliation exception ticket.
   */
  public static createException(params: {
    runId: string;
    transactionId?: string;
    settlementBatchId?: string;
    providerId: string;
    providerReference?: string;
    exceptionType: MatchResultType;
    expectedAmountMinor: number;
    actualAmountMinor: number;
    currency: 'NGN' | 'XOF' | 'USD';
    rootCause?: RootCauseCategory;
    assignedDesk?: string;
    evidenceReferences?: string[];
  }): ReconciliationException {
    const diff = Math.abs(params.expectedAmountMinor - params.actualAmountMinor);
    const { severity, slaHours } = this.calculateSeverity({
      discrepancyType: params.exceptionType,
      varianceMinor: diff,
      currency: params.currency,
    });

    const slaDueAt = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();
    const id = `exc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = `EXC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const exc: ReconciliationException = {
      id,
      exceptionReference: ref,
      runId: params.runId,
      transactionId: params.transactionId,
      settlementBatchId: params.settlementBatchId,
      providerId: params.providerId,
      providerReference: params.providerReference,
      exceptionType: params.exceptionType,
      severity,
      expectedAmountMinor: params.expectedAmountMinor,
      actualAmountMinor: params.actualAmountMinor,
      differenceMinor: diff,
      currency: params.currency,
      status: 'OPEN',
      assignedDesk: params.assignedDesk || 'TREASURY_RECON_DESK',
      slaDueAt,
      isSlaBreached: false,
      rootCause: params.rootCause || 'UNKNOWN',
      evidenceReferences: params.evidenceReferences || [],
      createdAt: new Date().toISOString(),
    };

    this.exceptions.set(id, exc);
    return exc;
  }

  /**
   * Assigns exception to a specific officer or team desk.
   */
  public static assignException(exceptionId: string, assignedTo: string, desk?: string): ReconciliationException {
    const exc = this.exceptions.get(exceptionId);
    if (!exc) throw new Error(`Exception ${exceptionId} not found.`);

    exc.assignedTo = assignedTo;
    if (desk) exc.assignedDesk = desk;
    exc.status = 'ASSIGNED';
    this.exceptions.set(exceptionId, exc);
    return exc;
  }

  /**
   * MAKER: Submits an exception resolution proposal for Checker review.
   */
  public static submitResolution(params: {
    exceptionId: string;
    rootCause: RootCauseCategory;
    resolutionNotes: string;
    resolutionCode: string;
    makerId: string;
    evidenceReferences?: string[];
  }): ReconciliationException {
    const exc = this.exceptions.get(params.exceptionId);
    if (!exc) throw new Error(`Exception ${params.exceptionId} not found.`);

    exc.status = 'PENDING_MAKER_CHECKER';
    exc.rootCause = params.rootCause;
    exc.resolutionNotes = params.resolutionNotes;
    exc.resolutionCode = params.resolutionCode;
    exc.makerId = params.makerId;
    if (params.evidenceReferences) {
      exc.evidenceReferences.push(...params.evidenceReferences);
    }

    this.exceptions.set(params.exceptionId, exc);
    return exc;
  }

  /**
   * CHECKER: Approves resolution and triggers compensating accounting postings.
   */
  public static approveResolution(params: {
    exceptionId: string;
    checkerId: string;
    checkerRole: string;
  }): ReconciliationException {
    const exc = this.exceptions.get(params.exceptionId);
    if (!exc) throw new Error(`Exception ${params.exceptionId} not found.`);
    if (exc.status !== 'PENDING_MAKER_CHECKER') {
      throw new Error(`Exception must be in PENDING_MAKER_CHECKER status. Current: ${exc.status}`);
    }

    // Segregation of duties assertion
    if (exc.makerId === params.checkerId) {
      throw new Error(`Maker-Checker violation: User cannot approve an exception resolution they submitted.`);
    }

    // Post compensating double-entry journal if financial difference exists
    if (exc.differenceMinor > 0) {
      const journal = DoubleEntryLedgerEngine.postJournalEntry({
        journalNumber: `JE-${exc.exceptionReference}-RESOLVE`,
        ruleCode: 'RULE_RECONCILIATION_EXCEPTION_RESOLUTION_v1',
        ruleVersion: 'v1',
        description: `Compensating resolution for ${exc.exceptionReference}: ${exc.resolutionNotes}`,
        currency: exc.currency,
        totalDebit: exc.differenceMinor,
        totalCredit: exc.differenceMinor,
        lines: [
          {
            id: `jl_exc_${exc.id}_1`,
            journalEntryId: '',
            accountCode: '7300', // Reconciliation Discrepancy Suspense
            accountName: 'Reconciliation Discrepancy Suspense',
            category: 'SUSPENSE',
            direction: 'DEBIT',
            debitAmount: exc.differenceMinor,
            creditAmount: 0,
            currency: exc.currency,
            narration: `Quarantine clearance for ${exc.exceptionReference}`,
            dimension: { country: exc.currency === 'XOF' ? 'NE' : 'NG', currency: exc.currency },
            createdAt: new Date().toISOString(),
          },
          {
            id: `jl_exc_${exc.id}_2`,
            journalEntryId: '',
            accountCode: '1010', // Providus Settlement Pool
            accountName: 'Providus Settlement Pool NGN',
            category: 'ASSET',
            direction: 'CREDIT',
            debitAmount: 0,
            creditAmount: exc.differenceMinor,
            currency: exc.currency,
            narration: `Offset for ${exc.exceptionReference}`,
            dimension: { country: exc.currency === 'XOF' ? 'NE' : 'NG', currency: exc.currency },
            createdAt: new Date().toISOString(),
          },
        ],
        effectiveAt: new Date().toISOString(),
        createdBy: `${params.checkerId} (Checker) & ${exc.makerId} (Maker)`,
        sourceSystem: 'KORIEPAY_RECON_EXCEPTION_ENGINE',
        sourceReference: exc.exceptionReference,
      });

      exc.compensatingJournalId = journal.id;
    }

    exc.status = 'RESOLVED';
    exc.checkerId = params.checkerId;
    exc.resolvedAt = new Date().toISOString();

    this.exceptions.set(params.exceptionId, exc);
    return exc;
  }

  public static getExceptions(filter?: { status?: ExceptionStatus; severity?: ExceptionSeverity }): ReconciliationException[] {
    this.ensureInitialized();
    const list = Array.from(this.exceptions.values());
    const now = Date.now();

    // Dynamically evaluate SLA breaches
    for (const exc of list) {
      if (exc.status !== 'RESOLVED' && exc.status !== 'WRITTEN_OFF') {
        exc.isSlaBreached = new Date(exc.slaDueAt).getTime() < now;
      }
    }

    if (!filter) return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list.filter(e => {
      if (filter.status && e.status !== filter.status) return false;
      if (filter.severity && e.severity !== filter.severity) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static getExceptionById(id: string): ReconciliationException | undefined {
    return this.exceptions.get(id);
  }
}
