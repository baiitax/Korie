import { NextRequest } from 'next/server';
import { SettlementEngine } from '@/lib/settlement/SettlementEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const batches = SettlementEngine.getBatches();
    return ApiResponse.success({
      count: batches.length,
      batches,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'SETTLEMENTS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      action, 
      batchId, 
      partnerId, 
      partnerName, 
      partnerType, 
      countryCode, 
      currency, 
      grossAmountMinor, 
      feeDeductionsMinor, 
      reserveRateBps, 
      transactionCount, 
      payoutBankCode, 
      payoutAccountNumber, 
      payoutAccountName, 
      settlementWindow, 
      makerId, 
      makerEmail, 
      checkerId, 
      checkerEmail 
    } = body;

    // 1. Calculate eligibility
    if (action === 'CALCULATE_ELIGIBILITY') {
      if (!partnerId || !grossAmountMinor) {
        return ApiResponse.badRequest('partnerId and grossAmountMinor are required for eligibility calculation.');
      }
      const eligibility = SettlementEngine.calculateEligibility({
        partnerId,
        grossVolumeMinor: grossAmountMinor,
        feesMinor: feeDeductionsMinor || 0,
        rollingReserveRateBps: reserveRateBps || 500,
      });
      return ApiResponse.success(eligibility, 'Settlement eligibility calculated.');
    }

    // 2. CHECKER: Approve settlement batch
    if (action === 'APPROVE_BATCH') {
      if (!batchId || !checkerId || !checkerEmail) {
        return ApiResponse.badRequest('batchId, checkerId, and checkerEmail are required for APPROVE_BATCH.');
      }
      const approved = SettlementEngine.approveBatch({
        batchId,
        checkerId,
        checkerEmail,
      });
      return ApiResponse.success(approved, `Settlement batch ${approved.batchReference} approved and posted to General Ledger.`);
    }

    // 3. Execute Bank Rail Payout
    if (action === 'EXECUTE_PAYOUT') {
      if (!batchId) {
        return ApiResponse.badRequest('batchId is required for EXECUTE_PAYOUT.');
      }
      const executed = SettlementEngine.executeBatchDisbursement(batchId);
      return ApiResponse.success(executed, `Settlement batch ${executed.batchReference} disbursed to bank account.`);
    }

    // 4. MAKER: Default create settlement batch
    if (!partnerId || !grossAmountMinor || !makerId || !makerEmail) {
      return ApiResponse.badRequest('partnerId, grossAmountMinor, makerId, and makerEmail are required to create a settlement batch.');
    }

    const created = SettlementEngine.createBatch({
      settlementType: 'MERCHANT_SETTLEMENT',
      partnerId,
      partnerName: partnerName || 'Merchant Partner',
      partnerType: partnerType || 'MERCHANT',
      countryCode: countryCode || 'NG',
      currency: currency || 'NGN',
      grossAmountMinor,
      feeDeductionsMinor: feeDeductionsMinor || 0,
      reserveRateBps: reserveRateBps || 500,
      transactionCount: transactionCount || 1,
      payoutBankCode: payoutBankCode || '058',
      payoutAccountNumber: payoutAccountNumber || '0123456789',
      payoutAccountName: payoutAccountName || partnerName || 'Settlement Account',
      settlementWindow: settlementWindow || 'T+1',
      makerId,
      makerEmail,
    });

    return ApiResponse.created(created, `Settlement batch ${created.batchReference} created and submitted for Checker approval.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'SETTLEMENT_OPERATION_ERROR', 400);
  }
}
