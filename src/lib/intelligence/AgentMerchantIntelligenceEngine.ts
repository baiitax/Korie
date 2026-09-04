// Agent 360 & Merchant Intelligence Engine

import { AgentIntelligenceProfile, MerchantIntelligenceProfile } from '@/types/intelligenceEngine';

export class AgentMerchantIntelligenceEngine {
  private static instance: AgentMerchantIntelligenceEngine;

  private agents: Map<string, AgentIntelligenceProfile> = new Map();
  private merchants: Map<string, MerchantIntelligenceProfile> = new Map();

  private constructor() {
    this.seedData();
  }

  public static getInstance(): AgentMerchantIntelligenceEngine {
    if (!AgentMerchantIntelligenceEngine.instance) {
      AgentMerchantIntelligenceEngine.instance = new AgentMerchantIntelligenceEngine();
    }
    return AgentMerchantIntelligenceEngine.instance;
  }

  private seedData() {
    const defaultAgents: AgentIntelligenceProfile[] = [
      {
        id: 'agt-int-01',
        agentId: 'AGT-KAN-001',
        agentName: 'Kano Dawanau Central Agency Outpost',
        locationState: 'Kano',
        country: 'NG',
        productivityScore: 96.4,
        liquidityHealthScore: 92.0,
        cashVarianceRate: 0.10,
        reversalRate: 0.12,
        performanceTier: 'TOP_PERFORMER',
        stressProbability: 0.04,
      },
      {
        id: 'agt-int-02',
        agentId: 'AGT-LAG-004',
        agentName: 'Alaba International Market Kiosk 4',
        locationState: 'Lagos',
        country: 'NG',
        productivityScore: 91.2,
        liquidityHealthScore: 84.5,
        cashVarianceRate: 0.22,
        reversalRate: 0.18,
        performanceTier: 'TOP_PERFORMER',
        stressProbability: 0.12,
      },
      {
        id: 'agt-int-03',
        agentId: 'AGT-MAR-002',
        agentName: 'Maradi Border Hub Terminal A',
        locationState: 'Maradi',
        country: 'NE',
        productivityScore: 88.0,
        liquidityHealthScore: 78.0,
        cashVarianceRate: 0.35,
        reversalRate: 0.25,
        performanceTier: 'STANDARD',
        stressProbability: 0.28,
      },
    ];

    const defaultMerchants: MerchantIntelligenceProfile[] = [
      {
        id: 'mch-int-01',
        merchantId: 'MCH-JUM-001',
        businessName: 'Sahara Wholesale Distributors Ltd',
        monthlyGmvNgn: 450000000,
        processingMarginPct: 1.45,
        disputeRatioPct: 0.02,
        growthTrendPct: 18.2,
        status: 'HEALTHY',
      },
      {
        id: 'mch-int-02',
        merchantId: 'MCH-NIG-002',
        businessName: 'Sahel Grain Trading Enterprise',
        monthlyGmvNgn: 185000000,
        processingMarginPct: 1.60,
        disputeRatioPct: 0.04,
        growthTrendPct: 9.5,
        status: 'HEALTHY',
      },
    ];

    defaultAgents.forEach((a) => this.agents.set(a.agentId, a));
    defaultMerchants.forEach((m) => this.merchants.set(m.merchantId, m));
  }

  public getAgents(): AgentIntelligenceProfile[] {
    return Array.from(this.agents.values());
  }

  public getMerchants(): MerchantIntelligenceProfile[] {
    return Array.from(this.merchants.values());
  }
}
