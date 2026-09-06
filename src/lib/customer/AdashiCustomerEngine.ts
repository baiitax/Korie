// =============================================================================
// File: src/lib/customer/AdashiCustomerEngine.ts
// Description: Customer-side Adashi circles. Seeds demo circles whose members
// are KORIE portal customers (identity cust-ng-001-ibrahim / cust-ne-001-amara)
// plus external participants (no KORIE wallet; contributions collected offline
// by the group). Also owns the PRIVACY SANITIZER: customer-facing view models
// are built here so PII never leaves this layer unmasked.
//
// Privacy rule (D-A1, docs/customer-adashi-rebuild/01-audit-and-plan.md):
//   - INITIALS_ONLY (default): others appear as initials + avatar hue + slot +
//     membership status. Full identity only for self and the CURRENT cycle's
//     payout beneficiary (members must know whom they are paying).
//   - MEMBERS_ONLY (circle-level, creator-controlled): full names of ACTIVE
//     members are shown to fellow members.
// =============================================================================

import {
  AdashiContributionObligation,
  AdashiCurrency,
  AdashiCycle,
  AdashiGroup,
  AdashiGroupMember,
  AdashiGroupPrivacyMode,
  AdashiMemberStatus,
  AdashiRotation,
} from '@/types/adashiEngine';
import { AdashiStore } from '../adashi/AdashiStore';

// -----------------------------------------------------------------------------
// Seed specifications (lazy, idempotent per group id; persisted by AdashiStore)
// -----------------------------------------------------------------------------

interface CustomerCircleSeedSpec {
  groupId: string;
  groupName: string;
  currency: AdashiCurrency;
  country: 'NG' | 'NE';
  cadence: 'MONTHLY';
  contributionAmount: number;
  totalCycles: number;
  cycleStartOffsetHours: number; // cycle 1 start vs "now"
  cycleDueOffsetHours: number; // cycle 1 due vs "now"
  // creator is always the demo portal customer; member list order = slot order
  members: {
    customerId?: string; // undefined => external participant (no KORIE wallet)
    name: string;
    phone: string;
    email?: string;
    kycTier: number;
    mandateAuthorized: boolean;
    /** Which cycle this slot receives the pot (rotation) */
    beneficiaryCycle: number;
    /** Obligation amount override for the demo member (e.g. an oversized one) */
    obligationAmount?: number;
  }[];
  // which member (index in members[]) the current cycle's beneficiary is
  currentCycleBeneficiaryIndex: number;
  privacyMode: AdashiGroupPrivacyMode;
}

const DEMO_CUSTOMER = 'cust-ng-001-ibrahim';
const DEMO_CUSTOMER_NAME = 'Ibrahim Bello';
const DEMO_CUSTOMER_PHONE = '+2348099887766';
const DEMO_CUSTOMER_EMAIL = 'ibrahim.bello@koriepay.ng';

