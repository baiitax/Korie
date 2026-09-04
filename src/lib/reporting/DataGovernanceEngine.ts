// Controlled Reporting Adjustments & Governed Exports Engine

import { ReportingAdjustment, ReportExportRecord } from '@/types/reportingEngine';

export class DataGovernanceEngine {
  private static instance: DataGovernanceEngine;

  private adjustments: Map<string, ReportingAdjustment> = new Map();
  private exports: Map<string, ReportExportRecord> = new Map();

  private constructor() {
    this.seedData();
  }

  public static getInstance(): DataGovernanceEngine {
    if (!DataGovernanceEngine.instance) {
      DataGovernanceEngine.instance = new DataGovernanceEngine();
    }
    return DataGovernanceEngine.instance;
  }

  private seedData() {
    const defaultAdjustments: ReportingAdjustment[] = [
      {
        id: 'adj-01',
        metricCode: 'MTR-FIN-001',
        periodCode: '2026-M08',
        previousValue: 11848500000,
        adjustedValue: 11850000000,
        adjustmentReason: 'Reconciliation adjustment on late uncredited merchant clearing batch from Providus NIP.',
        requestedBy: 'Financial Controller',
        approvedBy: 'Chief Financial Officer',
        status: 'APPROVED',
        createdAt: '2026-09-01T15:00:00Z',
      },
    ];

    const defaultExports: ReportExportRecord[] = [
      {
        id: 'exp-01',
        datasetName: 'cbn_monthly_prudential_returns_2026_m08',
        exportFormat: 'PDF',
        requestedBy: 'Regulatory Reporting Lead',
        purpose: 'Statutory submission filing pack for Central Bank of Nigeria',
        riskAssessment: 'PASSED_PII_MASKED',
        status: 'COMPLETED',
        createdAt: '2026-09-03T09:10:00Z',
      },
    ];

    defaultAdjustments.forEach((a) => this.adjustments.set(a.id, a));
    defaultExports.forEach((e) => this.exports.set(e.id, e));
  }

  public getAdjustments(): ReportingAdjustment[] {
    return Array.from(this.adjustments.values());
  }

  public getExports(): ReportExportRecord[] {
    return Array.from(this.exports.values());
  }

  public requestAdjustment(data: Omit<ReportingAdjustment, 'id' | 'status' | 'createdAt'>): ReportingAdjustment {
    const id = `adj-${Date.now().toString().slice(-4)}`;
    const adj: ReportingAdjustment = {
      ...data,
      id,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.adjustments.set(id, adj);
    return adj;
  }

  public approveAdjustment(id: string, approvedBy: string): { success: boolean; adjustment?: ReportingAdjustment } {
    const adj = this.adjustments.get(id);
    if (!adj) return { success: false };

    adj.status = 'APPROVED';
    adj.approvedBy = approvedBy;
    this.adjustments.set(id, adj);
    return { success: true, adjustment: adj };
  }
}
