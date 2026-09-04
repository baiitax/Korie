// Product, Agent & Provider Economics Engine

import { UnitEconomicsRecord } from '@/types/financialPlanningAlmEngine';

export class UnitEconomicsEngine {
  private static instance: UnitEconomicsEngine;

  private constructor() {}

  public static getInstance(): UnitEconomicsEngine {
    if (!UnitEconomicsEngine.instance) {
      UnitEconomicsEngine.instance = new UnitEconomicsEngine();
    }
    return UnitEconomicsEngine.instance;
  }

  public getProductEconomics(): UnitEconomicsRecord[] {
    return [
      {
        productCode: 'PROD-NIP-P2P',
        productName: 'NIP Instant Account Transfers (NGN)',
        monthlyVolumeCount: 420000,
        monthlyVolumeValue: 12500000000,
        grossRevenue: 28500000,
        interchangeAndRailCosts: 8400000,
        agentCommissions: 0,
        fundingCostAllocated: 1200000,
        contributionMargin: 18900000,
        marginPercentage: 66.3,
      },
      {
        productCode: 'PROD-AGENCY-CASHIN',
        productName: 'Agency Cash-In Outpost Deposits',
        monthlyVolumeCount: 185000,
        monthlyVolumeValue: 4800000000,
        grossRevenue: 24000000,
        interchangeAndRailCosts: 2400000,
        agentCommissions: 12000000,
        fundingCostAllocated: 800000,
        contributionMargin: 8800000,
        marginPercentage: 36.7,
      },
      {
        productCode: 'PROD-AGENCY-CASHOUT',
        productName: 'Agency POS Cash-Out Withdrawals',
        monthlyVolumeCount: 290000,
        monthlyVolumeValue: 7200000000,
        grossRevenue: 43200000,
        interchangeAndRailCosts: 5800000,
        agentCommissions: 21600000,
        fundingCostAllocated: 1400000,
        contributionMargin: 14400000,
        marginPercentage: 33.3,
      },
      {
        productCode: 'PROD-XBORDER-FX',
        productName: 'Cross-Border NGN/XOF Remittances',
        monthlyVolumeCount: 48000,
        monthlyVolumeValue: 3600000000,
        grossRevenue: 36000000,
        interchangeAndRailCosts: 3600000,
        agentCommissions: 5400000,
        fundingCostAllocated: 1800000,
        contributionMargin: 25200000,
        marginPercentage: 70.0,
      },
    ];
  }
}
