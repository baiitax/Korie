// Multi-Tier Physical Cash Liquidity, Buffer Monitoring & Replenishment Alert Engine

import { CashPositionEngine } from './CashPositionEngine';
import { CashLocationEngine } from './CashLocationEngine';

export interface GlobalCashLiquiditySummary {
  totalPhysicalCashNGN: number;
  availablePhysicalCashNGN: number;
  reservedCashNGN: number;
  inTransitCashNGN: number;
  totalPhysicalCashXOF: number;
  availablePhysicalCashXOF: number;
  reservedCashXOF: number;
  inTransitCashXOF: number;
  locationsOnWatch: number;
  locationsCritical: number;
}

export class LiquidityOperationsEngine {
  private static instance: LiquidityOperationsEngine;

  private constructor() {}

  public static getInstance(): LiquidityOperationsEngine {
    if (!LiquidityOperationsEngine.instance) {
      LiquidityOperationsEngine.instance = new LiquidityOperationsEngine();
    }
    return LiquidityOperationsEngine.instance;
  }

  public getGlobalSummary(): GlobalCashLiquiditySummary {
    const posEngine = CashPositionEngine.getInstance();
    const positions = posEngine.getPositions();

    let totalNGN = 0;
    let availNGN = 0;
    let resNGN = 0;
    let inTransitNGN = 0;

    let totalXOF = 0;
    let availXOF = 0;
    let resXOF = 0;
    let inTransitXOF = 0;

    let watchCount = 0;
    let critCount = 0;

    positions.forEach((p) => {
      if (p.currency === 'NGN') {
        totalNGN += p.expectedPhysicalCash;
        availNGN += p.availablePhysicalCash;
        resNGN += p.reservedCash;
        if (p.locationType === 'CIT_VEHICLE') {
          inTransitNGN += p.expectedPhysicalCash;
        }
      } else if (p.currency === 'XOF') {
        totalXOF += p.expectedPhysicalCash;
        availXOF += p.availablePhysicalCash;
        resXOF += p.reservedCash;
        if (p.locationType === 'CIT_VEHICLE') {
          inTransitXOF += p.expectedPhysicalCash;
        }
      }

      if (p.liquidityStatus === 'WATCH') watchCount++;
      if (p.liquidityStatus === 'CRITICAL' || p.liquidityStatus === 'LOW') critCount++;
    });

    return {
      totalPhysicalCashNGN: totalNGN,
      availablePhysicalCashNGN: availNGN,
      reservedCashNGN: resNGN,
      inTransitCashNGN: inTransitNGN,
      totalPhysicalCashXOF: totalXOF,
      availablePhysicalCashXOF: availXOF,
      reservedCashXOF: resXOF,
      inTransitCashXOF: inTransitXOF,
      locationsOnWatch: watchCount,
      locationsCritical: critCount,
    };
  }
}
