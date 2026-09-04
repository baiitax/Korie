// Regulatory Report Definition, Snapshotting & Equation Balancing Engine

import { RegulatoryReportSnapshot } from '@/types/reportingEngine';

export class ReportDefinitionEngine {
  private static instance: ReportDefinitionEngine;

  private snapshots: Map<string, RegulatoryReportSnapshot> = new Map();

  private constructor() {
    this.seedSnapshots();
  }

  public static getInstance(): ReportDefinitionEngine {
    if (!ReportDefinitionEngine.instance) {
      ReportDefinitionEngine.instance = new ReportDefinitionEngine();
    }
    return ReportDefinitionEngine.instance;
  }

  private seedSnapshots() {
    const defaultSnapshots: RegulatoryReportSnapshot[] = [
      {
        id: 'snp-cbn-2026-08',
        obligationCode: 'OBL-CBN-FIN-01',
        reportTitle: 'CBN Monthly Financial & Prudential Return',
        regulator: 'CBN',
        jurisdiction: 'NG',
        periodCode: '2026-M08',
        snapshotHashSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        reconciliationStatus: 'BALANCED',
        makerPreparer: 'Financial Controller',
        checkerApprover: 'Chief Financial Officer',
        status: 'SUBMITTED',
        approvedAt: '2026-09-02T14:30:00Z',
        submittedAt: '2026-09-03T09:15:00Z',
        acknowledgementToken: 'CBN-ACK-20260903-88914',
        totalAssetsNgn: 15420000000,
        totalLiabilitiesNgn: 12100000000,
        customerFundsNgn: 11850000000,
        nostroLiquidityNgn: 14250000000,
      },
      {
        id: 'snp-nfiu-2026-08',
        obligationCode: 'OBL-NFIU-STR-01',
        reportTitle: 'NFIU Suspicious Transaction Filing (STR/CTR)',
        regulator: 'NFIU',
        jurisdiction: 'NG',
        periodCode: '2026-W35',
        snapshotHashSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        reconciliationStatus: 'BALANCED',
        makerPreparer: 'AML Compliance Officer',
        checkerApprover: 'Chief Compliance Officer',
        status: 'ACKNOWLEDGED',
        approvedAt: '2026-09-01T11:00:00Z',
        submittedAt: '2026-09-01T12:00:00Z',
        acknowledgementToken: 'NFIU-ACK-90218-STR',
      },
      {
        id: 'snp-bceao-2026-08',
        obligationCode: 'OBL-BCEAO-EME-01',
        reportTitle: 'BCEAO État Mensuel EME (Niger Republic)',
        regulator: 'BCEAO',
        jurisdiction: 'NE',
        periodCode: '2026-M08',
        snapshotHashSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        reconciliationStatus: 'BALANCED',
        makerPreparer: 'Finance Lead (Niger Republic)',
        checkerApprover: 'Managing Director (Niger)',
        status: 'PREPARED',
        totalAssetsNgn: 3200000000,
        totalLiabilitiesNgn: 2900000000,
        customerFundsNgn: 2850000000,
        nostroLiquidityNgn: 3100000000,
      },
    ];

    defaultSnapshots.forEach((s) => this.snapshots.set(s.id, s));
  }

  public getSnapshots(): RegulatoryReportSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  public getSnapshot(id: string): RegulatoryReportSnapshot | undefined {
    return this.snapshots.get(id);
  }

  public approveSnapshot(snapshotId: string, approver: string): { success: boolean; snapshot?: RegulatoryReportSnapshot } {
    const s = this.snapshots.get(snapshotId);
    if (!s) return { success: false };

    s.checkerApprover = approver;
    s.status = 'APPROVED';
    s.approvedAt = new Date().toISOString();
    this.snapshots.set(snapshotId, s);

    return { success: true, snapshot: s };
  }
}
