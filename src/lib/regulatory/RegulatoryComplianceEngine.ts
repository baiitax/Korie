// Tier-1 Multi-Jurisdictional Regulatory Compliance & Reporting Engine

import {
  RegulatoryObligation,
  RegulatoryReportRecord,
  ObligationStatus,
} from '@/types/regulatoryConsumerEngine';

export class RegulatoryComplianceEngine {
  private static instance: RegulatoryComplianceEngine;

  private obligations: Map<string, RegulatoryObligation> = new Map();
  private reports: Map<string, RegulatoryReportRecord> = new Map();

  private constructor() {
    this.seedObligations();
  }

  public static getInstance(): RegulatoryComplianceEngine {
    if (!RegulatoryComplianceEngine.instance) {
      RegulatoryComplianceEngine.instance = new RegulatoryComplianceEngine();
    }
    return RegulatoryComplianceEngine.instance;
  }

  private seedObligations() {
    const defaultObligations: RegulatoryObligation[] = [
      {
        id: 'ob-cbn-pos-01',
        obligationCode: 'CBN-POS-DAILY-01',
        jurisdiction: 'NG',
        regulatorName: 'Central Bank of Nigeria (CBN)',
        title: 'Daily Agency Banking & POS Terminal Returns',
        frequency: 'DAILY',
        reportingPeriod: '2026-09-02',
        dueDate: '2026-09-03',
        status: 'READY_FOR_REVIEW',
        responsibleDepartment: 'Compliance Operations',
        ownerEmail: 'cbn.compliance@koriepay.ng',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-03T07:00:00Z',
      },
      {
        id: 'ob-bceao-sahel-01',
        obligationCode: 'BCEAO-UEMOA-MTH-01',
        jurisdiction: 'NE',
        regulatorName: 'Banque Centrale des Etats de l\'Afrique de l\'Ouest (BCEAO)',
        title: 'Rapport Mensuel sur les Opérations de Monnaie Electronique & Kiosques',
        frequency: 'MONTHLY',
        reportingPeriod: '2026-08',
        dueDate: '2026-09-15',
        status: 'IN_PROGRESS',
        responsibleDepartment: 'Sahel Regulatory Affairs',
        ownerEmail: 'bceao.reporting@koriepay.ne',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-02T12:00:00Z',
      },
      {
        id: 'ob-ndpc-privacy-01',
        obligationCode: 'NDPC-ANNUAL-AUDIT-01',
        jurisdiction: 'NG',
        regulatorName: 'Nigeria Data Protection Commission (NDPC)',
        title: 'Annual Data Protection Compliance Audit & Consent Log',
        frequency: 'ANNUAL',
        reportingPeriod: '2026',
        dueDate: '2026-12-31',
        status: 'IN_PROGRESS',
        responsibleDepartment: 'Legal & Privacy Desk',
        ownerEmail: 'dpo@koriepay.ng',
        createdAt: '2026-01-10T00:00:00Z',
        updatedAt: '2026-08-15T00:00:00Z',
      },
    ];

    defaultObligations.forEach((o) => this.obligations.set(o.id, o));
  }

  public getObligations(jurisdiction?: string): RegulatoryObligation[] {
    let list = Array.from(this.obligations.values());
    if (jurisdiction && jurisdiction !== 'GLOBAL') {
      list = list.filter((o) => o.jurisdiction === jurisdiction);
    }
    return list;
  }

  public getReports(): RegulatoryReportRecord[] {
    return Array.from(this.reports.values()).reverse();
  }

  public generateReport(params: {
    obligationId: string;
    preparerEmail: string;
    dataSnapshot: Record<string, any>;
  }): { success: boolean; report?: RegulatoryReportRecord; error?: string } {
    const obligation = this.obligations.get(params.obligationId);
    if (!obligation) {
      return { success: false, error: 'OBLIGATION_NOT_FOUND' };
    }

    const reportId = `rep-${Date.now().toString().slice(-6)}`;
    const reportRef = `RPT-${obligation.obligationCode}-${obligation.reportingPeriod}-V1`;

    const snapshotString = JSON.stringify(params.dataSnapshot);
    const dataHash = `sha256_${Math.abs(
      snapshotString.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
    ).toString(16)}`;

    const report: RegulatoryReportRecord = {
      id: reportId,
      reportReference: reportRef,
      obligationId: params.obligationId,
      version: 1,
      reportingPeriod: obligation.reportingPeriod,
      dataSnapshot: params.dataSnapshot,
      dataHash,
      status: 'UNDER_REVIEW',
      preparerEmail: params.preparerEmail,
      createdAt: new Date().toISOString(),
    };

    this.reports.set(reportId, report);
    obligation.status = 'READY_FOR_REVIEW';
    obligation.updatedAt = new Date().toISOString();
    this.obligations.set(obligation.id, obligation);

    return { success: true, report };
  }

  public approveReport(reportId: string, approverEmail: string): { success: boolean; report?: RegulatoryReportRecord; error?: string } {
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, error: 'REPORT_NOT_FOUND' };
    }

    report.status = 'APPROVED';
    report.approverEmail = approverEmail;
    this.reports.set(reportId, report);

    const obligation = this.obligations.get(report.obligationId);
    if (obligation) {
      obligation.status = 'APPROVED';
      obligation.updatedAt = new Date().toISOString();
      this.obligations.set(obligation.id, obligation);
    }

    return { success: true, report };
  }

  public submitReport(reportId: string): { success: boolean; report?: RegulatoryReportRecord; error?: string } {
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, error: 'REPORT_NOT_FOUND' };
    }
    if (report.status !== 'APPROVED') {
      return { success: false, error: 'CANNOT_SUBMIT_UNAPPROVED_REPORT' };
    }

    const receiptHash = `REC_CBN_BCEAO_${Date.now()}_${Math.random().toString(36).slice(-8).toUpperCase()}`;

    report.status = 'SUBMITTED';
    report.submissionReceiptHash = receiptHash;
    report.submittedAt = new Date().toISOString();
    this.reports.set(reportId, report);

    const obligation = this.obligations.get(report.obligationId);
    if (obligation) {
      obligation.status = 'SUBMITTED';
      obligation.updatedAt = new Date().toISOString();
      this.obligations.set(obligation.id, obligation);
    }

    return { success: true, report };
  }
}
