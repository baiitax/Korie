// =============================================================================
// File: src/lib/support/supportDb.ts
// Description: KoriePay Support Operating System — real Supabase data access.
//
// Replaces the in-memory SupportOpsStore (globalThis singleton seeded from
// supportSeed.ts) with genuine reads/writes against the hosted database
// (see migration 20260906000031_support_portal_live.sql). Every function
// here is a thin, typed wrapper around a support_* table (or, for Customer
// 360 / transaction investigation, the SAME customers/wallets/
// customer_transactions/agents/agency_transactions tables the Customer and
// Agency portals already write — no forked ledger, no synthetic data).
//
// Money convention: all support_disputes.claim_amount values are NUMERIC(24,2)
// MAJOR currency units (naira / CFA francs), matching every other live table.
// =============================================================================

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  SupportOfficer,
  SupportTicket,
  TicketMessage,
  SupportRole,
  SupportTier,
  SupportJurisdiction,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  CustomerType,
  SupportChannel,
} from "@/types/support";
import {
  SupportEvent,
  SupportEventType,
  SupportDispute,
  DisputeStatus,
  SupportEscalation,
  EscalationStatus,
  SupportTask,
  SupportTaskStatus,
  KnowledgeArticleV2,
  SupportMacro,
  SupportCsatRecord,
  SupportNotification,
  ArticleLanguage,
} from "@/types/supportOps";

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

/* ============================================================== officers */

export interface OfficerRow {
  id: string;
  org_id: string;
  auth_user_id: string | null;
  officer_code: string;
  full_name: string;
  email: string;
  role: SupportRole;
  tier: SupportTier;
  jurisdiction: SupportJurisdiction;
  languages: string[];
  max_capacity: number;
  status: "ONLINE" | "BUSY" | "ON_BREAK" | "OFFLINE";
  qa_score: string | number;
  skills: string[];
  joined_date: string;
}

export function officerRowToOfficer(o: OfficerRow, activeTicketCount = 0): SupportOfficer {
  return {
    id: o.id,
    fullName: o.full_name,
    email: o.email,
    role: o.role,
    tier: o.tier,
    jurisdiction: o.jurisdiction,
    languages: (o.languages || []) as SupportOfficer["languages"],
    activeTicketCount,
    maxCapacity: o.max_capacity,
    status: o.status,
    qaScore: num(o.qa_score),
    skills: o.skills || [],
    joinedDate: o.joined_date,
  };
}

export async function listOfficers(): Promise<OfficerRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_officers")
    .select("id, org_id, auth_user_id, officer_code, full_name, email, role, tier, jurisdiction, languages, max_capacity, status, qa_score, skills, joined_date")
    .order("full_name", { ascending: true });
  if (error) throw new Error(`OFFICERS_QUERY_FAILED: ${error.message}`);
  return (data || []) as OfficerRow[];
}

export async function getOfficerRow(id: string): Promise<OfficerRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_officers")
    .select("id, org_id, auth_user_id, officer_code, full_name, email, role, tier, jurisdiction, languages, max_capacity, status, qa_score, skills, joined_date")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`OFFICER_QUERY_FAILED: ${error.message}`);
  return (data as OfficerRow) || null;
}

/** Active (open, not resolved/closed) ticket counts keyed by officer id — one query, no N+1. */
export async function activeTicketCountsByOfficer(): Promise<Map<string, number>> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_tickets")
    .select("assigned_officer_id")
    .not("assigned_officer_id", "is", null)
    .not("status", "in", "(RESOLVED,CLOSED)");
  if (error) throw new Error(`ACTIVE_COUNT_QUERY_FAILED: ${error.message}`);
  const map = new Map<string, number>();
  for (const row of data || []) {
    const id = (row as { assigned_officer_id: string }).assigned_officer_id;
    map.set(id, (map.get(id) || 0) + 1);
  }
  return map;
}

/* =============================================================== tickets */

