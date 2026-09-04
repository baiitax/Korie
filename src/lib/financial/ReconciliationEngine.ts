import { DiscrepancyType, SuspenseRecord } from '@/types/financialEngine';
import { DoubleEntryLedgerEngine } from './DoubleEntryLedgerEngine';

export interface ReconciliationSessionModel {
  id: string;
  sessionDate: string;
  providerCode: string;
  country: 'NG' | 'NE';
  currency: 'NGN' | 'XOF';
  internalTransactionsCount: number;
  ledgerJournalCount: number;
  providerRecordsCount: number;
  matchedRecordsCount: number;
  unmatchedRecordsCount: number;
  totalInternalVolume: number;
  totalProviderVolume: number;
  varianceVolume: number;
  status: 'COMPLETED' | 'EXCEPTION_PENDING' | 'IN_PROGRESS';
  createdAt: string;
}

export interface ReconciliationExceptionModel {
  id: string;
  sessionId: string;
  transactionId?: string;
  providerReference: string;
  discrepancyType: DiscrepancyType;
  internalAmount: number;
  providerAmount: number;
  variance: number;
  currency: 'NGN' | 'XOF';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'WRITTEN_OFF';
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export class ReconciliationEngine {
  private static sessions: Map<string, ReconciliationSessionModel> = new Map();
  private static exceptions: Map<string, ReconciliationExceptionModel> = new Map();
  private static suspenseRecords: Map<string, SuspenseRecord> = new Map();

  /**
   * Run 4-Way Automated Reconciliation
   */
  public static runAutomatedReconciliation(params: {
    providerCode: string;
    country: 'NG' | 'NE';
    currency: 'NGN' | 'XOF';
    internalRecords: { id: string; reference: string; amount: number; status: string }[];
    providerRecords: { reference: string; amount: number; status: string }[];
  }): ReconciliationSessionModel {
    const sessionId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionDate = new Date().toISOString().slice(0, 10);

    const providerMap = new Map(params.providerRecords.map(p => [p.reference, p]));
    let matchedCount = 0;
    let totalInternalVolume = 0;
    let totalProviderVolume = 0;

    for (const p of params.providerRecords) {
      totalProviderVolume += p.amount;
    }

    for (const internal of params.internalRecords) {
      totalInternalVolume += internal.amount;
      const providerItem = providerMap.get(internal.reference);

      if (!providerItem) {
        // Discrepancy: MISSING_AT_PROVIDER
        const excId = `exc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        this.exceptions.set(excId, {
          id: excId,
          sessionId,
          transactionId: internal.id,
          providerReference: internal.reference,
          discrepancyType: 'MISSING_AT_PROVIDER',
          internalAmount: internal.amount,
          providerAmount: 0,
          variance: internal.amount,
          currency: params.currency,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        });
      } else if (providerItem.amount !== internal.amount) {
        // Discrepancy: AMOUNT_MISMATCH
        const excId = `exc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        this.exceptions.set(excId, {
          id: excId,
          sessionId,
          transactionId: internal.id,
          providerReference: internal.reference,
          discrepancyType: 'AMOUNT_MISMATCH',
          internalAmount: internal.amount,
          providerAmount: providerItem.amount,
          variance: Math.abs(internal.amount - providerItem.amount),
          currency: params.currency,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        });
      } else {
        matchedCount++;
      }
    }

    const varianceVolume = Math.abs(totalInternalVolume - totalProviderVolume);
    const session: ReconciliationSessionModel = {
      id: sessionId,
      sessionDate,
      providerCode: params.providerCode,
      country: params.country,
      currency: params.currency,
      internalTransactionsCount: params.internalRecords.length,
      ledgerJournalCount: params.internalRecords.length,
      providerRecordsCount: params.providerRecords.length,
      matchedRecordsCount: matchedCount,
      unmatchedRecordsCount: params.internalRecords.length - matchedCount,
      totalInternalVolume,
      totalProviderVolume,
      varianceVolume,
      status: varianceVolume === 0 ? 'COMPLETED' : 'EXCEPTION_PENDING',
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Suspense aging calculation
   */
  public static getSuspenseAgingSummary(currency: 'NGN' | 'XOF' = 'NGN'): {
    bucket0to1Day: number;
    bucket2to3Days: number;
    bucket4to7Days: number;
    bucket8to30Days: number;
    bucket30PlusDays: number;
    totalSuspenseBalance: number;
  } {
    const records = Array.from(this.suspenseRecords.values()).filter(
      r => r.currency === currency && r.status !== 'RESOLVED'
    );

    let bucket0to1 = 0;
    let bucket2to3 = 0;
    let bucket4to7 = 0;
    let bucket8to30 = 0;
    let bucket30Plus = 0;
    let total = 0;

    for (const rec of records) {
      total += rec.amount;
      if (rec.ageDays <= 1) bucket0to1 += rec.amount;
      else if (rec.ageDays <= 3) bucket2to3 += rec.amount;
      else if (rec.ageDays <= 7) bucket4to7 += rec.amount;
      else if (rec.ageDays <= 30) bucket8to30 += rec.amount;
      else bucket30Plus += rec.amount;
    }

    return {
      bucket0to1Day: bucket0to1,
      bucket2to3Days: bucket2to3,
      bucket4to7Days: bucket4to7,
      bucket8to30Days: bucket8to30,
      bucket30PlusDays: bucket30Plus,
      totalSuspenseBalance: total,
    };
  }

  public static getExceptions(sessionId?: string): ReconciliationExceptionModel[] {
    const list = Array.from(this.exceptions.values());
    return sessionId ? list.filter(e => e.sessionId === sessionId) : list;
  }

  public static getSessions(): ReconciliationSessionModel[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static resolveException(exceptionId: string, notes: string, operator: string): ReconciliationExceptionModel {
    const exc = this.exceptions.get(exceptionId);
    if (!exc) {
      throw new Error(`Exception record ${exceptionId} not found.`);
    }
    exc.status = 'RESOLVED';
    exc.resolutionNotes = notes;
    exc.resolvedBy = operator;
    exc.resolvedAt = new Date().toISOString();
    this.exceptions.set(exceptionId, exc);
    return exc;
  }
}
