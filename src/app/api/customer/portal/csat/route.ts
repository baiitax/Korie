// =============================================================================
// Customer-experience measurement capture — the half of the complaints loop
// that did not exist (GAP-2: `grep -ril "csat|nps|satisfaction|survey" src` was
// empty, so every "satisfaction" number anywhere would have been invented).
//
//   POST /api/customer/portal/csat   { complaintId, score 1-5, comment?, }
//
// Rules, enforced here and in ComplaintDisputeEngine.captureCsat:
//   · the case must belong to the session identity (never a client-supplied id);
//   · only a case that actually reached RESOLVED/CLOSED can be rated;
//   · one rating per case — a resubmission is refused, not overwritten;
//   · the score is stored verbatim; nothing averages, imputes or back-fills it.
// =============================================================================

import { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/security/authMiddleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';
import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';
import { customerScopeFromRequest } from '@/lib/customer/customerScope';

export const dynamic = 'force-dynamic';

/** Customer-facing vocabulary → the channel vocabulary the engine stores. */
const CHANNEL = 'PORTAL' as const;

export async function POST(req: NextRequest) {
  const requestId = `KP-REQ-${Date.now()}`;
  const auth = await authenticateApiRequest(req, ['payments:read']);
  if (!auth.isAuthenticated || !auth.context) {
    return createErrorResponse({
      code: auth.errorCode || 'UNAUTHORIZED',
      message: 'We could not confirm who you are. Please sign in again.',
      httpStatus: auth.httpStatus || 401,
      requestId,
    });
  }

  const scope = customerScopeFromRequest(req, auth.context);
  if (!scope.ok || !scope.ownerCustomerId) {
    return createErrorResponse({
      code: 'CUSTOMER_IDENTITY_UNRESOLVED',
      message: 'We could not resolve your profile for this session.',
      httpStatus: 403,
      requestId,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({
      code: 'INVALID_BODY',
      message: "We couldn't read your rating. Please try again.",
      httpStatus: 400,
      requestId,
    });
  }

  const complaintId = String(body.complaintId || '').trim();
  const score = Number(body.score);
  const comment = body.comment ? String(body.comment).trim().slice(0, 500) : undefined;

  if (!complaintId) {
    return createErrorResponse({
      code: 'CASE_REQUIRED',
      message: 'We could not tell which case this rating is for.',
      httpStatus: 422,
      requestId,
    });
  }
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return createErrorResponse({
      code: 'INVALID_SCORE',
      message: 'Please choose a rating between 1 and 5.',
      httpStatus: 422,
      requestId,
    });
  }

  const engine = ComplaintDisputeEngine.getInstance();
  const complaint = engine.getComplaint(complaintId);

  // A case cannot be rated by anyone but the customer it belongs to. The check
  // is a 403 rather than a 404 so the portal cannot be used to probe case ids.
  if (!complaint || complaint.customerId !== scope.ownerCustomerId) {
    return createErrorResponse({
      code: 'CASE_NOT_FOUND',
      message: 'We could not find that case on your profile.',
      httpStatus: 403,
      requestId,
    });
  }

  const result = engine.captureCsat({ complaintId, score, comment, channel: CHANNEL });
  if (!result.ok) {
    if (result.error === 'CSAT_ONLY_AFTER_RESOLUTION') {
      return createErrorResponse({
        code: 'CASE_NOT_RESOLVED',
        message: 'This case is still open — we will ask you to rate it once it is resolved.',
        httpStatus: 409,
        requestId,
      });
    }
    if (result.error === 'ALREADY_RATED') {
      return createErrorResponse({
        code: 'ALREADY_RATED',
        message: 'You have already rated this case. Thank you — your first answer stands.',
        httpStatus: 409,
        requestId,
      });
    }
    return createErrorResponse({
      code: result.error || 'RATING_FAILED',
      message: 'We could not record your rating. Please try again.',
      httpStatus: 400,
      requestId,
    });
  }

  return createSuccessResponse(
    {
      rating: {
        ticketNumber: result.complaint?.complaintReference,
        score: result.complaint?.csatScore,
        capturedAt: result.complaint?.csatCapturedAt,
        channel: result.complaint?.csatChannel,
      },
    },
    {
      code: 'RATING_RECORDED',
      message: 'Thank you — your rating was recorded against this case.',
      requestId: auth.context.requestId,
      correlationId: auth.context.correlationId,
      environment: auth.context.environment,
    },
  );
}
