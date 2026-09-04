// Device Trust Registry, Hardware Attestation & Root/Jailbreak Detection Engine

import { AgencyDeviceRecord, DeviceTrustLevel } from '@/types/agencyEngine';

export class DeviceTrustEngine {
  private static instance: DeviceTrustEngine;

  private devices: Map<string, AgencyDeviceRecord> = new Map();

  private constructor() {
    this.seedDevices();
  }

  public static getInstance(): DeviceTrustEngine {
    if (!DeviceTrustEngine.instance) {
      DeviceTrustEngine.instance = new DeviceTrustEngine();
    }
    return DeviceTrustEngine.instance;
  }

  private seedDevices() {
    const defaultDevices: AgencyDeviceRecord[] = [
      {
        id: 'dev-01',
        deviceId: 'DEV-POS-NG-01',
        agentId: 'agt-ng-001',
        agentName: 'Garba Express Services & POS',
        deviceType: 'ANDROID_POS',
        manufacturer: 'PAX Technology',
        model: 'PAX A920 Smart POS',
        hardwareFingerprint: 'SHA256:7f9a2b8c91d4e6...',
        trustLevel: 'TRUSTED',
        isRooted: false,
        attestationScore: 98.5,
        lastSeenAt: new Date().toISOString(),
        createdAt: '2026-01-10T00:00:00Z',
      },
      {
        id: 'dev-02',
        deviceId: 'DEV-POS-NE-01',
        agentId: 'agt-ne-001',
        agentName: 'Sahel Kiosque Niamey',
        deviceType: 'ANDROID_POS',
        manufacturer: 'Nexgo',
        model: 'Nexgo N5 Wireless Terminal',
        hardwareFingerprint: 'SHA256:a1b2c3d4e5f6...',
        trustLevel: 'TRUSTED',
        isRooted: false,
        attestationScore: 96.0,
        lastSeenAt: new Date().toISOString(),
        createdAt: '2026-02-15T00:00:00Z',
      },
      {
        id: 'dev-03',
        deviceId: 'DEV-POS-NG-02',
        agentId: 'agt-ng-002',
        agentName: 'Alaba Central Float Desk',
        deviceType: 'MOBILE_POS',
        manufacturer: 'Ingenico',
        model: 'Link 2500 mPOS',
        hardwareFingerprint: 'SHA256:c9e8d7f6a5b4...',
        trustLevel: 'RESTRICTED',
        isRooted: false,
        attestationScore: 72.0,
        lastSeenAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        createdAt: '2026-03-01T00:00:00Z',
      },
    ];

    defaultDevices.forEach((d) => this.devices.set(d.deviceId, d));
  }

  public getDevices(): AgencyDeviceRecord[] {
    return Array.from(this.devices.values());
  }

  public getDevice(deviceId: string): AgencyDeviceRecord | undefined {
    return this.devices.get(deviceId);
  }

  public updateDeviceTrust(deviceId: string, trustLevel: DeviceTrustLevel): { success: boolean; device?: AgencyDeviceRecord } {
    const dev = this.devices.get(deviceId);
    if (!dev) return { success: false };

    dev.trustLevel = trustLevel;
    this.devices.set(deviceId, dev);
    return { success: true, device: dev };
  }
}
