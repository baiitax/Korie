// =============================================================================
// File: src/lib/adashi/AdashiStore.ts
// Description: In-memory Adashi Domain State Store with Supabase-ready semantics
// =============================================================================

import {
  AdashiProduct,
  AdashiGroup,
  AdashiGroupMember,
  AdashiRotation,
  AdashiCycle,
  AdashiContributionObligation,
  AdashiPayout,
  AdashiRecoveryCase,
  AdashiMakerCheckerRequest,
  AdashiAuditEvent,
  AdashiSummaryStats,
} from '@/types/adashiEngine';

import {
  INITIAL_ADASHI_PRODUCTS,
  INITIAL_ADASHI_GROUPS,
  INITIAL_ADASHI_MEMBERS,
  INITIAL_ADASHI_ROTATIONS,
  INITIAL_ADASHI_CYCLES,
  INITIAL_ADASHI_OBLIGATIONS,
  INITIAL_ADASHI_PAYOUTS,
  INITIAL_ADASHI_RECOVERY_CASES,
  INITIAL_MAKER_CHECKER_REQUESTS,
  INITIAL_ADASHI_AUDIT_EVENTS,
} from './AdashiMockData';

class AdashiStoreSingleton {
  private products: AdashiProduct[] = [...INITIAL_ADASHI_PRODUCTS];
  private groups: AdashiGroup[] = [...INITIAL_ADASHI_GROUPS];
  private members: AdashiGroupMember[] = [...INITIAL_ADASHI_MEMBERS];
  private rotations: AdashiRotation[] = [...INITIAL_ADASHI_ROTATIONS];
  private cycles: AdashiCycle[] = [...INITIAL_ADASHI_CYCLES];
  private obligations: AdashiContributionObligation[] = [...INITIAL_ADASHI_OBLIGATIONS];
  private payouts: AdashiPayout[] = [...INITIAL_ADASHI_PAYOUTS];
  private recoveryCases: AdashiRecoveryCase[] = [...INITIAL_ADASHI_RECOVERY_CASES];
  private makerCheckerRequests: AdashiMakerCheckerRequest[] = [...INITIAL_MAKER_CHECKER_REQUESTS];
  private auditEvents: AdashiAuditEvent[] = [...INITIAL_ADASHI_AUDIT_EVENTS];

