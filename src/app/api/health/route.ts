import { NextRequest } from 'next/server';
import { HealthCheckEngine } from '@/lib/resilience/HealthCheckEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const health = HealthCheckEngine.getDeepHealth();
    return ApiResponse.success(health);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'HEALTH_DIAGNOSTIC_FAILURE', 500);
  }
}
