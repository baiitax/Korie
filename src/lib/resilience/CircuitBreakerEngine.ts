import { CircuitBreakerRecord, CircuitBreakerState, ServiceCriticalityTier } from '@/types/resilienceEngine';

export class CircuitBreakerEngine {
  private static breakers: Map<string, CircuitBreakerRecord> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedBreakers();
    }
  }

  private static seedBreakers() {
    if (this.breakers.size > 0) return;

    const initialNodes: {
      key: string;
      name: string;
      tier: ServiceCriticalityTier;
      threshold: number;
      coolOff: number;
    }[] = [
      { key: 'PROVIDUS_BANK_NG', name: 'Providus Bank Nigeria Settlement Switch', tier: 'TIER_1', threshold: 5, coolOff: 60 },
      { key: 'KORIS_BANK_NE', name: 'Coris Bank Niger Republic Sahel Switch', tier: 'TIER_1', threshold: 5, coolOff: 60 },
      { key: 'NIBSS_NIP_GATEWAY', name: 'NIBSS Direct NIP Clearing Switch', tier: 'TIER_1', threshold: 3, coolOff: 45 },
      { key: 'NIMC_NIN_IDENTITY', name: 'NIMC National Identity Verification Gateway', tier: 'TIER_2', threshold: 4, coolOff: 90 },
      { key: 'CARD_AGGREGATOR_NODE', name: 'Interswitch / Card Scheme Acquirer Node', tier: 'TIER_1', threshold: 5, coolOff: 60 },
    ];

    for (const node of initialNodes) {
      this.breakers.set(node.key, {
        id: `cb_${node.key.toLowerCase()}`,
        serviceKey: node.key,
        serviceName: node.name,
        tier: node.tier,
        state: 'CLOSED',
        failureCount: 0,
        failureThreshold: node.threshold,
        coolOffSeconds: node.coolOff,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  public static canExecute(serviceKey: string): boolean {
    this.ensureInitialized();
    const breaker = this.breakers.get(serviceKey);
    if (!breaker) return true;

    if (breaker.state === 'CLOSED') return true;

    if (breaker.state === 'OPEN') {
      const now = Date.now();
      const lastFail = breaker.lastFailureAt ? new Date(breaker.lastFailureAt).getTime() : 0;
      const elapsedSeconds = (now - lastFail) / 1000;

      if (elapsedSeconds >= breaker.coolOffSeconds) {
        // Transition to HALF_OPEN for trial execution
        breaker.state = 'HALF_OPEN';
        breaker.updatedAt = new Date().toISOString();
        return true;
      }
      return false;
    }

    // If HALF_OPEN, allow single trial
    return true;
  }

  public static recordSuccess(serviceKey: string): void {
    this.ensureInitialized();
    const breaker = this.breakers.get(serviceKey);
    if (!breaker) return;

    breaker.failureCount = 0;
    breaker.state = 'CLOSED';
    breaker.lastSuccessAt = new Date().toISOString();
    breaker.updatedAt = new Date().toISOString();
  }

  public static recordFailure(serviceKey: string, reason: string): void {
    this.ensureInitialized();
    const breaker = this.breakers.get(serviceKey);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureAt = new Date().toISOString();
    breaker.tripReason = reason;

    if (breaker.failureCount >= breaker.failureThreshold || breaker.state === 'HALF_OPEN') {
      breaker.state = 'OPEN';
    }
    breaker.updatedAt = new Date().toISOString();
  }

  public static tripManually(serviceKey: string, reason: string): CircuitBreakerRecord {
    this.ensureInitialized();
    const breaker = this.breakers.get(serviceKey);
    if (!breaker) {
      throw new Error(`Circuit breaker for ${serviceKey} not found.`);
    }

    breaker.state = 'OPEN';
    breaker.tripReason = reason;
    breaker.lastFailureAt = new Date().toISOString();
    breaker.updatedAt = new Date().toISOString();
    return breaker;
  }

  public static resetBreaker(serviceKey: string): CircuitBreakerRecord {
    this.ensureInitialized();
    const breaker = this.breakers.get(serviceKey);
    if (!breaker) {
      throw new Error(`Circuit breaker for ${serviceKey} not found.`);
    }

    breaker.state = 'CLOSED';
    breaker.failureCount = 0;
    breaker.lastSuccessAt = new Date().toISOString();
    breaker.updatedAt = new Date().toISOString();
    return breaker;
  }

  public static getAllBreakers(): CircuitBreakerRecord[] {
    this.ensureInitialized();
    return Array.from(this.breakers.values());
  }
}
