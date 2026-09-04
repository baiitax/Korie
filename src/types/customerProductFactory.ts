// Type definitions for Customer Master, Accounts, and Banking Product Factory

export type CustomerLifecycleStatus =
  | 'PROSPECT'
  | 'APPLICATION_STARTED'
  | 'APPLICATION_SUBMITTED'
  | 'KYC_PENDING'
  | 'KYC_IN_REVIEW'
  | 'KYC_VERIFIED'
  | 'ACCOUNT_OPENING'
  | 'ACTIVE'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'DORMANT'
  | 'FROZEN'
  | 'CLOSURE_PENDING'
  | 'CLOSED';

export type AccountLifecycleStatus =
  | 'APPLICATION'
  | 'PENDING_APPROVAL'
  | 'OPENING'
  | 'OPEN'
  | 'RESTRICTED'
  | 'FROZEN'
  | 'DORMANT'
  | 'CLOSURE_PENDING'
  | 'CLOSED';

export type CustomerSegment =
  | 'PERSONAL'
  | 'PREMIUM'
  | 'SME'
  | 'CORPORATE'
  | 'AGENT'
  | 'MERCHANT'
  | 'BDC';

export type ProductType =
  | 'CONSUMER_WALLET'
  | 'SAVINGS'
  | 'CURRENT'
  | 'MERCHANT_SETTLEMENT'
  | 'AGENCY_FLOAT'
  | 'BDC_TREASURY';

export type ProductStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DEPRECATED'
  | 'RETIRED';

export type AccountRestrictionType =
  | 'DEBIT_ONLY'
  | 'CREDIT_ONLY'
  | 'TRANSFER_DISABLED'
  | 'WITHDRAWAL_DISABLED'
  | 'BENEFICIARY_DISABLED'
  | 'DEVICE_RESTRICTED'
  | 'FULL_FREEZE';

export interface CustomerRecord {
  id: string;
  customerCode: string;
  tenantId: string;
  identityRecordId?: string;
  fullName: string;
  email: string;
  phone: string;
  country: 'NG' | 'NE';
  customerType: CustomerSegment;
  status: CustomerLifecycleStatus;
  kycTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  riskStatus: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  dateOfBirth?: string;
  residentialAddress?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  accounts?: CustomerAccountRecord[];
}

export interface CustomerAccountRecord {
  id: string;
  accountNumber: string;
  accountName: string;
  customerId: string;
  productId: string;
  productCode?: string;
  currency: 'NGN' | 'XOF' | 'USD';
  country: 'NG' | 'NE';
  status: AccountLifecycleStatus;
  subledgerId?: string;
  assignedBankName: string;
  assignedBankCode: string;
  isPrimary: boolean;
  availableBalance: number; // Linked from GL Subledger
  ledgerBalance: number;
  heldBalance: number;
  restrictions?: AccountRestrictionType[];
  openedAt: string;
  lastActivityAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankingProductRecord {
  id: string;
  productCode: string;
  name: string;
  description: string;
  productType: ProductType;
  customerType: CustomerSegment;
  jurisdiction: 'NG' | 'NE' | 'CROSS_BORDER';
  currency: 'NGN' | 'XOF' | 'USD';
  status: ProductStatus;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  minKycTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  maxRiskScore: number;
  allowedChannels: string[];
  glAssetPoolCode: string;
  glLiabilityWalletCode: string;
  glFeeRevenueCode: string;
  singleTransactionLimit: number;
  dailyTransactionLimit: number;
  maxBalanceCap: number;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BeneficiaryRecord {
  id: string;
  customerId: string;
  beneficiaryName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  currency: string;
  country: string;
  status: 'ADDED' | 'VERIFICATION_PENDING' | 'COOLDOWN' | 'ACTIVE' | 'BLOCKED' | 'DEACTIVATED';
  isVerified: boolean;
  cooldownExpiresAt?: string;
  riskScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSimulationResult {
  productId: string;
  productCode: string;
  simulatedAmount: number;
  currency: string;
  calculatedFee: number;
  vatAmount: number;
  netDebitAmount: number;
  ledgerJournalPreview: {
    debitAccount: string;
    creditAccount: string;
    feeAccount: string;
    isBalanced: boolean;
  };
  eligibilityPassed: boolean;
  decision: 'ALLOW' | 'STEP_UP' | 'REVIEW' | 'DECLINE';
  reasonCodes: string[];
}
