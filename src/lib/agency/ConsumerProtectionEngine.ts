// Agency Consumer Protection, Complaint Governance & Statutory Redress Engine

import { AgencyConsumerComplaintRecord } from '@/types/agencyEngine';

export class ConsumerProtectionEngine {
  private static instance: ConsumerProtectionEngine;

  private complaints: AgencyConsumerComplaintRecord[] = [];

  private constructor() {
    this.seedComplaints();
  }

  public static getInstance(): ConsumerProtectionEngine {
    if (!ConsumerProtectionEngine.instance) {
      ConsumerProtectionEngine.instance = new ConsumerProtectionEngine();
    }
    return ConsumerProtectionEngine.instance;
  }

  private seedComplaints() {
    this.complaints = [
      {
        id: 'cmp-01',
        complaintReference: 'CMP-2026-00918',
        customerId: 'cust-ng-1029',
        customerName: 'Fatima Abdullahi',
        customerPhone: '+2348039911223',
        country: 'NG',
        agentId: 'agt-ng-001',
        agentName: 'Garba Express Services & POS',
        terminalId: 'TID-NG-009182',
        category: 'CASH_NOT_DISPENSED',
        priority: 'P0',
        status: 'INVESTIGATING',
        disputedAmount: 20000,
        currency: 'NGN',
        description: 'Debited ₦20,000 for cash withdrawal at terminal TID-NG-009182, but cash was not dispensed due to paper jam.',
        slaDueAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
        createdAt: '2026-09-03T10:00:00Z',
      },
      {
        id: 'cmp-02',
        complaintReference: 'CMP-2026-00441',
        customerId: 'cust-ne-8812',
        customerName: 'Amadou Seydou',
        customerPhone: '+22790998877',
        country: 'NE',
        agentId: 'agt-ne-001',
        agentName: 'Sahel Kiosque Niamey',
        terminalId: 'TID-NE-002190',
        category: 'AGENT_OVERCHARGING',
        priority: 'P1',
        status: 'RESOLVED',
        disputedAmount: 1500,
        currency: 'XOF',
        description: 'Agent demanded an extra 1,500 XOF surcharge for cash-out above the official tariff.',
        slaDueAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        resolutionNotes: 'Customer refunded 1,500 XOF. Agent warned and penalized.',
        resolvedAt: '2026-09-02T16:00:00Z',
        createdAt: '2026-09-01T09:30:00Z',
      },
    ];
  }

  public getComplaints(): AgencyConsumerComplaintRecord[] {
    return [...this.complaints].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public resolveComplaintWithRedress(params: {
    complaintId: string;
    notes: string;
    resolvedBy: string;
  }): { success: boolean; complaint?: AgencyConsumerComplaintRecord } {
    const comp = this.complaints.find((c) => c.id === params.complaintId);
    if (!comp) return { success: false };

    comp.status = 'RESOLVED';
    comp.resolutionNotes = params.notes;
    comp.resolvedAt = new Date().toISOString();
    comp.glJournalId = `GL-JRN-REDRESS-${Date.now().toString().slice(-4)}`;

    return { success: true, complaint: comp };
  }
}
