/**
 * Pure data/logic for the Aggregator staff permission matrix — no
 * server-only imports (no next/server, no Supabase admin client), so this
 * is safe to import from both API routes and client components (e.g. to
 * conditionally render/disable privileged action buttons in the UI).
 *
 * The server-side enforcement gate (requireAggregatorPermission, which
 * actually rejects a request) lives in
 * src/lib/security/aggregatorPermissions.ts and re-exports everything
 * here — that file is the one API routes should import when they need to
 * both check AND return a 403. Client components should import directly
 * from this file, since they only need the boolean check.
 */

export const AGGREGATOR_PERMISSIONS = [
  // Funds movement — the highest-risk category. Owner/Admin always have
  // it; Operations/Finance are the two roles whose job is literally this.
  'aggregator.liquidity.dispatch',
  'aggregator.settlements.run',
  'aggregator.reconciliation.run',

  // Network/identity creation — new agents, new territories, new targets.
  'aggregator.agents.onboard',
  'aggregator.territories.manage',
  'aggregator.targets.manage',

  // API credentials — production keys can move money via the public API,
  // so this is treated with the same weight as funds movement.
  'aggregator.keys.manage',

  // Staff administration (inviting new staff into the organization).
  'aggregator.team.manage',

  // Review/decision actions on findings raised by the platform itself.
  'aggregator.compliance.decide',
  'aggregator.risk.acknowledge',
  'aggregator.exceptions.resolve',
] as const;

// Deliberately NOT gated here: PATCH /settings (a staff member's own
// notification preferences) and DELETE /devices/:id (revoking a staff
// member's own other device sessions) — both routes already scope
// strictly to the caller's own staffId, so every role must keep the
// ability to manage their own preferences/sessions regardless of what
// organization-wide actions they can or can't perform.

export type AggregatorPermission = (typeof AGGREGATOR_PERMISSIONS)[number];

export type AggregatorStaffRole =
  | 'AGGREGATOR_OWNER'
  | 'AGGREGATOR_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'FINANCE_MANAGER'
  | 'COMPLIANCE_OFFICER'
  | 'RISK_OFFICER'
  | 'FIELD_OFFICER'
  | 'AUDITOR'
  | 'ANALYST';

/**
 * Role -> permission allowlist. AGGREGATOR_OWNER and AGGREGATOR_ADMIN carry
 * every permission (they are the org's own accountable principals). Every
 * other role is deliberately narrow — AUDITOR and ANALYST carry none: they
 * exist to view real data (already true of every GET route, which never
 * required a permission), never to mutate it.
 */
const ROLE_PERMISSIONS: Record<AggregatorStaffRole, AggregatorPermission[]> = {
  AGGREGATOR_OWNER: [...AGGREGATOR_PERMISSIONS],
  AGGREGATOR_ADMIN: [...AGGREGATOR_PERMISSIONS],
  OPERATIONS_MANAGER: [
    'aggregator.liquidity.dispatch',
    'aggregator.agents.onboard',
    'aggregator.territories.manage',
    'aggregator.targets.manage',
    'aggregator.exceptions.resolve',
  ],
  FINANCE_MANAGER: [
    'aggregator.liquidity.dispatch',
    'aggregator.settlements.run',
    'aggregator.reconciliation.run',
    'aggregator.exceptions.resolve',
  ],
  COMPLIANCE_OFFICER: [
    'aggregator.compliance.decide',
    'aggregator.exceptions.resolve',
  ],
  RISK_OFFICER: [
    'aggregator.risk.acknowledge',
    'aggregator.exceptions.resolve',
  ],
  FIELD_OFFICER: [],
  AUDITOR: [],
  ANALYST: [],
};

export function aggregatorRoleHasPermission(
  role: AggregatorStaffRole | string | undefined | null,
  permission: AggregatorPermission,
): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role as AggregatorStaffRole] || []).includes(permission);
}
