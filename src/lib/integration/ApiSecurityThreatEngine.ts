// API Security Surveillance, Rate Limit Threats & IP Block Engine

import { ApiThreatEvent } from '@/types/integrationEngine';

export class ApiSecurityThreatEngine {
  private static instance: ApiSecurityThreatEngine;

  private threats: Map<string, ApiThreatEvent> = new Map();

  private constructor() {
    this.seedThreats();
  }

  public static getInstance(): ApiSecurityThreatEngine {
    if (!ApiSecurityThreatEngine.instance) {
      ApiSecurityThreatEngine.instance = new ApiSecurityThreatEngine();
    }
    return ApiSecurityThreatEngine.instance;
  }

  private seedThreats() {
    const defaultThreats: ApiThreatEvent[] = [
      {
        id: 'thr-01',
        threatType: 'BRUTE_FORCE',
        sourceIp: '197.210.44.12',
        clientId: 'kp_cli_unknown',
        severity: 'HIGH',
        actionTaken: 'BLOCKED_403',
        createdAt: '2026-09-04T06:45:00Z',
      },
      {
        id: 'thr-02',
        threatType: 'IDOR_PROBE',
        sourceIp: '102.89.22.8',
        clientId: 'kp_cli_sahel_test_1092',
        severity: 'HIGH',
        actionTaken: 'BLOCKED_403',
        createdAt: '2026-09-04T07:10:00Z',
      },
    ];

    defaultThreats.forEach((t) => this.threats.set(t.id, t));
  }

  public getThreats(): ApiThreatEvent[] {
    return Array.from(this.threats.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
