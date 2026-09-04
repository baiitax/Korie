// Multi-Jurisdiction Regulatory Obligation Registry & Deadlines

import { RegulatoryObligation } from '@/types/reportingEngine';

export class RegulatoryObligationEngine {
  private static instance: RegulatoryObligationEngine;

  private obligations: Map<string, RegulatoryObligation> = new Map();

  private constructor() {
    this.seedObligations();
  }

  public static getInstance(): RegulatoryObligationEngine {
    if (!RegulatoryObligationEngine.instance) {
      RegulatoryObligationEngine.instance = new RegulatoryObligationEngine();
    }
    return RegulatoryObligationEngine.instance;
  }

  private seedObligations() {
    const defaultObligations: RegulatoryObligation[] = [
      {
        id: 'obl-01',
        obligationCode: 'OBL-CBN-FIN-01',
        regulator: 'CBN',
        jurisdiction: 'NG',
        reportTitle: 'Monthly Financial & Prudential Return (PSB/MMO)',
        frequency: 'MONTHLY',
        submissionChannel: 'API',
        reportOwner: 'Financial Controller',
        approverRole: 'Chief Financial Officer (CFO)',
        status: 'SUBMITTED',
        nextDueDate: '2026-09-10',
      },
      {
        id: 'obl-02',
        obligationCode: 'OBL-NFIU-STR-01',
        regulator: 'NFIU',
        jurisdiction: 'NG',
        reportTitle: 'Suspicious Transaction & Structuring Reports (STR/CTR)',
        frequency: 'AD_HOC',
        submissionChannel: 'API',
        reportOwner: 'AML Compliance Officer',
        approverRole: 'Chief Compliance Officer (CCO)',
        status: 'ACKNOWLEDGED',
        nextDueDate: '2026-09-05',
      },
      {
        id: 'obl-03',
        obligationCode: 'OBL-BCEAO-EME-01',
        regulator: 'BCEAO',
        jurisdiction: 'NE',
        reportTitle: 'État Mensuel des Émetteurs de Monnaie Électronique (EME)',
        frequency: 'MONTHLY',
        submissionChannel: 'SECURE_FILE',
        reportOwner: 'Finance Lead (Niger Republic)',
        approverRole: 'Managing Director (Niger)',
        status: 'DUE_SOON',
        nextDueDate: '2026-09-15',
      },
      {
        id: 'obl-04',
        obligationCode: 'OBL-NDIC-DEP-01',
        regulator: 'NDIC',
        jurisdiction: 'NG',
        reportTitle: 'Quarterly Insured Customer Deposit Breakdown',
        frequency: 'QUARTERLY',
        submissionChannel: 'PORTAL',
        reportOwner: 'Financial Controller',
        approverRole: 'Chief Financial Officer (CFO)',
        status: 'UPCOMING',
        nextDueDate: '2026-10-15',
      },
      {
        id: 'obl-05',
        obligationCode: 'OBL-CENTIF-AML-01',
        regulator: 'CENTIF',
        jurisdiction: 'NE',
        reportTitle: 'Déclaration Périodique de Lutte Contre le Blanchiment (LCB/FT)',
        frequency: 'MONTHLY',
        submissionChannel: 'SECURE_FILE',
        reportOwner: 'Compliance Lead (Niger)',
        approverRole: 'Chief Compliance Officer (CCO)',
        status: 'UPCOMING',
        nextDueDate: '2026-09-20',
      },
    ];

    defaultObligations.forEach((o) => this.obligations.set(o.id, o));
  }

  public getObligations(): RegulatoryObligation[] {
    return Array.from(this.obligations.values());
  }

  public getObligation(id: string): RegulatoryObligation | undefined {
    return this.obligations.get(id);
  }
}
