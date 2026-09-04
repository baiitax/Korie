// Tier-1 Device Management, Attestation & Trust Scoring Engine

import { DeviceRecord, DeviceTrustStatus } from '@/types/agentDeviceTerminalEngine';

export class DeviceManagementEngine {
  private static instance: DeviceManagementEngine;

  private devices: Map<string, DeviceRecord> = new Map();

  private constructor() {
    this.seedDevices();
  }

  public static getInstance(): DeviceManagementEngine {
    if (!DeviceManagementEngine.instance) {
      DeviceManagementEngine.instance = new DeviceManagementEngine();
    }
    return DeviceManagementEngine.instance;
  }

  private seedDevices() {
    const defaultDevices: DeviceRecord[] = [
      {
        id: 'dev-ng-01',
        deviceId: 'DEV-POS-NG-01',
        deviceType: 'SMART_POS',
        modelName: 'PAX A920 Pro',
        osVersion: 'Android 10 (PayDroid)',
        appVersion: 'v2.4.1-prod',
        keyVersion: 1,
        attestationStatus: 'VERIFIED',
        trustStatus: 'TRUSTED',
        trustScore: 99.1,
        assignedAgentId: 'agt-ng-001',
        isCompromised: false,
        lastIpAddress: '102.89.23.11',
        lastLocationLat: 9.0765,
        lastLocationLng: 7.3986,
        lastActiveAt: '2026-09-03T14:30:00Z',
        registeredAt: '2026-08-01T09:00:00Z',
        updatedAt: '2026-09-03T14:30:00Z',
      },
      {
        id: 'dev-ne-01',
        deviceId: 'DEV-POS-NE-01',
        deviceType: 'SMART_POS',
        modelName: 'Newland N910',
        osVersion: 'Android 9.0 POS',
        appVersion: 'v2.4.1-prod',
        keyVersion: 1,
        attestationStatus: 'VERIFIED',
        trustStatus: 'TRUSTED',
        trustScore: 97.5,
        assignedAgentId: 'agt-ne-001',
        isCompromised: false,
        lastIpAddress: '41.138.89.4',
        lastLocationLat: 13.5127,
        lastLocationLng: 2.1126,
        lastActiveAt: '2026-09-03T13:45:00Z',
        registeredAt: '2026-08-05T10:00:00Z',
        updatedAt: '2026-09-03T13:45:00Z',
      },
      {
        id: 'dev-ng-02',
        deviceId: 'DEV-POS-NG-02',
        deviceType: 'SMART_POS',
        modelName: 'Sunmi V2 Pro',
        osVersion: 'Android 7.1 (Outdated)',
        appVersion: 'v2.1.0-legacy',
        keyVersion: 1,
        attestationStatus: 'UNAVAILABLE',
        trustStatus: 'ELEVATED_RISK',
        trustScore: 68.0,
        assignedAgentId: 'agt-ng-002',
        isCompromised: false,
        lastIpAddress: '197.210.8.92',
        lastLocationLat: 6.4550,
        lastLocationLng: 3.3841,
        lastActiveAt: '2026-09-02T18:20:00Z',
        registeredAt: '2026-08-10T12:00:00Z',
        updatedAt: '2026-09-03T09:15:00Z',
      },
    ];

    defaultDevices.forEach((d) => this.devices.set(d.deviceId, d));
  }

  public getDevices(): DeviceRecord[] {
    return Array.from(this.devices.values());
  }

  public getDevice(deviceId: string): DeviceRecord | undefined {
    return this.devices.get(deviceId);
  }

  public registerDevice(data: Omit<DeviceRecord, 'id' | 'trustScore' | 'registeredAt' | 'updatedAt'>): DeviceRecord {
    const id = `dev-${Date.now().toString().slice(-6)}`;
    const newDevice: DeviceRecord = {
      ...data,
      id,
      trustScore: 95.0,
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.devices.set(data.deviceId, newDevice);
    return newDevice;
  }

  public updateTrustStatus(deviceId: string, status: DeviceTrustStatus, reason: string): { success: boolean; device?: DeviceRecord; error?: string } {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: 'DEVICE_NOT_FOUND' };
    }

    device.trustStatus = status;
    if (status === 'BLOCKED' || status === 'COMPROMISED') {
      device.trustScore = Math.min(device.trustScore, 20);
      device.isCompromised = status === 'COMPROMISED';
    } else if (status === 'TRUSTED') {
      device.trustScore = Math.max(device.trustScore, 90);
      device.isCompromised = false;
    }
    device.updatedAt = new Date().toISOString();

    this.devices.set(deviceId, device);
    return { success: true, device };
  }
}