export interface TicketRow {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customer_type: CustomerType;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  jurisdiction: SupportJurisdiction;
  channel: SupportChannel;
  language: ArticleLanguage;
  assigned_officer_id: string | null;
  tier_assigned: SupportTier;
  related_transaction_reference: string | null;
  incident_id: string | null;
  first_response_due_at: string;
  resolution_due_at: string;
  first_responded_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  tags: string[];
  sentiment: SupportTicket["sentiment"];
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  root_cause_category: string | null;
  is_duplicate_of: string | null;
  resolution_paused_ms: number | string;
  resolution_paused_since: string | null;
  created_at: string;
  updated_at: string;
}

const TICKET_COLUMNS =
  "id, ticket_number, subject, description, category, priority, status, customer_type, customer_id, customer_name, customer_email, customer_phone, jurisdiction, channel, language, assigned_officer_id, tier_assigned, related_transaction_reference, incident_id, first_response_due_at, resolution_due_at, first_responded_at, resolved_at, closed_at, tags, sentiment, satisfaction_rating, satisfaction_comment, root_cause_category, is_duplicate_of, resolution_paused_ms, resolution_paused_since, created_at, updated_at";

/** Officer name lookup is joined in-app (small officer roster; avoids a view). */
let officerNameCache: Map<string, string> | null = null;
let officerNameCacheAt = 0;
async function officerNameMap(): Promise<Map<string, string>> {
  if (officerNameCache && Date.now() - officerNameCacheAt < 15_000) return officerNameCache;
  const rows = await listOfficers();
  officerNameCache = new Map(rows.map((o) => [o.id, o.full_name]));
  officerNameCacheAt = Date.now();
  return officerNameCache;
}

export async function ticketRowToTicket(t: TicketRow, messages: TicketMessage[] = []): Promise<SupportTicket> {
  const names = await officerNameMap();
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    subject: t.subject,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    customerType: t.customer_type,
    customerId: t.customer_id,
    customerName: t.customer_name,
    customerEmail: t.customer_email || undefined,
    customerPhone: t.customer_phone || undefined,
    jurisdiction: t.jurisdiction,
    channel: t.channel,
    language: t.language,
    assignedOfficerId: t.assigned_officer_id || undefined,
    assignedOfficerName: t.assigned_officer_id ? names.get(t.assigned_officer_id) : undefined,
    tierAssigned: t.tier_assigned,
    relatedTransactionId: t.related_transaction_reference || undefined,
    incidentId: t.incident_id || undefined,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    firstResponseDueAt: t.first_response_due_at,
    resolutionDueAt: t.resolution_due_at,
    firstRespondedAt: t.first_responded_at || undefined,
    resolvedAt: t.resolved_at || undefined,
    closedAt: t.closed_at || undefined,
    slaStatus: "HEALTHY", // always recomputed by computeSla() — never trusted from storage
    tags: t.tags || [],
    sentiment: t.sentiment,
    satisfactionRating: t.satisfaction_rating ?? undefined,
    satisfactionComment: t.satisfaction_comment || undefined,
    rootCauseCategory: t.root_cause_category || undefined,
    isDuplicateOf: t.is_duplicate_of || undefined,
    messages,
  };
}

export interface TicketFilters {
  status?: TicketStatus;
  openOnly?: boolean;
  priority?: TicketPriority;
  category?: TicketCategory;
  jurisdiction?: string;
  unassigned?: boolean;
  assignedOfficerId?: string;
  customerId?: string;
  search?: string;
  limit?: number;
}

export async function listTicketRows(filters: TicketFilters): Promise<{ rows: TicketRow[]; total: number }> {
  const admin = getSupabaseAdminClient();
  let q = admin.from("support_tickets").select(TICKET_COLUMNS, { count: "exact" });
  if (filters.status) q = q.eq("status", filters.status);
  else if (filters.openOnly) q = q.not("status", "in", "(RESOLVED,CLOSED)");
  if (filters.priority) q = q.eq("priority", filters.priority);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.jurisdiction && filters.jurisdiction !== "ALL") q = q.eq("jurisdiction", filters.jurisdiction);
  if (filters.unassigned) q = q.is("assigned_officer_id", null).not("status", "in", "(RESOLVED,CLOSED)");
  if (filters.assignedOfficerId) q = q.eq("assigned_officer_id", filters.assignedOfficerId);
  if (filters.customerId) q = q.eq("customer_id", filters.customerId);
  if (filters.search) {
    const s = filters.search.replace(/[%,()]/g, "");
    q = q.or(
      `ticket_number.ilike.%${s}%,subject.ilike.%${s}%,customer_name.ilike.%${s}%,customer_id.ilike.%${s}%,related_transaction_reference.ilike.%${s}%`,
    );
  }
  q = q.order("updated_at", { ascending: false }).limit(filters.limit ?? 500);
  const { data, error, count } = await q;
  if (error) throw new Error(`TICKETS_QUERY_FAILED: ${error.message}`);
  return { rows: (data || []) as TicketRow[], total: count ?? (data || []).length };
}

