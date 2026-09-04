// Master Payment Switch & Orchestration Engine

import {
  PaymentRecord,
  PaymentAttempt,
  PaymentInitiationRequest,
  PaymentBusinessState,
  PaymentFinancialState,
  PaymentSettlementState,
  PaymentReconciliationState,
} from '@/types/paymentSwitchEngine';
import { PaymentRoutingEngine } from './PaymentRoutingEngine';
import { ProviderAdapterRegistry } from './ProviderAdapterEngine';
import { GeneralLedgerEngine } from '../financial/GeneralLedgerEngine';
import { SubledgerEngine } from '../financial/SubledgerEngine';

export class PaymentSwitchEngine {
  private static instance: PaymentSwitchEngine;

  private payments: Map<string, PaymentRecord> = new Map();
  private paymentAttempts: PaymentAttempt[] = [];
  private idempotencyStore: Map<string, string> = new Map(); // key -> paymentId

  private constructor() {
    this.seedPayments();
  }

  public static getInstance(): PaymentSwitchEngine {
    if (!PaymentSwitchEngine.instance) {
      PaymentSwitchEngine.instance = new PaymentSwitchEngine();
    }
    return PaymentSwitchEngine.instance;
  }

  private seedPayments() {
    const seedPaymentId = 'pay-ng-seed-01';
    const seedAttemptId = 'att-ng-seed-01';

    const attempt: PaymentAttempt = {
      id: seedAttemptId,
      paymentId: seedPaymentId,
      attemptNumber: 1,
      providerCode: 'PROVIDUS_NG',
      providerNodeUrl: 'https://api.providusbank.com/nip/v2/transfer',
      providerReference: 'PRV-NIP-20260901',
      sessionId: '000023260901009182',
      status: 'SUCCESS',
      requestHeaders: { 'Client-Id': 'KORIE_PAY_PROV_NG_01' },
      requestPayload: { amount: 500000, beneficiaryAccount: '0123456789' },
      responseHeaders: { 'X-Providus-Response-Time': '142ms' },
      responsePayload: { responseCode: '00', responseMessage: 'Success' },
      responseCode: '00',
      responseMessage: 'Approved by Providus NIP Switch',
      latencyMs: 142,
      circuitBreakerState: 'CLOSED',
      isTerminal: true,
      createdAt: '2026-09-01T10:00:00Z',
      completedAt: '2026-09-01T10:00:01Z',
    };

    const payment: PaymentRecord = {
      id: seedPaymentId,
      reference: 'PAY-REF-NG-INIT-01',
      externalReference: 'PRV-NIP-20260901',
      tenantId: 'tenant-korie-core',
      customerId: 'cust-ng-001-ibrahim',
      country: 'NG',
      currency: 'NGN',
      amount: 500000,
      feeAmount: 25,
      vatAmount: 0,
      netAmount: 500000,
      direction: 'OUTBOUND',
      channel: 'NIP',
      businessState: 'SUCCESSFUL',
      financialState: 'POSTED',
      settlementState: 'SETTLED',
      reconciliationState: 'MATCHED',
      selectedProvider: 'PROVIDUS_NG',
      activeAttemptId: seedAttemptId,
      totalAttempts: 1,
      senderAccountNumber: '0123456789',
      senderBankCode: '058',
      senderName: 'Ibrahim Bello',
      beneficiaryAccountNumber: '9876543210',
      beneficiaryBankCode: '011',
      beneficiaryName: 'Amina Gambo',
      narration: 'Interbank settlement transfer',
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:02Z',
      settledAt: '2026-09-01T10:00:02Z',
      postedAt: '2026-09-01T10:00:02Z',
      attempts: [attempt],
    };

    this.payments.set(seedPaymentId, payment);
    this.paymentAttempts.push(attempt);
  }

