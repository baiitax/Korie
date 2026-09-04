// Partner 360, Open Banking KYB & Settlement Limit Engine

import { Partner360Profile } from '@/types/integrationEngine';

export class PartnerManagementEngine {
  private static instance: PartnerManagementEngine;

  private partners: Map<string, Partner360Profile> = new Map();

  private constructor() {
    this.seedPartners();
  }

  public static getInstance(): PartnerManagementEngine {
    if (!PartnerManagementEngine.instance) {
      PartnerManagementEngine.instance = new PartnerManagementEngine();
    }
    return PartnerManagementEngine.instance;
  }

  private seedPartners() {
    const defaultPartners: Partner360Profile[] = [
      {
        id: 'prt-01',
        partnerCode: 'PRT-SAHARA-01',
        businessName: 'Sahara Wholesale Distributors Ltd',
        country: 'NG',
        kybStatus: 'VERIFIED',
        riskTier: 'LOW',
        dailySettlementLimitNgn: 150000000,
        isOpenBankingAis: true,
        isOpenBankingPis: true,
        activeAppsCount: 2,
      },
      {
        id: 'prt-02',
        partnerCode: 'PRT-SAHEL-02',
        businessName: 'Sahel Grain Trading Enterprise',
        country: 'NE',
        kybStatus: 'VERIFIED',
        riskTier: 'LOW',
        dailySettlementLimitNgn: 50000000,
        isOpenBankingAis: false,
        isOpenBankingPis: true,
        activeAppsCount: 1,
      },
      {
        id: 'prt-03',
        partnerCode: 'PRT-KANO-REMIT-03',
        businessName: 'Kano Dawanau Remittance Desk',
        country: 'NG',
        kybStatus: 'VERIFIED',
        riskTier: 'MEDIUM',
        dailySettlementLimitNgn: 25000000,
        isOpenBankingAis: true,
        isOpenBankingPis: true,
        activeAppsCount: 1,
      },
    ];

    defaultPartners.forEach((p) => this.partners.set(p.id, p));
  }

  public getPartners(): Partner360Profile[] {
    return Array.from(this.partners.values());
  }
}
