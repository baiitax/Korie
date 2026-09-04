// Risk Issue Tracking & Corrective Action Remediation Engine

import { RiskIssueRecord } from '@/types/ermEngine';

export class IssueRemediationEngine {
  private static instance: IssueRemediationEngine;

  private issues: Map<string, RiskIssueRecord> = new Map();

  private constructor() {
    this.seedIssues();
  }

  public static getInstance(): IssueRemediationEngine {
    if (!IssueRemediationEngine.instance) {
      IssueRemediationEngine.instance = new IssueRemediationEngine();
    }
    return IssueRemediationEngine.instance;
  }

  private seedIssues() {
    const defaultIssues: RiskIssueRecord[] = [
      {
        id: 'iss-01',
        issueCode: 'ISS-2026-0901-01',
        title: 'Secondary Armored Courier GPS Polling Latency in Kano Corridor',
        severity: 'MEDIUM',
        rootCause: 'Cellular network dead zones along Maradi-Kano transit route.',
        remediationAction: 'Equip CIT vehicles with dual-SIM satellite hybrid telemetry modems.',
        assignedOwner: 'Logistics Supervisor',
        dueDate: '2026-09-30',
        status: 'IN_PROGRESS',
        createdAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'iss-02',
        issueCode: 'ISS-2026-0902-02',
        title: 'Excessive Stale Reconciliation Breaks on Providus Weekend Batches',
        severity: 'LOW',
        rootCause: 'Weekend NIP clearing files dispatched on Monday 06:00 AM.',
        remediationAction: 'Implement automated API webhook polling every 30 minutes on weekends.',
        assignedOwner: 'Reconciliation Lead',
        dueDate: '2026-09-15',
        status: 'IN_PROGRESS',
        createdAt: '2026-09-02T11:30:00Z',
      },
    ];

    defaultIssues.forEach((i) => this.issues.set(i.id, i));
  }

  public getIssues(): RiskIssueRecord[] {
    return Array.from(this.issues.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public resolveIssue(issueId: string): { success: boolean; issue?: RiskIssueRecord } {
    const iss = this.issues.get(issueId);
    if (!iss) return { success: false };

    iss.status = 'CLOSED';
    this.issues.set(issueId, iss);
    return { success: true, issue: iss };
  }
}
