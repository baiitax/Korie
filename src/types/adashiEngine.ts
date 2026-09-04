// =============================================================================
// File: src/types/adashiEngine.ts
// Description: Type definitions for Enterprise Adashi / Ajo / ROSCA Platform
// =============================================================================

export type AdashiCurrency = 'NGN' | 'XOF';
export type AdashiCountry = 'NG' | 'NE';
export type AdashiCadence = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type AdashiProductStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

export type AdashiGroupStatus =
  | 'DRAFT'
  | 'INVITING_MEMBERS'
  | 'MEMBERSHIP_LOCKED'
  | 'ROTATION_PUBLISHED'
  | 'ACTIVE_IN_PROGRESS'
  | 'COMPLETED'
  | 'FROZEN'
  | 'CANCELLED';

export type AdashiMemberStatus =
  | 'INVITED'
  | 'CONSENT_ACCEPTED'
  | 'CONSENT_REJECTED'
  | 'ACTIVE'
  | 'DEFAULTED'
  | 'REPLACED'
  | 'COMPLETED';

export type AdashiCycleStatus =
  | 'SCHEDULED'
  | 'CONTRIBUTION_OPEN'
  | 'COLLECTION_IN_PROGRESS'
  | 'COLLECTION_COMPLETED'
  | 'PAYOUT_PENDING_APPROVAL'
  | 'PAYOUT_PROCESSING'
  | 'PAYOUT_COMPLETED'
  | 'DEFAULT_ARREARS'
  | 'CLOSED';

export type AdashiObligationStatus =
  | 'SCHEDULED'
  | 'PENDING_AUTO_DEBIT'
  | 'PAID'
  | 'FAILED'
  | 'UNKNOWN'
  | 'GRACE_PERIOD'
  | 'OVERDUE'
  | 'DEFAULTED'
  | 'WAIVED';

export type AdashiPayoutStatus =
  | 'PENDING_AUTHORIZATION'
  | 'AUTHORIZED'
  | 'DISPATCHED_TO_SWITCH'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED';

export type AdashiRecoveryStage =
  | 'GRACE_OVERDUE'
  | 'AGENT_MEDIATION'
  | 'AUTO_WALLET_LIEN'
  | 'LEGAL_RECOVERY'
  | 'GUARANTEE_CLAIMED'
  | 'SETTLED'
  | 'WRITTEN_OFF';

export type AdashiMakerCheckerType =
  | 'HIGH_VALUE_PAYOUT'
  | 'ROTATION_OVERRIDE'
  | 'DEFAULT_WRITE_OFF'
  | 'PRODUCT_DEPRECATION'
  | 'EMERGENCY_FREEZE'
  | 'MEMBER_SUBSTITUTION';

