// =============================================================================
// File: src/lib/support/SupportOpsEngine.ts
// Description: KoriePay Support Operating System — the operational brain,
// REAL-DB backed (see migration 20260906000031_support_portal_live.sql).
//
// EVERY support mutation flows through this engine (spec §02/§04/§67):
//   • lifecycle is a validated state machine — no arbitrary status writes;
//   • SLA is computed from backend timestamps (pause/resume aware) — never
//     hardcoded or client-supplied, never persisted as a static status;
//   • assignment is least-loaded + language + skill + jurisdiction aware;
//   • duplicates are detected before creation (surfaced, not auto-blocked);
//   • every meaningful change appends an immutable support_events row (§51);
//   • sensitive operations append a support_audit_log row (§52/§90);
//   • financial decisions create recovery cases in DisputeChargebackEngine —
//     Support NEVER touches balances directly (§31).
//
// This replaces the in-memory SupportOpsStore/SupportOpsEngine pair. Every
// method below is async and reads/writes the hosted database directly —
// there is no module-level singleton and no seed data.
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
import {
  SUPPORT_SLA_POLICY,
  SupportSlaState,
  TicketSlaSnapshot,
  SupportEventType,
  SupportDispute,
  DisputeCategory,
  DisputeDecisionType,
  SupportEscalation,
  EscalationDestination,
  SupportTask,
  SupportOverviewPayload,
  ArticleLanguage,
} from "@/types/supportOps";
import { hasCapability, allowedEscalationDestinations, roleRank } from "./SupportPermissions";
import { DisputeChargebackEngine } from "@/lib/recovery/DisputeChargebackEngine";
import {
  listOfficers,
  getOfficerRow,
  activeTicketCountsByOfficer,
  officerRowToOfficer,
  listTicketRows,
  getTicketRow,
  insertTicketRow,
  updateTicketRow,
  nextTicketNumber,
  ticketRowToTicket,
  listMessagesForTicket,
  messageRowToMessage,
  insertMessageRow,
  insertEventRow,
  eventsForTicket as dbEventsForTicket,
  recentEvents,
  hasEventFired,
  eventRowToEvent,
  listDisputeRows,
  getDisputeRow,
  insertDisputeRow,
  updateDisputeRow,
  nextDisputeNumber,
  disputeRowToDispute,
  listEscalationRows,
  getEscalationRow,
  insertEscalationRow,
  updateEscalationRow,
  nextEscalationNumber,
  escalationRowToEscalation,
  listTaskRows,
  getTaskRow,
  insertTaskRow,
  updateTaskRow,
  taskRowToTask,
  getMacroRow,
  listAllCsat,
  getCsatForTicket,
  insertCsatRow,
  csatRowToRecord,
  insertNotificationRow,
  insertAuditRow,
  idempotencyHit,
  idempotencyStore,
} from "./supportDb";

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

