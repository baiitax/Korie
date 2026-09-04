// Universal Security Event Ingestion, SIEM Stream & Detection Engine

import { SecurityEventRecord, SecurityAlertRecord, SecuritySeverity } from '@/types/iamEngine';

export class SecurityEventPipeline {
  private static instance: SecurityEventPipeline;

  private events: SecurityEventRecord[] = [];
  private alerts: Map<string, SecurityAlertRecord> = new Map();

  private constructor() {
    this.seedEventsAndAlerts();
  }

  public static getInstance(): SecurityEventPipeline {
    if (!SecurityEventPipeline.instance) {
      SecurityEventPipeline.instance = new SecurityEventPipeline();
    }
    return SecurityEventPipeline.instance;
  }

  private seedEventsAndAlerts() {
    this.events = [
      {
        id: 'evt-01',
        eventType: 'BREAK_GLASS_ACTIVATED',
        severity: 'CRITICAL',
        actorId: 'super.admin@koriepay.com',
        actorType: 'WORKFORCE',
        sessionId: 'sess-01',
        deviceId: 'dev-mac-01',
        ipAddress: '105.112.84.12',
        countryCode: 'NG',
        resourceType: 'INFRASTRUCTURE',
        resourceId: 'PROD_SETTLEMENT_SWITCH',
        action: 'EMERGENCY_OVERRIDE',
        result: 'SUCCESS',
        reason: 'Authorized Break-Glass elevation for corridor clearing recovery (INC-OPS-0091)',
        correlationId: 'corr-sec-9912',
        createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      },
      {
        id: 'evt-02',
        eventType: 'UNAUTHORIZED_PRIVILEGE_ATTEMPT',
        severity: 'HIGH',
        actorId: 'dev.contractor@external.io',
        actorType: 'WORKFORCE',
        sessionId: 'sess-ext-99',
        deviceId: 'dev-unknown',
        ipAddress: '197.210.65.18',
        countryCode: 'NG',
        resourceType: 'TREASURY_RESERVE',
        resourceId: 'PROV_NGN_OMNIBUS',
        action: 'MODIFY_DISBURSEMENT_ROUTING',
        result: 'DENIED',
        reason: 'Zero-Trust ABAC Policy Denied: Actor lacks active JIT lease for production financial mutation.',
        correlationId: 'corr-sec-9911',
        createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      },
      {
        id: 'evt-03',
        eventType: 'MFA_CHALLENGE_SUCCESS',
        severity: 'INFO',
        actorId: 'treasury.lead@koriepay.com',
        actorType: 'WORKFORCE',
        sessionId: 'sess-02',
        deviceId: 'dev-win-02',
        ipAddress: '41.138.64.19',
        countryCode: 'NE',
        resourceType: 'SESSION',
        resourceId: 'sess-02',
        action: 'AAL3_VERIFICATION',
        result: 'SUCCESS',
        reason: 'Biometric WebAuthn challenge verified.',
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
    ];

    const defaultAlerts: SecurityAlertRecord[] = [
      {
        id: 'alt-sec-01',
        alertCode: 'SEC-DET-04',
        title: 'Unauthorized Privilege Escalation Blocked on Production Treasury',
        severity: 'HIGH',
        status: 'TRIAGED',
        targetIdentity: 'dev.contractor@external.io',
        summary: 'External contractor identity attempted mutation on production treasury omnibus without approved JIT lease.',
        evidencePayload: {
          ip: '197.210.65.18',
          action: 'MODIFY_DISBURSEMENT_ROUTING',
          resource: 'PROV_NGN_OMNIBUS',
          decision: 'DENIED',
        },
        assignedAnalyst: 'soc.analyst@koriepay.com',
        createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      },
      {
        id: 'alt-sec-02',
        alertCode: 'SEC-DET-06',
        title: 'Critical Break-Glass Emergency Token Activated',
        severity: 'CRITICAL',
        status: 'INVESTIGATING',
        targetIdentity: 'super.admin@koriepay.com',
        summary: 'Emergency break-glass access invoked for clearing switch disaster recovery.',
        evidencePayload: {
          incidentRef: 'INC-OPS-0091',
          duration: '30 mins',
          aal: 'AAL3',
        },
        assignedAnalyst: 'ciso@koriepay.com',
        createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      },
    ];

    defaultAlerts.forEach((a) => this.alerts.set(a.id, a));
  }

  public ingestEvent(event: Omit<SecurityEventRecord, 'id' | 'createdAt'>): SecurityEventRecord {
    const record: SecurityEventRecord = {
      ...event,
      id: `evt-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };

    this.events.unshift(record);

    // Evaluate Real-Time Detection Rules
    if (record.severity === 'CRITICAL' || (record.severity === 'HIGH' && record.result === 'DENIED')) {
      const alertId = `alt-sec-${Date.now().toString().slice(-4)}`;
      this.alerts.set(alertId, {
        id: alertId,
        alertCode: record.eventType === 'BREAK_GLASS_ACTIVATED' ? 'SEC-DET-06' : 'SEC-DET-04',
        title: `Security Alert: ${record.eventType.replace(/_/g, ' ')} (${record.actorId})`,
        severity: record.severity,
        status: 'NEW',
        targetIdentity: record.actorId,
        summary: record.reason || 'Anomalous security behavior detected by real-time rules engine.',
        evidencePayload: { ...record },
        createdAt: new Date().toISOString(),
      });
    }

    return record;
  }

  public getEvents(limit: number = 50): SecurityEventRecord[] {
    return this.events.slice(0, limit);
  }

  public getAlerts(): SecurityAlertRecord[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
