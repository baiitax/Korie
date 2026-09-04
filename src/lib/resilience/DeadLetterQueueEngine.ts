import { DeadLetterJobRecord } from '@/types/resilienceEngine';

export class DeadLetterQueueEngine {
  private static dlq: Map<string, DeadLetterJobRecord> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialDlq();
    }
  }

  private static seedInitialDlq() {
    if (this.dlq.size > 0) return;

    const job1: DeadLetterJobRecord = {
      id: 'dlq_job_001',
      jobKey: 'OUTBOX-WEBHOOK-EVENT-882190',
      queueName: 'outbound-merchant-webhooks',
      payload: {
        event: 'TRANSACTION_SUCCESSFUL',
        merchantId: 'merch_jumia_ng',
        reference: 'TXN-NGN-001',
        amountMinor: 10000000,
        currency: 'NGN',
      },
      errorMessage: 'HTTP 504 Gateway Timeout connecting to merchant endpoint https://api.jumia.ng/webhooks',
      retryCount: 5,
      maxRetries: 5,
      status: 'FAILED',
      createdAt: '2026-09-02T22:15:00Z',
    };
    this.dlq.set(job1.id, job1);
  }

  public static enqueue(params: {
    jobKey: string;
    queueName: string;
    payload: Record<string, any>;
    errorMessage: string;
  }): DeadLetterJobRecord {
    this.ensureInitialized();
    const id = `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const record: DeadLetterJobRecord = {
      id,
      jobKey: params.jobKey,
      queueName: params.queueName,
      payload: params.payload,
      errorMessage: params.errorMessage,
      retryCount: 1,
      maxRetries: 5,
      status: 'FAILED',
      createdAt: new Date().toISOString(),
    };

    this.dlq.set(id, record);
    return record;
  }

  public static replayJob(id: string, operator: string): DeadLetterJobRecord {
    this.ensureInitialized();
    const job = this.dlq.get(id);
    if (!job) {
      throw new Error(`Dead-letter job ${id} not found.`);
    }

    job.status = 'REPLAYED';
    job.replayedAt = new Date().toISOString();
    job.replayedBy = operator;

    return job;
  }

  public static discardJob(id: string): DeadLetterJobRecord {
    this.ensureInitialized();
    const job = this.dlq.get(id);
    if (!job) {
      throw new Error(`Dead-letter job ${id} not found.`);
    }

    job.status = 'DISCARDED';
    return job;
  }

  public static getAllJobs(): DeadLetterJobRecord[] {
    this.ensureInitialized();
    return Array.from(this.dlq.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
