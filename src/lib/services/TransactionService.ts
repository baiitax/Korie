import { DbTransaction, TransactionStatus } from '@/types/database';
import { LedgerService } from './LedgerService';
import { ProvidusBankAdapter, KorisBankAdapter } from './ProviderService';
import { OutboxService } from './OutboxService';
import { AuditService } from './AuditService';
import { RequestContext } from '@/types/apiGateway';
import { SubledgerEngine } from '../financial/SubledgerEngine';
import { AccountAuthorizationGateway } from '../authorization/AccountAuthorizationGateway';
import { AccountLifecycleEngine } from '../customer/AccountLifecycleEngine';
import { AccountLimitEngine } from '../limits/AccountLimitEngine';

/**
 * Debits the customer's per-currency wallet subledger (the authoritative
 * balance the customer portal reads) so that a successful transfer is
 * reflected in the customer's visible balance — not only in the aggregate GL
 * rollup. Additive: skip when the source customer is unknown.
 *
 * UNIT NOTE: TransactionService/LedgerService amounts are expressed in MINOR
 * units (kobo/cfa-centimes); the customer SubledgerEngine balances are stored
 * as WHOLE currency units (e.g. 1,250,000 NGN). We convert here so the debit
 * lands in the subledger's own unit.
 */
function debitCustomerSubledger(params: {
  customerId: string;
  currency: string;
  amountMinorUnits: number;
  narration: string;
}): void {
  const subledgerEngine = SubledgerEngine.getInstance();
  const isXof = params.currency === 'XOF';
  subledgerEngine.mutateBalance({
    subledgerType: 'CUSTOMER_WALLET',
    entityId: params.customerId,
    accountCode: isXof ? '2020' : '2010',
    currency: params.currency,
    country: isXof ? 'NE' : 'NG',
    deltaAmount: -(params.amountMinorUnits / 100),
  });
}

const transactionsStore = new Map<string, DbTransaction>();

/**
 * Policy authorization for customer-owned TransactionService sends.
 *
 * Returns the account + major-unit amount to record against the daily limit
 * AFTER the send succeeds, or null when there is no customer subject to
 * evaluate (the v1 integrator path, which debits no customer wallet).
 *
 * LIMITATION (stated, not hidden): the limit check happens before the
 * provider flight and consumption is recorded after success, so two sends
 * racing on the same account could jointly overrun the daily cap. The
 * portal UI issues sends sequentially per user, and the bank-core paths
 * (which carry the concurrency battery) hold the sender lock across
 * check + debit + record. A reserve/refund pattern under lock would close
 * this window if integrator concurrency ever requires it.
 */