export async function getTicketRow(idOrNumber: string): Promise<TicketRow | null> {
  const admin = getSupabaseAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);
  const { data, error } = await admin
    .from("support_tickets")
    .select(TICKET_COLUMNS)
    .eq(isUuid ? "id" : "ticket_number", idOrNumber)
    .maybeSingle();
  if (error) throw new Error(`TICKET_QUERY_FAILED: ${error.message}`);
  return (data as TicketRow) || null;
}

export async function insertTicketRow(row: Record<string, unknown>): Promise<TicketRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_tickets").insert(row).select(TICKET_COLUMNS).single();
  if (error) throw new Error(`TICKET_INSERT_FAILED: ${error.message}`);
  return data as TicketRow;
}

export async function updateTicketRow(id: string, updates: Record<string, unknown>): Promise<TicketRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_tickets").update(updates).eq("id", id).select(TICKET_COLUMNS).maybeSingle();
  if (error) throw new Error(`TICKET_UPDATE_FAILED: ${error.message}`);
  return (data as TicketRow) || null;
}

export async function nextTicketNumber(): Promise<string> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("next_support_ticket_number");
  if (error) throw new Error(`TICKET_NUMBER_FAILED: ${error.message}`);
  return data as string;
}

/* ------------------------------------------------------------- messages */

export interface MessageRow {
  id: string;
  ticket_id: string;
  sender_type: TicketMessage["senderType"];
  sender_id: string;
  sender_name: string;
  content: string;
  is_internal_note: boolean;
  macro_used: string | null;
  attachments: unknown;
  created_at: string;
}

export function messageRowToMessage(m: MessageRow): TicketMessage {
  return {
    id: m.id,
    ticketId: m.ticket_id,
    senderType: m.sender_type,
    senderId: m.sender_id,
    senderName: m.sender_name,
    content: m.content,
    isInternalNote: m.is_internal_note,
    timestamp: m.created_at,
    macroUsed: m.macro_used || undefined,
  };
}

export async function listMessagesForTicket(ticketId: string): Promise<MessageRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_ticket_messages")
    .select("id, ticket_id, sender_type, sender_id, sender_name, content, is_internal_note, macro_used, attachments, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`MESSAGES_QUERY_FAILED: ${error.message}`);
  return (data || []) as MessageRow[];
}

export async function insertMessageRow(row: Record<string, unknown>): Promise<MessageRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_ticket_messages").insert(row).select("*").single();
  if (error) throw new Error(`MESSAGE_INSERT_FAILED: ${error.message}`);
  return data as MessageRow;
}

/* --------------------------------------------------------------- events */

export interface EventRow {
  id: string;
  ticket_id: string | null;
  event_type: SupportEventType;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  from_status: string | null;
  to_status: string | null;
  payload: Record<string, unknown>;
  request_id: string | null;
  created_at: string;
}

export function eventRowToEvent(e: EventRow): SupportEvent {
  return {
    id: e.id,
    ticketId: e.ticket_id || undefined,
    type: e.event_type,
    actorId: e.actor_id,
    actorName: e.actor_name,
    actorRole: e.actor_role as SupportEvent["actorRole"],
    fromStatus: e.from_status || undefined,
    toStatus: e.to_status || undefined,
    payload: e.payload || {},
    createdAt: e.created_at,
    requestId: e.request_id || undefined,
  };
}

export async function insertEventRow(row: Record<string, unknown>): Promise<EventRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_events").insert(row).select("*").single();
  if (error) throw new Error(`EVENT_INSERT_FAILED: ${error.message}`);
  return data as EventRow;
}

