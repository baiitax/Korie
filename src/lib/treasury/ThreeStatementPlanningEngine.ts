// Integrated Three-Statement Model (P&L, Balance Sheet, Cash Flow) Engine

import { ThreeStatementForecast } from '@/types/financialPlanningAlmEngine';

export class ThreeStatementPlanningEngine {
  private static instance: ThreeStatementPlanningEngine;

  private constructor() {}

  public static getInstance(): ThreeStatementPlanningEngine {
    if (!ThreeStatementPlanningEngine.instance) {
      ThreeStatementPlanningEngine.instance = new ThreeStatementPlanningEngine();
    }
    return ThreeStatementPlanningEngine.instance;
  }

  public getForecast(
    versionName: 'BASE_CASE' | 'UPSIDE' | 'DOWNSIDE' | 'BOARD_PLAN' = 'BASE_CASE',
    currency: 'NGN' | 'XOF' = 'NGN'
  ): ThreeStatementForecast[] {
    const isNGN = currency === 'NGN';
    const mult = isNGN ? 1000000 : 2500000;

    const modifier =
      versionName === 'UPSIDE' ? 1.25 : versionName === 'DOWNSIDE' ? 0.8 : versionName === 'BOARD_PLAN' ? 1.1 : 1.0;

    const horizons: Array<'1_MONTH' | '3_MONTHS' | '12_MONTHS' | '36_MONTHS'> = [
      '1_MONTH',
      '3_MONTHS',
      '12_MONTHS',
      '36_MONTHS',
    ];

    const hFactors = {
      '1_MONTH': 1,
      '3_MONTHS': 3.1,
      '12_MONTHS': 13.5,
      '36_MONTHS': 48.0,
    };

    return horizons.map((h) => {
      const f = hFactors[h] * modifier;

      const revenueTotal = Math.round(180 * mult * f);
      const directCostsTotal = Math.round(75 * mult * f);
      const grossMargin = revenueTotal - directCostsTotal;
      const operatingOverhead = Math.round(45 * mult * f);
      const fundingInterestExpense = Math.round(8 * mult * f);
      const netProfit = grossMargin - operatingOverhead - fundingInterestExpense;

      const totalAssets = Math.round(1500 * mult * (1 + (f - 1) * 0.4));
      const totalLiabilities = Math.round(1100 * mult * (1 + (f - 1) * 0.35));
      const totalEquity = totalAssets - totalLiabilities;

      const operatingCashflow = Math.round(netProfit * 1.15);
      const investingCashflow = Math.round(-15 * mult * f);
      const financingCashflow = Math.round(10 * mult * f);
      const netTreasuryCashChange = operatingCashflow + investingCashflow + financingCashflow;
      const endingCashBalance = Math.round(620 * mult + netTreasuryCashChange);

      return {
        id: `3stmt-${versionName.toLowerCase()}-${h.toLowerCase()}`,
        forecastCode: `FCST-${versionName}-${h}`,
        versionName,
        horizon: h,
        currency,
        revenueTotal,
        directCostsTotal,
        grossMargin,
        operatingOverhead,
        fundingInterestExpense,
        netProfit,
        totalAssets,
        totalLiabilities,
        totalEquity,
        operatingCashflow,
        investingCashflow,
        financingCashflow,
        netTreasuryCashChange,
        endingCashBalance,
        createdAt: new Date().toISOString(),
      };
    });
  }
}
