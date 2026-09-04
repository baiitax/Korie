import { DbTransaction, TransactionStatus } from '@/types/database';
import { LedgerService } from './LedgerService';
import { ProvidusBankAdapter, KorisBankAdapter } from './ProviderService';
import { OutboxService } from './OutboxService';
import { AuditService } from './AuditService';
import { RequestContext } from '@/types/apiGateway';

const transactionsStore = new Map<string, DbTransaction>();

export class TransactionService {
  /**
   * Executes an atomic Bilateral Cross-Border Remittance (NGN <-> XOF).
   */
  static async executeCrossBorderTransfer(
    context: RequestContext,
    params: {
      sourceCurrency: 'NGN' | 'XOF';
      destinationCurrency: 'NGN' | 'XOF';
      amount: number; // minor units
      reference: string;
      recipient: {
        name: string;
        bankCode: string;
        accountNumber: string;
        phone?: string;
      };
      narration?: string;
    }
  ): Promise<DbTransaction> {
    if (params.amount < 100) {
      throw new Error('INVALID_AMOUNT: Transfer amount must be at least 100 minor currency units.');
    }

    const fee = Math.floor(params.amount * 0.005); // 0.5% fee
    const netAmount = params.amount - fee;
    const exchangeRate = params.sourceCurrency === 'NGN' ? 0.43 : 2.31;
    const destAmount = Math.floor(netAmount * exchangeRate);

    // 1. Double-Entry Ledger Posting
    // Debit Customer Wallet (Liability), Credit Settlement Pool (Asset), Credit Revenue Account (Revenue)
    const ledgerResult = await LedgerService.postTransaction({
      orgId: context.orgId,
      transactionReference: params.reference,
      description: `Bilateral Cross-Border Transfer: ${params.sourceCurrency} -> ${params.destinationCurrency}`,
      currency: params.sourceCurrency,
      entries: [
        {
          accountId: 'acc_liab_customer_wallets_ngn',
          entryType: 'DEBIT',
          amount: params.amount,
          narration: `Debit wallet for transfer ${params.reference}`,
        },
        {
          accountId: 'acc_asset_providus_ngn',
          entryType: 'CREDIT',
          amount: netAmount,
          narration: `Settlement clearing credit for ${params.reference}`,
        },
        {
          accountId: 'acc_rev_tx_fees_ngn',
          entryType: 'CREDIT',
          amount: fee,
          narration: `Fee revenue for ${params.reference}`,
        },
      ],
    });

    // 2. Dispatch to Destination Banking Node (Koris Bank Niger Republic)
    const providerDispatch = await KorisBankAdapter.initiateWaemuSettlement({
      reference: params.reference,
      destinationBankCode: params.recipient.bankCode,
      accountNumber: params.recipient.accountNumber,
      recipientName: params.recipient.name,
      amountXof: destAmount,
      narration: params.narration || 'Cross-Border Settlement',
    });

    // 3. Create Canonical Transaction Record
    const tx: DbTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      org_id: context.orgId,
      ledger_transaction_id: ledgerResult.transaction.id,
      reference: params.reference,
      idempotency_key: context.idempotencyKey || `idem_${Date.now()}`,
      request_id: context.requestId,
      correlation_id: context.correlationId,
      type: 'CROSS_BORDER_TRANSFER',
      status: 'SUCCESSFUL',
      amount: params.amount,
      fee,
      net_amount: netAmount,
      currency: params.sourceCurrency,
      source_currency: params.sourceCurrency,
      destination_currency: params.destinationCurrency,
      exchange_rate: exchangeRate,
      recipient_name: params.recipient.name,
      recipient_bank: 'Koris Bank Niger Republic',
      recipient_account: params.recipient.accountNumber,
      provider_code: 'KORIS_NE',
      provider_reference: providerDispatch.providerReference,
      provider_response_code: providerDispatch.responseCode,
      narration: params.narration || 'Cross-border remittance',
      metadata: {
        destAmount,
        providerLatencyMs: providerDispatch.latencyMs,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    transactionsStore.set(tx.reference, tx);

    // 4. Publish Outbox Event
    await OutboxService.publishEvent({
      orgId: context.orgId,
      eventName: 'transfer.successful',
      aggregateType: 'TRANSACTION',
      aggregateId: tx.id,
      payload: {
        reference: tx.reference,
        amount: tx.amount,
        currency: tx.currency,
        recipient: tx.recipient_name,
        providerReference: tx.provider_reference,
      },
    });

    // 5. Append Audit Event
    await AuditService.log({
      orgId: context.orgId,
      actorId: context.userId || 'system',
      actorEmail: 'developer@saheltech.io',
      actorRole: context.userRole || 'ORGANIZATION_ADMIN',
      action: 'TRANSACTION_EXECUTED',
      resourceType: 'TRANSACTION',
      resourceId: tx.id,
      details: `Executed cross-border transfer ${tx.reference} of ${params.sourceCurrency} ${params.amount / 100}`,
      ipAddress: context.ipAddress,
      requestId: context.requestId,
      correlationId: context.correlationId,
    });

    return tx;
  }

  /**
   * Dispatches an Outward NIP Transfer via Providus Bank Nigeria.
   */
  static async executeNipOutward(
    context: RequestContext,
    params: {
      destinationBankCode: string;
      destinationAccountNumber: string;
      beneficiaryName: string;
      amount: number;
      reference: string;
      narration?: string;
    }
  ): Promise<DbTransaction> {
    const fee = 5000; // ₦50.00 minor units
    const netAmount = params.amount - fee;

    // 1. Post to Double-Entry Ledger
    const ledgerResult = await LedgerService.postTransaction({
      orgId: context.orgId,
      transactionReference: params.reference,
      description: `Providus NIP Outward Dispatch: ${params.reference}`,
      currency: 'NGN',
      entries: [
        {
          accountId: 'acc_liab_customer_wallets_ngn',
          entryType: 'DEBIT',
          amount: params.amount,
          narration: `Debit wallet for NIP ${params.reference}`,
        },
        {
          accountId: 'acc_asset_providus_ngn',
          entryType: 'CREDIT',
          amount: netAmount,
          narration: `NIP Outward clearing credit`,
        },
        {
          accountId: 'acc_rev_tx_fees_ngn',
          entryType: 'CREDIT',
          amount: fee,
          narration: `NIP fee revenue`,
        },
      ],
    });

    // 2. Dispatch Providus NIP Outward Adapter
    const providerDispatch = await ProvidusBankAdapter.initiateNipOutward({
      reference: params.reference,
      destinationBankCode: params.destinationBankCode,
      destinationAccountNumber: params.destinationAccountNumber,
      beneficiaryName: params.beneficiaryName,
      amount: netAmount,
      narration: params.narration || 'NIP Outward Transfer',
    });

    const tx: DbTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      org_id: context.orgId,
      ledger_transaction_id: ledgerResult.transaction.id,
      reference: params.reference,
      idempotency_key: context.idempotencyKey || `idem_${Date.now()}`,
      request_id: context.requestId,
      correlation_id: context.correlationId,
      type: 'NIP_OUTWARD_TRANSFER',
      status: 'SUCCESSFUL',
      amount: params.amount,
      fee,
      net_amount: netAmount,
      currency: 'NGN',
      recipient_name: params.beneficiaryName,
      recipient_bank: 'Nigerian Commercial Bank',
      recipient_account: params.destinationAccountNumber,
      provider_code: 'PROVIDUS_NG',
      provider_reference: providerDispatch.providerReference,
      provider_response_code: providerDispatch.responseCode,
      narration: params.narration || 'NIP Outward Dispatch',
      metadata: {
        sessionId: providerDispatch.rawResponse.sessionId,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    transactionsStore.set(tx.reference, tx);

    await OutboxService.publishEvent({
      orgId: context.orgId,
      eventName: 'transfer.successful',
      aggregateType: 'TRANSACTION',
      aggregateId: tx.id,
      payload: {
        reference: tx.reference,
        amount: tx.amount,
        currency: 'NGN',
        providerReference: tx.provider_reference,
      },
    });

    return tx;
  }

  /**
   * Retrieves transaction by reference
   */
  static async getByReference(reference: string): Promise<DbTransaction | null> {
    return transactionsStore.get(reference) || null;
  }
}
