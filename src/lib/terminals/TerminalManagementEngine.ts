// Tier-1 Terminal Management, Geofence Enforcement & Heartbeat Engine

import {
  TerminalRecord,
  TerminalStatus,
  LocationState,
  TerminalAssignmentHistory,
} from '@/types/agentDeviceTerminalEngine';

export class TerminalManagementEngine {
  private static instance: TerminalManagementEngine;

  private terminals: Map<string, TerminalRecord> = new Map();
  private assignmentHistories: TerminalAssignmentHistory[] = [];

  private constructor() {
    this.seedTerminals();
  }

  public static getInstance(): TerminalManagementEngine {
    if (!TerminalManagementEngine.instance) {
      TerminalManagementEngine.instance = new TerminalManagementEngine();
    }
    return TerminalManagementEngine.instance;
  }

  private seedTerminals() {
    const defaultTerminals: TerminalRecord[] = [
      {
        id: 'term-ng-01',
        terminalId: 'TID-NG-009182',
        serialNumber: 'PAX920-NG-2026-0091',
        manufacturer: 'PAX Technology',
        model: 'A920 Pro EMV/NFC',
        terminalType: 'ANDROID_POS',
        country: 'NG',
        status: 'ACTIVE',
        assignedAgentId: 'agt-ng-001',
        activeDeviceId: 'DEV-POS-NG-01',
        registeredLat: 9.0765,
        registeredLng: 7.3986,
        geofenceRadiusMeters: 500,
        currentLocationState: 'IN_ZONE',
        lastKnownLat: 9.0768,
        lastKnownLng: 7.3984,
        lastHeartbeatAt: '2026-09-03T14:30:00Z',
        batteryLevel: 94,
        networkType: '4G LTE',
        firmwareVersion: 'PayDroid_10.2.1',
        appVersion: 'v2.4.1-prod',
        keyVersion: 1,
        createdAt: '2026-08-01T09:00:00Z',
        updatedAt: '2026-09-03T14:30:00Z',
      },
      {
        id: 'term-ne-01',
        terminalId: 'TID-NE-002190',
        serialNumber: 'NW910-NE-2026-0044',
        manufacturer: 'Newland Payment Tech',
        model: 'N910 Touch POS',
        terminalType: 'ANDROID_POS',
        country: 'NE',
        status: 'ACTIVE',
        assignedAgentId: 'agt-ne-001',
        activeDeviceId: 'DEV-POS-NE-01',
        registeredLat: 13.5127,
        registeredLng: 2.1126,
        geofenceRadiusMeters: 750,
        currentLocationState: 'IN_ZONE',
        lastKnownLat: 13.5129,
        lastKnownLng: 2.1128,
        lastHeartbeatAt: '2026-09-03T13:45:00Z',
        batteryLevel: 88,
        networkType: '3G/4G Dual',
        firmwareVersion: 'N910_BCEAO_3.1',
        appVersion: 'v2.4.1-prod',
        keyVersion: 1,
        createdAt: '2026-08-05T10:00:00Z',
        updatedAt: '2026-09-03T13:45:00Z',
      },
      {
        id: 'term-ng-02',
        terminalId: 'TID-NG-009341',
        serialNumber: 'SUNMI-V2P-NG-0104',
        manufacturer: 'Sunmi',
        model: 'V2 Pro Dual SIM',
        terminalType: 'ANDROID_POS',
        country: 'NG',
        status: 'DEGRADED',
        assignedAgentId: 'agt-ng-002',
        activeDeviceId: 'DEV-POS-NG-02',
        registeredLat: 6.4550,
        registeredLng: 3.3841,
        geofenceRadiusMeters: 500,
        currentLocationState: 'OUT_OF_ZONE',
        lastKnownLat: 6.5244,
        lastKnownLng: 3.5901, // 18km away from registered Alaba zone
        lastHeartbeatAt: '2026-09-02T18:20:00Z',
        batteryLevel: 22,
        networkType: '2G/Edge',
        firmwareVersion: 'Sunmi_OS_7.1',
        appVersion: 'v2.1.0-legacy',
        keyVersion: 1,
        createdAt: '2026-08-10T12:00:00Z',
        updatedAt: '2026-09-03T09:15:00Z',
      },
    ];

    defaultTerminals.forEach((t) => this.terminals.set(t.terminalId, t));
  }

  public getTerminals(): TerminalRecord[] {
    return Array.from(this.terminals.values());
  }

  public getTerminal(terminalId: string): TerminalRecord | undefined {
    return this.terminals.get(terminalId);
  }

  public recordHeartbeat(params: {
    terminalId: string;
    lat?: number;
    lng?: number;
    batteryLevel?: number;
    networkType?: string;
    appVersion?: string;
  }): { success: boolean; terminal?: TerminalRecord; error?: string } {
    const terminal = this.terminals.get(params.terminalId);
    if (!terminal) {
      return { success: false, error: 'TERMINAL_NOT_FOUND' };
    }

    terminal.lastHeartbeatAt = new Date().toISOString();
    if (params.batteryLevel !== undefined) terminal.batteryLevel = params.batteryLevel;
    if (params.networkType) terminal.networkType = params.networkType;
    if (params.appVersion) terminal.appVersion = params.appVersion;

    if (params.lat !== undefined && params.lng !== undefined) {
      terminal.lastKnownLat = params.lat;
      terminal.lastKnownLng = params.lng;

      // Geofence Distance Calculation (Haversine Formula)
      if (terminal.registeredLat && terminal.registeredLng) {
        const distanceMeters = this.calculateDistanceMeters(
          terminal.registeredLat,
          terminal.registeredLng,
          params.lat,
          params.lng
        );

        if (distanceMeters <= terminal.geofenceRadiusMeters) {
          terminal.currentLocationState = 'IN_ZONE';
        } else if (distanceMeters > 50000) {
          terminal.currentLocationState = 'LOCATION_SUSPICIOUS';
        } else {
          terminal.currentLocationState = 'OUT_OF_ZONE';
        }
      }
    }

    terminal.updatedAt = new Date().toISOString();
    this.terminals.set(params.terminalId, terminal);
    return { success: true, terminal };
  }

  public updateTerminalStatus(terminalId: string, status: TerminalStatus, reason: string): { success: boolean; terminal?: TerminalRecord; error?: string } {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return { success: false, error: 'TERMINAL_NOT_FOUND' };
    }

    terminal.status = status;
    terminal.updatedAt = new Date().toISOString();
    this.terminals.set(terminalId, terminal);

    return { success: true, terminal };
  }

  public assignTerminal(terminalId: string, agentId: string, assignedBy: string, reason: string): { success: boolean; error?: string } {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return { success: false, error: 'TERMINAL_NOT_FOUND' };
    }

    // Unassign previous if applicable
    const existingHist = this.assignmentHistories.find((h) => h.terminalId === terminalId && !h.unassignedAt);
    if (existingHist) {
      existingHist.unassignedAt = new Date().toISOString();
    }

    terminal.assignedAgentId = agentId;
    terminal.status = 'ACTIVE';
    terminal.updatedAt = new Date().toISOString();
    this.terminals.set(terminalId, terminal);

    this.assignmentHistories.push({
      id: `asgn-${Date.now()}`,
      terminalId,
      agentId,
      assignedBy,
      assignedAt: new Date().toISOString(),
      reason,
    });

    return { success: true };
  }

  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
