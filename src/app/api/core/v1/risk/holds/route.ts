import { NextRequest } from 'next/server';
import { FraudCaseManagementEngine } from '@/lib/risk/FraudCaseManagementEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const holds = FraudCaseManagementEngine.getAllHolds();
    return ApiResponse.success({
      count: holds.length,
      holds,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RISK_HOLDS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityId, transactionReference, amountMinor, currency, holdType, reason, createdBy } = body;

    if (!entityId || !amountMinor || !reason || !createdBy) {
      return ApiResponse.badRequest('entityId, amountMinor, reason, and createdBy are required to create a risk hold.');
    }

    const hold = FraudCaseManagementEngine.createHold({
      entityId,
      transactionReference,
      amountMinor,
      currency: currency || 'NGN',
      holdType: holdType || 'RISK_HOLD',
      reason,
      createdBy,
    });

    return ApiResponse.created(hold, `Risk hold ${hold.holdReference} created successfully.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RISK_HOLD_CREATION_ERROR', 400);
  }
}
