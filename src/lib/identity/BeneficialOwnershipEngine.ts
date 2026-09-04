import { BeneficialOwnerRecord } from '@/types/identityEngine';

export class BeneficialOwnershipEngine {
  private static owners: Map<string, BeneficialOwnerRecord[]> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialOwners();
    }
  }

  private static seedInitialOwners() {
    if (this.owners.size > 0) return;

    this.owners.set('org_ng_001', [
      {
        id: 'bo_001',
        organizationId: 'org_ng_001',
        personIdentityId: 'pers_ng_001',
        fullName: 'Chinedu Emeka Okonkwo',
        role: 'DIRECTOR',
        ownershipPercentage: 45.00,
        isPep: false,
        nationalIdMasked: '2093****102',
        verificationStatus: 'VERIFIED',
        createdAt: '2026-08-01T10:00:00Z',
      },
      {
        id: 'bo_002',
        organizationId: 'org_ng_001',
        fullName: 'Folashade Adeyemi',
        role: 'SHAREHOLDER',
        ownershipPercentage: 35.00,
        isPep: false,
        nationalIdMasked: '5920****918',
        verificationStatus: 'VERIFIED',
        createdAt: '2026-08-01T10:00:00Z',
      },
      {
        id: 'bo_003',
        organizationId: 'org_ng_001',
        fullName: 'Moustapha Diallo',
        role: 'BENEFICIAL_OWNER',
        ownershipPercentage: 20.00,
        isPep: false,
        nationalIdMasked: 'SAHEL-8891****',
        verificationStatus: 'VERIFIED',
        createdAt: '2026-08-01T10:00:00Z',
      },
    ]);
  }

  public static getBeneficialOwners(orgId: string): BeneficialOwnerRecord[] {
    this.ensureInitialized();
    return this.owners.get(orgId) || [];
  }

  public static addBeneficialOwner(params: {
    organizationId: string;
    personIdentityId?: string;
    fullName: string;
    role: any;
    ownershipPercentage: number;
    isPep?: boolean;
    nationalIdMasked?: string;
  }): BeneficialOwnerRecord {
    this.ensureInitialized();
    const existing = this.owners.get(params.organizationId) || [];
    
    const record: BeneficialOwnerRecord = {
      id: `bo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: params.organizationId,
      personIdentityId: params.personIdentityId,
      fullName: params.fullName,
      role: params.role || 'DIRECTOR',
      ownershipPercentage: params.ownershipPercentage,
      isPep: !!params.isPep,
      nationalIdMasked: params.nationalIdMasked || 'N/A',
      verificationStatus: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    existing.push(record);
    this.owners.set(params.organizationId, existing);
    return record;
  }
}
