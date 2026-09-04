// Physical Cash Drawer, Denomination Counting & End-of-Day Reconciliation Engine

import { AgentCashCountRecord } from '@/types/agencyEngine';

export class CashReconciliationEngine {
  private static instance: CashReconciliationEngine;

  private cashCounts: AgentCashCountRecord[] = [];

  private constructor() {
    this.seedCashCounts();
  }

  public static getInstance(): CashReconciliationEngine {
    if (!CashReconciliationEngine.instance) {
      CashReconciliationEngine.instance = new CashReconciliationEngine();
    }
    return CashReconciliationEngine.instance;
  }

  private seedCashCounts() {
    this.cashCounts = [
      {
        id: 'cc-01',
        agentId: 'agt-ng-001',
        currency: 'NGN',
        denominationBreakdown: { '1000': 1500, '500': 700 },
        totalPhysicalCash: 1850000,
        expectedCash: 1850000,
        varianceAmount: 0,
        status: 'MATCHED',
        submittedBy: 'garba.express@koriepay.ng',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'cc-02',
        agentId: 'agt-ne-001',
        currency: 'XOF',
        denominationBreakdown: { '10000': 300, '5000': 240 },
        totalPhysicalCash: 4200000,
        expectedCash: 4200000,
        varianceAmount: 0,
        status: 'MATCHED',
        submittedBy: 'sahel.kiosque@koriepay.ne',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  public getCashCounts(agentId?: string): AgentCashCountRecord[] {
    let list = [...this.cashCounts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (agentId) {
      list = list.filter((c) => c.agentId === agentId);
    }
    return list;
  }

  public submitCashCount(params: {
    agentId: string;
    currency: 'NGN' | 'XOF';
    denominationBreakdown: Record<string, number>;
    expectedCash: number;
    submittedBy: string;
  }): AgentCashCountRecord {
    let total = 0;
    Object.entries(params.denominationBreakdown).forEach(([denom, count]) => {
      total += parseInt(denom, 10) * count;
    });

    const variance = total - params.expectedCash;
    let status: 'MATCHED' | 'SHORT' | 'OVER' = 'MATCHED';
    if (variance < 0) status = 'SHORT';
    if (variance > 0) status = 'OVER';

    const record: AgentCashCountRecord = {
      id: `cc-${Date.now().toString().slice(-4)}`,
      agentId: params.agentId,
      currency: params.currency,
      denominationBreakdown: params.denominationBreakdown,
      totalPhysicalCash: total,
      expectedCash: params.expectedCash,
      varianceAmount: variance,
      status,
      submittedBy: params.submittedBy,
      createdAt: new Date().toISOString(),
    };

    this.cashCounts.unshift(record);
    return record;
  }
}
