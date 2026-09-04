// Partner Registry, Partner 360 & Application Governance Engine

import { PartnerRecord, ApiClientRecord } from '@/types/gatewayEngine';

export class PartnerManagementEngine {
  private static instance: PartnerManagementEngine;

  private partners: Map<string, PartnerRecord> = new Map();
  private clients: Map<string, ApiClientRecord> = new Map();

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
    const defaultPartners: PartnerRecord[] = [
      {
        id: 'prt-01',
        partnerCode: 'PRT-NG-0012',
        businessName: 'Sahel Global Technologies Ltd',
        category: 'FINTECH',
        country: 'NG',
        legalEntity: 'Korie Nigeria Ltd',
        kybStatus: 'VERIFIED',
        lifecycleStatus: 'ACTIVE',
        tier: 'ENTERPRISE',
        createdAt: '2026-01-10T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'prt-02',
        partnerCode: 'PRT-NE-0005',
        businessName: 'Niamey Express Remittance SA',
        category: 'BDC_PARTNER',
        country: 'NE',
        legalEntity: 'Korie Niger SA',
        kybStatus: 'VERIFIED',
        lifecycleStatus: 'ACTIVE',
        tier: 'STANDARD',
        createdAt: '2026-02-15T00:00:00Z',
        updatedAt: '2026-09-02T00:00:00Z',
      },
    ];

    defaultPartners.forEach((p) => this.partners.set(p.id, p));

    const defaultClients: ApiClientRecord[] = [
      {
        id: 'cli-01',
        partnerId: 'prt-01',
        partnerName: 'Sahel Global Technologies Ltd',
        clientId: 'cli_live_sahel_9918',
        clientName: 'Sahel Production Gateway App',
        environment: 'PRODUCTION',
        status: 'ACTIVE',
        allowedScopes: ['payments:read', 'payments:write', 'transfers:write', 'wallets:read'],
        allowedIps: ['102.89.23.0/24', '105.112.84.12'],
        rateLimitPerSecond: 100,
        createdAt: '2026-01-12T00:00:00Z',
        apiKeyPreview: 'kp_live_7f9a...8821',
      },
      {
        id: 'cli-02',
        partnerId: 'prt-02',
        partnerName: 'Niamey Express Remittance SA',
        clientId: 'cli_sand_niamey_4412',
        clientName: 'Niamey BDC Sandbox App',
        environment: 'SANDBOX',
        status: 'ACTIVE',
        allowedScopes: ['fx:quote', 'fx:read', 'transfers:write'],
        allowedIps: [],
        rateLimitPerSecond: 50,
        createdAt: '2026-02-18T00:00:00Z',
        apiKeyPreview: 'kp_test_4b12...9901',
      },
    ];

    defaultClients.forEach((c) => this.clients.set(c.id, c));
  }

  public getPartners(): PartnerRecord[] {
    return Array.from(this.partners.values());
  }

  public getPartner(id: string): PartnerRecord | undefined {
    return this.partners.get(id);
  }

  public getClients(partnerId?: string): ApiClientRecord[] {
    let list = Array.from(this.clients.values());
    if (partnerId) {
      list = list.filter((c) => c.partnerId === partnerId);
    }
    return list;
  }

  public createClient(params: {
    partnerId: string;
    clientName: string;
    environment: 'SANDBOX' | 'PRODUCTION';
    allowedScopes: string[];
    rateLimitPerSecond?: number;
  }): ApiClientRecord {
    const id = `cli-${Date.now().toString().slice(-4)}`;
    const prefix = params.environment === 'PRODUCTION' ? 'kp_live_' : 'kp_test_';
    const randomHex = Math.random().toString(36).substring(2, 10);
    const clientId = `cli_${params.environment.toLowerCase()}_${randomHex}`;
    const partner = this.partners.get(params.partnerId);

    const client: ApiClientRecord = {
      id,
      partnerId: params.partnerId,
      partnerName: partner?.businessName || 'Partner',
      clientId,
      clientName: params.clientName,
      environment: params.environment,
      status: 'ACTIVE',
      allowedScopes: params.allowedScopes,
      allowedIps: [],
      rateLimitPerSecond: params.rateLimitPerSecond || 50,
      createdAt: new Date().toISOString(),
      apiKeyPreview: `${prefix}${randomHex}...${Math.floor(1000 + Math.random() * 9000)}`,
    };

    this.clients.set(id, client);
    return client;
  }
}
