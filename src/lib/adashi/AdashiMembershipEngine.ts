// =============================================================================
// File: src/lib/adashi/AdashiMembershipEngine.ts
// Description: Adashi Member Consent, Mandate Authorization & Identity Lifecycle
// =============================================================================

import { AdashiStore } from './AdashiStore';
import { AdashiGroupMember, AdashiMemberStatus } from '@/types/adashiEngine';

export interface InviteMemberInput {
  adashiId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  kycTier: number;
}

export class AdashiMembershipEngine {
  /**
   * Invite customer to join an Adashi Group
   */
  static inviteMember(input: InviteMemberInput, actorId: string): AdashiGroupMember {
    const group = AdashiStore.getGroupById(input.adashiId);
    if (!group) throw new Error(`Group '${input.adashiId}' not found.`);

    if (group.status !== 'INVITING_MEMBERS') {
      throw new Error(`Cannot invite members to group in status '${group.status}'.`);
    }

    const currentMembers = AdashiStore.getMembers(group.id);
    if (currentMembers.length >= group.targetMembers) {
      throw new Error(`Group has reached max target members (${group.targetMembers}).`);
    }

    // Check if member already exists
    if (currentMembers.some((m) => m.customerId === input.customerId)) {
      throw new Error(`Customer '${input.customerName}' is already invited or a member of this group.`);
    }

    const member: AdashiGroupMember = {
      id: `mbr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adashiId: group.id,
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      kycTier: input.kycTier,
      status: 'INVITED',
      mandateAuthorized: false,
      totalContributedAmount: 0,
      totalPayoutReceived: 0,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    AdashiStore.addMember(member);
    AdashiStore.updateGroup(group.id, {
      currentMembersCount: currentMembers.length + 1,
    });

    AdashiStore.logAuditEvent({
      eventType: 'MEMBER_INVITED',
      adashiId: group.id,
      actorId,
      actorRole: 'AGENT',
      details: { customerName: member.customerName, customerPhone: member.customerPhone },
      correlationId: `mbr-inv-${Date.now()}`,
    });

    return member;
  }

  /**
   * Capture Explicit Customer Consent & Mandate Authorization
   */
  static captureConsent(
    memberId: string,
    consentGranted: boolean,
    mandateAuthorized: boolean,
    actorId: string
  ): AdashiGroupMember {
    const member = AdashiStore.getMemberById(memberId);
    if (!member) throw new Error(`Member '${memberId}' not found.`);

    const newStatus: AdashiMemberStatus = consentGranted ? 'CONSENT_ACCEPTED' : 'CONSENT_REJECTED';
    const updated = AdashiStore.updateMember(memberId, {
      status: newStatus,
      mandateAuthorized: consentGranted ? mandateAuthorized : false,
      mandateAuthorizationDate: consentGranted ? new Date().toISOString() : undefined,
    });

    AdashiStore.logAuditEvent({
      eventType: consentGranted ? 'MEMBER_CONSENT_GRANTED' : 'MEMBER_CONSENT_REJECTED',
      adashiId: member.adashiId,
      actorId,
      actorRole: 'CUSTOMER',
      details: { memberId, consentGranted, mandateAuthorized },
      correlationId: `consent-${Date.now()}`,
    });

    return updated!;
  }
}
