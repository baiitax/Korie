// Provider Connectivity Layer, Capability Registry & Health Engine

import { ProviderNodeRecord } from '@/types/gatewayEngine';

export class ProviderConnectivityEngine {
  private static instance: ProviderConnectivityEngine;

  private providers: Map<string, ProviderNodeRecord> = new Map();

  private constructor() {
    this.seedProviders();
  }

  public static getInstance(): ProviderConnectivityEngine {
    if (!ProviderConnectivityEngine.instance) {
      ProviderConnectivityEngine.instance = new ProviderConnectivityEngine();
    }
    return ProviderConnectivityEngine.instance;
  }

  private seedProviders() {
    const defaultProviders: ProviderNodeRecord[] = [
      {
        id: 'pvd-01',
        providerCode: 'PROVIDUS_NG',
        name: 'Providus Bank Nigeria (Core Settlement Gateway)',
        country: 'NG',
        currency: 'NGN',
        adapterClass: 'ProvidusNipAdapter',
        healthStatus: 'HEALTHY',
        circuitBreakerState: 'CLOSED',
        supportedCapabilities: ['NIP_INSTANT_OUTWARD', 'VIRTUAL_ACCOUNTS', 'STATUS_QUERY', 'DIRECT_DEBITS', 'WEBHOOKS'],
        avgLatencyMs: 142,
        successRate24h: 99.8,
        lastHeartbeatAt: new Date().toISOString(),
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'pvd-02',
        providerCode: 'KORIS_NE',
        name: 'Koris Bank Niger Republic (BCEAO Regional Hub)',
        country: 'NE',
        currency: 'XOF',
        adapterClass: 'KorisWaemuAdapter',
        healthStatus: 'HEALTHY',
        circuitBreakerState: 'CLOSED',
        supportedCapabilities: ['BCEAO_SIP_TRANSFERS', 'AGENCY_CASH_OUT', 'STATUS_QUERY', 'WEBHOOKS'],
        avgLatencyMs: 185,
        successRate24h: 99.4,
        lastHeartbeatAt: new Date().toISOString(),
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    defaultProviders.forEach((p) => this.providers.set(p.providerCode, p));
  }

  public getProviders(): ProviderNodeRecord[] {
    return Array.from(this.providers.values());
  }

  public getProvider(code: string): ProviderNodeRecord | undefined {
    return this.providers.get(code);
  }

  public updateHealth(
    providerCode: string,
    health: 'HEALTHY' | 'DEGRADED' | 'DOWN',
    latencyMs: number
  ) {
    const p = this.providers.get(providerCode);
    if (!p) return;

    p.healthStatus = health;
    p.avgLatencyMs = latencyMs;
    p.lastHeartbeatAt = new Date().toISOString();
    if (health === 'DOWN') {
      p.circuitBreakerState = 'OPEN';
    } else if (health === 'DEGRADED') {
      p.circuitBreakerState = 'HALF_OPEN';
    } else {
      p.circuitBreakerState = 'CLOSED';
    }
    this.providers.set(providerCode, p);
  }
}