  public getPayments(): PaymentRecord[] {
    return Array.from(this.payments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getPayment(id: string): PaymentRecord | undefined {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    payment.attempts = this.paymentAttempts.filter((a) => a.paymentId === id);
    return payment;
  }

  public getAttempts(): PaymentAttempt[] {
    return [...this.paymentAttempts].reverse();
  }

  public async initiatePayment(request: PaymentInitiationRequest): Promise<{
    success: boolean;
    payment?: PaymentRecord;
    error?: string;
  }> {
    // 1. Idempotency Guard
    if (request.idempotencyKey && this.idempotencyStore.has(request.idempotencyKey)) {
      const existingId = this.idempotencyStore.get(request.idempotencyKey)!;
      const existingPayment = this.getPayment(existingId);
      return { success: true, payment: existingPayment };
    }

    // 2. Fee Calculation
    const feeAmount = request.amount >= 50000 ? 50 : request.amount >= 5000 ? 25 : 10;
    const vatAmount = Number((feeAmount * 0.075).toFixed(2));
    const totalDeduction = request.amount + feeAmount;

    // 3. Subledger Reservation Lock (Hold funds)
    const subledgerEngine = SubledgerEngine.getInstance();
    if (request.customerId && request.direction === 'OUTBOUND') {
      const holdResult = subledgerEngine.placeHold(
        'CUSTOMER_WALLET',
        request.customerId,
        request.currency,
        totalDeduction
      );
      if (!holdResult.success) {
        return { success: false, error: holdResult.error };
      }
    }

    // 4. Create Payment Master Record
    const paymentId = `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const reference = `PAY-${request.country}-${Date.now().toString().slice(-8)}`;

    const newPayment: PaymentRecord = {
      id: paymentId,
      reference,
      tenantId: request.tenantId,
      customerId: request.customerId,
      merchantId: request.merchantId,
      country: request.country,
      currency: request.currency,
      amount: request.amount,
      feeAmount,
      vatAmount,
      netAmount: request.amount,
      direction: request.direction,
      channel: request.channel,
      businessState: 'INITIATED',
      financialState: 'HELD',
      settlementState: 'UNSETTLED',
      reconciliationState: 'UNRECONCILED',
      totalAttempts: 0,
      senderAccountNumber: request.senderAccountNumber,
      senderBankCode: request.senderBankCode,
      senderName: request.senderName,
      beneficiaryAccountNumber: request.beneficiaryAccountNumber,
      beneficiaryBankCode: request.beneficiaryBankCode,
      beneficiaryName: request.beneficiaryName,
      narration: request.narration,
      idempotencyKey: request.idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: [],
    };

    if (request.idempotencyKey) {
      this.idempotencyStore.set(request.idempotencyKey, paymentId);
    }
    this.payments.set(paymentId, newPayment);

    // 5. Dynamic Routing Selection
    const routingEngine = PaymentRoutingEngine.getInstance();
    const route = routingEngine.selectOptimalProvider({
      country: request.country,
      currency: request.currency,
      channel: request.channel,
      amount: request.amount,
      attemptNumber: 1,
    });

    newPayment.selectedProvider = route.selectedProvider;
    newPayment.businessState = 'PROCESSING';

    // 6. Execute Attempt #1
    const adapter = ProviderAdapterRegistry.getAdapter(route.selectedProvider);
    if (!adapter) {
      newPayment.businessState = 'FAILED';
      newPayment.financialState = 'UNPOSTED';
      return { success: false, error: `NO_ADAPTER_FOR_PROVIDER: ${route.selectedProvider}` };
    }

    const attemptId = `att-${Date.now()}-1`;
    const attemptResult = await adapter.execute({
      paymentId,
      reference,
      amount: request.amount,
      currency: request.currency,
      channel: request.channel,
      senderAccount: request.senderAccountNumber,
      beneficiaryAccount: request.beneficiaryAccountNumber,
      beneficiaryBank: request.beneficiaryBankCode,
      beneficiaryName: request.beneficiaryName,
      narration: request.narration,
    });

    const attemptRecord: PaymentAttempt = {
      id: attemptId,
      paymentId,
      attemptNumber: 1,
      providerCode: route.selectedProvider,
      providerReference: attemptResult.providerReference,
      sessionId: attemptResult.sessionId,
      status: attemptResult.status,
      requestHeaders: attemptResult.requestHeaders,
      requestPayload: attemptResult.requestPayload,
      responseHeaders: attemptResult.responseHeaders,
      responsePayload: attemptResult.responsePayload,
      responseCode: attemptResult.responseCode,
      responseMessage: attemptResult.responseMessage,
      latencyMs: attemptResult.latencyMs,
      circuitBreakerState: 'CLOSED',
      isTerminal: attemptResult.isTerminal,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.paymentAttempts.push(attemptRecord);
    newPayment.activeAttemptId = attemptId;
    newPayment.totalAttempts = 1;
    newPayment.externalReference = attemptResult.providerReference;

    if (attemptResult.status === 'SUCCESS') {
      newPayment.businessState = 'SUCCESSFUL';
      newPayment.financialState = 'POSTED';
      newPayment.settlementState = 'SETTLED';
      newPayment.reconciliationState = 'MATCHED';
      newPayment.postedAt = new Date().toISOString();
      newPayment.settledAt = new Date().toISOString();

      // Release hold & mutate customer subledger
      if (request.customerId && request.direction === 'OUTBOUND') {
        subledgerEngine.mutateBalance({
          subledgerType: 'CUSTOMER_WALLET',
          entityId: request.customerId,
          accountCode: request.currency === 'NGN' ? '2010' : '2020',
          currency: request.currency,
          country: request.country,
          deltaAmount: -totalDeduction,
          releaseHeldAmount: totalDeduction,
        });
      }

      // 7. Post Journal Entry to General Ledger
      const glEngine = GeneralLedgerEngine.getInstance();
      const settlementAccount = request.currency === 'NGN' ? '1010' : '1020';
      const walletAccount = request.currency === 'NGN' ? '2010' : '2020';

      glEngine.postJournal({
        entryType: 'PAYMENT_SETTLEMENT',
        sourceModule: 'PAYMENT_SWITCH',
        sourceReference: reference,
        paymentId,
        narration: `Payment Execution: ${reference} (${request.currency} ${request.amount})`,
        currency: request.currency,
        lines: [
          {
            accountCode: walletAccount,
            entrySide: 'DEBIT',
            amount: totalDeduction,
            currency: request.currency,
            country: request.country,
            legalEntity: request.country === 'NG' ? 'KORIE_NIGERIA_LTD' : 'KORIE_NIGER_SA',
            product: 'WALLET_P2P',
            channel: request.channel,
            provider: route.selectedProvider as any,
            lineNarration: 'Customer Wallet Debit',
          },
          {
            accountCode: settlementAccount,
            entrySide: 'CREDIT',
            amount: request.amount,
            currency: request.currency,
            country: request.country,
            legalEntity: request.country === 'NG' ? 'KORIE_NIGERIA_LTD' : 'KORIE_NIGER_SA',
            product: 'WALLET_P2P',
            channel: request.channel,
            provider: route.selectedProvider as any,
            lineNarration: 'Bank Pool Credit',
          },
          {
            accountCode: '4010',
            entrySide: 'CREDIT',
            amount: feeAmount,
            currency: request.currency,
            country: request.country,
            legalEntity: request.country === 'NG' ? 'KORIE_NIGERIA_LTD' : 'KORIE_NIGER_SA',
            product: 'WALLET_P2P',
            channel: request.channel,
            profitCenter: 'PC_FEES',
            lineNarration: 'Fee Revenue',
          },
        ],
      });
    } else {
      newPayment.businessState = 'FAILED';
      newPayment.financialState = 'UNPOSTED';
      if (request.customerId) {
        subledgerEngine.releaseHold('CUSTOMER_WALLET', request.customerId, request.currency, totalDeduction);
      }
    }

    newPayment.updatedAt = new Date().toISOString();
    this.payments.set(paymentId, newPayment);

    return { success: true, payment: this.getPayment(paymentId) };
  }

  public refundPayment(paymentId: string, refundAmount: number, reason: string): { success: boolean; error?: string } {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return { success: false, error: 'PAYMENT_NOT_FOUND' };
    }
    if (payment.businessState !== 'SUCCESSFUL' && payment.businessState !== 'REFUNDED') {
      return { success: false, error: 'CANNOT_REFUND_NON_SUCCESSFUL_PAYMENT' };
    }
    if (refundAmount > payment.amount) {
      return { success: false, error: `REFUND_EXCEEDS_ORIGINAL_AMOUNT: Max allowed is ${payment.amount}` };
    }

    payment.businessState = refundAmount === payment.amount ? 'REFUNDED' : 'REFUNDED';
    payment.financialState = refundAmount === payment.amount ? 'FULLY_REVERSED' : 'PARTIALLY_REVERSED';
    payment.updatedAt = new Date().toISOString();

    // Mutate subledger
    if (payment.customerId) {
      SubledgerEngine.getInstance().mutateBalance({
        subledgerType: 'CUSTOMER_WALLET',
        entityId: payment.customerId,
        accountCode: payment.currency === 'NGN' ? '2010' : '2020',
        currency: payment.currency,
        country: payment.country,
        deltaAmount: refundAmount,
      });
    }

    this.payments.set(paymentId, payment);
    return { success: true };
  }
}
