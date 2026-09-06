// =============================================================================
// File: src/services/supportOpsClient.ts
// Description: KoriePay Support — typed API client (spec §67).
//
// All support pages/components talk to the server through this client.
// The server is the ONLY place business rules live (SLA, RBAC, lifecycle,
// PII masking, recovery handoff). React holds no business logic.
//
// Credentials: the platform sandbox key (same pattern as
// customerPortalClient) — the support API enforces its own officer RBAC on
// top of the key, asserted per request via x-kp-support-officer.
// =============================================================================

import { createErrorResponse, createSuccessResponse } from "@/lib/security/apiResponse";
import type { NextRequest } from "next/server";

export const DEFAULT_SUPPORT_TOKEN = "kp_test_cdb3db2b9b22a98c9c1b";
export const DEFAULT_SUPPORT_OFFICER = "OFF-SUP-04"; // Amina Yusuf — SUPERVISOR

/* ----------------------------------------------- Envelope (mirrors server) */

export interface SupportSuccess<T> {
  status: "success";
  code: string;
  message: string;
  data: T;
  meta: { requestId: string; timestamp: string; httpStatus: number; idempotencyCached: boolean };
}

export interface SupportError {
  status: "error";
  error: { code: string; message: string; requestId: string; timestamp: string };
}

export type SupportResult<T> = SupportSuccess<T> | SupportError;

function isSupportError(value: SupportResult<unknown>): value is SupportError {
  return value.status === "error";
}

/* --------------------------------------- Request plumbing (spec §72/§73) */

