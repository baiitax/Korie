import { LiquidityStressTestResult } from '@/types/treasuryEngine';
import { TreasuryEngine } from './TreasuryEngine';

export interface StressScenarioInput {
  scenarioName: string;
  currency: 'NGN' | 'XOF';
  outflowSurgePct: number; // e.g. 25% surge
  inflowDelayPct: number;  // e.g. 50% delay in incoming settlements
  executedBy: string;
}

export class LiquidityStressTestEngine {
  public static runSimulation(input: StressScenarioInput): LiquidityStressTestResult {
    const baseline = TreasuryEngine.calculateAvailableLiquidity(input.currency);
    const baseAvailable = baseline.availableLiquidityMinor;
    const baseOutflow = baseline.deductions.committedSettlementsMinor + baseline.targetSafetyBufferMinor;

    // Calculate stressed values
    const simulatedSurgeOutflowMinor = Math.round(baseOutflow * (input.outflowSurgePct / 100));
    const simulatedInflowDelayMinor = Math.round(baseAvailable * 0.15 * (input.inflowDelayPct / 100));

    const simulatedAvailableMinor = baseAvailable - simulatedSurgeOutflowMinor - simulatedInflowDelayMinor;
    const shortfallAmountMinor = simulatedAvailableMinor < 0 ? Math.abs(simulatedAvailableMinor) : 0;
    const isBreached = simulatedAvailableMinor < baseline.targetSafetyBufferMinor;

    // Time to breach estimation: base hours inversely proportional to surge
    const timeToBreachHours = isBreached 
      ? Math.max(2, Math.round(24 / (1 + input.outflowSurgePct / 50)))
      : 72;

    const requiredRebalancingMinor = isBreached 
      ? Math.max(shortfallAmountMinor, baseline.targetSafetyBufferMinor - simulatedAvailableMinor)
      : 0;

    const recommendations: string[] = [];
    if (isBreached) {
      recommendations.push(`Initiate immediate treasury funding request of ${(requiredRebalancingMinor / 100).toLocaleString()} ${input.currency}.`);
      recommendations.push('Temporarily adjust non-essential merchant batch payout window from T+0 to T+1.');
      recommendations.push('Draw down on commercial bank credit line or standby liquidity facility.');
    } else {
      recommendations.push('Liquidity buffers remain resilient under simulated shock parameters.');
    }

    return {
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      scenarioName: input.scenarioName,
      currency: input.currency,
      baselineAvailableMinor: baseAvailable,
      simulatedSurgeOutflowMinor,
      simulatedInflowDelayMinor,
      simulatedAvailableMinor: Math.max(0, simulatedAvailableMinor),
      shortfallAmountMinor,
      isBreached,
      timeToBreachHours,
      requiredRebalancingMinor,
      recommendations,
      executedBy: input.executedBy,
      executedAt: new Date().toISOString(),
    };
  }
}
