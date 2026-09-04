import { NextRequest } from 'next/server';
import { ExceptionEngine } from '@/lib/reconciliation/ExceptionEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any;
    const severity = searchParams.get('severity') as any;

    const exceptions = ExceptionEngine.getExceptions({ status, severity });

    return ApiResponse.success({
      count: exceptions.length,
      exceptions,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'EXCEPTIONS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, exceptionId, rootCause, resolutionNotes, resolutionCode, makerId, checkerId, checkerRole, assignedTo, assignedDesk } = body;

    if (!exceptionId) {
      return ApiResponse.badRequest('exceptionId is required.');
    }

    // 1. Assign exception
    if (action === 'ASSIGN') {
      if (!assignedTo) return ApiResponse.badRequest('assignedTo is required.');
      const assigned = ExceptionEngine.assignException(exceptionId, assignedTo, assignedDesk);
      return ApiResponse.success(assigned, `Exception ${assigned.exceptionReference} assigned to ${assignedTo}.`);
    }

    // 2. MAKER: Submit resolution
    if (action === 'SUBMIT_RESOLUTION') {
      if (!rootCause || !resolutionNotes || !makerId) {
        return ApiResponse.badRequest('rootCause, resolutionNotes, and makerId are required.');
      }
      const proposed = ExceptionEngine.submitResolution({
        exceptionId,
        rootCause,
        resolutionNotes,
        resolutionCode: resolutionCode || 'STANDARD_RESOLUTION',
        makerId,
      });
      return ApiResponse.success(proposed, `Exception resolution submitted for Checker approval.`);
    }

    // 3. CHECKER: Approve resolution & post compensating journal
    if (action === 'APPROVE_RESOLUTION') {
      if (!checkerId) return ApiResponse.badRequest('checkerId is required.');
      const resolved = ExceptionEngine.approveResolution({
        exceptionId,
        checkerId,
        checkerRole: checkerRole || 'FINANCE_DIRECTOR',
      });
      return ApiResponse.success(resolved, `Exception ${resolved.exceptionReference} resolved and compensating journal posted.`);
    }

    return ApiResponse.badRequest(`Unknown action: ${action}`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'EXCEPTION_ACTION_ERROR', 400);
  }
}
