// Till Lifecycle, Session Tracking & Operator Handover Engine

import { TillRecord, TillHandoverRecord, TillStatus } from '@/types/physicalCashEngine';
import { CashLocationEngine } from './CashLocationEngine';

export class TillManagementEngine {
  private static instance: TillManagementEngine;

  private tills: Map<string, TillRecord> = new Map();
  private handovers: TillHandoverRecord[] = [];

  private constructor() {
    this.seedTills();
  }

  public static getInstance(): TillManagementEngine {
    if (!TillManagementEngine.instance) {
      TillManagementEngine.instance = new TillManagementEngine();
    }
    return TillManagementEngine.instance;
  }

  private seedTills() {
    const defaultTills: TillRecord[] = [
      {
        id: 'till-ng-01',
        tillCode: 'TILL-GARBA-01',
        locationId: 'loc-till-garba',
        locationName: 'Garba Express POS Cash Till',
        assignedOperator: 'Musa Garba',
        currency: 'NGN',
        status: 'ACTIVE',
        openingBalance: 1500000,
        currentExpectedBalance: 1850000,
        maxHoldingLimit: 5000000,
        lastOpenedAt: '2026-09-04T07:30:00Z',
        createdAt: '2026-08-01T09:00:00Z',
      },
      {
        id: 'till-ne-01',
        tillCode: 'TILL-SAHEL-01',
        locationId: 'loc-till-sahel',
        locationName: 'Sahel Kiosque Niamey Cash Till',
        assignedOperator: 'Ibrahim Sahel',
        currency: 'XOF',
        status: 'ACTIVE',
        openingBalance: 3500000,
        currentExpectedBalance: 4200000,
        maxHoldingLimit: 10000000,
        lastOpenedAt: '2026-09-04T07:45:00Z',
        createdAt: '2026-08-05T10:00:00Z',
      },
      {
        id: 'till-ng-02',
        tillCode: 'TILL-ALABA-01',
        locationId: 'loc-till-alaba',
        locationName: 'Alaba Central Float Desk Till',
        assignedOperator: 'Chinedu Okeke',
        currency: 'NGN',
        status: 'SUSPENDED',
        openingBalance: 1000000,
        currentExpectedBalance: 450000,
        maxHoldingLimit: 3000000,
        lastOpenedAt: '2026-09-03T08:00:00Z',
        createdAt: '2026-08-10T12:00:00Z',
      },
    ];

    defaultTills.forEach((t) => this.tills.set(t.id, t));
  }

  public getTills(): TillRecord[] {
    return Array.from(this.tills.values());
  }

  public getTill(tillId: string): TillRecord | undefined {
    return this.tills.get(tillId);
  }

  public openTill(params: {
    tillId: string;
    operator: string;
    openingBalance: number;
    approvedBy: string;
  }): { success: boolean; till?: TillRecord; error?: string } {
    const till = this.tills.get(params.tillId);
    if (!till) return { success: false, error: 'TILL_NOT_FOUND' };

    if (till.status === 'ACTIVE') {
      return { success: false, error: 'TILL_ALREADY_ACTIVE' };
    }

    till.status = 'ACTIVE';
    till.assignedOperator = params.operator;
    till.openingBalance = params.openingBalance;
    till.currentExpectedBalance = params.openingBalance;
    till.lastOpenedAt = new Date().toISOString();

    this.tills.set(params.tillId, till);
    return { success: true, till };
  }

  public executeHandover(params: {
    tillId: string;
    outgoingOperator: string;
    incomingOperator: string;
    actualCountedAmount: number;
    notes?: string;
  }): { success: boolean; handover?: TillHandoverRecord; error?: string } {
    const till = this.tills.get(params.tillId);
    if (!till) return { success: false, error: 'TILL_NOT_FOUND' };

    const variance = params.actualCountedAmount - till.currentExpectedBalance;

    const handover: TillHandoverRecord = {
      id: `hnd-${Date.now().toString().slice(-4)}`,
      tillId: params.tillId,
      outgoingOperator: params.outgoingOperator,
      incomingOperator: params.incomingOperator,
      systemExpectedAmount: till.currentExpectedBalance,
      actualCountedAmount: params.actualCountedAmount,
      varianceAmount: variance,
      handoverStatus: variance === 0 ? 'COMPLETED' : 'DISPUTED',
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    this.handovers.unshift(handover);

    if (variance === 0) {
      till.assignedOperator = params.incomingOperator;
      till.status = 'ACTIVE';
    } else {
      till.status = 'SUSPENDED'; // Require supervisor investigation for handover variance
    }

    this.tills.set(params.tillId, till);
    return { success: true, handover };
  }

  public closeTill(params: {
    tillId: string;
    closingCount: number;
    closedBy: string;
  }): { success: boolean; till?: TillRecord; error?: string } {
    const till = this.tills.get(params.tillId);
    if (!till) return { success: false, error: 'TILL_NOT_FOUND' };

    till.status = 'CLOSED';
    till.lastClosedAt = new Date().toISOString();
    this.tills.set(params.tillId, till);

    return { success: true, till };
  }

  public getHandovers(tillId?: string): TillHandoverRecord[] {
    if (tillId) {
      return this.handovers.filter((h) => h.tillId === tillId);
    }
    return this.handovers;
  }
}
