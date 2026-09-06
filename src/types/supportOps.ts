// =============================================================================
// File: src/types/supportOps.ts
// Description: KoriePay Support Operating System — operational entities
//
// These types extend (never fork) src/types/support.ts. The Support Portal is
// a service layer: every entity here either wraps an authoritative engine
// record (customer, transaction, ledger, recovery case) or is a support-domain
// record (ticket, message, event, dispute, escalation, task, knowledge,
// macro, CSAT, notification, audit). Support never mutates financial state.
// =============================================================================

import {
  SupportJurisdiction,
  SupportTier,
  SupportRole,
  TicketCategory,
  TicketPriority,
  CustomerType,
  SupportChannel,
} from "./support";

/* ---------------------------------------------------------------- SLA (§08) */

export type SupportSlaState =
  | "ON_TRACK"
  | "AT_RISK"
  | "BREACHED"
  | "PAUSED"
  | "MET"
  | "BREACHED_LATE";

export interface SlaPolicySpec {
  firstResponseMinutes: number;
  resolutionHours: number;
}

export const SUPPORT_SLA_POLICY: Record<TicketPriority, SlaPolicySpec> = {
  CRITICAL: { firstResponseMinutes: 15, resolutionHours: 4 },
  URGENT: { firstResponseMinutes: 30, resolutionHours: 8 },
  HIGH: { firstResponseMinutes: 60, resolutionHours: 24 },
  NORMAL: { firstResponseMinutes: 240, resolutionHours: 72 },
  LOW: { firstResponseMinutes: 480, resolutionHours: 96 },
};

export interface TicketSlaSnapshot {
  state: SupportSlaState;
  firstResponseState: SupportSlaState;
  resolutionState: SupportSlaState;
  /** Effective age of the resolution clock (ms), excluding paused time. */
  effectiveAgeMs: number;
  /** Remaining ms on the resolution clock (0 when breached/paused). */
  remainingMs: number;
  /** Cumulative paused ms (WAITING_FOR_CUSTOMER windows). */
  pausedMs: number;
  firstResponseDueAt: string;
  resolutionDueAt: string;
}

/* ------------------------------------------------- ticket events (§51) */

export type SupportEventType =
  | "TICKET_CREATED"
  | "TICKET_TRIAGED"
  | "TICKET_ASSIGNED"
  | "TICKET_REASSIGNED"
  | "PRIORITY_CHANGED"
  | "STATUS_CHANGED"
  | "CUSTOMER_REPLIED"
  | "AGENT_REPLIED"
  | "INTERNAL_NOTE_ADDED"
  | "TICKET_ESCALATED"
  | "TICKET_RESOLVED"
  | "TICKET_REOPENED"
  | "TICKET_CLOSED"
  | "SLA_WARNING"
  | "SLA_BREACHED"
  | "DISPUTE_LINKED"
  | "DISPUTE_CREATED"
  | "REFUND_REQUESTED"
  | "CSAT_SUBMITTED"
  | "CUSTOMER_360_VIEWED"
  | "PII_UNMASKED"
  | "PROVIDER_TRACE_VIEWED";

export interface SupportEvent {
  id: string;
  ticketId?: string;
  type: SupportEventType;
  actorId: string;
  actorName: string;
  actorRole: SupportRole | "SYSTEM" | "CUSTOMER" | "AUTOMATION";
  fromStatus?: string;
  toStatus?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  requestId?: string;
}

/* ------------------------------------------------- disputes (§28–§31) */

export type DisputeCategory =
  | "UNAUTHORIZED"
  | "DUPLICATE"
  | "INCORRECT_AMOUNT"
  | "FAILED_TRANSACTION"
  | "CHARGED_NOT_RECEIVED"
  | "REFUND"
  | "REVERSAL"
  | "OTHER";

export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "REQUESTED_INFORMATION"
  | "ESCALATED"
  | "DECISION"
  | "RESOLVED"
  | "CLOSED";

export type DisputeDecisionType =
  | "REFUND_APPROVED"
  | "REVERSAL_APPROVED"
  | "REJECTED"
  | "PARTIAL_REFUND"
  | "UNDER_INVESTIGATION";

