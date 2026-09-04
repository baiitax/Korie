// Server-Side Refund & Reversal Engine with Double-Entry Ledger Posting

import { PaymentRefundRecord, PaymentReversalRecord } from '@/types/recoveryEngine';
import { GeneralLedgerEngine } from '../financial/GeneralLedgerEngine';
import { SubledgerEngine } from '../financial/SubledgerEngine';

export class RefundReversalEngine {
  private static instance: RefundReversalEngine;

  private refunds: Map<string, PaymentRefundRecord> = new Map();
  private reversals: Map<string, PaymentReversalRecord> = new Map();

  private constructor() {
    this.seedRefundsAndReversals();
  }

  public static getInstance(): RefundReversalEngine {
    if (!RefundReversalEngine.instance) {
      RefundReversalEngine.instance = new RefundReversalEngine();
    }
    return RefundReversalEngine.instance;
  }

  private seedRefundsAndReversals() {
    const defaultRefund: PaymentRefundRecord = {
      id: 'ref-01',
      refundReference: 'REF-2026-0041',
      originalTransactionReference: 'PAY-NG-20260901',
      customerId: 'cust-ng-001-ibrahim',
      customerName: 'Ibrahim Bello',
      originalAmount: 5000000,
      refundAmount: 500000,
      remainingRefundableAmount: 4500000,
      currency: 'NGN',
      refundType: 'PARTIAL_REFUND',
      status: 'SUCCESS',
      refundReason: 'Customer requested partial refund for undelivered goods.',
      requestedBy: 'support.lead@koriepay.ng',
      approvedBy: 'finance.manager@koriepay.ng',
      glJournalId: 'jrn-2026-0901',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 23 * 3600 * 1000).toISOString(),
    };

    this.refunds.set(defaultRefund.id, defaultRefund);
  }

  public getRefunds(): PaymentRefundRecord[] {
    return Array.from(this.refunds.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public executeRefund(params: {
    originalTransactionReference: string;
    customerId: string;
    customerName: string;
    originalAmount: number;
    refundAmount: number;
    currency: 'NGN' | 'XOF' | 'USD';
    refundReason: string;
    requestedBy: string;
    country: 'NG' | 'NE';
  }): { success: boolean; refund?: PaymentRefundRecord; error?: string } {
    // 1. Compute Prior Refunds to Prevent Over-Refunding (Double-Refund Protection)
    let totalPreviouslyRefunded = 0;
    this.refunds.forEach((r) => {
      if (
        r.originalTransactionReference === params.originalTransactionReference &&
        (r.status === 'SUCCESS' || r.status === 'APPROVED' || r.status === 'PROCESSING')
      ) {
        totalPreviouslyRefunded += r.refundAmount;
      }
    });

    const remainingAllowed = params.originalAmount - totalPreviouslyRefunded;
    if (params.refundAmount > remainingAllowed) {
      return {
        success: false,
        error: `EXCEEDS_REMAINING_ALLOWANCE: Eligible refund amount is ${params.currency} ${remainingAllowed.toLocaleString()}, requested ${params.refundAmount.toLocaleString()}.`,
      };
    }

    // 2. Post Double-Entry Balanced Compensating Journal
    const glEngine = GeneralLedgerEngine.getInstance();
    const subledgerEngine = SubledgerEngine.getInstance();

    const walletAccount = params.currency === 'NGN' ? '2010' : '2020';
    const clearingAccount = '1030'; // Provider Clearing Settlement

    const journalResult = glEngine.postJournal({
      entryType: 'STANDARD',
      sourceModule: 'MANUAL',
      sourceReference: params.originalTransactionReference,
      narration: `Refund for ${params.originalTransactionReference}: ${params.refundReason}`,
      currency: params.currency,
      postedBy: params.requestedBy,
      lines: [
        {
          accountCode: clearingAccount,
          entrySide: 'DEBIT',
          amount: params.refundAmount,
          currency: params.currency,
          country: params.country,
          legalEntity: params.country === 'NG' ? 'KORIE_NIGERIA_LTD' : 'KORIE_NIGER_SA',
          product: 'WALLET_P2P',
          channel: 'SYSTEM',
          lineNarration: `Compensating debit against provider clearing`,
        },
        {
          accountCode: walletAccount,
          entrySide: 'CREDIT',
          amount: params.refundAmount,
          currency: params.currency,
          country: params.country,
          legalEntity: params.country === 'NG' ? 'KORIE_NIGERIA_LTD' : 'KORIE_NIGER_SA',
          product: 'WALLET_P2P',
          channel: 'SYSTEM',
          lineNarration: `Refund credited to customer wallet`,
        },
      ],
    });

    if (!journalResult.success || !journalResult.journal) {
      return { success: false, error: `LEDGER_POSTING_FAILED: ${journalResult.error}` };
    }

    // Update Subledger
    subledgerEngine.mutateBalance({
      subledgerType: 'CUSTOMER_WALLET',
      entityId: params.customerId,
      accountCode: walletAccount,
      currency: params.currency,
      country: params.country,
      deltaAmount: params.refundAmount,
    });

    const id = `ref-${Date.now().toString().slice(-4)}`;
    const refRecord: PaymentRefundRecord = {
      id,
      refundReference: `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      originalTransactionReference: params.originalTransactionReference,
      customerId: params.customerId,
      customerName: params.customerName,
      originalAmount: params.originalAmount,
      refundAmount: params.refundAmount,
      remainingRefundableAmount: remainingAllowed - params.refundAmount,
      currency: params.currency,
      refundType: params.refundAmount === params.originalAmount ? 'FULL_REFUND' : 'PARTIAL_REFUND',
      status: 'SUCCESS',
      refundReason: params.refundReason,
      requestedBy: params.requestedBy,
      glJournalId: journalResult.journal.id,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.refunds.set(id, refRecord);
    return { success: true, refund: refRecord };
  }
}
