// Payment Routing Engine & Multi-Dimensional Provider Selection

import {
  PaymentCountry,
  PaymentCurrency,
  PaymentChannel,
  RoutingRule,
  ProviderCapability,
} from '@/types/paymentSwitchEngine';

export class PaymentRoutingEngine {
  private static instance: PaymentRoutingEngine;

  private routingRules: RoutingRule[] = [
    {
      id: 'rule-ng-nip-01',
      country: 'NG',
      currency: 'NGN',
      channel: 'NIP',
      minAmount: 1,
      maxAmount: 10000000,
      primaryProvider: 'PROVIDUS_NG',
      secondaryProvider: 'NIBSS_DIRECT',
      fallbackProvider: 'INTERSWITCH',
      weightPrimary: 80,
      isActive: true,
      priority: 1,
    },
    {
      id: 'rule-ng-va-01',
      country: 'NG',
      currency: 'NGN',
      channel: 'VIRTUAL_ACCOUNT',
      minAmount: 1,
      maxAmount: 50000000,
      primaryProvider: 'PROVIDUS_NG',
      secondaryProvider: 'INTERSWITCH',
      weightPrimary: 90,
      isActive: true,
      priority: 1,
    },
    {
      id: 'rule-ng-card-01',
      country: 'NG',
      currency: 'NGN',
      channel: 'CARD',
      minAmount: 100,
      maxAmount: 5000000,
      primaryProvider: 'INTERSWITCH',
      secondaryProvider: 'PROVIDUS_NG',
      weightPrimary: 75,
      isActive: true,
      priority: 1,
    },
    {
      id: 'rule-ne-sahel-01',
      country: 'NE',
      currency: 'XOF',
      channel: 'SAHEL_SWITCH',
      minAmount: 500,
      maxAmount: 25000000,
      primaryProvider: 'KORIS_NE',
      secondaryProvider: 'GIM_UEMOA',
      weightPrimary: 100,
      isActive: true,
      priority: 1,
    },
    {
      id: 'rule-cross-border-01',
      country: 'CROSS_BORDER',
      currency: 'NGN',
      channel: 'NIP',
      minAmount: 5000,
      maxAmount: 20000000,
      primaryProvider: 'PROVIDUS_NG',
      secondaryProvider: 'KORIS_NE',
      weightPrimary: 100,
      isActive: true,
      priority: 1,
    },
  ];

  private providerCapabilities: Map<string, ProviderCapability> = new Map([
    [
      'PROVIDUS_NG',
      {
        providerCode: 'PROVIDUS_NG',
        providerName: 'Providus Bank Nigeria PLC',
        country: 'NG',
        supportedCurrencies: ['NGN', 'USD'],
        supportedChannels: ['NIP', 'VIRTUAL_ACCOUNT', 'DIRECT_DEBIT'],
        supportsOutwardNIP: true,
        supportsVirtualAccounts: true,
        supportsCardProcessing: false,
        supportsRefunds: true,
        supportsPartialRefunds: true,
        avgLatencyMs: 312,
        successRate24h: 99.88,
        circuitState: 'CLOSED',
        isOperational: true,
      },
    ],
    [
      'KORIS_NE',
      {
        providerCode: 'KORIS_NE',
        providerName: 'Coris Bank Niger SA (BCEAO Rails)',
        country: 'NE',
        supportedCurrencies: ['XOF', 'USD'],
        supportedChannels: ['SAHEL_SWITCH', 'VIRTUAL_ACCOUNT'],
        supportsOutwardNIP: false,
        supportsVirtualAccounts: true,
        supportsCardProcessing: false,
        supportsRefunds: true,
        supportsPartialRefunds: true,
        avgLatencyMs: 440,
        successRate24h: 99.45,
        circuitState: 'CLOSED',
        isOperational: true,
      },
    ],
    [
      'INTERSWITCH',
      {
        providerCode: 'INTERSWITCH',
        providerName: 'Interswitch WebPAY / Payment Gateway',
        country: 'NG',
        supportedCurrencies: ['NGN', 'USD'],
        supportedChannels: ['CARD', 'VIRTUAL_ACCOUNT', 'USSD'],
        supportsOutwardNIP: false,
        supportsVirtualAccounts: true,
        supportsCardProcessing: true,
        supportsRefunds: true,
        supportsPartialRefunds: true,
        avgLatencyMs: 580,
        successRate24h: 98.92,
        circuitState: 'CLOSED',
        isOperational: true,
      },
    ],
    [
      'NIBSS_DIRECT',
      {
        providerCode: 'NIBSS_DIRECT',
        providerName: 'NIBSS Direct Instant Payment (NIP Switch)',
        country: 'NG',
        supportedCurrencies: ['NGN'],
        supportedChannels: ['NIP'],
        supportsOutwardNIP: true,
        supportsVirtualAccounts: false,
        supportsCardProcessing: false,
        supportsRefunds: false,
        supportsPartialRefunds: false,
        avgLatencyMs: 290,
        successRate24h: 99.12,
        circuitState: 'CLOSED',
        isOperational: true,
      },
    ],
  ]);

