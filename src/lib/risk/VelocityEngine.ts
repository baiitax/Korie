export interface VelocityWindowMetrics {
  count1m: number;
  count10m: number;
  count1h: number;
  count24h: number;
  volume1hMinor: number;
  volume24hMinor: number;
}

interface VelocityRecord {
  timestamp: number;
  amountMinor: number;
}

export class VelocityEngine {
  private static eventLog: Map<string, VelocityRecord[]> = new Map();

  private static getKey(scope: string, id: string): string {
    return `${scope.toUpperCase()}::${id}`;
  }

  public static recordTransaction(scope: string, id: string, amountMinor: number): void {
    const key = this.getKey(scope, id);
    const now = Date.now();
    const existing = this.eventLog.get(key) || [];
    
    // Append and retain up to 7 days
    existing.push({ timestamp: now, amountMinor });
    const cutoff7d = now - 7 * 24 * 3600 * 1000;
    const pruned = existing.filter(e => e.timestamp >= cutoff7d);
    this.eventLog.set(key, pruned);
  }

  public static getMetrics(scope: string, id: string): VelocityWindowMetrics {
    const key = this.getKey(scope, id);
    const records = this.eventLog.get(key) || [];
    const now = Date.now();

    const t1m = now - 60 * 1000;
    const t10m = now - 10 * 60 * 1000;
    const t1h = now - 3600 * 1000;
    const t24h = now - 24 * 3600 * 1000;

    let count1m = 0;
    let count10m = 0;
    let count1h = 0;
    let count24h = 0;
    let volume1hMinor = 0;
    let volume24hMinor = 0;

    for (const r of records) {
      if (r.timestamp >= t24h) {
        count24h++;
        volume24hMinor += r.amountMinor;
        if (r.timestamp >= t1h) {
          count1h++;
          volume1hMinor += r.amountMinor;
          if (r.timestamp >= t10m) {
            count10m++;
            if (r.timestamp >= t1m) {
              count1m++;
            }
          }
        }
      }
    }

    return {
      count1m,
      count10m,
      count1h,
      count24h,
      volume1hMinor,
      volume24hMinor,
    };
  }

  public static clear(): void {
    this.eventLog.clear();
  }
}