export const CUSTOMER_ADASHI_CIRCLE_SEEDS: CustomerCircleSeedSpec[] = [
  {
    groupId: 'grp-cus-001',
    groupName: 'Sahel Guild Savings Circle (XOF)',
    currency: 'XOF',
    country: 'NE',
    cadence: 'MONTHLY',
    contributionAmount: 150_000,
    totalCycles: 12,
    cycleStartOffsetHours: -30 * 24,
    cycleDueOffsetHours: 3 * 24,
    members: [
      {
        customerId: DEMO_CUSTOMER,
        name: DEMO_CUSTOMER_NAME,
        phone: DEMO_CUSTOMER_PHONE,
        email: DEMO_CUSTOMER_EMAIL,
        kycTier: 2,
        mandateAuthorized: false, // manual PIN pay (demo story 1)
        beneficiaryCycle: 2,
        obligationAmount: 150_000,
      },
      {
        customerId: 'cust-ne-001-amara',
        name: 'Amara Diallo',
        phone: '+22791234567',
        email: 'amara.diallo@koriepay.ne',
        kycTier: 1,
        mandateAuthorized: true,
        beneficiaryCycle: 5,
        obligationAmount: 150_000,
      },
      {
        name: 'Aminata Cissé',
        phone: '+22791234601',
        email: 'aminata.cisse@example.ne',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 1, // current beneficiary — fully identified to all
        obligationAmount: 150_000,
      },
      {
        name: 'Boubacar Traoré',
        phone: '+22791234602',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 3,
        obligationAmount: 150_000,
      },
      {
        name: 'Fatou Sow',
        phone: '+22791234603',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 4,
        obligationAmount: 150_000,
      },
    ],
    currentCycleBeneficiaryIndex: 2,
    privacyMode: 'INITIALS_ONLY',
  },
  {
    groupId: 'grp-cus-002',
    groupName: 'Akwa Savings Circle (NGN)',
    currency: 'NGN',
    country: 'NG',
    cadence: 'MONTHLY',
    contributionAmount: 100_000,
    totalCycles: 12,
    cycleStartOffsetHours: -30 * 24,
    cycleDueOffsetHours: -90 / 60, // due 90 minutes ago → auto-debit fires on sweep
    members: [
      {
        customerId: DEMO_CUSTOMER,
        name: DEMO_CUSTOMER_NAME,
        phone: DEMO_CUSTOMER_PHONE,
        email: DEMO_CUSTOMER_EMAIL,
        kycTier: 2,
        mandateAuthorized: true, // auto-debit success (demo story 2)
        beneficiaryCycle: 2,
        obligationAmount: 100_000,
      },
      {
        name: 'Chidi Okeke',
        phone: '+2348033302211',
        email: 'chidi.okeke@example.ng',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 1, // current beneficiary — fully identified to all
        obligationAmount: 100_000,
      },
      {
        name: 'Ngozi Okonkwo',
        phone: '+2348033302212',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 3,
        obligationAmount: 100_000,
      },
      {
        name: 'Tunde Bakare',
        phone: '+2348033302213',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 4,
        obligationAmount: 100_000,
      },
      {
        name: 'Chioma Nwosu',
        phone: '+2348033302214',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 5,
        obligationAmount: 100_000,
      },
    ],
    currentCycleBeneficiaryIndex: 1,
    privacyMode: 'INITIALS_ONLY',
  },
  {
    groupId: 'grp-cus-003',
    groupName: 'Korie High-Value Circle (NGN)',
    currency: 'NGN',
    country: 'NG',
    cadence: 'MONTHLY',
    contributionAmount: 1_300_000,
    totalCycles: 10,
    cycleStartOffsetHours: -30 * 24,
    cycleDueOffsetHours: -90 / 60, // due → auto-debit attempt → insufficient funds
    members: [
      {
        customerId: DEMO_CUSTOMER,
        name: DEMO_CUSTOMER_NAME,
        phone: DEMO_CUSTOMER_PHONE,
        email: DEMO_CUSTOMER_EMAIL,
        kycTier: 2,
        mandateAuthorized: true, // wallet 1,250,000 < 1,300,000 → negative reminder
        beneficiaryCycle: 4,
        obligationAmount: 1_300_000,
      },
      {
        name: 'Adaeze Okafor',
        phone: '+2348033303311',
        email: 'adaeze.okafor@example.ng',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 2,
        obligationAmount: 1_300_000,
      },
      {
        name: 'Emeka Obi',
        phone: '+2348033303312',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 1, // current beneficiary — fully identified to all
        obligationAmount: 1_300_000,
      },
      {
        name: 'Halima Yusuf',
        phone: '+2348033303313',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 3,
        obligationAmount: 1_300_000,
      },
      {
        name: 'Segun Adeyemi',
        phone: '+2348033303314',
        kycTier: 0,
        mandateAuthorized: false,
        beneficiaryCycle: 5,
        obligationAmount: 1_300_000,
      },
    ],
    currentCycleBeneficiaryIndex: 2,
    privacyMode: 'INITIALS_ONLY',
  },
];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function iso(date: Date): string {
  return date.toISOString();
}

function initialsOf(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0) || '';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) || '' : '';
  return (first + last).toUpperCase();
}

function avatarHueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

// -----------------------------------------------------------------------------
// Lazy seed — idempotent: circles created once per group id and then treated as
// store truth (dates persist via the file-backed store).
// -----------------------------------------------------------------------------

