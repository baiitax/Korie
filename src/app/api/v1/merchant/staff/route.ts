import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/merchant/staff — the real team roster (owner + any invited
 * staff). Replaces the MERCHANT_STAFF fixture.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_staff_users')
    .select('id, full_name, email, phone, role, branch_id, merchant_branches(branch_name), status, last_login_at')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: true });

  if (error) {
    return createErrorResponse({ code: 'STAFF_LOOKUP_FAILED', message: 'Could not load staff.', requestId: staff.requestId, httpStatus: 500 });
  }

  const mapped = (data || []).map((s: any) => ({
    id: s.id,
    fullName: s.full_name,
    email: s.email,
    phone: s.phone,
    role: s.role,
    branchId: s.branch_id,
    branchName: s.merchant_branches?.branch_name,
    status: s.status,
    lastLoginAt: s.last_login_at,
  }));

  return createSuccessResponse({ staff: mapped }, { code: 'STAFF_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

const ALLOWED_ROLES = ['ADMIN', 'FINANCE_MANAGER', 'BRANCH_MANAGER', 'CASHIER', 'DEVELOPER', 'AUDITOR'];

/**
 * POST /api/v1/merchant/staff — invites a new staff member. Creates an
 * INVITED row without a Supabase Auth user yet (no email delivery is wired
 * up); the invited person completes self-registration with this email, at
 * which point a real ops/admin flow links auth_user_id. Same honest
 * "no fabricated activation" pattern used by the aggregator team invite.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  if (staff.role !== 'MERCHANT_OWNER' && staff.role !== 'ADMIN') {
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
  const role = ALLOWED_ROLES.includes(body.role) ? body.role : 'CASHIER';
  const phone = body.phone ? String(body.phone).trim() : null;
  const branchId = body.branchId && body.branchId !== 'ALL' ? body.branchId : null;

  if (!fullName || !email) {
    return createErrorResponse({ code: 'MISSING_FIELDS', message: 'Full name and email are required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_staff_users')
    .insert({ merchant_id: staff.merchantId, full_name: fullName, email, phone, role, branch_id: branchId, status: 'INVITED' })
    .select()
    .single();

  if (error || !data) {
    const msg = error?.message || '';
    if (/duplicate key|unique/i.test(msg)) {
      return createErrorResponse({ code: 'STAFF_ALREADY_EXISTS', message: 'A team member with this email already exists.', requestId: staff.requestId, httpStatus: 409 });
    }
    return createErrorResponse({ code: 'INVITE_FAILED', message: 'Could not invite team member.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('merchant_audit_logs').insert({
    merchant_id: staff.merchantId,
    actor_staff_id: staff.staffId,
    action: 'TEAM_MEMBER_INVITED',
    target_type: 'merchant_staff_users',
    target_id: data.id,
    result: 'SUCCESS',
    reason: `Invited ${email} as ${role}.`,
  });

  return createSuccessResponse(
    { id: data.id, email: data.email, role: data.role, status: data.status },
    { code: 'TEAM_MEMBER_INVITED', message: 'Team member added with INVITED status. They must register/sign in with this email to activate.', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 },
  );
}
