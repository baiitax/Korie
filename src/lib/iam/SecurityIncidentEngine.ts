// Security Incident Response & Containment Playbook Engine

import { SecurityIncidentRecord } from '@/types/iamEngine';
import { WorkforceIamEngine } from './WorkforceIamEngine';

export class SecurityIncidentEngine {
  private static instance: SecurityIncidentEngine;

  private incidents: Map<string, SecurityIncidentRecord> = new Map();

  private constructor() {
    this.seedIncidents();
  }

  public static getInstance(): SecurityIncidentEngine {
    if (!SecurityIncidentEngine.instance) {
      SecurityIncidentEngine.instance = new SecurityIncidentEngine();
    }
    return SecurityIncidentEngine.instance;
  }

  private seedIncidents() {
    const defaultIncident: SecurityIncidentRecord = {
      id: 'inc-01',
      incidentReference: 'INC-SEC-2026-0012',
      title: 'Investigation into Unauthorized Treasury Mutation Attempt & Contractor Access Review',
      severity: 'HIGH',
      status: 'CONTAINMENT',
      incidentCommander: 'ciso@koriepay.com',
      affectedServices: ['Treasury Ledger Subsystem', 'Providus NGN Clearing Node'],
      affectedCountries: ['NG'],
      containmentState: 'IDENTITY_SESSIONS_REVOKED',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      notes: [
        {
          id: 'note-01',
          authorEmail: 'ciso@koriepay.com',
          content: 'Actor sessions revoked immediately. Active JIT lease disabled. Forensic audit of past 48 hours underway.',
          createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        },
      ],
    };

    this.incidents.set(defaultIncident.id, defaultIncident);
  }

  public getIncidents(): SecurityIncidentRecord[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public executeContainment(params: {
    incidentId: string;
    targetEmail: string;
    action: 'REVOKE_SESSIONS' | 'LOCK_IDENTITY' | 'ISOLATE_CREDENTIALS';
    commanderEmail: string;
  }): { success: boolean; incident?: SecurityIncidentRecord; revokedCount?: number } {
    const inc = this.incidents.get(params.incidentId);
    if (!inc) return { success: false };

    const iam = WorkforceIamEngine.getInstance();
    const revoked = iam.revokeAllSessionsForIdentity(
      params.targetEmail,
      `INCIDENT_CONTAINMENT: ${inc.incidentReference}`
    );

    inc.containmentState = `${params.action}_COMPLETED`;
    inc.notes = inc.notes || [];
    inc.notes.push({
      id: `note-${Date.now().toString().slice(-4)}`,
      authorEmail: params.commanderEmail,
      content: `Automated containment executed: ${params.action} on ${params.targetEmail}. ${revoked} active sessions terminated.`,
      createdAt: new Date().toISOString(),
    });

    this.incidents.set(inc.id, inc);
    return { success: true, incident: inc, revokedCount: revoked };
  }
}
