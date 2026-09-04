// AML Customer Risk Profiling & Baseline Engine

export interface CustomerAmlProfile {
  customerId: string;
  jurisdiction: 'NG' | 'NE';
  amlRiskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  amlRiskScore: number;
  declaredMonthlyIncome: number;
  expectedMonthlyVolume: number;
  expectedMaxSingleTx: number;
  isPep: boolean;
  isSanctionFlagged: boolean;
  hasAdverseMedia: boolean;
  lastEvaluatedAt: string;
}

export class AmlCustomerRiskProfileEngine {
  private static instance: AmlCustomerRiskProfileEngine;

  private profiles: Map<string, CustomerAmlProfile> = new Map();

  private constructor() {
    this.seedProfiles();
  }

  public static getInstance(): AmlCustomerRiskProfileEngine {
    if (!AmlCustomerRiskProfileEngine.instance) {
      AmlCustomerRiskProfileEngine.instance = new AmlCustomerRiskProfileEngine();
    }
    return AmlCustomerRiskProfileEngine.instance;
  }

  private seedProfiles() {
    const defaultProfiles: CustomerAmlProfile[] = [
      {
        customerId: 'cust-ng-001-ibrahim',
        jurisdiction: 'NG',
        amlRiskTier: 'HIGH',
        amlRiskScore: 78.5,
        declaredMonthlyIncome: 1200000,
        expectedMonthlyVolume: 2500000,
        expectedMaxSingleTx: 200000,
        isPep: false,
        isSanctionFlagged: false,
        hasAdverseMedia: false,
        lastEvaluatedAt: '2026-09-03T10:15:00Z',
      },
      {
        customerId: 'cust-ne-001-amara',
        jurisdiction: 'NE',
        amlRiskTier: 'MEDIUM',
        amlRiskScore: 45.0,
        declaredMonthlyIncome: 2000000,
        expectedMonthlyVolume: 5000000,
        expectedMaxSingleTx: 500000,
        isPep: false,
        isSanctionFlagged: false,
        hasAdverseMedia: false,
        lastEvaluatedAt: '2026-09-03T09:00:00Z',
      },
    ];

    defaultProfiles.forEach((p) => this.profiles.set(p.customerId, p));
  }

  public getProfile(customerId: string): CustomerAmlProfile | undefined {
    return this.profiles.get(customerId);
  }

  public recalculateRisk(customerId: string, recentAlertCount: number): CustomerAmlProfile {
    let p = this.profiles.get(customerId);
    if (!p) {
      p = {
        customerId,
        jurisdiction: 'NG',
        amlRiskTier: 'LOW',
        amlRiskScore: 15.0,
        declaredMonthlyIncome: 500000,
        expectedMonthlyVolume: 1000000,
        expectedMaxSingleTx: 100000,
        isPep: false,
        isSanctionFlagged: false,
        hasAdverseMedia: false,
        lastEvaluatedAt: new Date().toISOString(),
      };
    }

    // Dynamic risk adjustment based on recent alert count
    p.amlRiskScore = Math.min(100, p.amlRiskScore + recentAlertCount * 15);
    if (p.amlRiskScore >= 75) p.amlRiskTier = 'CRITICAL';
    else if (p.amlRiskScore >= 50) p.amlRiskTier = 'HIGH';
    else if (p.amlRiskScore >= 25) p.amlRiskTier = 'MEDIUM';
    else p.amlRiskTier = 'LOW';

    p.lastEvaluatedAt = new Date().toISOString();
    this.profiles.set(customerId, p);
    return p;
  }
}
