// Cash Demand Forecasting (1h - 30d) & Liquidity Stress Simulation Engine

import { CashDemandForecast } from '@/types/physicalCashEngine';

export interface LiquidityScenarioResult {
  scenarioCode: string;
  scenarioName: string;
  simulatedImpactNGN: number;
  simulatedImpactXOF: number;
  projectedDeficitLocations: number;
  recommendedBufferIncreasePercentage: number;
  riskAssessment: string;
}

export class CashForecastingEngine {
  private static instance: CashForecastingEngine;

  private constructor() {}

  public static getInstance(): CashForecastingEngine {
    if (!CashForecastingEngine.instance) {
      CashForecastingEngine.instance = new CashForecastingEngine();
    }
    return CashForecastingEngine.instance;
  }

  public getForecasts(currency: 'NGN' | 'XOF'): CashDemandForecast[] {
    const isNGN = currency === 'NGN';
    const baseMultiplier = isNGN ? 1000000 : 2500000;

    return [
      {
        horizon: '1_HOUR',
        currency,
        expectedInflows: 8 * baseMultiplier,
        expectedOutflows: 12 * baseMultiplier,
        netLiquidityDemand: 4 * baseMultiplier,
        confidenceScore: 96.5,
        recommendedReplenishment: 5 * baseMultiplier,
      },
      {
        horizon: '4_HOURS',
        currency,
        expectedInflows: 30 * baseMultiplier,
        expectedOutflows: 45 * baseMultiplier,
        netLiquidityDemand: 15 * baseMultiplier,
        confidenceScore: 94.0,
        recommendedReplenishment: 20 * baseMultiplier,
      },
      {
        horizon: '24_HOURS',
        currency,
        expectedInflows: 180 * baseMultiplier,
        expectedOutflows: 240 * baseMultiplier,
        netLiquidityDemand: 60 * baseMultiplier,
        confidenceScore: 91.2,
        recommendedReplenishment: 75 * baseMultiplier,
      },
      {
        horizon: '3_DAYS',
        currency,
        expectedInflows: 500 * baseMultiplier,
        expectedOutflows: 680 * baseMultiplier,
        netLiquidityDemand: 180 * baseMultiplier,
        confidenceScore: 88.0,
        recommendedReplenishment: 200 * baseMultiplier,
      },
      {
        horizon: '7_DAYS',
        currency,
        expectedInflows: 1200 * baseMultiplier,
        expectedOutflows: 1600 * baseMultiplier,
        netLiquidityDemand: 400 * baseMultiplier,
        confidenceScore: 85.5,
        recommendedReplenishment: 450 * baseMultiplier,
      },
      {
        horizon: '30_DAYS',
        currency,
        expectedInflows: 5200 * baseMultiplier,
        expectedOutflows: 6800 * baseMultiplier,
        netLiquidityDemand: 1600 * baseMultiplier,
        confidenceScore: 81.0,
        recommendedReplenishment: 1800 * baseMultiplier,
      },
    ];
  }

  public runScenarioSimulation(scenarioCode: string): LiquidityScenarioResult {
    switch (scenarioCode) {
      case 'SURGE_CASHOUT_20':
        return {
          scenarioCode: 'SURGE_CASHOUT_20',
          scenarioName: '+20% Agent Network Cash-Out Surge',
          simulatedImpactNGN: -48000000,
          simulatedImpactXOF: -75000000,
          projectedDeficitLocations: 4,
          recommendedBufferIncreasePercentage: 25,
          riskAssessment: 'MODERATE - Automated Vault-to-Branch CIT dispatches recommended for AMAC & Niamey hubs.',
        };
      case 'CIT_CORRIDOR_SHUTDOWN':
        return {
          scenarioCode: 'CIT_CORRIDOR_SHUTDOWN',
          scenarioName: '24h Armored CIT Courier Corridor Outage',
          simulatedImpactNGN: -120000000,
          simulatedImpactXOF: -180000000,
          projectedDeficitLocations: 8,
          recommendedBufferIncreasePercentage: 50,
          riskAssessment: 'HIGH - Secondary armored transport provider (Brinks / G4S) failover activation required.',
        };
      case 'BANK_SETTLEMENT_DELAY':
        return {
          scenarioCode: 'BANK_SETTLEMENT_DELAY',
          scenarioName: 'Providus / Koris Settlement Batch Delay (T+1)',
          simulatedImpactNGN: -85000000,
          simulatedImpactXOF: -110000000,
          projectedDeficitLocations: 3,
          recommendedBufferIncreasePercentage: 35,
          riskAssessment: 'ELEVATED - Treasury standby Nostro liquidity credit line to be triggered.',
        };
      default:
        return {
          scenarioCode: 'BASE_BASELINE',
          scenarioName: 'Standard Organic Demand',
          simulatedImpactNGN: 0,
          simulatedImpactXOF: 0,
          projectedDeficitLocations: 0,
          recommendedBufferIncreasePercentage: 0,
          riskAssessment: 'STABLE - All regional vault liquidity buffers adequate.',
        };
    }
  }
}
