// =============================================================================
// File: src/lib/adashi/AdashiMakerCheckerEngine.ts
// Description: Adashi Maker-Checker Dual Control & Approval Workflow Engine
// =============================================================================

import { AdashiStore } from './AdashiStore';
import { AdashiMakerCheckerRequest } from '@/types/adashiEngine';
import { AdashiPayoutEngine } from './AdashiPayoutEngine';

export class AdashiMakerCheckerEngine {
  /**
   * Action a pending Maker-Checker request (Approve or Reject)
   */
  static actionRequest(
    requestId: string,
    checkerId: string,
    checkerName: string,
    checkerRole: string,
    action: 'APPROVE' | 'REJECT',
    checkerNotes: string
  ): AdashiMakerCheckerRequest {
    const req = AdashiStore.getMakerCheckerRequests().find((r) => r.id === requestId);
    if (!req) throw new Error(`Maker-Checker request '${requestId}' not found.`);

    if (req.status !== 'PENDING') {
      throw new Error(`Request is already '${req.status}'.`);
    }

    // Segregation of Duties: Maker cannot approve their own proposal
    if (req.makerId === checkerId) {
      throw new Error(`Segregation of Duties Violation: Maker cannot approve own request.`);
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const updated = AdashiStore.updateMakerCheckerRequest(requestId, {
      status: newStatus,
      checkerId,
      checkerName,
      checkerRole,
      checkerNotes,
      actionedAt: new Date().toISOString(),
    })!;

    // If approved, execute corresponding domain action
    if (action === 'APPROVE') {
      if (req.requestType === 'HIGH_VALUE_PAYOUT') {
        AdashiPayoutEngine.executeDisbursement(req.entityId, checkerId, checkerName);
      } else if (req.requestType === 'ROTATION_OVERRIDE') {
        const { adashiId, slotA, slotB, memberA, memberB } = req.payloadSnapshot;
        AdashiStore.updateMember(memberA.id, { assignedPosition: slotB });
        AdashiStore.updateMember(memberB.id, { assignedPosition: slotA });
      }
    }

    // Log Audit
    AdashiStore.logAuditEvent({
      eventType: `MAKER_CHECKER_${newStatus}`,
      actorId: checkerId,
      actorRole: checkerRole,
      details: { requestId, requestType: req.requestType, action, checkerNotes },
      correlationId: `mkc-act-${Date.now()}`,
    });

    return updated;
  }
}