export interface SupportRequestOptions {
  officerId?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

/**
 * Failures resolve to a tagged object ({ __supportError: true, code, message,
 * requestId }) so callers can distinguish "no data" from "data that is
 * legitimately empty" without any null ambiguity.
 */
export interface SupportApiError {
  __supportError: true;
  code: string;
  message: string;
  requestId?: string;
}

export function isSupportApiError(value: unknown): value is SupportApiError {
  return !!value && typeof value === "object" && (value as SupportApiError).__supportError === true;
}

function apiError(code: string, message: string, requestId?: string): SupportApiError {
  return { __supportError: true, code, message, requestId };
}

async function supportFetch<T>(path: string, init: RequestInit, opts: SupportRequestOptions = {}): Promise<T | SupportApiError> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DEFAULT_SUPPORT_TOKEN}`,
    "x-kp-support-officer": opts.officerId || DEFAULT_SUPPORT_OFFICER,
    "x-kp-request-id": `KP-REQ-BROWSER-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    "x-kp-correlation-id": `KP-COR-BROWSER-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  };
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, cache: "no-store", signal: opts.signal });
  } catch {
    return apiError("NETWORK_ERROR", "Network error — check your connection and try again.");
  }

  const body = (await res.json().catch(() => null)) as SupportResult<T> | null;
  if (!body) return apiError("BAD_GATEWAY", "Bad gateway — the support service did not answer.", undefined);
  if (body.status === "error") {
    // Operational copy only — never propagate raw server internals (§73).
    return apiError(body.error.code, body.error.message, body.error.requestId);
  }
  return body.data;
}

/* ------------------------------------------------------- Typed shapes */

export interface SupportOfficerDto {
  id: string;
  fullName: string;
  role: string;
  tier: string;
  email: string;
  jurisdiction: string;
  languages: string[];
  activeTicketCount: number;
  maxCapacity: number;
  status: "ONLINE" | "BUSY" | "ON_BREAK" | "OFFLINE";
  qaScore: number;
  avatarUrl?: string;
  skills: string[];
  capabilities: string[];
}

export interface OverviewDto {
  generatedAt: string;
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
    range: string;
    created: number[];
    resolved: number[];
    reopened: number[];
    avgResolutionHours: number;
    labels: string[];
  };
  categories: { key: string; label: string; count: number }[];
  serviceHealth: { key: string; label: string; status: string; detail: string; checkedAt: string }[];
  recentActivity: { id: string; timestamp: string; officerName: string; action: string; entityType: string; details: string }[];
}

export interface SlaDto {
  state: string;
  firstResponseState: string;
  resolutionState: string;
  effectiveAgeMs: number;
  remainingMs: number;
  pausedMs: number;
  resolvedWithinTarget: boolean | null;
  firstResponseWithinTarget: boolean | null;
}

export interface TicketDto {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  language: string;
  channel: string;
  jurisdiction: string;
  customerId: string;
  customerName: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  createdAt: string;
  updatedAt: string;
  firstRespondedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionDueAt: string;
  firstResponseDueAt: string;
  slaStatus?: string;
  relatedTransactionId?: string;
  isDuplicateOf?: string;
  sentiment?: string;
  satisfaction?: number;
  messages?: {
    id: string;
    senderId: string;
    senderName: string;
    senderType: string;
    content: string;
    language: string;
    isInternalNote: boolean;
    channel: string;
    timestamp: string;
    macroId?: string;
  }[];
  sla?: SlaDto;
}

export interface Customer360Dto {
  source: string;
  customer: {
    id: string;
    name: string;
    emailMasked: string;
    email?: string;
    phoneMasked: string;
    phone?: string;
    country: string;
    preferredLanguage: string;
    kycTier: string;
    accountStatus: string;
    riskLevel: string;
    riskScore?: number;
    registrationDate?: string;
    lastLoginAt?: string;
  };
  accounts: {
    currency: string;
    accountNumberMasked: string;
    accountNumber?: string;
    assignedBankName: string;
    status: string;
    isPrimary: boolean;
    balanceMasked: string;
    balance: number;
    availableBalance: number;
    heldBalance: number;
  }[];
  stats: { totalTransactions: number; failedTransactions: number; activeTickets: number; openDisputes: number };
  recentTransactions: { reference: string; type: string; status: string; amount: number; currency: string; createdAt: string; counterparty?: string }[];
  activeTickets: { id: string; ticketNumber: string; subject: string; status: string; priority: string; updatedAt: string }[];
  openDisputes: { id: string; disputeNumber: string; category: string; status: string; createdAt: string }[];
  securityEvents: { event: string; device: string; ipMasked: string; timestamp: string }[];
}

export interface TransactionInvestigationDto {
  source: string;
  transactionId: string;
  reference: string;
  amount: number;
  currency: string;
  fee?: number;
  timestamp: string;
  status: string;
  statusExplanationKey: string;
  channel: string;
  originEntity: string;
  destinationEntity: string;
  provider: { node: string; reference: string; status: string } | null;
  ledgerStatus: string;
  failureReason?: string;
  timeline: { stage: string; timestamp: string; status: string; details: string }[];
  relatedTickets: { id: string; ticketNumber: string; subject: string; status: string }[];
  relatedDisputes: { id: string; disputeNumber: string; category: string; status: string }[];
  liveRow?: {
    id: string;
    status: string;
    type: string;
    amountMinor: number;
    feeMinor: number;
    currency: string;
    providerCode?: string;
    providerReference?: string;
    providerResponseCode?: string;
    createdAt: string;
  };
}

export interface DisputeDto {
  id: string;
  disputeNumber: string;
  ticketId?: string;
  category: string;
  status: string;
  customerId: string;
  customerName: string;
  transactionReference: string;
  claim: string;
  claimAmount: number;
  currency: string;
  priority: string;
  decisionOwner: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  resolutionNote?: string;
  decision?: {
    type: string;
    reason: string;
    decidedBy: string;
    decidedByName: string;
    decidedAt: string;
    recoveryCaseReference?: string;
  };
  recoveryCaseReference?: string;
}

export interface EscalationDto {
  id: string;
  escalationNumber: string;
  ticketId: string;
  ticketNumber?: string;
  reason: string;
  destination: string;
  destinationLabel: string;
  assignedToName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolutionNote?: string;
}

export interface SupportTaskDto {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  assignedToId?: string;
  assignedToName?: string;
  dueAt: string;
  ticketId?: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
  overdue?: boolean;
}

export interface KnowledgeDto {
  id: string;
  category: string;
  audience: string;
  status: string;
  version: string;
  updatedAt: string;
  author: string;
  tags: string[];
  helpfulCount: number;
  body: {
    title: string;
    problem: string;
    symptoms: string[];
    resolution: string;
    escalationCondition?: string;
  };
}

export interface MacroDto {
  id: string;
  key: string;
  name: string;
  category: string;
  body: { en: string; fr: string; ha: string };
  variables?: string[];
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface RetainedModulesDto {
  playbooks: unknown[];
  incidents: unknown[];
  automationRules: unknown[];
  automationLogs: unknown[];
  qaReviews: unknown[];
  training: unknown[];
  capacity: unknown;
}

/* -------------------------------------------------------------- API map */

export const supportOps = {
  overview: (range: "24H" | "7D" | "30D" | "90D" = "24H", officerId?: string) =>
    supportFetch<OverviewDto>(`/api/support/overview?range=${range}`, { method: "GET" }, { officerId }),

  officers: (officerId?: string) =>
    supportFetch<{ items: SupportOfficerDto[] }>("/api/support/officers", { method: "GET" }, { officerId }),

  tickets: (params: Record<string, string>, officerId?: string) => {
    const qs = new URLSearchParams(params).toString();
    return supportFetch<{ items: TicketDto[]; total: number; limit: number; hasMore: boolean }>(
      `/api/support/tickets?${qs}`,
      { method: "GET" },
      { officerId },
    );
  },

  createTicket: (payload: Record<string, unknown>, officerId?: string, idempotencyKey?: string) =>
    supportFetch<{ ticket: TicketDto; duplicates: TicketDto[]; autoAssignedTo?: string }>(
      "/api/support/tickets",
      { method: "POST", body: JSON.stringify(payload) },
      { officerId, idempotencyKey },
    ),

  ticket: (id: string, officerId?: string) =>
    supportFetch<{
      ticket: TicketDto;
      sla: SlaDto;
      events: { id: string; timestamp: string; type: string; details: string; actorName: string }[];
      disputes: DisputeDto[];
      escalations: EscalationDto[];
      csat?: { ticketId: string; rating: number; comment?: string; language: string; submittedAt: string };
      relatedTickets: TicketDto[];
      allowedTransitions: string[];
      capabilities: Record<string, boolean>;
    }>(`/api/support/tickets/${encodeURIComponent(id)}`, { method: "GET" }, { officerId }),

  updateTicket: (
    id: string,
    patch: { status?: string; priority?: string; assignedOfficerId?: string; reason?: string; rootCause?: string },
    officerId?: string,
  ) =>
    supportFetch<{ ticket: TicketDto }>(
      `/api/support/tickets/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
      { officerId },
    ),

  postMessage: (
    id: string,
    body: { content: string; internal?: boolean; macroId?: string; senderType?: "AGENT" | "CUSTOMER" },
    officerId?: string,
    idempotencyKey?: string,
  ) =>
    supportFetch<{ message: TicketDto["messages"] extends (infer M)[] | undefined ? M : never; ticket: TicketDto; sla: SlaDto }>(
      `/api/support/tickets/${encodeURIComponent(id)}/messages`,
      { method: "POST", body: JSON.stringify(body) },
      { officerId, idempotencyKey },
    ),

  submitCsat: (id: string, body: { rating: number; comment?: string; language?: string }, officerId?: string) =>
    supportFetch<{ record: { ticketId: string; rating: number } }>(
      `/api/support/tickets/${encodeURIComponent(id)}/csat`,
      { method: "POST", body: JSON.stringify(body) },
      { officerId },
    ),

  searchCustomers: (q: string, officerId?: string) =>
    supportFetch<{ items: { id: string; name: string; country: string; status: string; kycTier: string; riskLevel: string; source: string; openTickets: number }[] }>(
      `/api/support/customers?q=${encodeURIComponent(q)}`,
      { method: "GET" },
      { officerId },
    ),

  customer360: (id: string, officerId?: string, unmask = false) =>
    supportFetch<Customer360Dto>(
      `/api/support/customers/${encodeURIComponent(id)}${unmask ? "?unmask=1" : ""}`,
      { method: "GET" },
      { officerId },
    ),

  searchTransactions: (q: string, officerId?: string) =>
    supportFetch<{ items: { transactionId: string; reference: string; amount: number; currency: string; status: string; timestamp: string; origin: string; destination: string }[] }>(
      `/api/support/transactions?q=${encodeURIComponent(q)}`,
      { method: "GET" },
      { officerId },
    ),

  transaction: (id: string, officerId?: string) =>
    supportFetch<TransactionInvestigationDto>(
      `/api/support/transactions/${encodeURIComponent(id)}`,
      { method: "GET" },
      { officerId },
    ),

  disputes: (params: Record<string, string> = {}, officerId?: string) => {
    const qs = new URLSearchParams(params).toString();
    return supportFetch<{ items: DisputeDto[]; total: number }>(
      `/api/support/disputes${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      { officerId },
    );
  },

  dispute: (id: string, officerId?: string) =>
    supportFetch<{ dispute: DisputeDto; ticket?: TicketDto }>(
      `/api/support/disputes/${encodeURIComponent(id)}`,
      { method: "GET" },
      { officerId },
    ),

  decideDispute: (id: string, decision: { type: string; reason: string }, officerId?: string) =>
    supportFetch<{ dispute: DisputeDto }>(
      `/api/support/disputes/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ decision }) },
      { officerId },
    ),

  advanceDispute: (id: string, status: string, detail?: string, officerId?: string) =>
    supportFetch<{ dispute: DisputeDto }>(
      `/api/support/disputes/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ status, detail }) },
      { officerId },
    ),

  refunds: (officerId?: string) =>
    supportFetch<{
      items: { disputeNumber: string; id: string; category: string; status: string; customerName: string; transactionReference: string; amount: number; currency: string; decision?: { type: string; reason: string }; recoveryCaseReference?: string; createdAt: string }[];
      recoveryCases: { id: string; reference: string; transactionReference: string; claimantName: string; category: string; amount: number; currency: string; priority: string; status: string; heldReserve: number; outcome?: string; createdAt: string }[];
    }>("/api/support/refunds", { method: "GET" }, { officerId }),

  escalations: (params: Record<string, string> = {}, officerId?: string) => {
    const qs = new URLSearchParams(params).toString();
    return supportFetch<{ items: EscalationDto[]; total: number }>(
      `/api/support/escalations${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      { officerId },
    );
  },

  escalation: (id: string, officerId?: string) =>
    supportFetch<{ escalation: EscalationDto; ticket?: TicketDto }>(
      `/api/support/escalations/${encodeURIComponent(id)}`,
      { method: "GET" },
      { officerId },
    ),

  updateEscalation: (id: string, patch: { status?: string; resolutionNote?: string }, officerId?: string) =>
    supportFetch<{ escalation: EscalationDto }>(
      `/api/support/escalations/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
      { officerId },
    ),

  createEscalation: (payload: { ticketId: string; reason: string; destination: string; priority?: string; assignedToName?: string }, officerId?: string) =>
    supportFetch<{ escalation: EscalationDto }>(
      "/api/support/escalations",
      { method: "POST", body: JSON.stringify(payload) },
      { officerId },
    ),

  tasks: (params: Record<string, string> = {}, officerId?: string) => {
    const qs = new URLSearchParams(params).toString();
    return supportFetch<{ items: SupportTaskDto[] }>(
      `/api/support/tasks${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      { officerId },
    );
  },

  createTask: (payload: { title: string; description?: string; priority?: string; dueAt?: string; assignedToId?: string; ticketId?: string; customerId?: string }, officerId?: string) =>
    supportFetch<{ task: SupportTaskDto }>("/api/support/tasks", { method: "POST", body: JSON.stringify(payload) }, { officerId }),

  updateTask: (id: string, patch: { status?: string; title?: string; dueAt?: string; assignedToId?: string }, officerId?: string) =>
    supportFetch<{ task: SupportTaskDto }>(
      `/api/support/tasks/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
      { officerId },
    ),

  knowledge: (params: Record<string, string> = {}, officerId?: string) => {
    const qs = new URLSearchParams(params).toString();
    return supportFetch<{ lang: string; items: KnowledgeDto[] }>(
      `/api/support/knowledge${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      { officerId },
    );
  },

  knowledgeArticle: (id: string, lang: string, officerId?: string) =>
    supportFetch<KnowledgeDto>(
      `/api/support/knowledge/${encodeURIComponent(id)}?lang=${lang}`,
      { method: "GET" },
      { officerId },
    ),

  macros: (officerId?: string) =>
    supportFetch<{ items: MacroDto[] }>("/api/support/macros", { method: "GET" }, { officerId }),

  createMacro: (
    payload: { key: string; name: string; body: { en: string; fr: string; ha: string }; category?: string; variables?: string[] },
    officerId?: string,
  ) =>
    supportFetch<{ macro: MacroDto }>("/api/support/macros", { method: "POST", body: JSON.stringify(payload) }, { officerId }),

  updateMacro: (
    id: string,
    patch: { body?: { en?: string; fr?: string; ha?: string }; enabled?: boolean; name?: string },
    officerId?: string,
  ) =>
    supportFetch<{ macro: MacroDto }>(
      `/api/support/macros/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
      { officerId },
    ),

  analytics: (officerId?: string) =>
    supportFetch<{
      generatedAt: string;
      range: string;
      agentStats: { officerId: string; officerName: string; role: string; tier: string; resolved: number; open: number; avgResolutionHours: number; csatAvg: number | null; escalations: number; reopens: number; slaComplianceRate: number }[];
      slaComplianceRate: number;
      resolutionByPriority: { priority: string; resolved: number; withinTarget: number; rate: number }[];
      csat: { average: number | null; count: number; distribution: Record<string, number>; byLanguage: { language: string; average: number | null; count: number }[] };
      escalations: { total: number; open: number; byDestination: { destination: string; label: string; count: number }[]; resolutionRate: number };
      reopens: { total: number; rate: number };
    }>("/api/support/analytics", { method: "GET" }, { officerId }),

  audit: (params: Record<string, string> = {}, officerId?: string) => {
    const qs = new URLSearchParams(params).toString();
    return supportFetch<{ items: { id: string; timestamp: string; officerId: string; officerName: string; officerRole: string; action: string; entityType: string; entityId: string; details: string; jurisdiction: string }[]; total: number }>(
      `/api/support/audit${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      { officerId },
    );
  },

  notifications: (officerId?: string, unreadOnly = false) =>
    supportFetch<{ items: { id: string; officerId: string; type: string; title: string; body: string; link?: string; read: boolean; createdAt: string }[]; unreadCount: number }>(
      `/api/support/notifications${unreadOnly ? "?unread=1" : ""}`,
      { method: "GET" },
      { officerId },
    ),

  markNotificationRead: (id: string, officerId?: string) =>
    supportFetch<{ notification: { id: string } }>(
      `/api/support/notifications/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ read: true }) },
      { officerId },
    ),

  health: (officerId?: string) =>
    supportFetch<{ items: { key: string; label: string; status: string; detail: string; checkedAt: string }[] }>("/api/support/health", { method: "GET" }, { officerId }),

  search: (q: string, officerId?: string) =>
    supportFetch<{
      customers: { id: string; name: string; country: string; status: string; href: string }[];
      tickets: { id: string; number: string; subject: string; status: string; href: string }[];
      transactions: { id: string; reference: string; currency: string; amount: number; status: string; href: string }[];
      disputes: { id: string; number: string; category: string; status: string; href: string }[];
      escalations: { id: string; number: string; destination: string; status: string; href: string }[];
      knowledge: { id: string; title: string; category: string; href: string }[];
    }>(`/api/support/search?q=${encodeURIComponent(q)}`, { method: "GET" }, { officerId }),

  retainedModules: (officerId?: string) =>
    supportFetch<RetainedModulesDto>("/api/support/retained/modules", { method: "GET" }, { officerId }),
};

export function supportErrorCode(value: unknown): string {
  return isSupportApiError(value) ? value.code : "UNKNOWN";
}

export function supportErrorMessage(value: unknown): string {
  return isSupportApiError(value) ? value.message : "";
}

// Keep the envelope types importable for testing.
void createSuccessResponse;
void isSupportError;
export type { NextRequest };
