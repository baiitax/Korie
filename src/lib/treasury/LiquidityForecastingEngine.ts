import { 
  LiquidityForecastItem, 
  LiquidityHorizon, 
  ForecastConfidence 
} from '@/types/treasuryEngine';
import { TreasuryEngine } from './TreasuryEngine';

export class LiquidityForecastingEngine {
  public static generateForecasts(currency: 'NGN' | 'XOF' = 'NGN'): LiquidityForecastItem[] {
    const baseline = TreasuryEngine.calculateAvailableLiquidity(currency);
    const now = new Date().toISOString();

    const horizons: {
      horizon: LiquidityHorizon;
      inflowFactor: number;
      outflowFactor: number;
      confidence: ForecastConfidence;
    }[] = [
      { horizon: 'NOW', inflowFactor: 0, outflowFactor: 0, confidence: 'CONFIRMED' },
      { horizon: 'INTRADAY', inflowFactor: 0.15, outflowFactor: 0.12, confidence: 'HIGH_CONFIDENCE' },
      { horizon: 'TODAY', inflowFactor: 0.35, outflowFactor: 0.28, confidence: 'HIGH_CONFIDENCE' },
      { horizon: 'TOMORROW', inflowFactor: 0.50, outflowFactor: 0.45, confidence: 'HIGH_CONFIDENCE' },
      { horizon: 'T+2', inflowFactor: 0.90, outflowFactor: 0.80, confidence: 'ESTIMATED' },
      { horizon: '7_DAYS', inflowFactor: 2.80, outflowFactor: 2.50, confidence: 'ESTIMATED' },
      { horizon: '30_DAYS', inflowFactor: 11.5, outflowFactor: 10.2, confidence: 'LOW_CONFIDENCE' },
    ];

    const baseUnit = baseline.availableLiquidityMinor;

    return horizons.map(h => {
      const expectedInflow = Math.round(baseUnit * h.inflowFactor);
      const expectedOutflow = Math.round(baseUnit * h.outflowFactor);
      const projectedNet = baseUnit + expectedInflow - expectedOutflow;

      return {
        id: `fc_${h.horizon.toLowerCase()}_${currency.toLowerCase()}`,
        horizon: h.horizon,
        currency,
        expectedInflowMinor: expectedInflow,
        expectedOutflowMinor: expectedOutflow,
        projectedNetLiquidityMinor: projectedNet,
        confidence: h.confidence,
        inflowBreakdown: {
          customerFundingMinor: Math.round(expectedInflow * 0.45),
          merchantReceiptsMinor: Math.round(expectedInflow * 0.30),
          agentFundingMinor: Math.round(expectedInflow * 0.15),
          providerSettlementMinor: Math.round(expectedInflow * 0.10),
        },
        outflowBreakdown: {
          merchantSettlementMinor: Math.round(expectedOutflow * 0.50),
          customerWithdrawalMinor: Math.round(expectedOutflow * 0.30),
          agentCashOutMinor: Math.round(expectedOutflow * 0.15),
          operatingObligationsMinor: Math.round(expectedOutflow * 0.05),
        },
        calculatedAt: now,
      };
    });
  }
}
