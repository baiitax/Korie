// Key Risk Indicator (KRI) Mathematical Metric Engine

import { KriMetricRecord } from '@/types/ermEngine';

export class KriEngine {
  private static instance: KriEngine;

  private kris: Map<string, KriMetricRecord> = new Map();

  private constructor() {
    this.seedKris();
  }

  public static getInstance(): KriEngine {
    if (!KriEngine.instance) {
      KriEngine.instance = new KriEngine();
    }
    return KriEngine.instance;
  }

  private seedKris() {
    const defaultKris: KriMetricRecord[] = [
      {
        id: 'kri-01',
        kriCode: 'KRI-FIN-01',
        name: 'Liquidity Buffer Coverage Ratio',
        category: 'LIQUIDITY_RISK',
        formula: '(Available Liquid Assets / Target Safety Buffer) * 100',
        currentValue: 142.5,
        warningThreshold: 120,
        breachThreshold: 100,
        unit: '%',
        frequency: 'REALTIME',
        status: 'GREEN',
        owner: 'Group Treasurer',
        lastCalculatedAt: new Date().toISOString(),
      },
      {
        id: 'kri-02',
        kriCode: 'KRI-FRD-01',
        name: 'Net Unrecovered Fraud Loss Ratio',
        category: 'FRAUD_RISK',
        formula: '(Net Fraud Losses / Monthly GTV) * 10000 bps',
        currentValue: 0.42,
        warningThreshold: 1.0,
        breachThreshold: 1.5,
        unit: 'bps',
        frequency: 'DAILY',
        status: 'GREEN',
        owner: 'Fraud Operations Desk',
        lastCalculatedAt: new Date().toISOString(),
      },
      {
        id: 'kri-03',
        kriCode: 'KRI-PAY-01',
        name: 'Payment Switch Transaction Failure Rate',
        category: 'OPERATIONAL_RISK',
        formula: '(Failed Transactions / Total Attempts) * 100',
        currentValue: 0.28,
        warningThreshold: 1.0,
        breachThreshold: 2.0,
        unit: '%',
        frequency: 'HOURLY',
        status: 'GREEN',
        owner: 'Switch Core SRE Squad',
        lastCalculatedAt: new Date().toISOString(),
      },
      {
        id: 'kri-04',
        kriCode: 'KRI-AML-01',
        name: 'Overdue AML Alert Investigation Backlog',
        category: 'AML_CFT_RISK',
        formula: 'Count of unclosed high-risk AML cases past 72h SLA',
        currentValue: 0,
        warningThreshold: 3,
        breachThreshold: 10,
        unit: 'cases',
        frequency: 'DAILY',
        status: 'GREEN',
        owner: 'Chief Compliance Officer',
        lastCalculatedAt: new Date().toISOString(),
      },
      {
        id: 'kri-05',
        kriCode: 'KRI-CSH-01',
        name: 'Agent Cash Till Reconciliation Variance Rate',
        category: 'OPERATIONAL_RISK',
        formula: '(Tills with Discrepancy / Total Closed Tills) * 100',
        currentValue: 0.65,
        warningThreshold: 1.5,
        breachThreshold: 3.0,
        unit: '%',
        frequency: 'DAILY',
        status: 'GREEN',
        owner: 'Cash Operations Lead',
        lastCalculatedAt: new Date().toISOString(),
      },
    ];

    defaultKris.forEach((k) => this.kris.set(k.id, k));
  }

  public getKris(): KriMetricRecord[] {
    return Array.from(this.kris.values());
  }
}
