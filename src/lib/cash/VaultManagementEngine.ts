// Vault Hierarchy, Dual-Custody Access & Compartment Governance Engine

import { VaultRecord } from '@/types/physicalCashEngine';

export interface VaultAccessRequest {
  vaultId: string;
  makerCustodian: string;
  checkerCustodian: string;
  supervisor?: string;
  accessReason: string;
  authorizedAmount?: number;
}

export class VaultManagementEngine {
  private static instance: VaultManagementEngine;

  private vaults: Map<string, VaultRecord> = new Map();
  private accessLogs: Array<VaultAccessRequest & { id: string; timestamp: string; status: string }> = [];

  private constructor() {
    this.seedVaults();
  }

  public static getInstance(): VaultManagementEngine {
    if (!VaultManagementEngine.instance) {
      VaultManagementEngine.instance = new VaultManagementEngine();
    }
    return VaultManagementEngine.instance;
  }

  private seedVaults() {
    const defaultVaults: VaultRecord[] = [
      {
        id: 'vlt-los-01',
        vaultCode: 'VLT-HQ-LOS-01',
        name: 'Lagos Victoria Island Central Vault',
        locationId: 'loc-vault-los',
        country: 'NG',
        currency: 'NGN',
        custodianA: 'Emeka Nwosu (Chief Custodian)',
        custodianB: 'Tunde Bakare (Senior Vault Officer)',
        supervisor: 'Folake Adeleke (VP Cash Ops)',
        dualControlRequired: true,
        maxVaultCapacity: 2000000000,
        currentCashHolding: 470000000,
        status: 'LOCKED',
        lastOpenedAt: '2026-09-04T07:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'vlt-abj-01',
        vaultCode: 'VLT-REG-ABJ-01',
        name: 'Abuja Central Regional Vault',
        locationId: 'loc-vault-abj',
        country: 'NG',
        currency: 'NGN',
        custodianA: 'Ibrahim Danladi (Lead Custodian)',
        custodianB: 'Fatima Garba (Vault Custodian B)',
        supervisor: 'Zainab Bello (Treasury Ops Head)',
        dualControlRequired: true,
        maxVaultCapacity: 800000000,
        currentCashHolding: 130000000,
        status: 'LOCKED',
        lastOpenedAt: '2026-09-04T07:15:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'vlt-nim-01',
        vaultCode: 'VLT-HQ-NIM-01',
        name: 'Niamey Plateau Central Vault',
        locationId: 'loc-vault-nim',
        country: 'NE',
        currency: 'XOF',
        custodianA: 'Ousmane Mahamane (Chef Coffre-Fort)',
        custodianB: 'Seydou Kane (Gardien Coffre-Fort B)',
        supervisor: 'Aminata Touré (Directrice Trésorerie)',
        dualControlRequired: true,
        maxVaultCapacity: 1500000000,
        currentCashHolding: 295000000,
        status: 'LOCKED',
        lastOpenedAt: '2026-09-04T07:30:00Z',
        createdAt: '2026-02-01T00:00:00Z',
      },
    ];

    defaultVaults.forEach((v) => this.vaults.set(v.id, v));
  }

  public getVaults(): VaultRecord[] {
    return Array.from(this.vaults.values());
  }

  public getVault(vaultId: string): VaultRecord | undefined {
    return this.vaults.get(vaultId);
  }

  public authorizeVaultAccess(req: VaultAccessRequest): { success: boolean; error?: string; accessLogId?: string } {
    const vault = this.vaults.get(req.vaultId);
    if (!vault) return { success: false, error: 'VAULT_NOT_FOUND' };

    // Dual-control enforcement
    if (vault.dualControlRequired && (!req.makerCustodian || !req.checkerCustodian)) {
      return { success: false, error: 'DUAL_CONTROL_CUSTODIANS_REQUIRED' };
    }

    if (req.makerCustodian === req.checkerCustodian) {
      return { success: false, error: 'MAKER_AND_CHECKER_MUST_BE_DISTINCT_CUSTODIANS' };
    }

    // High value check
    if ((req.authorizedAmount || 0) > 10000000 && !req.supervisor) {
      return { success: false, error: 'SUPERVISOR_SIGN_OFF_REQUIRED_FOR_HIGH_VALUE' };
    }

    vault.status = 'OPEN';
    vault.lastOpenedAt = new Date().toISOString();
    this.vaults.set(req.vaultId, vault);

    const logId = `vac-${Date.now().toString().slice(-4)}`;
    this.accessLogs.unshift({
      ...req,
      id: logId,
      timestamp: new Date().toISOString(),
      status: 'AUTHORIZED',
    });

    return { success: true, accessLogId: logId };
  }

  public closeVault(vaultId: string): { success: boolean } {
    const vault = this.vaults.get(vaultId);
    if (!vault) return { success: false };

    vault.status = 'LOCKED';
    this.vaults.set(vaultId, vault);
    return { success: true };
  }

  public getAccessLogs(vaultId?: string) {
    if (vaultId) {
      return this.accessLogs.filter((l) => l.vaultId === vaultId);
    }
    return this.accessLogs;
  }
}
