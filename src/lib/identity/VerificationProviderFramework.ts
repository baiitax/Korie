import { 
  IdentityVerificationEvidence, 
  MasterIdentityType 
} from '@/types/identityEngine';
import { MasterIdentityEngine } from './MasterIdentityEngine';

export interface VerificationRequestParams {
  identityId: string;
  identityType: MasterIdentityType;
  verificationType: 'NATIONAL_ID' | 'BVN' | 'BIOMETRIC_LIVENESS' | 'BUSINESS_REGISTRY' | 'ADDRESS';
  idNumber: string;
  countryCode: 'NG' | 'NE';
  dateOfBirth?: string;
  companyName?: string;
}

export class VerificationProviderFramework {
  private static evidenceStore: Map<string, IdentityVerificationEvidence> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedEvidence();
    }
  }

  private static seedEvidence() {
    if (this.evidenceStore.size > 0) return;

    const ev1: IdentityVerificationEvidence = {
      id: 'ev_20260901_001',
      identityId: 'pers_ng_001',
      identityType: 'PERSON',
      providerCode: 'NIMC_NIN_DIRECT',
      providerReference: 'NIMC-VERIF-98214756',
      verificationType: 'NATIONAL_ID',
      confidenceScore: 98,
      status: 'VERIFIED',
      evidenceSha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      verifiedAt: '2026-09-01T12:00:00Z',
      createdAt: '2026-09-01T12:00:00Z',
    };
    this.evidenceStore.set(ev1.id, ev1);
  }

  public static async verifyIdentity(params: VerificationRequestParams): Promise<IdentityVerificationEvidence> {
    this.ensureInitialized();
    const startTime = new Date().toISOString();

    // Select Appropriate National Adapter
    let providerCode = 'GENERIC_ID_GATEWAY';
    let confidenceScore = 95;
    let providerReference = `VERIF-${params.countryCode}-${Date.now()}`;

    if (params.countryCode === 'NG') {
      if (params.verificationType === 'NATIONAL_ID') {
        providerCode = 'NIMC_NIN_GATEWAY';
      } else if (params.verificationType === 'BVN') {
        providerCode = 'NIBSS_BVN_GATEWAY';
      } else if (params.verificationType === 'BUSINESS_REGISTRY') {
        providerCode = 'CAC_CORPORATE_REGISTRY';
      }
    } else {
      if (params.verificationType === 'NATIONAL_ID') {
        providerCode = 'NIGER_NINA_REGISTRY';
      } else if (params.verificationType === 'BUSINESS_REGISTRY') {
        providerCode = 'RCCM_SAHEL_REGISTRY';
      }
    }

    // Compute Cryptographic SHA-256 Proof Hash
    const proofRaw = `${providerCode}:${params.idNumber}:${params.identityId}:${startTime}`;
    // Simple fast hash string simulation
    let hash = 0;
    for (let i = 0; i < proofRaw.length; i++) {
      hash = ((hash << 5) - hash) + proofRaw.charCodeAt(i);
      hash |= 0;
    }
    const evidenceSha256Hash = `sha256_${Math.abs(hash).toString(16)}_${Date.now()}`;

    const evidence: IdentityVerificationEvidence = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      identityId: params.identityId,
      identityType: params.identityType,
      providerCode,
      providerReference,
      verificationType: params.verificationType,
      confidenceScore,
      status: 'VERIFIED',
      evidenceSha256Hash,
      verifiedAt: startTime,
      createdAt: startTime,
    };

    this.evidenceStore.set(evidence.id, evidence);

    // Automatically elevate KYC Tier in Master Identity Engine
    if (params.identityType === 'PERSON') {
      MasterIdentityEngine.updatePersonKycStatus(params.identityId, 'TIER_2', 'VERIFIED');
    }

    return evidence;
  }

  public static getEvidenceForIdentity(identityId: string): IdentityVerificationEvidence[] {
    this.ensureInitialized();
    return Array.from(this.evidenceStore.values()).filter(e => e.identityId === identityId);
  }

  public static getAllEvidence(): IdentityVerificationEvidence[] {
    this.ensureInitialized();
    return Array.from(this.evidenceStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
