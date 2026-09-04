import { NextRequest } from 'next/server';
import { SuspenseEngine } from '@/lib/reconciliation/SuspenseEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = (searchParams.get('currency') as 'NGN' | 'XOF') || 'NGN';

    const schedule = SuspenseEngine.getAgingSchedule(currency);
    const items = SuspenseEngine.getSuspenseItems();

    return ApiResponse.success({
      schedule,
      itemsCount: items.length,
      items,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'SUSPENSE_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, suspenseId, accountCode, amountMinor, currency, sourceReference, providerCode, reason, targetAccountCode, justification, makerId, checkerId } = body;

    // 1. MAKER: Submit suspense resolution proposal
    if (action === 'SUBMIT_RESOLUTION') {
      if (!suspenseId || !targetAccountCode || !makerId) {
        return ApiResponse.badRequest('suspenseId, targetAccountCode, and makerId are required.');
      }
      const item = SuspenseEngine.submitResolution({
        suspenseId,
        action: 'POST_TO_CUSTOMER',
        targetAccountCode,
        justification: justification || 'Identified customer account',
        makerId,
      });
      return ApiResponse.success(item, `Suspense resolution submitted for Checker approval.`);
    }

    // 2. CHECKER: Approve suspense resolution
    if (action === 'APPROVE_RESOLUTION') {
      if (!suspenseId || !targetAccountCode || !checkerId) {
        return ApiResponse.badRequest('suspenseId, targetAccountCode, and checkerId are required.');
      }
      const item = SuspenseEngine.approveResolution({
        suspenseId,
        targetAccountCode,
        checkerId,
      });
      return ApiResponse.success(item, `Suspense item ${item.itemReference} released to ${targetAccountCode} and journal posted.`);
    }

    // 3. Park new item in suspense
    if (!accountCode || !amountMinor || !sourceReference) {
      return ApiResponse.badRequest('accountCode, amountMinor, and sourceReference are required.');
    }

    const item = SuspenseEngine.parkInSuspense({
      accountCode: accountCode as any,
      amountMinor,
      currency: currency || 'NGN',
      sourceReference,
      providerCode: providerCode || 'PROVIDUS_BANK_NG',
      reason: reason || 'Unidentified transaction inflow',
    });

    return ApiResponse.created(item, `Item ${item.itemReference} parked in Suspense Account ${accountCode}.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'SUSPENSE_OPERATION_ERROR', 400);
  }
}