export async function eventsForTicket(ticketId: string, limit = 200): Promise<EventRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_events")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`EVENTS_QUERY_FAILED: ${error.message}`);
  return (data || []) as EventRow[];
}

export async function recentEvents(limit = 10): Promise<EventRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_events").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`EVENTS_QUERY_FAILED: ${error.message}`);
  return (data || []) as EventRow[];
}

export async function hasEventFired(ticketId: string, type: SupportEventType): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { count, error } = await admin
    .from("support_events")
    .select("id", { count: "exact", head: true })
    .eq("ticket_id", ticketId)
    .eq("event_type", type);
  if (error) throw new Error(`EVENT_CHECK_FAILED: ${error.message}`);
  return (count ?? 0) > 0;
}

/* ------------------------------------------------------------ disputes */

export interface DisputeRow {
  id: string;
  dispute_number: string;
  ticket_id: string | null;
  category: SupportDispute["category"];
  status: DisputeStatus;
  priority: TicketPriority;
  transaction_reference: string;
  customer_id: string;
  customer_name: string;
  jurisdiction: SupportJurisdiction;
  claim: string;
  claim_amount: string | number;
  currency: "NGN" | "XOF";
  evidence: unknown;
  created_by_officer_id: string;
  assigned_officer_id: string | null;
  decision_owner: SupportDispute["decisionOwner"];
  decision_type: string | null;
  decided_by_officer_id: string | null;
  decision_reason: string | null;
  decided_at: string | null;
  recovery_case_reference: string | null;
  timeline: unknown;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

let officerLookupCacheForDisputes: Map<string, { name: string; role: SupportRole }> | null = null;
let officerLookupCacheAt2 = 0;
async function officerLookupMap(): Promise<Map<string, { name: string; role: SupportRole }>> {
  if (officerLookupCacheForDisputes && Date.now() - officerLookupCacheAt2 < 15_000) return officerLookupCacheForDisputes;
  const rows = await listOfficers();
  officerLookupCacheForDisputes = new Map(rows.map((o) => [o.id, { name: o.full_name, role: o.role }]));
  officerLookupCacheAt2 = Date.now();
  return officerLookupCacheForDisputes;
}

export async function disputeRowToDispute(d: DisputeRow): Promise<SupportDispute> {
  const officers = await officerLookupMap();
  const creator = officers.get(d.created_by_officer_id);
  const decidedBy = d.decided_by_officer_id ? officers.get(d.decided_by_officer_id) : undefined;
  return {
    id: d.id,
    disputeNumber: d.dispute_number,
    category: d.category,
    status: d.status,
    priority: d.priority,
    ticketId: d.ticket_id || undefined,
    transactionReference: d.transaction_reference,
    customerId: d.customer_id,
    customerName: d.customer_name,
    jurisdiction: d.jurisdiction,
    claim: d.claim,
    claimAmount: num(d.claim_amount),
    currency: d.currency,
    evidence: (d.evidence as SupportDispute["evidence"]) || [],
    createdByOfficerId: d.created_by_officer_id,
    createdByOfficerName: creator?.name ?? "Unknown officer",
    assignedOfficerId: d.assigned_officer_id || undefined,
    assignedOfficerName: d.assigned_officer_id ? officers.get(d.assigned_officer_id)?.name : undefined,
    decisionOwner: d.decision_owner,
    decision:
      d.decision_type && decidedBy && d.decided_at
        ? {
            type: d.decision_type as never,
            decidedBy: decidedBy.name,
            decidedByRole: decidedBy.role,
            reason: d.decision_reason || "",
            decidedAt: d.decided_at,
          }
        : undefined,
    recoveryCaseReference: d.recovery_case_reference || undefined,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    resolvedAt: d.resolved_at || undefined,
    closedAt: d.closed_at || undefined,
    timeline: (d.timeline as SupportDispute["timeline"]) || [],
  };
}

export async function listDisputeRows(filters: { status?: string; category?: string; ticketId?: string; limit?: number }): Promise<DisputeRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin.from("support_disputes").select("*");
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.ticketId) q = q.eq("ticket_id", filters.ticketId);
  q = q.order("created_at", { ascending: false }).limit(filters.limit ?? 300);
  const { data, error } = await q;
  if (error) throw new Error(`DISPUTES_QUERY_FAILED: ${error.message}`);
  return (data || []) as DisputeRow[];
}

