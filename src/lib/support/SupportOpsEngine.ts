// =============================================================================
// File: src/lib/support/SupportOpsEngine.ts
// Description: KoriePay Support Operating System — the operational brain.
//
// EVERY support mutation flows through this engine (spec §02/§04/§67):
//   • lifecycle is a validated state machine — no arbitrary status writes;
//   • SLA is computed from backend timestamps (pause/resume aware) — never
//     hardcoded or client-supplied;
//   • assignment is least-loaded + language + skill + jurisdiction aware;
//   • duplicates are detected before creation (surfaced, not auto-blocked);
//   • every meaningful change appends an immutable SupportEvent (§51);
//   • sensitive operations append a SupportAuditEntry + global AuditService
//     record (§52/§90);
//   • financial decisions create recovery cases in DisputeChargebackEngine —
//     Support NEVER touches balances directly (§31).
// =============================================================================

import {
  SupportTicket,
  SupportOfficer,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketMessage,
  SupportRole,
  CustomerType,
  SupportChannel,
  SupportJurisdiction,
} from "@/types/support";
import { HealthCheckEngine } from "@/lib/resilience/HealthCheckEngine";
import {
  SUPPORT_SLA_POLICY,
  SupportSlaState,
  TicketSlaSnapshot,
  SupportEvent,
  SupportEventType,
  SupportDispute,
  DisputeCategory,
  DisputeDecisionType,
  SupportEscalation,
  EscalationDestination,
  SupportTask,
  SupportCsatRecord,
  SupportNotification,
  SupportOverviewPayload,
  ArticleLanguage,
} from "@/types/supportOps";
import { SupportOpsStore } from "./SupportOpsStore";
import { hasCapability, allowedEscalationDestinations, roleRank } from "./SupportPermissions";
import { DisputeChargebackEngine } from "@/lib/recovery/DisputeChargebackEngine";

/* ------------------------------------------------------------ actor */

export interface SupportActor {
  officerId: string;
  name: string;
  role: SupportRole;
  requestId?: string;
}

export interface EngineResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/* ---------------------------------------------------- lifecycle table */

const LIFECYCLE: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["TRIAGED", "ASSIGNED", "IN_PROGRESS"],
  TRIAGED: ["ASSIGNED", "IN_PROGRESS"],
  ASSIGNED: ["IN_PROGRESS", "ESCALATED"],
  IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "WAITING_FOR_INTERNAL_TEAM", "ESCALATED", "RESOLVED"],
  WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "ESCALATED", "RESOLVED"],
  WAITING_FOR_INTERNAL_TEAM: ["IN_PROGRESS", "ESCALATED", "RESOLVED"],
  ESCALATED: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS"],
  CLOSED: [],
};

const CAPABILITY_FOR_TARGET: Partial<Record<TicketStatus, string>> = {
  TRIAGED: "triage_ticket",
  ASSIGNED: "assign_ticket",
  IN_PROGRESS: "start_progress",
  WAITING_FOR_CUSTOMER: "wait_customer",
  WAITING_FOR_INTERNAL_TEAM: "wait_internal",
  ESCALATED: "escalate_ticket",
  RESOLVED: "resolve_ticket",
  CLOSED: "close_ticket",
  REOPENED: "reopen_ticket",
};

const EVENT_FOR_TARGET: Partial<Record<TicketStatus, SupportEventType>> = {
  TRIAGED: "TICKET_TRIAGED",
  ASSIGNED: "TICKET_ASSIGNED",
  RESOLVED: "TICKET_RESOLVED",
  CLOSED: "TICKET_CLOSED",
  REOPENED: "TICKET_REOPENED",
};

const AUTO_CLOSE_MS = 72 * 3600e3; // resolved → closed after 72h (sweep)

/* ------------------------------------------------------- SLA tracking */

interface PauseTracking {
  accumulatedMs: number;
  pauseStartedAt?: string;
}

/* --------------------------------------------------------- the engine */

export class SupportOpsEngine {
  // Same globalThis pin as SupportOpsStore (dev-mode module forks otherwise
  // split the SLA pause bookkeeping from the tickets it tracks).
  private static instance: SupportOpsEngine | undefined;
  private store: SupportOpsStore;
  private pauseTracking: Map<string, PauseTracking> = new Map();
  private slaEventsFired: Map<string, Set<string>> = new Map(); // ticketId -> fired SLA event types

  private constructor() {
    this.store = SupportOpsStore.getInstance();
  }

  static getInstance(): SupportOpsEngine {
    const ref = globalThis as { __korieSupportEngine?: SupportOpsEngine };
    if (!SupportOpsEngine.instance) {
      SupportOpsEngine.instance = ref.__korieSupportEngine ?? new SupportOpsEngine();
      ref.__korieSupportEngine = SupportOpsEngine.instance;
    }
    return SupportOpsEngine.instance;
  }

  getStore(): SupportOpsStore {
    return this.store;
  }

  /* ================================================================ SLA */

  private trackPause(ticket: SupportTicket, now: number): PauseTracking {
    let t = this.pauseTracking.get(ticket.id);
    if (!t) {
      // Seed/bootstrap: assume the ticket entered its current state at updatedAt.
      t = {
        accumulatedMs: 0,
        pauseStartedAt:
          ticket.status === "WAITING_FOR_CUSTOMER" ? ticket.updatedAt : undefined,
      };
      this.pauseTracking.set(ticket.id, t);
    }
    return t;
  }

  private enterPause(ticketId: string, atIso: string): void {
    const t = this.pauseTracking.get(ticketId) ?? { accumulatedMs: 0 };
    t.pauseStartedAt = atIso;
    this.pauseTracking.set(ticketId, t);
  }

  private exitPause(ticketId: string, atIso: string): void {
    const t = this.pauseTracking.get(ticketId);
    if (t?.pauseStartedAt) {
      t.accumulatedMs += Math.max(0, new Date(atIso).getTime() - new Date(t.pauseStartedAt).getTime());
      t.pauseStartedAt = undefined;
    }
    this.pauseTracking.set(ticketId, t ?? { accumulatedMs: 0 });
  }

  /**
   * SLA snapshot derived from backend timestamps (spec §08). Called on every
   * read — nothing is cached or hardcoded.
   */
  computeSla(ticket: SupportTicket, nowMs: number = Date.now()): TicketSlaSnapshot {
    const spec = SUPPORT_SLA_POLICY[ticket.priority];
    const created = new Date(ticket.createdAt).getTime();
    const resolutionBudget = spec.resolutionHours * 3600e3;
    const firstBudget = spec.firstResponseMinutes * 60e3;
    const t = this.trackPause(ticket, nowMs);
    const pausedNow =
      t.accumulatedMs +
      (ticket.status === "WAITING_FOR_CUSTOMER" && t.pauseStartedAt
        ? Math.max(0, nowMs - new Date(t.pauseStartedAt).getTime())
        : 0);

    const resolvedAtMs = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : undefined;
    const endMs = resolvedAtMs ?? nowMs;
    const effectiveAgeMs = Math.max(0, endMs - created - (resolvedAtMs ? Math.min(pausedNow, endMs - created) : pausedNow));

    // First-response component
    let firstResponseState: SupportSlaState;
    if (ticket.firstRespondedAt) {
      const respondedMs = new Date(ticket.firstRespondedAt).getTime() - created;
      firstResponseState = respondedMs <= firstBudget ? "MET" : "BREACHED_LATE";
    } else {
      const remainingFirst = new Date(ticket.firstResponseDueAt).getTime() - nowMs;
      firstResponseState =
        remainingFirst < 0 ? "BREACHED" : remainingFirst < firstBudget * 0.25 ? "AT_RISK" : "ON_TRACK";
    }

    // Resolution component
    let resolutionState: SupportSlaState;
    if (ticket.resolvedAt) {
      resolutionState =
        effectiveAgeMs <= resolutionBudget ? "MET" : "BREACHED_LATE";
    } else if (ticket.status === "WAITING_FOR_CUSTOMER") {
      resolutionState = "PAUSED";
    } else if (effectiveAgeMs > resolutionBudget) {
      resolutionState = "BREACHED";
    } else {
      const remaining = resolutionBudget - effectiveAgeMs;
      resolutionState = remaining < resolutionBudget * 0.25 ? "AT_RISK" : "ON_TRACK";
    }

    const rank: Record<SupportSlaState, number> = {
      BREACHED: 4, AT_RISK: 3, PAUSED: 2, BREACHED_LATE: 1, MET: 1, ON_TRACK: 0,
    };
    let state: SupportSlaState;
    if (ticket.resolvedAt) {
      state = resolutionState; // MET | BREACHED_LATE
    } else {
      state = rank[firstResponseState] >= rank[resolutionState] ? firstResponseState : resolutionState;
      // PAUSED (waiting) is only shown when resolution itself is healthy
      if (ticket.status === "WAITING_FOR_CUSTOMER" && (state === "ON_TRACK" || state === "AT_RISK")) {
        state = "PAUSED";
      }
    }

    // Remaining on the EFFECTIVE clock (pause-aware)
    const effectiveRemainingMs = ticket.resolvedAt ? 0 : Math.max(0, resolutionBudget - effectiveAgeMs);

    return {
      state,
      firstResponseState,
      resolutionState,
      effectiveAgeMs,
      remainingMs: effectiveRemainingMs,
      pausedMs: pausedNow,
      firstResponseDueAt: ticket.firstResponseDueAt,
      resolutionDueAt: ticket.resolutionDueAt,
    };
  }