export interface SupportDispute {
  id: string;
  disputeNumber: string;
  category: DisputeCategory;
  status: DisputeStatus;
  priority: TicketPriority;
  /** Support ticket this dispute was opened from (if any). */
  ticketId?: string;
  /** Authoritative KoriePay transaction reference under dispute. */
  transactionReference: string;
  customerId: string;
  customerName: string;
  jurisdiction: SupportJurisdiction;
  claim: string;
  claimAmount: number;
  currency: "NGN" | "XOF";
  evidence: { name: string; type: string; sizeMasked: string; uploadedAt: string }[];
  createdByOfficerId: string;
  createdByOfficerName: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  /** Authority that must decide (support can never self-adjudicate money). */
  decisionOwner: "TIER_3_FRAUD" | "TIER_3_COMPLIANCE" | "TIER_3_FINANCE" | "SUPPORT_MANAGER";
  decision?: {
    type: DisputeDecisionType;
    decidedBy: string;
    decidedByRole: SupportRole;
    reason: string;
    decidedAt: string;
  };
  /**
   * When a financial action was approved, the authoritative recovery case
   * created in DisputeChargebackEngine (the balance is touched ONLY there).
   */
  recoveryCaseReference?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  timeline: { label: string; detail?: string; at: string; by?: string }[];
}

/* --------------------------------------------- escalations (§35–§36) */

export type EscalationDestination =
  | "COMPLIANCE"
  | "FRAUD_RISK"
  | "ENGINEERING"
  | "BANKING_OPS"
  | "FINANCE"
  | "SETTLEMENT"
  | "MANAGEMENT";

export type EscalationStatus = "PENDING" | "IN_REVIEW" | "ACTIONED" | "RESOLVED";

export interface SupportEscalation {
  id: string;
  escalationNumber: string;
  ticketId: string;
  customerName: string;
  reason: string;
  priority: TicketPriority;
  destination: EscalationDestination;
  assignedToName?: string;
  status: EscalationStatus;
  slaDueAt: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

/* ---------------------------------------------------------------- tasks */

export type SupportTaskStatus = "OPEN" | "IN_PROGRESS" | "DONE";

export interface SupportTask {
  id: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  ticketId?: string;
  customerId?: string;
  assignedToId?: string;
  assignedToName?: string;
  dueAt: string;
  status: SupportTaskStatus;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------------------------------- knowledge */

export interface KnowledgeArticleBody {
  title: string;
  problem: string;
  symptoms: string[];
  resolution: string;
  escalationCondition: string;
}

/** Proper per-language localization structure (spec §43). */
export type ArticleLanguage = "en" | "fr" | "ha";

export interface KnowledgeArticleV2 {
  id: string;
  category: TicketCategory;
  audience: "CUSTOMER_FACING" | "INTERNAL_OFFICER" | "AGENT_OPERATOR" | "MERCHANT_SUPPORT";
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  version: string;
  updatedAt: string;
  author: string;
  tags: string[];
  helpfulCount: number;
  body: Record<ArticleLanguage, KnowledgeArticleBody>;
}

/* ------------------------------------------------------------- macros */

export interface SupportMacro {
  id: string;
  key: string;
  name: string;
  category: TicketCategory | "GENERAL";
  /**
   * Templates the customer actually receives. Variables are substituted with
   * server-side values only (never internal notes, never secrets — §45).
   */
  body: Record<ArticleLanguage, string>;
  variables?: string[];
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
}

/* --------------------------------------------------------------- CSAT */

export interface SupportCsatRecord {
  id: string;
  ticketId: string;
  customerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  language: ArticleLanguage;
  submittedAt: string;
}

/* ---------------------------------------------- notifications (§94) */

export type SupportNotificationType =
  | "NEW_TICKET"
  | "TICKET_ASSIGNED"
  | "CUSTOMER_REPLY"
  | "SLA_WARNING"
  | "SLA_BREACH"
  | "ESCALATION"
  | "DISPUTE_UPDATE"
  | "SYSTEM_ISSUE";

export interface SupportNotification {
  id: string;
  type: SupportNotificationType;
  title: string;
  body: string;
  ticketId?: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

/* --------------------------------------------------- service health */

export interface SupportServiceHealthItem {
  key: string;
  label: string;
  status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
  detail: string;
  checkedAt: string;
}

/* ------------------------------------------------------------- search */

export interface SupportSearchResult {
  kind: "CUSTOMER" | "TICKET" | "TRANSACTION" | "DISPUTE" | "ESCALATION" | "KNOWLEDGE";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/* ------------------------------------------------------- API payloads */

export interface SupportOverviewPayload {
  kpis: {
    openTickets: number;
    critical: number;
    slaAtRisk: number;
    waitingForCustomer: number;
    unassigned: number;
    resolvedToday: number;
  };
  attention: {
    criticalTickets: number;
    slaBreachedOrAtRisk: number;
    fraudEscalations: number;
    transactionDisputes: number;
    bankingIssues: number;
  };
  trend: {
    range: "24H" | "7D" | "30D" | "90D";
    created: number[];
    resolved: number[];
    reopened: number[];
    avgResolutionHours: number;
    labels: string[];
  };
  categories: { key: TicketCategory; label: string; count: number }[];
  serviceHealth: SupportServiceHealthItem[];
  recentActivity: SupportEvent[];
}
