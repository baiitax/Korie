// Cash Position, Denomination Count & Variance Computation Engine

import { CashPositionRecord, CashCountRecord, LiquidityState } from '@/types/physicalCashEngine';
import { CashLocationEngine } from './CashLocationEngine';

export class CashPositionEngine {
  private static instance: CashPositionEngine;

  private positions: Map<string, CashPositionRecord> = new Map();
  private counts: CashCountRecord[] = [];

  private constructor() {
    this.seedPositions();
  }

  public static getInstance(): CashPositionEngine {
    if (!CashPositionEngine.instance) {
      CashPositionEngine.instance = new CashPositionEngine();
    }
    return CashPositionEngine.instance;
  }

  private seedPositions() {
    const defaultPositions: CashPositionRecord[] = [
      {
        id: 'pos-vlt-abj',
        locationId: 'loc-vault-abj',
        locationName: 'Abuja Central Regional Vault',
        locationType: 'REGIONAL_VAULT',
        currency: 'NGN',
        openingPhysicalCash: 120000000,
        cashInflows: 25000000,
        cashOutflows: 15000000,
        expectedPhysicalCash: 130000000,
        actualCountedCash: 130000000,
        varianceAmount: 0,
        reservedCash: 20000000,
        availablePhysicalCash: 110000000,
        targetSafetyBuffer: 50000000,
        liquidityStatus: 'HEALTHY',
        lastCountedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'pos-vlt-los',
        locationId: 'loc-vault-los',
        locationName: 'Lagos Victoria Island Central Vault',
        locationType: 'CENTRAL_VAULT',
        currency: 'NGN',
        openingPhysicalCash: 450000000,
        cashInflows: 80000000,
        cashOutflows: 60000000,
        expectedPhysicalCash: 470000000,
        actualCountedCash: 470000000,
        varianceAmount: 0,
        reservedCash: 50000000,
        availablePhysicalCash: 420000000,
        targetSafetyBuffer: 150000000,
        liquidityStatus: 'HEALTHY',
        lastCountedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'pos-vlt-nim',
        locationId: 'loc-vault-nim',
        locationName: 'Niamey Plateau Central Vault',
        locationType: 'CENTRAL_VAULT',
        currency: 'XOF',
        openingPhysicalCash: 280000000,
        cashInflows: 45000000,
        cashOutflows: 30000000,
        expectedPhysicalCash: 295000000,
        actualCountedCash: 295000000,
        varianceAmount: 0,
        reservedCash: 40000000,
        availablePhysicalCash: 255000000,
        targetSafetyBuffer: 80000000,
        liquidityStatus: 'HEALTHY',
        lastCountedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'pos-till-garba',
        locationId: 'loc-till-garba',
        locationName: 'Garba Express POS Cash Till',
        locationType: 'AGENT_TILL',
        currency: 'NGN',
        openingPhysicalCash: 1500000,
        cashInflows: 850000,
        cashOutflows: 500000,
        expectedPhysicalCash: 1850000,
        actualCountedCash: 1850000,
        varianceAmount: 0,
        reservedCash: 200000,
        availablePhysicalCash: 1650000,
        targetSafetyBuffer: 500000,
        liquidityStatus: 'HEALTHY',
        lastCountedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'pos-till-sahel',
        locationId: 'loc-till-sahel',
        locationName: 'Sahel Kiosque Niamey Cash Till',
        locationType: 'AGENT_TILL',
        currency: 'XOF',
        openingPhysicalCash: 3500000,
        cashInflows: 1700000,
        cashOutflows: 1000000,
        expectedPhysicalCash: 4200000,
        actualCountedCash: 4200000,
        varianceAmount: 0,
        reservedCash: 500000,
        availablePhysicalCash: 3700000,
        targetSafetyBuffer: 1000000,
        liquidityStatus: 'HEALTHY',
        lastCountedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'pos-cit-g4s',
        locationId: 'loc-cit-g4s',
        locationName: 'G4S Armored CIT Vehicle NG-04',
        locationType: 'CIT_VEHICLE',
        currency: 'NGN',
        openingPhysicalCash: 0,
        cashInflows: 20000000,
        cashOutflows: 0,
        expectedPhysicalCash: 20000000,
        actualCountedCash: 20000000,
        varianceAmount: 0,
        reservedCash: 0,
        availablePhysicalCash: 20000000,
        targetSafetyBuffer: 0,
        liquidityStatus: 'HEALTHY',
        lastCountedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    defaultPositions.forEach((pos) => this.positions.set(pos.locationId, pos));
  }

  public getPositions(filters?: { country?: string; currency?: string }): CashPositionRecord[] {
    const locEngine = CashLocationEngine.getInstance();
    let list = Array.from(this.positions.values());

    if (filters?.country && filters.country !== 'GLOBAL') {
      list = list.filter((p) => {
        const loc = locEngine.getLocation(p.locationId);
        return loc?.country === filters.country;
      });
    }
    if (filters?.currency) {
      list = list.filter((p) => p.currency === filters.currency);
    }
    return list;
  }

  public getPosition(locationId: string): CashPositionRecord | undefined {
    return this.positions.get(locationId);
  }

  public recordPhysicalCount(params: {
    locationId: string;
    countType: string;
    currency: 'NGN' | 'XOF';
    denominationBreakdown: Record<string, number>;
    countedBy: string;
    verifiedBy?: string;
    notes?: string;
  }): CashCountRecord {
    const pos = this.positions.get(params.locationId);
    const locEngine = CashLocationEngine.getInstance();
    const loc = locEngine.getLocation(params.locationId);

    let total = 0;
    Object.entries(params.denominationBreakdown).forEach(([denom, count]) => {
      total += parseInt(denom, 10) * count;
    });

    const expected = pos ? pos.expectedPhysicalCash : total;
    const variance = total - expected;

    const countRec: CashCountRecord = {
      id: `cnt-${Date.now().toString().slice(-4)}`,
      locationId: params.locationId,
      locationName: loc?.name || 'Unknown Location',
      countType: params.countType,
      currency: params.currency,
      expectedAmount: expected,
      countedAmount: total,
      varianceAmount: variance,
      denominationBreakdown: params.denominationBreakdown,
      countedBy: params.countedBy,
      verifiedBy: params.verifiedBy,
      countStatus: variance === 0 ? 'VERIFIED' : 'VARIANCE_INVESTIGATION',
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    this.counts.unshift(countRec);

    if (pos) {
      pos.actualCountedCash = total;
      pos.varianceAmount = variance;
      pos.lastCountedAt = new Date().toISOString();
      pos.updatedAt = new Date().toISOString();

      // Recalculate liquidity status
      if (pos.availablePhysicalCash < pos.targetSafetyBuffer * 0.5) {
        pos.liquidityStatus = 'CRITICAL';
      } else if (pos.availablePhysicalCash < pos.targetSafetyBuffer) {
        pos.liquidityStatus = 'LOW';
      } else if (pos.availablePhysicalCash < pos.targetSafetyBuffer * 1.5) {
        pos.liquidityStatus = 'WATCH';
      } else {
        pos.liquidityStatus = 'HEALTHY';
      }

      this.positions.set(params.locationId, pos);
    }

    return countRec;
  }

  public getCounts(locationId?: string): CashCountRecord[] {
    if (locationId) {
      return this.counts.filter((c) => c.locationId === locationId);
    }
    return this.counts;
  }
}
