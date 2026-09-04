// Tier-1 Consumer Protection, Complaint Lifecycle & Financial Redress Engine

import {
  ComplaintRecord,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCategory,
} from '@/types/regulatoryConsumerEngine';
import { GeneralLedgerEngine } from '../financial/GeneralLedgerEngine';
import { SubledgerEngine } from '../financial/SubledgerEngine';

export class ComplaintDisputeEngine {
  private static instance: ComplaintDisputeEngine;

  private complaints: Map<string, ComplaintRecord> = new Map();

  private constructor() {
    this.seedComplaints();
  }

  public static getInstance(): ComplaintDisputeEngine {
    if (!ComplaintDisputeEngine.instance) {
      ComplaintDisputeEngine.instance = new ComplaintDisputeEngine();
    }
    return ComplaintDisputeEngine.instance;
  }

  private seedComplaints() {
    const defaultComplaints: ComplaintRecord[] = [
      {
        id: 'cmp-01',
        complaintReference: 'CMP-2026-00918',
        customerId: 'cust-ng-001-ibrahim',
        customerName: 'Ibrahim Bello',
        customerPhone: '+2348099887766',
        country: 'NG',
        category: 'DUPLICATE_DEBIT',
        priority: 'P0',
        status: 'INVESTIGATING',
        transactionReference: 'PAY-NG-20260901',
        agentId: 'agt-ng-001',
        terminalId: 'TID-NG-009182',
        disputedAmount: 25000,
        currency: 'NGN',
        description: 'Customer experienced dual debit of ₦25,000 during agent POS cash-out session.',
        assignedToEmail: 'support.lead@koriepay.ng',
        slaDueAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(), // 18h remaining
        isSlaBreached: false,
        createdAt: '2026-09-02T10:00:00Z',
      },
      {
        id: 'cmp-02',
        complaintReference: 'CMP-2026-00922',
        customerId: 'cust-ne-001-amara',
        customerName: 'Amara Diallo',
        customerPhone: '+22790223344',
        country: 'NE',
        category: 'AGENT_OVERCHARGING',
        priority: 'P1',
        status: 'OPENED',
        agentId: 'agt-ne-001',
        terminalId: 'TID-NE-002190',
        disputedAmount: 1500,
        currency: 'XOF',
        description: 'Agent demanded an extra 1,500 CFA cash fee above standard KoriePay published tariffs.',
        slaDueAt: new Date(Date.now() + 42 * 3600 * 1000).toISOString(),
        isSlaBreached: false,
        createdAt: '2026-09-03T08:30:00Z',
      },
    ];

    defaultComplaints.forEach((c) => this.complaints.set(c.id, c));
  }

  public getComplaints(filters?: { country?: string; status?: string; priority?: string }): ComplaintRecord[] {
    let list = Array.from(this.complaints.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filters?.country && filters.country !== 'GLOBAL') {
      list = list.filter((c) => c.country === filters.country);
    }
    if (filters?.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.priority) {
      list = list.filter((c) => c.priority === filters.priority);
    }
    return list;
  }

  public getComplaint(id: string): ComplaintRecord | undefined {
    return this.complaints.get(id);
  }

