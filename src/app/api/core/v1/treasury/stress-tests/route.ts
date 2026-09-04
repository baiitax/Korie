import { NextRequest } from 'next/server';
import { LiquidityStressTestEngine } from '@/lib/treasury/LiquidityStressTestEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenarioName, currency, outflowSurgePct, inflowDelayPct, executedBy } = body;

    const result = LiquidityStressTestEngine.runSimulation({
      scenarioName: scenarioName || '25% Cash-Out Surge & Provider Settlement Delay',
      currency: currency || 'NGN',
      outflowSurgePct: outflowSurgePct !== undefined ? outflowSurgePct : 25,
      inflowDelayPct: inflowDelayPct !== undefined ? inflowDelayPct : 50,
      executedBy: executedBy || 'RISK_TREASURY_SIMULATOR',
    });

    return ApiResponse.success(result, `Liquidity stress test [${result.scenarioName}] simulation completed.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'STRESS_TEST_SIMULATION_ERROR', 400);
  }
}
