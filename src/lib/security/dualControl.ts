import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * SUPER_ADMIN dual-control enforcement (ADMIN_PORTAL_REVIEW.md finding #3).
 *
 * The role's own seed description ("Platform-wide administrator with
 * dual-control authorization requirements",
 * 20260903000001_core_identity_and_tenancy.sql) promised a second, distinct
 * approver for its actions, but nothing in the generic resource-registry
 * mutation path (adminAuth.ts / resourceRegistry.ts / the two data routes)
 * ever implemented it — a lone SUPER_ADMIN could PATCH any guarded resource
 * unilaterally. This closes that gap for the specific mutation the review
 * named as the clearest example of real, unilateral risk: closing a live
 * security incident.
 *
 * Rather than inventing a second maker-checker mechanism, this reuses the
 * SAME `control_approval_events` / `record_control_approval()` primitive
 * already proven for money-movement dual control (migration
 * 20260914000052) — a PATCH into a guarded terminal value records one vote;
 * the underlying row is only actually updated once `requiredApprovals`
 * DISTINCT admins have voted for it. Below that threshold, nothing in the
 * database changes and the caller is told exactly how many more distinct
 * approvers are needed.
 *
 * Known limitation (shared with the money-movement flows this mirrors):
 * approval events are keyed by (approval_type, reference_id) with no
 * "cycle" marker, so if a guarded row is ever moved out of the terminal
 * state and back into it, prior approvals from the same accounts would
 * still count toward the new vote. This matches the existing dual-control
 * implementation's own behavior (it has the same property for payout/
 * top-up requests) and is an acceptable tradeoff given how rarely a closed
 * security incident is reopened and re-closed; a future migration could
 * add a cycle/version column if this ever needs tightening.
 */
export interface DualControlGuard {
  /** Column whose value transition triggers the dual-control requirement. */
  column: string;
  /** Values of `column` that require distinct approvals before being applied. */
  triggerValues: string[];
  /** Distinct actors required (>= 2) before the underlying mutation is applied. */
  requiredApprovals: number;
  /** Discriminator stored in control_approval_events.approval_type. */
  approvalType: string;
}

export interface DualControlOutcome {
  applied: boolean;
  approvals: number;
  required: number;
}

/** Does this patch even touch the guarded column with a guarded value? */
export function dualControlTriggered(guard: DualControlGuard, patch: Record<string, unknown>): boolean {
  const next = patch[guard.column];
  return typeof next === 'string' && guard.triggerValues.includes(next);
}

/**
 * Records this admin's vote and reports whether enough DISTINCT admins have
 * now voted for the underlying mutation to actually be applied. Fails
 * closed: if the vote can't even be recorded, the mutation is not applied.
 */
export async function checkDualControl(
  admin: SupabaseClient,
  guard: DualControlGuard,
  recordId: string,
  patch: Record<string, unknown>,
  actorId: string,
  actorRole?: string | null,
  orgId?: string | null,
): Promise<DualControlOutcome> {
  if (!dualControlTriggered(guard, patch)) {
    return { applied: true, approvals: guard.requiredApprovals, required: guard.requiredApprovals };
  }

  const nextValue = patch[guard.column] as string;
  const { data: count, error } = await admin.rpc('record_control_approval', {
    p_approval_type: guard.approvalType,
    p_reference_id: recordId,
    p_actor_id: actorId,
    p_decision: 'APPROVE',
    p_notes: `Dual-control vote: set ${guard.column} to ${nextValue}`,
    p_actor_role: actorRole ?? null,
    p_org_id: orgId ?? null,
  });

  if (error) {
    return { applied: false, approvals: 0, required: guard.requiredApprovals };
  }

  const approvals = typeof count === 'number' ? count : 0;
  return { applied: approvals >= guard.requiredApprovals, approvals, required: guard.requiredApprovals };
}
