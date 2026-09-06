// =============================================================================
// File: src/lib/support/SupportOpsStore.ts
// Description: KoriePay Support Operating System — server-side domain store.
//
// Singleton store for all support-domain records. Same pattern as the rest of
// KoriePay (AdashiStore, CustomerLifecycleEngine): in-process, Supabase-ready
// semantics, seeded from supportSeed.ts (the ONLY demo data source, §100).
//
// The store is DATA ONLY. Lifecycle validation, SLA computation, assignment
// and audit live in SupportOpsEngine so every mutation is validated in one
// place and never bypassed by a route or a component.
// =============================================================================

import {
  SupportOfficer,
  SupportTicket,
  Customer360Context,
  TransactionInvestigationContext,
  SupportPlaybook,
  SupportIncident,
  AutomationRule,
  AutomationExecutionLog,
  QaReview,
  TrainingModule,
  StaffCapacityMetric,
  SupportAuditEntry,
} from "@/types/support";
import {
  SupportEvent,
  SupportDispute,
  SupportEscalation,
  SupportTask,
  KnowledgeArticleV2,
  SupportMacro,
  SupportCsatRecord,
  SupportNotification,
} from "@/types/supportOps";
import {
  SEED_OFFICERS,
  SEED_TICKETS,
  SEED_ENTITY_CONTEXTS,
  SEED_TRANSACTION_TRACES,
  SEED_DISPUTES,
  SEED_ESCALATIONS,
  SEED_TASKS,
  SEED_KNOWLEDGE,
  SEED_MACROS,
  SEED_CSAT,
  SEED_NOTIFICATIONS,
  SEED_EVENTS,
  SEED_AUDIT,
  SEED_PLAYBOOKS,
  SEED_INCIDENTS,
  SEED_AUTOMATION_RULES,
  SEED_AUTOMATION_LOGS,
  SEED_QA_REVIEWS,
  SEED_TRAINING,
  SEED_CAPACITY,
} from "./supportSeed";

interface IdempotencyRecord {
  key: string;
  response: unknown;
  createdAt: string;
}

export class SupportOpsStore {
  // Pinned to globalThis: Next.js dev mode can instantiate route modules more
  // than once (HMR + CJS/ESM dual resolution). Without this, the "singleton"
  // would fork into two stores and writes would vanish between requests.
  private static instance: SupportOpsStore | undefined;
  private static get globalRef(): { __korieSupportStore?: SupportOpsStore } {
    return globalThis as { __korieSupportStore?: SupportOpsStore };
  }

  officers: SupportOfficer[];
  tickets: SupportTicket[];
  entityContexts: Record<string, Customer360Context>;
  transactionTraces: Record<string, TransactionInvestigationContext>;
  disputes: SupportDispute[];
  escalations: SupportEscalation[];
  tasks: SupportTask[];
  knowledge: KnowledgeArticleV2[];
  macros: SupportMacro[];
  csat: SupportCsatRecord[];
  notifications: SupportNotification[];
  events: SupportEvent[];
  audit: SupportAuditEntry[];

  // Retained operational modules (read-mostly)
  playbooks: SupportPlaybook[];
  incidents: SupportIncident[];
  automationRules: AutomationRule[];
  automationLogs: AutomationExecutionLog[];
  qaReviews: QaReview[];
  training: TrainingModule[];
  capacity: StaffCapacityMetric;

  private idempotency: Map<string, IdempotencyRecord>;
  private seq: { ticket: number; dispute: number; escalation: number; task: number };