  public createComplaint(data: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    country: 'NG' | 'NE';
    category: ComplaintCategory;
    priority?: ComplaintPriority;
    transactionReference?: string;
    paymentId?: string;
    agentId?: string;
    terminalId?: string;
    disputedAmount: number;
    currency: 'NGN' | 'XOF';
    description: string;
  }): ComplaintRecord {
    const id = `cmp-${Date.now().toString().slice(-6)}`;
    const complaintReference = `CMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

    const priority = data.priority || (data.category === 'DUPLICATE_DEBIT' || data.category === 'UNAUTHORIZED_TRANSACTION' ? 'P0' : 'P2');
    const slaHours = priority === 'P0' ? 24 : priority === 'P1' ? 48 : priority === 'P2' ? 72 : 120;
    const slaDueAt = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

    const complaint: ComplaintRecord = {
      ...data,
      id,
      complaintReference,
      priority,
      status: 'OPENED',
      slaDueAt,
      isSlaBreached: false,
      createdAt: new Date().toISOString(),
    };

    this.complaints.set(id, complaint);
    return complaint;
  }

  public transitionStatus(complaintId: string, status: ComplaintStatus, notes?: string, assignedToEmail?: string): { success: boolean; complaint?: ComplaintRecord; error?: string } {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) {
      return { success: false, error: 'COMPLAINT_NOT_FOUND' };
    }

    complaint.status = status;
    if (assignedToEmail) complaint.assignedToEmail = assignedToEmail;
    if (status === 'RESOLVED') complaint.resolvedAt = new Date().toISOString();
    if (status === 'CLOSED') complaint.closedAt = new Date().toISOString();

    this.complaints.set(complaintId, complaint);
    return { success: true, complaint };
  }

  public executeFinancialCompensation(params: {
    complaintId: string;
    compensationAmount: number;
    reason: string;
    authorizedByEmail: string;
  }): { success: boolean; complaint?: ComplaintRecord; journalNumber?: string; error?: string } {
    const complaint = this.complaints.get(params.complaintId);
    if (!complaint) {
      return { success: false, error: 'COMPLAINT_NOT_FOUND' };
    }

    // Double-Entry Balanced Journal Execution (Non-negotiable Financial Rule)
    const glEngine = GeneralLedgerEngine.getInstance();
    const subledgerEngine = SubledgerEngine.getInstance();

    const walletAccount = complaint.currency === 'NGN' ? '2010' : '2020';
    const compensationExpenseAccount = '5010'; // Operating / Consumer Redress Expense Account

    const journalResult = glEngine.postJournal({
      entryType: 'STANDARD',
      sourceModule: 'MANUAL',
      sourceReference: complaint.complaintReference,
      narration: `Consumer Harm Redress for ${complaint.complaintReference}: ${params.reason}`,
      currency: complaint.currency,
      postedBy: params.authorizedByEmail,
      lines: [
        {
          accountCode: compensationExpenseAccount,
          entrySide: 'DEBIT',
          amount: params.compensationAmount,
          currency: complaint.currency,
          country: complaint.country,
          legalEntity: complaint.country === 'NG' ? 'KORIE_NIGERIA_LTD' : 'KORIE_NIGER_SA',
          product: 'WALLET_P2P',
          channel: 'SYSTEM',
          lineNarration: `Consumer Compensation Expense: ${complaint.complaintReference}`,
        },
        {
          accountCode: walletAccount,
          entrySide: 'CREDIT',
          amount: params.compensationAmount,
          currency: complaint.currency,
          country: complaint.country,
          legalEntity: complaint.country === 'NG' ? 'KORIE_NIGERIA_LTD' : 'KORIE_NIGER_SA',
          product: 'WALLET_P2P',
          channel: 'SYSTEM',
          lineNarration: `Customer Wallet Credit: ${complaint.complaintReference}`,
        },
      ],
    });

    if (!journalResult.success || !journalResult.journal) {
      return { success: false, error: `LEDGER_POSTING_FAILED: ${journalResult.error}` };
    }

    // Update Subledger
    subledgerEngine.mutateBalance({
      subledgerType: 'CUSTOMER_WALLET',
      entityId: complaint.customerId,
      accountCode: walletAccount,
      currency: complaint.currency,
      country: complaint.country,
      deltaAmount: params.compensationAmount,
    });

    // Update Complaint Record
    complaint.financialCompensationAmount = params.compensationAmount;
    complaint.glJournalId = journalResult.journal.id;
    complaint.resolutionType = 'FINANCIAL_REDRESS_POSTED';
    complaint.resolutionNotes = `Compensated ${complaint.currency} ${params.compensationAmount} via GL Journal ${journalResult.journal.journalNumber}`;
    complaint.status = 'RESOLVED';
    complaint.resolvedAt = new Date().toISOString();

    this.complaints.set(complaint.id, complaint);
    return { success: true, complaint, journalNumber: journalResult.journal.journalNumber };
  }
}