  /** Fire SLA warning/breach events exactly once per ticket per state. */
  private sweepSlaEvents(ticket: SupportTicket, snapshot: TicketSlaSnapshot): void {
    const fired = this.slaEventsFired.get(ticket.id) ?? new Set<string>();
    const fire = (type: SupportEventType, payload: Record<string, unknown>) => {
      if (fired.has(type)) return;
      fired.add(type);
      this.store.addEvent({
        id: this.store.nextEventId(),
        ticketId: ticket.id,
        type,
        actorId: "SLA-ENGINE",
        actorName: "SLA Engine",
        actorRole: "SYSTEM",
        payload,
        createdAt: new Date().toISOString(),
      });
      if (type === "SLA_BREACHED") {
        this.store.addNotification({
          id: `NTF-${Date.now().toString(36)}`,
          type: "SLA_BREACH",
          title: `SLA breached: ${ticket.ticketNumber}`,
          body: `${ticket.priority} ticket "${ticket.subject}" has breached its ${SUPPORT_SLA_POLICY[ticket.priority].resolutionHours}h resolution SLA.`,
          ticketId: ticket.id,
          href: `/support/tickets/${ticket.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } else if (type === "SLA_WARNING") {
        this.store.addNotification({
          id: `NTF-${Date.now().toString(36)}`,
          type: "SLA_WARNING",
          title: `SLA at risk: ${ticket.ticketNumber}`,
          body: `${ticket.priority} ticket "${ticket.subject}" is within 25% of its resolution SLA.`,
          ticketId: ticket.id,
          href: `/support/tickets/${ticket.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    };
    if (snapshot.resolutionState === "BREACHED" || snapshot.firstResponseState === "BREACHED") {
      fire("SLA_BREACHED", { component: snapshot.resolutionState === "BREACHED" ? "resolution" : "first_response" });
    } else if (snapshot.state === "AT_RISK") {
      fire("SLA_WARNING", { state: "AT_RISK", remainingMinutes: Math.round(snapshot.remainingMs / 60e3) });
    }
    this.slaEventsFired.set(ticket.id, fired);
  }

  /** Idempotent sweep: auto-close tickets resolved more than 72h ago. */
  sweepAutoClose(): void {
    const now = Date.now();
    for (const t of this.store.tickets) {
      if (t.status === "RESOLVED" && t.resolvedAt && now - new Date(t.resolvedAt).getTime() > AUTO_CLOSE_MS && !t.closedAt) {
        t.status = "CLOSED";
        t.closedAt = t.closedAt ?? new Date().toISOString();
        t.updatedAt = t.closedAt;
        this.store.addEvent({
          id: this.store.nextEventId(),
          ticketId: t.id,
          type: "TICKET_CLOSED",
          actorId: "SLA-ENGINE",
          actorName: "Auto-close policy",
          actorRole: "SYSTEM",
          fromStatus: "RESOLVED",
          toStatus: "CLOSED",
          payload: { policy: "RESOLVED_72H" },
          createdAt: t.closedAt,
        });
      }
    }
  }

  /* ========================================================= lifecycle */

  allowedTransitions(status: TicketStatus): TicketStatus[] {
    return [...(LIFECYCLE[status] ?? [])];
  }

  canTransition(from: TicketStatus, to: TicketStatus): boolean {
    return (LIFECYCLE[from] ?? []).includes(to);
  }

  transition(
    ticketId: string,
    to: TicketStatus,
    actor: SupportActor,
    opts: { reason?: string; rootCause?: string } = {},
  ): EngineResult<SupportTicket> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };

    const cap = CAPABILITY_FOR_TARGET[to];
    if (cap && !hasCapability(actor.role, cap as never)) {
      return { ok: false, code: "FORBIDDEN", error: `Role ${actor.role} cannot move tickets to ${to}.` };
    }
    if (!this.canTransition(ticket.status, to)) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        error: `Illegal transition ${ticket.status} → ${to}. Allowed: ${this.allowedTransitions(ticket.status).join(", ") || "none"}.`,
      };
    }

    const now = new Date().toISOString();
    const fromStatus = ticket.status;
    const updates: Partial<SupportTicket> = { status: to };
    if (to === "RESOLVED") {
      updates.resolvedAt = now;
      if (opts.rootCause) updates.rootCauseCategory = opts.rootCause;
    }
    if (to === "CLOSED") updates.closedAt = now;
    if (to === "REOPENED") {
      updates.resolvedAt = undefined;
      updates.closedAt = undefined;
      updates.sentiment = "NEUTRAL";
    }

    // Pause accounting for the resolution clock
    if (to === "WAITING_FOR_CUSTOMER" && fromStatus !== "WAITING_FOR_CUSTOMER") this.enterPause(ticket.id, now);
    if (fromStatus === "WAITING_FOR_CUSTOMER" && to !== "WAITING_FOR_CUSTOMER") this.exitPause(ticket.id, now);

    const updated = this.store.updateTicket(ticket.id, updates);
    if (!updated) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket vanished during transition." };

    this.store.addEvent({
      id: this.store.nextEventId(),
      ticketId: updated.id,
      type: EVENT_FOR_TARGET[to] ?? "STATUS_CHANGED",
      actorId: actor.officerId,
      actorName: actor.name,
      actorRole: actor.role,
      fromStatus,
      toStatus: to,
      payload: { reason: opts.reason, rootCause: opts.rootCause },
      createdAt: now,
      requestId: actor.requestId,
    });

    const sensitive = ["RESOLVED", "CLOSED", "REOPENED", "ESCALATED"].includes(to);
    if (sensitive) {
      this.store.addAudit({
        id: `AUD-SUP-${Date.now().toString(36).toUpperCase()}`,
        timestamp: now,
        officerId: actor.officerId,
        officerName: actor.name,
        officerRole: actor.role,
        action: `TICKET_${to}`,
        entityType: "SUPPORT_TICKET",
        entityId: updated.id,
        details: `Transition ${fromStatus} → ${to}${opts.reason ? ` — ${opts.reason}` : ""}`,
        jurisdiction: updated.jurisdiction,
      });
    }

    const snapshot = this.computeSla(updated);
    this.sweepSlaEvents(updated, snapshot);
    return { ok: true, data: updated };
  }

