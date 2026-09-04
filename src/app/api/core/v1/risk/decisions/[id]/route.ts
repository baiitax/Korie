import { NextRequest } from 'next/server';
import { RiskDecisionEngine } from '@/lib/risk/RiskDecisionEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const decision = RiskDecisionEngine.getDecisionById(params.id);
    if (!decision) {
      return ApiResponse.notFound(`Risk decision with ID ${params.id} not found.`);
    }

    return ApiResponse.success(decision);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RISK_DECISION_FETCH_ERROR', 500);
  }
}
