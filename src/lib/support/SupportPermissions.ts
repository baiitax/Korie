// =============================================================================
// File: src/lib/support/SupportPermissions.ts
// Description: KoriePay Support RBAC — capability matrix (spec §53/§54).
//
// The frontend is NEVER trusted. Every API route resolves the officer from
// the roster, derives capabilities from this matrix, and enforces them
// server-side. The UI only hides what is not permitted.
// =============================================================================

import { SupportRole } from "@/types/support";

export type SupportCapability =
  | "view_queue"
  | "view_dashboard"
  | "create_ticket"
  | "send_customer_message"
  | "add_internal_note"
  | "triage_ticket"
  | "assign_ticket"
  | "reassign_ticket"
  | "change_priority"
  | "start_progress"
  | "wait_customer"
  | "wait_internal"
  | "escalate_ticket"
  | "resolve_ticket"
  | "reopen_ticket"
  | "close_ticket"
  | "view_customer_360"
  | "unmask_pii"
  | "view_transactions"
  | "view_provider_trace"
  | "create_dispute"
  | "update_dispute"
  | "decide_dispute"
  | "request_refund"
  | "view_escalations"
  | "create_escalation"
  | "view_tasks"
  | "manage_tasks"
  | "view_knowledge"
  | "manage_knowledge"
  | "view_macros"
  | "manage_macros"
  | "view_analytics"
  | "view_audit"
  | "view_integrations"
  | "manage_settings";

/**
 * Capability tiers, lowest → highest. `roleTier(role)` returns the officer's
 * rank; a capability grants to every role at or above its minimum rank,
 * unless the explicit `specialistsOnly` list applies (e.g. financial
 * decisions belong to TIER-3 specialists, not just "senior enough").
 */
const ROLE_RANK: Record<SupportRole, number> = {
  SUPPORT_READ_ONLY: 0,
  TIER_1_JUNIOR: 1,
  TIER_2_SENIOR: 2,
  TIER_3_FINANCE: 3,
  TIER_3_FRAUD: 3,
  TIER_3_COMPLIANCE: 3,
  TIER_3_TECH_OPS: 3,
  SUPPORT_SUPERVISOR: 4,
  SUPPORT_MANAGER: 5,
  SUPER_ADMIN: 6,
};

const READ_ONLY_CAPS: SupportCapability[] = [
  "view_queue",
  "view_dashboard",
  "view_customer_360",
  "view_transactions",
  "view_knowledge",
  "view_macros",
  "view_tasks",
  "view_escalations",
];

const BASE_CAPS: SupportCapability[] = [
  "view_queue",
  "view_dashboard",
  "create_ticket",
  "send_customer_message",
  "add_internal_note",
  "triage_ticket",
  "start_progress",
  "wait_customer",
  "wait_internal",
  "escalate_ticket",
  "resolve_ticket",
  "view_customer_360",
  "view_transactions",
  "view_knowledge",
  "view_macros",
  "view_tasks",
  "manage_tasks",
  "view_escalations",
  "create_escalation",
  "create_dispute",
  "update_dispute",
];

const MIN_RANK: Partial<Record<SupportCapability, number>> = {
  assign_ticket: 2,
  reassign_ticket: 2,
  change_priority: 2,
  reopen_ticket: 2,
  view_provider_trace: 2,
  unmask_pii: 2,
  manage_knowledge: 2,
  view_audit: 4,
  view_analytics: 4,
  close_ticket: 4,
  manage_macros: 4,
  view_integrations: 4,
  manage_settings: 5,
};

/** Capabilities granted only to named specialist roles (money decisions). */
const SPECIALIST_ONLY: Partial<Record<SupportCapability, SupportRole[]>> = {
  decide_dispute: ["TIER_3_FRAUD", "TIER_3_COMPLIANCE", "TIER_3_FINANCE", "SUPPORT_MANAGER", "SUPER_ADMIN"],
  request_refund: ["TIER_2_SENIOR", "TIER_3_FINANCE", "TIER_3_FRAUD", "TIER_3_COMPLIANCE", "TIER_3_TECH_OPS", "SUPPORT_SUPERVISOR", "SUPPORT_MANAGER", "SUPER_ADMIN"],
};

const GRANTS = {} as Record<SupportRole, SupportCapability[]>;

for (const role of Object.keys(ROLE_RANK) as SupportRole[]) {
  const rank = ROLE_RANK[role];
  const caps: SupportCapability[] = rank === 0 ? [...READ_ONLY_CAPS] : [...BASE_CAPS];
  const addCap = (cap: SupportCapability) => {
    if (!caps.includes(cap)) caps.push(cap);
  };
  for (const [cap, min] of Object.entries(MIN_RANK) as [SupportCapability, number][]) {
    if (rank >= min) addCap(cap);
  }
  for (const [cap, roles] of Object.entries(SPECIALIST_ONLY) as [SupportCapability, SupportRole[]][]) {
    if (roles.includes(role)) addCap(cap);
  }
  GRANTS[role] = caps;
}

export function roleRank(role: SupportRole): number {
  return ROLE_RANK[role] ?? 0;
}

export function hasCapability(role: SupportRole, capability: SupportCapability): boolean {
  return (GRANTS[role] || []).includes(capability);
}

export function capabilitiesFor(role: SupportRole): SupportCapability[] {
  return Array.from(GRANTS[role] || []);
}

/**
 * Escalation destinations a role may target (spec §35 — only real departments).
 * TIER-1 escalates within support; TIER-2 to specialist desks; supervisor+
 * to any department including management.
 */
export function allowedEscalationDestinations(
  role: SupportRole,
): ("COMPLIANCE" | "FRAUD_RISK" | "ENGINEERING" | "BANKING_OPS" | "FINANCE" | "SETTLEMENT" | "MANAGEMENT")[] {
  const rank = ROLE_RANK[role] ?? 0;
  if (rank <= 1) return []; // TIER-1 uses internal reassignment, not cross-department escalation
  if (rank === 2) return ["COMPLIANCE", "FRAUD_RISK", "ENGINEERING", "BANKING_OPS", "FINANCE"];
  if (rank === 3) return ["COMPLIANCE", "FRAUD_RISK", "ENGINEERING", "BANKING_OPS", "FINANCE", "SETTLEMENT", "MANAGEMENT"];
  return ["COMPLIANCE", "FRAUD_RISK", "ENGINEERING", "BANKING_OPS", "FINANCE", "SETTLEMENT", "MANAGEMENT"];
}
