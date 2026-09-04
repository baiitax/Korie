// =============================================================================
// File: src/lib/adashi/AdashiCycleObligationEngine.ts
// Description: Adashi Cycle Obligations, Auto-Collection & Idempotency Safeguards
// =============================================================================

import { AdashiStore } from './AdashiStore';
import { AdashiContributionObligation, AdashiCycle } from '@/types/adashiEngine';

export class AdashiCycleObligationEngine {
  /**
   * Execute Auto-Debit Contribution for a specific Obligation
   */
  static processContributionPayment(
    obligationId: string,
    paymentMethod: string = 'WALLET_AUTO_DEBIT',
    idempotencyKey?: string
  ): AdashiContributionObligation {
    const obligation = AdashiStore.getObligationById(obligationId);
    if (!obligation) throw new Error(`Obligation '${obligationId}' not found.`);

    if (obligation.status === 'PAID') {
      return obligation; // Idempotent no-op
    }

    const group = AdashiStore.getGroupById(obligation.adashiId);
    const cycle = AdashiStore.getCycleById(obligation.cycleId);
    if (!cycle) throw new Error(`Cycle '${obligation.cycleId}' not found.`);

    const now = new Date().toISOString();
    const paymentRef = `PAY-ADA-${obligation.adashiId.slice(-4)}-${obligation.cycleNumber}-${Date.now().toString().slice(-4)}`;
    const ledgerJournalId = `JRN-${Date.now().toString().slice(-8)}`;

    // Update Obligation to PAID
    const updatedObligation = AdashiStore.updateObligation(obligationId, {
      status: 'PAID',
      paidAt: now,
      paymentMethod,
      ledgerJournalId,
      paymentReference: paymentRef,
      errorMessage: undefined,
    })!;

    // Update member total contributed amount
    const member = AdashiStore.getMemberById(obligation.memberId);
    if (member) {
      AdashiStore.updateMember(member.id, {
        totalContributedAmount: member.totalContributedAmount + obligation.amount,
      });
    }

    // Update cycle actual collected amount
    const cycleObligations = AdashiStore.getObligations(obligation.adashiId, obligation.cycleId);
    const totalCollected = cycleObligations
      .filter((o) => o.status === 'PAID')
      .reduce((sum, o) => sum + o.amount, 0);

    const allPaid = cycleObligations.every((o) => o.status === 'PAID');
    const newCycleStatus = allPaid ? 'COLLECTION_COMPLETED' : 'COLLECTION_IN_PROGRESS';

    AdashiStore.updateCycle(cycle.id, {
      actualCollectedAmount: totalCollected,
      status: newCycleStatus,
    });

    // Log Audit
    AdashiStore.logAuditEvent({
      eventType: 'CONTRIBUTION_PAID',
      adashiId: obligation.adashiId,
      actorId: obligation.customerId,
      actorRole: 'CUSTOMER',
      details: {
        obligationId: obligation.id,
        amount: obligation.amount,
        currency: obligation.currency,
        paymentReference: paymentRef,
        ledgerJournalId,
      },
      correlationId: idempotencyKey || `idemp-pay-${Date.now()}`,
    });

    return updatedObligation;
  }

  /**
   * Mark Obligation as Overdue or Defaulted
   */
  static flagObligationOverdue(obligationId: string, reason: string): AdashiContributionObligation {
    const obligation = AdashiStore.getObligationById(obligationId);
    if (!obligation) throw new Error(`Obligation not found.`);

    const updated = AdashiStore.updateObligation(obligationId, {
      status: 'OVERDUE',
      errorMessage: reason,
    })!;

    const cycle = AdashiStore.getCycleById(obligation.cycleId);
    if (cycle) {
      AdashiStore.updateCycle(cycle.id, {
        status: 'DEFAULT_ARREARS',
      });
    }

    return updated;
  }
}
