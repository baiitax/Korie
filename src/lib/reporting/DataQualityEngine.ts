// 8-Dimension Enterprise Data Quality Engine & Readiness Gates

import { DataQualityRun } from '@/types/reportingEngine';

export class DataQualityEngine {
  private static instance: DataQualityEngine;

  private runs: Map<string, DataQualityRun> = new Map();

  private constructor() {
    this.seedRuns();
  }

  public static getInstance(): DataQualityEngine {
    if (!DataQualityEngine.instance) {
      DataQualityEngine.instance = new DataQualityEngine();
    }
    return DataQualityEngine.instance;
  }

  private seedRuns() {
    const defaultRuns: DataQualityRun[] = [
      {
        id: 'dq-run-01',
        datasetName: 'ds_cbn_monthly_prudential_returns',
        overallScore: 99.2,
        readinessGate: 'DATA_READY',
        completenessScore: 100.0,
        accuracyScore: 99.5,
        reconciliationScore: 100.0,
        consistencyScore: 98.8,
        timelinessScore: 98.0,
        uniquenessScore: 100.0,
        validityScore: 99.0,
        referentialScore: 99.5,
        executedAt: new Date().toISOString(),
      },
      {
        id: 'dq-run-02',
        datasetName: 'ds_bceao_monthly_eme_liquidity',
        overallScore: 98.6,
        readinessGate: 'DATA_READY',
        completenessScore: 99.0,
        accuracyScore: 99.0,
        reconciliationScore: 100.0,
        consistencyScore: 98.0,
        timelinessScore: 97.5,
        uniquenessScore: 100.0,
        validityScore: 98.5,
        referentialScore: 98.0,
        executedAt: new Date().toISOString(),
      },
      {
        id: 'dq-run-03',
        datasetName: 'ds_nfiu_str_aml_screenings',
        overallScore: 99.8,
        readinessGate: 'DATA_READY',
        completenessScore: 100.0,
        accuracyScore: 100.0,
        reconciliationScore: 100.0,
        consistencyScore: 99.5,
        timelinessScore: 99.5,
        uniquenessScore: 100.0,
        validityScore: 100.0,
        referentialScore: 99.8,
        executedAt: new Date().toISOString(),
      },
      {
        id: 'dq-run-04',
        datasetName: 'ds_ndic_quarterly_insured_deposits',
        overallScore: 98.9,
        readinessGate: 'DATA_READY',
        completenessScore: 100.0,
        accuracyScore: 99.0,
        reconciliationScore: 100.0,
        consistencyScore: 98.5,
        timelinessScore: 98.0,
        uniquenessScore: 100.0,
        validityScore: 98.5,
        referentialScore: 99.0,
        executedAt: new Date().toISOString(),
      },
    ];

    defaultRuns.forEach((r) => this.runs.set(r.id, r));
  }

  public getRuns(): DataQualityRun[] {
    return Array.from(this.runs.values());
  }

  public getOverallHealthScore(): number {
    const list = this.getRuns();
    if (list.length === 0) return 100;
    const sum = list.reduce((acc, r) => acc + r.overallScore, 0);
    return parseFloat((sum / list.length).toFixed(1));
  }
}
