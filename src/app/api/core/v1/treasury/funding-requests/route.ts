import { NextRequest } from 'next/server';
import { TreasuryFundingEngine } from '@/lib/treasury/TreasuryFundingEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const requests = TreasuryFundingEngine.getAllRequests();
    return ApiResponse.success({
      count: requests.length,
      requests,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'FUNDING_REQUESTS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceAccountCode, destinationAccountCode, sourceAccountName, destinationAccountName, amountMinor, currency, purpose, priority, makerId, makerEmail, idempotencyKey } = body;

    if (!sourceAccountCode || !destinationAccountCode || !amountMinor || !purpose || !makerId || !makerEmail) {
      return ApiResponse.badRequest('sourceAccountCode, destinationAccountCode, amountMinor, purpose, makerId, and makerEmail are required.');
    }

    const created = TreasuryFundingEngine.createFundingRequest({
      sourceAccountCode,
      destinationAccountCode,
      sourceAccountName,
      destinationAccountName,
      amountMinor,
      currency: currency || 'NGN',
      purpose,
      priority: priority || 'NORMAL',
      makerId,
      makerEmail,
      idempotencyKey,
    });

    return ApiResponse.created(created, `Treasury funding request ${created.requestReference} created and submitted for Checker approval.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'FUNDING_REQUEST_CREATION_ERROR', 400);
  }
}