export async function getDisputeRow(idOrNumber: string): Promise<DisputeRow | null> {
  const admin = getSupabaseAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);
  const { data, error } = await admin
    .from("support_disputes")
    .select("*")
    .eq(isUuid ? "id" : "dispute_number", idOrNumber)
    .maybeSingle();
  if (error) throw new Error(`DISPUTE_QUERY_FAILED: ${error.message}`);
  return (data as DisputeRow) || null;
}

export async function insertDisputeRow(row: Record<string, unknown>): Promise<DisputeRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_disputes").insert(row).select("*").single();
  if (error) throw new Error(`DISPUTE_INSERT_FAILED: ${error.message}`);
  return data as DisputeRow;
}

export async function updateDisputeRow(id: string, updates: Record<string, unknown>): Promise<DisputeRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_disputes").update(updates).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error(`DISPUTE_UPDATE_FAILED: ${error.message}`);
  return (data as DisputeRow) || null;
}

export async function nextDisputeNumber(): Promise<string> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("next_support_dispute_number");
  if (error) throw new Error(`DISPUTE_NUMBER_FAILED: ${error.message}`);
  return data as string;
}

/* --------------------------------------------------------- escalations */

export interface EscalationRow {
  id: string;
  escalation_number: string;
  ticket_id: string;
  reason: string;
  priority: TicketPriority;
  destination: SupportEscalation["destination"];
  assigned_to_officer_id: string | null;
  status: EscalationStatus;
  sla_due_at: string;
  resolution_note: string | null;
  created_by_officer_id: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export async function escalationRowToEscalation(e: EscalationRow): Promise<SupportEscalation> {
  const officers = await officerLookupMap();
  const ticket = await getTicketRow(e.ticket_id);
  return {
    id: e.id,
    escalationNumber: e.escalation_number,
    ticketId: e.ticket_id,
    customerName: ticket?.customer_name ?? "",
    reason: e.reason,
    priority: e.priority,
    destination: e.destination,
    assignedToName: e.assigned_to_officer_id ? officers.get(e.assigned_to_officer_id)?.name : undefined,
    status: e.status,
    slaDueAt: e.sla_due_at,
    resolutionNote: e.resolution_note || undefined,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    resolvedAt: e.resolved_at || undefined,
  };
}

export async function listEscalationRows(filters: { status?: string; destination?: string; ticketId?: string }): Promise<EscalationRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin.from("support_escalations").select("*");
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.destination) q = q.eq("destination", filters.destination);
  if (filters.ticketId) q = q.eq("ticket_id", filters.ticketId);
  q = q.order("created_at", { ascending: false }).limit(300);
  const { data, error } = await q;
  if (error) throw new Error(`ESCALATIONS_QUERY_FAILED: ${error.message}`);
  return (data || []) as EscalationRow[];
}

export async function getEscalationRow(idOrNumber: string): Promise<EscalationRow | null> {
  const admin = getSupabaseAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);
  const { data, error } = await admin
    .from("support_escalations")
    .select("*")
    .eq(isUuid ? "id" : "escalation_number", idOrNumber)
    .maybeSingle();
  if (error) throw new Error(`ESCALATION_QUERY_FAILED: ${error.message}`);
  return (data as EscalationRow) || null;
}

export async function insertEscalationRow(row: Record<string, unknown>): Promise<EscalationRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_escalations").insert(row).select("*").single();
  if (error) throw new Error(`ESCALATION_INSERT_FAILED: ${error.message}`);
  return data as EscalationRow;
}

export async function updateEscalationRow(id: string, updates: Record<string, unknown>): Promise<EscalationRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_escalations").update(updates).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error(`ESCALATION_UPDATE_FAILED: ${error.message}`);
  return (data as EscalationRow) || null;
}

