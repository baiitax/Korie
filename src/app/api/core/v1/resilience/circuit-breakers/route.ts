import { NextRequest } from 'next/server';
import { CircuitBreakerEngine } from '@/lib/resilience/CircuitBreakerEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const breakers = CircuitBreakerEngine.getAllBreakers();
    return ApiResponse.success({
      count: breakers.length,
      breakers,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'CIRCUIT_BREAKERS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, serviceKey, reason } = body;

    if (!serviceKey || !action) {
      return ApiResponse.badRequest('serviceKey and action (TRIP or RESET) are required.');
    }

    if (action === 'TRIP') {
      const breaker = CircuitBreakerEngine.tripManually(serviceKey, reason || 'Manual operator emergency trip.');
      return ApiResponse.success(breaker, `Circuit breaker ${serviceKey} forced OPEN.`);
    } else if (action === 'RESET') {
      const breaker = CircuitBreakerEngine.resetBreaker(serviceKey);
      return ApiResponse.success(breaker, `Circuit breaker ${serviceKey} reset to CLOSED.`);
    }

    return ApiResponse.badRequest(`Unsupported action: ${action}`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'CIRCUIT_BREAKER_MUTATION_ERROR', 400);
  }
}
