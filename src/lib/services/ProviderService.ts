import { DbProviderNode } from '@/types/database';

export interface ProviderTransferResult {
  success: boolean;
  providerCode: string;
  providerReference: string;
  responseCode: string;
  message: string;
  latencyMs: number;
  settledAt: string;
  rawResponse: Record<string, any>;
}

export interface DynamicVirtualAccountResult {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  expiresAt: string;
  reference: string;
}

/**
 * Providus Bank Nigeria Provider Adapter (NIP & Virtual Accounts)
 */
export class ProvidusBankAdapter {
  static readonly CODE = 'PROVIDUS_NG';
  static readonly NAME = 'Providus Bank Nigeria Plc';

  static async initiateNipOutward(params: {
    reference: string;
    destinationBankCode: string;
    destinationAccountNumber: string;
    beneficiaryName: string;
    amount: number; // minor units (kobo)
    narration: string;
  }): Promise<ProviderTransferResult> {
    const startTime = Date.now();
    // Simulate real switch latency (80ms - 180ms)
    await new Promise(r => setTimeout(r, 120));
    const latencyMs = Date.now() - startTime;

    const providerRef = `PROV-NIP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const sessionId = `999013${Date.now()}${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      success: true,
      providerCode: this.CODE,
      providerReference: providerRef,
      responseCode: '00', // Central NIBSS Success Code
      message: 'Transaction Approved or Completed Successfully',
      latencyMs,
      settledAt: new Date().toISOString(),
      rawResponse: {
        sessionId,
        responseCode: '00',
        responseMessage: 'Approved',
        accountNumber: params.destinationAccountNumber,
        amount: params.amount,
      },
    };
  }

  static async generateDynamicVirtualAccount(params: {
    reference: string;
    customerName: string;
    amount?: number;
    expiresMinutes?: number;
  }): Promise<DynamicVirtualAccountResult> {
    const randomNuban = `9928${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = new Date(Date.now() + (params.expiresMinutes || 120) * 60 * 1000).toISOString();

    return {
      bankName: 'Providus Bank',
      bankCode: '000023',
      accountNumber: randomNuban,
      accountName: `KORIE / SAHEL / ${params.customerName.toUpperCase()}`,
      expiresAt,
      reference: params.reference,
    };
  }
}

/**
 * Coris Bank Niger Republic Provider Adapter (WAEMU RTGS & GIM-UEMOA Clearing)
 */
export class KorisBankAdapter {
  static readonly CODE = 'KORIS_NE';
  static readonly NAME = 'Coris Bank International (Niger Republic)';

  static async initiateWaemuSettlement(params: {
    reference: string;
    destinationBankCode: string;
    accountNumber: string;
    recipientName: string;
    amountXof: number; // minor units CFA
    narration: string;
  }): Promise<ProviderTransferResult> {
    const startTime = Date.now();
    await new Promise(r => setTimeout(r, 150));
    const latencyMs = Date.now() - startTime;

    const providerRef = `KORIS-RTGS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      success: true,
      providerCode: this.CODE,
      providerReference: providerRef,
      responseCode: 'WAEMU_00',
      message: 'Settlement confirmed by Coris Bank Central Core node.',
      latencyMs,
      settledAt: new Date().toISOString(),
      rawResponse: {
        batchId: `BATCH-KORIS-${Date.now()}`,
        statusCode: 'CLEARED',
        recipient: params.recipientName,
        account: params.accountNumber,
        clearingRail: 'GIM_UEMOA_RTGS',
      },
    };
  }
}

/**
 * Central Provider Gateway & Health Router
 */
export class ProviderService {
  static async getProviderNodes(): Promise<DbProviderNode[]> {
    return [
      {
        id: 'node_providus_01',
        code: 'PROVIDUS_NG',
        name: 'Providus Bank Nigeria NIP Banking Node',
        country: 'NG',
        status: 'CONNECTED',
        is_active: true,
        base_url: 'https://api.providusbank.com/v2',
        health_check_url: '/health',
        latency_ms: 142,
        success_rate_24h: 99.94,
        last_ping_at: new Date().toISOString(),
        circuit_breaker_state: 'CLOSED',
        consecutive_failures: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'node_koris_01',
        code: 'KORIS_NE',
        name: 'Coris Bank Niger Republic WAEMU Core Node',
        country: 'NE',
        status: 'CONNECTED',
        is_active: true,
        base_url: 'https://api.korisbank.ne/v1',
        health_check_url: '/status',
        latency_ms: 188,
        success_rate_24h: 99.88,
        last_ping_at: new Date().toISOString(),
        circuit_breaker_state: 'CLOSED',
        consecutive_failures: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      },
    ];
  }
}
