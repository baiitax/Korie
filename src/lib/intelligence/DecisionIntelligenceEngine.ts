// Governed Decision Recommendation & Maker-Checker Outcome Engine

import { DecisionRecommendationCard } from '@/types/intelligenceEngine';

export class DecisionIntelligenceEngine {
  private static instance: DecisionIntelligenceEngine;

  private decisions: Map<string, DecisionRecommendationCard> = new Map();

  private constructor() {
    this.seedDecisions();
  }

  public static getInstance(): DecisionIntelligenceEngine {
    if (!DecisionIntelligenceEngine.instance) {
      DecisionIntelligenceEngine.instance = new DecisionIntelligenceEngine();
    }
    return DecisionIntelligenceEngine.instance;
  }

  private seedDecisions() {
    const defaultDecisions: DecisionRecommendationCard[] = [
      {
        id: 'dec-01',
        decisionCode: 'DEC-TREAS-2026-0904-01',
        title: 'Rebalance NGN 500M Nostro Buffer to Providus Settlement Pool',
        domain: 'TREASURY',
        materialityTier: 'TIER_3_ACTION',
        observedTelemetry: 'Intraday peak merchant clearing volume is projected to exceed baseline Nostro threshold by 18%.',
        recommendedAction: 'Execute internal transfer of ₦500,000,000 from Central Reserve Vault to Providus Settlement Liquidity account.',
        expectedImpact: 'Eliminates settlement delay risk and maintains buffer coverage above 140%.',
        confidencePct: 94.5,
        approverRole: 'Chief Financial Officer (CFO)',
        status: 'PENDING',
        createdAt: '2026-09-04T08:30:00Z',
      },
      {
        id: 'dec-02',
        decisionCode: 'DEC-AGT-2026-0904-02',
        title: 'Dispatch Emergency CIT Float Replenishment to Maradi Hub',
        domain: 'AGENT',
        materialityTier: 'TIER_2_REC',
        observedTelemetry: 'Maradi Border agency till depletion velocity is 103% above baseline ahead of Friday cattle market.',
        recommendedAction: 'Authorize G4S armored courier cash-in-transit dispatch of 15,000,000 XOF from Koris Bank Regional Vault.',
        expectedImpact: 'Prevents agent cash outages for over 450 cross-border traders.',
        confidencePct: 91.2,
        approverRole: 'Head of Cash Operations',
        status: 'PENDING',
        createdAt: '2026-09-04T09:00:00Z',
      },
    ];

    defaultDecisions.forEach((d) => this.decisions.set(d.id, d));
  }

  public getDecisions(): DecisionRecommendationCard[] {
    return Array.from(this.decisions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public approveDecision(decisionId: string): { success: boolean; decision?: DecisionRecommendationCard } {
    const d = this.decisions.get(decisionId);
    if (!d) return { success: false };

    d.status = 'APPROVED';
    this.decisions.set(decisionId, d);
    return { success: true, decision: d };
  }
}
