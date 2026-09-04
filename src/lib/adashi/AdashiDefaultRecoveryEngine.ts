// =============================================================================
// File: src/lib/adashi/AdashiDefaultRecoveryEngine.ts
// Description: Adashi Default Management, Grace Periods & Recovery Waterfall
// =============================================================================

import { AdashiStore } from './AdashiStore';
import { AdashiRecoveryCase, AdashiRecoveryStage } from '@/types/adashiEngine';

export class AdashiDefaultRecoveryEngine {
  /**
   * Create an official recovery case when an obligation passes grace deadline
   */
  static createRecoveryCase(
    obligationId: string,
    notes: string,
    actorId: string
  ): AdashiRecoveryCase {
    const obligation = AdashiStore.getObligationById(obligationId);
    if (!obligation) throw new Error(`Obligation '${obligationId}' not found.`);

    const group = AdashiStore.getGroupById(obligation.adashiId);
    const caseNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const recoveryCase: AdashiRecoveryCase = {
      id: `rec-${Date.now()}`,
      caseNumber,
      adashiId: obligation.adashiId,
      groupName: group?.groupName,
      cycleId: obligation.cycleId,
      cycleNumber: obligation.cycleNumber,
      obligationId: obligation.id,
      defaultedCustomerId: obligation.customerId,
      defaultedCustomerName: obligation.customerName || 'Unknown Customer',
      assignedAgentId: group?.assignedAgentId,
      assignedAgentName: group?.assignedAgentName,
      outstandingAmount: obligation.amount,
      recoveredAmount: 0,
      currency: obligation.currency,
      stage: 'GRACE_OVERDUE',
      notes,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    AdashiStore.addRecoveryCase(recoveryCase);

    // Update obligation status to DEFAULTED
    AdashiStore.updateObligation(obligation.id, {
      status: 'DEFAULTED',
      errorMessage: `Recovery Case ${caseNumber} opened.`,
    });

    AdashiStore.logAuditEvent({
      eventType: 'RECOVERY_CASE_OPENED',
      adashiId: obligation.adashiId,
      actorId,
      actorRole: 'SYSTEM_OR_AGENT',
      details: { caseNumber, outstandingAmount: obligation.amount, customerId: obligation.customerId },
      correlationId: `rec-case-${Date.now()}`,
    });

    return recoveryCase;
  }

  /**
   * Transition Recovery Case Stage in the Waterfall
   */
  static transitionStage(
    caseId: string,
    newStage: AdashiRecoveryStage,
    recoveredAmountToAdd: number = 0,
    notes?: string
  ): AdashiRecoveryCase {
    const rCase = AdashiStore.getRecoveryCases().find((r) => r.id === caseId);
    if (!rCase) throw new Error(`Recovery case '${caseId}' not found.`);

    const newRecovered = rCase.recoveredAmount + recoveredAmountToAdd;
    const isSettled = newRecovered >= rCase.outstandingAmount || newStage === 'SETTLED';

    const updated = AdashiStore.updateRecoveryCase(caseId, {
      stage: isSettled ? 'SETTLED' : newStage,
      recoveredAmount: newRecovered,
      resolvedAt: isSettled ? new Date().toISOString() : undefined,
      notes: notes ? `${rCase.notes || ''} | [${newStage}] ${notes}` : rCase.notes,
    });

    if (isSettled) {
      AdashiStore.updateObligation(rCase.obligationId, {
        status: 'PAID',
        paidAt: new Date().toISOString(),
      });
    }

    return updated!;
  }
}
