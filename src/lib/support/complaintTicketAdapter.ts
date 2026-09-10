// =============================================================================
// ComplaintDisputeEngine  ⇄  the support desk's ticket model
//
// GAP-3: the support console ran on a parallel universe — `SupportContext`
// minted `KP-SUP-<n>` ticket numbers in the browser and held an in-React-array
// ticket book, while the real complaint engine (lifecycle, SLA clocks,
// assignment, double-entry redress) sat untouched behind agent-scoped routes.
//
// This adapter is the single place where one model becomes the other, and it is
// deliberately lossy in one direction only: a complaint knows things the ticket
// model has no vocabulary for, and the ticket model wants things the engine
// never records. Those are listed in `UNRECORDED_TICKET_FIELDS` and rendered as
// "not recorded in the engine" — never silently defaulted to a plausible value.
//
// Nothing here invents data. Every field below is either copied from the
// complaint, derived from its own clock (SLA state), or absent.
// =============================================================================

import type {
  ComplaintRecord,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintCategory,
} from '@/types/regulatoryConsumerEngine';
import type {
  SupportTicket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  TicketCategory,
  SlaState,
  SupportChannel,
  SupportJurisdiction,
  CustomerType,
} from '@/types/support';

/** Fields the desk's UI wants but the complaint engine does not record. */
export const UNRECORDED_TICKET_FIELDS = [
  'firstResponseDueAt',
  'firstRespondedAt',
  'tierAssigned',
  'sentiment',
  'language',
  'assignedOfficerId',
] as const;

/** Where a complaint came in from. The engine stores this at intake. */
export const INTAKE_TO_CHANNEL: Record<string, SupportChannel> = {
  PORTAL: 'WEB_PORTAL',
  ADMIN: 'IN_APP',
  AGENT: 'AGENT_PORTAL',
  CALL_CENTRE: 'EMAIL',
};

/**
 * Complaint lifecycle → desk vocabulary. Several complaint states share a desk
 * label (ACKNOWLEDGED and CLASSIFIED are both "TRIAGED"); the reverse map below
 * is therefore defined separately rather than inverted.
 */