  /* ========================================================== tickets */

  findDuplicates(candidate: { customerId: string; category: TicketCategory; relatedTransactionId?: string; createdAt: string }): SupportTicket[] {
    const created = new Date(candidate.createdAt).getTime();
    return this.store.tickets.filter((t) => {
      if (!this.store.isTicketOpen(t)) return false;
      if (t.customerId !== candidate.customerId) return false;
      const ageDays = (created - new Date(t.createdAt).getTime()) / (24 * 3600e3);
      if (ageDays < 0 || ageDays > 3) return false;
      if (candidate.relatedTransactionId && t.relatedTransactionId === candidate.relatedTransactionId) return true;
      return t.category === candidate.category;
    });
  }

  createTicket(
    params: {
      customerName: string;
      customerId: string;
      subject: string;
      description: string;
      category: TicketCategory;
      priority?: TicketPriority;
      customerType?: CustomerType;
      customerEmail?: string;
      customerPhone?: string;
      jurisdiction?: SupportJurisdiction;
      channel?: SupportChannel;
      language?: ArticleLanguage;
      relatedTransactionId?: string;
      tags?: string[];
    },
    actor: SupportActor,
    idempotencyKey?: string,
  ): EngineResult<{ ticket: SupportTicket; duplicates: SupportTicket[]; autoAssignedTo?: string; cached?: boolean }> {
    if (idempotencyKey) {
      const cached = this.store.idempotencyHit(idempotencyKey);
      if (cached) {
        return {
          ok: true,
          data: {
            ...(cached as { ticket: SupportTicket; duplicates: SupportTicket[]; autoAssignedTo?: string }),
            cached: true,
          },
        };
      }
    }

    if (!params.customerName || !params.customerId || !params.subject || !params.description) {
      return { ok: false, code: "VALIDATION_FAILED", error: "customerName, customerId, subject and description are required." };
    }
    const priority: TicketPriority = params.priority ?? "NORMAL";
    if (!Object.keys(SUPPORT_SLA_POLICY).includes(priority)) {
      return { ok: false, code: "VALIDATION_FAILED", error: `Unknown priority: ${priority}` };
    }

    const now = new Date().toISOString();
    const spec = SUPPORT_SLA_POLICY[priority];
    const ids = this.store.nextTicketId();
    const candidate = {
      customerId: params.customerId,
      category: params.category,
      relatedTransactionId: params.relatedTransactionId,
      createdAt: now,
    };
    const duplicates = this.findDuplicates(candidate);

    const ticket: SupportTicket = {
      id: ids.id,
      ticketNumber: ids.ticketNumber,
      subject: params.subject,
      description: params.description,
      category: params.category,
      priority,
      status: "NEW",
      customerType: params.customerType ?? "CUSTOMER",
      customerId: params.customerId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      jurisdiction: params.jurisdiction ?? "NG",
      channel: params.channel ?? "IN_APP",
      language: params.language ?? "en",
      tierAssigned: "TIER_0_AUTOMATION",
      relatedTransactionId: params.relatedTransactionId,
      createdAt: now,
      updatedAt: now,
      firstResponseDueAt: new Date(Date.now() + spec.firstResponseMinutes * 60e3).toISOString(),
      resolutionDueAt: new Date(Date.now() + spec.resolutionHours * 3600e3).toISOString(),
      slaStatus: "HEALTHY",
      tags: params.tags ?? [],
      sentiment: "NEUTRAL",
      messages: [
        {
          id: `MSG-${Date.now().toString(36)}`,
          ticketId: ids.id,
          senderType: "CUSTOMER",
          senderId: params.customerId,
          senderName: params.customerName,
          content: params.description,
          isInternalNote: false,
          timestamp: now,
        },
      ],
    };

    // Round-robin / least-loaded auto-assignment (spec §39) when a qualified
    // officer exists; otherwise the ticket waits in the NEW queue.
    const assignee = this.pickAutoAssignee(ticket);
    if (assignee) {
      ticket.assignedOfficerId = assignee.id;
      ticket.assignedOfficerName = assignee.fullName;
      ticket.tierAssigned = assignee.tier;
      ticket.status = "ASSIGNED";
      assignee.activeTicketCount += 1;
    }

    const saved = this.store.addTicket(ticket);
    this.store.addEvent({
      id: this.store.nextEventId(),
      ticketId: saved.id,
      type: "TICKET_CREATED",
      actorId: actor.officerId,
      actorName: actor.name,
      actorRole: actor.role,
      payload: { priority, duplicates: duplicates.length, autoAssignedTo: assignee?.id },
      createdAt: now,
      requestId: actor.requestId,
    });
    this.store.addNotification({
      id: `NTF-${Date.now().toString(36)}`,
      type: "NEW_TICKET",
      title: `New ${priority.toLowerCase()} ticket: ${saved.ticketNumber}`,
      body: `${saved.customerName}: ${saved.subject}`,
      ticketId: saved.id,
      href: `/support/tickets/${saved.id}`,
      read: false,
      createdAt: now,
    });

    const result = {
      ticket: saved,
      duplicates,
      autoAssignedTo: assignee?.id,
      cached: false,
    };
    if (idempotencyKey) this.store.idempotencyStore(idempotencyKey, result);
    return { ok: true, data: result };
  }

  /** Least-loaded + language + jurisdiction + category-tier aware (spec §39). */
  pickAutoAssignee(ticket: SupportTicket): SupportOfficer | null {
    const online = this.store.officers.filter(
      (o) => o.status === "ONLINE" && o.maxCapacity > 0 && o.activeTicketCount < o.maxCapacity,
    );
    if (!online.length) return null;

    let pool = online.filter((o) => o.languages.includes(ticket.language));
    if (!pool.length) pool = online;
    pool = pool.filter((o) => o.jurisdiction === ticket.jurisdiction || o.jurisdiction === "CROSS_BORDER");
    if (!pool.length) pool = online;

    const ranked = (r: SupportRole) => roleRank(r);
    let eligible = pool;
    if (ticket.priority === "CRITICAL") {
      const strong = pool.filter((o) => ranked(o.role) >= 2);
      if (strong.length) eligible = strong;
    } else if (ticket.category === "FRAUD_SECURITY") {
      const strong = pool.filter((o) => o.role === "TIER_3_FRAUD" || ranked(o.role) >= 2);
      if (strong.length) eligible = strong;
    } else if (ticket.category === "MERCHANT_SETTLEMENT") {
      const strong = pool.filter((o) => o.role === "TIER_3_FINANCE" || ranked(o.role) >= 2);
      if (strong.length) eligible = strong;
    } else {
      const juniors = pool.filter((o) => ranked(o.role) === 1);
      if (juniors.length) eligible = juniors;
    }

    const sorted = [...eligible].sort(
      (a, b) => a.activeTicketCount / a.maxCapacity - b.activeTicketCount / b.maxCapacity,
    );
    return sorted[0] ?? null;
  }

  assignTicket(
    ticketId: string,
    officerId: string,
    actor: SupportActor,
  ): EngineResult<SupportTicket> {
    if (!hasCapability(actor.role, "assign_ticket")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot assign tickets." };
    }
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };
    const officer = this.store.getOfficer(officerId);
    if (!officer) return { ok: false, code: "OFFICER_NOT_FOUND", error: "Officer not found." };

    const prev = ticket.assignedOfficerId ? this.store.getOfficer(ticket.assignedOfficerId) : undefined;
    if (prev && prev.id !== officer.id) prev.activeTicketCount = Math.max(0, prev.activeTicketCount - 1);
    officer.activeTicketCount += 1;

