// Sovereign Capital Management & Regulatory Solvency Engine

import { CapitalPositionRecord } from '@/types/financialPlanningAlmEngine';

export class CapitalManagementEngine {
  private static instance: CapitalManagementEngine;

  private capitalPositions: Map<string, CapitalPositionRecord> = new Map();

  private constructor() {
    this.seedCapitalPositions();
  }

  public static getInstance(): CapitalManagementEngine {
    if (!CapitalManagementEngine.instance) {
      CapitalManagementEngine.instance = new CapitalManagementEngine();
    }
    return CapitalManagementEngine.instance;
  }

  private seedCapitalPositions() {
    const defaultPositions: CapitalPositionRecord[] = [
      {
        id: 'cap-ng-01',
        country: 'NG',
        currency: 'NGN',
        paidUpCapital: 2500000000,
        retainedEarnings: 1250000000,
        statutoryReserves: 625000000,
        currentPeriodProfit: 340000000,
        totalQualifyingCapital: 4715000000,
        regulatoryMinimumCapital: 2000000000, // CBN National PSP License Minimum
        capitalHeadroom: 2715000000,
        solvencyRatioPct: 235.75,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cap-ne-01',
        country: 'NE',
        currency: 'XOF',
        paidUpCapital: 5000000000,
        retainedEarnings: 2100000000,
        statutoryReserves: 1050000000,
        currentPeriodProfit: 780000000,
        totalQualifyingCapital: 8930000000,
        regulatoryMinimumCapital: 3000000000, // BCEAO WAEMU E-Money Issuer Minimum
        capitalHeadroom: 5930000000,
        solvencyRatioPct: 297.66,
        updatedAt: new Date().toISOString(),
      },
    ];

    defaultPositions.forEach((p) => this.capitalPositions.set(p.id, p));
  }

  public getCapitalPositions(): CapitalPositionRecord[] {
    return Array.from(this.capitalPositions.values());
  }
}
