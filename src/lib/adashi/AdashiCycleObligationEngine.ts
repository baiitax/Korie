// =============================================================================
// File: src/lib/adashi/AdashiCycleObligationEngine.ts
// Description: Adashi obligation engine, REAL money path (D-A4).
//
// Previous implementation marked obligations PAID unconditionally and invented
// ledger/journal references. This rewrite:
//   1. executes a real double-entry transaction via LedgerService
//      (customer-wallet liability DEBIT → Adashi escrow pool CREDIT, or
//      agent cash-in-transit DEBIT for offline agent collections) and a real
//      CUSTOMER_WALLET subledger debit — journal/payment references come from
//      the executed ledger records, never fabricated;
//   2. enforces ownership (customer scope), balance sufficiency
//      (INSUFFICIENT_FUNDS → FAILED, no fake success), PIN for manual pays and
//      mandate authorization for auto-debits;
//   3. drives status transitions itself (SCHEDULED → PENDING_AUTO_DEBIT →
//      PAID / FAILED, grace → OVERDUE) — statuses are outcomes, not labels;
//   4. sweeps due obligations (auto-collection) and composes email reminders
//      when an auto-debit fails because the account is negative/insufficient
//      (EmailNotificationEngine; honest QUEUED outbox when no SMTP is set).
//
// Auto-debit + reminders only apply to CUSTOMER-formed circles
// (creatorRole === 'CUSTOMER'); agent console circles keep their manual
// agent-collection flow (ledger-backed as AGENT_COLLECTION).
// =============================================================================

import { AdashiStore } from './AdashiStore';
import {
  AdashiContributionObligation,
  AdashiCurrency,
  AdashiCycle,
  AdashiObligationStatus,
} from '@/types/adashiEngine';
import { LedgerService } from '../services/LedgerService';
import { SubledgerEngine } from '../financial/SubledgerEngine';
import {
  EmailNotificationEngine,
  formatAdashiTemplateVariables,
  EmailTemplateId,
} from '../email/EmailNotificationEngine';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type CollectionInitiatedBy = 'CUSTOMER_MANUAL_PIN' | 'AUTO_MANDATE_DEBIT' | 'AGENT_COLLECTION';

export type CollectionErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_PAID'
  | 'NOT_OWNED'
  | 'INSUFFICIENT_FUNDS'
  | 'NO_WALLET_ON_FILE'
  | 'MANDATE_REQUIRED'
  | 'PIN_REQUIRED'
  | 'LEDGER_UNAVAILABLE';

export interface CollectionPaymentInfo {
  ledgerJournalId: string;
  paymentReference: string;
  paidAt: string;
  method: string;
}

export type CollectionOutcome =
  | { success: true; obligation: AdashiContributionObligation; payment: CollectionPaymentInfo }
  | { success: false; code: CollectionErrorCode; message: string; obligation?: AdashiContributionObligation };

export interface SweepEvent {
  type: 'AUTO_DEBIT_SUCCESS' | 'AUTO_DEBIT_INSUFFICIENT_FUNDS' | 'OVERDUE_FLAGGED';
  adashiId: string;
  obligationId: string;
  amount: number;
  currency: AdashiCurrency;
  message: string;
  payment?: CollectionPaymentInfo;
  reminderId?: string;
}

// ---------------------------------------------------------------------------
// Ledger plumbing helpers
// ---------------------------------------------------------------------------

function walletLiabilityAccountId(currency: AdashiCurrency): string {
  return currency === 'NGN' ? 'acc_liab_customer_wallets_ngn' : 'acc_liab_customer_wallets_xof';
}

function escrowPoolAccountId(currency: AdashiCurrency): string {
  return currency === 'NGN' ? 'acc_liab_adashi_escrow_ngn' : 'acc_liab_adashi_escrow_xof';
}

function agentCashInTransitAccountId(currency: AdashiCurrency): string {
  return currency === 'NGN' ? 'acc_asset_agent_cash_ngn' : 'acc_asset_agent_cash_xof';
}

