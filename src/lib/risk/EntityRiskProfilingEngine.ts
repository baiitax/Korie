import { 
  EntityRiskProfile, 
  RiskEntityType, 
  RiskBand, 
  NetworkRelationshipLink 
} from '@/types/riskEngine';

export class EntityRiskProfilingEngine {
  private static profiles: Map<string, EntityRiskProfile> = new Map();
  private static networkLinks: NetworkRelationshipLink[] = [];
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedProfiles();
    }
  }

  private static seedProfiles() {
    if (this.profiles.size > 0) return;

    // Seed realistic baseline entity profiles
    this.profiles.set('usr_cust_lagos_001', {
      id: 'prof_cust_001',
      entityId: 'usr_cust_lagos_001',
      entityType: 'CUSTOMER',
      entityReference: 'CUST-NG-8842',
      countryCode: 'NG',
      currentRiskScore: 18,
      currentRiskBand: 'VERY_LOW',
      restrictionStatus: 'UNRESTRICTED',
      lifetimeFraudLossMinor: 0,
      lifetimePreventedLossMinor: 150_000_00,
      chargebackCount: 0,
      reversalCount: 0,
      alertCount: 1,
      knownDevices: ['dev_fp_iphone15_lagos', 'dev_fp_macbook_lagos'],
      knownIps: ['102.89.23.44', '105.112.45.19'],
      knownBeneficiaries: ['0123984756', '2049182746'],
      updatedAt: new Date().toISOString(),
    });

    this.profiles.set('agt_kano_bello', {
      id: 'prof_agt_002',
      entityId: 'agt_kano_bello',
      entityType: 'AGENT',
      entityReference: 'AGT-KANO-9901',
      countryCode: 'NG',
      currentRiskScore: 78,
      currentRiskBand: 'HIGH',
      restrictionStatus: 'STEP_UP_REQUIRED',
      lifetimeFraudLossMinor: 0,
      lifetimePreventedLossMinor: 850_000_00,
      chargebackCount: 1,
      reversalCount: 4,
      alertCount: 3,
      knownDevices: ['dev_fp_pos_kano_11'],
      knownIps: ['197.210.45.12'],
      knownBeneficiaries: [],
      updatedAt: new Date().toISOString(),
    });

    this.profiles.set('merch_jumia_ng', {
      id: 'prof_merch_003',
      entityId: 'merch_jumia_ng',
      entityType: 'MERCHANT',
      entityReference: 'MERCH-NG-001',
      countryCode: 'NG',
      currentRiskScore: 22,
      currentRiskBand: 'LOW',
      restrictionStatus: 'UNRESTRICTED',
      lifetimeFraudLossMinor: 0,
      lifetimePreventedLossMinor: 5_200_000_00,
      chargebackCount: 2,
      reversalCount: 1,
      alertCount: 0,
      knownDevices: ['srv_api_gateway_jumia'],
      knownIps: ['41.190.12.5'],
      knownBeneficiaries: ['0123456789'],
      updatedAt: new Date().toISOString(),
    });
  }

  public static getProfile(entityId: string): EntityRiskProfile | undefined {
    this.ensureInitialized();
    return this.profiles.get(entityId);
  }

  public static getOrCreateProfile(entityId: string, entityType: RiskEntityType, countryCode: 'NG' | 'NE' = 'NG'): EntityRiskProfile {
    this.ensureInitialized();
    let profile = this.profiles.get(entityId);
    if (!profile) {
      profile = {
        id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        entityId,
        entityType,
        entityReference: `${entityType}-${entityId.substring(0, 8).toUpperCase()}`,
        countryCode,
        currentRiskScore: 15,
        currentRiskBand: 'VERY_LOW',
        restrictionStatus: 'UNRESTRICTED',
        lifetimeFraudLossMinor: 0,
        lifetimePreventedLossMinor: 0,
        chargebackCount: 0,
        reversalCount: 0,
        alertCount: 0,
        knownDevices: [],
        knownIps: [],
        knownBeneficiaries: [],
        updatedAt: new Date().toISOString(),
      };
      this.profiles.set(entityId, profile);
    }
    return profile;
  }

  public static updateProfileScore(entityId: string, score: number, band: RiskBand): void {
    const profile = this.getOrCreateProfile(entityId, 'CUSTOMER');
    profile.currentRiskScore = score;
    profile.currentRiskBand = band;
    profile.updatedAt = new Date().toISOString();
  }

  public static getAllProfiles(): EntityRiskProfile[] {
    this.ensureInitialized();
    return Array.from(this.profiles.values());
  }

  public static getNetworkLinks(): NetworkRelationshipLink[] {
    this.ensureInitialized();
    return [
      {
        sourceEntityId: 'usr_cust_lagos_001',
        targetEntityId: 'usr_cust_ibadan_009',
        relationshipType: 'SHARED_DEVICE',
        firstObservedAt: '2026-08-20T10:00:00Z',
        lastObservedAt: '2026-09-02T18:30:00Z',
        weight: 2,
      },
      {
        sourceEntityId: 'agt_kano_bello',
        targetEntityId: 'usr_collusion_phone_88',
        relationshipType: 'AGENT_CUSTOMER_CYCLING',
        firstObservedAt: '2026-09-01T14:15:00Z',
        lastObservedAt: '2026-09-03T12:00:00Z',
        weight: 12,
      },
    ];
  }
}