export function ensureCustomerCirclesSeeded(now: Date = new Date()): void {
  const store = AdashiStore;
  for (const spec of CUSTOMER_ADASHI_CIRCLE_SEEDS) {
    if (store.getGroupById(spec.groupId)) continue;

    const startedAt = new Date(now.getTime() + spec.cycleStartOffsetHours * HOUR_MS);
    const dueAt = new Date(now.getTime() + spec.cycleDueOffsetHours * HOUR_MS);
    const graceDeadline = new Date(dueAt.getTime() + 48 * HOUR_MS);

    const group: AdashiGroup = {
      id: spec.groupId,
      groupCode: `ADA-CUS-${spec.currency}-${Date.now().toString(36).toUpperCase()}`,
      groupName: spec.groupName,
      productId: 'prod-customer-circle-001',
      productName: 'Customer Self-Formed Circle',
      creatorId: DEMO_CUSTOMER,
      creatorRole: 'CUSTOMER',
      creatorName: DEMO_CUSTOMER_NAME,
      currency: spec.currency,
      countryCode: spec.country,
      cadence: spec.cadence,
      contributionAmount: spec.contributionAmount,
      targetMembers: spec.members.length,
      currentMembersCount: spec.members.length,
      totalCycles: spec.totalCycles,
      currentCycleNumber: 1,
      totalPoolVolume: 0,
      escrowVaultAccountId:
        spec.currency === 'NGN' ? 'acc_liab_adashi_escrow_ngn' : 'acc_liab_adashi_escrow_xof',
      privacyMode: spec.privacyMode,
      status: 'ACTIVE_IN_PROGRESS',
      startedAt: startedAt.toISOString(),
      createdAt: startedAt.toISOString(),
      updatedAt: now.toISOString(),
    };
    store.addGroup(group);

    const members: AdashiGroupMember[] = spec.members.map((m, idx) => {
      const id = `mbr-${spec.groupId}-${idx + 1}`;
      return {
        id,
        adashiId: spec.groupId,
        customerId: m.customerId || `ext-${spec.groupId}-${idx + 1}`,
        customerName: m.name,
        customerPhone: m.phone,
        customerEmail: m.email,
        kycTier: m.kycTier,
        assignedPosition: idx + 1,
        status: 'ACTIVE' as AdashiMemberStatus,
        mandateAuthorized: m.mandateAuthorized,
        mandateAuthorizationDate: m.mandateAuthorized ? now.toISOString() : undefined,
        totalContributedAmount: 0,
        totalPayoutReceived: 0,
        joinedAt: new Date(startedAt.getTime() - 5 * DAY_MS).toISOString(),
        updatedAt: now.toISOString(),
      };
    });
    members.forEach((m) => store.addMember(m));

    // Rotation (published order of pot receipt) + current cycle
    const slots = spec.members.map((m, idx) => ({
      position: idx + 1,
      memberId: `mbr-${spec.groupId}-${idx + 1}`,
      customerName: m.name,
      cycleNumber: m.beneficiaryCycle,
      scheduledPayoutDate: iso(
        new Date(startedAt.getTime() + m.beneficiaryCycle * 30 * DAY_MS),
      ),
    }));
    const rotation: AdashiRotation = {
      id: `rot-${spec.groupId}-1`,
      adashiId: spec.groupId,
      version: 1,
      algorithm: 'FAIR_SEQUENTIAL',
      seedHash: `seed-${spec.groupId}`,
      fairnessScore: 1.0,
      status: 'PUBLISHED',
      publishedBy: spec.currency === 'NGN' ? 'usr-agent-001' : 'usr-agent-001',
      publishedAt: iso(startedAt),
      createdAt: iso(startedAt),
      slots,
    };
    store.addRotation(rotation);

    const beneficiaryIdx = spec.currentCycleBeneficiaryIndex;
    const beneficiary = spec.members[beneficiaryIdx];
    const cycle: AdashiCycle = {
      id: `cyc-${spec.groupId}-1`,
      adashiId: spec.groupId,
      groupName: spec.groupName,
      cycleNumber: 1,
      beneficiaryMemberId: `mbr-${spec.groupId}-${beneficiaryIdx + 1}`,
      beneficiaryCustomerId: beneficiary.customerId || `ext-${spec.groupId}-${beneficiaryIdx + 1}`,
      beneficiaryName: beneficiary.name,
      cycleStartDate: iso(startedAt),
      cycleDueDate: iso(dueAt),
      graceDeadline: iso(graceDeadline),
      expectedCollectionAmount: spec.contributionAmount * spec.members.length,
      actualCollectedAmount: 0,
      grossPayoutAmount: 0,
      platformFeeAmount: 0,
      agentCommissionAmount: 0,
      netPayoutAmount: 0,
      currency: spec.currency,
      status: 'CONTRIBUTION_OPEN',
      createdAt: iso(startedAt),
      updatedAt: iso(startedAt),
    };
    store.addCycle(cycle);

    spec.members.forEach((m, idx) => {
      const obligation: AdashiContributionObligation = {
        id: `obl-${spec.groupId}-${idx + 1}`,
        adashiId: spec.groupId,
        cycleId: cycle.id,
        cycleNumber: 1,
        memberId: `mbr-${spec.groupId}-${idx + 1}`,
        customerId: m.customerId || `ext-${spec.groupId}-${idx + 1}`,
        customerName: m.name,
        amount: m.obligationAmount ?? spec.contributionAmount,
        currency: spec.currency,
        dueDate: iso(dueAt),
        graceDeadline: iso(graceDeadline),
        status: 'SCHEDULED',
        retryCount: 0,
        createdAt: iso(startedAt),
        updatedAt: iso(startedAt),
      };
      store.addObligation(obligation);
    });

    store.logAuditEvent({
      eventType: 'CUSTOMER_CIRCLE_CREATED',
      adashiId: spec.groupId,
      actorId: DEMO_CUSTOMER,
      actorRole: 'CUSTOMER',
      correlationId: `seed-${spec.groupId}`,
      details: { groupName: spec.groupName, members: spec.members.length },
    });
  }
}