/** Wallet available balance in WHOLE currency units (matches portal display). */
function walletAvailableBalance(customerId: string, currency: AdashiCurrency): number | null {
  const sub = SubledgerEngine.getInstance().getSubledger('CUSTOMER_WALLET', customerId, currency);
  return sub && sub.isActive ? sub.availableBalance : null;
}

function firstNameOf(fullName: string): string {
  return fullName.split(/\s+/)[0] || fullName;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class AdashiCycleObligationEngine {
  /**
   * Execute a contribution payment against a REAL ledger transaction.
   *
   * Manual (PIN) and auto (mandate) paths require the member's own wallet;
   * AGENT_COLLECTION books offline cash (agent console) as
   * cash-in-transit → escrow, which is the honest representation of a
   * physical collection for members without a KORIE wallet.
   */
  static async processContributionPayment(params: {
    obligationId: string;
    initiatedBy: CollectionInitiatedBy;
    idempotencyKey?: string;
    /** true once the route-layer PIN vault verified the caller (manual path) */
    pinVerified?: boolean;
    /** Owner guard: for CUSTOMER paths, the obligation must belong to this id */
    customerScopeId?: string;
  }): Promise<CollectionOutcome> {
    const { obligationId, initiatedBy, idempotencyKey, pinVerified } = params;

    const obligation = AdashiStore.getObligationById(obligationId);
    if (!obligation) {
      return { success: false, code: 'NOT_FOUND', message: `Obligation '${obligationId}' not found.` };
    }

    if (obligation.status === 'PAID') {
      return {
        success: false,
        code: 'ALREADY_PAID',
        message: 'This obligation is already paid.',
        obligation,
      };
    }

    const group = AdashiStore.getGroupById(obligation.adashiId);
    if (!group) {
      return { success: false, code: 'NOT_FOUND', message: 'Circle not found.' };
    }
    const cycle = AdashiStore.getCycleById(obligation.cycleId);
    if (!cycle) {
      return { success: false, code: 'NOT_FOUND', message: 'Cycle not found.' };
    }
    const member = AdashiStore.getMemberById(obligation.memberId);

    // Ownership: a scoped customer may only ever pay their own obligations.
    if (params.customerScopeId && obligation.customerId !== params.customerScopeId) {
      return {
        success: false,
        code: 'NOT_OWNED',
        message: 'This obligation does not belong to the signed-in customer.',
      };
    }

    // Authorization rules per path
    if (initiatedBy === 'CUSTOMER_MANUAL_PIN') {
      if (pinVerified !== true) {
        return { success: false, code: 'PIN_REQUIRED', message: 'A verified transaction PIN is required.' };
      }
    }
    if (initiatedBy === 'AUTO_MANDATE_DEBIT') {
      if (!member?.mandateAuthorized) {
        return {
          success: false,
          code: 'MANDATE_REQUIRED',
          message: 'Auto-debit requires an authorized mandate.',
          obligation,
        };
      }
    }

    const currency = obligation.currency;

    // --- Real balance check (wallet paths only) ---
    let walletBalance: number | null = null;
    if (initiatedBy !== 'AGENT_COLLECTION') {
      walletBalance = walletAvailableBalance(obligation.customerId, currency);
      if (walletBalance === null) {
        return {
          success: false,
          code: 'NO_WALLET_ON_FILE',
          message: `No ${currency} wallet exists for this member — auto/manual wallet debit is not possible.`,
          obligation,
        };
      }
      if (walletBalance < obligation.amount) {
        return this.failObligation(obligation, {
          code: 'INSUFFICIENT_FUNDS',
          message: `Insufficient funds: wallet has ${currency} ${walletBalance}, contribution is ${currency} ${obligation.amount}.`,
          paymentMethod: initiatedBy === 'AUTO_MANDATE_DEBIT' ? 'WALLET_AUTO_DEBIT' : 'WALLET_MANUAL_PIN',
          initiatedBy,
        });
      }
    }

    // --- Double-entry journal (minor units) ---
    const minorAmount = Math.round(obligation.amount * 100);
    const method =
      initiatedBy === 'AUTO_MANDATE_DEBIT'
        ? 'WALLET_AUTO_DEBIT'
        : initiatedBy === 'CUSTOMER_MANUAL_PIN'
          ? 'WALLET_MANUAL_PIN'
          : 'AGENT_COLLECTION';
    const debitAccountId =
      initiatedBy === 'AGENT_COLLECTION'
        ? agentCashInTransitAccountId(currency)
        : walletLiabilityAccountId(currency);
    const debitNarration =
      initiatedBy === 'AGENT_COLLECTION'
        ? `Agent cash collection for ${group.groupName} cycle ${cycle.cycleNumber} (to be remitted)`
        : `${method} contribution — ${group.groupName} cycle ${cycle.cycleNumber}`;

    let ledgerTx;
    try {
      const posted = await awaitLedgerPost({
        description: `Adashi contribution — ${group.groupName} cycle ${cycle.cycleNumber}`,
        currency,
        debitAccountId,
        debitNarration,
        creditAccountId: escrowPoolAccountId(currency),
        creditNarration: `Escrow pool — ${group.groupName} cycle ${cycle.cycleNumber}`,
        minorAmount,
        referenceSeed: idempotencyKey,
      });
      ledgerTx = posted;
    } catch (error: any) {
      return {
        success: false,
        code: 'LEDGER_UNAVAILABLE',
        message: error?.message || 'Ledger refused the transaction.',
        obligation,
      };
    }

    // --- Customer wallet subledger debit (whole units, matches portal) ---
    if (initiatedBy !== 'AGENT_COLLECTION') {
      SubledgerEngine.getInstance().mutateBalance({
        subledgerType: 'CUSTOMER_WALLET',
        entityId: obligation.customerId,
        accountCode: '2010',
        currency,
        country: group.countryCode,
        deltaAmount: -obligation.amount,
      });
    }

    const now = new Date().toISOString();
    const payment: CollectionPaymentInfo = {
      ledgerJournalId: ledgerTx.transaction.id,
      paymentReference: ledgerTx.transaction.transactionReference,
      paidAt: now,
      method,
    };

    // --- Record state (statuses are ENGINE outcomes) ---
    const updatedObligation = AdashiStore.updateObligation(obligationId, {
      status: 'PAID',
      paidAt: now,
      paymentMethod: method,
      ledgerJournalId: payment.ledgerJournalId,
      paymentReference: payment.paymentReference,
      errorMessage: undefined,
      retryCount: (obligation.retryCount || 0) + 1,
      lastRetryAt: now,
    })!;

    if (member) {
      AdashiStore.updateMember(member.id, {
        totalContributedAmount: member.totalContributedAmount + obligation.amount,
      });
    }

    AdashiStore.updateGroup(group.id, {
      totalPoolVolume: group.totalPoolVolume + obligation.amount,
    });
    this.recomputeCycleProgress(cycle);

    AdashiStore.logAuditEvent({
      eventType: 'CONTRIBUTION_PAID',
      adashiId: obligation.adashiId,
      actorId: obligation.customerId,
      actorRole: initiatedBy === 'AGENT_COLLECTION' ? 'AGENT' : 'CUSTOMER',
      details: {
        obligationId: obligation.id,
        amount: obligation.amount,
        currency,
        paymentReference: payment.paymentReference,
        ledgerJournalId: payment.ledgerJournalId,
        paymentMethod: method,
        initiatedBy,
      },
      correlationId: idempotencyKey || `idemp-pay-${Date.now()}`,
    });

    return { success: true, obligation: updatedObligation, payment };
  }

  private static failObligation(
    obligation: AdashiContributionObligation,
    opts: { code: CollectionErrorCode; message: string; paymentMethod: string; initiatedBy: CollectionInitiatedBy },
  ): CollectionOutcome {
    const now = new Date().toISOString();
    const updated = AdashiStore.updateObligation(obligation.id, {
      status: 'FAILED',
      errorMessage: opts.message,
      paymentMethod: opts.paymentMethod,
      retryCount: (obligation.retryCount || 0) + 1,
      lastRetryAt: now,
    })!;
    AdashiStore.logAuditEvent({
      eventType: 'CONTRIBUTION_FAILED',
      adashiId: obligation.adashiId,
      actorId: obligation.customerId,
      actorRole: opts.initiatedBy === 'AGENT_COLLECTION' ? 'AGENT' : 'CUSTOMER',
      details: { obligationId: obligation.id, code: opts.code, message: opts.message },
      correlationId: `fail-${obligation.id}-${Date.now()}`,
    });
    return { success: false, code: opts.code, message: opts.message, obligation: updated };
  }

  private static recomputeCycleProgress(cycle: AdashiCycle): void {
    const cycleObligations = AdashiStore.getObligations(cycle.adashiId, cycle.id);
    const totalCollected = cycleObligations
      .filter((o) => o.status === 'PAID')
      .reduce((sum, o) => sum + o.amount, 0);

    const openObligations = cycleObligations.filter(
      (o) => o.status !== 'PAID' && o.status !== 'WAIVED' && o.status !== 'DEFAULTED',
    );
    let nextStatus = cycle.status;
    if (openObligations.length === 0) nextStatus = 'COLLECTION_COMPLETED';
    else if (totalCollected > 0) nextStatus = 'COLLECTION_IN_PROGRESS';
    else nextStatus = 'CONTRIBUTION_OPEN';

    AdashiStore.updateCycle(cycle.id, {
      actualCollectedAmount: totalCollected,
      status: nextStatus,
    });
  }

  // -------------------------------------------------------------------------
  // Due sweep + auto-collection + negative-account email reminders
  // -------------------------------------------------------------------------

  /**
   * Demo-runtime substitute for a cron scheduler: the customer BFF triggers
   * this on portal reads. Idempotent; safe to run repeatedly.
   */
  static async runDueSweep(now: Date = new Date()): Promise<SweepEvent[]> {
    const events: SweepEvent[] = [];
    const store = AdashiStore;
    const emailEngine = EmailNotificationEngine.getInstance();

    for (const group of store.getGroups()) {
      // Auto-debit + reminders apply to customer-formed circles only
      if (group.creatorRole !== 'CUSTOMER') continue;

      const members = new Map(store.getMembers(group.id).map((m) => [m.id, m]));
      for (const cycle of store.getCycles(group.id)) {
        if (cycle.status === 'CLOSED' || cycle.status === 'COLLECTION_COMPLETED') continue;
        for (const obligation of store.getObligations(group.id, cycle.id)) {
          if (obligation.status === 'PAID' || obligation.status === 'WAIVED' || obligation.status === 'DEFAULTED') {
            continue;
          }
          const member = members.get(obligation.memberId);
          const isPortalCustomer = obligation.customerId.startsWith('cust-');
          const duePassed = now.getTime() >= new Date(obligation.dueDate).getTime();
          const gracePassed = now.getTime() >= new Date(obligation.graceDeadline).getTime();
          const isOverdueState =
            obligation.status === 'GRACE_PERIOD' ||
            obligation.status === 'OVERDUE' ||
            (duePassed && gracePassed);

          if (!duePassed) continue;

          // 1) Auto-collection: mandate-authorized portal members with a wallet
          const balance = walletAvailableBalance(obligation.customerId, obligation.currency);
          const canAuto = Boolean(member?.mandateAuthorized) && isPortalCustomer && balance !== null;

          if (canAuto && (obligation.status === 'SCHEDULED' || obligation.status === 'PENDING_AUTO_DEBIT')) {
            store.updateObligation(obligation.id, { status: 'PENDING_AUTO_DEBIT' });
            const outcome = await AdashiCycleObligationEngine.processContributionPayment({
              obligationId: obligation.id,
              initiatedBy: 'AUTO_MANDATE_DEBIT',
              idempotencyKey: `sweep-${obligation.id}-${Math.floor(now.getTime() / 60000)}`,
            });
            if (outcome.success && outcome.payment) {
              events.push({
                type: 'AUTO_DEBIT_SUCCESS',
                adashiId: group.id,
                obligationId: obligation.id,
                amount: obligation.amount,
                currency: obligation.currency,
                message: 'Contribution auto-collected from wallet.',
                payment: outcome.payment,
              });
            } else if (
              !outcome.success &&
              (outcome.code === 'INSUFFICIENT_FUNDS' || outcome.code === 'NO_WALLET_ON_FILE')
            ) {
              const reminder = await this.composeAccountReminder({
                emailEngine,
                groupName: group.groupName,
                obligation,
                balance: balance ?? 0,
                templateId: 'ADASHI_INSUFFICIENT_FUNDS',
              });
              events.push({
                type: 'AUTO_DEBIT_INSUFFICIENT_FUNDS',
                adashiId: group.id,
                obligationId: obligation.id,
                amount: obligation.amount,
                currency: obligation.currency,
                message: outcome.message,
                reminderId: reminder?.id,
              });
            }
            continue;
          }

          // 2) Grace → OVERDUE escalation for open, past-grace obligations
          if (gracePassed && isOverdueState && obligation.status !== 'OVERDUE') {
            store.updateObligation(obligation.id, {
              status: 'OVERDUE',
              errorMessage: 'PAST_GRACE_DEADLINE',
            });
            if (isPortalCustomer) {
              const reminder = await this.composeAccountReminder({
                emailEngine,
                groupName: group.groupName,
                obligation,
                balance: balance ?? 0,
                templateId: 'ADASHI_OVERDUE_REMINDER',
              });
              events.push({
                type: 'OVERDUE_FLAGGED',
                adashiId: group.id,
                obligationId: obligation.id,
                amount: obligation.amount,
                currency: obligation.currency,
                message: `Contribution moved to OVERDUE after the grace deadline (${obligation.currency} ${obligation.amount}).`,
                reminderId: reminder?.id,
              });
            } else {
              events.push({
                type: 'OVERDUE_FLAGGED',
                adashiId: group.id,
                obligationId: obligation.id,
                amount: obligation.amount,
                currency: obligation.currency,
                message: `Contribution moved to OVERDUE after the grace deadline (${obligation.currency} ${obligation.amount}).`,
              });
            }
          }
        }
      }
    }
    return events;
  }

  private static async composeAccountReminder(params: {
    emailEngine: EmailNotificationEngine;
    groupName: string;
    obligation: AdashiContributionObligation;
    balance: number;
    templateId: EmailTemplateId;
  }): Promise<{ id: string } | null> {
    const { emailEngine, obligation } = params;
    const member = AdashiStore.getMemberById(obligation.memberId);
    const toEmail = member?.customerEmail;
    if (!toEmail) return null;
    if (emailEngine.hasOpenReminder(obligation.customerId, params.templateId, obligation.id)) {
      return null; // dedupe: do not stack identical open reminders
    }
    const record = await emailEngine.composeAndQueue({
      templateId: params.templateId,
      customerId: obligation.customerId,
      toEmail,
      toName: member?.customerName || 'KoriePay customer',
      variables: formatAdashiTemplateVariables({
        customerFirstName: firstNameOf(member?.customerName || 'there'),
        groupName: params.groupName,
        amount: obligation.amount,
        currency: obligation.currency,
        dueDate: obligation.dueDate,
        walletBalance: params.balance,
      }),
      adashiId: obligation.adashiId,
      obligationId: obligation.id,
    });
    return { id: record.id };
  }
}

// LedgerService.postTransaction is async; bridge it here so engine methods can
// stay mostly synchronous for callers that do not need the sweep.
async function awaitLedgerPost(params: {
  description: string;
  currency: AdashiCurrency;
  debitAccountId: string;
  debitNarration: string;
  creditAccountId: string;
  creditNarration: string;
  minorAmount: number;
  referenceSeed?: string;
}): Promise<{ transaction: { id: string; transactionReference: string } }> {
  const transactionReference = `KP-ADA-${params.referenceSeed || `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
  const result = await LedgerService.postTransaction({
    orgId: 'org_kor_99182',
    transactionReference,
    description: params.description,
    currency: params.currency as any,
    entries: [
      {
        accountId: params.debitAccountId,
        entryType: 'DEBIT',
        amount: params.minorAmount,
        narration: params.debitNarration,
      },
      {
        accountId: params.creditAccountId,
        entryType: 'CREDIT',
        amount: params.minorAmount,
        narration: params.creditNarration,
      },
    ],
  });
  return {
    transaction: { id: result.transaction.id, transactionReference: result.transaction.transactionReference },
  };
}
