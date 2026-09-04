// Developer Sandbox Engine with Deterministic Simulation Scenarios

export interface SandboxScenarioExecution {
  scenario: 'SUCCESS' | 'PROVIDER_TIMEOUT' | 'INSUFFICIENT_FUNDS' | 'AML_STEP_UP';
  simulatedLatencyMs: number;
  httpStatus: number;
  responsePayload: Record<string, any>;
}

export class DeveloperSandboxEngine {
  private static instance: DeveloperSandboxEngine;

  private constructor() {}

  public static getInstance(): DeveloperSandboxEngine {
    if (!DeveloperSandboxEngine.instance) {
      DeveloperSandboxEngine.instance = new DeveloperSandboxEngine();
    }
    return DeveloperSandboxEngine.instance;
  }

  public evaluateSandboxHeader(scenarioHeader?: string): SandboxScenarioExecution {
    const scenario = (scenarioHeader?.toUpperCase() || 'SUCCESS') as any;

    switch (scenario) {
      case 'PROVIDER_TIMEOUT':
        return {
          scenario: 'PROVIDER_TIMEOUT',
          simulatedLatencyMs: 3000,
          httpStatus: 202,
          responsePayload: {
            status: 'UNKNOWN',
            message: 'Upstream banking gateway timed out. Transaction queued for automated recovery.',
            recoveryCaseReference: `REC-${Date.now().toString().slice(-6)}`,
          },
        };

      case 'INSUFFICIENT_FUNDS':
        return {
          scenario: 'INSUFFICIENT_FUNDS',
          simulatedLatencyMs: 80,
          httpStatus: 400,
          responsePayload: {
            status: 'FAILED',
            errorCode: 'INSUFFICIENT_AVAILABLE_BALANCE',
            message: 'Account available balance is insufficient to complete transaction.',
          },
        };

      case 'AML_STEP_UP':
        return {
          scenario: 'AML_STEP_UP',
          simulatedLatencyMs: 150,
          httpStatus: 403,
          responsePayload: {
            status: 'CHALLENGED',
            errorCode: 'COMPLIANCE_VERIFICATION_REQUIRED',
            message: 'High-velocity transaction requires biometric/OTP step-up verification.',
          },
        };

      case 'SUCCESS':
      default:
        return {
          scenario: 'SUCCESS',
          simulatedLatencyMs: 120,
          httpStatus: 200,
          responsePayload: {
            status: 'SUCCESS',
            transactionId: `TXN-SIM-${Date.now().toString().slice(-6)}`,
            message: 'Sandbox transaction simulated successfully.',
          },
        };
    }
  }
}
