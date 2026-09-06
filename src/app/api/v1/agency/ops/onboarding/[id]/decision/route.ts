import { NextRequest } from 'next/server';
import { authorizeOpsRequest } from '@/lib/security/opsAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/ops/onboarding/:id/decision
 *
 * Human admin approves or rejects an onboarding application. On APPROVE
 * this performs the real chain of effects:
 *   1. Invites the applicant via Supabase Auth (real email invite, real
 *      auth.users row — no password is fabricated or emailed in plaintext).
 *   2. Creates a real public.agents row (status ACTIVE, tier as requested,
 *      limits copied from agent_tier_limit_policies for that tier).
 *   3. Provisions WALLET_FLOAT + CASH_IN_HAND ledger accounts at zero
 *      balance (a real float top-up request is required afterward — this
 *      endpoint does NOT fabricate starting capital).
 *   4. Creates the AGENT organization_members row.
 * On REJECT, only the application row is updated; nothing else is created.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorizeOpsRequest(req, ['SUPER_ADMIN', 'AGENCY_OPS_ADMIN']);
  if (!auth.isAuthorized) {
    return createErrorResponse({ code: auth.errorCode || 'FORBIDDEN', message: auth.errorMessage || 'Not authorized.', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const { decision, rejection_reason } = body;
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return createErrorResponse({ code: 'INVALID_DECISION', message: 'decision must be APPROVED or REJECTED.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: application, error: fetchError } = await admin
    .from('agent_onboarding_applications')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError || !application) {
    return createErrorResponse({ code: 'APPLICATION_NOT_FOUND', message: 'Onboarding application not found.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 404 });
  }

  if (application.status !== 'SUBMITTED' && application.status !== 'UNDER_REVIEW') {
    return createErrorResponse({ code: 'APPLICATION_ALREADY_DECIDED', message: `This application has already been ${application.status}.`, requestId: `KP-REQ-${Date.now()}`, httpStatus: 409 });
  }

  if (decision === 'REJECTED') {
    const { data: updated } = await admin
      .from('agent_onboarding_applications')
      .update({ status: 'REJECTED', reviewed_by: auth.userId, reviewed_at: new Date().toISOString(), rejection_reason: rejection_reason || null })
      .eq('id', params.id)
      .select()
      .single();

    return createSuccessResponse(
      { id: updated.id, status: updated.status },
      { code: 'ONBOARDING_APPLICATION_REJECTED', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' }
    );
  }

  // APPROVED path — create the real agent identity chain.
  const { data: tierPolicy, error: tierError } = await admin
    .from('agent_tier_limit_policies')
    .select('*')
    .eq('tier', application.requested_tier)
    .maybeSingle();

  if (tierError || !tierPolicy) {
    return createErrorResponse({ code: 'TIER_POLICY_NOT_FOUND', message: 'No limit policy configured for the requested tier.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(application.email, {
    data: { full_name: application.applicant_full_name, role: 'AGENT' },
  });

  if (inviteError || !inviteData?.user) {
    return createErrorResponse({ code: 'AUTH_INVITE_FAILED', message: inviteError?.message || 'Could not create the agent login invite.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 502 });
  }

  const authUserId = inviteData.user.id;

  const { data: userProfile, error: profileError } = await admin
    .from('user_profiles')
    .upsert({ auth_user_id: authUserId, email: application.email, full_name: application.applicant_full_name, country: application.country, status: 'ACTIVE' }, { onConflict: 'auth_user_id' })
    .select()
    .single();

  if (profileError) {
    return createErrorResponse({ code: 'PROFILE_CREATE_FAILED', message: 'Could not create user profile.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  const { data: agentRole } = await admin.from('roles').select('id').eq('name', 'AGENT').single();
  if (agentRole) {
    await admin.from('organization_members').upsert(
      { org_id: application.org_id, user_id: userProfile.id, role_id: agentRole.id, status: 'ACTIVE' },
      { onConflict: 'org_id,user_id' }
    );
  }

  const currency = application.country === 'NG' ? 'NGN' : 'XOF';
  const agentCodePrefix = application.country === 'NG' ? 'AG-NG' : 'AG-NE';
  const agentCode = `${agentCodePrefix}-${authUserId.slice(0, 6).toUpperCase()}`;

  const { data: agentRow, error: agentError } = await admin
    .from('agents')
    .insert({
      org_id: application.org_id,
      auth_user_id: authUserId,
      agent_code: agentCode,
      agent_name: application.applicant_full_name,
      business_name: application.business_name,
      phone: application.phone,
      email: application.email,
      country: application.country,
      state_or_region: application.state_or_region,
      city_or_lga: application.city_or_lga,
      tier: application.requested_tier,
      status: 'ACTIVE',
      kyc_status: 'PENDING',
      daily_cash_limit: tierPolicy.daily_cash_limit,
      single_transaction_limit: tierPolicy.single_transaction_limit,
    })
    .select()
    .single();

  if (agentError) {
    return createErrorResponse({ code: 'AGENT_CREATE_FAILED', message: 'Could not create agent record.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  // Provision zero-balance ledger accounts — no starting capital is invented.
  const { data: floatAccount } = await admin
    .from('ledger_accounts')
    .insert({
      org_id: application.org_id,
      account_number: `AGT-FLOAT-${application.country}-${agentRow.id.slice(0, 8).toUpperCase()}`,
      name: `Agent Wallet Float — ${agentCode}`,
      type: 'ASSET',
      currency,
      country: application.country,
      balance: 0,
    })
    .select()
    .single();

  const { data: cashAccount } = await admin
    .from('ledger_accounts')
    .insert({
      org_id: application.org_id,
      account_number: `AGT-CASH-${application.country}-${agentRow.id.slice(0, 8).toUpperCase()}`,
      name: `Agent Cash In Hand — ${agentCode}`,
      type: 'ASSET',
      currency,
      country: application.country,
      balance: 0,
    })
    .select()
    .single();

  if (floatAccount && cashAccount) {
    await admin.from('agent_float_accounts').insert([
      { agent_id: agentRow.id, ledger_account_id: floatAccount.id, account_kind: 'WALLET_FLOAT', currency },
      { agent_id: agentRow.id, ledger_account_id: cashAccount.id, account_kind: 'CASH_IN_HAND', currency },
    ]);
  }

  await admin
    .from('agent_onboarding_applications')
    .update({ status: 'APPROVED', reviewed_by: auth.userId, reviewed_at: new Date().toISOString(), converted_agent_id: agentRow.id })
    .eq('id', params.id);

  await admin.from('agent_audit_logs').insert({
    agent_id: agentRow.id,
    action: 'AGENT_ONBOARDED',
    target_type: 'agent_onboarding_applications',
    target_id: params.id,
    result: 'SUCCESS',
    reason: `Approved by ops reviewer; agent_code=${agentCode}`,
  });

  return createSuccessResponse(
    {
      application_id: params.id,
      agent_id: agentRow.id,
      agent_code: agentCode,
      auth_user_id: authUserId,
      status: 'APPROVED',
      note: 'Agent invited via email; float accounts provisioned at zero balance and require a real top-up before the agent can transact.',
    },
    { code: 'ONBOARDING_APPROVED', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' }
  );
}
