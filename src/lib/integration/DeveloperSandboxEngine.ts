// Deterministic Developer Sandbox Simulation Engine

import { SandboxScenario, SandboxExecutionResult } from '@/types/integrationEngine';

export class DeveloperSandboxEngine {
  private static instance: DeveloperSandboxEngine;

  private constructor() {}

  public static getInstance(): DeveloperSandboxEngine {
    if (!DeveloperSandboxEngine.instance) {
      DeveloperSandboxEngine.instance = new DeveloperSandboxEngine();
    }
    return DeveloperSandboxEngine.instance;
  }

  public simulate(scenario: SandboxScenario, payload: any): SandboxExecutionResult {
    switch (scenario) {
      case 'SUCCESS':
        return {
          scenario: 'SUCCESS',
          httpStatus: 200,
          success: true,
          simulatedResponse: {
            status: 'COMPLETED',
            transactionReference: `TX-SANDBOX-${Date.now().toString().slice(-6)}`,
            amount: payload.amount || 500000,
            currency: payload.currency || 'NGN',
            recipient: payload.recipient || '0123456789',
            settledAt: new Date().toISOString(),
            message: 'Sandbox payment completed successfully.',
          },
          latencyMs: 95,
          idempotencyValidated: true,
        };

      case 'PROVIDER_TIMEOUT':
        return {
          scenario: 'PROVIDER_TIMEOUT',
          httpStatus: 504,
          success: false,
          simulatedResponse: {
            status: 'UNKNOWN',
            errorCode: 'PROVIDER_GATEWAY_TIMEOUT',
            message: 'Upstream banking rail did not respond within 5000ms SLA. Transaction state is UNKNOWN. Query status endpoint before retrying.',
            resolutionGuidance: 'Call GET /api/v1/transfers/{reference} to verify state.',
          },
          latencyMs: 5012,
          idempotencyValidated: true,
        };

      case 'INSUFFICIENT_FUNDS':
        return {
          scenario: 'INSUFFICIENT_FUNDS',
          httpStatus: 400,
          success: false,
          simulatedResponse: {
            status: 'FAILED',
            errorCode: 'INSUFFICIENT_SETTLEMENT_BALANCE',
            message: 'Partner wallet balance is insufficient for requested disbursement volume.',
          },
          latencyMs: 65,
          idempotencyValidated: true,
        };

      case 'AML_STEP_UP':
        return {
          scenario: 'AML_STEP_UP',
          httpStatus: 403,
          success: false,
          simulatedResponse: {
            status: 'STEP_UP_REQUIRED',
            errorCode: 'AML_VELOCITY_CHALLENGE',
            message: 'Transaction exceeds standard daily velocity limit. Step-up biometrics or maker-checker dual authorization required.',
          },
          latencyMs: 140,
          idempotencyValidated: true,
        };

      case 'RATE_LIMITED':
        return {
          scenario: 'RATE_LIMITED',
          httpStatus: 429,
          success: false,
          simulatedResponse: {
            status: 'RATE_LIMITED',
            errorCode: 'BURST_QUOTA_EXCEEDED',
            message: 'Client exceeded 50 req/s bursting threshold. Retry-After: 1',
          },
          latencyMs: 12,
          idempotencyValidated: false,
        };
    }
  }
}
