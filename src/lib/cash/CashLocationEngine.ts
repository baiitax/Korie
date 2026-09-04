// Cash Location Hierarchy, Custody Owners & Physical Outpost Master Engine

import { CashLocationRecord, CashLocationType } from '@/types/physicalCashEngine';

export class CashLocationEngine {
  private static instance: CashLocationEngine;

  private locations: Map<string, CashLocationRecord> = new Map();

  private constructor() {
    this.seedLocations();
  }

  public static getInstance(): CashLocationEngine {
    if (!CashLocationEngine.instance) {
      CashLocationEngine.instance = new CashLocationEngine();
    }
    return CashLocationEngine.instance;
  }

  private seedLocations() {
    const defaultLocations: CashLocationRecord[] = [
      {
        id: 'loc-vault-abj',
        locationCode: 'LOC-VLT-ABJ-01',
        name: 'Abuja Central Regional Vault',
        locationType: 'REGIONAL_VAULT',
        country: 'NG',
        currency: 'NGN',
        legalEntity: 'KoriePay Nigeria Ltd',
        region: 'North Central',
        stateOrProvince: 'FCT Abuja',
        custodyOwner: 'Ibrahim Danladi (Lead Custodian)',
        operationalOwner: 'Zainab Bello (Treasury Ops Head)',
        riskClassification: 'LOW',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'loc-vault-los',
        locationCode: 'LOC-VLT-LOS-01',
        name: 'Lagos Victoria Island Central Vault',
        locationType: 'CENTRAL_VAULT',
        country: 'NG',
        currency: 'NGN',
        legalEntity: 'KoriePay Nigeria Ltd',
        region: 'South West',
        stateOrProvince: 'Lagos State',
        custodyOwner: 'Emeka Nwosu (Chief Custodian)',
        operationalOwner: 'Folake Adeleke (VP Cash Ops)',
        riskClassification: 'LOW',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'loc-vault-nim',
        locationCode: 'LOC-VLT-NIM-01',
        name: 'Niamey Plateau Central Vault',
        locationType: 'CENTRAL_VAULT',
        country: 'NE',
        currency: 'XOF',
        legalEntity: 'KoriePay Niger SA',
        region: 'Niamey',
        stateOrProvince: 'Niamey Capitale',
        custodyOwner: 'Ousmane Mahamane (Chef Coffre-Fort)',
        operationalOwner: 'Aminata Touré (Directrice Trésorerie)',
        riskClassification: 'LOW',
        status: 'ACTIVE',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'loc-till-garba',
        locationCode: 'LOC-TILL-GARBA-01',
        name: 'Garba Express POS Cash Till',
        locationType: 'AGENT_TILL',
        country: 'NG',
        currency: 'NGN',
        legalEntity: 'Musa Garba Enterprise',
        region: 'North Central',
        stateOrProvince: 'FCT Abuja',
        parentLocationId: 'loc-vault-abj',
        custodyOwner: 'Musa Garba (Agent Operator)',
        operationalOwner: 'Garba Express Operations',
        riskClassification: 'LOW',
        status: 'ACTIVE',
        createdAt: '2026-08-01T09:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'loc-till-sahel',
        locationCode: 'LOC-TILL-SAHEL-01',
        name: 'Sahel Kiosque Niamey Cash Till',
        locationType: 'AGENT_TILL',
        country: 'NE',
        currency: 'XOF',
        legalEntity: 'Ibrahim Sahel Commerce SARL',
        region: 'Niamey',
        stateOrProvince: 'Niamey Capitale',
        parentLocationId: 'loc-vault-nim',
        custodyOwner: 'Ibrahim Sahel (Agent Operator)',
        operationalOwner: 'Sahel Kiosque Niamey',
        riskClassification: 'LOW',
        status: 'ACTIVE',
        createdAt: '2026-08-05T10:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'loc-cit-g4s',
        locationCode: 'LOC-CIT-G4S-01',
        name: 'G4S Armored CIT Vehicle NG-04',
        locationType: 'CIT_VEHICLE',
        country: 'NG',
        currency: 'NGN',
        legalEntity: 'G4S Secure Solutions Nigeria',
        region: 'North Central',
        stateOrProvince: 'FCT Abuja',
        custodyOwner: 'Tunde Bakare (Lead Armored Escort)',
        operationalOwner: 'G4S Logistics Dispatch',
        riskClassification: 'MEDIUM',
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
    ];

    defaultLocations.forEach((loc) => this.locations.set(loc.id, loc));
  }

  public getLocations(filters?: { country?: string; type?: CashLocationType }): CashLocationRecord[] {
    let list = Array.from(this.locations.values());
    if (filters?.country && filters.country !== 'GLOBAL') {
      list = list.filter((l) => l.country === filters.country);
    }
    if (filters?.type) {
      list = list.filter((l) => l.locationType === filters.type);
    }
    return list;
  }

  public getLocation(id: string): CashLocationRecord | undefined {
    return this.locations.get(id);
  }

  public registerLocation(data: Omit<CashLocationRecord, 'id' | 'createdAt' | 'updatedAt'>): CashLocationRecord {
    const id = `loc-${data.country.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const newLoc: CashLocationRecord = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.locations.set(id, newLoc);
    return newLoc;
  }
}