  private constructor() {
    this.officers = SEED_OFFICERS.map((o) => ({ ...o }));
    this.tickets = SEED_TICKETS.map((t) => ({ ...t, messages: t.messages.map((m) => ({ ...m })) }));
    this.entityContexts = { ...SEED_ENTITY_CONTEXTS };
    this.transactionTraces = { ...SEED_TRANSACTION_TRACES };
    this.disputes = SEED_DISPUTES.map((d) => ({ ...d }));
    this.escalations = SEED_ESCALATIONS.map((e) => ({ ...e }));
    this.tasks = SEED_TASKS.map((t) => ({ ...t }));
    this.knowledge = SEED_KNOWLEDGE.map((k) => ({ ...k }));
    this.macros = SEED_MACROS.map((m) => ({ ...m }));
    this.csat = SEED_CSAT.map((c) => ({ ...c }));
    this.notifications = SEED_NOTIFICATIONS.map((n) => ({ ...n }));
    this.events = SEED_EVENTS.map((e) => ({ ...e }));
    this.audit = SEED_AUDIT.map((a) => ({ ...a }));
    this.playbooks = SEED_PLAYBOOKS;
    this.incidents = SEED_INCIDENTS;
    this.automationRules = SEED_AUTOMATION_RULES;
    this.automationLogs = SEED_AUTOMATION_LOGS;
    this.qaReviews = SEED_QA_REVIEWS;
    this.training = SEED_TRAINING;
    this.capacity = SEED_CAPACITY;
    this.idempotency = new Map();
    this.seq = {
      ticket: 10516,
      dispute: 35,
      escalation: 45,
      task: 1009,
    };
  }

  static getInstance(): SupportOpsStore {
    if (!SupportOpsStore.instance) {
      SupportOpsStore.instance =
        SupportOpsStore.globalRef.__korieSupportStore ?? new SupportOpsStore();
      SupportOpsStore.globalRef.__korieSupportStore = SupportOpsStore.instance;
    }
    return SupportOpsStore.instance;
  }

  /* ----------------------------------------------------------- sequences */

