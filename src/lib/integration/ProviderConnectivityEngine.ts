// Provider Connectivity Fabric & Circuit Breaker Engine

import { ProviderNodeAdapter } from '@/types/integrationEngine';

export class ProviderConnectivityEngine {
  private static instance: ProviderConnectivityEngine;

  private providers: Map<string, ProviderNodeAdapter> = new Map();

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
    const defaultProviders: ProviderNodeAdapter[] = [
      {
        id: 'prov-01',
        providerCode: 'PROV-NG-01',
        providerName: 'Providus Bank Nigeria Plc Node',
        providerType: 'COMMERCIAL_BANK',
        country: 'NG',
        circuitBreakerStatus: 'CLOSED',
        p95LatencyMs: 142,
        successRatePct: 99.85,
        isActive: true,
      },
      {
        id: 'prov-02',
        providerCode: 'KORIS-NE-01',
        providerName: 'Koris Bank Niger SA Node',
        providerType: 'COMMERCIAL_BANK',
        country: 'NE',
        circuitBreakerStatus: 'CLOSED',
        p95LatencyMs: 188,
        successRatePct: 99.70,
        isActive: true,
      },
      {
        id: 'prov-03',
        providerCode: 'NIBSS-NIP-01',
        providerName: 'NIBSS Instant Payments (NIP) Central Switch',
        providerType: 'SWITCH',
        country: 'NG',
        circuitBreakerStatus: 'CLOSED',
        p95LatencyMs: 220,
        successRatePct: 99.40,
        isActive: true,
      },
      {
        id: 'prov-04',
        providerCode: 'G4S-CIT-01',
        providerName: 'G4S Cash-in-Transit Telemetry API',
        providerType: 'CIT_COURIER',
        country: 'NG',
        circuitBreakerStatus: 'CLOSED',
        p95LatencyMs: 310,
        successRatePct: 99.10,
        isActive: true,
      },
    ];

    defaultProviders.forEach((p) => this.providers.set(p.providerCode, p));
  }

  public getProviders(): ProviderNodeAdapter[] {
    return Array.from(this.providers.values());
  }

  public tripCircuitBreaker(providerCode: string): { success: boolean; provider?: ProviderNodeAdapter } {
    const p = this.providers.get(providerCode);
    if (!p) return { success: false };

    p.circuitBreakerStatus = 'OPEN';
    this.providers.set(providerCode, p);
    return { success: true, provider: p };
  }

  public resetCircuitBreaker(providerCode: string): { success: boolean; provider?: ProviderNodeAdapter } {
    const p = this.providers.get(providerCode);
    if (!p) return { success: false };

    p.circuitBreakerStatus = 'CLOSED';
    this.providers.set(providerCode, p);
    return { success: true, provider: p };
  }
}
