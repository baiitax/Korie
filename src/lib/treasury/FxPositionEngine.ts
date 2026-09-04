import { FxPositionSummary } from '@/types/treasuryEngine';

export class FxPositionEngine {
  private static positions: Map<string, FxPositionSummary> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedPositions();
    }
  }

  private static seedPositions() {
    if (this.positions.size > 0) return;

    this.positions.set('NGN/XOF', {
      currencyPair: 'NGN/XOF',
      baseCurrency: 'NGN',
      quoteCurrency: 'XOF',
      netExposureBaseMinor: 850_000_000_00, // ₦850,000,000 net corridor float
      averageAcquisitionRate: 0.3850, // 1 NGN = 0.385 XOF
      currentReferenceRate: 0.3920,   // Current market rate
      unrealizedPnlMinor: 5_950_000_00, // Unrealized FX gain: ₦5,950,000
      realizedPnlMinor: 14_200_000_00, // Realized FX gain MTD: ₦14,200,000
      maxExposureLimitMinor: 2_000_000_000_00, // ₦2B Max exposure limit
      utilizationPct: 42.5,
      status: 'SAFE',
    });

    this.positions.set('USD/NGN', {
      currencyPair: 'USD/NGN',
      baseCurrency: 'USD',
      quoteCurrency: 'NGN',
      netExposureBaseMinor: 150_000_00, // $150,000
      averageAcquisitionRate: 1580.50,
      currentReferenceRate: 1610.00,
      unrealizedPnlMinor: 4_425_000_00,
      realizedPnlMinor: 8_900_000_00,
      maxExposureLimitMinor: 1_000_000_00,
      utilizationPct: 15.0,
      status: 'SAFE',
    });
  }

  public static getPosition(pair: 'NGN/XOF' | 'USD/NGN' | 'EUR/XOF'): FxPositionSummary | undefined {
    this.ensureInitialized();
    return this.positions.get(pair);
  }

  public static getAllPositions(): FxPositionSummary[] {
    this.ensureInitialized();
    return Array.from(this.positions.values());
  }
}
