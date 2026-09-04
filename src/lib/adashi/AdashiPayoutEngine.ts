// =============================================================================
// File: src/lib/adashi/AdashiPayoutEngine.ts
// Description: Adashi Payouts, Disbursement & Dual-Control Maker-Checker Engine
// =============================================================================

import { AdashiStore } from './AdashiStore';
import { AdashiPayout, AdashiCycle } from '@/types/adashiEngine';

export interface InitiatePayoutInput {
  adashiId: string;
  cycleId: string;
  makerId: string;
  makerName: string;
  destinationType?: 'KORIEPAY_WALLET' | 'BANK_ACCOUNT' | 'MOBILE_MONEY';
  destinationAccountId?: string;
}

export class AdashiPayoutEngine {
  /**
   * Initiate and evaluate payout eligibility for a cycle
   */
  static initiatePayout(input: InitiatePayoutInput): AdashiPayout {
    const group = AdashiStore.getGroupById(input.adashiId);
    if (!group) throw new Error(`Group '${input.adashiId}' not found.`);

    const cycle = AdashiStore.getCycleById(input.cycleId);
    if (!cycle) throw new Error(`Cycle '${input.cycleId}' not found.`);

    if (cycle.status === 'PAYOUT_COMPLETED' || cycle.status === 'CLOSED') {
      throw new Error(`Payout for Cycle ${cycle.cycleNumber} is already completed.`);
    }

    const product = AdashiStore.getProductById(group.productId);
    const requiresDualControl =
      (product?.requiresMakerCheckerPayout ?? true) &&
      cycle.grossPayoutAmount >= (product?.payoutMakerCheckerThreshold ?? 500000);

    const destType = input.destinationType || 'KORIEPAY_WALLET';
    const destAccount = input.destinationAccountId || `WLT-${group.currency}-${cycle.beneficiaryCustomerId}`;
    const paymentRef = `PAYOUT-ADA-${group.currency}-${cycle.cycleNumber}-${Date.now().toString().slice(-6)}`;

    const payout: AdashiPayout = {
      id: `pay-${Date.now()}`,
      adashiId: group.id,
      groupName: group.groupName,
      cycleId: cycle.id,
      cycleNumber: cycle.cycleNumber,
      beneficiaryCustomerId: cycle.beneficiaryCustomerId,
      beneficiaryName: cycle.beneficiaryName,
      grossAmount: cycle.grossPayoutAmount,
      platformFee: cycle.platformFeeAmount,
      agentCommission: cycle.agentCommissionAmount,
      netDisbursedAmount: cycle.netPayoutAmount,
      currency: group.currency,
      destinationType: destType,
      destinationAccountId: destAccount,
      status: requiresDualControl ? 'PENDING_AUTHORIZATION' : 'AUTHORIZED',
      requiresMakerChecker: requiresDualControl,
      makerId: input.makerId,
      makerName: input.makerName,
      paymentReference: paymentRef,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (requiresDualControl) {
      // Create Maker-Checker Request
      const mkc = AdashiStore.addMakerCheckerRequest({
        id: `mkc-pay-${Date.now()}`,
        requestType: 'HIGH_VALUE_PAYOUT',
        entityId: payout.id,
        entityType: 'ADASHI_PAYOUT',
        makerId: input.makerId,
        makerName: input.makerName,
        makerRole: 'AGENT',
        status: 'PENDING',
        makerNotes: `Payout of ${payout.netDisbursedAmount} ${payout.currency} for ${payout.beneficiaryName} in ${group.groupName} (Cycle ${cycle.cycleNumber}).`,
        payloadSnapshot: {
          payoutId: payout.id,
          groupId: group.id,
          cycleId: cycle.id,
          grossAmount: payout.grossAmount,
          netAmount: payout.netDisbursedAmount,
          currency: payout.currency,
        },
        createdAt: new Date().toISOString(),
      });
      payout.makerCheckerRequestId = mkc.id;
    }

    AdashiStore.addPayout(payout);

    // Update cycle status
    AdashiStore.updateCycle(cycle.id, {
      status: requiresDualControl ? 'PAYOUT_PENDING_APPROVAL' : 'PAYOUT_PROCESSING',
      payoutReference: paymentRef,
    });

    // If auto-authorized (below threshold), proceed immediately with ledger release
    if (!requiresDualControl) {
      return this.executeDisbursement(payout.id, input.makerId, 'AUTO_AUTHORIZED_SYSTEM');
    }

    return payout;
  }

  /**
   * Execute ledger double-entry and disburse funds to beneficiary
   */
  static executeDisbursement(
    payoutId: string,
    checkerId: string,
    checkerName: string
  ): AdashiPayout {
    const payout = AdashiStore.getPayoutById(payoutId);
    if (!payout) throw new Error(`Payout '${payoutId}' not found.`);

    if (payout.status === 'COMPLETED') {
      return payout; // Idempotent
    }

    const ledgerJournalId = `JRN-PAYOUT-${Date.now().toString().slice(-8)}`;
    const now = new Date().toISOString();

    const updatedPayout = AdashiStore.updatePayout(payoutId, {
      status: 'COMPLETED',
      checkerId,
      checkerName,
      ledgerJournalId,
      disbursedAt: now,
    })!;

    // Update Cycle
    const cycle = AdashiStore.getCycleById(payout.cycleId);
    if (cycle) {
      AdashiStore.updateCycle(cycle.id, {
        status: 'PAYOUT_COMPLETED',
        payoutCompletedAt: now,
      });
    }

    // Update Beneficiary Member received amount
    const members = AdashiStore.getMembers(payout.adashiId);
    const benMember = members.find((m) => m.customerId === payout.beneficiaryCustomerId);
    if (benMember) {
      AdashiStore.updateMember(benMember.id, {
        totalPayoutReceived: benMember.totalPayoutReceived + payout.netDisbursedAmount,
      });
    }

    // Log Audit
    AdashiStore.logAuditEvent({
      eventType: 'PAYOUT_DISBURSED',
      adashiId: payout.adashiId,
      actorId: checkerId,
      actorRole: 'SYSTEM_OR_CHECKER',
      details: {
        payoutId: payout.id,
        grossAmount: payout.grossAmount,
        netDisbursed: payout.netDisbursedAmount,
        platformFee: payout.platformFee,
        agentCommission: payout.agentCommission,
        beneficiary: payout.beneficiaryName,
        ledgerJournalId,
      },
      correlationId: `payout-disb-${Date.now()}`,
    });

    return updatedPayout;
  }
}