export async function nextEscalationNumber(): Promise<string> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("next_support_escalation_number");
  if (error) throw new Error(`ESCALATION_NUMBER_FAILED: ${error.message}`);
  return data as string;
}

/* --------------------------------------------------------------- tasks */

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  priority: TicketPriority;
  ticket_id: string | null;
  customer_id: string | null;
  assigned_to_officer_id: string | null;
  created_by_officer_id: string;
  due_at: string;
  status: SupportTaskStatus;
  created_at: string;
  updated_at: string;
}

export async function taskRowToTask(t: TaskRow): Promise<SupportTask> {
  const officers = await officerLookupMap();
  return {
    id: t.id,
    title: t.title,
    description: t.description || undefined,
    priority: t.priority,
    ticketId: t.ticket_id || undefined,
    customerId: t.customer_id || undefined,
    assignedToId: t.assigned_to_officer_id || undefined,
    assignedToName: t.assigned_to_officer_id ? officers.get(t.assigned_to_officer_id)?.name : undefined,
    dueAt: t.due_at,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export async function listTaskRows(filters: { assignedToId?: string; status?: string }): Promise<TaskRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin.from("support_tasks").select("*");
  if (filters.assignedToId) q = q.eq("assigned_to_officer_id", filters.assignedToId);
  if (filters.status) q = q.eq("status", filters.status);
  q = q.order("due_at", { ascending: true }).limit(300);
  const { data, error } = await q;
  if (error) throw new Error(`TASKS_QUERY_FAILED: ${error.message}`);
  return (data || []) as TaskRow[];
}

export async function getTaskRow(id: string): Promise<TaskRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_tasks").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`TASK_QUERY_FAILED: ${error.message}`);
  return (data as TaskRow) || null;
}

export async function insertTaskRow(row: Record<string, unknown>): Promise<TaskRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_tasks").insert(row).select("*").single();
  if (error) throw new Error(`TASK_INSERT_FAILED: ${error.message}`);
  return data as TaskRow;
}

export async function updateTaskRow(id: string, updates: Record<string, unknown>): Promise<TaskRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_tasks").update(updates).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error(`TASK_UPDATE_FAILED: ${error.message}`);
  return (data as TaskRow) || null;
}

/* ----------------------------------------------------------- knowledge */

export interface KnowledgeRow {
  id: string;
  category: TicketCategory;
  audience: KnowledgeArticleV2["audience"];
  status: KnowledgeArticleV2["status"];
  version: string;
  author: string;
  tags: string[];
  helpful_count: number;
  body_en: Record<string, unknown>;
  body_fr: Record<string, unknown>;
  body_ha: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function knowledgeRowToArticle(k: KnowledgeRow): KnowledgeArticleV2 {
  return {
    id: k.id,
    category: k.category,
    audience: k.audience,
    status: k.status,
    version: k.version,
    updatedAt: k.updated_at,
    author: k.author,
    tags: k.tags || [],
    helpfulCount: k.helpful_count,
    body: {
      en: k.body_en as never,
      fr: k.body_fr as never,
      ha: k.body_ha as never,
    },
  };
}

export async function listKnowledgeRows(filters: { status?: string; category?: string }): Promise<KnowledgeRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin.from("support_knowledge_articles").select("*");
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.category) q = q.eq("category", filters.category);
  q = q.order("updated_at", { ascending: false }).limit(300);
  const { data, error } = await q;
  if (error) throw new Error(`KNOWLEDGE_QUERY_FAILED: ${error.message}`);
  return (data || []) as KnowledgeRow[];
}

export async function getKnowledgeRow(id: string): Promise<KnowledgeRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_knowledge_articles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`KNOWLEDGE_QUERY_FAILED: ${error.message}`);
  return (data as KnowledgeRow) || null;
}

/* --------------------------------------------------------------- macros */

