// Third-Party Risk Management (TPRM) & Critical Vendor Engine

import { ThirdPartyVendorRecord } from '@/types/ermEngine';

export class ThirdPartyRiskEngine {
  private static instance: ThirdPartyRiskEngine;

  private vendors: Map<string, ThirdPartyVendorRecord> = new Map();

  private constructor() {
    this.seedVendors();
  }

  public static getInstance(): ThirdPartyRiskEngine {
    if (!ThirdPartyRiskEngine.instance) {
      ThirdPartyRiskEngine.instance = new ThirdPartyRiskEngine();
    }
    return ThirdPartyRiskEngine.instance;
  }

  private seedVendors() {
    const defaultVendors: ThirdPartyVendorRecord[] = [
      {
        id: 'ven-01',
        vendorCode: 'VEN-PROVIDUS',
        name: 'Providus Bank Nigeria Plc',
        vendorType: 'CORRESPONDENT_BANK',
        criticality: 'TIER_1_MISSION_CRITICAL',
        riskRating: 'LOW',
        uptimeSlaTargetPct: 99.95,
        lastAssessmentDate: '2026-08-01',
        failoverTested: true,
      },
      {
        id: 'ven-02',
        vendorCode: 'VEN-KORIS',
        name: 'Coris Bank Niger SA',
        vendorType: 'CORRESPONDENT_BANK',
        criticality: 'TIER_1_MISSION_CRITICAL',
        riskRating: 'LOW',
        uptimeSlaTargetPct: 99.90,
        lastAssessmentDate: '2026-08-15',
        failoverTested: true,
      },
      {
        id: 'ven-03',
        vendorCode: 'VEN-G4S',
        name: 'G4S Secure Solutions Nigeria',
        vendorType: 'CIT_COURIER',
        criticality: 'TIER_1_MISSION_CRITICAL',
        riskRating: 'MEDIUM',
        uptimeSlaTargetPct: 99.50,
        lastAssessmentDate: '2026-07-20',
        failoverTested: true,
      },
      {
        id: 'ven-04',
        vendorCode: 'VEN-AWS',
        name: 'Amazon Web Services (Cloud & KMS Infrastructure)',
        vendorType: 'CLOUD_HOSTING',
        criticality: 'TIER_1_MISSION_CRITICAL',
        riskRating: 'LOW',
        uptimeSlaTargetPct: 99.99,
        lastAssessmentDate: '2026-08-10',
        failoverTested: true,
      },
    ];

    defaultVendors.forEach((v) => this.vendors.set(v.id, v));
  }

  public getVendors(): ThirdPartyVendorRecord[] {
    return Array.from(this.vendors.values());
  }
}
