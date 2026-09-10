// Tier-1 Consumer Protection, Complaint Lifecycle & Financial Redress Engine

import {
  ComplaintRecord,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCategory,
  ComplaintStatusEvent,
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
        isSeed: true,
        statusHistory: [{ status: 'OPENED', at: '2026-09-02T10:00:00Z' }, { status: 'INVESTIGATING', at: '2026-09-02T12:30:00Z', by: 'support.lead@koriepay.ng' }],
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
        isSeed: true,
        statusHistory: [{ status: 'OPENED', at: '2026-09-03T08:30:00Z' }],
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
    intakeChannel?: 'PORTAL' | 'ADMIN' | 'AGENT' | 'CALL_CENTRE';
  }): ComplaintRecord {
    const id = `cmp-${Date.now().toString().slice(-6)}`;
    const complaintReference = `CMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

    const priority = data.priority || (data.category === 'DUPLICATE_DEBIT' || data.category === 'UNAUTHORIZED_TRANSACTION' ? 'P0' : 'P2');
    const slaHours = priority === 'P0' ? 24 : priority === 'P1' ? 48 : priority === 'P2' ? 72 : 120;
    const slaDueAt = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

    // Fields are copied explicitly. Spreading the caller's object let a client
    // inject derived/measurement state (status, slaDueAt, isSeed, csatScore) and
    // fabricate the very numbers the CX dashboards report.
    const complaint: ComplaintRecord = {
      id,
      complaintReference,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      country: data.country,
      category: data.category,
      priority,
      status: 'OPENED',
      transactionReference: data.transactionReference,
      paymentId: data.paymentId,
      agentId: data.agentId,
      terminalId: data.terminalId,
      disputedAmount: data.disputedAmount,
      currency: data.currency,
      description: data.description,
      slaDueAt,
      isSlaBreached: false,
      createdAt: new Date().toISOString(),
      statusHistory: [{ status: 'OPENED', at: new Date().toISOString() }],
      caseNotes: [],
      intakeChannel: data.intakeChannel,
    };

    this.complaints.set(id, complaint);
    return complaint;
  }

  public transitionStatus(complaintId: string, status: ComplaintStatus, notes?: string, assignedToEmail?: string): { success: boolean; complaint?: ComplaintRecord; error?: string } {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) {
      return { success: false, error: 'COMPLAINT_NOT_FOUND' };
    }

    const at = new Date().toISOString();
    complaint.status = status;
    if (assignedToEmail) complaint.assignedToEmail = assignedToEmail;
    if (status === 'RESOLVED') complaint.resolvedAt = at;
    if (status === 'CLOSED') complaint.closedAt = at;

    // The caller's note used to be accepted and thrown away; it is now part of
    // the case history, which is what cycle-time and audit reporting read.
    const event: ComplaintStatusEvent = {
      status,
      at,
      notes: notes || undefined,
      by: assignedToEmail || complaint.assignedToEmail,
    };
    complaint.statusHistory = [...(complaint.statusHistory || []), event];

    // SLA state is derived, so recompute it on every mutation rather than
    // trusting a flag that nothing updates.
    complaint.isSlaBreached = ComplaintDisputeEngine.computeBreach(complaint);

    this.complaints.set(complaintId, complaint);
    return { success: true, complaint };
  }

  /**
   * SLA policy as the engine actually implements it when a case is created.
   * These are the clocks a case is judged against — P0 24h, P1 48h, P2 72h,
   * P3 120h. Reported verbatim so consoles cannot paraphrase them.
   */
  public static readonly SLA_HOURS: Record<ComplaintPriority, number> = {
    P0: 24,
    P1: 48,
    P2: 72,
    P3: 120,
  };

  /**
   * Was the SLA met? For a live case that means "now vs due"; for a closed case
   * it means "the moment it was resolved vs due" — judging a closed case
   * against today's clock would manufacture breaches that never happened.
   */
  public static computeBreach(complaint: ComplaintRecord, nowMs: number = Date.now()): boolean {
    const due = new Date(complaint.slaDueAt).getTime();
    if (!Number.isFinite(due)) return false;
    if (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') {
      const stopped = new Date(complaint.closedAt || complaint.resolvedAt || complaint.slaDueAt).getTime();
      return Number.isFinite(stopped) ? stopped > due : false;
    }
    return nowMs > due;
  }

  /**
   * Recompute the stored `isSlaBreached` flag from the clock. The field is part
   * of the record, but no code path ever wrote to it after creation, so a case
   * that ran past its deadline still reported `false`. Returns how many records
   * disagreed with their clock before this call.
   */
  public refreshSlaClocks(nowMs: number = Date.now()): { corrected: number; checked: number } {
    let corrected = 0;
    this.complaints.forEach((c) => {
      const computed = ComplaintDisputeEngine.computeBreach(c, nowMs);
      if (c.isSlaBreached !== computed) corrected += 1;
      c.isSlaBreached = computed;
      this.complaints.set(c.id, c);
    });
    return { corrected, checked: this.complaints.size };
  }

  /**
   * Customer-experience measurement — the missing half of the complaint loop.
   *
   * A score is only ever a real customer's rating of a case that actually
   * reached a terminal state. There is no default, no backfill from an
   * operator, and no re-rating: a second submission is refused rather than
   * overwriting the customer's first answer.
   */
  public captureCsat(params: {
    complaintId: string;
    score: number;
    comment?: string;
    channel?: 'PORTAL' | 'USSD' | 'CALL_CENTRE';
  }): { ok: boolean; complaint?: ComplaintRecord; error?: string } {
    const complaint = this.complaints.get(params.complaintId);
    if (!complaint) return { ok: false, error: 'COMPLAINT_NOT_FOUND' };

    if (complaint.status !== 'RESOLVED' && complaint.status !== 'CLOSED') {
      return { ok: false, error: 'CSAT_ONLY_AFTER_RESOLUTION' };
    }
    if (complaint.csatScore !== undefined) {
      return { ok: false, error: 'ALREADY_RATED' };
    }
    const score = Number(params.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return { ok: false, error: 'INVALID_SCORE' };
    }

    complaint.csatScore = score as 1 | 2 | 3 | 4 | 5;
    complaint.csatComment = params.comment ? params.comment.slice(0, 500) : undefined;
    complaint.csatChannel = params.channel || 'PORTAL';
    complaint.csatCapturedAt = new Date().toISOString();
    this.complaints.set(complaint.id, complaint);
    return { ok: true, complaint };
  }

  /**
   * Case notes. The desk's reply/note actions previously wrote into a React
   * array that vanished on reload; a complaint book that cannot hold a note is
   * not a complaint book. Notes are append-only and attributable.
   */
  public addCaseNote(params: {
    complaintId: string;
    body: string;
    by: string;
    internal?: boolean;
  }): { ok: boolean; complaint?: ComplaintRecord; noteId?: string; error?: string } {
    const complaint = this.complaints.get(params.complaintId);
    if (!complaint) return { ok: false, error: 'COMPLAINT_NOT_FOUND' };
    const body = (params.body || '').trim();
    if (body.length < 2) return { ok: false, error: 'NOTE_BODY_REQUIRED' };
    if (body.length > 1000) return { ok: false, error: 'NOTE_TOO_LONG' };

    const noteId = `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    complaint.caseNotes = [
      ...(complaint.caseNotes || []),
      {
        id: noteId,
        at: new Date().toISOString(),
        by: params.by,
        body,
        internal: params.internal !== false,
      },
    ];
    this.complaints.set(complaint.id, complaint);
    return { ok: true, complaint, noteId };
  }

  /** Ratings captured so far — the only source CSAT figures may be derived from. */
  public getCsatResponses(): ComplaintRecord[] {
    return Array.from(this.complaints.values()).filter((c) => c.csatScore !== undefined);
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
    const resolvedAt = new Date().toISOString();
    complaint.status = 'RESOLVED';
    complaint.resolvedAt = resolvedAt;
    complaint.statusHistory = [
      ...(complaint.statusHistory || []),
      {
        status: 'RESOLVED',
        at: resolvedAt,
        notes: complaint.resolutionNotes,
        by: params.authorizedByEmail,
      },
    ];
    complaint.isSlaBreached = ComplaintDisputeEngine.computeBreach(complaint);

    this.complaints.set(complaint.id, complaint);
    return { success: true, complaint, journalNumber: journalResult.journal.journalNumber };
  }
}
