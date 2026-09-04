// Financial Crime Case Management, Investigation Workbench & Maker-Checker Dual Decision Engine

import { AmlCaseRecord, AmlCaseNote, AmlCaseEvidence, AmlSeverity } from '@/types/amlEngine';

export class AmlCaseManagementEngine {
  private static instance: AmlCaseManagementEngine;

  private cases: Map<string, AmlCaseRecord> = new Map();
  private notes: AmlCaseNote[] = [];
  private evidence: AmlCaseEvidence[] = [];

  private constructor() {
    this.seedCases();
  }

  public static getInstance(): AmlCaseManagementEngine {
    if (!AmlCaseManagementEngine.instance) {
      AmlCaseManagementEngine.instance = new AmlCaseManagementEngine();
    }
    return AmlCaseManagementEngine.instance;
  }

  private seedCases() {
    const defaultCaseId = 'case-01';
    const defaultCase: AmlCaseRecord = {
      id: defaultCaseId,
      caseReference: 'CASE-2026-0081',
      title: 'Investigation into Multi-Party Pass-Through & Rapid Mule Drain (Lagos Corridor)',
      primaryCustomerId: 'cust-ng-001-ibrahim',
      primaryCustomerName: 'Ibrahim Bello',
      jurisdiction: 'NG',
      priority: 'P0_CRITICAL',
      status: 'INVESTIGATION',
      totalExposureAmount: 4850000,
      currency: 'NGN',
      leadInvestigator: 'lead.investigator@koriepay.ng',
      assignedTeam: 'Special Financial Intelligence Unit',
      slaDueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      createdAt: '2026-09-03T10:30:00Z',
    };

    this.cases.set(defaultCaseId, defaultCase);

    this.notes.push({
      id: 'note-01',
      caseId: defaultCaseId,
      authorEmail: 'lead.investigator@koriepay.ng',
      noteType: 'OBSERVATION',
      content: 'Customer received NGN 5M from an unidentified business entity and dispersed funds within 45 minutes across 3 newly registered accounts.',
      createdAt: '2026-09-03T10:45:00Z',
    });
  }

  public getCases(): AmlCaseRecord[] {
    return Array.from(this.cases.values()).map((c) => ({
      ...c,
      notes: this.notes.filter((n) => n.caseId === c.id),
      evidence: this.evidence.filter((e) => e.caseId === c.id),
    }));
  }

  public getCase(id: string): AmlCaseRecord | undefined {
    const c = this.cases.get(id);
    if (!c) return undefined;
    return {
      ...c,
      notes: this.notes.filter((n) => n.caseId === c.id),
      evidence: this.evidence.filter((e) => e.caseId === c.id),
    };
  }

  public createCaseFromAlert(params: {
    alertId: string;
    alertRef: string;
    customerId: string;
    customerName: string;
    amount: number;
    currency: 'NGN' | 'XOF' | 'USD';
    jurisdiction: 'NG' | 'NE';
    priority: AmlSeverity;
    leadInvestigator: string;
  }): AmlCaseRecord {
    const id = `case-${Date.now().toString().slice(-4)}`;
    const caseRef = `CASE-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const newCase: AmlCaseRecord = {
      id,
      caseReference: caseRef,
      title: `Financial Crime Investigation: ${params.alertRef} (${params.customerName})`,
      primaryCustomerId: params.customerId,
      primaryCustomerName: params.customerName,
      jurisdiction: params.jurisdiction,
      priority: params.priority,
      status: 'INVESTIGATION',
      totalExposureAmount: params.amount,
      currency: params.currency,
      leadInvestigator: params.leadInvestigator,
      assignedTeam: 'Financial Crime Intelligence Desk',
      slaDueAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.cases.set(id, newCase);
    return newCase;
  }

  public addNote(caseId: string, authorEmail: string, content: string, noteType: string = 'OBSERVATION'): AmlCaseNote {
    const note: AmlCaseNote = {
      id: `note-${Date.now().toString().slice(-6)}`,
      caseId,
      authorEmail,
      noteType,
      content,
      createdAt: new Date().toISOString(),
    };
    this.notes.push(note);
    return note;
  }

  public submitCaseDecision(params: {
    caseId: string;
    decision: string;
    notes: string;
    makerEmail: string;
    checkerEmail: string;
  }): { success: boolean; case?: AmlCaseRecord; error?: string } {
    const c = this.cases.get(params.caseId);
    if (!c) {
      return { success: false, error: 'CASE_NOT_FOUND' };
    }

    c.finalDecision = params.decision;
    c.decisionNotes = params.notes;
    c.decisionMaker = params.makerEmail;
    c.decisionChecker = params.checkerEmail;
    c.decidedAt = new Date().toISOString();
    c.status = 'CLOSED';
    c.closedAt = new Date().toISOString();

    this.cases.set(c.id, c);
    return { success: true, case: this.getCase(c.id) };
  }
}
