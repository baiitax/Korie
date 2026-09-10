import { NextRequest } from 'next/server';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { authenticateAgentRequest } from '@/lib/security/agentAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * POST /api/v1/agency/settings/pin
 *
 * Lets a real, authenticated agent set or change their transaction PIN.
 * The PIN is never stored or compared in plaintext: it is salted with a
 * fresh random value on every change and hashed with scrypt (Node's
 * built-in, no extra dependency needed) before being written to
 * public.agents.pin_hash / pin_salt.
 *
 * If the agent already has a PIN set, `current_pin` must be supplied and
 * verified before the change is allowed — this endpoint is a change/rotate
 * flow, not an unauthenticated reset. First-time PIN creation (no PIN set
 * yet) does not require current_pin.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
  const { agent } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: agent.requestId, httpStatus: 400 });
  }

  const { new_pin, current_pin } = body || {};

  if (typeof new_pin !== 'string' || !/^\d{4,6}$/.test(new_pin)) {
    return createErrorResponse({
      code: 'INVALID_PIN_FORMAT',
      message: 'PIN must be 4 to 6 digits.',
      requestId: agent.requestId,
      httpStatus: 400,
    });
  }

  const admin = getSupabaseAdminClient();

  const { data: agentRow, error: fetchError } = await admin
    .from('agents')
    .select('pin_hash, pin_salt')
    .eq('id', agent.agentId)
    .single();

  if (fetchError) {
    return createErrorResponse({ code: 'AGENT_LOOKUP_FAILED', message: 'Could not load agent record.', requestId: agent.requestId, httpStatus: 500 });
  }

  const hasExistingPin = !!agentRow?.pin_hash && !!agentRow?.pin_salt;

  if (hasExistingPin) {
    if (typeof current_pin !== 'string' || !current_pin) {
      return createErrorResponse({
        code: 'CURRENT_PIN_REQUIRED',
        message: 'Enter your current PIN to change it.',
        requestId: agent.requestId,
        httpStatus: 400,
      });
    }
    const existingHash = Buffer.from(agentRow!.pin_hash as string, 'hex');
    const computedHash = scryptSync(current_pin, agentRow!.pin_salt as string, 64);
    const matches = existingHash.length === computedHash.length && timingSafeEqual(existingHash, computedHash);
    if (!matches) {
      return createErrorResponse({
        code: 'CURRENT_PIN_INCORRECT',
        message: 'Your current PIN is incorrect.',
        requestId: agent.requestId,
        httpStatus: 403,
      });
    }
  }

  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(new_pin, salt, 64).toString('hex');

  const { error: updateError } = await admin
    .from('agents')
    .update({
      pin_hash: hash,
      pin_salt: salt,
      pin_set_at: hasExistingPin ? undefined : new Date().toISOString(),
      pin_updated_at: new Date().toISOString(),
    })
    .eq('id', agent.agentId);

  if (updateError) {
    return createErrorResponse({ code: 'PIN_UPDATE_FAILED', message: 'Could not update your PIN. Please try again.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    { pin_set: true, changed_at: new Date().toISOString() },
    { code: hasExistingPin ? 'PIN_CHANGED' : 'PIN_SET', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}

/**
 * GET /api/v1/agency/settings/pin
 * Reports only whether a PIN has been set — never the hash/salt.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAgentRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.agent) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Unauthorized',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
  const { agent } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin.from('agents').select('pin_hash').eq('id', agent.agentId).single();
  if (error) {
    return createErrorResponse({ code: 'AGENT_LOOKUP_FAILED', message: 'Could not load agent record.', requestId: agent.requestId, httpStatus: 500 });
  }

  return createSuccessResponse(
    { pin_set: !!data?.pin_hash },
    { code: 'PIN_STATUS_RETRIEVED', requestId: agent.requestId, environment: 'PRODUCTION' }
  );
}
