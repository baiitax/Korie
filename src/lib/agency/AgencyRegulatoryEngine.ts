// Sovereign Regulatory Policy Engine (CBN Nigeria vs BCEAO Niger Republic)

export interface RegulatoryProfile {
  jurisdiction: 'NG' | 'NE';
  authority: string;
  frameworkVersion: string;
  singleTransactionCap: number;
  dailyTransactionCap: number;
  maxCashInDrawer: number;
  resolutionSlaHours: number;
}

export class AgencyRegulatoryEngine {
  private static instance: AgencyRegulatoryEngine;

  private profiles: Map<string, RegulatoryProfile> = new Map();

  private constructor() {
    this.profiles.set('NG', {
      jurisdiction: 'NG',
      authority: 'Central Bank of Nigeria (CBN)',
      frameworkVersion: 'CBN/BSD/DIR/GEN/09/2025',
      singleTransactionCap: 200000,
      dailyTransactionCap: 2500000,
      maxCashInDrawer: 5000000,
      resolutionSlaHours: 24,
    });

    this.profiles.set('NE', {
      jurisdiction: 'NE',
      authority: 'Banque Centrale des États de l’Afrique de l’Ouest (BCEAO)',
      frameworkVersion: 'BCEAO/DSP/UEMOA/04/2026',
      singleTransactionCap: 500000,
      dailyTransactionCap: 5000000,
      maxCashInDrawer: 10000000,
      resolutionSlaHours: 48,
    });
  }

  public static getInstance(): AgencyRegulatoryEngine {
    if (!AgencyRegulatoryEngine.instance) {
      AgencyRegulatoryEngine.instance = new AgencyRegulatoryEngine();
    }
    return AgencyRegulatoryEngine.instance;
  }

  public getProfile(jurisdiction: 'NG' | 'NE'): RegulatoryProfile | undefined {
    return this.profiles.get(jurisdiction);
  }
}
