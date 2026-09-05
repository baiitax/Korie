import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { BeneficiarySecurityEngine } from '@/lib/customer/BeneficiarySecurityEngine';
import { customerScopeFromRequest } from '@/lib/customer/customerScope';

/**
 * /api/beneficiaries — legacy shared endpoint, now authenticated and scoped.
 *
 * Previously this route had no authentication at all and read the owner from
 * `?customerId=`, defaulting to a real customer id when the parameter was
 * missing. Anyone could therefore list (and write) any customer's saved
 * payees. That is exactly the "browser supplies identity" pattern this product
 * forbids.
 *
 * The behaviour contract is now:
 *   • the session must authenticate (`payments:read` / `payments:write`);
 *   • the owner comes from the session only — a `customerId` in the query
 *     string or body is ignored, not trusted;
 *   • requests whose session cannot be mapped to a customer profile are
 *     refused with 403 rather than served the demo customer's data.
 *
 * Response shape is kept compatible for existing agency/merchant callers.
 */
export const dynamic = 'force-dynamic';

const SCOPE_DENIED = {
  code: 'CUSTOMER_IDENTITY_UNRESOLVED',
  message: 'This session is not linked to a customer profile.',
} as const;

async function resolveOwner(req: NextRequest, scope: 'read' | 'write') {
  const auth = await authenticateApiRequest(req, scope === 'read' ? ['payments:read'] : ['payments:write']);
  if (!auth.isAuthenticated || !auth.context) {
    return {
      error: createErrorResponse({
        code: auth.errorCode || 'UNAUTHORIZED',
        message: 'A signed-in session is required.',
        httpStatus: auth.httpStatus || 401,
        requestId: `KP-REQ-${Date.now()}`,
      }),
    };
  }
  const resolved = customerScopeFromRequest(req, auth.context);
  if (!resolved.ok || !resolved.ownerCustomerId) {
    return {
      error: createErrorResponse({
        code: SCOPE_DENIED.code,
        message: SCOPE_DENIED.message,
        httpStatus: 403,
        requestId: `KP-REQ-${Date.now()}`,
      }),
    };
  }
  return { ownerCustomerId: resolved.ownerCustomerId, context: auth.context };
}

export async function GET(request: NextRequest) {
  const resolved = await resolveOwner(request, 'read');
  if (resolved.error) return resolved.error;

  // The query string is deliberately never consulted for identity.
  const engine = BeneficiarySecurityEngine.getInstance();
  const beneficiaries = engine.getBeneficiaries(resolved.ownerCustomerId!);

  return createSuccessResponse(
    { beneficiaries, total: beneficiaries.length },
    { requestId: resolved.context!.requestId, environment: resolved.context!.environment },
  );
}

export async function POST(request: NextRequest) {
  const resolved = await resolveOwner(request, 'write');
  if (resolved.error) return resolved.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse({
      code: 'INVALID_BODY',
      message: 'Malformed request body.',
      httpStatus: 400,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }

  const engine = BeneficiarySecurityEngine.getInstance();
  // Owner is bound from the session; a client-supplied customerId is dropped.
  const { customerId: _ignored, ...rest } = body;
  const beneficiary = engine.addBeneficiary({
    ...(rest as Omit<Parameters<typeof engine.addBeneficiary>[0], 'customerId'>),
    customerId: resolved.ownerCustomerId!,
  });
  return createSuccessResponse(
    { beneficiary },
    { requestId: resolved.context!.requestId, environment: resolved.context!.environment },
  );
}

export async function DELETE(request: NextRequest) {
  const resolved = await resolveOwner(request, 'write');
  if (resolved.error) return resolved.error;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return createErrorResponse({
      code: 'BENEFICIARY_ID_REQUIRED',
      message: 'Specify the payee to remove.',
      httpStatus: 400,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }

  const removed = BeneficiarySecurityEngine.getInstance().removeBeneficiary(id, resolved.ownerCustomerId!);
  if (!removed) {
    // Same answer for "does not exist" and "belongs to someone else".
    return createErrorResponse({
      code: 'BENEFICIARY_NOT_FOUND',
      message: 'That payee is not on your account.',
      httpStatus: 404,
      requestId: `KP-REQ-${Date.now()}`,
    });
  }
  return createSuccessResponse(
    { removed: true },
    { requestId: resolved.context!.requestId, environment: resolved.context!.environment },
  );
}
