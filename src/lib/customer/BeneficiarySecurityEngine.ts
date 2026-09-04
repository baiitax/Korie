// Beneficiary Management & 24-Hour Cooldown Security Engine

import { BeneficiaryRecord } from '@/types/customerProductFactory';

export class BeneficiarySecurityEngine {
  private static instance: BeneficiarySecurityEngine;

  private beneficiaries: Map<string, BeneficiaryRecord> = new Map();

  private constructor() {
    this.seedBeneficiaries();
  }

  public static getInstance(): BeneficiarySecurityEngine {
    if (!BeneficiarySecurityEngine.instance) {
      BeneficiarySecurityEngine.instance = new BeneficiarySecurityEngine();
    }
    return BeneficiarySecurityEngine.instance;
  }

  private seedBeneficiaries() {
    const defaultBeneficiaries: BeneficiaryRecord[] = [
      {
        id: 'ben-01',
        customerId: 'cust-ng-001-ibrahim',
        beneficiaryName: 'Amina Gambo',
        accountNumber: '9876543210',
        bankCode: '011',
        bankName: 'First Bank of Nigeria',
        currency: 'NGN',
        country: 'NG',
        status: 'ACTIVE',
        isVerified: true,
        riskScore: 5.0,
        createdAt: '2026-08-01T10:00:00Z',
        updatedAt: '2026-08-01T10:00:00Z',
      },
      {
        id: 'ben-02',
        customerId: 'cust-ng-001-ibrahim',
        beneficiaryName: 'Garba Express POS Float',
        accountNumber: '0123456789',
        bankCode: '058',
        bankName: 'Providus Bank',
        currency: 'NGN',
        country: 'NG',
        status: 'ACTIVE',
        isVerified: true,
        riskScore: 0.0,
        createdAt: '2026-08-15T12:00:00Z',
        updatedAt: '2026-08-15T12:00:00Z',
      },
    ];

    defaultBeneficiaries.forEach((b) => this.beneficiaries.set(b.id, b));
  }

  public getBeneficiaries(customerId: string): BeneficiaryRecord[] {
    return Array.from(this.beneficiaries.values()).filter((b) => b.customerId === customerId);
  }

  public addBeneficiary(data: Omit<BeneficiaryRecord, 'id' | 'status' | 'isVerified' | 'cooldownExpiresAt' | 'riskScore' | 'createdAt' | 'updatedAt'>): BeneficiaryRecord {
    const id = `ben-${Date.now().toString().slice(-6)}`;
    const cooldownExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24h Cooldown

    const newBen: BeneficiaryRecord = {
      ...data,
      id,
      status: 'ACTIVE',
      isVerified: true,
      cooldownExpiresAt,
      riskScore: 10.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.beneficiaries.set(id, newBen);
    return newBen;
  }

  public evaluateCounterpartyRisk(beneficiaryId: string): { isSafe: boolean; isCooldownActive: boolean; riskScore: number } {
    const b = this.beneficiaries.get(beneficiaryId);
    if (!b) return { isSafe: false, isCooldownActive: false, riskScore: 100 };

    const isCooldownActive = b.cooldownExpiresAt ? new Date(b.cooldownExpiresAt).getTime() > Date.now() : false;
    const isSafe = b.status === 'ACTIVE' && b.riskScore < 50;

    return {
      isSafe,
      isCooldownActive,
      riskScore: b.riskScore,
    };
  }
}