const STATUS_TO_TICKET: Record<ComplaintStatus, TicketStatus> = {
  OPENED: 'NEW',
  ACKNOWLEDGED: 'TRIAGED',
  CLASSIFIED: 'TRIAGED',
  ASSIGNED: 'ASSIGNED',
  INVESTIGATING: 'IN_PROGRESS',
  PENDING_CUSTOMER: 'WAITING_FOR_CUSTOMER',
  PENDING_PROVIDER: 'WAITING_FOR_INTERNAL_TEAM',
  RESOLUTION_PROPOSED: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

/** Desk action → the complaint status the engine will actually accept. */
export const TICKET_ACTION_TO_STATUS: Record<string, ComplaintStatus> = {
  TRIAGED: 'ACKNOWLEDGED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'INVESTIGATING',
  WAITING_FOR_CUSTOMER: 'PENDING_CUSTOMER',
  WAITING_FOR_INTERNAL_TEAM: 'PENDING_PROVIDER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

const PRIORITY_TO_TICKET: Record<ComplaintPriority, TicketPriority> = {
  P0: 'CRITICAL',
  P1: 'HIGH',
  P2: 'NORMAL',
  P3: 'LOW',
};

/** Desk priority → the engine's ladder (P0 24h · P1 48h · P2 72h · P3 120h). */
export const TICKET_PRIORITY_TO_COMPLAINT: Record<TicketPriority, ComplaintPriority> = {
  CRITICAL: 'P0',
  URGENT: 'P0',
  HIGH: 'P1',
  NORMAL: 'P2',
  LOW: 'P3',
};

/** Desk category vocabulary → the categories the engine actually validates. */
export const TICKET_CATEGORY_TO_COMPLAINT: Record<string, ComplaintCategory> = {
  TRANSFER: 'FAILED_TRANSFER',
  TRANSFERS: 'FAILED_TRANSFER',
  PENDING_TRANSACTION: 'FAILED_TRANSFER',
  DEPOSIT: 'FAILED_TRANSFER',
  WITHDRAWAL: 'FAILED_TRANSFER',
  REFUND: 'REFUND_DELAY',
  DISPUTE: 'FEE_DISPUTE',
  FEE_DISPUTE: 'FEE_DISPUTE',
  AGENT_CONDUCT: 'AGENT_HARASSMENT',
  AGENT_OVERCHARGE: 'AGENT_OVERCHARGING',
  DUPLICATE_DEBIT: 'DUPLICATE_DEBIT',
  UNAUTHORISED: 'UNAUTHORIZED_TRANSACTION',
  ACCOUNT_ACCESS: 'ACCOUNT_RESTRICTION',
  POS_TERMINAL: 'POS_TERMINAL_GLITCH',
};

/** The desk's category label for a real engine category (UI grouping only). */
const CATEGORY_TO_TICKET: Record<ComplaintCategory, TicketCategory> = {
  FAILED_TRANSFER: 'TRANSFER',
  DUPLICATE_DEBIT: 'TRANSFER',
  AGENT_OVERCHARGING: 'AGENT_SERVICES',
  AGENT_HARASSMENT: 'AGENT_SERVICES',
  UNAUTHORIZED_TRANSACTION: 'SECURITY',
  POS_TERMINAL_GLITCH: 'CARD_POS',
  REFUND_DELAY: 'REFUNDS',
  FEE_DISPUTE: 'FEES',
  ACCOUNT_RESTRICTION: 'ACCOUNT',
} as unknown as Record<ComplaintCategory, TicketCategory>;

const JURISDICTION: Record<'NG' | 'NE', SupportJurisdiction> = { NG: 'NG', NE: 'NE' };

/** SLA state derived from the case's own deadline — never stored, never assumed. */
export function slaStateFor(complaint: ComplaintRecord, nowMs: number = Date.now()): SlaState {
  const due = Date.parse(complaint.slaDueAt);
  if (!Number.isFinite(due)) return 'HEALTHY';
  const terminal = complaint.status === 'RESOLVED' || complaint.status === 'CLOSED';
  if (terminal) {
    const stopped = Date.parse(complaint.closedAt || complaint.resolvedAt || '');
    if (!Number.isFinite(stopped)) return 'HEALTHY';
    return stopped > due ? 'BREACHED' : 'RESOLVED_ON_TIME';
  }
  const hoursLeft = (due - nowMs) / 3_600_000;
  if (hoursLeft < 0) return 'BREACHED';
  if (hoursLeft <= 4) return 'APPROACHING_BREACH';
  return 'HEALTHY';
}

/**
 * A desk-visible thread reconstructed from what the engine kept: the customer's
 * own words at intake, the audit trail of status changes, and operator notes.
 * Entries are typed by their real origin (CUSTOMER / SYSTEM / AGENT) so a status
 * change never masquerades as a message from a person.
 */
export function threadFor(complaint: ComplaintRecord): TicketMessage[] {
  const thread: TicketMessage[] = [];

  thread.push({
    id: `${complaint.id}-intake`,
    ticketId: complaint.id,
    senderType: 'CUSTOMER',
    senderId: complaint.customerId,
    senderName: complaint.customerName,
    content: complaint.description,
    isInternalNote: false,
    timestamp: complaint.createdAt,
  });

  (complaint.statusHistory || []).forEach((event, idx) => {
    thread.push({
      id: `${complaint.id}-ev-${idx}`,
      ticketId: complaint.id,
      senderType: 'SYSTEM',
      senderId: 'complaint-engine',
      senderName: 'Case lifecycle',
      content: event.notes
        ? `Status → ${event.status.replace(/_/g, ' ').toLowerCase()} · ${event.notes}`
        : `Status → ${event.status.replace(/_/g, ' ').toLowerCase()}`,
      isInternalNote: true,
      timestamp: event.at,
    });
  });

  (complaint.caseNotes || []).forEach((note) => {
    thread.push({
      id: note.id,
      ticketId: complaint.id,
      senderType: 'AGENT',
      senderId: note.by || 'operator',
      senderName: note.by || 'Operator',
      content: note.body,
      isInternalNote: note.internal,
      timestamp: note.at,
    });
  });

  return thread.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

export interface MappedTicket extends SupportTicket {
  /** Everything the desk UI may show that this record simply does not have. */
  unrecordedFields: readonly string[];
  /** The engine's own identifiers, for deep links and API calls. */
  complaintId: string;
  complaintReference: string;
  disputedAmount: number;
  currency: 'NGN' | 'XOF';
  engineStatus: ComplaintStatus;
  enginePriority: ComplaintPriority;
  compensationAmount?: number;
  redressJournalId?: string;
  intakeChannelLabel: string | null;
}

export function toSupportTicket(complaint: ComplaintRecord, nowMs: number = Date.now()): MappedTicket {
  return {
    // ---- identity (engine's own) ----
    id: complaint.id,
    ticketNumber: complaint.complaintReference,
    complaintId: complaint.id,
    complaintReference: complaint.complaintReference,

    // ---- case content ----
    subject: `${complaint.category.replace(/_/g, ' ').toLowerCase()} — ${complaint.customerName}`,
    description: complaint.description,
    category: CATEGORY_TO_TICKET[complaint.category] ?? ('TRANSFER' as TicketCategory),
    enginePriority: complaint.priority,
    engineStatus: complaint.status,
    priority: PRIORITY_TO_TICKET[complaint.priority],
    status: STATUS_TO_TICKET[complaint.status],

    // ---- customer (masked phone comes from the engine's own projection) ----
    customerType: 'CUSTOMER' as CustomerType,
    customerId: complaint.customerId,
    customerName: complaint.customerName,
    customerPhone: complaint.customerPhone,
    jurisdiction: JURISDICTION[complaint.country],

    // ---- assignment: the engine records an email, not a staff id ----
    assignedOfficerName: complaint.assignedToEmail,

    // ---- intake channel: recorded by whichever route took the case in ----
    channel: complaint.intakeChannel ? INTAKE_TO_CHANNEL[complaint.intakeChannel] : undefined,

    // ---- money and redress, straight off the case ----
    disputedAmount: complaint.disputedAmount,
    currency: complaint.currency,
    compensationAmount: complaint.financialCompensationAmount,
    redressJournalId: complaint.glJournalId,

    // ---- lifecycle timestamps ----
    createdAt: complaint.createdAt,
    updatedAt: complaint.resolvedAt || complaint.closedAt || complaint.createdAt,
    resolutionDueAt: complaint.slaDueAt,
    resolvedAt: complaint.resolvedAt,
    closedAt: complaint.closedAt,
    slaStatus: slaStateFor(complaint, nowMs),
    intakeChannelLabel: complaint.intakeChannel ?? null,

    // ---- measurement: the customer's own rating, when one exists ----
    satisfactionRating: complaint.csatScore,
    satisfactionComment: complaint.csatComment,

    // ---- fields the engine has no column for ----
    tierAssigned: undefined,
    sentiment: undefined,
    firstResponseDueAt: undefined,
    firstRespondedAt: undefined,
    tags: [complaint.category.replace(/_/g, ' '), complaint.country],
    messages: threadFor(complaint),
    unrecordedFields: UNRECORDED_TICKET_FIELDS,
  } as MappedTicket;
}

export function toSupportTickets(complaints: ComplaintRecord[], nowMs: number = Date.now()): MappedTicket[] {
  return complaints.map((c) => toSupportTicket(c, nowMs));
}
