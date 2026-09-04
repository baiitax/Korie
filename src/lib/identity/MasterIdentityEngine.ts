import { 
  PersonMasterRecord, 
  OrganizationMasterRecord, 
  KycTier, 
  KycVerificationStatus, 
  KybVerificationStatus 
} from '@/types/identityEngine';

export class MasterIdentityEngine {
  private static persons: Map<string, PersonMasterRecord> = new Map();
  private static organizations: Map<string, OrganizationMasterRecord> = new Map();
  private static aliases: Map<string, string> = new Map(); // alias -> canonical KID
  private static isInitialized = false;

  public static ensureInitialized(): void {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialIdentities();
    }
  }

  private static seedInitialIdentities(): void {
    if (this.persons.size > 0) return;

    // 1. Seed Customer Person (Nigeria)
    const p1: PersonMasterRecord = {
      id: 'pers_ng_001',
      identityReference: 'KID-NG-884210',
      firstName: 'Chinedu',
      middleName: 'Emeka',
      lastName: 'Okonkwo',
      fullName: 'Chinedu Emeka Okonkwo',
      dateOfBirth: '1990-05-14',
      gender: 'MALE',
      nationality: 'Nigerian',
      countryCode: 'NG',
      phonePrimary: '+2348012345678',
      emailPrimary: 'chinedu.okonkwo@example.ng',
      kycTier: 'TIER_2',
      kycStatus: 'VERIFIED',
      identityStatus: 'ACTIVE',
      riskLevel: 'LOW',
      createdAt: '2026-08-15T09:00:00Z',
      updatedAt: '2026-09-02T14:30:00Z',
    };
    this.persons.set(p1.id, p1);
    this.persons.set(p1.identityReference, p1);

    // 2. Seed Agent Person (Niger Republic)
    const p2: PersonMasterRecord = {
      id: 'pers_ne_002',
      identityReference: 'KID-NE-102938',
      firstName: 'Aliyu',
      lastName: 'Harouna',
      fullName: 'Aliyu Harouna',
      dateOfBirth: '1988-11-20',
      gender: 'MALE',
      nationality: 'Nigerien',
      countryCode: 'NE',
      phonePrimary: '+22790123456',
      emailPrimary: 'aliyu.harouna@sahel-agency.ne',
      kycTier: 'TIER_3',
      kycStatus: 'VERIFIED',
      identityStatus: 'ACTIVE',
      riskLevel: 'LOW',
      createdAt: '2026-08-20T11:00:00Z',
      updatedAt: '2026-09-03T08:00:00Z',
    };
    this.persons.set(p2.id, p2);
    this.persons.set(p2.identityReference, p2);

    // 3. Seed Corporate Organization (Merchant Jumia Nigeria)
    const o1: OrganizationMasterRecord = {
      id: 'org_ng_001',
      identityReference: 'KID-ORG-990142',
      legalName: 'Jumia Nigeria Retail Ltd',
      tradingName: 'Jumia Online Store',
      registrationNumber: 'RC-1092837',
      taxIdentifier: 'TIN-09281746-0001',
      countryCode: 'NG',
      businessType: 'LIMITED_COMPANY',
      industry: 'E-Commerce & Retail',
      registeredAddress: '109 Commercial Avenue, Victoria Island, Lagos',
      operatingAddress: '109 Commercial Avenue, Victoria Island, Lagos',
      kybStatus: 'VERIFIED',
      status: 'ACTIVE',
      riskLevel: 'LOW',
      beneficialOwnersCount: 3,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-09-02T16:45:00Z',
    };
    this.organizations.set(o1.id, o1);
    this.organizations.set(o1.identityReference, o1);
  }

  public static createPerson(params: {
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    nationality?: string;
    countryCode?: 'NG' | 'NE';
    phonePrimary: string;
    emailPrimary: string;
  }): PersonMasterRecord {
    this.ensureInitialized();
    const id = `pers_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const country = params.countryCode || 'NG';
    const ref = `KID-${country}-${Math.floor(100000 + Math.random() * 900000)}`;

    const person: PersonMasterRecord = {
      id,
      identityReference: ref,
      firstName: params.firstName,
      middleName: params.middleName,
      lastName: params.lastName,
      fullName: `${params.firstName} ${params.middleName ? params.middleName + ' ' : ''}${params.lastName}`,
      dateOfBirth: params.dateOfBirth,
      gender: params.gender,
      nationality: params.nationality || (country === 'NG' ? 'Nigerian' : 'Nigerien'),
      countryCode: country,
      phonePrimary: params.phonePrimary,
      emailPrimary: params.emailPrimary,
      kycTier: 'TIER_0',
      kycStatus: 'NOT_STARTED',
      identityStatus: 'ACTIVE',
      riskLevel: 'LOW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.persons.set(id, person);
    this.persons.set(ref, person);
    return person;
  }

  public static createOrganization(params: {
    legalName: string;
    tradingName?: string;
    registrationNumber: string;
    taxIdentifier?: string;
    countryCode?: 'NG' | 'NE';
    businessType?: any;
    industry?: string;
    registeredAddress: string;
  }): OrganizationMasterRecord {
    this.ensureInitialized();
    const id = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = `KID-ORG-${Math.floor(100000 + Math.random() * 900000)}`;

    const org: OrganizationMasterRecord = {
      id,
      identityReference: ref,
      legalName: params.legalName,
      tradingName: params.tradingName,
      registrationNumber: params.registrationNumber,
      taxIdentifier: params.taxIdentifier,
      countryCode: params.countryCode || 'NG',
      businessType: params.businessType || 'LIMITED_COMPANY',
      industry: params.industry || 'Financial Services',
      registeredAddress: params.registeredAddress,
      kybStatus: 'NOT_STARTED',
      status: 'ACTIVE',
      riskLevel: 'LOW',
      beneficialOwnersCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.organizations.set(id, org);
    this.organizations.set(ref, org);
    return org;
  }

  public static updatePersonKycStatus(idOrRef: string, tier: KycTier, status: KycVerificationStatus): PersonMasterRecord {
    this.ensureInitialized();
    const person = this.persons.get(idOrRef);
    if (!person) {
      throw new Error(`Person with identifier ${idOrRef} not found.`);
    }

    person.kycTier = tier;
    person.kycStatus = status;
    person.updatedAt = new Date().toISOString();
    return person;
  }

  public static getPerson(idOrRef: string): PersonMasterRecord | undefined {
    this.ensureInitialized();
    return this.persons.get(idOrRef);
  }

  public static getOrganization(idOrRef: string): OrganizationMasterRecord | undefined {
    this.ensureInitialized();
    return this.organizations.get(idOrRef);
  }

  public static getAllPersons(): PersonMasterRecord[] {
    this.ensureInitialized();
    // Return deduplicated values (ignoring alias keys)
    const unique = new Map<string, PersonMasterRecord>();
    for (const p of Array.from(this.persons.values())) {
      unique.set(p.id, p);
    }
    return Array.from(unique.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static getAllOrganizations(): OrganizationMasterRecord[] {
    this.ensureInitialized();
    const unique = new Map<string, OrganizationMasterRecord>();
    for (const o of Array.from(this.organizations.values())) {
      unique.set(o.id, o);
    }
    return Array.from(unique.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static mergeIdentities(primaryId: string, duplicateId: string, reason: string): void {
    this.ensureInitialized();
    const primary = this.persons.get(primaryId);
    const duplicate = this.persons.get(duplicateId);

    if (!primary || !duplicate) {
      throw new Error('Both primary and duplicate identity records must exist to perform merge.');
    }

    duplicate.identityStatus = 'DUPLICATE';
    duplicate.updatedAt = new Date().toISOString();
    this.aliases.set(duplicate.identityReference, primary.identityReference);
  }
}
