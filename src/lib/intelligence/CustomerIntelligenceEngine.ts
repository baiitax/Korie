// Customer 360, RFM Segmentation, CLV & Churn Engine

import { Customer360Profile, CustomerNextBestAction } from '@/types/intelligenceEngine';

export class CustomerIntelligenceEngine {
  private static instance: CustomerIntelligenceEngine;

  private profiles: Map<string, Customer360Profile> = new Map();
  private nextBestActions: Map<string, CustomerNextBestAction[]> = new Map();

  private constructor() {
    this.seedProfiles();
  }

  public static getInstance(): CustomerIntelligenceEngine {
    if (!CustomerIntelligenceEngine.instance) {
      CustomerIntelligenceEngine.instance = new CustomerIntelligenceEngine();
    }
    return CustomerIntelligenceEngine.instance;
  }

  private seedProfiles() {
    const defaultProfiles: Customer360Profile[] = [
      {
        id: 'c360-01',
        customerId: 'CUST-NG-88910',
        fullNameMasked: 'Adewale O*****',
        jurisdiction: 'NG',
        kycTier: 'TIER_3',
        rfmSegment: 'CHAMPIONS',
        recencyScore: 5,
        frequencyScore: 5,
        monetaryScore: 5,
        historicalClvNgn: 450000,
        predictedClvNgn: 1250000,
        churnProbability: 0.04,
        churnRiskBand: 'LOW',
        primaryChannel: 'MOBILE_APP_P2P',
        lastActiveAt: new Date().toISOString(),
      },
      {
        id: 'c360-02',
        customerId: 'CUST-NG-77412',
        fullNameMasked: 'Fatima B*****',
        jurisdiction: 'NG',
        kycTier: 'TIER_2',
        rfmSegment: 'LOYAL_CUSTOMERS',
        recencyScore: 4,
        frequencyScore: 4,
        monetaryScore: 4,
        historicalClvNgn: 180000,
        predictedClvNgn: 520000,
        churnProbability: 0.12,
        churnRiskBand: 'LOW',
        primaryChannel: 'AGENT_CASH_IN',
        lastActiveAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'c360-03',
        customerId: 'CUST-NE-10923',
        fullNameMasked: 'Mamadou S*****',
        jurisdiction: 'NE',
        kycTier: 'TIER_2',
        rfmSegment: 'POTENTIAL_GROWTH',
        recencyScore: 4,
        frequencyScore: 2,
        monetaryScore: 3,
        historicalClvNgn: 95000,
        predictedClvNgn: 340000,
        churnProbability: 0.18,
        churnRiskBand: 'LOW',
        primaryChannel: 'CROSS_BORDER_REMITTANCE',
        lastActiveAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'c360-04',
        customerId: 'CUST-NG-55109',
        fullNameMasked: 'Chinedu E*****',
        jurisdiction: 'NG',
        kycTier: 'TIER_1',
        rfmSegment: 'AT_RISK',
        recencyScore: 2,
        frequencyScore: 3,
        monetaryScore: 4,
        historicalClvNgn: 220000,
        predictedClvNgn: 240000,
        churnProbability: 0.68,
        churnRiskBand: 'HIGH',
        primaryChannel: 'POS_MERCHANT',
        lastActiveAt: new Date(Date.now() - 86400000 * 18).toISOString(),
      },
    ];

    defaultProfiles.forEach((p) => this.profiles.set(p.customerId, p));

    this.nextBestActions.set('CUST-NG-55109', [
      {
        id: 'nba-01',
        customerId: 'CUST-NG-55109',
        recommendationTitle: 'Proactive Fee Discount Retention Voucher',
        recommendationType: 'RETENTION',
        reasoning: 'Customer experienced 2 consecutive transaction timeouts on Providus rail; high risk of attrition.',
        confidenceScore: 0.89,
      },
    ]);
  }

  public getProfiles(): Customer360Profile[] {
    return Array.from(this.profiles.values());
  }

  public getProfile(customerId: string): Customer360Profile | undefined {
    return this.profiles.get(customerId);
  }

  public getNextBestActions(customerId: string): CustomerNextBestAction[] {
    return this.nextBestActions.get(customerId) || [];
  }
}
