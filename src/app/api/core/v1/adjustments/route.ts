import { NextRequest } from 'next/server';
import { FinancialAdjustmentEngine } from '@/lib/financial/FinancialAdjustmentEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const adjustments = FinancialAdjustmentEngine.getRequests();
    return ApiResponse.success({
      count: adjustments.length,
      adjustments,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'ADJUSTMENTS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, requestId, checkerId, checkerEmail, checkerRole, rejectionReason, targetAccountCode, offsetAccountCode, amount, currency, direction, reason, supportingEvidence, makerId, makerEmail, makerRole } = body;

    // CHECKER: Approve
    if (action === 'APPROVE') {
      if (!requestId || !checkerId || !checkerEmail) {
        return ApiResponse.badRequest('requestId, checkerId, and checkerEmail are required for approval.');
      }
      const approved = FinancialAdjustmentEngine.approveAdjustmentRequest({
        requestId,
        checkerId,
        checkerEmail,
        checkerRole: checkerRole || 'FINANCE_DIRECTOR',
      });
      return ApiResponse.success(approved, `Adjustment request ${approved.requestNumber} approved and posted to general ledger.`);
    }

    // CHECKER: Reject
    if (action === 'REJECT') {
      if (!requestId || !checkerId || !checkerEmail || !rejectionReason) {
        return ApiResponse.badRequest('requestId, checkerId, checkerEmail, and rejectionReason are required.');
      }
      const rejected = FinancialAdjustmentEngine.rejectAdjustmentRequest({
        requestId,
        checkerId,
        checkerEmail,
        checkerRole: checkerRole || 'FINANCE_DIRECTOR',
        rejectionReason,
      });
      return ApiResponse.success(rejected, `Adjustment request ${rejected.requestNumber} rejected.`);
    }

    // MAKER: Submit new adjustment request
    if (!targetAccountCode || !offsetAccountCode || !amount || !direction || !makerId || !makerEmail) {
      return ApiResponse.badRequest('targetAccountCode, offsetAccountCode, amount, direction, makerId, and makerEmail are required.');
    }

    const created = FinancialAdjustmentEngine.submitAdjustmentRequest({
      targetAccountCode,
      offsetAccountCode,
      amount,
      currency: currency || 'NGN',
      direction,
      reason: reason || 'Operational financial correction',
      supportingEvidence: supportingEvidence || 'N/A',
      makerId,
      makerEmail,
      makerRole: makerRole || 'TREASURY_ANALYST',
    });

    return ApiResponse.created(created, `Adjustment request ${created.requestNumber} submitted for Checker approval.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'ADJUSTMENT_OPERATION_ERROR', 400);
  }
}