    const wasUnassigned = !ticket.assignedOfficerId;
    ticket.assignedOfficerId = officer.id;
    ticket.assignedOfficerName = officer.fullName;
    ticket.tierAssigned = officer.tier;
    const updated = this.store.updateTicket(ticket.id, {});
    this.store.addEvent({
      id: this.store.nextEventId(),
      ticketId: ticket.id,
      type: wasUnassigned ? "TICKET_ASSIGNED" : "TICKET_REASSIGNED",
      actorId: actor.officerId,
      actorName: actor.name,
      actorRole: actor.role,
      fromStatus: ticket.status,
      toStatus: ticket.status,
      payload: { toOfficer: officer.id, toOfficerName: officer.fullName },
      createdAt: new Date().toISOString(),
      requestId: actor.requestId,
    });
    return { ok: true, data: updated! };
  }

  changePriority(ticketId: string, priority: TicketPriority, actor: SupportActor): EngineResult<SupportTicket> {
    if (!hasCapability(actor.role, "change_priority")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot change ticket priority." };
    }
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };
    const from = ticket.priority;
    const updated = this.store.updateTicket(ticket.id, { priority });
    if (updated) {
      this.store.addEvent({
        id: this.store.nextEventId(),
        ticketId: updated.id,
        type: "PRIORITY_CHANGED",
        actorId: actor.officerId,
        actorName: actor.name,
        actorRole: actor.role,
        payload: { from, to: priority },
        createdAt: new Date().toISOString(),
      });
    }
    return { ok: true, data: updated };
  }

  /* ========================================================= messages */

  addMessage(
    ticketId: string,
    params: {
      content: string;
      internal?: boolean;
      macroId?: string;
      senderType?: "AGENT" | "CUSTOMER";
      actor: SupportActor;
    },
    idempotencyKey?: string,
  ): EngineResult<TicketMessage> {
    const { actor } = params;
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };
    // A macro alone is a valid message: its template becomes the content.
    if (!params.macroId && (!params.content || !params.content.trim())) {
      return { ok: false, code: "VALIDATION_FAILED", error: "Message content is required." };
    }
    const isCustomer = params.senderType === "CUSTOMER";
    const cap = isCustomer ? "send_customer_message" : params.internal ? "add_internal_note" : "send_customer_message";
    if (!isCustomer && !hasCapability(actor.role, cap as never)) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot post this message type." };
    }

    if (idempotencyKey) {
      const cached = this.store.idempotencyHit(idempotencyKey);
      if (cached) return { ok: true, data: cached as TicketMessage };
    }

    // Macro substitution — server-side, known values only (spec §45: macros
    // never expose internal notes, secrets or architecture).
    let content = params.content;
    let macroKey: string | undefined;
    if (params.macroId) {
      const macro = this.store.getMacro(params.macroId);
      if (macro && macro.enabled) {
        macroKey = macro.key;
        const lang = ticket.language as ArticleLanguage;
        const template = macro.body[lang] || macro.body.en;
        const trace = ticket.relatedTransactionId
          ? this.store.transactionTraces[ticket.relatedTransactionId]
          : undefined;
        const vars: Record<string, string> = {
          customer_name: ticket.customerName,
          amount: (trace?.amount ?? "").toString(),
          nibss_reference: trace?.providerReference ?? "—",
          reference: trace?.reference ?? "—",
          reversal_window: "24 hours",
          provider_status: trace?.webhookStatus ?? "—",
          review_window: "24–48h",
          response_window: "15 minutes",
        };
        content = template.replace(/\{(\w+)\}/g, (m, k) => (k in vars && vars[k] ? vars[k] : m));
      }
    }

    const now = new Date().toISOString();
    const message: TicketMessage = {
      id: `MSG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      ticketId: ticket.id,
      senderType: isCustomer ? "CUSTOMER" : params.internal ? "AGENT" : "AGENT",
      senderId: isCustomer ? ticket.customerId : actor.officerId,
      senderName: isCustomer ? ticket.customerName : actor.name,
      content,
      isInternalNote: params.internal ?? false,
      timestamp: now,
      macroUsed: macroKey,
    };
    ticket.messages.push(message);
    const updated = this.store.updateTicket(ticket.id, {});

    // Customer reply resumes a paused ticket (spec §06 + SLA pause)
    if (isCustomer && ticket.status === "WAITING_FOR_CUSTOMER") {
      this.exitPause(ticket.id, now);
      updated!.status = "IN_PROGRESS";
      this.store.updateTicket(ticket.id, { status: "IN_PROGRESS" });
    }
    // First response clock
    if (!isCustomer && !ticket.firstRespondedAt) {
      this.store.updateTicket(ticket.id, { firstRespondedAt: now });
    }

    this.store.addEvent({
      id: this.store.nextEventId(),
      ticketId: ticket.id,
      type: isCustomer ? "CUSTOMER_REPLIED" : params.internal ? "INTERNAL_NOTE_ADDED" : "AGENT_REPLIED",
      actorId: message.senderId,
      actorName: message.senderName,
      actorRole: isCustomer ? "CUSTOMER" : actor.role,
      payload: { internal: params.internal ?? false, macro: macroKey },
      createdAt: now,
      requestId: actor.requestId,
    });

    if (isCustomer) {
      this.store.addNotification({
        id: `NTF-${Date.now().toString(36)}`,
        type: "CUSTOMER_REPLY",
        title: `Customer replied: ${ticket.ticketNumber}`,
        body: `${ticket.customerName} replied: ${content.slice(0, 140)}${content.length > 140 ? "…" : ""}`,
        ticketId: ticket.id,
        href: `/support/inbox?ticket=${ticket.id}`,
        read: false,
        createdAt: now,
      });
    }

    const cachedResult = message;
    if (idempotencyKey) this.store.idempotencyStore(idempotencyKey, cachedResult);
    return { ok: true, data: cachedResult };
  }

  /* ========================================================== disputes */

  createDispute(
    params: {
      ticketId?: string;
      category: DisputeCategory;
      transactionReference: string;
      customerId: string;
      customerName: string;
      claim: string;
      claimAmount: number;
      currency: "NGN" | "XOF";
      priority?: TicketPriority;
      jurisdiction?: SupportJurisdiction;
      evidenceName?: string;
    },
    actor: SupportActor,
  ): EngineResult<SupportDispute> {
    if (!hasCapability(actor.role, "create_dispute")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot open disputes." };
    }
    if (!params.transactionReference || !params.claim || params.claimAmount <= 0) {
      return { ok: false, code: "VALIDATION_FAILED", error: "transactionReference, claim and a positive claimAmount are required." };
    }
    const now = new Date().toISOString();
    const ids = this.store.nextDisputeId();
    const priority = params.priority ?? "HIGH";
    const decisionOwner =
      params.category === "UNAUTHORIZED" || params.category === "OTHER"
        ? "TIER_3_FRAUD"
        : params.category === "REFUND" || params.category === "REVERSAL" || params.category === "INCORRECT_AMOUNT"
          ? "TIER_3_FINANCE"
          : "TIER_3_FRAUD";

    const dispute: SupportDispute = {
      id: ids.id,
      disputeNumber: ids.disputeNumber,
      category: params.category,
      status: "OPEN",
      priority,
      ticketId: params.ticketId,
      transactionReference: params.transactionReference,
      customerId: params.customerId,
      customerName: params.customerName,
      jurisdiction: params.jurisdiction ?? "NG",
      claim: params.claim,
      claimAmount: params.claimAmount,
      currency: params.currency,
      evidence: params.evidenceName
        ? [{ name: params.evidenceName, type: "EVIDENCE", sizeMasked: "—", uploadedAt: now }]
        : [],
      createdByOfficerId: actor.officerId,
      createdByOfficerName: actor.name,
      decisionOwner,
      createdAt: now,
      updatedAt: now,
      timeline: [{ label: "Dispute opened", by: actor.name, at: now }],
    };
    if (params.ticketId) {
      const t = this.store.getTicket(params.ticketId);
      if (t) dispute.timeline.push({ label: `Linked to ticket ${t.ticketNumber}`, at: now });
    }

    const saved = this.store.addDispute(dispute);
    this.store.addEvent({
      id: this.store.nextEventId(),
      ticketId: params.ticketId,
      type: "DISPUTE_CREATED",
      actorId: actor.officerId,
      actorName: actor.name,
      actorRole: actor.role,
      payload: { disputeId: saved.id, category: params.category },
      createdAt: now,
    });
    this.store.addAudit({
      id: `AUD-SUP-${Date.now().toString(36).toUpperCase()}`,
      timestamp: now,
      officerId: actor.officerId,
      officerName: actor.name,
      officerRole: actor.role,
      action: "DISPUTE_CREATED",
      entityType: "SUPPORT_DISPUTE",
      entityId: saved.id,
      details: `Opened ${params.category} dispute for ${params.customerName} (ref ${params.transactionReference}, ${params.currency} ${params.claimAmount.toLocaleString()}).`,
      jurisdiction: saved.jurisdiction,
    });
    this.store.addNotification({
      id: `NTF-${Date.now().toString(36)}`,
      type: "DISPUTE_UPDATE",
      title: `Dispute opened: ${saved.disputeNumber}`,
      body: `${params.category} — ${params.customerName} (${params.currency} ${params.claimAmount.toLocaleString()})`,
      href: `/support/disputes/${saved.id}`,
      read: false,
      createdAt: now,
    });
    return { ok: true, data: saved };
  }

  advanceDispute(
    disputeId: string,
    to: SupportDispute["status"],
    actor: SupportActor,
    detail?: string,
  ): EngineResult<SupportDispute> {
    if (!hasCapability(actor.role, "update_dispute")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot update disputes." };
    }
    const d = this.store.getDispute(disputeId);
    if (!d) return { ok: false, code: "DISPUTE_NOT_FOUND", error: "Dispute not found." };
    const updated = this.store.updateDispute(d.id, { status: to });
    updated!.timeline.push({ label: `Status → ${to}${detail ? ` — ${detail}` : ""}`, by: actor.name, at: new Date().toISOString() });
    this.store.addAudit({
      id: `AUD-SUP-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      officerId: actor.officerId,
      officerName: actor.name,
      officerRole: actor.role,
      action: "DISPUTE_STATUS_CHANGED",
      entityType: "SUPPORT_DISPUTE",
      entityId: d.id,
      details: `${d.disputeNumber} status ${d.status} → ${to}`,
      jurisdiction: d.jurisdiction,
    });
    return { ok: true, data: updated };
  }

  /**
   * Financial decision (spec §29/§31): only decisionOwner-matched specialists
   * or the Support Manager may decide. Approved refund/reversal creates a
   * recovery case in the AUTHORITATIVE DisputeChargebackEngine — Support never
   * writes balances.
   */
  decideDispute(
    disputeId: string,
    params: { type: DisputeDecisionType; reason: string },
    actor: SupportActor,
  ): EngineResult<SupportDispute & { recoveryCaseReference?: string }> {
    if (!hasCapability(actor.role, "decide_dispute")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot record dispute decisions." };
    }
    const d = this.store.getDispute(disputeId);
    if (!d) return { ok: false, code: "DISPUTE_NOT_FOUND", error: "Dispute not found." };
    if (actor.role !== d.decisionOwner && actor.role !== "SUPPORT_MANAGER" && actor.role !== "SUPER_ADMIN") {
      return {
        ok: false,
        code: "FORBIDDEN_DECISION_OWNER",
        error: `This dispute must be decided by ${d.decisionOwner} (or the Support Manager).`,
      };
    }

    const now = new Date().toISOString();
    let recoveryCaseReference: string | undefined;

    const financial = ["REFUND_APPROVED", "REVERSAL_APPROVED", "PARTIAL_REFUND"].includes(params.type);
    if (financial) {
      try {
        const recovery = DisputeChargebackEngine.getInstance().createDispute({
          transactionReference: d.transactionReference,
          claimantId: d.customerId,
          claimantName: d.customerName,
          claimantType: d.customerName ? (d.customerId.startsWith("MCH") ? "MERCHANT" : d.customerId.startsWith("AGT") ? "AGENT" : "CUSTOMER") : "CUSTOMER",
          category:
            d.category === "DUPLICATE" ? "DUPLICATE_CHARGE"
            : d.category === "UNAUTHORIZED" ? "TRANSACTION_NOT_RECOGNIZED"
            : d.category === "CHARGED_NOT_RECEIVED" ? "SERVICE_NOT_RECEIVED"
            : d.category === "FAILED_TRANSACTION" ? "POS_CASH_DISPENSE_ERROR"
            : "OTHER",
          claimAmount: d.claimAmount,
          currency: d.currency,
          priority: d.priority === "CRITICAL" ? "P0" : d.priority === "HIGH" || d.priority === "URGENT" ? "P1" : "P2",
        });
        recoveryCaseReference = recovery.disputeReference;
      } catch {
        return { ok: false, code: "RECOVERY_ENGINE_FAILURE", error: "The recovery engine could not accept the case. No balance was touched — retry." };
      }
    }

    const isFinal = params.type !== "UNDER_INVESTIGATION";
    const updated = this.store.updateDispute(d.id, {
      decision: {
        type: params.type,
        decidedBy: actor.name,
        decidedByRole: actor.role,
        reason: params.reason,
        decidedAt: now,
      },
      status: isFinal ? (params.type === "REJECTED" || params.type === "UNDER_INVESTIGATION" ? "DECISION" : "RESOLVED") : "UNDER_REVIEW",
      resolvedAt: isFinal && params.type !== "REJECTED" ? now : undefined,
      // The recovery case is authoritative for any money movement (§31) —
      // keep the reference on the dispute so support and audit can trace it.
      ...(recoveryCaseReference ? { recoveryCaseReference } : {}),
    });
    updated!.timeline.push({
      label: `Decision: ${params.type}${recoveryCaseReference ? ` (recovery case ${recoveryCaseReference})` : ""}`,
      detail: params.reason,
      by: actor.name,
      at: now,
    });

    this.store.addEvent({
      id: this.store.nextEventId(),
      ticketId: d.ticketId,
      type: params.type === "REFUND_APPROVED" || params.type === "PARTIAL_REFUND" ? "REFUND_REQUESTED" : "DISPUTE_LINKED",
      actorId: actor.officerId,
      actorName: actor.name,
      actorRole: actor.role,
      payload: { disputeId: d.id, decision: params.type, recoveryCaseReference },
      createdAt: now,
    });
    this.store.addAudit({
      id: `AUD-SUP-${Date.now().toString(36).toUpperCase()}`,
      timestamp: now,
      officerId: actor.officerId,
      officerName: actor.name,
      officerRole: actor.role,
      action: `DISPUTE_DECISION_${params.type.replace("_APPROVED", "")}`,
      entityType: "SUPPORT_DISPUTE",
      entityId: d.id,
      details: `${d.disputeNumber}: ${params.type}. ${params.reason}${recoveryCaseReference ? ` Recovery case ${recoveryCaseReference} created in the authoritative recovery engine.` : ""}`,
      jurisdiction: d.jurisdiction,
    });
    this.store.addNotification({
      id: `NTF-${Date.now().toString(36)}`,
      type: "DISPUTE_UPDATE",
      title: `Dispute decision: ${d.disputeNumber}`,
      body: `${params.type} — ${params.reason}`,
      href: `/support/disputes/${d.id}`,
      read: false,
      createdAt: now,
    });
    return { ok: true, data: { ...updated!, recoveryCaseReference } };
  }

  /* ======================================================= escalations */

  createEscalation(
    params: {
      ticketId: string;
      reason: string;
      destination: EscalationDestination;
      priority?: TicketPriority;
      assignedToName?: string;
    },
    actor: SupportActor,
  ): EngineResult<SupportEscalation> {
    if (!hasCapability(actor.role, "create_escalation")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot create escalations." };
    }
    const allowed = allowedEscalationDestinations(actor.role);
    if (!allowed.includes(params.destination)) {
      return {
        ok: false,
        code: "FORBIDDEN_DESTINATION",
        error: `Role ${actor.role} cannot escalate to ${params.destination}. Allowed: ${allowed.join(", ") || "none (use reassignment instead)"}.`,
      };
    }
    const ticket = this.store.getTicket(params.ticketId);
    if (!ticket) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };

    const now = new Date().toISOString();
    const ids = this.store.nextEscalationId();
    const priority = params.priority ?? ticket.priority;
    const escalation: SupportEscalation = {
      id: ids.id,
      escalationNumber: ids.escalationNumber,
      ticketId: ticket.id,
      customerName: ticket.customerName,
      reason: params.reason,
      priority,
      destination: params.destination,
      assignedToName: params.assignedToName,
      status: "PENDING",
      slaDueAt: new Date(Date.now() + SUPPORT_SLA_POLICY[priority].resolutionHours * 3600e3).toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    const saved = this.store.addEscalation(escalation);

    const tr = this.transition(ticket.id, "ESCALATED", actor, { reason: `Escalated to ${params.destination}` });
    this.store.addAudit({
      id: `AUD-SUP-${Date.now().toString(36).toUpperCase()}`,
      timestamp: now,
      officerId: actor.officerId,
      officerName: actor.name,
      officerRole: actor.role,
      action: "TICKET_ESCALATED",
      entityType: "SUPPORT_ESCALATION",
      entityId: saved.id,
      details: `Escalated ${ticket.ticketNumber} to ${params.destination}: ${params.reason}. Ticket transition: ${tr.ok ? "ESCALATED" : tr.error}`,
      jurisdiction: ticket.jurisdiction,
    });
    this.store.addNotification({
      id: `NTF-${Date.now().toString(36)}`,
      type: "ESCALATION",
      title: `Escalated to ${params.destination}: ${ticket.ticketNumber}`,
      body: params.reason,
      ticketId: ticket.id,
      href: `/support/escalations/${saved.id}`,
      read: false,
      createdAt: now,
    });
    return { ok: true, data: saved };
  }

  updateEscalation(
    escalationId: string,
    updates: Partial<Pick<SupportEscalation, "status" | "resolutionNote" | "assignedToName">>,
    actor: SupportActor,
  ): EngineResult<SupportEscalation> {
    const e = this.store.getEscalation(escalationId);
    if (!e) return { ok: false, code: "ESCALATION_NOT_FOUND", error: "Escalation not found." };
    if (!hasCapability(actor.role, "manage_tasks")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot update escalations." };
    }
    const now = new Date().toISOString();
    const updated = this.store.updateEscalation(e.id, {
      ...updates,
      resolvedAt: updates.status === "RESOLVED" ? now : e.resolvedAt,
    });
    this.store.addAudit({
      id: `AUD-SUP-${Date.now().toString(36).toUpperCase()}`,
      timestamp: now,
      officerId: actor.officerId,
      officerName: actor.name,
      officerRole: actor.role,
      action: "ESCALATION_UPDATED",
      entityType: "SUPPORT_ESCALATION",
      entityId: e.id,
      details: `${e.escalationNumber} → ${updates.status ?? e.status}`,
      jurisdiction:
        (this.store.getTicket(e.ticketId)?.jurisdiction as SupportJurisdiction | undefined) ?? "CROSS_BORDER",
    });
    return { ok: true, data: updated! };
  }

  /* ============================================================= tasks */

  addTask(
    params: { title: string; description?: string; priority?: TicketPriority; ticketId?: string; customerId?: string; assignedToId?: string; dueAt?: string },
    actor: SupportActor,
  ): EngineResult<SupportTask> {
    if (!hasCapability(actor.role, "manage_tasks")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot create tasks." };
    }
    if (!params.title) return { ok: false, code: "VALIDATION_FAILED", error: "Task title is required." };
    const assigned = params.assignedToId ? this.store.getOfficer(params.assignedToId) : undefined;
    const task: SupportTask = {
      id: this.store.nextTaskId(),
      title: params.title,
      description: params.description,
      priority: params.priority ?? "NORMAL",
      ticketId: params.ticketId,
      customerId: params.customerId,
      assignedToId: assigned?.id,
      assignedToName: assigned?.fullName,
      dueAt: params.dueAt ?? new Date(Date.now() + 24 * 3600e3).toISOString(),
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ok: true, data: this.store.addTask(task) };
  }

  /* ============================================================== CSAT */

  submitCsat(
    ticketId: string,
    params: { rating: 1 | 2 | 3 | 4 | 5; comment?: string; language?: ArticleLanguage },
    actor: SupportActor,
  ): EngineResult<SupportCsatRecord> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };
    if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
      return { ok: false, code: "CSAT_NOT_APPLICABLE", error: "CSAT can only be collected on resolved or closed tickets." };
    }
    const record: SupportCsatRecord = {
      id: `CSAT-${Date.now().toString(36).toUpperCase()}`,
      ticketId: ticket.id,
      customerName: ticket.customerName,
      rating: params.rating,
      comment: params.comment,
      language: params.language ?? ticket.language,
      submittedAt: new Date().toISOString(),
    };
    this.store.addCsat(record);
    this.store.updateTicket(ticket.id, { satisfactionRating: params.rating, satisfactionComment: params.comment });
    this.store.addEvent({
      id: this.store.nextEventId(),
      ticketId: ticket.id,
      type: "CSAT_SUBMITTED",
      actorId: ticket.customerId,
      actorName: ticket.customerName,
      actorRole: "CUSTOMER",
      payload: { rating: params.rating },
      createdAt: record.submittedAt,
      requestId: actor.requestId,
    });
    return { ok: true, data: record };
  }

  /* ========================================================== overview */

  getOverview(range: "24H" | "7D" | "30D" | "90D" = "24H"): SupportOverviewPayload {
    this.sweepAutoClose();
    const now = Date.now();
    const open = this.store.tickets.filter((t) => this.store.isTicketOpen(t));
    const snapshots = new Map(open.map((t) => [t.id, this.computeSla(t, now)]));

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const resolvedToday = this.store.tickets.filter(
      (t) => t.resolvedAt && new Date(t.resolvedAt).getTime() >= dayStart.getTime(),
    ).length;

    const critical = open.filter((t) => t.priority === "CRITICAL");
    const slaAtRisk = open.filter((t) => {
      const s = snapshots.get(t.id)!;
      return s.resolutionState === "AT_RISK" || s.resolutionState === "BREACHED" || s.state === "AT_RISK";
    });
    const waiting = open.filter((t) => t.status === "WAITING_FOR_CUSTOMER");
    const unassigned = open.filter((t) => !t.assignedOfficerId);
    const fraudEscalations = this.store.escalations.filter(
      (e) => e.destination === "FRAUD_RISK" && e.status !== "RESOLVED",
    );
    const txDisputes = this.store.disputes.filter(
      (d) => d.status !== "RESOLVED" && d.status !== "CLOSED",
    );
    const bankingIssues = open.filter(
      (t) =>
        t.category === "AGENT_FLOAT" ||
        t.category === "MERCHANT_SETTLEMENT" ||
        t.category === "FAILED_TRANSACTION" ||
        t.tags.some((tag) => /coris|providus|nip|waemu/i.test(tag)),
    );

    return {
      kpis: {
        openTickets: open.length,
        critical: critical.length,
        slaAtRisk: slaAtRisk.length,
        waitingForCustomer: waiting.length,
        unassigned: unassigned.length,
        resolvedToday,
      },
      attention: {
        criticalTickets: critical.length,
        slaBreachedOrAtRisk: slaAtRisk.length,
        fraudEscalations: fraudEscalations.length,
        transactionDisputes: txDisputes.length,
        bankingIssues: bankingIssues.length,
      },
      trend: this.buildTrend(range),
      categories: this.buildCategoryCounts(),
      serviceHealth: this.buildServiceHealth(),
      recentActivity: this.store.events.slice(0, 10),
    };
  }

  private buildTrend(range: "24H" | "7D" | "30D" | "90D") {
    const now = Date.now();
    const windows: Record<string, { buckets: number; bucketMs: number; fmt: (d: Date) => string }> = {
      "24H": { buckets: 24, bucketMs: 3600e3, fmt: (d) => `${String(d.getHours()).padStart(2, "0")}:00` },
      "7D": { buckets: 7, bucketMs: 24 * 3600e3, fmt: (d) => d.toLocaleDateString("en", { weekday: "short" }) },
      "30D": { buckets: 30, bucketMs: 24 * 3600e3, fmt: (d) => d.toLocaleDateString("en", { month: "numeric", day: "numeric" }) },
      "90D": { buckets: 30, bucketMs: 3 * 24 * 3600e3, fmt: (d) => d.toLocaleDateString("en", { month: "numeric", day: "numeric" }) },
    };
    const { buckets, bucketMs, fmt } = windows[range];
    const start = now - buckets * bucketMs;
    const created = new Array(buckets).fill(0);
    const resolved = new Array(buckets).fill(0);
    const reopened = new Array(buckets).fill(0);
    const labels: string[] = [];

    for (let i = 0; i < buckets; i++) {
      labels.push(fmt(new Date(start + i * bucketMs)));
    }
    const bucketIndex = (iso: string) => {
      const t = new Date(iso).getTime();
      if (t < start || t > now) return -1;
      return Math.min(buckets - 1, Math.floor((t - start) / bucketMs));
    };
    for (const t of this.store.tickets) {
      const ci = bucketIndex(t.createdAt);
      if (ci >= 0) created[ci]++;
      if (t.resolvedAt) {
        const ri = bucketIndex(t.resolvedAt);
        if (ri >= 0) resolved[ri]++;
      }
    }
    for (const e of this.store.events) {
      if (e.type === "TICKET_REOPENED") {
        const ri = bucketIndex(e.createdAt);
        if (ri >= 0) reopened[ri]++;
      }
    }
    const resolvedInWindow = this.store.tickets.filter(
      (t) => t.resolvedAt && new Date(t.resolvedAt).getTime() >= start,
    );
    const avgResolutionHours =
      resolvedInWindow.length === 0
        ? 0
        : Math.round(
            (resolvedInWindow.reduce((sum, t) => sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0) /
              resolvedInWindow.length /
              3600e3) *
              10,
          ) / 10;

    return { range, created, resolved, reopened, avgResolutionHours, labels };
  }

  private buildCategoryCounts() {
    const counts = new Map<TicketCategory, number>();
    for (const t of this.store.tickets) {
      if (!this.store.isTicketOpen(t)) continue;
      counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    }
    const all: { key: TicketCategory; label: string }[] = [
      { key: "TRANSFER", label: "Transfers" },
      { key: "PENDING_TRANSACTION", label: "Pending" },
      { key: "FAILED_TRANSACTION", label: "Failed" },
      { key: "REFUND", label: "Refunds" },
      { key: "REVERSAL", label: "Reversals" },
      { key: "WALLET", label: "Wallet" },
      { key: "DEPOSIT", label: "Funding" },
      { key: "WITHDRAWAL", label: "Withdrawals" },
      { key: "CARD", label: "Cards" },
      { key: "KYC_TIER", label: "KYC" },
      { key: "FRAUD_SECURITY", label: "Security" },
      { key: "LOGIN_ACCESS", label: "Account Access" },
      { key: "AGENT_FLOAT", label: "Agent Float" },
      { key: "MERCHANT_SETTLEMENT", label: "Merchants" },
      { key: "TECHNICAL_API", label: "Technical" },
      { key: "BILLS", label: "Bills" },
      { key: "AIRTIME", label: "Airtime" },
      { key: "DATA", label: "Data" },
      { key: "COMMISSION", label: "Commissions" },
      { key: "COMPLAINT", label: "Complaints" },
    ];
    return all
      .map(({ key, label }) => ({ key, label, count: counts.get(key) ?? 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Live service health — derived 1:1 from HealthCheckEngine.getDeepHealth()
   * (spec §15: support must see when an issue may be systemic; never invent
   * a status).
   */
  private buildServiceHealth() {
    const checkedAt = new Date().toISOString();
    let report: ReturnType<typeof HealthCheckEngine.getDeepHealth>;
    try {
      report = HealthCheckEngine.getDeepHealth();
    } catch {
      return [
        { key: "platform", label: "Platform diagnostics", status: "DEGRADED" as const, detail: "Health report unavailable — check server logs.", checkedAt },
      ];
    }
    const providers = report.providers;
    const allConnected = providers.length > 0 && providers.every((p) => p.status === "CONNECTED");
    const anyOffline = providers.some((p) => p.status === "OFFLINE");

    return [
      {
        key: "customer_auth",
        label: "Customer Authentication",
        status: report.identityEngine.status === "OPERATIONAL" ? ("OPERATIONAL" as const) : ("DEGRADED" as const),
        detail: `${report.identityEngine.totalPersonsCount} identities registered, ${report.identityEngine.pendingKycCount} pending KYC.`,
        checkedAt,
      },
      {
        key: "transaction_engine",
        label: "Transaction Engine",
        status:
          report.platformStatus === "OPERATIONAL" && report.ledger.status === "BALANCED"
            ? ("OPERATIONAL" as const)
            : report.safeMode || report.ledger.status !== "BALANCED"
              ? ("DEGRADED" as const)
              : ("OPERATIONAL" as const),
        detail: `Ledger ${report.ledger.status.toLowerCase()} (Δ ${report.ledger.debitCreditDeltaMinor} minor units), ${report.ledger.totalJournalsCount} journals.`,
        checkedAt,
      },
      {
        key: "kyc",
        label: "KYC / Identity",
        status: report.identityEngine.status === "OPERATIONAL" ? ("OPERATIONAL" as const) : ("DEGRADED" as const),
        detail: `${report.identityEngine.pendingKycCount} documents in verification queue.`,
        checkedAt,
      },
      {
        key: "notifications",
        label: "Notifications / Outbox",
        status: report.platformStatus === "OPERATIONAL" ? ("OPERATIONAL" as const) : ("DEGRADED" as const),
        detail: report.platformStatus === "SAFE_MODE" ? "Safe mode active — outbound notifications may be deferred." : "Outbox deliveries flowing.",
        checkedAt,
      },
      {
        key: "banking_apis",
        label: "Banking APIs",
        status: anyOffline ? ("OUTAGE" as const) : allConnected ? ("OPERATIONAL" as const) : ("DEGRADED" as const),
        detail: providers.map((p) => `${p.name}: ${p.status.toLowerCase()}`).join(" · ") || "No provider circuits registered.",
        checkedAt,
      },
      {
        key: "settlement_pool",
        label: "Settlement Pool",
        status: report.treasury.availableLiquidityNgnMinor > 0 && report.treasury.availableLiquidityXofMinor > 0 ? ("OPERATIONAL" as const) : ("DEGRADED" as const),
        detail: `Liquidity — NGN: ${(report.treasury.availableLiquidityNgnMinor / 100).toLocaleString()} · XOF: ${(report.treasury.availableLiquidityXofMinor / 100).toLocaleString()}.`,
        checkedAt,
      },
    ];
  }

  /* ========================================================= analytics */

  getAnalytics() {
    const now = Date.now();
    const agents = this.store.officers
      .filter((o) => o.role !== "SUPPORT_READ_ONLY")
      .map((o) => {
        const mine = this.store.tickets.filter((t) => t.assignedOfficerId === o.id);
        const resolved = mine.filter((t) => t.resolvedAt);
        const open = mine.filter((t) => this.store.isTicketOpen(t));
        const avgResponseMin =
          mine.filter((t) => t.firstRespondedAt).length === 0
            ? 0
            : Math.round(
                mine
                  .filter((t) => t.firstRespondedAt)
                  .reduce((s, t) => s + (new Date(t.firstRespondedAt!).getTime() - new Date(t.createdAt).getTime()), 0) /
                  mine.filter((t) => t.firstRespondedAt).length /
                  60e3,
              );
        const avgResolutionH =
          resolved.length === 0
            ? 0
            : Math.round(
                (resolved.reduce((s, t) => s + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0) /
                  resolved.length /
                  3600e3) *
                  10,
              ) / 10;
        const slaMet =
          resolved.length === 0
            ? 100
            : Math.round(
                (resolved.filter((t) => {
                  const spec = SUPPORT_SLA_POLICY[t.priority];
                  return new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime() <= spec.resolutionHours * 3600e3 + 60e3;
                }).length /
                  resolved.length) *
                  100,
              );
        const csatTickets = resolved.map((t) => this.store.csat.find((c) => c.ticketId === t.id)).filter(Boolean);
        const csat = csatTickets.length === 0 ? null : Math.round((csatTickets.reduce((s, c) => s + c!.rating, 0) / csatTickets.length) * 10) / 10;
        return {
          officerId: o.id,
          name: o.fullName,
          role: o.role,
          jurisdiction: o.jurisdiction,
          languages: o.languages,
          load: o.activeTicketCount,
          capacity: o.maxCapacity,
          open: open.length,
          resolved: resolved.length,
          avgResponseMin,
          avgResolutionH,
          slaPct: slaMet,
          csat,
          qaScore: o.qaScore,
        };
      });

    const allResolved = this.store.tickets.filter((t) => t.resolvedAt);
    const csatAll = this.store.csat;
    const csatDist = [1, 2, 3, 4, 5].map((r) => csatAll.filter((c) => c.rating === r).length);
    const slaCompliancePct =
      allResolved.length === 0
        ? 100
        : Math.round(
            (allResolved.filter((t) => {
              const spec = SUPPORT_SLA_POLICY[t.priority];
              return new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime() <= spec.resolutionHours * 3600e3 + 60e3;
            }).length /
              allResolved.length) *
              100,
          );
    const escalations = this.store.escalations;
    const escalationRatePct =
      this.store.tickets.length === 0
        ? 0
        : Math.round((escalations.length / this.store.tickets.length) * 1000) / 10;
    const reopenedCount = this.store.tickets.filter((t) => t.status === "REOPENED").length;

    /* §57–§59 tab payloads — the analytics UI shape (kept alongside
     * `agents`/`overall` for API consumers). */
    const agentStats = agents.map((a) => {
      const mine = this.store.tickets.filter((t) => t.assignedOfficerId === a.officerId);
      const mineIds = new Set(mine.map((t) => t.id));
      return {
        officerId: a.officerId,
        officerName: a.name,
        role: a.role,
        resolved: a.resolved,
        open: a.open,
        avgResolutionHours: a.avgResolutionH,
        csatAvg: a.csat,
        escalations: this.store.escalations.filter((e) => mineIds.has(e.ticketId)).length,
        reopens: mine.filter((t) => t.status === "REOPENED").length,
        slaComplianceRate: a.slaPct,
      };
    });

    const resolutionByPriority = (["CRITICAL", "URGENT", "HIGH", "NORMAL", "LOW"] as const).map((p) => {
      const list = allResolved.filter((t) => t.priority === p);
      const withinTarget = list.filter((t) => {
        const spec = SUPPORT_SLA_POLICY[t.priority];
        return new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime() <= spec.resolutionHours * 3600e3 + 60e3;
      }).length;
      return {
        priority: p,
        resolved: list.length,
        withinTarget,
        rate: list.length === 0 ? 100 : Math.round((withinTarget / list.length) * 100),
      };
    });

    const distribution: Record<string, number> = {};
    for (const r of [1, 2, 3, 4, 5]) distribution[String(r)] = csatAll.filter((c) => c.rating === r).length;
    const byLanguage = (["en", "fr", "ha"] as const)
      .map((lang) => {
        const list = csatAll.filter((c) => c.language === lang);
        return {
          language: lang,
          count: list.length,
          average: list.length ? Math.round((list.reduce((s, c) => s + c.rating, 0) / list.length) * 10) / 10 : null,
        };
      })
      .filter((l) => l.count > 0);

    return {
      agents,
      overall: {
        slaCompliancePct,
        csatAverage: csatAll.length ? Math.round((csatAll.reduce((s, c) => s + c.rating, 0) / csatAll.length) * 10) / 10 : null,
        csatDistribution: csatDist,
        csatCount: csatAll.length,
        escalationRatePct,
        reopenRatePct: this.store.tickets.length ? Math.round((reopenedCount / this.store.tickets.length) * 1000) / 10 : 0,
        nowIso: new Date(now).toISOString(),
      },
      agentStats,
      slaComplianceRate: slaCompliancePct,
      resolutionByPriority,
      csat: {
        average: csatAll.length ? Math.round((csatAll.reduce((s, c) => s + c.rating, 0) / csatAll.length) * 10) / 10 : null,
        count: csatAll.length,
        distribution,
        byLanguage,
      },
    };
  }

  /* =========================================================== search */

  search(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return { customers: [], tickets: [], transactions: [], disputes: [], escalations: [], knowledge: [] };

    const customers = Object.values(this.store.entityContexts)
      .filter((c) => c.fullName.toLowerCase().includes(q) || c.customerId.toLowerCase().includes(q) || c.emailMasked.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ id: c.customerId, name: c.fullName, country: c.country, status: c.accountStatus, href: `/support/customers/${c.customerId}` }));

    const tickets = this.store.tickets
      .filter((t) => t.ticketNumber.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({ id: t.id, number: t.ticketNumber, subject: t.subject, status: t.status, href: `/support/tickets/${t.id}` }));

    const transactions = Object.values(this.store.transactionTraces)
      .filter((t) => t.transactionId.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q) || t.originEntity.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({ id: t.transactionId, reference: t.reference, currency: t.currency, amount: t.amount, status: t.status, href: `/support/transactions/${t.transactionId}` }));

    const disputes = this.store.disputes
      .filter((d) => d.disputeNumber.toLowerCase().includes(q) || d.transactionReference.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q))
      .slice(0, 5)
      .map((d) => ({ id: d.id, number: d.disputeNumber, category: d.category, status: d.status, href: `/support/disputes/${d.id}` }));

    const escalations = this.store.escalations
      .filter((e) => e.escalationNumber.toLowerCase().includes(q) || e.reason.toLowerCase().includes(q))
      .slice(0, 5)
      .map((e) => ({ id: e.id, number: e.escalationNumber, destination: e.destination, status: e.status, href: `/support/escalations/${e.id}` }));

    const knowledge = this.store.knowledge
      .filter((k) => k.body.en.title.toLowerCase().includes(q) || k.body.fr?.title.toLowerCase().includes(q) || k.body.ha?.title.toLowerCase().includes(q) || k.tags.some((tag) => tag.toLowerCase().includes(q)))
      .slice(0, 5)
      .map((k) => ({ id: k.id, title: k.body.en.title, category: k.category, href: `/support/knowledge/${k.id}` }));

    return { customers, tickets, transactions, disputes, escalations, knowledge };
  }
}
