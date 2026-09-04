// Tier-1 AML Alert Generation, Deduplication Clustering & Triage Engine

import { AmlAlertRecord, AmlAlertStatus, AmlSeverity } from '@/types/amlEngine';

export class AmlAlertEngine {
  private static instance: AmlAlertEngine;

  private alerts: Map<string, AmlAlertRecord> = new Map();

  private constructor() {
    this.seedAlerts();
  }

  public static getInstance(): AmlAlertEngine {
    if (!AmlAlertEngine.instance) {
      AmlAlertEngine.instance = new AmlAlertEngine();
    }
    return AmlAlertEngine.instance;
  }

  private seedAlerts() {
    const defaultAlerts: AmlAlertRecord[] = [
      {
        id: 'alt-01',
        alertReference: 'ALT-2026-009182',
        scenarioId: 'scen-rapid-01',
        scenarioCode: 'AML_RAPID_01',
        scenarioVersion: 1,
        customerId: 'cust-ng-001-ibrahim',
        customerName: 'Ibrahim Bello',
        transactionReference: 'PAY-NG-20260901',
        severity: 'P0_CRITICAL',
        status: 'NEW',
        disputedOrTriggeredAmount: 4850000,
        currency: 'NGN',
        whatHappened: 'Customer received NGN 5,000,000 and immediately dispersed NGN 4,850,000 across 3 new destination accounts.',
        whySuspicious: '97% pass-through velocity within 45 minutes indicates high probability of mule intermediary or unbacked remittance ring.',
        whoInvolved: 'Customer: Ibrahim Bello | Counterparties: 3 External NIP Accounts',
        howPatternDetected: 'Real-time velocity decay ratio analysis (45 min window).',
        featureSnapshot: { ratio: 0.97, inflowAmount: 5000000, outflowAmount: 4850000, windowMinutes: 45 },
        assignedTo: 'aml.analyst@koriepay.ng',
        slaDueAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), // 2h P0 SLA
        isSlaBreached: false,
        createdAt: '2026-09-03T10:15:00Z',
        updatedAt: '2026-09-03T10:15:00Z',
      },
      {
        id: 'alt-02',
        alertReference: 'ALT-2026-009204',
        scenarioId: 'scen-struc-01',
        scenarioCode: 'AML_STRUC_01',
        scenarioVersion: 1,
        customerId: 'cust-ne-001-amara',
        customerName: 'Amara Diallo',
        transactionReference: 'PAY-NE-20260902',
        severity: 'P1_HIGH',
        status: 'IN_REVIEW',
        disputedOrTriggeredAmount: 4750000,
        currency: 'XOF',
        whatHappened: 'Account transacted 4,750,000 CFA, positioned just under the 5,000,000 CFA UEMOA CTR threshold.',
        whySuspicious: 'Repetitive near-threshold transfers within 24 hours designed to circumvent mandatory CENTIF declaration.',
        whoInvolved: 'Customer: Amara Diallo | Agent: Sahel Kiosque Niamey',
        howPatternDetected: 'Threshold boundary proximity filter (<5% delta).',
        featureSnapshot: { amount: 4750000, statutoryCap: 5000000, proximityPct: 5 },
        assignedTo: 'sahel.compliance@koriepay.ne',
        slaDueAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        isSlaBreached: false,
        createdAt: '2026-09-03T09:00:00Z',
        updatedAt: '2026-09-03T11:00:00Z',
      },
    ];

    defaultAlerts.forEach((a) => this.alerts.set(a.id, a));
  }

  public getAlerts(filters?: { severity?: string; status?: string; customerId?: string }): AmlAlertRecord[] {
    let list = Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filters?.severity && filters.severity !== 'ALL') {
      list = list.filter((a) => a.severity === filters.severity);
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((a) => a.status === filters.status);
    }
    if (filters?.customerId) {
      list = list.filter((a) => a.customerId === filters.customerId);
    }
    return list;
  }

  public getAlert(id: string): AmlAlertRecord | undefined {
    return this.alerts.get(id);
  }

  public updateAlertStatus(alertId: string, status: AmlAlertStatus, assignedTo?: string): { success: boolean; alert?: AmlAlertRecord; error?: string } {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return { success: false, error: 'ALERT_NOT_FOUND' };
    }

    alert.status = status;
    if (assignedTo) alert.assignedTo = assignedTo;
    alert.updatedAt = new Date().toISOString();
    this.alerts.set(alertId, alert);

    return { success: true, alert };
  }
}
