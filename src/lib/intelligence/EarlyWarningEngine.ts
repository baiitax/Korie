// Real-Time Anomaly Detection & Early-Warning Alert Engine

import { EarlyWarningAlert } from '@/types/intelligenceEngine';

export class EarlyWarningEngine {
  private static instance: EarlyWarningEngine;

  private alerts: Map<string, EarlyWarningAlert> = new Map();

  private constructor() {
    this.seedAlerts();
  }

  public static getInstance(): EarlyWarningEngine {
    if (!EarlyWarningEngine.instance) {
      EarlyWarningEngine.instance = new EarlyWarningEngine();
    }
    return EarlyWarningEngine.instance;
  }

  private seedAlerts() {
    const defaultAlerts: EarlyWarningAlert[] = [
      {
        id: 'ew-01',
        alertCode: 'EW-OPS-PROV-01',
        domain: 'OPERATIONS',
        title: 'Providus NIP Clearing Outward Latency Spike (+320ms)',
        observedValue: 890,
        expectedValue: 570,
        deviationPct: 56.1,
        severity: 'MEDIUM',
        primaryDriver: 'Upstream interbank NIP network clearing congestion.',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ew-02',
        alertCode: 'EW-AGT-CSH-02',
        domain: 'AGENT',
        title: 'Maradi Corridor Till Depletion Velocity Acceleration',
        observedValue: 28.5,
        expectedValue: 14.0,
        deviationPct: 103.5,
        severity: 'HIGH',
        primaryDriver: 'Increased cross-border trader cash-out demand before weekly market day.',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
    ];

    defaultAlerts.forEach((a) => this.alerts.set(a.id, a));
  }

  public getAlerts(): EarlyWarningAlert[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public acknowledgeAlert(alertId: string): { success: boolean; alert?: EarlyWarningAlert } {
    const a = this.alerts.get(alertId);
    if (!a) return { success: false };

    a.status = 'ACKNOWLEDGED';
    this.alerts.set(alertId, a);
    return { success: true, alert: a };
  }
}
