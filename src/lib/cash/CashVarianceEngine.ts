// Cash Variance Classification, Investigation & Compensating Adjustment Engine

import { CashVarianceRecord } from '@/types/physicalCashEngine';
import { CashLocationEngine } from './CashLocationEngine';

export class CashVarianceEngine {
  private static instance: CashVarianceEngine;

  private variances: Map<string, CashVarianceRecord> = new Map();

  private constructor() {
    this.seedVariances();
  }

  public static getInstance(): CashVarianceEngine {
    if (!CashVarianceEngine.instance) {
      CashVarianceEngine.instance = new CashVarianceEngine();
    }
    return CashVarianceEngine.instance;
  }

  private seedVariances() {
    const defaultVariances: CashVarianceRecord[] = [
      {
        id: 'var-01',
        varianceReference: 'VAR-2026-0903-01',
        locationId: 'loc-till-garba',
        locationName: 'Garba Express POS Cash Till',
        currency: 'NGN',
        expectedAmount: 1850000,
        actualAmount: 1845000,
        varianceAmount: -5000,
        varianceType: 'SHORTAGE',
        severity: 'LOW',
        status: 'RESOLVED',
        investigatedBy: 'compliance@koriepay.ng',
        glSuspenseJournalId: 'JE-VAR-2026-0091',
        rootCauseNotes: 'Customer cash-out rounding change discrepancy. Reconciled and logged.',
        resolvedAt: '2026-09-03T18:00:00Z',
        createdAt: '2026-09-03T16:30:00Z',
      },
      {
        id: 'var-02',
        varianceReference: 'VAR-2026-0904-02',
        locationId: 'loc-till-alaba',
        locationName: 'Alaba Central Float Desk Till',
        currency: 'NGN',
        expectedAmount: 500000,
        actualAmount: 450000,
        varianceAmount: -50000,
        varianceType: 'SHORTAGE',
        severity: 'HIGH',
        status: 'INVESTIGATION_REQUIRED',
        investigatedBy: 'audit.desk@koriepay.ng',
        glSuspenseJournalId: 'JE-VAR-2026-0092',
        rootCauseNotes: 'Unexplained shortage during mid-day till count. Till placed in SUSPENDED status.',
        createdAt: '2026-09-04T08:15:00Z',
      },
    ];

    defaultVariances.forEach((v) => this.variances.set(v.id, v));
  }

  public getVariances(): CashVarianceRecord[] {
    return Array.from(this.variances.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public resolveVariance(params: {
    varianceId: string;
    rootCauseNotes: string;
    resolvedBy: string;
  }): { success: boolean; variance?: CashVarianceRecord } {
    const v = this.variances.get(params.varianceId);
    if (!v) return { success: false };

    v.status = 'RESOLVED';
    v.rootCauseNotes = params.rootCauseNotes;
    v.investigatedBy = params.resolvedBy;
    v.resolvedAt = new Date().toISOString();

    this.variances.set(params.varianceId, v);
    return { success: true, variance: v };
  }
}