export interface MacroRow {
  id: string;
  key: string;
  name: string;
  category: string;
  body_en: string;
  body_fr: string;
  body_ha: string;
  variables: string[];
  enabled: boolean;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export function macroRowToMacro(m: MacroRow): SupportMacro {
  return {
    id: m.id,
    key: m.key,
    name: m.name,
    category: m.category as SupportMacro["category"],
    body: { en: m.body_en, fr: m.body_fr, ha: m.body_ha },
    variables: m.variables || [],
    enabled: m.enabled,
    updatedBy: m.updated_by,
    updatedAt: m.updated_at,
  };
}

export async function listMacroRows(enabledOnly: boolean): Promise<MacroRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin.from("support_macros").select("*");
  if (enabledOnly) q = q.eq("enabled", true);
  q = q.order("name", { ascending: true });
  const { data, error } = await q;
  if (error) throw new Error(`MACROS_QUERY_FAILED: ${error.message}`);
  return (data || []) as MacroRow[];
}

export async function getMacroRow(idOrKey: string): Promise<MacroRow | null> {
  const admin = getSupabaseAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrKey);
  const { data, error } = await admin
    .from("support_macros")
    .select("*")
    .eq(isUuid ? "id" : "key", idOrKey)
    .maybeSingle();
  if (error) throw new Error(`MACRO_QUERY_FAILED: ${error.message}`);
  return (data as MacroRow) || null;
}

export async function insertMacroRow(row: Record<string, unknown>): Promise<MacroRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_macros").insert(row).select("*").single();
  if (error) throw new Error(`MACRO_INSERT_FAILED: ${error.message}`);
  return data as MacroRow;
}

export async function updateMacroRow(id: string, updates: Record<string, unknown>): Promise<MacroRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_macros").update(updates).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error(`MACRO_UPDATE_FAILED: ${error.message}`);
  return (data as MacroRow) || null;
}

/* ---------------------------------------------------------------- csat */

export interface CsatRow {
  id: string;
  ticket_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  language: ArticleLanguage;
  submitted_at: string;
}

export function csatRowToRecord(c: CsatRow): SupportCsatRecord {
  return {
    id: c.id,
    ticketId: c.ticket_id,
    customerName: c.customer_name,
    rating: c.rating as SupportCsatRecord["rating"],
    comment: c.comment || undefined,
    language: c.language,
    submittedAt: c.submitted_at,
  };
}

export async function getCsatForTicket(ticketId: string): Promise<CsatRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_csat_records").select("*").eq("ticket_id", ticketId).maybeSingle();
  if (error) throw new Error(`CSAT_QUERY_FAILED: ${error.message}`);
  return (data as CsatRow) || null;
}

export async function listAllCsat(): Promise<CsatRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_csat_records").select("*").order("submitted_at", { ascending: false }).limit(2000);
  if (error) throw new Error(`CSAT_QUERY_FAILED: ${error.message}`);
  return (data || []) as CsatRow[];
}

export async function insertCsatRow(row: Record<string, unknown>): Promise<CsatRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_csat_records").insert(row).select("*").single();
  if (error) throw new Error(`CSAT_INSERT_FAILED: ${error.message}`);
  return data as CsatRow;
}

/* ------------------------------------------------------- notifications */

export interface NotificationRow {
  id: string;
  type: SupportNotification["type"];
  title: string;
  body: string;
  ticket_id: string | null;
  href: string | null;
  created_at: string;
}

export async function notificationsForOfficer(officerId: string, unreadOnly: boolean, limit = 50): Promise<SupportNotification[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`NOTIFICATIONS_QUERY_FAILED: ${error.message}`);
  const rows = (data || []) as NotificationRow[];
  const ids = rows.map((r) => r.id);
  const { data: reads, error: readsErr } = await admin
    .from("support_notification_reads")
    .select("notification_id")
    .eq("officer_id", officerId)
    .in("notification_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  if (readsErr) throw new Error(`NOTIFICATION_READS_QUERY_FAILED: ${readsErr.message}`);
  const readSet = new Set((reads || []).map((r) => (r as { notification_id: string }).notification_id));
  const mapped = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    ticketId: n.ticket_id || undefined,
    href: n.href || undefined,
    read: readSet.has(n.id),
    createdAt: n.created_at,
  }));
  return (unreadOnly ? mapped.filter((n) => !n.read) : mapped).slice(0, limit);
}

export async function unreadNotificationCount(officerId: string): Promise<number> {
  const items = await notificationsForOfficer(officerId, false, 200);
  return items.filter((n) => !n.read).length;
}