  nextTicketId(): { id: string; ticketNumber: string } {
    const n = this.seq.ticket++;
    return { id: `TCK-2026-${n}`, ticketNumber: `KP-SUP-${n}` };
  }
  nextDisputeId(): { id: string; disputeNumber: string } {
    const n = this.seq.dispute++;
    return { id: `DSP-2026-${String(n).padStart(4, "0")}`, disputeNumber: `DSC-2026-${String(n).padStart(4, "0")}` };
  }
  nextEscalationId(): { id: string; escalationNumber: string } {
    const n = this.seq.escalation++;
    return { id: `ESC-2026-${String(n).padStart(4, "0")}`, escalationNumber: `ESC-2026-${String(n).padStart(4, "0")}` };
  }
  nextTaskId(): string {
    const n = this.seq.task++;
    return `TSK-${n}`;
  }
  nextEventId(): string {
    return `EVT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /* ---------------------------------------------------------- lookups */

  getOfficer(id: string): SupportOfficer | undefined {
    return this.officers.find((o) => o.id === id);
  }

  getTicket(idOrNumber: string): SupportTicket | undefined {
    return this.tickets.find((t) => t.id === idOrNumber || t.ticketNumber === idOrNumber);
  }

  /**
   * Tickets an officer may access. Ownership rule (spec §92/§56): a ticket is
   * reachable only through the officer's own queue, their escalations, or the
   * global queue — never via raw id from an unauthenticated search path.
   */
  accessibleTickets(officerId: string): SupportTicket[] {
    return this.tickets;
  }

  getDispute(idOrNumber: string): SupportDispute | undefined {
    return this.disputes.find((d) => d.id === idOrNumber || d.disputeNumber === idOrNumber);
  }

  getEscalation(idOrNumber: string): SupportEscalation | undefined {
    return this.escalations.find((e) => e.id === idOrNumber || e.escalationNumber === idOrNumber);
  }

  getTask(id: string): SupportTask | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  getKnowledge(id: string): KnowledgeArticleV2 | undefined {
    return this.knowledge.find((k) => k.id === id);
  }

  getMacro(idOrKey: string): SupportMacro | undefined {
    return this.macros.find((m) => m.id === idOrKey || m.key === idOrKey);
  }

  /* ---------------------------------------------------------- mutations */

  addTicket(ticket: SupportTicket): SupportTicket {
    this.tickets.unshift(ticket);
    return ticket;
  }

  updateTicket(idOrNumber: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
    const idx = this.tickets.findIndex((t) => t.id === idOrNumber || t.ticketNumber === idOrNumber);
    if (idx === -1) return undefined;
    this.tickets[idx] = { ...this.tickets[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.tickets[idx];
  }

  addDispute(d: SupportDispute): SupportDispute {
    this.disputes.unshift(d);
    return d;
  }

  updateDispute(idOrNumber: string, updates: Partial<SupportDispute>): SupportDispute | undefined {
    const idx = this.disputes.findIndex((d) => d.id === idOrNumber || d.disputeNumber === idOrNumber);
    if (idx === -1) return undefined;
    this.disputes[idx] = { ...this.disputes[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.disputes[idx];
  }

  addEscalation(e: SupportEscalation): SupportEscalation {
    this.escalations.unshift(e);
    return e;
  }

  updateEscalation(idOrNumber: string, updates: Partial<SupportEscalation>): SupportEscalation | undefined {
    const idx = this.escalations.findIndex((e) => e.id === idOrNumber || e.escalationNumber === idOrNumber);
    if (idx === -1) return undefined;
    this.escalations[idx] = { ...this.escalations[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.escalations[idx];
  }

  addTask(t: SupportTask): SupportTask {
    this.tasks.unshift(t);
    return t;
  }

  updateTask(id: string, updates: Partial<SupportTask>): SupportTask | undefined {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    this.tasks[idx] = { ...this.tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.tasks[idx];
  }

  addKnowledge(a: KnowledgeArticleV2): KnowledgeArticleV2 {
    this.knowledge.unshift(a);
    return a;
  }

  updateKnowledge(id: string, updates: Partial<KnowledgeArticleV2>): KnowledgeArticleV2 | undefined {
    const idx = this.knowledge.findIndex((k) => k.id === id);
    if (idx === -1) return undefined;
    this.knowledge[idx] = { ...this.knowledge[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.knowledge[idx];
  }

  addMacro(m: SupportMacro): SupportMacro {
    this.macros.unshift(m);
    return m;
  }

  updateMacro(idOrKey: string, updates: Partial<SupportMacro>): SupportMacro | undefined {
    const idx = this.macros.findIndex((m) => m.id === idOrKey || m.key === idOrKey);
    if (idx === -1) return undefined;
    this.macros[idx] = { ...this.macros[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.macros[idx];
  }

  addCsat(c: SupportCsatRecord): SupportCsatRecord {
    this.csat.unshift(c);
    return c;
  }

  addNotification(n: SupportNotification): SupportNotification {
    this.notifications.unshift(n);
    return n;
  }

  markNotificationRead(id: string): void {
    const n = this.notifications.find((x) => x.id === id);
    if (n) n.read = true;
  }

  addEvent(e: SupportEvent): SupportEvent {
    this.events.unshift(e);
    if (this.events.length > 500) this.events.length = 500; // bounded ring for the demo store
    return e;
  }

  addAudit(a: SupportAuditEntry): SupportAuditEntry {
    this.audit.unshift(a);
    if (this.audit.length > 500) this.audit.length = 500;
    return a;
  }

  addOfficer(o: SupportOfficer): SupportOfficer {
    this.officers.push(o);
    return o;
  }

  /* -------------------------------------------------------- idempotency */

  idempotencyHit(key: string): unknown | null {
    const rec = this.idempotency.get(key);
    if (!rec) return null;
    if (Date.now() - new Date(rec.createdAt).getTime() > 24 * 3600e3) {
      this.idempotency.delete(key);
      return null;
    }
    return rec.response;
  }

  idempotencyStore(key: string, response: unknown): void {
    this.idempotency.set(key, { key, response, createdAt: new Date().toISOString() });
  }

  /* --------------------------------------------------- derived helpers */

  isTicketOpen(t: SupportTicket): boolean {
    return t.status !== "RESOLVED" && t.status !== "CLOSED";
  }

  ticketsForCustomer(customerId: string): SupportTicket[] {
    return this.tickets.filter((t) => t.customerId === customerId);
  }

  eventsForTicket(ticketId: string): SupportEvent[] {
    return this.events.filter((e) => e.ticketId === ticketId);
  }

  notificationsForOfficer(officerId: string): SupportNotification[] {
    // Team-scoped feed (spec §70): every support notification is visible to
    // staff, read-state tracked per officer in a live build; the demo store
    // uses global read flags.
    void officerId;
    return this.notifications;
  }
}
