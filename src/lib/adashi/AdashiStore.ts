// =============================================================================
// File: src/lib/adashi/AdashiStore.ts
// Description: Adashi Domain State Store with Supabase-ready semantics.
// File-backed (DEMO runtime): hydrates from /tmp/korie-adashi-store.json at every
// public entry and persists after every mutation so Next.js route workers stay
// consistent (env override ADASHI_STORE_PATH). Never committed; see audit doc.
// =============================================================================

import fs from 'fs';
import path from 'path';

const STORE_PATH = process.env.ADASHI_STORE_PATH || '/tmp/korie-adashi-store.json';

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
  private hydrated = false;
  private groups: AdashiGroup[] = [...INITIAL_ADASHI_GROUPS];
  private members: AdashiGroupMember[] = [...INITIAL_ADASHI_MEMBERS];
  private rotations: AdashiRotation[] = [...INITIAL_ADASHI_ROTATIONS];
  private cycles: AdashiCycle[] = [...INITIAL_ADASHI_CYCLES];
  private obligations: AdashiContributionObligation[] = [...INITIAL_ADASHI_OBLIGATIONS];
  private payouts: AdashiPayout[] = [...INITIAL_ADASHI_PAYOUTS];
  private recoveryCases: AdashiRecoveryCase[] = [...INITIAL_ADASHI_RECOVERY_CASES];
  private makerCheckerRequests: AdashiMakerCheckerRequest[] = [...INITIAL_MAKER_CHECKER_REQUESTS];
  private auditEvents: AdashiAuditEvent[] = [...INITIAL_ADASHI_AUDIT_EVENTS];

  constructor() {
    this.hydrate();
  }

  private hydrate() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      if (data.products) this.products = data.products;
      if (data.groups) this.groups = data.groups;
      if (data.members) this.members = data.members;
      if (data.rotations) this.rotations = data.rotations;
      if (data.cycles) this.cycles = data.cycles;
      if (data.obligations) this.obligations = data.obligations;
      if (data.payouts) this.payouts = data.payouts;
      if (data.recoveryCases) this.recoveryCases = data.recoveryCases;
      if (data.makerCheckerRequests) this.makerCheckerRequests = data.makerCheckerRequests;
      if (data.auditEvents) this.auditEvents = data.auditEvents;
      this.hydrated = true;
    } catch {
      /* corrupt/missing store — keep seeds */
    }
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(
        STORE_PATH,
        JSON.stringify({
          products: this.products,
          groups: this.groups,
          members: this.members,
          rotations: this.rotations,
          cycles: this.cycles,
          obligations: this.obligations,
          payouts: this.payouts,
          recoveryCases: this.recoveryCases,
          makerCheckerRequests: this.makerCheckerRequests,
          auditEvents: this.auditEvents,
        }),
      );
    } catch {
      /* non-fatal */
    }
  }

  // PRODUCTS
  getProducts(): AdashiProduct[] {
    this.hydrate();
    return [...this.products];
  }
  getProductById(id: string): AdashiProduct | undefined {
    this.hydrate();
    return this.products.find((p) => p.id === id || p.productCode === id);
  }
  addProduct(product: AdashiProduct): AdashiProduct {
    this.hydrate();
    this.products.unshift(product);
    this.persist();
    return product;
  }
  updateProduct(id: string, updates: Partial<AdashiProduct>): AdashiProduct | undefined {
    this.hydrate();
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.products[idx] = { ...this.products[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.products[idx];
  }

  // GROUPS
  getGroups(): AdashiGroup[] {
    this.hydrate();
    return [...this.groups];
  }
  getGroupById(id: string): AdashiGroup | undefined {
    this.hydrate();
    return this.groups.find((g) => g.id === id || g.groupCode === id);
  }
  addGroup(group: AdashiGroup): AdashiGroup {
    this.hydrate();
    this.groups.unshift(group);
    this.persist();
    return group;
  }
  updateGroup(id: string, updates: Partial<AdashiGroup>): AdashiGroup | undefined {
    this.hydrate();
    const idx = this.groups.findIndex((g) => g.id === id);
    if (idx === -1) return undefined;
    this.groups[idx] = { ...this.groups[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.groups[idx];
  }

  // MEMBERS
  getMembers(adashiId?: string): AdashiGroupMember[] {
    this.hydrate();
    if (adashiId) {
      return this.members.filter((m) => m.adashiId === adashiId);
    }
    return [...this.members];
  }
  getMemberById(id: string): AdashiGroupMember | undefined {
    this.hydrate();
    return this.members.find((m) => m.id === id);
  }
  addMember(member: AdashiGroupMember): AdashiGroupMember {
    this.hydrate();
    this.members.push(member);
    this.persist();
    return member;
  }
  updateMember(id: string, updates: Partial<AdashiGroupMember>): AdashiGroupMember | undefined {
    this.hydrate();
    const idx = this.members.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    this.members[idx] = { ...this.members[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.members[idx];
  }

  // ROTATIONS
  getRotations(adashiId?: string): AdashiRotation[] {
    this.hydrate();
    if (adashiId) {
      return this.rotations.filter((r) => r.adashiId === adashiId);
    }
    return [...this.rotations];
  }
  addRotation(rotation: AdashiRotation): AdashiRotation {
    this.hydrate();
    this.rotations.unshift(rotation);
    this.persist();
    return rotation;
  }

  // CYCLES
  getCycles(adashiId?: string): AdashiCycle[] {
    this.hydrate();
    if (adashiId) {
      return this.cycles.filter((c) => c.adashiId === adashiId);
    }
    return [...this.cycles];
  }
  getCycleById(id: string): AdashiCycle | undefined {
    this.hydrate();
    return this.cycles.find((c) => c.id === id);
  }
  addCycle(cycle: AdashiCycle): AdashiCycle {
    this.hydrate();
    this.cycles.push(cycle);
    this.persist();
    return cycle;
  }
  updateCycle(id: string, updates: Partial<AdashiCycle>): AdashiCycle | undefined {
    this.hydrate();
    const idx = this.cycles.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.cycles[idx] = { ...this.cycles[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.cycles[idx];
  }

  // OBLIGATIONS
  getObligations(adashiId?: string, cycleId?: string): AdashiContributionObligation[] {
    this.hydrate();
    return this.obligations.filter((o) => {
      if (adashiId && o.adashiId !== adashiId) return false;
      if (cycleId && o.cycleId !== cycleId) return false;
      return true;
    });
  }
  getObligationById(id: string): AdashiContributionObligation | undefined {
    this.hydrate();
    return this.obligations.find((o) => o.id === id);
  }
  addObligation(obligation: AdashiContributionObligation): AdashiContributionObligation {
    this.hydrate();
    this.obligations.push(obligation);
    this.persist();
    return obligation;
  }
  updateObligation(id: string, updates: Partial<AdashiContributionObligation>): AdashiContributionObligation | undefined {
    this.hydrate();
    const idx = this.obligations.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;
    this.obligations[idx] = { ...this.obligations[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.obligations[idx];
  }

  // PAYOUTS
  getPayouts(adashiId?: string): AdashiPayout[] {
    this.hydrate();
    if (adashiId) {
      return this.payouts.filter((p) => p.adashiId === adashiId);
    }
    return [...this.payouts];
  }
  getPayoutById(id: string): AdashiPayout | undefined {
    this.hydrate();
    return this.payouts.find((p) => p.id === id);
  }
  addPayout(payout: AdashiPayout): AdashiPayout {
    this.hydrate();
    this.payouts.unshift(payout);
    this.persist();
    return payout;
  }
  updatePayout(id: string, updates: Partial<AdashiPayout>): AdashiPayout | undefined {
    this.hydrate();
    const idx = this.payouts.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.payouts[idx] = { ...this.payouts[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.payouts[idx];
  }

  // RECOVERY CASES
  getRecoveryCases(): AdashiRecoveryCase[] {
    this.hydrate();
    return [...this.recoveryCases];
  }
  addRecoveryCase(recoveryCase: AdashiRecoveryCase): AdashiRecoveryCase {
    this.hydrate();
    this.recoveryCases.unshift(recoveryCase);
    this.persist();
    return recoveryCase;
  }
  updateRecoveryCase(id: string, updates: Partial<AdashiRecoveryCase>): AdashiRecoveryCase | undefined {
    this.hydrate();
    const idx = this.recoveryCases.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.recoveryCases[idx] = { ...this.recoveryCases[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.recoveryCases[idx];
  }

  // MAKER CHECKER
  getMakerCheckerRequests(status?: string): AdashiMakerCheckerRequest[] {
    this.hydrate();
    if (status) {
      return this.makerCheckerRequests.filter((m) => m.status === status);
    }
    return [...this.makerCheckerRequests];
  }
  addMakerCheckerRequest(req: AdashiMakerCheckerRequest): AdashiMakerCheckerRequest {
    this.hydrate();
    this.makerCheckerRequests.unshift(req);
    this.persist();
    return req;
  }
  updateMakerCheckerRequest(id: string, updates: Partial<AdashiMakerCheckerRequest>): AdashiMakerCheckerRequest | undefined {
    this.hydrate();
    const idx = this.makerCheckerRequests.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    this.makerCheckerRequests[idx] = { ...this.makerCheckerRequests[idx], ...updates };
    this.persist();
    return this.makerCheckerRequests[idx];
  }

  // AUDIT EVENTS
  getAuditEvents(adashiId?: string): AdashiAuditEvent[] {
    this.hydrate();
    if (adashiId) {
      return this.auditEvents.filter((a) => a.adashiId === adashiId);
    }
    return [...this.auditEvents];
  }
  logAuditEvent(event: Omit<AdashiAuditEvent, 'id' | 'createdAt'>): AdashiAuditEvent {
    this.hydrate();
    const audit: AdashiAuditEvent = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...event,
    };
    this.auditEvents.unshift(audit);
    this.persist();
    return audit;
  }

  // PLATFORM SUMMARY STATS
  getSummaryStats(): AdashiSummaryStats {
    this.hydrate();
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
