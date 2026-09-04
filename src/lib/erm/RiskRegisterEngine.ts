// Enterprise Risk Register, Inherent & Residual Quantification Engine

import { EnterpriseRiskRecord } from '@/types/ermEngine';

export class RiskRegisterEngine {
  private static instance: RiskRegisterEngine;

  private risks: Map<string, EnterpriseRiskRecord> = new Map();

  private constructor() {
    this.seedRisks();
  }

  public static getInstance(): RiskRegisterEngine {
    if (!RiskRegisterEngine.instance) {
      RiskRegisterEngine.instance = new RiskRegisterEngine();
    }
    return RiskRegisterEngine.instance;
  }

  private seedRisks() {
    const defaultRisks: EnterpriseRiskRecord[] = [
      {
        id: 'rsk-01',
        riskCode: 'RSK-LIQ-SURGE-01',
        title: 'Intraday Merchant Settlement Liquidity Shortage',
        categoryCode: 'LIQUIDITY_RISK',
        country: 'NG',
        inherentLikelihood: 3,
        inherentImpact: 4,
        inherentRiskScore: 12,
        controlEffectivenessPct: 85,
        residualRiskScore: 1.8,
        riskTier: 'LOW',
        riskOwner: 'Group Treasurer',
        treatmentStrategy: 'MITIGATE',
        status: 'MONITORING',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'rsk-02',
        riskCode: 'RSK-OPS-CORR-01',
        title: 'Bilateral Cross-Border Settlement Rail Interruption (NGN/XOF)',
        categoryCode: 'OPERATIONAL_RISK',
        country: 'GLOBAL',
        inherentLikelihood: 3,
        inherentImpact: 4,
        inherentRiskScore: 12,
        controlEffectivenessPct: 75,
        residualRiskScore: 3.0,
        riskTier: 'MEDIUM',
        riskOwner: 'VP Operations & Infrastructure',
        treatmentStrategy: 'MITIGATE',
        status: 'MONITORING',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'rsk-03',
        riskCode: 'RSK-FRD-AGENT-01',
        title: 'Collusive Agent POS Cash-Out Kiting & Overcharging',
        categoryCode: 'FRAUD_RISK',
        country: 'NG',
        inherentLikelihood: 4,
        inherentImpact: 3,
        inherentRiskScore: 12,
        controlEffectivenessPct: 90,
        residualRiskScore: 1.2,
        riskTier: 'LOW',
        riskOwner: 'Head of Fraud & Financial Crime',
        treatmentStrategy: 'MITIGATE',
        status: 'MONITORING',
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'rsk-04',
        riskCode: 'RSK-CYB-API-01',
        title: 'Partner API Credential Abuse & Distributed Brute-Force',
        categoryCode: 'CYBERSECURITY_RISK',
        country: 'GLOBAL',
        inherentLikelihood: 3,
        inherentImpact: 5,
        inherentRiskScore: 15,
        controlEffectivenessPct: 92,
        residualRiskScore: 1.2,
        riskTier: 'LOW',
        riskOwner: 'Chief Information Security Officer (CISO)',
        treatmentStrategy: 'MITIGATE',
        status: 'MONITORING',
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'rsk-05',
        riskCode: 'RSK-CSH-CIT-01',
        title: 'Armored CIT Vehicle Transit Attack or Route Deviation',
        categoryCode: 'PHYSICAL_SECURITY_RISK',
        country: 'NG',
        inherentLikelihood: 2,
        inherentImpact: 5,
        inherentRiskScore: 10,
        controlEffectivenessPct: 88,
        residualRiskScore: 1.2,
        riskTier: 'LOW',
        riskOwner: 'Physical Security & Logistics Lead',
        treatmentStrategy: 'TRANSFER',
        status: 'MONITORING',
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
    ];

    defaultRisks.forEach((r) => this.risks.set(r.id, r));
  }

  public getRisks(): EnterpriseRiskRecord[] {
    return Array.from(this.risks.values());
  }

  public getRisk(id: string): EnterpriseRiskRecord | undefined {
    return this.risks.get(id);
  }

  public registerRisk(data: Omit<EnterpriseRiskRecord, 'id' | 'inherentRiskScore' | 'residualRiskScore' | 'riskTier' | 'createdAt' | 'updatedAt'>): EnterpriseRiskRecord {
    const id = `rsk-${Date.now().toString().slice(-4)}`;
    const inherentRiskScore = data.inherentLikelihood * data.inherentImpact;
    const residualRiskScore = parseFloat((inherentRiskScore * (1 - data.controlEffectivenessPct / 100)).toFixed(2));

    let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (residualRiskScore > 12) riskTier = 'CRITICAL';
    else if (residualRiskScore > 8) riskTier = 'HIGH';
    else if (residualRiskScore > 4) riskTier = 'MEDIUM';

    const risk: EnterpriseRiskRecord = {
      ...data,
      id,
      inherentRiskScore,
      residualRiskScore,
      riskTier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.risks.set(id, risk);
    return risk;
  }
}