// -----------------------------------------------------------------------------
// Membership queries
// -----------------------------------------------------------------------------

export interface CustomerCircleMembership {
  group: AdashiGroup;
  member: AdashiGroupMember;
  memberIndexInGroup: number;
}

export function getCustomerCircleMemberships(customerId: string): CustomerCircleMembership[] {
  const store = AdashiStore;
  const out: CustomerCircleMembership[] = [];
  for (const group of store.getGroups()) {
    const members = store.getMembers(group.id);
    const idx = members.findIndex((m) => m.customerId === customerId && m.status !== 'REPLACED');
    if (idx >= 0) {
      out.push({ group, member: members[idx], memberIndexInGroup: idx });
    }
  }
  return out;
}

/** Whether a member may act on a given circle (self-owned only). */
export function isCircleMember(customerId: string, adashiId: string): boolean {
  return getCustomerCircleMemberships(customerId).some((m) => m.group.id === adashiId);
}

export function getCircleMembership(customerId: string, adashiId: string) {
  return getCustomerCircleMemberships(customerId).find((m) => m.group.id === adashiId) || null;
}

// -----------------------------------------------------------------------------
// Privacy sanitizer → customer-facing circle view model
// -----------------------------------------------------------------------------

export interface CircleRosterItemView {
  position: number;
  memberId: string;
  isSelf: boolean;
  isCurrentBeneficiary: boolean;
  displayName: string; // full name when allowed, else initials
  initials: string;
  avatarHue: number;
  memberStatus: AdashiMemberStatus;
  mandateAuthorized?: boolean; // only on self
  externalParticipant: boolean; // not a KORIE portal customer
}

export interface CircleObligationView {
  id: string;
  cycleNumber: number;
  amount: number;
  currency: AdashiCurrency;
  status: string;
  dueDate: string;
  graceDeadline: string;
  paidAt?: string;
  paymentReference?: string;
  ledgerJournalId?: string;
  paymentMethod?: string;
  retryCount: number;
  errorMessage?: string;
}

export interface CircleCycleView {
  number: number;
  status: string;
  dueDate: string;
  graceDeadline: string;
  expectedCollectionAmount: number;
  actualCollectedAmount: number;
  beneficiary: CircleRosterItemView | null;
}

export interface CircleView {
  id: string;
  name: string;
  currency: AdashiCurrency;
  country: 'NG' | 'NE';
  cadence: string;
  contributionAmount: number;
  status: string;
  privacyMode: AdashiGroupPrivacyMode;
  isCreator: boolean;
  currentCycleNumber: number;
  totalCycles: number;
  membershipCount: number;
  myPosition: number;
  cycle: CircleCycleView | null;
  myObligation: CircleObligationView | null;
  myMember: {
    mandateAuthorized: boolean;
    totalContributedAmount: number;
    totalPayoutReceived: number;
  };
  roster: CircleRosterItemView[];
  rotation: { position: number; cycleNumber: number; scheduledPayoutDate: string }[];
}

