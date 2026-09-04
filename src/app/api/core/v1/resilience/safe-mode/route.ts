import { NextRequest } from 'next/server';
import { DisasterRecoveryEngine } from '@/lib/resilience/DisasterRecoveryEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const state = DisasterRecoveryEngine.getSafeModeState();
    return ApiResponse.success(state);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'SAFE_MODE_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enabled, reason, actor } = body;

    if (enabled === true) {
      if (!reason || !actor) {
        return ApiResponse.badRequest('reason and actor are required to activate Financial Safe Mode.');
      }
      const state = DisasterRecoveryEngine.activateSafeMode(reason, actor);
      return ApiResponse.success(state, 'Financial Safe Mode ACTIVATED. Outbound financial mutations locked.');
    } else {
      if (!actor) {
        return ApiResponse.badRequest('actor is required to deactivate Financial Safe Mode.');
      }
      const state = DisasterRecoveryEngine.deactivateSafeMode(actor);
      return ApiResponse.success(state, 'Financial Safe Mode DEACTIVATED. Standard processing resumed.');
    }
  } catch (err: any) {
    return ApiResponse.error(err.message, 'SAFE_MODE_MUTATION_ERROR', 400);
  }
}