  private constructor() {}

  public static getInstance(): PaymentRoutingEngine {
    if (!PaymentRoutingEngine.instance) {
      PaymentRoutingEngine.instance = new PaymentRoutingEngine();
    }
    return PaymentRoutingEngine.instance;
  }

  public getRules(): RoutingRule[] {
    return [...this.routingRules];
  }

  public getCapabilities(): ProviderCapability[] {
    return Array.from(this.providerCapabilities.values());
  }

  public selectOptimalProvider(params: {
    country: PaymentCountry;
    currency: PaymentCurrency;
    channel: PaymentChannel;
    amount: number;
    attemptNumber?: number;
    failedProviders?: string[];
  }): {
    selectedProvider: string;
    routeReason: string;
    isFailover: boolean;
    confidence: number;
  } {
    const { country, currency, channel, amount, attemptNumber = 1, failedProviders = [] } = params;

    // 1. Find matching rule
    const matchingRule = this.routingRules.find(
      (r) =>
        r.isActive &&
        (r.country === country || r.country === 'CROSS_BORDER') &&
        r.currency === currency &&
        r.channel === channel &&
        amount >= r.minAmount &&
        (!r.maxAmount || amount <= r.maxAmount)
    );

    let candidates: string[] = [];
    if (matchingRule) {
      candidates = [
        matchingRule.primaryProvider,
        matchingRule.secondaryProvider,
        matchingRule.fallbackProvider,
      ].filter(Boolean) as string[];
    } else {
      // Default fallback by country
      candidates = country === 'NE' ? ['KORIS_NE'] : ['PROVIDUS_NG', 'INTERSWITCH', 'NIBSS_DIRECT'];
    }

    // Filter out previously failed providers in this transaction session
    const viableCandidates = candidates.filter((p) => !failedProviders.includes(p));

    for (const providerCode of viableCandidates) {
      const cap = this.providerCapabilities.get(providerCode);
      if (!cap) continue;

      // Check Circuit Breaker & Health
      if (cap.circuitState !== 'OPEN' && cap.isOperational) {
        const isFailover = attemptNumber > 1 || providerCode !== candidates[0];
        return {
          selectedProvider: providerCode,
          routeReason: isFailover
            ? `Failover Route: ${providerCode} selected after attempt #${attemptNumber} (Health: ${cap.successRate24h}%, Latency: ${cap.avgLatencyMs}ms)`
            : `Primary Route: Optimal cost & latency match (${cap.avgLatencyMs}ms, ${cap.successRate24h}% SLA)`,
          isFailover,
          confidence: cap.circuitState === 'CLOSED' ? 0.99 : 0.75,
        };
      }
    }

    // If all configured viable candidates failed or are open circuit, return highest SLA provider
    const fallback = viableCandidates[0] || 'PROVIDUS_NG';
    return {
      selectedProvider: fallback,
      routeReason: `Emergency Fallback: All primary routes saturated or degraded. Routing to ${fallback}`,
      isFailover: true,
      confidence: 0.5,
    };
  }

  public updateProviderCircuitState(providerCode: string, state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') {
    const cap = this.providerCapabilities.get(providerCode);
    if (cap) {
      cap.circuitState = state;
      if (state === 'OPEN') {
        cap.isOperational = false;
      } else {
        cap.isOperational = true;
      }
      this.providerCapabilities.set(providerCode, cap);
    }
  }
}
