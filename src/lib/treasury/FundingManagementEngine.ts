// Wholesale Funding Facilities, Drawdowns & Deal Tickets Engine

import { FundingFacilityRecord, TreasuryDealTicket } from '@/types/financialPlanningAlmEngine';
import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';

export class FundingManagementEngine {
  private static instance: FundingManagementEngine;

  private facilities: Map<string, FundingFacilityRecord> = new Map();
  private deals: Map<string, TreasuryDealTicket> = new Map();

  private constructor() {
    this.seedFacilities();
  }

  public static getInstance(): FundingManagementEngine {
    if (!FundingManagementEngine.instance) {
      FundingManagementEngine.instance = new FundingManagementEngine();
    }
    return FundingManagementEngine.instance;
  }

  private seedFacilities() {
    const defaultFacilities: FundingFacilityRecord[] = [
      {
        id: 'fac-providus-01',
        facilityCode: 'FAC-PROVIDUS-RCF-01',
        lenderName: 'Providus Bank Nigeria Plc',
        facilityType: 'REVOLVING_CREDIT',
        legalEntity: 'KoriePay Nigeria Ltd',
        currency: 'NGN',
        totalCommittedLimit: 5000000000,
        utilizedAmount: 1500000000,
        availableUndrawn: 3500000000,
        interestRateSpreadPct: 4.5,
        maturityDate: '2027-12-31',
        covenantsSummary: 'Maintain minimum 20% liquid asset coverage at Providus Nostro.',
        status: 'ACTIVE',
      },
      {
        id: 'fac-koris-01',
        facilityCode: 'FAC-KORIS-BLP-01',
        lenderName: 'Koris Bank Niger SA',
        facilityType: 'STANDBY_LIQUIDITY',
        legalEntity: 'KoriePay Niger SA',
        currency: 'XOF',
        totalCommittedLimit: 10000000000,
        utilizedAmount: 2000000000,
        availableUndrawn: 8000000000,
        interestRateSpreadPct: 3.8,
        maturityDate: '2028-06-30',
        covenantsSummary: 'BCEAO WAEMU liquidity ratio compliance >= 100%.',
        status: 'ACTIVE',
      },
    ];

    defaultFacilities.forEach((f) => this.facilities.set(f.id, f));

    const defaultDeals: TreasuryDealTicket[] = [
      {
        id: 'deal-01',
        dealReference: 'DEAL-2026-0901-01',
        facilityId: 'fac-providus-01',
        dealType: 'FACILITY_DRAWDOWN',
        amount: 500000000,
        currency: 'NGN',
        makerId: 'treasury.analyst@koriepay.com',
        checkerId: 'group.treasurer@koriepay.com',
        status: 'EXECUTED',
        glJournalId: 'JE-FUNDING-2026-001',
        valueDate: '2026-09-01',
        settlementDate: '2026-09-01',
        createdAt: '2026-09-01T08:30:00Z',
      },
    ];

    defaultDeals.forEach((d) => this.deals.set(d.id, d));
  }

  public getFacilities(): FundingFacilityRecord[] {
    return Array.from(this.facilities.values());
  }

  public getDeals(): TreasuryDealTicket[] {
    return Array.from(this.deals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createDeal(params: {
    facilityId: string;
    dealType: 'FACILITY_DRAWDOWN' | 'FACILITY_REPAYMENT';
    amount: number;
    currency: 'NGN' | 'XOF' | 'USD';
    makerId: string;
  }): { success: boolean; deal?: TreasuryDealTicket; error?: string } {
    const fac = this.facilities.get(params.facilityId);
    if (!fac) return { success: false, error: 'FACILITY_NOT_FOUND' };

    if (params.dealType === 'FACILITY_DRAWDOWN' && params.amount > fac.availableUndrawn) {
      return { success: false, error: 'AMOUNT_EXCEEDS_AVAILABLE_UNDRAWN_LIMIT' };
    }

    const dealId = `deal-${Date.now().toString().slice(-4)}`;
    const dealRef = `DEAL-2026-${Date.now().toString().slice(-6)}`;

    const deal: TreasuryDealTicket = {
      id: dealId,
      dealReference: dealRef,
      facilityId: params.facilityId,
      dealType: params.dealType,
      amount: params.amount,
      currency: params.currency,
      makerId: params.makerId,
      status: 'PROPOSED',
      valueDate: new Date().toISOString().slice(0, 10),
      settlementDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };

    this.deals.set(dealId, deal);
    return { success: true, deal };
  }

  public approveAndExecuteDeal(dealId: string, checkerId: string): { success: boolean; deal?: TreasuryDealTicket; error?: string } {
    const deal = this.deals.get(dealId);
    if (!deal) return { success: false, error: 'DEAL_NOT_FOUND' };

    if (deal.makerId === checkerId) {
      return { success: false, error: 'MAKER_AND_CHECKER_MUST_BE_DISTINCT' };
    }

    const fac = deal.facilityId ? this.facilities.get(deal.facilityId) : undefined;
    if (fac) {
      if (deal.dealType === 'FACILITY_DRAWDOWN') {
        fac.utilizedAmount += deal.amount;
        fac.availableUndrawn -= deal.amount;
      } else if (deal.dealType === 'FACILITY_REPAYMENT') {
        fac.utilizedAmount -= deal.amount;
        fac.availableUndrawn += deal.amount;
      }
      this.facilities.set(fac.id, fac);
    }

    deal.status = 'EXECUTED';
    deal.checkerId = checkerId;
    deal.glJournalId = `JE-DEAL-${Date.now().toString().slice(-4)}`;

    this.deals.set(dealId, deal);
    return { success: true, deal };
  }
}
