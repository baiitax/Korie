import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminAuthResult } from '@/lib/security/adminAuth';

/**
 * Phase — Admin Portal MFA enforcement (ADMIN_PORTAL_REVIEW.md finding #2).
 *
 * Built on the same Supabase Auth native TOTP factor primitive already
 * proven for the Aggregator portal (aggregatorMfa.ts / auth.mfa.enroll/
 * challenge/verify) — a staff member's `verified` factor list is the single
 * source of truth, checked fresh on every mutation rather than cached.
 *
 * Unlike the aggregator's org-level opt-in switch, there is no "organization
 * that gets to decide" for the admin command center — SUPER_ADMIN and
 * ORGANIZATION_OWNER/ORGANIZATION_ADMIN are the platform's most powerful
 * roles, so enforcement here is unconditional, not a toggle. The only
 * relief is a fixed grandfather cutoff so the existing seeded admin
 * account (created before this feature shipped, with no factor enrolled
 * yet) isn't locked out of every mutation the moment this ships — any
 * account created on/after the cutoff has always been required to enroll,
 * with no opt-out.
 */

export interface AdminMfaCheckResult {
  ok: boolean;
  hasVerifiedFactor: boolean;
  isGrandfathered: boolean;
}

/**
 * Accounts whose user_profiles.created_at is before this instant are
 * grandfathered out of enforcement (soft launch) — this is the shipped
 * date of this fix. Every account created at or after this cutoff has
 * been required to enroll a verified TOTP factor before performing any
 * admin mutation since the day it was created; there is no toggle to
 * disable that for a given account or org.
 */
export const ADMIN_MFA_ENFORCEMENT_CUTOFF = '2026-09-17T00:00:00.000Z';

export async function checkAdminMfa(
  admin: SupabaseClient,
  userId: string,
  profileCreatedAt?: string | null,
): Promise<AdminMfaCheckResult> {
  const isGrandfathered = Boolean(
    profileCreatedAt && new Date(profileCreatedAt).getTime() < new Date(ADMIN_MFA_ENFORCEMENT_CUTOFF).getTime(),
  );

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const factors = userData?.user?.factors || [];
  const hasVerifiedFactor = factors.some((f: { status?: string }) => f.status === 'verified');

  return {
    ok: isGrandfathered || hasVerifiedFactor,
    hasVerifiedFactor,
    isGrandfathered,
  };
}

/**
 * Server-side gate for any admin route that mutates state (PATCH/POST):
 * call after authorizeAdminRequest() succeeds. Returns a ready-to-return
 * 403 when this admin has neither a verified TOTP factor nor a
 * grandfathered account.
 */
export async function requireAdminMfaForMutation(
  admin: SupabaseClient,
  auth: AdminAuthResult,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!auth.userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { status: 'error', error: { code: 'UNAUTHORIZED_INVALID_SESSION', message: 'Invalid admin session.' } },
        { status: 401 },
      ),
    };
  }

  const result = await checkAdminMfa(admin, auth.userId, auth.profileCreatedAt);
  if (result.ok) return { ok: true };

  return {
    ok: false,
    response: NextResponse.json(
      {
        status: 'error',
        error: {
          code: 'MFA_REQUIRED',
          message:
            'Multi-factor authentication is required for this action. Enroll a TOTP authenticator from Settings before continuing.',
        },
      },
      { status: 403 },
    ),
  };
}
