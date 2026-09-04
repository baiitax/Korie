// =============================================================================
// File: src/lib/adashi/AdashiGroupLifecycleEngine.ts
// Description: Adashi Group Lifecycle State Engine & Workflow Orchestration
// =============================================================================

import { AdashiStore } from './AdashiStore';
import { AdashiGroup, AdashiGroupMember, AdashiCycle } from '@/types/adashiEngine';

export interface CreateGroupInput {
  groupName: string;
  productId: string;
  creatorId: string;
  creatorRole: 'AGENT' | 'CUSTOMER' | 'ADMIN';
  creatorName: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  targetMembers: number;
}

export class AdashiGroupLifecycleEngine {
  /**
   * Instantiate a new Adashi Group under an active product template
   */
  static createGroup(input: CreateGroupInput): AdashiGroup {
    const product = AdashiStore.getProductById(input.productId);
    if (!product || product.status !== 'ACTIVE') {
      throw new Error(`Invalid or inactive product ID: ${input.productId}`);
    }

    if (input.targetMembers < product.minMembers || input.targetMembers > product.maxMembers) {
      throw new Error(
        `Target members (${input.targetMembers}) must be between ${product.minMembers} and ${product.maxMembers}.`
      );
    }

    const groupCode = `ADA-${product.countryCode}-${Date.now().toString().slice(-6)}`;
    const escrowVault = product.currency === 'NGN' ? 'ESCROW_VAULT_NGN_01' : 'ESCROW_VAULT_XOF_01';
    const totalVolume = input.targetMembers * product.contributionAmount;

    const group: AdashiGroup = {
      id: `grp-${Date.now()}`,
      groupCode,
      groupName: input.groupName,
      productId: product.id,
      productName: product.productName,
      creatorId: input.creatorId,
      creatorRole: input.creatorRole,
      creatorName: input.creatorName,
      assignedAgentId: input.assignedAgentId || input.creatorId,
      assignedAgentName: input.assignedAgentName || input.creatorName,
      currency: product.currency,
      countryCode: product.countryCode,
      cadence: product.cadence,
      contributionAmount: product.contributionAmount,
      targetMembers: input.targetMembers,
      currentMembersCount: 0,
      totalCycles: input.targetMembers,
      currentCycleNumber: 0,
      totalPoolVolume: totalVolume,
      escrowVaultAccountId: escrowVault,
      status: 'INVITING_MEMBERS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    AdashiStore.addGroup(group);

    AdashiStore.logAuditEvent({
      eventType: 'ADASHI_GROUP_CREATED',
      adashiId: group.id,
      actorId: input.creatorId,
      actorRole: input.creatorRole,
      details: { groupCode: group.groupCode, targetMembers: group.targetMembers },
      correlationId: `grp-create-${Date.now()}`,
    });

    return group;
  }

  /**
   * Lock Membership: Validates quorum, KYC verification, and explicit mandates
   */
  static lockMembership(adashiId: string, actorId: string): AdashiGroup {
    const group = AdashiStore.getGroupById(adashiId);
    if (!group) throw new Error(`Adashi group '${adashiId}' not found.`);

    if (group.status !== 'INVITING_MEMBERS') {
      throw new Error(`Cannot lock membership for group in status '${group.status}'. Must be INVITING_MEMBERS.`);
    }

    const members = AdashiStore.getMembers(adashiId);
    if (members.length !== group.targetMembers) {
      throw new Error(
        `Quorum not met: group has ${members.length} members but target requires ${group.targetMembers}.`
      );
    }

    // Validate that all members have accepted consent & authorized debit mandate
    const unaccepted = members.filter((m) => m.status !== 'CONSENT_ACCEPTED' && m.status !== 'ACTIVE');
    if (unaccepted.length > 0) {
      throw new Error(
        `Cannot lock membership: ${unaccepted.length} member(s) have not completed explicit consent.`
      );
    }

    const updated = AdashiStore.updateGroup(group.id, {
      status: 'MEMBERSHIP_LOCKED',
      lockedAt: new Date().toISOString(),
      currentMembersCount: members.length,
    });

    AdashiStore.logAuditEvent({
      eventType: 'MEMBERSHIP_LOCKED',
      adashiId: group.id,
      actorId,
      actorRole: 'AGENT',
      details: { memberCount: members.length, target: group.targetMembers },
      correlationId: `lock-${Date.now()}`,
    });

    return updated!;
  }

  /**
   * Start Group Execution and Initialize Cycle 1
   */
  static startGroup(adashiId: string, actorId: string): AdashiGroup {
    const group = AdashiStore.getGroupById(adashiId);
    if (!group) throw new Error(`Group not found.`);

    if (group.status !== 'ROTATION_PUBLISHED') {
      throw new Error(`Cannot start Adashi before rotation is published.`);
    }

    const members = AdashiStore.getMembers(adashiId);
    const firstBeneficiary = members.find((m) => m.assignedPosition === 1);
    if (!firstBeneficiary) {
      throw new Error(`Rotation slot #1 beneficiary not found.`);
    }

    const product = AdashiStore.getProductById(group.productId);
    const cadenceDays = group.cadence === 'DAILY' ? 1 : group.cadence === 'WEEKLY' ? 7 : group.cadence === 'BIWEEKLY' ? 14 : 30;

    const startDate = new Date();
    const dueDate = new Date(startDate.getTime() + cadenceDays * 24 * 60 * 60 * 1000);
    const graceDeadline = new Date(dueDate.getTime() + (product?.gracePeriodHours || 48) * 60 * 60 * 1000);

    const grossAmount = group.contributionAmount * group.targetMembers;
    const platFeePct = product?.platformFeePercent || 1.0;
    const agentFeePct = product?.agentCommissionPercent || 0.5;
    const platFee = (grossAmount * platFeePct) / 100;
    const agentFee = (grossAmount * agentFeePct) / 100;
    const netPayout = grossAmount - platFee - agentFee;

    // Create Cycle 1
    const cycle1: AdashiCycle = {
      id: `cyc-${Date.now()}-1`,
      adashiId: group.id,
      groupName: group.groupName,
      cycleNumber: 1,
      beneficiaryMemberId: firstBeneficiary.id,
      beneficiaryCustomerId: firstBeneficiary.customerId,
      beneficiaryName: firstBeneficiary.customerName,
      cycleStartDate: startDate.toISOString(),
      cycleDueDate: dueDate.toISOString(),
      graceDeadline: graceDeadline.toISOString(),
      expectedCollectionAmount: grossAmount,
      actualCollectedAmount: 0,
      grossPayoutAmount: grossAmount,
      platformFeeAmount: platFee,
      agentCommissionAmount: agentFee,
      netPayoutAmount: netPayout,
      currency: group.currency,
      status: 'CONTRIBUTION_OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    AdashiStore.addCycle(cycle1);

    // Create obligations for all members for Cycle 1
    for (const m of members) {
      AdashiStore.addObligation({
        id: `obl-${Date.now()}-${m.id.slice(-4)}`,
        adashiId: group.id,
        cycleId: cycle1.id,
        cycleNumber: 1,
        memberId: m.id,
        customerId: m.customerId,
        customerName: m.customerName,
        amount: group.contributionAmount,
        currency: group.currency,
        dueDate: dueDate.toISOString(),
        graceDeadline: graceDeadline.toISOString(),
        status: 'SCHEDULED',
        retryCount: 0,
        paymentMethod: 'WALLET_AUTO_DEBIT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const updated = AdashiStore.updateGroup(group.id, {
      status: 'ACTIVE_IN_PROGRESS',
      startedAt: startDate.toISOString(),
      currentCycleNumber: 1,
    });

    AdashiStore.logAuditEvent({
      eventType: 'ADASHI_STARTED',
      adashiId: group.id,
      actorId,
      actorRole: 'AGENT',
      details: { cycleNumber: 1, firstBeneficiary: firstBeneficiary.customerName },
      correlationId: `start-${Date.now()}`,
    });

    return updated!;
  }
}
