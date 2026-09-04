// API Gateway Route Registry, Scopes & Latency Telemetry Engine

import { ApiGatewayRoute, ApiClientCredential } from '@/types/integrationEngine';

export class ApiGatewayRouterEngine {
  private static instance: ApiGatewayRouterEngine;

  private routes: Map<string, ApiGatewayRoute> = new Map();
  private credentials: Map<string, ApiClientCredential> = new Map();

  private constructor() {
    this.seedRoutes();
    this.seedCredentials();
  }

  public static getInstance(): ApiGatewayRouterEngine {
    if (!ApiGatewayRouterEngine.instance) {
      ApiGatewayRouterEngine.instance = new ApiGatewayRouterEngine();
    }
    return ApiGatewayRouterEngine.instance;
  }

  private seedRoutes() {
    const defaultRoutes: ApiGatewayRoute[] = [
      {
        id: 'rt-01',
        routeCode: 'RT-TRANSFERS-WRITE',
        groupName: 'Transfer API',
        httpMethod: 'POST',
        pathPattern: '/api/v1/transfers',
        version: 'v1',
        requiredScope: 'transfers:write',
        rateLimitPerSecond: 150,
        p50LatencyMs: 142,
        requests24h: 184500,
        successRatePct: 99.8,
        status: 'ONLINE',
      },
      {
        id: 'rt-02',
        routeCode: 'RT-PAYMENTS-WRITE',
        groupName: 'Payment & Collections API',
        httpMethod: 'POST',
        pathPattern: '/api/v1/payments',
        version: 'v1',
        requiredScope: 'payments:write',
        rateLimitPerSecond: 250,
        p50LatencyMs: 95,
        requests24h: 312000,
        successRatePct: 99.9,
        status: 'ONLINE',
      },
      {
        id: 'rt-03',
        routeCode: 'RT-SWITCH-OUTWARD',
        groupName: 'Banking Node Gateway (NIP / WAEMU)',
        httpMethod: 'POST',
        pathPattern: '/api/v1/switch/outward',
        version: 'v1',
        requiredScope: 'switch:outward',
        rateLimitPerSecond: 100,
        p50LatencyMs: 210,
        requests24h: 92400,
        successRatePct: 99.4,
        status: 'ONLINE',
      },
      {
        id: 'rt-04',
        routeCode: 'RT-AGENCY-CASHOUT',
        groupName: 'Agency Cash-Out API',
        httpMethod: 'POST',
        pathPattern: '/api/v1/agency/cash-out',
        version: 'v1',
        requiredScope: 'agency:write',
        rateLimitPerSecond: 120,
        p50LatencyMs: 115,
        requests24h: 145000,
        successRatePct: 99.6,
        status: 'ONLINE',
      },
      {
        id: 'rt-05',
        routeCode: 'RT-FX-QUOTE',
        groupName: 'FX & BDC Quote API',
        httpMethod: 'POST',
        pathPattern: '/api/v1/fx/quote',
        version: 'v1',
        requiredScope: 'fx:quote',
        rateLimitPerSecond: 300,
        p50LatencyMs: 68,
        requests24h: 88000,
        successRatePct: 99.9,
        status: 'ONLINE',
      },
    ];

    defaultRoutes.forEach((r) => this.routes.set(r.routeCode, r));
  }

  private seedCredentials() {
    const defaultCredentials: ApiClientCredential[] = [
      {
        id: 'cli-01',
        partnerId: 'prt-01',
        partnerName: 'Sahara Wholesale Corp',
        clientId: 'kp_cli_sahara_prod_8819',
        clientName: 'Sahara Automated Payout Service',
        keyPrefix: 'kp_live_sec_',
        apiKeyPreview: 'kp_live_sec_88f9...d21a',
        environment: 'PRODUCTION',
        allowedScopes: ['transfers:write', 'payments:write', 'accounts:read'],
        rateLimitPerSecond: 100,
        status: 'ACTIVE',
        createdAt: '2026-06-01T10:00:00Z',
      },
      {
        id: 'cli-02',
        partnerId: 'prt-02',
        partnerName: 'Sahel Grain Trading Enterprise',
        clientId: 'kp_cli_sahel_test_1092',
        clientName: 'Sahel Sandbox Integration Client',
        keyPrefix: 'kp_test_sec_',
        apiKeyPreview: 'kp_test_sec_77b1...aa09',
        environment: 'SANDBOX',
        allowedScopes: ['transfers:write', 'payments:write'],
        rateLimitPerSecond: 50,
        status: 'ACTIVE',
        createdAt: '2026-08-15T12:00:00Z',
      },
    ];

    defaultCredentials.forEach((c) => this.credentials.set(c.id, c));
  }

  public getRoutes(): ApiGatewayRoute[] {
    return Array.from(this.routes.values());
  }

  public getCredentials(): ApiClientCredential[] {
    return Array.from(this.credentials.values());
  }

  public createCredential(data: Omit<ApiClientCredential, 'id' | 'clientId' | 'keyPrefix' | 'apiKeyPreview' | 'status' | 'createdAt'>): ApiClientCredential {
    const id = `cli-${Date.now().toString().slice(-4)}`;
    const prefix = data.environment === 'PRODUCTION' ? 'kp_live_sec_' : 'kp_test_sec_';
    const randomHex = Math.random().toString(16).slice(2, 10);
    const clientId = `kp_cli_${data.clientName.toLowerCase().replace(/\s+/g, '_').slice(0, 10)}_${Date.now().toString().slice(-4)}`;

    const cred: ApiClientCredential = {
      ...data,
      id,
      clientId,
      keyPrefix: prefix,
      apiKeyPreview: `${prefix}${randomHex}...${Date.now().toString().slice(-4)}`,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.credentials.set(id, cred);
    return cred;
  }
}
