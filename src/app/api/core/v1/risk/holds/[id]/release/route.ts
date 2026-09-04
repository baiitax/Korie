import { NextRequest } from 'next/server';
import { FraudCaseManagementEngine } from '@/lib/risk/FraudCaseManagementEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { releasedBy, releaseReason } = body;

    if (!releasedBy || !releaseReason) {
      return ApiResponse.badRequest('releasedBy and releaseReason are required to release a risk hold.');
    }

    const released = FraudCaseManagementEngine.releaseHold({
      holdId: params.id,
      releasedBy,
      releaseReason,
    });

    return ApiResponse.success(released, `Risk hold ${released.holdReference} released.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RISK_HOLD_RELEASE_ERROR', 400);
  }
}
