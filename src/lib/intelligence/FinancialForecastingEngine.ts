// Multi-Horizon Financial & Liquidity Forecasting Engine

import { FinancialForecastRecord } from '@/types/intelligenceEngine';

export class FinancialForecastingEngine {
  private static instance: FinancialForecastingEngine;

  private forecasts: Map<string, FinancialForecastRecord> = new Map();

  private constructor() {
    this.seedForecasts();
  }

  public static getInstance(): FinancialForecastingEngine {
    if (!FinancialForecastingEngine.instance) {
      FinancialForecastingEngine.instance = new FinancialForecastingEngine();
    }
    return FinancialForecastingEngine.instance;
  }

  private seedForecasts() {
    const defaultForecasts: FinancialForecastRecord[] = [
      {
        id: 'fcst-rev-30d',
        forecastCode: 'FCST-REV-2026-M09',
        targetMetric: 'Monthly Operating Fee Revenue',
        horizon: '30_DAY',
        baselineValue: 4350000000,
        predictedP50: 4620000000,
        lowerBoundP10: 4410000000,
        upperBoundP90: 4890000000,
        confidenceScore: 0.92,
        modelVersion: 'ARIMA-LightGBM-v1.8.0',
        unit: '₦',
      },
      {
        id: 'fcst-gtv-30d',
        forecastCode: 'FCST-GTV-2026-M09',
        targetMetric: 'Gross Transaction Processing Volume (GTV)',
        horizon: '30_DAY',
        baselineValue: 192400000000,
        predictedP50: 208500000000,
        lowerBoundP10: 198000000000,
        upperBoundP90: 219000000000,
        confidenceScore: 0.94,
        modelVersion: 'Seasonal-HoltWinters-v2.1',
        unit: '₦',
      },
      {
        id: 'fcst-liq-7d',
        forecastCode: 'FCST-LIQ-2026-W36',
        targetMetric: 'Providus Clearing Nostro Outflow Demand',
        horizon: '7_DAY',
        baselineValue: 14250000000,
        predictedP50: 15100000000,
        lowerBoundP10: 13800000000,
        upperBoundP90: 16400000000,
        confidenceScore: 0.89,
        modelVersion: 'CashDemand-Reg-v1.5.0',
        unit: '₦',
      },
    ];

    defaultForecasts.forEach((f) => this.forecasts.set(f.id, f));
  }

  public getForecasts(): FinancialForecastRecord[] {
    return Array.from(this.forecasts.values());
  }
}
