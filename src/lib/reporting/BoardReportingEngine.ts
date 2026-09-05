// Board Risk & Performance Pack & Action Tracking Engine

import { BoardReportPack, BoardReportAction } from '@/types/reportingEngine';

export class BoardReportingEngine {
  private static instance: BoardReportingEngine;

  private packs: Map<string, BoardReportPack> = new Map();
  private actions: Map<string, BoardReportAction> = new Map();

  private constructor() {
    this.seedBoardData();
  }

  public static getInstance(): BoardReportingEngine {
    if (!BoardReportingEngine.instance) {
      BoardReportingEngine.instance = new BoardReportingEngine();
    }
    return BoardReportingEngine.instance;
  }

  private seedBoardData() {
    const defaultPacks: BoardReportPack[] = [
      {
        id: 'brd-2026-q3',
        reportCode: 'BRD-PACK-2026-Q3',
        meetingPeriod: 'Q3 2026 Board of Directors Meeting',
        status: 'PUBLISHED',
        generatedBy: 'Company Secretary & CRO Desk',
        publishedAt: '2026-09-01T10:00:00Z',
        sectionsCount: 20,
        openActionsCount: 2,
      },
    ];

    const defaultActions: BoardReportAction[] = [
      {
        id: 'act-01',
        boardReportId: 'brd-2026-q3',
        directiveTitle: 'Expand Francophone XOF Nostro Facility at Coris Bank Niger SA',
        assignedOwner: 'Group Treasurer',
        dueDate: '2026-10-15',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
      },
      {
        id: 'act-02',
        boardReportId: 'brd-2026-q3',
        directiveTitle: 'Implement Automated NFIU GoAML Direct Submission API Connector',
        assignedOwner: 'Chief Compliance Officer',
        dueDate: '2026-11-01',
        priority: 'CRITICAL',
        status: 'OPEN',
      },
    ];

    defaultPacks.forEach((p) => this.packs.set(p.id, p));
    defaultActions.forEach((a) => this.actions.set(a.id, a));
  }

  public getPacks(): BoardReportPack[] {
    return Array.from(this.packs.values());
  }

  public getActions(): BoardReportAction[] {
    return Array.from(this.actions.values());
  }
}
