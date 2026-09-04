// Non-Destructive Regulatory Restatement & Amendment Engine

import { RegulatoryRestatement } from '@/types/reportingEngine';

export class RestatementEngine {
  private static instance: RestatementEngine;

  private restatements: Map<string, RegulatoryRestatement> = new Map();

  private constructor() {
    this.seedRestatements();
  }

  public static getInstance(): RestatementEngine {
    if (!RestatementEngine.instance) {
      RestatementEngine.instance = new RestatementEngine();
    }
    return RestatementEngine.instance;
  }

  private seedRestatements() {
    const defaultRestatements: RegulatoryRestatement[] = [
      {
        id: 'rst-2026-07-01',
        originalSnapshotId: 'snp-cbn-2026-07-ORIG',
        amendedSnapshotId: 'snp-cbn-2026-07-AMEND',
        obligationCode: 'OBL-CBN-FIN-01',
        periodCode: '2026-M07',
        restatementReason: 'Post-close reconciliation adjustment on Providus NIP settlement clearing fee accrual.',
        deltaSummary: [
          {
            metric: 'Total Interchange Processing Expenses',
            originalValue: 42500000,
            amendedValue: 41800000,
            delta: -700000,
          },
          {
            metric: 'Net Operating Profit (P&L)',
            originalValue: 885000000,
            amendedValue: 885700000,
            delta: 700000,
          },
        ],
        approvedBy: 'Chief Financial Officer (CFO)',
        createdAt: '2026-08-12T16:00:00Z',
      },
    ];

    defaultRestatements.forEach((r) => this.restatements.set(r.id, r));
  }

  public getRestatements(): RegulatoryRestatement[] {
    return Array.from(this.restatements.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
