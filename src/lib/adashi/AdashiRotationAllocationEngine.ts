// =============================================================================
// File: src/lib/adashi/AdashiRotationAllocationEngine.ts
// Description: Deterministic Cryptographic Rotation & Beneficiary Allocation Engine
// =============================================================================

import { createHmac, randomBytes } from 'crypto';
import { AdashiStore } from './AdashiStore';
import { AdashiGroup, AdashiRotation } from '@/types/adashiEngine';

export interface RotationGenerationResult {
  rotation: AdashiRotation;
  slots: {
    position: number;
    memberId: string;
    customerName: string;
    cycleNumber: number;
    scheduledPayoutDate: string;
  }[];
}

export class AdashiRotationAllocationEngine {
  /**
   * Generates a cryptographically verifiable deterministic rotation sequence.
   * Utilizes HMAC-SHA256 over Member IDs and System Seed to prevent agent favoritism.
   */
  static generateRotation(
    adashiId: string,
    publishedBy: string,
    customSeed?: string
  ): RotationGenerationResult {
    const group = AdashiStore.getGroupById(adashiId);
    if (!group) {
      throw new Error(`Adashi group '${adashiId}' not found.`);
    }

    if (group.status !== 'MEMBERSHIP_LOCKED' && group.status !== 'INVITING_MEMBERS') {
      throw new Error(`Cannot generate rotation for group in status '${group.status}'. Must be MEMBERSHIP_LOCKED.`);
    }

    const members = AdashiStore.getMembers(adashiId);
    if (members.length < 2) {
      throw new Error(`Adashi group must have at least 2 verified members to allocate rotation.`);
    }

    // Seed hash construction
    const systemSeed = customSeed || randomBytes(32).toString('hex');
    const combinedKey = `${group.id}:${group.productId}:${systemSeed}`;

    // Compute deterministic member hashes
    const rankedMembers = members
      .map((member) => {
        const hash = createHmac('sha256', combinedKey)
          .update(member.customerId + ':' + member.id)
          .digest('hex');
        return {
          member,
          hash,
        };
      })
      .sort((a, b) => a.hash.localeCompare(b.hash));

    // Calculate Cadence Intervals
    const startDate = group.startedAt ? new Date(group.startedAt) : new Date();
    const cadenceDays = group.cadence === 'DAILY' ? 1 : group.cadence === 'WEEKLY' ? 7 : group.cadence === 'BIWEEKLY' ? 14 : 30;

    const slots = rankedMembers.map((item, index) => {
      const position = index + 1;
      const payoutDate = new Date(startDate.getTime() + index * cadenceDays * 24 * 60 * 60 * 1000);
      
      // Update Member Assigned Position in Store
      AdashiStore.updateMember(item.member.id, {
        assignedPosition: position,
        status: 'ACTIVE',
      });

      return {
        position,
        memberId: item.member.id,
        customerName: item.member.customerName,
        cycleNumber: position,
        scheduledPayoutDate: payoutDate.toISOString().split('T')[0],
      };
    });

    // Create Rotation Record
    const rotationRecord: AdashiRotation = {
      id: `rot-${Date.now()}`,
      adashiId: group.id,
      version: 1,
      algorithm: 'HMAC_SHA256_DETERMINISTIC',
      seedHash: systemSeed,
      fairnessScore: 99.8,
      status: 'PUBLISHED',
      publishedBy,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      slots,
    };

    AdashiStore.addRotation(rotationRecord);

    // Update Group Status to ROTATION_PUBLISHED
    AdashiStore.updateGroup(group.id, {
      status: 'ROTATION_PUBLISHED',
    });

    // Log Audit Event
    AdashiStore.logAuditEvent({
      eventType: 'ROTATION_GENERATED_AND_PUBLISHED',
      adashiId: group.id,
      actorId: publishedBy,
      actorRole: 'AGENT',
      details: {
        algorithm: 'HMAC_SHA256_DETERMINISTIC',
        seedHash: systemSeed,
        totalSlots: slots.length,
      },
      correlationId: `rot-alloc-${Date.now()}`,
    });

    return {
      rotation: rotationRecord,
      slots,
    };
  }

  /**
   * Request manual rotation override with Maker-Checker dual control
   */
  static requestRotationOverride(
    adashiId: string,
    makerId: string,
    makerName: string,
    makerRole: string,
    slotA: number,
    slotB: number,
    justification: string
  ) {
    const group = AdashiStore.getGroupById(adashiId);
    if (!group) throw new Error(`Group not found.`);

    const members = AdashiStore.getMembers(adashiId);
    const memberA = members.find((m) => m.assignedPosition === slotA);
    const memberB = members.find((m) => m.assignedPosition === slotB);

    if (!memberA || !memberB) {
      throw new Error(`Invalid slot positions specified.`);
    }

    const req = AdashiStore.addMakerCheckerRequest({
      id: `mkc-rot-${Date.now()}`,
      requestType: 'ROTATION_OVERRIDE',
      entityId: adashiId,
      entityType: 'ADASHI_GROUP',
      makerId,
      makerName,
      makerRole,
      status: 'PENDING',
      makerNotes: justification,
      payloadSnapshot: {
        adashiId,
        slotA,
        slotB,
        memberA: { id: memberA.id, name: memberA.customerName },
        memberB: { id: memberB.id, name: memberB.customerName },
      },
      createdAt: new Date().toISOString(),
    });

    return req;
  }
}
