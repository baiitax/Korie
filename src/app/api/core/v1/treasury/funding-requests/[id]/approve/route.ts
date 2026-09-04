import { NextRequest } from 'next/server';
import { TreasuryFundingEngine } from '@/lib/treasury/TreasuryFundingEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { checkerId, checkerEmail } = body;

    if (!checkerId || !checkerEmail) {
      return ApiResponse.badRequest('checkerId and checkerEmail are required for funding approval.');
    }

    const approved = TreasuryFundingEngine.approveFundingRequest({
      requestId: params.id,
      checkerId,
      checkerEmail,
    });

    return ApiResponse.success(approved, `Funding request ${approved.requestReference} approved and posted to General Ledger.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'FUNDING_APPROVAL_ERROR', 400);
  }
}
