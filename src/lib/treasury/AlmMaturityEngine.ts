// Asset-Liability Management (ALM) & Behavioural Maturity Ladder Engine

import { AlmMaturityBucket, AlmAssumptionRecord, MaturityBucketCode } from '@/types/financialPlanningAlmEngine';

export class AlmMaturityEngine {
  private static instance: AlmMaturityEngine;

  private assumptions: AlmAssumptionRecord[] = [];

  private constructor() {
    this.seedAssumptions();
  }

  public static getInstance(): AlmMaturityEngine {
    if (!AlmMaturityEngine.instance) {
      AlmMaturityEngine.instance = new AlmMaturityEngine();
    }
    return AlmMaturityEngine.instance;
  }

  private seedAssumptions() {
    this.assumptions = [
      {
        id: 'asmp-01',
        assumptionCode: 'ASSUMP-WALLET-RETENTION-v1',
        name: 'Customer Wallet Core Retention Assumption',
        category: 'WALLET_STICKINESS',
        version: 'v1.2',
        effectiveDate: '2026-01-01',
        coreDepositRetentionPct: 75.0,
        volatileRunoffPct: 25.0,
        status: 'APPROVED',
        approvedBy: 'group.treasurer@koriepay.com',
      },
      {
        id: 'asmp-02',
        assumptionCode: 'ASSUMP-AGENT-FLOAT-v1',
        name: 'Agent Network Working Capital Float Stability',
        category: 'AGENT_FLOAT_VOLATILITY',
        version: 'v1.0',
        effectiveDate: '2026-01-01',
        coreDepositRetentionPct: 85.0,
        volatileRunoffPct: 15.0,
        status: 'APPROVED',
        approvedBy: 'cfo@koriepay.com',
      },
    ];
  }

  public getAssumptions(): AlmAssumptionRecord[] {
    return this.assumptions;
  }

  public getMaturityLadders(currency: 'NGN' | 'XOF' = 'NGN'): AlmMaturityBucket[] {
    const isNGN = currency === 'NGN';
    const mult = isNGN ? 1000000 : 2500000;

    const buckets: { code: MaturityBucketCode; label: string; cin: number; cout: number; bin: number; bout: number }[] = [
      { code: '0_1_DAY', label: '0 - 1 Day (Overnight)', cin: 450 * mult, cout: 520 * mult, bin: 450 * mult, bout: 280 * mult },
      { code: '2_7_DAYS', label: '2 - 7 Days', cin: 800 * mult, cout: 750 * mult, bin: 800 * mult, bout: 500 * mult },
      { code: '8_30_DAYS', label: '8 - 30 Days', cin: 1200 * mult, cout: 1100 * mult, bin: 1200 * mult, bout: 850 * mult },
      { code: '31_90_DAYS', label: '31 - 90 Days (Q1)', cin: 2500 * mult, cout: 2200 * mult, bin: 2500 * mult, bout: 1800 * mult },
      { code: '91_180_DAYS', label: '91 - 180 Days (H1)', cin: 4000 * mult, cout: 3600 * mult, bin: 4000 * mult, bout: 3000 * mult },
      { code: '181_365_DAYS', label: '181 - 365 Days (1 Year)', cin: 6500 * mult, cout: 5800 * mult, bin: 6500 * mult, bout: 4800 * mult },
      { code: '1_2_YEARS', label: '1 - 2 Years', cin: 8000 * mult, cout: 7000 * mult, bin: 8000 * mult, bout: 6000 * mult },
      { code: '2_5_YEARS', label: '2 - 5 Years', cin: 12000 * mult, cout: 10000 * mult, bin: 12000 * mult, bout: 8500 * mult },
      { code: '5_YEARS_PLUS', label: '5+ Years', cin: 5000 * mult, cout: 3000 * mult, bin: 5000 * mult, bout: 2500 * mult },
    ];

    let runningCum = 0;

    return buckets.map((b) => {
      const contractualGap = b.cin - b.cout;
      const behaviouralGap = b.bin - b.bout;
      runningCum += behaviouralGap;

      return {
        bucketCode: b.code,
        bucketLabel: b.label,
        currency,
        contractualInflows: b.cin,
        contractualOutflows: b.cout,
        contractualNetGap: contractualGap,
        behaviouralInflows: b.bin,
        behaviouralOutflows: b.bout,
        behaviouralNetGap: behaviouralGap,
        cumulativeGap: runningCum,
      };
    });
  }
}
