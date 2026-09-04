// Idempotent Regulatory Submission & Acknowledgment Engine

import { RegulatorySubmission } from '@/types/reportingEngine';
import { ReportDefinitionEngine } from './ReportDefinitionEngine';

export class RegulatorySubmissionEngine {
  private static instance: RegulatorySubmissionEngine;

  private submissions: Map<string, RegulatorySubmission> = new Map();

  private constructor() {
    this.seedSubmissions();
  }

  public static getInstance(): RegulatorySubmissionEngine {
    if (!RegulatorySubmissionEngine.instance) {
      RegulatorySubmissionEngine.instance = new RegulatorySubmissionEngine();
    }
    return RegulatorySubmissionEngine.instance;
  }

  private seedSubmissions() {
    const defaultSubmissions: RegulatorySubmission[] = [
      {
        id: 'sub-01',
        snapshotId: 'snp-cbn-2026-08',
        obligationCode: 'OBL-CBN-FIN-01',
        idempotencyKey: 'idemp-cbn-20260903-88914',
        submissionChannel: 'CBN_REGULATORY_API_GATEWAY',
        submittedBy: 'Chief Financial Officer',
        submissionRef: 'CBN-SUB-20260903-019',
        status: 'SUBMITTED',
        acknowledgementToken: 'CBN-ACK-20260903-88914',
        acknowledgedAt: '2026-09-03T09:16:12Z',
        submittedAt: '2026-09-03T09:15:00Z',
      },
      {
        id: 'sub-02',
        snapshotId: 'snp-nfiu-2026-08',
        obligationCode: 'OBL-NFIU-STR-01',
        idempotencyKey: 'idemp-nfiu-20260901-00219',
        submissionChannel: 'NFIU_GOAML_SECURE_API',
        submittedBy: 'Chief Compliance Officer',
        submissionRef: 'NFIU-SUB-20260901-004',
        status: 'ACKNOWLEDGED',
        acknowledgementToken: 'NFIU-ACK-90218-STR',
        acknowledgedAt: '2026-09-01T12:05:00Z',
        submittedAt: '2026-09-01T12:00:00Z',
      },
    ];

    defaultSubmissions.forEach((s) => this.submissions.set(s.id, s));
  }

  public getSubmissions(): RegulatorySubmission[] {
    return Array.from(this.submissions.values()).sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }

  public submitSnapshot(snapshotId: string, submittedBy: string): { success: boolean; submission?: RegulatorySubmission; error?: string } {
    const snapshotEngine = ReportDefinitionEngine.getInstance();
    const snapshot = snapshotEngine.getSnapshot(snapshotId);

    if (!snapshot) return { success: false, error: 'SNAPSHOT_NOT_FOUND' };
    if (snapshot.status !== 'APPROVED') return { success: false, error: 'SNAPSHOT_NOT_APPROVED_BY_CHECKER' };

    const idempotencyKey = `idemp-${snapshot.obligationCode}-${Date.now()}`;
    const submissionRef = `${snapshot.regulator}-SUB-${Date.now().toString().slice(-6)}`;
    const ackToken = `${snapshot.regulator}-ACK-${Date.now().toString().slice(-5)}`;

    const submission: RegulatorySubmission = {
      id: `sub-${Date.now().toString().slice(-4)}`,
      snapshotId,
      obligationCode: snapshot.obligationCode,
      idempotencyKey,
      submissionChannel: `${snapshot.regulator}_GATEWAY`,
      submittedBy,
      submissionRef,
      status: 'ACKNOWLEDGED',
      acknowledgementToken: ackToken,
      acknowledgedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    };

    this.submissions.set(submission.id, submission);

    snapshot.status = 'ACKNOWLEDGED';
    snapshot.submittedAt = submission.submittedAt;
    snapshot.acknowledgementToken = ackToken;

    return { success: true, submission };
  }
}