export async function insertNotificationRow(row: Record<string, unknown>): Promise<NotificationRow> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_notifications").insert(row).select("*").single();
  if (error) throw new Error(`NOTIFICATION_INSERT_FAILED: ${error.message}`);
  return data as NotificationRow;
}

export async function markNotificationReadForOfficer(notificationId: string, officerId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("support_notification_reads")
    .upsert({ notification_id: notificationId, officer_id: officerId }, { onConflict: "notification_id,officer_id" });
  if (error) throw new Error(`NOTIFICATION_READ_FAILED: ${error.message}`);
}

export async function getNotificationRow(id: string): Promise<NotificationRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_notifications").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`NOTIFICATION_QUERY_FAILED: ${error.message}`);
  return (data as NotificationRow) || null;
}

/* --------------------------------------------------------------- audit */

export interface AuditRow {
  id: string;
  officer_id: string;
  officer_name: string;
  officer_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  before_state: string | null;
  after_state: string | null;
  jurisdiction: string;
  created_at: string;
}

export async function insertAuditRow(row: Record<string, unknown>): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("support_audit_log").insert(row);
  if (error) throw new Error(`AUDIT_INSERT_FAILED: ${error.message}`);
}

export async function listAuditRows(filters: { action?: string; limit?: number }): Promise<{ rows: AuditRow[]; total: number }> {
  const admin = getSupabaseAdminClient();
  let q = admin.from("support_audit_log").select("*", { count: "exact" });
  if (filters.action) q = q.ilike("action", `%${filters.action}%`);
  q = q.order("created_at", { ascending: false }).limit(filters.limit ?? 50);
  const { data, error, count } = await q;
  if (error) throw new Error(`AUDIT_QUERY_FAILED: ${error.message}`);
  return { rows: (data || []) as AuditRow[], total: count ?? (data || []).length };
}

/* ------------------------------------------------------- idempotency */

export async function idempotencyHit(key: string): Promise<unknown | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_idempotency_keys").select("response, created_at").eq("key", key).maybeSingle();
  if (error) throw new Error(`IDEMPOTENCY_QUERY_FAILED: ${error.message}`);
  if (!data) return null;
  if (Date.now() - new Date((data as { created_at: string }).created_at).getTime() > 24 * 3600e3) return null;
  return (data as { response: unknown }).response;
}

export async function idempotencyStore(key: string, response: unknown): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("support_idempotency_keys").upsert({ key, response }, { onConflict: "key" });
  if (error) throw new Error(`IDEMPOTENCY_STORE_FAILED: ${error.message}`);
}

/* --------------------------------------------- retained ref modules */

export async function listPlaybookRows() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_playbooks").select("*").order("title");
  if (error) throw new Error(`PLAYBOOKS_QUERY_FAILED: ${error.message}`);
  return data || [];
}

export async function listIncidentRows() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_incidents").select("*").order("start_time", { ascending: false });
  if (error) throw new Error(`INCIDENTS_QUERY_FAILED: ${error.message}`);
  return data || [];
}

export async function listAutomationRuleRows() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_automation_rules").select("*").order("rule_name");
  if (error) throw new Error(`AUTOMATION_RULES_QUERY_FAILED: ${error.message}`);
  return data || [];
}

export async function listAutomationLogRows() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_automation_logs").select("*").order("triggered_at", { ascending: false }).limit(200);
  if (error) throw new Error(`AUTOMATION_LOGS_QUERY_FAILED: ${error.message}`);
  return data || [];
}

export async function listQaReviewRows() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_qa_reviews").select("*").order("reviewed_at", { ascending: false }).limit(200);
  if (error) throw new Error(`QA_REVIEWS_QUERY_FAILED: ${error.message}`);
  return data || [];
}

export async function listTrainingModuleRows() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_training_modules").select("*").order("title");
  if (error) throw new Error(`TRAINING_QUERY_FAILED: ${error.message}`);
  return data || [];
}

export async function listTrainingCompletionRows() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("support_training_completions").select("*");
  if (error) throw new Error(`TRAINING_COMPLETIONS_QUERY_FAILED: ${error.message}`);
  return data || [];
}
