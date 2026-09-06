import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const ALLOWED_ROLES = [
  'AGGREGATOR_OWNER', 'AGGREGATOR_ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER',
  'COMPLIANCE_OFFICER', 'RISK_OFFICER', 'FIELD_OFFICER', 'AUDITOR', 'ANALYST',
];

/**
 * GET /api/v1/aggregator/team — real public.aggregator_staff_users rows.
 *
 * POST /api/v1/aggregator/team — invites a new staff member. Creates an
 * INVITED row without a Supabase Auth user yet (no email delivery is wired
 * up); the invited person completes registration themselves, at which point
 * a real ops/admin flow links auth_user_id. This mirrors the honest
 * "no fabricated activation" pattern used elsewhere in the portal — no
 * invite email is silently pretended to have been sent.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('aggregator_staff_users')
    .select('id, full_name, email, phone, role, territory_scope, status, last_login_at, created_at')
    .eq('aggregator_id', staff.aggregatorId)
    .order('created_at', { ascending: true });

  if (error) {
    return createErrorResponse({ code: 'TEAM_LOOKUP_FAILED', message: 'Could not load team.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((t: any) => ({
    id: t.id,
    fullName: t.full_name,
    email: t.email,
    phone: t.phone || '',
    role: t.role,
    territoryScope: t.territory_scope || [],
    status: t.status,
    lastLoginAt: t.last_login_at || '—',
    permissions: [],
  }));

  return createSuccessResponse({ team: mapped }, { code: 'TEAM_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  if (staff.role !== 'AGGREGATOR_OWNER' && staff.role !== 'AGGREGATOR_ADMIN') {
    return createErrorResponse({ code: 'FORBIDDEN_ROLE', message: 'Only owners/admins can invite team members.', requestId: staff.requestId, httpStatus: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const role = ALLOWED_ROLES.includes(body.role) ? body.role : 'OPERATIONS_MANAGER';
  const phone = body.phone ? String(body.phone).trim() : null;

  if (!fullName || !email) {
    return createErrorResponse({ code: 'MISSING_FIELDS', message: 'Full name and email are required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('aggregator_staff_users')
    .insert({ aggregator_id: staff.aggregatorId, full_name: fullName, email, phone, role, status: 'INVITED' })
    .select()
    .single();

  if (error || !data) {
    const msg = error?.message || '';
    if (/duplicate key|unique/i.test(msg)) {
      return createErrorResponse({ code: 'STAFF_ALREADY_EXISTS', message: 'A team member with this email already exists.', requestId: staff.requestId, httpStatus: 409 });
    }
    return createErrorResponse({ code: 'INVITE_FAILED', message: 'Could not invite team member.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'TEAM_MEMBER_INVITED',
    target_type: 'aggregator_staff_users',
    target_id: data.id,
    result: 'SUCCESS',
    reason: `Invited ${email} as ${role}.`,
  });

  return createSuccessResponse(
    { id: data.id, email: data.email, role: data.role, status: data.status },
    { code: 'TEAM_MEMBER_INVITED', message: 'Team member added with INVITED status. They must register/sign in with this email to activate.', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 },
  );
}