function authorizeCustomerSend(params: {
  sourceCustomerId?: string;
  currency: 'NGN' | 'XOF';
  amountMinor: number;
  channel: string;
}): { accountId: string; majorAmount: number } | null {
  if (!params.sourceCustomerId) return null;
  const account = AccountLifecycleEngine.getInstance()
    .getAccounts(params.sourceCustomerId)
    .find((a) => a.currency === params.currency && a.status !== 'CLOSED');
  if (!account) {
    throw new Error(`AUTHORIZATION_DECLINED: no ${params.currency} account on file for this customer.`);
  }
  const majorAmount = Math.round(params.amountMinor / 100);
  const verdict = AccountAuthorizationGateway.getInstance().canCustomerPerformAction({
    customerId: params.sourceCustomerId,
    accountId: account.id,
    transactionAmount: majorAmount,
    transactionType: 'DEBIT',
    channel: params.channel,
  });
  if (!verdict.authorized) {
    throw new Error(`AUTHORIZATION_DECLINED: ${verdict.reasonCodes.join('; ')}`);
  }
  return { accountId: account.id, majorAmount };
}

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
      /** Owner's customer id so the source wallet subledger can be debited. */
      sourceCustomerId?: string;
    }
  ): Promise<DbTransaction> {
    if (params.amount < 100) {
      throw new Error('INVALID_AMOUNT: Transfer amount must be at least 100 minor currency units.');
    }

    // Policy authorization: declined here when the customer is not ACTIVE,
    // the product/channel forbids the send, or tiered limits are exceeded.
    const limitReservation = authorizeCustomerSend({
      sourceCustomerId: params.sourceCustomerId,
      currency: params.sourceCurrency,
      amountMinor: params.amount,
      channel: 'VIRTUAL_ACCOUNT',
    });

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

    // 2. Dispatch to Destination Banking Node (Coris Bank Niger Republic)
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
      recipient_bank: 'Coris Bank Niger Republic',
      recipient_account: params.recipient.accountNumber,
      provider_code: 'KORIS_NE',
      provider_reference: providerDispatch.providerReference,
      provider_response_code: providerDispatch.responseCode,
      narration: params.narration || 'Cross-border remittance',
      // Ownership: resolved server-side from the authenticated identity so the
      // customer read path can enforce object-level authorization (§8 of the
      // customer portal brief). Never sourced from the request body.
      owner_customer_id: params.sourceCustomerId,
      metadata: {
        destAmount,
        providerLatencyMs: providerDispatch.latencyMs,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    transactionsStore.set(tx.reference, tx);

    // 4. Debit the customer's source-currency wallet subledger (authoritative
    //    customer balance) for the full source amount (amount + fee).
    if (params.sourceCustomerId) {
      debitCustomerSubledger({
        customerId: params.sourceCustomerId,
        currency: params.sourceCurrency,
        amountMinorUnits: params.amount,
        narration: `Cross-border debit ${params.sourceCurrency} ${params.reference}`,
      });
      if (limitReservation) {
        AccountLimitEngine.getInstance().recordTransactionConsumption(
          limitReservation.accountId,
          limitReservation.majorAmount,
        );
      }
    }

    // 5. Publish Outbox Event
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

    // 6. Append Audit Event
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
      /** Owner's customer id so the source NGN wallet subledger can be debited. */
      sourceCustomerId?: string;
    }
  ): Promise<DbTransaction> {
    // Policy authorization (see cross-border path above).
    const limitReservation = authorizeCustomerSend({
      sourceCustomerId: params.sourceCustomerId,
      currency: 'NGN',
      amountMinor: params.amount,
      channel: 'NIP',
    });

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
      // Ownership resolved server-side (see cross-border path above).
      owner_customer_id: params.sourceCustomerId,
      metadata: {
        sessionId: providerDispatch.rawResponse.sessionId,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    transactionsStore.set(tx.reference, tx);

    // Debit the customer's NGN wallet subledger (authoritative customer balance).
    if (params.sourceCustomerId) {
      debitCustomerSubledger({
        customerId: params.sourceCustomerId,
        currency: 'NGN',
        amountMinorUnits: params.amount,
        narration: `NIP debit ${params.reference}`,
      });
      if (limitReservation) {
        AccountLimitEngine.getInstance().recordTransactionConsumption(
          limitReservation.accountId,
          limitReservation.majorAmount,
        );
      }
    }

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

  /**
   * Authoritative transactions owned by a single customer.
   *
   * SECURITY CONTRACT: ownership is matched against `owner_customer_id`, which
   * is only ever written by the engine from the authenticated request context.
   * There is no public API that accepts a customer id to read another
   * customer's rows — the filter argument is supplied by the server route,
   * never by the browser.
   *
   * A transaction recorded before ownership tagging existed (no
   * `owner_customer_id`) is returned to NOBODY: an unowned financial row must
   * never surface in a customer portal.
   */
  static listRawForOwner(ownerCustomerId: string): DbTransaction[] {
    if (!ownerCustomerId) return [];
    const owned: DbTransaction[] = [];
    transactionsStore.forEach((tx) => {
      if (tx.owner_customer_id && tx.owner_customer_id === ownerCustomerId) owned.push(tx);
    });
    // Newest first, deterministic tie-break on id so cursors cannot skip rows.
    return owned.sort((a, b) => {
      const dt = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (dt !== 0) return dt;
      return b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
    });
  }

  /**
   * Single transaction by reference, scoped to an owner. Returns null when the
   * reference does not exist OR belongs to a different customer — callers must
   * render both as "not found" so existence is never leaked (anti-IDOR).
   */
  static findRawForOwner(reference: string, ownerCustomerId: string): DbTransaction | null {
    if (!reference || !ownerCustomerId) return null;
    const tx = transactionsStore.get(reference) || null;
    if (!tx) return null;
    if (tx.owner_customer_id !== ownerCustomerId) return null;
    return tx;
  }

  /**
   * Single source of truth for the cross-border execution rate. The UI quote
   * must match the rate actually applied so the customer is never shown a
   * different rate from the one executed. Mirrors executeCrossBorderTransfer.
   */
  static getCrossBorderRate(
    sourceCurrency: 'NGN' | 'XOF',
  ): { sourceCurrency: 'NGN' | 'XOF'; destinationCurrency: 'NGN' | 'XOF'; rate: number } {
    const rate = sourceCurrency === 'NGN' ? 0.43 : 2.31;
    return {
      sourceCurrency,
      destinationCurrency: sourceCurrency === 'NGN' ? 'XOF' : 'NGN',
      rate,
    };
  }
}
