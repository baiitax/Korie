import { NextRequest } from 'next/server';
import { FraudCaseManagementEngine } from '@/lib/risk/FraudCaseManagementEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const cases = FraudCaseManagementEngine.getAllCases();
    return ApiResponse.success({
      count: cases.length,
      cases,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'FRAUD_CASES_FETCH_ERROR', 500);
  }
}
