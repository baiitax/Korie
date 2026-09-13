import { NextRequest } from 'next/server';
import { authenticateRegionalManagerRequest } from '@/lib/security/regionalManagerAuth';
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
  const auth = await authenticateRegionalManagerRequest(req);
  if (!auth.isAuthenticated || !auth.manager) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: auth.errorMessage || 'Not authorized.',
      requestId: `KP-REQ-${Date.now()}`,
      httpStatus: auth.httpStatus || 401,
    });
  }
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
      },
    },
    { requestId: m.requestId, environment: 'PRODUCTION' },
  );
}
