import { NextRequest } from 'next/server';
import { RiskDecisionEngine } from '@/lib/risk/RiskDecisionEngine';
import { ApiResponse } from '@/lib/security/apiResponse';
import { RiskEvaluationRequest } from '@/types/riskEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.transactionReference || !body.entityId || !body.amountMinor) {
      return ApiResponse.badRequest('transactionReference, entityId, and amountMinor are required for risk evaluation.');
    }

    const requestPayload: RiskEvaluationRequest = {
      transactionReference: body.transactionReference,
      entityId: body.entityId,
      entityType: body.entityType || 'CUSTOMER',
      amountMinor: body.amountMinor,
      currency: body.currency || 'NGN',
      countryCode: body.countryCode || 'NG',
      transactionType: body.transactionType,
      device: body.device,
      beneficiary: body.beneficiary,
      counterpartyId: body.counterpartyId,
      agentId: body.agentId,
      merchantId: body.merchantId,
      metadata: body.metadata,
    };

    const decision = RiskDecisionEngine.evaluateTransaction(requestPayload);
    return ApiResponse.success(decision, `Risk evaluation complete: [${decision.decision}] (Score: ${decision.compositeScore}/100)`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RISK_EVALUATION_ERROR', 400);
  }
}
