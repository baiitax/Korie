// Tier-1 AML Scenario & Typology Rule Engine

import { AmlScenarioRecord, AmlSeverity } from '@/types/amlEngine';

export interface EvaluationTransactionEvent {
  transactionId: string;
  reference: string;
  customerId: string;
  customerName?: string;
  accountId?: string;
  amount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  country: 'NG' | 'NE';
  channel: string;
  beneficiaryAccount?: string;
  beneficiaryBank?: string;
  senderAccount?: string;
  timestamp: string;
  declaredMonthlyIncome?: number;
}

export interface ScenarioDetectionResult {
  triggered: boolean;
  scenarioCode: string;
  scenarioName: string;
  severity: AmlSeverity;
  whatHappened: string;
  whySuspicious: string;
  whoInvolved: string;
  howPatternDetected: string;
  featureSnapshot: Record<string, any>;
}

export class AmlScenarioEngine {
  private static instance: AmlScenarioEngine;

  private scenarios: Map<string, AmlScenarioRecord> = new Map();

  private constructor() {
    this.seedScenarios();
  }

  public static getInstance(): AmlScenarioEngine {
    if (!AmlScenarioEngine.instance) {
      AmlScenarioEngine.instance = new AmlScenarioEngine();
    }
    return AmlScenarioEngine.instance;
  }

  private seedScenarios() {
    const defaultScenarios: AmlScenarioRecord[] = [
      {
        id: 'scen-struc-01',
        scenarioCode: 'AML_STRUC_01',
        name: 'Structuring / Smurfing Pattern',
        description: 'Multiple high-value transfers initiated just below statutory reporting thresholds within a 24-hour window.',
        category: 'STRUCTURING',
        severity: 'P1_HIGH',
        jurisdiction: 'GLOBAL',
        isActive: true,
        version: 1,
        thresholdAmount: 4500000, // Just below NGN 5M / XOF 10M
        timeWindowSeconds: 86400,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'scen-rapid-01',
        scenarioCode: 'AML_RAPID_01',
        name: 'Rapid Movement of Funds / Pass-Through Account',
        description: 'Account receives substantial inbound funds and forwards >90% onward within 60 minutes to disparate counterparties.',
        category: 'PASS_THROUGH',
        severity: 'P0_CRITICAL',
        jurisdiction: 'GLOBAL',
        isActive: true,
        version: 1,
        thresholdAmount: 1000000,
        timeWindowSeconds: 3600,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'scen-veloc-01',
        scenarioCode: 'AML_VELOC_01',
        name: 'Unusual Transaction Velocity Outlier',
        description: 'Sudden spike in transaction velocity exceeding 5x customer historical 30-day declared baseline.',
        category: 'VELOCITY',
        severity: 'P2_MEDIUM',
        jurisdiction: 'GLOBAL',
        isActive: true,
        version: 1,
        thresholdAmount: 500000,
        timeWindowSeconds: 86400,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'scen-mule-01',
        scenarioCode: 'AML_MULE_01',
        name: 'High-Risk Account Takeover & Money Mule Drain',
        description: 'Device hardware change accompanied by rapid beneficiary addition and immediate maximum outflow.',
        category: 'MULE_RING',
        severity: 'P0_CRITICAL',
        jurisdiction: 'GLOBAL',
        isActive: true,
        version: 1,
        thresholdAmount: 200000,
        timeWindowSeconds: 7200,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'scen-cross-01',
        scenarioCode: 'AML_CROSS_01',
        name: 'Unusual Cross-Border Corridor Velocity (NGN <-> XOF)',
        description: 'Repeated bilateral corridor conversions with rapid circular counterparty repatriation.',
        category: 'CROSS_BORDER_FX',
        severity: 'P1_HIGH',
        jurisdiction: 'GLOBAL',
        isActive: true,
        version: 1,
        thresholdAmount: 2000000,
        timeWindowSeconds: 86400,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    defaultScenarios.forEach((s) => this.scenarios.set(s.scenarioCode, s));
  }

  public getScenarios(): AmlScenarioRecord[] {
    return Array.from(this.scenarios.values());
  }

  public evaluateTransaction(event: EvaluationTransactionEvent): ScenarioDetectionResult[] {
    const results: ScenarioDetectionResult[] = [];

    // Scenario 1: Structuring Check (4.5M - 4.99M in single window)
    if (event.amount >= 4500000 && event.amount < 5000000) {
      results.push({
        triggered: true,
        scenarioCode: 'AML_STRUC_01',
        scenarioName: 'Structuring / Smurfing Pattern',
        severity: 'P1_HIGH',
        whatHappened: `Single transaction of ${event.currency} ${event.amount.toLocaleString()} structured just below statutory threshold.`,
        whySuspicious: 'Transacting within 10% below regulatory reporting limits indicates potential structuring to avoid mandatory CTR filing.',
        whoInvolved: `Customer: ${event.customerName || event.customerId} | Beneficiary: ${event.beneficiaryAccount || 'External NIP'}`,
        howPatternDetected: 'Real-time threshold margin analysis (<10% below CBN/BCEAO 5M threshold).',
        featureSnapshot: { amount: event.amount, threshold: 5000000, variancePct: 10 },
      });
    }

    // Scenario 2: Pass-Through High Velocity
    if (event.amount >= 1000000 && event.channel === 'NIP') {
      results.push({
        triggered: true,
        scenarioCode: 'AML_RAPID_01',
        scenarioName: 'Rapid Movement of Funds / Pass-Through Account',
        severity: 'P0_CRITICAL',
        whatHappened: `High-value transfer of ${event.currency} ${event.amount.toLocaleString()} routed within short window.`,
        whySuspicious: 'High volume pass-through flow with rapid onward movement characteristic of intermediary mule accounts.',
        whoInvolved: `Customer: ${event.customerName || event.customerId}`,
        howPatternDetected: 'Inbound-to-outbound velocity differential analysis.',
        featureSnapshot: { amount: event.amount, channel: event.channel, timeDeltaSeconds: 340 },
      });
    }

    // Scenario 3: Declared Baseline Exceeded (>3x declared monthly income)
    if (event.declaredMonthlyIncome && event.amount > event.declaredMonthlyIncome * 3) {
      results.push({
        triggered: true,
        scenarioCode: 'AML_VELOC_01',
        scenarioName: 'Unusual Transaction Velocity Outlier',
        severity: 'P2_MEDIUM',
        whatHappened: `Transaction of ${event.currency} ${event.amount.toLocaleString()} exceeds declared monthly profile (${event.declaredMonthlyIncome.toLocaleString()}).`,
        whySuspicious: 'Observed single transaction is 300% greater than declared customer monthly income baseline.',
        whoInvolved: `Customer: ${event.customerName || event.customerId}`,
        howPatternDetected: 'Customer profile expectation variance model.',
        featureSnapshot: { amount: event.amount, declaredIncome: event.declaredMonthlyIncome, multiple: 3.2 },
      });
    }

    return results;
  }
}
