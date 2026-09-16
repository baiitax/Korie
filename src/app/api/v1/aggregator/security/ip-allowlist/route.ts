import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { requireAggregatorPermission } from '@/lib/security/aggregatorPermissions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

// Accepts a bare IPv4/IPv6 address (treated as a /32 or /128 exact match)
// or an explicit CIDR block. Deliberately conservative: rejects anything
// that doesn't look like a valid address/CIDR before it ever reaches
// Postgres's own `::cidr` cast, so a malformed entry fails with a clear
// 400 here rather than a confusing 500 from the database.
const IPV4_OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_CIDR = new RegExp(`^(${IPV4_OCTET}\\.){3}${IPV4_OCTET}(\\/(3[0-2]|[12]?\\d))?$`);
const IPV6_CIDR = /^[0-9a-fA-F:]+(\/(12[0-8]|1[01]\d|\d{1,2}))?$/;

function normalizeCidr(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (IPV4_CIDR.test(trimmed)) {
    return trimmed.includes('/') ? trimmed : `${trimmed}/32`;
  }
  if (trimmed.includes(':') && IPV6_CIDR.test(trimmed)) {
    return trimmed.includes('/') ? trimmed : `${trimmed}/128`;
  }
  return null;
}

/** Minimal IPv4 CIDR containment check — used only for the self-lockout
 * guardrail below (best-effort; IPv6 callers simply skip the guardrail
 * rather than risk a false rejection from an incomplete implementation). */
function ipv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = bitsStr ? parseInt(bitsStr, 10) : 32;
  const toInt = (addr: string) =>
    addr.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || !/^(\d{1,3}\.){3}\d{1,3}$/.test(range)) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (toInt(ip) & mask) === (toInt(range) & mask);
}

/**
 * POST /api/v1/aggregator/security/ip-allowlist — add a CIDR entry.
 * DELETE /api/v1/aggregator/security/ip-allowlist?id=... — remove one.
 *
 * Both permission-gated (aggregator.security.manage — Owner/Admin only):
 * this restricts every OTHER staff member's access too, so it must be an
 * accountable-principal decision, same tier as keys/team.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  const permCheck = requireAggregatorPermission(staff, 'aggregator.security.manage');
  if (!permCheck.ok) return permCheck.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const cidr = typeof body.cidr === 'string' ? normalizeCidr(body.cidr) : null;
  if (!cidr) {
    return createErrorResponse({ code: 'INVALID_CIDR', message: 'Provide a valid IPv4/IPv6 address or CIDR block (e.g. 41.58.12.0/24).', requestId: staff.requestId, httpStatus: 400 });
  }
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 255) : null;

  const admin = getSupabaseAdminClient();

  // Guardrail: refuse to add the FIRST-ever allowlist entry unless it
  // covers the caller's own current request IP — otherwise an
  // owner/admin could lock themselves (and everyone else) out on the very
  // next request with a typo'd CIDR and no way back in short of a DB edit.
  // Best-effort IPv4-only check (see ipv4InCidr's own comment); an IPv6
  // caller or an unresolvable IP simply skips this extra guardrail rather
  // than risk a false rejection — the real enforcement is still the
  // database-side is_ip_allowed_for_aggregator() check on every request.
  const { count: existingCount } = await admin
    .from('aggregator_ip_allowlist')
    .select('id', { count: 'exact', head: true })
    .eq('aggregator_id', staff.aggregatorId);

  if (!existingCount || existingCount === 0) {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const callerIp = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
    if (callerIp && !cidr.includes(':') && !callerIp.includes(':') && !ipv4InCidr(callerIp, cidr)) {
      return createErrorResponse({
        code: 'IP_ALLOWLIST_WOULD_LOCK_OUT_CALLER',
        message: `Your current request IP (${callerIp}) is not covered by ${cidr}. Adding this as the first allowlist entry would lock you out immediately — include your own IP/range first.`,
        requestId: staff.requestId,
        httpStatus: 400,
      });
    }
  }

  const { data, error } = await admin
    .from('aggregator_ip_allowlist')
    .insert({ aggregator_id: staff.aggregatorId, cidr, label, added_by_staff_id: staff.staffId })
    .select('id, cidr, label, created_at')
    .single();

  if (error) {
    if ((error as any).code === '23505') {
      return createErrorResponse({ code: 'CIDR_ALREADY_LISTED', message: 'That CIDR is already on the allowlist.', requestId: staff.requestId, httpStatus: 409 });
    }
    return createErrorResponse({ code: 'IP_ALLOWLIST_ADD_FAILED', message: 'Could not add the CIDR to the allowlist.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'IP_ALLOWLIST_ADD',
    target_type: 'aggregator_ip_allowlist',
    target_id: data.id,
    result: 'SUCCESS',
    reason: `Added ${cidr}${label ? ` (${label})` : ''} to the IP allowlist.`,
  });

  return createSuccessResponse(
    { id: data.id, cidr: data.cidr, label: data.label, createdAt: data.created_at },
    { code: 'IP_ALLOWLIST_ADDED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  const permCheck = requireAggregatorPermission(staff, 'aggregator.security.manage');
  if (!permCheck.ok) return permCheck.response;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return createErrorResponse({ code: 'MISSING_PARAMETERS', message: 'id query parameter is required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Scope the delete strictly to this caller's own aggregator — never
  // trust the id alone.
  const { data: existing } = await admin
    .from('aggregator_ip_allowlist')
    .select('id, cidr, label')
    .eq('id', id)
    .eq('aggregator_id', staff.aggregatorId)
    .maybeSingle();

  if (!existing) {
    return createErrorResponse({ code: 'IP_ALLOWLIST_ENTRY_NOT_FOUND', message: 'Allowlist entry not found.', requestId: staff.requestId, httpStatus: 404 });
  }

  const { error } = await admin.from('aggregator_ip_allowlist').delete().eq('id', id).eq('aggregator_id', staff.aggregatorId);
  if (error) {
    return createErrorResponse({ code: 'IP_ALLOWLIST_DELETE_FAILED', message: 'Could not remove the CIDR from the allowlist.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'IP_ALLOWLIST_REMOVE',
    target_type: 'aggregator_ip_allowlist',
    target_id: id,
    result: 'SUCCESS',
    reason: `Removed ${existing.cidr}${existing.label ? ` (${existing.label})` : ''} from the IP allowlist.`,
  });

  return createSuccessResponse({ removed: true }, { code: 'IP_ALLOWLIST_REMOVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}
