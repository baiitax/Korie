import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/session
 *
 * The signed-in Regional Manager: name, country and the territories they
 * supervise. Read from regional_manager_users via the caller's real
 * Supabase token — nothing here is client-asserted.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.dashboard.view');
  if (!auth.ok) return auth.response;
  const m = auth.manager;
  return createSuccessResponse(
    {
      role: 'REGIONAL_MANAGER',
      manager: {
        id: m.managerId,
        fullName: m.fullName,
        email: m.email,
        phone: m.phone,
        country: m.country,
        territories: m.territories,
        status: m.status,
        permissions: m.permissions,
      },
    },
    { requestId: m.requestId, environment: 'PRODUCTION' },
  );
}