export function buildCircleViewModels(customerId: string): CircleView[] {
  const store = AdashiStore;
  const memberships = getCustomerCircleMemberships(customerId);
  const views: CircleView[] = [];

  for (const membership of memberships) {
    const { group, member } = membership;
    const groupMembers = store.getMembers(group.id);
    const rotation = store.getRotations(group.id).find((r) => r.status === 'PUBLISHED');
    const cycles = store.getCycles(group.id).filter((c) => c.cycleNumber === group.currentCycleNumber);
    const currentCycle = cycles[0] || null;
    const obligations = currentCycle
      ? store.getObligations(group.id, currentCycle.id)
      : [];

    const ownObligation =
      obligations.find((o) => o.memberId === member.id) || null;

    // Who is the current cycle's beneficiary? (rotation slot for cycle N)
    let beneficiaryPosition: number | null = null;
    if (rotation?.slots) {
      const slot = rotation.slots.find((s) => s.cycleNumber === group.currentCycleNumber);
      if (slot) beneficiaryPosition = slot.position;
    }
    const beneficiaryMember =
      beneficiaryPosition != null
        ? groupMembers.find((m) => m.assignedPosition === beneficiaryPosition)
        : undefined;

    const roster: CircleRosterItemView[] = groupMembers.map((gm) => {
      const isSelf = gm.customerId === customerId;
      const isBeneficiary = beneficiaryMember?.id === gm.id;
      let displayName: string;
      if (isSelf || isBeneficiary) {
        displayName = gm.customerName;
      } else if (group.privacyMode === 'MEMBERS_ONLY' && gm.status === 'ACTIVE') {
        displayName = gm.customerName;
      } else {
        displayName = initialsOf(gm.customerName);
      }
      return {
        position: gm.assignedPosition ?? 0,
        memberId: gm.id,
        isSelf,
        isCurrentBeneficiary: isBeneficiary,
        displayName,
        initials: initialsOf(gm.customerName),
        avatarHue: avatarHueOf(gm.id),
        memberStatus: gm.status,
        mandateAuthorized: isSelf ? gm.mandateAuthorized : undefined,
        externalParticipant: !gm.customerId.startsWith('cust-'),
      };
    });
    roster.sort((a, b) => a.position - b.position);

    views.push({
      id: group.id,
      name: group.groupName,
      currency: group.currency,
      country: group.countryCode,
      cadence: group.cadence,
      contributionAmount: group.contributionAmount,
      status: group.status,
      privacyMode: group.privacyMode || 'INITIALS_ONLY',
      isCreator: group.creatorId === customerId,
      currentCycleNumber: group.currentCycleNumber,
      totalCycles: group.totalCycles,
      membershipCount: group.currentMembersCount,
      myPosition: member.assignedPosition ?? 0,
      cycle: currentCycle
        ? {
            number: currentCycle.cycleNumber,
            status: currentCycle.status,
            dueDate: currentCycle.cycleDueDate,
            graceDeadline: currentCycle.graceDeadline,
            expectedCollectionAmount: currentCycle.expectedCollectionAmount,
            actualCollectedAmount: currentCycle.actualCollectedAmount,
            beneficiary: roster.find((r) => r.isCurrentBeneficiary) || null,
          }
        : null,
      myObligation: ownObligation
        ? {
            id: ownObligation.id,
            cycleNumber: ownObligation.cycleNumber,
            amount: ownObligation.amount,
            currency: ownObligation.currency,
            status: ownObligation.status,
            dueDate: ownObligation.dueDate,
            graceDeadline: ownObligation.graceDeadline,
            paidAt: ownObligation.paidAt,
            paymentReference: ownObligation.paymentReference,
            ledgerJournalId: ownObligation.ledgerJournalId,
            paymentMethod: ownObligation.paymentMethod,
            retryCount: ownObligation.retryCount,
            errorMessage: ownObligation.errorMessage,
          }
        : null,
      myMember: {
        mandateAuthorized: member.mandateAuthorized,
        totalContributedAmount: member.totalContributedAmount,
        totalPayoutReceived: member.totalPayoutReceived,
      },
      roster,
      rotation: (rotation?.slots || []).map((s) => ({
        position: s.position,
        cycleNumber: s.cycleNumber,
        scheduledPayoutDate: s.scheduledPayoutDate,
      })),
    });
  }

  // Stable ordering: nearest due first
  views.sort((a, b) => {
    const da = a.cycle?.dueDate || '';
    const db = b.cycle?.dueDate || '';
    return da.localeCompare(db);
  });
  return views;
}
