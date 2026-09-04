// Transaction Recovery, State Reconciliation & Provider Status Query Engine

import { RecoveryCaseRecord, TransactionAttemptRecord } from '@/types/recoveryEngine';

export class TransactionRecoveryEngine {
  private static instance: TransactionRecoveryEngine;

  private cases: Map<string, RecoveryCaseRecord> = new Map();
  private attempts: TransactionAttemptRecord[] = [];

  private constructor() {
    this.seedRecoveryData();
  }

  public static getInstance(): TransactionRecoveryEngine {
    if (!TransactionRecoveryEngine.instance) {
      TransactionRecoveryEngine.instance = new TransactionRecoveryEngine();
    }
    return TransactionRecoveryEngine.instance;
  }

  private seedRecoveryData() {
    const defaultCases: RecoveryCaseRecord[] = [
      {
        id: 'rec-01',
        caseReference: 'REC-2026-00918',
        transactionReference: 'PAY-NG-20260901',
        customerId: 'cust-ng-001-ibrahim',
        customerName: 'Ibrahim Bello',
        providerId: 'Providus Bank NIP Node',
        failureCategory: 'PROVIDER_TIMEOUT',
        financialExposure: 4850000,
        currency: 'NGN',
        priority: 'P0',
        status: 'PROVIDER_QUERY',
        assignedTeam: 'Payment Recovery Ops',
        assignedUser: 'recovery.analyst@koriepay.ng',
        slaDueAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        isSlaBreached: false,
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
      {
        id: 'rec-02',
        caseReference: 'REC-2026-00922',
        transactionReference: 'PAY-NE-20260902',
        customerId: 'cust-ne-001-amara',
        customerName: 'Amara Diallo',
        providerId: 'Koris Bank UEMOA Gateway',
        failureCategory: 'UNKNOWN_PROVIDER_STATE',
        financialExposure: 4750000,
        currency: 'XOF',
        priority: 'P1',
        status: 'QUEUED',
        assignedTeam: 'Sahel Clearing Desk',
        slaDueAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        isSlaBreached: false,
        createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      },
    ];

    defaultCases.forEach((c) => this.cases.set(c.id, c));

    this.attempts = [
      {
        id: 'att-01',
        transactionReference: 'PAY-NG-20260901',
        providerId: 'Providus Bank NIP',
        attemptNumber: 1,
        idempotencyKey: 'IDEMP-PAY-NG-20260901-01',
        providerReference: 'NIP-TX-99120',
        status: 'TIMEOUT',
        errorCode: 'HTTP_504_GATEWAY_TIMEOUT',
        latencyMs: 30000,
        retryable: true,
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
    ];
  }

  public getCases(): RecoveryCaseRecord[] {
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getCase(id: string): RecoveryCaseRecord | undefined {
    return this.cases.get(id);
  }

  public async queryProviderStatus(params: {
    caseId: string;
    transactionReference: string;
    providerId: string;
  }): Promise<{ success: boolean; determinedStatus: 'SUCCESS' | 'FAILED' | 'STILL_PENDING'; message: string }> {
    const c = this.cases.get(params.caseId);
    if (!c) {
      return { success: false, determinedStatus: 'STILL_PENDING', message: 'CASE_NOT_FOUND' };
    }

    // In a real environment, query Providus NIP or Koris Bank API
    // Simulation: provider confirms successful debit at switch
    const determinedStatus = 'SUCCESS';
    c.status = 'RESOLVED';
    c.resolutionCode = 'PROVIDER_CONFIRMED_SUCCESS';
    c.resolutionReason = 'Upstream switch confirmed transaction settlement. GL posted and reconciled.';
    c.resolvedAt = new Date().toISOString();
    this.cases.set(c.id, c);

    return {
      success: true,
      determinedStatus,
      message: 'Provider confirmed transaction successfully committed at central switch.',
    };
  }
}
