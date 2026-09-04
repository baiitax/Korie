import { NextRequest } from 'next/server';
import { ReconciliationEngine } from '@/lib/financial/ReconciliationEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF') || 'NGN';

    const sessions = ReconciliationEngine.getSessions();
    const exceptions = ReconciliationEngine.getExceptions();
    const suspenseAging = ReconciliationEngine.getSuspenseAgingSummary(currency);

    return ApiResponse.success({
      sessionsCount: sessions.length,
      exceptionsCount: exceptions.length,
      sessions,
      exceptions,
      suspenseAging,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RECONCILIATION_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, providerCode, country, currency, internalRecords, providerRecords, exceptionId, notes, operator } = body;

    if (action === 'RESOLVE_EXCEPTION') {
      if (!exceptionId || !notes) {
        return ApiResponse.badRequest('exceptionId and notes are required to resolve a discrepancy.');
      }
      const resolved = ReconciliationEngine.resolveException(exceptionId, notes, operator || 'RECON_OFFICER');
      return ApiResponse.success(resolved, `Discrepancy ${exceptionId} resolved successfully.`);
    }

    // Default: run automated 4-way matching session
    if (!providerCode || !internalRecords || !providerRecords) {
      return ApiResponse.badRequest('providerCode, internalRecords, and providerRecords are required.');
    }

    const session = ReconciliationEngine.runAutomatedReconciliation({
      providerCode,
      country: country || 'NG',
      currency: currency || 'NGN',
      internalRecords,
      providerRecords,
    });

    return ApiResponse.created(session, `Automated reconciliation session completed. Matched: ${session.matchedRecordsCount}, Exceptions: ${session.unmatchedRecordsCount}`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RECONCILIATION_RUN_ERROR', 400);
  }
}