export type AdashiMakerCheckerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface AdashiProduct {
  id: string;
  productCode: string;
  productName: string;
  description?: string;
  currency: AdashiCurrency;
  countryCode: AdashiCountry;
  cadence: AdashiCadence;
  minMembers: number;
  maxMembers: number;
  contributionAmount: number;
  platformFeePercent: number;
  agentCommissionPercent: number;
  gracePeriodHours: number;
  maxOverdueDays: number;
  allowPartialPayouts: boolean;
  requiresMakerCheckerPayout: boolean;
  payoutMakerCheckerThreshold: number;
  version: number;
  status: AdashiProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdashiGroup {
  id: string;
  groupCode: string;
  groupName: string;
  productId: string;
  productName?: string;
  creatorId: string;
  creatorRole: 'AGENT' | 'CUSTOMER' | 'ADMIN';
  creatorName?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  currency: AdashiCurrency;
  countryCode: AdashiCountry;
  cadence: AdashiCadence;
  contributionAmount: number;
  targetMembers: number;
  currentMembersCount: number;
  totalCycles: number;
  currentCycleNumber: number;
  totalPoolVolume: number;
  escrowVaultAccountId: string;
  status: AdashiGroupStatus;
  lockedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdashiGroupMember {
  id: string;
  adashiId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  kycTier: number;
  assignedPosition?: number;
  status: AdashiMemberStatus;
  mandateAuthorized: boolean;
  mandateAuthorizationDate?: string;
  totalContributedAmount: number;
  totalPayoutReceived: number;
  joinedAt: string;
  updatedAt: string;
}

export interface AdashiRotation {
  id: string;
  adashiId: string;
  version: number;
  algorithm: string;
  seedHash: string;
  fairnessScore: number;
  status: 'PROPOSED' | 'PUBLISHED' | 'AMENDED' | 'SUPERSEDED';
  publishedBy: string;
  publishedAt?: string;
  createdAt: string;
  slots?: {
    position: number;
    memberId: string;
    customerName: string;
    cycleNumber: number;
    scheduledPayoutDate: string;
  }[];
}

export interface AdashiCycle {
  id: string;
  adashiId: string;
  groupName?: string;
  cycleNumber: number;
  beneficiaryMemberId: string;
  beneficiaryCustomerId: string;
  beneficiaryName: string;
  cycleStartDate: string;
  cycleDueDate: string;
  graceDeadline: string;
  expectedCollectionAmount: number;
  actualCollectedAmount: number;
  grossPayoutAmount: number;
  platformFeeAmount: number;
  agentCommissionAmount: number;
  netPayoutAmount: number;
  currency: AdashiCurrency;
  status: AdashiCycleStatus;
  payoutReference?: string;
  payoutCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdashiContributionObligation {
  id: string;
  adashiId: string;
  cycleId: string;
  cycleNumber: number;
  memberId: string;
  customerId: string;
  customerName?: string;
  amount: number;
  currency: AdashiCurrency;
  dueDate: string;
  graceDeadline: string;
  status: AdashiObligationStatus;
  retryCount: number;
  lastRetryAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  ledgerJournalId?: string;
  paymentReference?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdashiPayout {
  id: string;
  adashiId: string;
  groupName?: string;
  cycleId: string;
  cycleNumber: number;
  beneficiaryCustomerId: string;
  beneficiaryName: string;
  grossAmount: number;
  platformFee: number;
  agentCommission: number;
  netDisbursedAmount: number;
  currency: AdashiCurrency;
  destinationType: 'KORIEPAY_WALLET' | 'BANK_ACCOUNT' | 'MOBILE_MONEY';
  destinationAccountId: string;
  status: AdashiPayoutStatus;
  requiresMakerChecker: boolean;
  makerId: string;
  makerName: string;
  checkerId?: string;
  checkerName?: string;
  makerCheckerRequestId?: string;
  ledgerJournalId?: string;
  paymentReference: string;
  errorReason?: string;
  disbursedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdashiRecoveryCase {
  id: string;
  caseNumber: string;
  adashiId: string;
  groupName?: string;
  cycleId: string;
  cycleNumber: number;
  obligationId: string;
  defaultedCustomerId: string;
  defaultedCustomerName: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  outstandingAmount: number;
  recoveredAmount: number;
  currency: AdashiCurrency;
  stage: AdashiRecoveryStage;
  notes?: string;
  openedAt: string;
  resolvedAt?: string;
  updatedAt: string;
}

export interface AdashiMakerCheckerRequest {
  id: string;
  requestType: AdashiMakerCheckerType;
  entityId: string;
  entityType: string;
  makerId: string;
  makerName: string;
  makerRole: string;
  checkerId?: string;
  checkerName?: string;
  checkerRole?: string;
  status: AdashiMakerCheckerStatus;
  makerNotes: string;
  checkerNotes?: string;
  payloadSnapshot: Record<string, any>;
  createdAt: string;
  actionedAt?: string;
}

export interface AdashiAuditEvent {
  id: string;
  eventType: string;
  adashiId?: string;
  actorId: string;
  actorRole: string;
  details: Record<string, any>;
  ipAddress?: string;
  correlationId: string;
  createdAt: string;
}

export interface AdashiSummaryStats {
  totalActiveGroups: number;
  totalMembersParticipating: number;
  totalEscrowVaultNgn: number;
  totalEscrowVaultXof: number;
  totalDisbursedNgn: number;
  totalDisbursedXof: number;
  collectionRatePercent: number;
  defaultRatePercent: number;
  pendingMakerCheckerCount: number;
  activeRecoveryCasesCount: number;
}
