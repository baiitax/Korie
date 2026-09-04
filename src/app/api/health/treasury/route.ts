import { NextRequest } from 'next/server';
import { HealthCheckEngine } from '@/lib/resilience/HealthCheckEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const health = HealthCheckEngine.getDeepHealth();
    return ApiResponse.success(health.treasury);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'TREASURY_HEALTH_ERROR', 500);
  }
}