  // PRODUCTS
  getProducts(): AdashiProduct[] {
    return [...this.products];
  }
  getProductById(id: string): AdashiProduct | undefined {
    return this.products.find((p) => p.id === id || p.productCode === id);
  }
  addProduct(product: AdashiProduct): AdashiProduct {
    this.products.unshift(product);
    return product;
  }
  updateProduct(id: string, updates: Partial<AdashiProduct>): AdashiProduct | undefined {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.products[idx] = { ...this.products[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.products[idx];
  }

  // GROUPS
  getGroups(): AdashiGroup[] {
    return [...this.groups];
  }
  getGroupById(id: string): AdashiGroup | undefined {
    return this.groups.find((g) => g.id === id || g.groupCode === id);
  }
  addGroup(group: AdashiGroup): AdashiGroup {
    this.groups.unshift(group);
    return group;
  }
  updateGroup(id: string, updates: Partial<AdashiGroup>): AdashiGroup | undefined {
    const idx = this.groups.findIndex((g) => g.id === id);
    if (idx === -1) return undefined;
    this.groups[idx] = { ...this.groups[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.groups[idx];
  }

  // MEMBERS
  getMembers(adashiId?: string): AdashiGroupMember[] {
    if (adashiId) {
      return this.members.filter((m) => m.adashiId === adashiId);
    }
    return [...this.members];
  }
  getMemberById(id: string): AdashiGroupMember | undefined {
    return this.members.find((m) => m.id === id);
  }
  addMember(member: AdashiGroupMember): AdashiGroupMember {
    this.members.push(member);
    return member;
  }
  updateMember(id: string, updates: Partial<AdashiGroupMember>): AdashiGroupMember | undefined {
    const idx = this.members.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    this.members[idx] = { ...this.members[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.members[idx];
  }

  // ROTATIONS
  getRotations(adashiId?: string): AdashiRotation[] {
    if (adashiId) {
      return this.rotations.filter((r) => r.adashiId === adashiId);
    }
    return [...this.rotations];
  }
  addRotation(rotation: AdashiRotation): AdashiRotation {
    this.rotations.unshift(rotation);
    return rotation;
  }

  // CYCLES
  getCycles(adashiId?: string): AdashiCycle[] {
    if (adashiId) {
      return this.cycles.filter((c) => c.adashiId === adashiId);
    }
    return [...this.cycles];
  }
  getCycleById(id: string): AdashiCycle | undefined {
    return this.cycles.find((c) => c.id === id);
  }
  addCycle(cycle: AdashiCycle): AdashiCycle {
    this.cycles.push(cycle);
    return cycle;
  }
  updateCycle(id: string, updates: Partial<AdashiCycle>): AdashiCycle | undefined {
    const idx = this.cycles.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.cycles[idx] = { ...this.cycles[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.cycles[idx];
  }

  // OBLIGATIONS
  getObligations(adashiId?: string, cycleId?: string): AdashiContributionObligation[] {
    return this.obligations.filter((o) => {
      if (adashiId && o.adashiId !== adashiId) return false;
      if (cycleId && o.cycleId !== cycleId) return false;
      return true;
    });
  }
  getObligationById(id: string): AdashiContributionObligation | undefined {
    return this.obligations.find((o) => o.id === id);
  }
  addObligation(obligation: AdashiContributionObligation): AdashiContributionObligation {
    this.obligations.push(obligation);
    return obligation;
  }
  updateObligation(id: string, updates: Partial<AdashiContributionObligation>): AdashiContributionObligation | undefined {
    const idx = this.obligations.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;
    this.obligations[idx] = { ...this.obligations[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.obligations[idx];
  }

  // PAYOUTS
  getPayouts(adashiId?: string): AdashiPayout[] {
    if (adashiId) {
      return this.payouts.filter((p) => p.adashiId === adashiId);
    }
    return [...this.payouts];
  }
  getPayoutById(id: string): AdashiPayout | undefined {
    return this.payouts.find((p) => p.id === id);
  }
  addPayout(payout: AdashiPayout): AdashiPayout {
    this.payouts.unshift(payout);
    return payout;
  }
  updatePayout(id: string, updates: Partial<AdashiPayout>): AdashiPayout | undefined {
    const idx = this.payouts.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.payouts[idx] = { ...this.payouts[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.payouts[idx];
  }

  // RECOVERY CASES
  getRecoveryCases(): AdashiRecoveryCase[] {
    return [...this.recoveryCases];
  }
  addRecoveryCase(recoveryCase: AdashiRecoveryCase): AdashiRecoveryCase {
    this.recoveryCases.unshift(recoveryCase);
    return recoveryCase;
  }
  updateRecoveryCase(id: string, updates: Partial<AdashiRecoveryCase>): AdashiRecoveryCase | undefined {
    const idx = this.recoveryCases.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.recoveryCases[idx] = { ...this.recoveryCases[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.recoveryCases[idx];
  }

  // MAKER CHECKER
  getMakerCheckerRequests(status?: string): AdashiMakerCheckerRequest[] {
    if (status) {
      return this.makerCheckerRequests.filter((m) => m.status === status);
    }
    return [...this.makerCheckerRequests];
  }
  addMakerCheckerRequest(req: AdashiMakerCheckerRequest): AdashiMakerCheckerRequest {
    this.makerCheckerRequests.unshift(req);
    return req;
  }
  updateMakerCheckerRequest(id: string, updates: Partial<AdashiMakerCheckerRequest>): AdashiMakerCheckerRequest | undefined {
    const idx = this.makerCheckerRequests.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    this.makerCheckerRequests[idx] = { ...this.makerCheckerRequests[idx], ...updates };
    return this.makerCheckerRequests[idx];
  }

  // AUDIT EVENTS
  getAuditEvents(adashiId?: string): AdashiAuditEvent[] {
    if (adashiId) {
      return this.auditEvents.filter((a) => a.adashiId === adashiId);
    }
    return [...this.auditEvents];
  }
  logAuditEvent(event: Omit<AdashiAuditEvent, 'id' | 'createdAt'>): AdashiAuditEvent {
    const audit: AdashiAuditEvent = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...event,
    };
    this.auditEvents.unshift(audit);
    return audit;
  }

  // PLATFORM SUMMARY STATS
  getSummaryStats(): AdashiSummaryStats {
    const activeGroups = this.groups.filter((g) => g.status === 'ACTIVE_IN_PROGRESS' || g.status === 'MEMBERSHIP_LOCKED' || g.status === 'ROTATION_PUBLISHED');
    const totalMembers = this.members.length;
    
    // Escrow calculation: sum of paid obligations minus sum of completed payouts
    const paidNgn = this.obligations.filter((o) => o.currency === 'NGN' && o.status === 'PAID').reduce((sum, o) => sum + o.amount, 0);
    const disbursedNgn = this.payouts.filter((p) => p.currency === 'NGN' && p.status === 'COMPLETED').reduce((sum, p) => sum + p.netDisbursedAmount, 0);
    const totalEscrowNgn = Math.max(0, paidNgn - disbursedNgn);

    const paidXof = this.obligations.filter((o) => o.currency === 'XOF' && o.status === 'PAID').reduce((sum, o) => sum + o.amount, 0);
    const disbursedXof = this.payouts.filter((p) => p.currency === 'XOF' && p.status === 'COMPLETED').reduce((sum, p) => sum + p.netDisbursedAmount, 0);
    const totalEscrowXof = Math.max(0, paidXof - disbursedXof);

    const totalObligationsCount = this.obligations.length;
    const paidObligationsCount = this.obligations.filter((o) => o.status === 'PAID').length;
    const collectionRate = totalObligationsCount > 0 ? (paidObligationsCount / totalObligationsCount) * 100 : 100;

    const defaultedCount = this.obligations.filter((o) => o.status === 'DEFAULTED' || o.status === 'OVERDUE').length;
    const defaultRate = totalObligationsCount > 0 ? (defaultedCount / totalObligationsCount) * 100 : 0;

    const pendingMakerChecker = this.makerCheckerRequests.filter((m) => m.status === 'PENDING').length;
    const activeRecovery = this.recoveryCases.filter((r) => r.stage !== 'SETTLED' && r.stage !== 'WRITTEN_OFF').length;

    return {
      totalActiveGroups: activeGroups.length,
      totalMembersParticipating: totalMembers,
      totalEscrowVaultNgn: totalEscrowNgn,
      totalEscrowVaultXof: totalEscrowXof,
      totalDisbursedNgn: disbursedNgn,
      totalDisbursedXof: disbursedXof,
      collectionRatePercent: parseFloat(collectionRate.toFixed(1)),
      defaultRatePercent: parseFloat(defaultRate.toFixed(1)),
      pendingMakerCheckerCount: pendingMakerChecker,
      activeRecoveryCasesCount: activeRecovery,
    };
  }
}

export const AdashiStore = new AdashiStoreSingleton();
