import { NextRequest } from 'next/server';
import { RiskDecisionEngine } from '@/lib/risk/RiskDecisionEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const decisions = RiskDecisionEngine.getAllDecisions();
    return ApiResponse.success({
      count: decisions.length,
      decisions,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RISK_DECISIONS_FETCH_ERROR', 500);
  }
}
