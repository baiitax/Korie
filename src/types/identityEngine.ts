export type MasterIdentityType = 
  | 'PERSON' 
  | 'ORGANIZATION' 
  | 'AGENT' 
  | 'MERCHANT' 
  | 'AGGREGATOR' 
  | 'BDC';

export type KycTier = 
  | 'TIER_0' 
  | 'TIER_1' 
  | 'TIER_2' 
  | 'TIER_3';

export type KycVerificationStatus = 
  | 'NOT_STARTED' 
  | 'IN_PROGRESS' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'VERIFIED' 
  | 'VERIFIED_WITH_LIMITATIONS' 
  | 'REJECTED' 
  | 'EXPIRED' 
  | 'REVERIFICATION_REQUIRED';

export type KybVerificationStatus = 
  | 'NOT_STARTED' 
  | 'IN_PROGRESS' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'VERIFIED' 
  | 'CONDITIONAL' 
  | 'REJECTED' 
  | 'EXPIRED';

export type PersonIdentityStatus = 
  | 'PENDING' 
  | 'ACTIVE' 
  | 'RESTRICTED' 
  | 'SUSPENDED' 
  | 'LOCKED' 
  | 'DEACTIVATED' 
  | 'CLOSED' 
  | 'DUPLICATE';

export interface PersonMasterRecord {
  id: string;
  identityReference: string; // e.g. KID-NG-884210
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  nationality: string;
  countryCode: 'NG' | 'NE';
  phonePrimary: string;
  emailPrimary: string;
  kycTier: KycTier;
  kycStatus: KycVerificationStatus;
  identityStatus: PersonIdentityStatus;
  riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMasterRecord {
  id: string;
  identityReference: string; // e.g. KID-ORG-990142
  legalName: string;
  tradingName?: string;
  registrationNumber: string; // CAC RC or RCCM
  taxIdentifier?: string; // TIN or NIF
  countryCode: 'NG' | 'NE';
  businessType: 'LIMITED_COMPANY' | 'SOLE_PROPRIETORSHIP' | 'PARTNERSHIP' | 'FINTECH' | 'AGGREGATOR';
  industry?: string;
  registeredAddress: string;
  operatingAddress?: string;
  kybStatus: KybVerificationStatus;
  status: 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED';
  riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  beneficialOwnersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BeneficialOwnerRecord {
  id: string;
  organizationId: string;
  personIdentityId?: string;
  fullName: string;
  role: 'DIRECTOR' | 'SHAREHOLDER' | 'BENEFICIAL_OWNER' | 'AUTHORIZED_SIGNATORY';
  ownershipPercentage: number;
  isPep: boolean;
  nationalIdMasked?: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  createdAt: string;
}

export interface IdentityVerificationEvidence {
  id: string;
  identityId: string;
  identityType: MasterIdentityType;
  providerCode: string; // NIMC_NIN, NIBSS_BVN, CAC_REGISTRY, NIGER_NINA, RCCM_SAHEL
  providerReference: string;
  verificationType: 'NATIONAL_ID' | 'BVN' | 'BIOMETRIC_LIVENESS' | 'BUSINESS_REGISTRY' | 'ADDRESS';
  confidenceScore: number;
  status: 'VERIFIED' | 'FAILED' | 'PENDING' | 'MANUAL_REVIEW';
  evidenceSha256Hash: string;
  verifiedAt: string;
  createdAt: string;
}

export interface IdentityDocumentRecord {
  id: string;
  identityId: string;
  documentType: 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE' | 'CAC_CERTIFICATE' | 'UTILITY_BILL' | 'TAX_CLEARANCE';
  documentNumberMasked?: string;
  fileSha256Hash: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePathEncrypted: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'EXPIRED';
  expiresAt?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface IdentityMergeRequest {
  primaryIdentityId: string;
  duplicateIdentityId: string;
  reason: string;
  reviewedBy: string;
  approvedBy: string;
}
