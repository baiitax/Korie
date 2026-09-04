// Automated Systemic Customer Harm Detection & Incident Management Engine

import { SystemicIncidentRecord } from '@/types/regulatoryConsumerEngine';

export class CustomerHarmIncidentEngine {
  private static instance: CustomerHarmIncidentEngine;

  private incidents: Map<string, SystemicIncidentRecord> = new Map();

  private constructor() {
    this.seedIncidents();
  }

  public static getInstance(): CustomerHarmIncidentEngine {
    if (!CustomerHarmIncidentEngine.instance) {
      CustomerHarmIncidentEngine.instance = new CustomerHarmIncidentEngine();
    }
    return CustomerHarmIncidentEngine.instance;
  }

  private seedIncidents() {
    const defaultIncidents: SystemicIncidentRecord[] = [
      {
        id: 'inc-01',
        incidentReference: 'INC-2026-081',
        title: 'Interswitch Gateway WebPAY Timeout Spike (Lagos Terminal Cluster)',
        severity: 'SEV_2_HIGH',
        status: 'MITIGATED',
        affectedProvider: 'INTERSWITCH',
        affectedCorridor: 'NG_CARD_SWITCH',
        affectedCustomersCount: 42,
        affectedAgentsCount: 8,
        totalFinancialExposure: 385000,
        currency: 'NGN',
        rootCause: 'Upstream gateway 3DS 2.2 callback latency exceeded 15s during peak morning clearing window.',
        remediationPlan: 'Auto-switched card processing traffic to Providus Direct Gateway; refunded 42 customer reservation holds.',
        regulatoryNotified: true,
        regulatoryFilingReference: 'CBN-INC-2026-0902-881',
        startedAt: '2026-09-02T08:15:00Z',
        mitigatedAt: '2026-09-02T09:30:00Z',
        resolvedAt: '2026-09-02T11:00:00Z',
        createdAt: '2026-09-02T08:20:00Z',
      },
    ];

    defaultIncidents.forEach((i) => this.incidents.set(i.id, i));
  }

  public getIncidents(): SystemicIncidentRecord[] {
    return Array.from(this.incidents.values()).reverse();
  }

  public createIncident(data: Omit<SystemicIncidentRecord, 'id' | 'incidentReference' | 'status' | 'createdAt'>): SystemicIncidentRecord {
    const id = `inc-${Date.now().toString().slice(-6)}`;
    const incidentReference = `INC-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`;

    const incident: SystemicIncidentRecord = {
      ...data,
      id,
      incidentReference,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    this.incidents.set(id, incident);
    return incident;
  }

  public updateIncidentStatus(params: {
    incidentId: string;
    status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'REMEDIATING' | 'RESOLVED' | 'POSTMORTEM_PUBLISHED';
    rootCause?: string;
    remediationPlan?: string;
  }): { success: boolean; incident?: SystemicIncidentRecord; error?: string } {
    const incident = this.incidents.get(params.incidentId);
    if (!incident) {
      return { success: false, error: 'INCIDENT_NOT_FOUND' };
    }

    incident.status = params.status;
    if (params.rootCause) incident.rootCause = params.rootCause;
    if (params.remediationPlan) incident.remediationPlan = params.remediationPlan;
    if (params.status === 'MITIGATED') incident.mitigatedAt = new Date().toISOString();
    if (params.status === 'RESOLVED') incident.resolvedAt = new Date().toISOString();

    this.incidents.set(incident.id, incident);
    return { success: true, incident };
  }
}
