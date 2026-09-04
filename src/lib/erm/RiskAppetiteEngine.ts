// Risk Appetite Framework (RAF) & Threshold Monitoring Engine

import { RiskAppetiteStatement } from '@/types/ermEngine';

export class RiskAppetiteEngine {
  private static instance: RiskAppetiteEngine;

  private statements: Map<string, RiskAppetiteStatement> = new Map();

  private constructor() {
    this.seedStatements();
  }

  public static getInstance(): RiskAppetiteEngine {
    if (!RiskAppetiteEngine.instance) {
      RiskAppetiteEngine.instance = new RiskAppetiteEngine();
    }
    return RiskAppetiteEngine.instance;
  }

  private seedStatements() {
    const defaultStatements: RiskAppetiteStatement[] = [
      {
        id: 'ras-01',
        statementCode: 'RAS-LIQ-BUFFER-01',
        categoryCode: 'LIQUIDITY_RISK',
        title: 'Minimum Available Liquidity Buffer Coverage',
        statementText: 'Maintain minimum 150% liquid asset coverage over stressed 30-day operating requirements.',
        targetMetric: 'Liquidity Buffer Coverage Ratio',
        appetiteLevel: 'ZERO_TOLERANCE',
        warningThreshold: 120,
        breachThreshold: 100,
        currentValue: 142.5,
        unit: '%',
        status: 'WITHIN_APPETITE',
        ownerRole: 'Group Treasurer',
        version: 'v2.0',
      },
      {
        id: 'ras-02',
        statementCode: 'RAS-FRD-LOSS-01',
        categoryCode: 'FRAUD_RISK',
        title: 'Net Monthly Unrecovered Fraud Loss Limit',
        statementText: 'Net unrecovered fraud losses must remain strictly below 1.5 basis points of Gross Transaction Volume.',
        targetMetric: 'Net Fraud Loss (bps of GTV)',
        appetiteLevel: 'LOW',
        warningThreshold: 1.0,
        breachThreshold: 1.5,
        currentValue: 0.42,
        unit: 'bps',
        status: 'WITHIN_APPETITE',
        ownerRole: 'Head of Fraud & Risk',
        version: 'v2.0',
      },
      {
        id: 'ras-03',
        statementCode: 'RAS-SYS-AVAIL-01',
        categoryCode: 'TECHNOLOGY_RISK',
        title: 'Core Payment Switch & Gateway Uptime',
        statementText: 'High-availability operational uptime target of at least 99.95% for core payment processing rails.',
        targetMetric: 'System Availability Uptime',
        appetiteLevel: 'ZERO_TOLERANCE',
        warningThreshold: 99.90,
        breachThreshold: 99.80,
        currentValue: 99.98,
        unit: '%',
        status: 'WITHIN_APPETITE',
        ownerRole: 'CTO / VP Engineering',
        version: 'v2.0',
      },
      {
        id: 'ras-04',
        statementCode: 'RAS-CAP-SOLV-01',
        categoryCode: 'CREDIT_RISK',
        title: 'Regulatory Capital Solvency Headroom',
        statementText: 'Maintain at least 150% capital solvency over sovereign CBN & BCEAO minimum statutory licensing requirements.',
        targetMetric: 'Capital Solvency Coverage Ratio',
        appetiteLevel: 'ZERO_TOLERANCE',
        warningThreshold: 130,
        breachThreshold: 110,
        currentValue: 235.7,
        unit: '%',
        status: 'WITHIN_APPETITE',
        ownerRole: 'Chief Financial Officer',
        version: 'v1.5',
      },
    ];

    defaultStatements.forEach((s) => this.statements.set(s.id, s));
  }

  public getStatements(): RiskAppetiteStatement[] {
    return Array.from(this.statements.values());
  }
}
