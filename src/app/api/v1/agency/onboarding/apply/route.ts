import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/onboarding/apply
 *
 * Public (no auth) endpoint for a prospective agent to submit an onboarding
 * application. This is the START of onboarding, before any agents row or
 * login exists. A back-office reviewer later approves/rejects it via
 * /api/v1/agency/ops/onboarding/:id/decision, which is what actually
 * creates a real `agents` row + Supabase Auth invite — nothing here
 * self-activates an agent account.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const {
    org_id, applicant_full_name, business_name, phone, email,
    country, state_or_region, city_or_lga, requested_tier,
  } = body;

  if (!org_id || !applicant_full_name || !business_name || !phone || !email || !country) {
    return createErrorResponse({ code: 'MISSING_REQUIRED_FIELDS', message: 'All applicant, business and contact fields are required.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  if (!['NG', 'NE'].includes(country)) {
    return createErrorResponse({ code: 'INVALID_COUNTRY', message: 'Country must be NG or NE.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('agent_onboarding_applications')
    .insert({
      org_id,
      applicant_full_name,
      business_name,
      phone,
      email,
      country,
      state_or_region: state_or_region || null,
      city_or_lga: city_or_lga || null,
      requested_tier: requested_tier || 'TIER_1',
      status: 'SUBMITTED',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return createErrorResponse({ code: 'APPLICATION_ALREADY_EXISTS', message: 'An application with this email already exists for this organization.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 409 });
    }
    return createErrorResponse({ code: 'APPLICATION_SUBMIT_FAILED', message: 'Could not submit application.', requestId: `KP-REQ-${Date.now()}`, httpStatus: 500 });
  }

  return createSuccessResponse(
    { id: data.id, status: data.status, submitted_at: data.submitted_at },
    { code: 'ONBOARDING_APPLICATION_SUBMITTED', message: 'Application submitted for review.', requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' }
  );
}
