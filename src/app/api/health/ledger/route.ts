import { NextRequest } from 'next/server';
import { HealthCheckEngine } from '@/lib/resilience/HealthCheckEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const health = HealthCheckEngine.getDeepHealth();
    return ApiResponse.success(health.ledger);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'LEDGER_HEALTH_ERROR', 500);
  }
}