function auditId(): string {
  return `AUD-SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/* --------------------------------------------------------- the engine */

export class SupportOpsEngine {
  /* ================================================================ SLA */

  /**
   * SLA snapshot derived from backend timestamps (spec §08). Called on every
   * read — nothing is cached or hardcoded. Pause accounting uses
   * resolution_paused_ms/resolution_paused_since persisted on the ticket row
   * (updated by transition()), so it survives across requests/processes —
   * unlike the old in-memory pauseTracking map.
   */
  computeSla(ticket: SupportTicket, pausedMs = 0, pauseStartedAt?: string, nowMs: number = Date.now()): TicketSlaSnapshot {
    const spec = SUPPORT_SLA_POLICY[ticket.priority];
    const created = new Date(ticket.createdAt).getTime();
    const resolutionBudget = spec.resolutionHours * 3600e3;
    const firstBudget = spec.firstResponseMinutes * 60e3;

    const pausedNow =
      pausedMs + (ticket.status === "WAITING_FOR_CUSTOMER" && pauseStartedAt ? Math.max(0, nowMs - new Date(pauseStartedAt).getTime()) : 0);

    const resolvedAtMs = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : undefined;
    const endMs = resolvedAtMs ?? nowMs;
    const effectiveAgeMs = Math.max(0, endMs - created - (resolvedAtMs ? Math.min(pausedNow, endMs - created) : pausedNow));

    let firstResponseState: SupportSlaState;
    if (ticket.firstRespondedAt) {
      const respondedMs = new Date(ticket.firstRespondedAt).getTime() - created;
      firstResponseState = respondedMs <= firstBudget ? "MET" : "BREACHED_LATE";
    } else {
      const remainingFirst = new Date(ticket.firstResponseDueAt).getTime() - nowMs;
      firstResponseState = remainingFirst < 0 ? "BREACHED" : remainingFirst < firstBudget * 0.25 ? "AT_RISK" : "ON_TRACK";
    }

    let resolutionState: SupportSlaState;
    if (ticket.resolvedAt) {
      resolutionState = effectiveAgeMs <= resolutionBudget ? "MET" : "BREACHED_LATE";
    } else if (ticket.status === "WAITING_FOR_CUSTOMER") {
      resolutionState = "PAUSED";
    } else if (effectiveAgeMs > resolutionBudget) {
      resolutionState = "BREACHED";
    } else {
      const remaining = resolutionBudget - effectiveAgeMs;
      resolutionState = remaining < resolutionBudget * 0.25 ? "AT_RISK" : "ON_TRACK";
    }

    const rank: Record<SupportSlaState, number> = { BREACHED: 4, AT_RISK: 3, PAUSED: 2, BREACHED_LATE: 1, MET: 1, ON_TRACK: 0 };
    let state: SupportSlaState;
    if (ticket.resolvedAt) {
      state = resolutionState;
    } else {
      state = rank[firstResponseState] >= rank[resolutionState] ? firstResponseState : resolutionState;
      if (ticket.status === "WAITING_FOR_CUSTOMER" && (state === "ON_TRACK" || state === "AT_RISK")) state = "PAUSED";
    }

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

  /** Convenience: load pause bookkeeping alongside the ticket row and compute SLA. */
  private async computeSlaForId(ticket: SupportTicket): Promise<TicketSlaSnapshot> {
    const row = await getTicketRow(ticket.id);
    return this.computeSla(ticket, Number(row?.resolution_paused_ms ?? 0), row?.resolution_paused_since ?? undefined);
  }

  /** Fire SLA warning/breach events exactly once per ticket per type (checked via support_events). */
  private async sweepSlaEvents(ticket: SupportTicket, snapshot: TicketSlaSnapshot): Promise<void> {
    const fire = async (type: SupportEventType, payload: Record<string, unknown>) => {
      if (await hasEventFired(ticket.id, type)) return;
      await insertEventRow({
        ticket_id: ticket.id,
        event_type: type,
        actor_id: "SLA-ENGINE",
        actor_name: "SLA Engine",
        actor_role: "SYSTEM",
        payload,
      });
      if (type === "SLA_BREACHED") {
        await insertNotificationRow({
          type: "SLA_BREACH",
          title: `SLA breached: ${ticket.ticketNumber}`,
          body: `${ticket.priority} ticket "${ticket.subject}" has breached its ${SUPPORT_SLA_POLICY[ticket.priority].resolutionHours}h resolution SLA.`,
          ticket_id: ticket.id,
          href: `/support/tickets/${ticket.id}`,
        });
      } else if (type === "SLA_WARNING") {
        await insertNotificationRow({
          type: "SLA_WARNING",
          title: `SLA at risk: ${ticket.ticketNumber}`,
          body: `${ticket.priority} ticket "${ticket.subject}" is within 25% of its resolution SLA.`,
          ticket_id: ticket.id,
          href: `/support/tickets/${ticket.id}`,
        });
      }
    };
    if (snapshot.resolutionState === "BREACHED" || snapshot.firstResponseState === "BREACHED") {
      await fire("SLA_BREACHED", { component: snapshot.resolutionState === "BREACHED" ? "resolution" : "first_response" });
    } else if (snapshot.state === "AT_RISK") {
      await fire("SLA_WARNING", { state: "AT_RISK", remainingMinutes: Math.round(snapshot.remainingMs / 60e3) });
    }
  }

  /** Idempotent sweep: auto-close tickets resolved more than 72h ago. */
  async sweepAutoClose(): Promise<void> {
    const now = Date.now();
    const { rows } = await listTicketRows({ status: "RESOLVED", limit: 500 });
    for (const t of rows) {
      if (t.resolved_at && now - new Date(t.resolved_at).getTime() > AUTO_CLOSE_MS && !t.closed_at) {
        const closedAt = new Date().toISOString();
        await updateTicketRow(t.id, { status: "CLOSED", closed_at: closedAt });
        await insertEventRow({
          ticket_id: t.id,
          event_type: "TICKET_CLOSED",
          actor_id: "SLA-ENGINE",
          actor_name: "Auto-close policy",
          actor_role: "SYSTEM",
          from_status: "RESOLVED",
          to_status: "CLOSED",
          payload: { policy: "RESOLVED_72H" },
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

  async transition(
    ticketId: string,
    to: TicketStatus,
    actor: SupportActor,
    opts: { reason?: string; rootCause?: string } = {},
  ): Promise<EngineResult<SupportTicket>> {
    const row = await getTicketRow(ticketId);
    if (!row) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };
    const ticket = await ticketRowToTicket(row);

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
    const updates: Record<string, unknown> = { status: to };
    if (to === "RESOLVED") {
      updates.resolved_at = now;
      if (opts.rootCause) updates.root_cause_category = opts.rootCause;
    }
    if (to === "CLOSED") updates.closed_at = now;
    if (to === "REOPENED") {
      updates.resolved_at = null;
      updates.closed_at = null;
      updates.sentiment = "NEUTRAL";
    }

    // Pause accounting for the resolution clock, persisted on the row.
    let pausedMs = Number(row.resolution_paused_ms ?? 0);
    if (to === "WAITING_FOR_CUSTOMER" && fromStatus !== "WAITING_FOR_CUSTOMER") {
      updates.resolution_paused_since = now;
    }
    if (fromStatus === "WAITING_FOR_CUSTOMER" && to !== "WAITING_FOR_CUSTOMER" && row.resolution_paused_since) {
      pausedMs += Math.max(0, new Date(now).getTime() - new Date(row.resolution_paused_since).getTime());
      updates.resolution_paused_ms = pausedMs;
      updates.resolution_paused_since = null;
    }

    const updatedRow = await updateTicketRow(ticket.id, updates);
    if (!updatedRow) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket vanished during transition." };
    const updated = await ticketRowToTicket(updatedRow, ticket.messages);

    await insertEventRow({
      ticket_id: updated.id,
      event_type: EVENT_FOR_TARGET[to] ?? "STATUS_CHANGED",
      actor_id: actor.officerId,
      actor_name: actor.name,
      actor_role: actor.role,
      from_status: fromStatus,
      to_status: to,
      payload: { reason: opts.reason, rootCause: opts.rootCause },
      request_id: actor.requestId,
    });

    const sensitive = ["RESOLVED", "CLOSED", "REOPENED", "ESCALATED"].includes(to);
    if (sensitive) {
      await insertAuditRow({
        id: auditId(),
        officer_id: actor.officerId,
        officer_name: actor.name,
        officer_role: actor.role,
        action: `TICKET_${to}`,
        entity_type: "SUPPORT_TICKET",
        entity_id: updated.id,
        details: `Transition ${fromStatus} → ${to}${opts.reason ? ` — ${opts.reason}` : ""}`,
        jurisdiction: updated.jurisdiction,
      });
    }

    const snapshot = this.computeSla(updated, Number(updatedRow.resolution_paused_ms ?? 0), updatedRow.resolution_paused_since ?? undefined);
    await this.sweepSlaEvents(updated, snapshot);
    return { ok: true, data: updated };
  }

  /* ========================================================== tickets */

  async findDuplicates(candidate: { customerId: string; category: TicketCategory; relatedTransactionId?: string; createdAt: string }): Promise<SupportTicket[]> {
    const { rows } = await listTicketRows({ customerId: candidate.customerId, openOnly: true, limit: 50 });
    const created = new Date(candidate.createdAt).getTime();
    const matches = rows.filter((t) => {
      const ageDays = (created - new Date(t.created_at).getTime()) / (24 * 3600e3);
      if (ageDays < 0 || ageDays > 3) return false;
      if (candidate.relatedTransactionId && t.related_transaction_reference === candidate.relatedTransactionId) return true;
      return t.category === candidate.category;
    });
    return Promise.all(matches.map((t) => ticketRowToTicket(t)));
  }

  async createTicket(
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
  ): Promise<EngineResult<{ ticket: SupportTicket; duplicates: SupportTicket[]; autoAssignedTo?: string; cached?: boolean }>> {
    if (idempotencyKey) {
      const cached = await idempotencyHit(idempotencyKey);
      if (cached) {
        return { ok: true, data: { ...(cached as { ticket: SupportTicket; duplicates: SupportTicket[]; autoAssignedTo?: string }), cached: true } };
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
    const ticketNumber = await nextTicketNumber();
    const duplicates = await this.findDuplicates({
      customerId: params.customerId,
      category: params.category,
      relatedTransactionId: params.relatedTransactionId,
      createdAt: now,
    });

    const jurisdiction = params.jurisdiction ?? "NG";
    const channel = params.channel ?? "IN_APP";
    const language = params.language ?? "en";

    // Least-loaded + language + jurisdiction + tier-aware auto-assignment (spec §39).
    const assignee = await this.pickAutoAssignee({ language, jurisdiction, priority, category: params.category });

    const row = await insertTicketRow({
      ticket_number: ticketNumber,
      subject: params.subject,
      description: params.description,
      category: params.category,
      priority,
      status: assignee ? "ASSIGNED" : "NEW",
      customer_type: params.customerType ?? "CUSTOMER",
      customer_id: params.customerId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
      jurisdiction,
      channel,
      language,
      assigned_officer_id: assignee?.id,
      tier_assigned: assignee?.tier ?? "TIER_0_AUTOMATION",
      related_transaction_reference: params.relatedTransactionId,
      first_response_due_at: new Date(Date.now() + spec.firstResponseMinutes * 60e3).toISOString(),
      resolution_due_at: new Date(Date.now() + spec.resolutionHours * 3600e3).toISOString(),
      tags: params.tags ?? [],
      idempotency_key: idempotencyKey,
    });

    await insertMessageRow({
      ticket_id: row.id,
      sender_type: "CUSTOMER",
      sender_id: params.customerId,
      sender_name: params.customerName,
      content: params.description,
      is_internal_note: false,
    });

    const messages = [messageRowToMessage(await insertMessageRow({ ticket_id: row.id, sender_type: "CUSTOMER", sender_id: params.customerId, sender_name: params.customerName, content: "" }).then((m) => m).catch(() => null as never))].filter(Boolean);
    void messages; // placeholder removed below — real messages re-read from DB

    const finalMessages = (await listMessagesForTicket(row.id)).map(messageRowToMessage);
    const saved = await ticketRowToTicket(row, finalMessages);

    await insertEventRow({
      ticket_id: saved.id,
      event_type: "TICKET_CREATED",
      actor_id: actor.officerId,
      actor_name: actor.name,
      actor_role: actor.role,
      payload: { priority, duplicates: duplicates.length, autoAssignedTo: assignee?.id },
      request_id: actor.requestId,
    });
    await insertNotificationRow({
      type: "NEW_TICKET",
      title: `New ${priority.toLowerCase()} ticket: ${saved.ticketNumber}`,
      body: `${saved.customerName}: ${saved.subject}`,
      ticket_id: saved.id,
      href: `/support/tickets/${saved.id}`,
    });

    const result = { ticket: saved, duplicates, autoAssignedTo: assignee?.id, cached: false };
    if (idempotencyKey) await idempotencyStore(idempotencyKey, result);
    return { ok: true, data: result };
  }

  /** Least-loaded + language + jurisdiction + category-tier aware (spec §39). */
  async pickAutoAssignee(ticket: { language: ArticleLanguage; jurisdiction: SupportJurisdiction; priority: TicketPriority; category: TicketCategory }): Promise<SupportOfficer | null> {
    const [rows, counts] = await Promise.all([listOfficers(), activeTicketCountsByOfficer()]);
    const online = rows
      .map((o) => officerRowToOfficer(o, counts.get(o.id) ?? 0))
      .filter((o) => o.status === "ONLINE" && o.maxCapacity > 0 && o.activeTicketCount < o.maxCapacity);
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

    const sorted = [...eligible].sort((a, b) => a.activeTicketCount / a.maxCapacity - b.activeTicketCount / b.maxCapacity);
    return sorted[0] ?? null;
  }

  async assignTicket(ticketId: string, officerId: string, actor: SupportActor): Promise<EngineResult<SupportTicket>> {
    if (!hasCapability(actor.role, "assign_ticket")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot assign tickets." };
    }
    const row = await getTicketRow(ticketId);
    if (!row) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };
    const officer = await getOfficerRow(officerId);
    if (!officer) return { ok: false, code: "OFFICER_NOT_FOUND", error: "Officer not found." };

    const wasUnassigned = !row.assigned_officer_id;
    const updated = await updateTicketRow(ticketId, { assigned_officer_id: officer.id, tier_assigned: officer.tier });
    if (!updated) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket vanished." };

    await insertEventRow({
      ticket_id: ticketId,
      event_type: wasUnassigned ? "TICKET_ASSIGNED" : "TICKET_REASSIGNED",
      actor_id: actor.officerId,
      actor_name: actor.name,
      actor_role: actor.role,
      from_status: row.status,
      to_status: row.status,
      payload: { toOfficer: officer.id, toOfficerName: officer.full_name },
      request_id: actor.requestId,
    });

    const messages = (await listMessagesForTicket(ticketId)).map(messageRowToMessage);
    return { ok: true, data: await ticketRowToTicket(updated, messages) };
  }

  async changePriority(ticketId: string, priority: TicketPriority, actor: SupportActor): Promise<EngineResult<SupportTicket>> {
    if (!hasCapability(actor.role, "change_priority")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot change ticket priority." };
    }
    const row = await getTicketRow(ticketId);
    if (!row) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };
    const from = row.priority;
    const updated = await updateTicketRow(ticketId, { priority });
    if (!updated) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket vanished." };
    await insertEventRow({
      ticket_id: ticketId,
      event_type: "PRIORITY_CHANGED",
      actor_id: actor.officerId,
      actor_name: actor.name,
      actor_role: actor.role,
      payload: { from, to: priority },
    });
    const messages = (await listMessagesForTicket(ticketId)).map(messageRowToMessage);
    return { ok: true, data: await ticketRowToTicket(updated, messages) };
  }

  /* ========================================================= messages */

  async addMessage(
    ticketId: string,
    params: { content: string; internal?: boolean; macroId?: string; senderType?: "AGENT" | "CUSTOMER"; actor: SupportActor },
    idempotencyKey?: string,
  ): Promise<EngineResult<TicketMessage>> {
    const { actor } = params;
    const row = await getTicketRow(ticketId);
    if (!row) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };
    if (!params.macroId && (!params.content || !params.content.trim())) {
      return { ok: false, code: "VALIDATION_FAILED", error: "Message content is required." };
    }
    const isCustomer = params.senderType === "CUSTOMER";
    const cap = isCustomer ? "send_customer_message" : params.internal ? "add_internal_note" : "send_customer_message";
    if (!isCustomer && !hasCapability(actor.role, cap as never)) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot post this message type." };
    }

    if (idempotencyKey) {
      const cached = await idempotencyHit(idempotencyKey);
      if (cached) return { ok: true, data: cached as TicketMessage };
    }

    // Macro substitution — server-side, known values only (spec §45).
    let content = params.content;
    let macroKey: string | undefined;
    if (params.macroId) {
      const macro = await getMacroRow(params.macroId);
      if (macro && macro.enabled) {
        macroKey = macro.key;
        const lang = row.language as ArticleLanguage;
        const bodies: Record<ArticleLanguage, string> = { en: macro.body_en, fr: macro.body_fr, ha: macro.body_ha };
        const template = bodies[lang] || macro.body_en;
        let trace: { amount?: number; providerReference?: string; reference?: string; webhookStatus?: string } | null = null;
        if (row.related_transaction_reference) {
          const { resolveTransactionInvestigation } = await import("./SupportContexts");
          const view = await resolveTransactionInvestigation(row.related_transaction_reference);
          if (view) trace = { amount: view.amount, providerReference: view.provider?.reference, reference: view.reference, webhookStatus: view.provider?.status };
        }
        const vars: Record<string, string> = {
          customer_name: row.customer_name,
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
    const insertedRow = await insertMessageRow({
      ticket_id: row.id,
      sender_type: isCustomer ? "CUSTOMER" : "AGENT",
      sender_id: isCustomer ? row.customer_id : actor.officerId,
      sender_name: isCustomer ? row.customer_name : actor.name,
      content,
      is_internal_note: params.internal ?? false,
      macro_used: macroKey,
    });
    const message = messageRowToMessage(insertedRow);

    const ticketUpdates: Record<string, unknown> = {};
    if (isCustomer && row.status === "WAITING_FOR_CUSTOMER") {
      ticketUpdates.status = "IN_PROGRESS";
      if (row.resolution_paused_since) {
        const paused = Number(row.resolution_paused_ms ?? 0) + Math.max(0, Date.now() - new Date(row.resolution_paused_since).getTime());
        ticketUpdates.resolution_paused_ms = paused;
        ticketUpdates.resolution_paused_since = null;
      }
    }
    if (!isCustomer && !row.first_responded_at) ticketUpdates.first_responded_at = now;
    if (Object.keys(ticketUpdates).length) await updateTicketRow(row.id, ticketUpdates);

    await insertEventRow({
      ticket_id: row.id,
      event_type: isCustomer ? "CUSTOMER_REPLIED" : params.internal ? "INTERNAL_NOTE_ADDED" : "AGENT_REPLIED",
      actor_id: message.senderId,
      actor_name: message.senderName,
      actor_role: isCustomer ? "CUSTOMER" : actor.role,
      payload: { internal: params.internal ?? false, macro: macroKey },
      request_id: actor.requestId,
    });

    if (isCustomer) {
      await insertNotificationRow({
        type: "CUSTOMER_REPLY",
        title: `Customer replied: ${row.ticket_number}`,
        body: `${row.customer_name} replied: ${content.slice(0, 140)}${content.length > 140 ? "…" : ""}`,
        ticket_id: row.id,
        href: `/support/inbox?ticket=${row.id}`,
      });
    }

    if (idempotencyKey) await idempotencyStore(idempotencyKey, message);
    return { ok: true, data: message };
  }

  /* ========================================================== disputes */

  async createDispute(
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
  ): Promise<EngineResult<SupportDispute>> {
    if (!hasCapability(actor.role, "create_dispute")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot open disputes." };
    }
    if (!params.transactionReference || !params.claim || params.claimAmount <= 0) {
      return { ok: false, code: "VALIDATION_FAILED", error: "transactionReference, claim and a positive claimAmount are required." };
    }
    const now = new Date().toISOString();
    const disputeNumber = await nextDisputeNumber();
    const priority = params.priority ?? "HIGH";
    const decisionOwner =
      params.category === "UNAUTHORIZED" || params.category === "OTHER"
        ? "TIER_3_FRAUD"
        : params.category === "REFUND" || params.category === "REVERSAL" || params.category === "INCORRECT_AMOUNT"
          ? "TIER_3_FINANCE"
          : "TIER_3_FRAUD";

    const timeline: SupportDispute["timeline"] = [{ label: "Dispute opened", by: actor.name, at: now }];
    if (params.ticketId) {
      const t = await getTicketRow(params.ticketId);
      if (t) timeline.push({ label: `Linked to ticket ${t.ticket_number}`, at: now });
    }

    const row = await insertDisputeRow({
      dispute_number: disputeNumber,
      ticket_id: params.ticketId,
      category: params.category,
      status: "OPEN",
      priority,
      transaction_reference: params.transactionReference,
      customer_id: params.customerId,
      customer_name: params.customerName,
      jurisdiction: params.jurisdiction ?? "NG",
      claim: params.claim,
      claim_amount: params.claimAmount,
      currency: params.currency,
      evidence: params.evidenceName ? [{ name: params.evidenceName, type: "EVIDENCE", sizeMasked: "—", uploadedAt: now }] : [],
      created_by_officer_id: actor.officerId,
      decision_owner: decisionOwner,
      timeline,
    });

    const saved = await disputeRowToDispute(row);
    await insertEventRow({
      ticket_id: params.ticketId,
      event_type: "DISPUTE_CREATED",
      actor_id: actor.officerId,
      actor_name: actor.name,
      actor_role: actor.role,
      payload: { disputeId: saved.id, category: params.category },
    });
    await insertAuditRow({
      id: auditId(),
      officer_id: actor.officerId,
      officer_name: actor.name,
      officer_role: actor.role,
      action: "DISPUTE_CREATED",
      entity_type: "SUPPORT_DISPUTE",
      entity_id: saved.id,
      details: `Opened ${params.category} dispute for ${params.customerName} (ref ${params.transactionReference}, ${params.currency} ${params.claimAmount.toLocaleString()}).`,
      jurisdiction: saved.jurisdiction,
    });
    await insertNotificationRow({
      type: "DISPUTE_UPDATE",
      title: `Dispute opened: ${saved.disputeNumber}`,
      body: `${params.category} — ${params.customerName} (${params.currency} ${params.claimAmount.toLocaleString()})`,
      href: `/support/disputes/${saved.id}`,
    });
    return { ok: true, data: saved };
  }

  async advanceDispute(disputeId: string, to: SupportDispute["status"], actor: SupportActor, detail?: string): Promise<EngineResult<SupportDispute>> {
    if (!hasCapability(actor.role, "update_dispute")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot update disputes." };
    }
    const row = await getDisputeRow(disputeId);
    if (!row) return { ok: false, code: "DISPUTE_NOT_FOUND", error: "Dispute not found." };
    const now = new Date().toISOString();
    const timeline = ((row.timeline as SupportDispute["timeline"]) || []).concat([
      { label: `Status → ${to}${detail ? ` — ${detail}` : ""}`, by: actor.name, at: now },
    ]);
    const updated = await updateDisputeRow(row.id, { status: to, timeline });
    if (!updated) return { ok: false, code: "DISPUTE_NOT_FOUND", error: "Dispute vanished." };
    await insertAuditRow({
      id: auditId(),
      officer_id: actor.officerId,
      officer_name: actor.name,
      officer_role: actor.role,
      action: "DISPUTE_STATUS_CHANGED",
      entity_type: "SUPPORT_DISPUTE",
      entity_id: row.id,
      details: `${row.dispute_number} status ${row.status} → ${to}`,
      jurisdiction: row.jurisdiction,
    });
    return { ok: true, data: await disputeRowToDispute(updated) };
  }

  /**
   * Financial decision (spec §29/§31): only decisionOwner-matched specialists
   * or the Support Manager may decide. Approved refund/reversal creates a
   * recovery case in the AUTHORITATIVE DisputeChargebackEngine — Support
   * never writes balances.
   */
  async decideDispute(
    disputeId: string,
    params: { type: DisputeDecisionType; reason: string },
    actor: SupportActor,
  ): Promise<EngineResult<SupportDispute & { recoveryCaseReference?: string }>> {
    if (!hasCapability(actor.role, "decide_dispute")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot record dispute decisions." };
    }
    const row = await getDisputeRow(disputeId);
    if (!row) return { ok: false, code: "DISPUTE_NOT_FOUND", error: "Dispute not found." };
    if (actor.role !== row.decision_owner && actor.role !== "SUPPORT_MANAGER" && actor.role !== "SUPER_ADMIN") {
      return { ok: false, code: "FORBIDDEN_DECISION_OWNER", error: `This dispute must be decided by ${row.decision_owner} (or the Support Manager).` };
    }

    const now = new Date().toISOString();
    let recoveryCaseReference: string | undefined;

    const financial = ["REFUND_APPROVED", "REVERSAL_APPROVED", "PARTIAL_REFUND"].includes(params.type);
    if (financial) {
      try {
        const recovery = DisputeChargebackEngine.getInstance().createDispute({
          transactionReference: row.transaction_reference,
          claimantId: row.customer_id,
          claimantName: row.customer_name,
          claimantType: row.customer_id.startsWith("MCH") ? "MERCHANT" : row.customer_id.startsWith("AGT") ? "AGENT" : "CUSTOMER",
          category:
            row.category === "DUPLICATE" ? "DUPLICATE_CHARGE"
            : row.category === "UNAUTHORIZED" ? "TRANSACTION_NOT_RECOGNIZED"
            : row.category === "CHARGED_NOT_RECEIVED" ? "SERVICE_NOT_RECEIVED"
            : row.category === "FAILED_TRANSACTION" ? "POS_CASH_DISPENSE_ERROR"
            : "OTHER",
          claimAmount: Number(row.claim_amount),
          currency: row.currency,
          priority: row.priority === "CRITICAL" ? "P0" : row.priority === "HIGH" || row.priority === "URGENT" ? "P1" : "P2",
        });
        recoveryCaseReference = recovery.disputeReference;
      } catch {
        return { ok: false, code: "RECOVERY_ENGINE_FAILURE", error: "The recovery engine could not accept the case. No balance was touched — retry." };
      }
    }

    const isFinal = params.type !== "UNDER_INVESTIGATION";
    const timeline = ((row.timeline as SupportDispute["timeline"]) || []).concat([
      { label: `Decision: ${params.type}${recoveryCaseReference ? ` (recovery case ${recoveryCaseReference})` : ""}`, detail: params.reason, by: actor.name, at: now },
    ]);
    const updated = await updateDisputeRow(row.id, {
      decision_type: params.type,
      decided_by_officer_id: actor.officerId,
      decision_reason: params.reason,
      decided_at: now,
      status: isFinal ? (params.type === "REJECTED" || params.type === "UNDER_INVESTIGATION" ? "DECISION" : "RESOLVED") : "UNDER_REVIEW",
      resolved_at: isFinal && params.type !== "REJECTED" ? now : null,
      recovery_case_reference: recoveryCaseReference ?? row.recovery_case_reference,
      timeline,
    });
    if (!updated) return { ok: false, code: "DISPUTE_NOT_FOUND", error: "Dispute vanished." };

    await insertEventRow({
      ticket_id: row.ticket_id,
      event_type: params.type === "REFUND_APPROVED" || params.type === "PARTIAL_REFUND" ? "REFUND_REQUESTED" : "DISPUTE_LINKED",
      actor_id: actor.officerId,
      actor_name: actor.name,
      actor_role: actor.role,
      payload: { disputeId: row.id, decision: params.type, recoveryCaseReference },
    });
    await insertAuditRow({
      id: auditId(),
      officer_id: actor.officerId,
      officer_name: actor.name,
      officer_role: actor.role,
      action: `DISPUTE_DECISION_${params.type.replace("_APPROVED", "")}`,
      entity_type: "SUPPORT_DISPUTE",
      entity_id: row.id,
      details: `${row.dispute_number}: ${params.type}. ${params.reason}${recoveryCaseReference ? ` Recovery case ${recoveryCaseReference} created in the authoritative recovery engine.` : ""}`,
      jurisdiction: row.jurisdiction,
    });
    await insertNotificationRow({
      type: "DISPUTE_UPDATE",
      title: `Dispute decision: ${row.dispute_number}`,
      body: `${params.type} — ${params.reason}`,
      href: `/support/disputes/${row.id}`,
    });
    const dispute = await disputeRowToDispute(updated);
    return { ok: true, data: { ...dispute, recoveryCaseReference } };
  }

  /* ======================================================= escalations */

  async createEscalation(
    params: { ticketId: string; reason: string; destination: EscalationDestination; priority?: TicketPriority; assignedToName?: string },
    actor: SupportActor,
  ): Promise<EngineResult<SupportEscalation>> {
    if (!hasCapability(actor.role, "create_escalation")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot create escalations." };
    }
    const allowed = allowedEscalationDestinations(actor.role);
    if (!allowed.includes(params.destination)) {
      return { ok: false, code: "FORBIDDEN_DESTINATION", error: `Role ${actor.role} cannot escalate to ${params.destination}. Allowed: ${allowed.join(", ") || "none (use reassignment instead)"}.` };
    }
    const ticketRow = await getTicketRow(params.ticketId);
    if (!ticketRow) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };

    const escalationNumber = await nextEscalationNumber();
    const priority = params.priority ?? ticketRow.priority;
    const row = await insertEscalationRow({
      escalation_number: escalationNumber,
      ticket_id: ticketRow.id,
      reason: params.reason,
      priority,
      destination: params.destination,
      status: "PENDING",
      sla_due_at: new Date(Date.now() + SUPPORT_SLA_POLICY[priority].resolutionHours * 3600e3).toISOString(),
      created_by_officer_id: actor.officerId,
    });
    const saved = await escalationRowToEscalation(row);

    const tr = await this.transition(ticketRow.id, "ESCALATED", actor, { reason: `Escalated to ${params.destination}` });
    await insertAuditRow({
      id: auditId(),
      officer_id: actor.officerId,
      officer_name: actor.name,
      officer_role: actor.role,
      action: "TICKET_ESCALATED",
      entity_type: "SUPPORT_ESCALATION",
      entity_id: saved.id,
      details: `Escalated ${ticketRow.ticket_number} to ${params.destination}: ${params.reason}. Ticket transition: ${tr.ok ? "ESCALATED" : tr.error}`,
      jurisdiction: ticketRow.jurisdiction,
    });
    await insertNotificationRow({
      type: "ESCALATION",
      title: `Escalated to ${params.destination}: ${ticketRow.ticket_number}`,
      body: params.reason,
      ticket_id: ticketRow.id,
      href: `/support/escalations/${saved.id}`,
    });
    return { ok: true, data: saved };
  }

  async updateEscalation(
    escalationId: string,
    updates: Partial<Pick<SupportEscalation, "status" | "resolutionNote" | "assignedToName">>,
    actor: SupportActor,
  ): Promise<EngineResult<SupportEscalation>> {
    if (!hasCapability(actor.role, "manage_tasks")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot update escalations." };
    }
    const row = await getEscalationRow(escalationId);
    if (!row) return { ok: false, code: "ESCALATION_NOT_FOUND", error: "Escalation not found." };
    const now = new Date().toISOString();
    const updated = await updateEscalationRow(row.id, {
      status: updates.status,
      resolution_note: updates.resolutionNote,
      resolved_at: updates.status === "RESOLVED" ? now : row.resolved_at,
    });
    if (!updated) return { ok: false, code: "ESCALATION_NOT_FOUND", error: "Escalation vanished." };
    const ticketRow = await getTicketRow(row.ticket_id);
    await insertAuditRow({
      id: auditId(),
      officer_id: actor.officerId,
      officer_name: actor.name,
      officer_role: actor.role,
      action: "ESCALATION_UPDATED",
      entity_type: "SUPPORT_ESCALATION",
      entity_id: row.id,
      details: `${row.escalation_number} → ${updates.status ?? row.status}`,
      jurisdiction: (ticketRow?.jurisdiction as SupportJurisdiction | undefined) ?? "CROSS_BORDER",
    });
    return { ok: true, data: await escalationRowToEscalation(updated) };
  }

  /* ============================================================= tasks */

  async addTask(
    params: { title: string; description?: string; priority?: TicketPriority; ticketId?: string; customerId?: string; assignedToId?: string; dueAt?: string },
    actor: SupportActor,
  ): Promise<EngineResult<SupportTask>> {
    if (!hasCapability(actor.role, "manage_tasks")) {
      return { ok: false, code: "FORBIDDEN", error: "Your role cannot create tasks." };
    }
    if (!params.title || !params.title.trim()) {
      return { ok: false, code: "VALIDATION_FAILED", error: "Task title is required." };
    }
    let assignedToId: string | undefined;
    if (params.assignedToId) {
      const officer = await getOfficerRow(params.assignedToId);
      if (!officer) return { ok: false, code: "OFFICER_NOT_FOUND", error: "Assignee not found." };
      assignedToId = officer.id;
    }
    const row = await insertTaskRow({
      title: params.title,
      description: params.description,
      priority: params.priority ?? "NORMAL",
      ticket_id: params.ticketId,
      customer_id: params.customerId,
      assigned_to_officer_id: assignedToId,
      created_by_officer_id: actor.officerId,
      due_at: params.dueAt ?? new Date(Date.now() + 24 * 3600e3).toISOString(),
      status: "OPEN",
    });
    return { ok: true, data: await taskRowToTask(row) };
  }

  /* ============================================================== csat */

  async submitCsat(
    ticketId: string,
    params: { rating: 1 | 2 | 3 | 4 | 5; comment?: string; language?: ArticleLanguage },
    actor: SupportActor,
  ): Promise<EngineResult<import("@/types/supportOps").SupportCsatRecord>> {
    const row = await getTicketRow(ticketId);
    if (!row) return { ok: false, code: "TICKET_NOT_FOUND", error: "Ticket not found." };
    if (row.status !== "RESOLVED" && row.status !== "CLOSED") {
      return { ok: false, code: "CSAT_NOT_APPLICABLE", error: "Satisfaction can only be recorded on resolved or closed tickets." };
    }
    const now = new Date().toISOString();
    const csatRow = await insertCsatRow({
      ticket_id: row.id,
      customer_name: row.customer_name,
      rating: params.rating,
      comment: params.comment,
      language: params.language ?? row.language,
      submitted_at: now,
    });
    await updateTicketRow(row.id, { satisfaction_rating: params.rating, satisfaction_comment: params.comment });
    await insertEventRow({
      ticket_id: row.id,
      event_type: "CSAT_SUBMITTED",
      actor_id: row.customer_id,
      actor_name: row.customer_name,
      actor_role: "CUSTOMER",
      payload: { rating: params.rating },
      request_id: actor.requestId,
    });
    return { ok: true, data: csatRowToRecord(csatRow) };
  }

  /* ========================================================== overview */

  async getOverview(range: "24H" | "7D" | "30D" | "90D" = "24H"): Promise<SupportOverviewPayload> {
    await this.sweepAutoClose();
    const now = Date.now();
    const { rows: openRows } = await listTicketRows({ openOnly: true, limit: 2000 });
    const open = await Promise.all(openRows.map((t) => ticketRowToTicket(t)));
    const snapshots = new Map(
      open.map((t, i) => [t.id, this.computeSla(t, Number(openRows[i].resolution_paused_ms ?? 0), openRows[i].resolution_paused_since ?? undefined, now)]),
    );

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { rows: allRows } = await listTicketRows({ limit: 5000 });
    const resolvedToday = allRows.filter((t) => t.resolved_at && new Date(t.resolved_at).getTime() >= dayStart.getTime()).length;

    const critical = open.filter((t) => t.priority === "CRITICAL");
    const slaAtRisk = open.filter((t) => {
      const s = snapshots.get(t.id)!;
      return s.resolutionState === "AT_RISK" || s.resolutionState === "BREACHED" || s.state === "AT_RISK";
    });
    const waiting = open.filter((t) => t.status === "WAITING_FOR_CUSTOMER");
    const unassigned = open.filter((t) => !t.assignedOfficerId);

    const escalationRows = await listEscalationRows({});
    const fraudEscalations = escalationRows.filter((e) => e.destination === "FRAUD_RISK" && e.status !== "RESOLVED");
    const disputeRows = await listDisputeRows({ limit: 2000 });
    const txDisputes = disputeRows.filter((d) => d.status !== "RESOLVED" && d.status !== "CLOSED");
    const bankingIssues = open.filter(
      (t) => t.category === "AGENT_FLOAT" || t.category === "MERCHANT_SETTLEMENT" || t.category === "FAILED_TRANSACTION" || t.tags.some((tag) => /coris|providus|nip|waemu/i.test(tag)),
    );

    const [trend, categories, serviceHealth, recent] = await Promise.all([
      this.buildTrend(range, allRows),
      this.buildCategoryCounts(open),
      this.buildServiceHealth(),
      recentEvents(10),
    ]);

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
      trend,
      categories,
      serviceHealth,
      recentActivity: recent.map(eventRowToEvent),
    };
  }

  private buildTrend(range: "24H" | "7D" | "30D" | "90D", allRows: Array<{ created_at: string; resolved_at: string | null }>) {
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
    for (let i = 0; i < buckets; i++) labels.push(fmt(new Date(start + i * bucketMs)));
    const bucketIndex = (iso: string) => {
      const t = new Date(iso).getTime();
      if (t < start || t > now) return -1;
      return Math.min(buckets - 1, Math.floor((t - start) / bucketMs));
    };
    for (const t of allRows) {
      const ci = bucketIndex(t.created_at);
      if (ci >= 0) created[ci]++;
      if (t.resolved_at) {
        const ri = bucketIndex(t.resolved_at);
        if (ri >= 0) resolved[ri]++;
      }
    }
    const resolvedInWindow = allRows.filter((t) => t.resolved_at && new Date(t.resolved_at).getTime() >= start);
    const avgResolutionHours =
      resolvedInWindow.length === 0
        ? 0
        : Math.round((resolvedInWindow.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / resolvedInWindow.length / 3600e3) * 10) / 10;
    return { range, created, resolved, reopened, avgResolutionHours, labels };
  }

  private buildCategoryCounts(open: SupportTicket[]) {
    const counts = new Map<TicketCategory, number>();
    for (const t of open) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    const all: { key: TicketCategory; label: string }[] = [
      { key: "TRANSFER", label: "Transfers" }, { key: "PENDING_TRANSACTION", label: "Pending" },
      { key: "FAILED_TRANSACTION", label: "Failed" }, { key: "REFUND", label: "Refunds" },
      { key: "REVERSAL", label: "Reversals" }, { key: "WALLET", label: "Wallet" },
      { key: "DEPOSIT", label: "Funding" }, { key: "WITHDRAWAL", label: "Withdrawals" },
      { key: "CARD", label: "Cards" }, { key: "KYC_TIER", label: "KYC" },
      { key: "FRAUD_SECURITY", label: "Security" }, { key: "LOGIN_ACCESS", label: "Account Access" },
      { key: "AGENT_FLOAT", label: "Agent Float" }, { key: "MERCHANT_SETTLEMENT", label: "Merchants" },
      { key: "TECHNICAL_API", label: "Technical" }, { key: "BILLS", label: "Bills" },
      { key: "AIRTIME", label: "Airtime" }, { key: "DATA", label: "Data" },
      { key: "COMMISSION", label: "Commissions" }, { key: "COMPLAINT", label: "Complaints" },
    ];
    return all.map(({ key, label }) => ({ key, label, count: counts.get(key) ?? 0 })).filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  }

  /**
   * Live service health — derived directly from the same real tables the
   * customer/agency portals write to (single source of truth, spec §15).
   * No fabricated in-memory ledger/identity engines are consulted here.
   */
  private async buildServiceHealth() {
    const checkedAt = new Date().toISOString();
    const admin = (await import("@/lib/supabase/admin")).getSupabaseAdminClient();
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();

    const [custTxRes, agencyTxRes, pendingKycRes, notifRes] = await Promise.all([
      admin.from("customer_transactions").select("status", { count: "exact", head: false }).gte("created_at", since).limit(1000),
      admin.from("agency_transactions").select("status", { count: "exact", head: false }).gte("created_at", since).limit(1000),
      admin.from("customers").select("id", { count: "exact", head: true }).eq("kyc_tier", "TIER_0"),
      admin.from("support_notifications").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);

    const txRows = [...(custTxRes.data || []), ...(agencyTxRes.data || [])] as { status: string }[];
    const failed = txRows.filter((t) => t.status === "FAILED").length;
    const pendingProvider = txRows.filter((t) => t.status === "PENDING_PROVIDER_INTEGRATION").length;
    const failureRatePct = txRows.length ? Math.round((failed / txRows.length) * 1000) / 10 : 0;
    const txStatus: "OPERATIONAL" | "DEGRADED" | "OUTAGE" = failureRatePct > 25 ? "OUTAGE" : failureRatePct > 8 ? "DEGRADED" : "OPERATIONAL";

    return [
      {
        key: "transaction_engine",
        label: "Transaction Engine",
        status: txStatus,
        detail: `${txRows.length} transactions in the last 24h · ${failed} failed (${failureRatePct}%) · ${pendingProvider} pending provider confirmation.`,
        checkedAt,
      },
      {
        key: "kyc",
        label: "KYC / Identity",
        status: "OPERATIONAL" as const,
        detail: `${pendingKycRes.count ?? 0} customers at Tier 0 (unverified) awaiting document submission.`,
        checkedAt,
      },
      {
        key: "notifications",
        label: "Notifications / Outbox",
        status: "OPERATIONAL" as const,
        detail: `${notifRes.count ?? 0} support notifications generated in the last 24h.`,
        checkedAt,
      },
      {
        key: "support_database",
        label: "Support Database",
        status: (custTxRes.error || agencyTxRes.error ? "OUTAGE" : "OPERATIONAL") as "OPERATIONAL" | "OUTAGE",
        detail: custTxRes.error || agencyTxRes.error ? `Query error: ${(custTxRes.error || agencyTxRes.error)?.message}` : "All support queries served from the live database.",
        checkedAt,
      },
    ];
  }

  /* ========================================================= analytics */

  async getAnalytics() {
    const now = Date.now();
    const [officerRows, counts, { rows: allTicketRows }, csatRows, escalationRows] = await Promise.all([
      listOfficers(),
      activeTicketCountsByOfficer(),
      listTicketRows({ limit: 5000 }),
      listAllCsat(),
      listEscalationRows({}),
    ]);

    const agents = officerRows
      .filter((o) => o.role !== "SUPPORT_READ_ONLY")
      .map((o) => {
        const mine = allTicketRows.filter((t) => t.assigned_officer_id === o.id);
        const resolved = mine.filter((t) => t.resolved_at);
        const openCount = mine.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length;
        const responded = mine.filter((t) => t.first_responded_at);
        const avgResponseMin =
          responded.length === 0 ? 0 : Math.round(responded.reduce((s, t) => s + (new Date(t.first_responded_at!).getTime() - new Date(t.created_at).getTime()), 0) / responded.length / 60e3);
        const avgResolutionH =
          resolved.length === 0 ? 0 : Math.round((resolved.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / resolved.length / 3600e3) * 10) / 10;
        const slaMet =
          resolved.length === 0
            ? 100
            : Math.round(
                (resolved.filter((t) => {
                  const spec = SUPPORT_SLA_POLICY[t.priority];
                  return new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime() <= spec.resolutionHours * 3600e3 + 60e3;
                }).length / resolved.length) * 100,
              );
        const resolvedIds = new Set(resolved.map((t) => t.id));
        const myCsat = csatRows.filter((c) => resolvedIds.has(c.ticket_id));
        const csat = myCsat.length === 0 ? null : Math.round((myCsat.reduce((s, c) => s + c.rating, 0) / myCsat.length) * 10) / 10;
        return {
          officerId: o.id,
          name: o.full_name,
          role: o.role,
          jurisdiction: o.jurisdiction,
          languages: o.languages,
          load: counts.get(o.id) ?? 0,
          capacity: o.max_capacity,
          open: openCount,
          resolved: resolved.length,
          avgResponseMin,
          avgResolutionH,
          slaPct: slaMet,
          csat,
          qaScore: Number(o.qa_score),
        };
      });

    const allResolved = allTicketRows.filter((t) => t.resolved_at);
    const csatDist = [1, 2, 3, 4, 5].map((r) => csatRows.filter((c) => c.rating === r).length);
    const slaCompliancePct =
      allResolved.length === 0
        ? 100
        : Math.round(
            (allResolved.filter((t) => {
              const spec = SUPPORT_SLA_POLICY[t.priority];
              return new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime() <= spec.resolutionHours * 3600e3 + 60e3;
            }).length / allResolved.length) * 100,
          );
    const escalationRatePct = allTicketRows.length === 0 ? 0 : Math.round((escalationRows.length / allTicketRows.length) * 1000) / 10;
    const reopenedCount = allTicketRows.filter((t) => t.status === "REOPENED").length;

    const agentStats = agents.map((a) => {
      const mine = allTicketRows.filter((t) => t.assigned_officer_id === a.officerId);
      const mineIds = new Set(mine.map((t) => t.id));
      return {
        officerId: a.officerId,
        officerName: a.name,
        role: a.role,
        resolved: a.resolved,
        open: a.open,
        avgResolutionHours: a.avgResolutionH,
        csatAvg: a.csat,
        escalations: escalationRows.filter((e) => mineIds.has(e.ticket_id)).length,
        reopens: mine.filter((t) => t.status === "REOPENED").length,
        slaComplianceRate: a.slaPct,
      };
    });

    const resolutionByPriority = (["CRITICAL", "URGENT", "HIGH", "NORMAL", "LOW"] as const).map((p) => {
      const list = allResolved.filter((t) => t.priority === p);
      const withinTarget = list.filter((t) => {
        const spec = SUPPORT_SLA_POLICY[t.priority];
        return new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime() <= spec.resolutionHours * 3600e3 + 60e3;
      }).length;
      return { priority: p, resolved: list.length, withinTarget, rate: list.length === 0 ? 100 : Math.round((withinTarget / list.length) * 100) };
    });

    const distribution: Record<string, number> = {};
    for (const r of [1, 2, 3, 4, 5]) distribution[String(r)] = csatRows.filter((c) => c.rating === r).length;
    const byLanguage = (["en", "fr", "ha"] as const)
      .map((lang) => {
        const list = csatRows.filter((c) => c.language === lang);
        return { language: lang, count: list.length, average: list.length ? Math.round((list.reduce((s, c) => s + c.rating, 0) / list.length) * 10) / 10 : null };
      })
      .filter((l) => l.count > 0);

    return {
      agents,
      overall: {
        slaCompliancePct,
        csatAverage: csatRows.length ? Math.round((csatRows.reduce((s, c) => s + c.rating, 0) / csatRows.length) * 10) / 10 : null,
        csatDistribution: csatDist,
        csatCount: csatRows.length,
        escalationRatePct,
        reopenRatePct: allTicketRows.length ? Math.round((reopenedCount / allTicketRows.length) * 1000) / 10 : 0,
        nowIso: new Date(now).toISOString(),
      },
      agentStats,
      slaComplianceRate: slaCompliancePct,
      resolutionByPriority,
      csat: {
        average: csatRows.length ? Math.round((csatRows.reduce((s, c) => s + c.rating, 0) / csatRows.length) * 10) / 10 : null,
        count: csatRows.length,
        distribution,
        byLanguage,
      },
    };
  }

  /* =========================================================== search */

  async search(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return { customers: [], tickets: [], transactions: [], disputes: [], escalations: [], knowledge: [] };

    const { searchCustomersAndAgents } = await import("./SupportContexts");
    const [customerRows, { rows: ticketRows }, disputeRows, escalationRows, knowledgeRows] = await Promise.all([
      searchCustomersAndAgents(q, 5),
      listTicketRows({ search: q, limit: 5 }),
      listDisputeRows({ limit: 2000 }),
      listEscalationRows({}),
      import("./supportDb").then((m) => m.listKnowledgeRows({ status: "PUBLISHED" })),
    ]);

    const customers = customerRows.slice(0, 5).map((c) => ({ id: c.id, name: c.name, country: c.country, status: c.status, href: `/support/customers/${c.id}` }));
    const tickets = ticketRows.slice(0, 5).map((t) => ({ id: t.id, number: t.ticket_number, subject: t.subject, status: t.status, href: `/support/tickets/${t.id}` }));
    const disputes = disputeRows
      .filter((d) => d.dispute_number.toLowerCase().includes(q) || d.transaction_reference.toLowerCase().includes(q) || d.customer_name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((d) => ({ id: d.id, number: d.dispute_number, category: d.category, status: d.status, href: `/support/disputes/${d.id}` }));
    const escalations = escalationRows
      .filter((e) => e.escalation_number.toLowerCase().includes(q) || e.reason.toLowerCase().includes(q))
      .slice(0, 5)
      .map((e) => ({ id: e.id, number: e.escalation_number, destination: e.destination, status: e.status, href: `/support/escalations/${e.id}` }));
    const knowledge = knowledgeRows
      .filter((k) => {
        const en = (k.body_en as { title?: string })?.title?.toLowerCase() ?? "";
        const fr = (k.body_fr as { title?: string })?.title?.toLowerCase() ?? "";
        const ha = (k.body_ha as { title?: string })?.title?.toLowerCase() ?? "";
        return en.includes(q) || fr.includes(q) || ha.includes(q) || (k.tags || []).some((t) => t.toLowerCase().includes(q));
      })
      .slice(0, 5)
      .map((k) => ({ id: k.id, title: (k.body_en as { title?: string })?.title ?? "", category: k.category, href: `/support/knowledge/${k.id}` }));

    // Transactions: search the real customer_transactions/agency_transactions tables.
    const admin = (await import("@/lib/supabase/admin")).getSupabaseAdminClient();
    const like = `%${q.replace(/[%,()]/g, "")}%`;
    const { data: custTx } = await admin
      .from("customer_transactions")
      .select("id, reference, amount, currency, status")
      .or(`reference.ilike.${like},recipient_name.ilike.${like}`)
      .limit(5);
    const transactions = (custTx || []).map((t: any) => ({ id: t.id, reference: t.reference, currency: t.currency, amount: Number(t.amount), status: t.status, href: `/support/transactions/${t.id}` }));

    return { customers, tickets, transactions, disputes, escalations, knowledge };
  }
}

let engineInstance: SupportOpsEngine | undefined;
export function getSupportOpsEngine(): SupportOpsEngine {
  if (!engineInstance) engineInstance = new SupportOpsEngine();
  return engineInstance;
}
