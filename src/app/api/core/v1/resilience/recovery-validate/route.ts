import { NextRequest } from 'next/server';
import { DisasterRecoveryEngine } from '@/lib/resilience/DisasterRecoveryEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const operator = body.operator || 'DISASTER_RECOVERY_COMMANDER';

    const result = DisasterRecoveryEngine.runPostRecoveryValidation(operator);
    return ApiResponse.success(result, `7-Step Post-Recovery Financial & Identity Validation complete: [${result.overallStatus}]`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RECOVERY_VALIDATION_ERROR', 500);
  }
}
