// Isolated What-If Scenario Simulation Engine

import { ScenarioSimulationRequest, ScenarioSimulationResult } from '@/types/intelligenceEngine';

export class ScenarioSimulationEngine {
  private static instance: ScenarioSimulationEngine;

  private constructor() {}

  public static getInstance(): ScenarioSimulationEngine {
    if (!ScenarioSimulationEngine.instance) {
      ScenarioSimulationEngine.instance = new ScenarioSimulationEngine();
    }
    return ScenarioSimulationEngine.instance;
  }

  public simulateScenario(req: ScenarioSimulationRequest): ScenarioSimulationResult {
    const baseRevenueNgn = 4350000000;
    const baseEbitdaNgn = 1280000000;
    const baseLiquidityCoverage = 142.5;
    const baseCapitalRatio = 235.7;

    // Apply Shock Parameters
    const volumeFactor = 1 + req.volumeShockPct / 100;
    const providerImpactFactor = Math.max(0.7, 1 - (req.providerDowntimeHours * 0.02));
    const fxImpactFactor = 1 - (Math.abs(req.fxShiftPct) * 0.005);
    const liquidityDrain = req.liquidityRunPct * 0.8;

    const projectedRevenueNgn = Math.round(baseRevenueNgn * volumeFactor * providerImpactFactor * fxImpactFactor);
    const revenueImpactPct = parseFloat((((projectedRevenueNgn - baseRevenueNgn) / baseRevenueNgn) * 100).toFixed(1));

    const projectedEbitdaNgn = Math.round(baseEbitdaNgn * (volumeFactor * 1.2) * providerImpactFactor);
    const ebitdaImpactPct = parseFloat((((projectedEbitdaNgn - baseEbitdaNgn) / baseEbitdaNgn) * 100).toFixed(1));

    const liquidityBufferCoveragePct = parseFloat(Math.max(80, baseLiquidityCoverage - liquidityDrain).toFixed(1));
    const capitalSolvencyRatioPct = parseFloat(Math.max(110, baseCapitalRatio - (Math.abs(revenueImpactPct) * 0.5)).toFixed(1));

    let resilienceRating: 'STABLE' | 'MODERATE_STRESS' | 'SEVERE_STRESS' = 'STABLE';
    if (liquidityBufferCoveragePct < 100 || capitalSolvencyRatioPct < 130) {
      resilienceRating = 'SEVERE_STRESS';
    } else if (liquidityBufferCoveragePct < 120 || capitalSolvencyRatioPct < 160) {
      resilienceRating = 'MODERATE_STRESS';
    }

    return {
      scenarioName: req.scenarioName || 'Custom Stress Simulation',
      projectedRevenueNgn,
      revenueImpactPct,
      projectedEbitdaNgn,
      ebitdaImpactPct,
      liquidityBufferCoveragePct,
      capitalSolvencyRatioPct,
      resilienceRating,
      simulatedAt: new Date().toISOString(),
    };
  }
}
