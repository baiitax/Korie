// Enterprise Workforce IAM, Session Management & Zero-Trust ABAC Engine

import {
  WorkforceIdentityRecord,
  IamSessionRecord,
  IamDeviceRecord,
  AuthenticationAssuranceLevel,
} from '@/types/iamEngine';

export class WorkforceIamEngine {
  private static instance: WorkforceIamEngine;

  private identities: Map<string, WorkforceIdentityRecord> = new Map();
  private sessions: Map<string, IamSessionRecord> = new Map();
  private devices: Map<string, IamDeviceRecord> = new Map();

  private constructor() {
    this.seedWorkforce();
  }

  public static getInstance(): WorkforceIamEngine {
    if (!WorkforceIamEngine.instance) {
      WorkforceIamEngine.instance = new WorkforceIamEngine();
    }
    return WorkforceIamEngine.instance;
  }

  private seedWorkforce() {
    const defaultIdentities: WorkforceIdentityRecord[] = [
      {
        id: 'ident-01',
        employeeId: 'EMP-SEC-001',
        email: 'super.admin@koriepay.com',
        fullName: 'Zainab Abubakar',
        department: 'Security & Infrastructure',
        country: 'NG',
        lifecycleStatus: 'ACTIVE',
        mfaEnforced: true,
        mfaMethod: 'FIDO2_HARDWARE_KEY',
        currentAal: 'AAL3',
        roles: ['SUPER_ADMIN', 'SECURITY_ADMIN'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'ident-02',
        employeeId: 'EMP-FIN-004',
        email: 'treasury.lead@koriepay.com',
        fullName: 'Mamadou Oumarou',
        department: 'Treasury & Liquidity',
        country: 'NE',
        lifecycleStatus: 'ACTIVE',
        mfaEnforced: true,
        mfaMethod: 'TOTP_AND_WEBAUTHN',
        currentAal: 'AAL3',
        roles: ['TREASURY_MANAGER', 'FINANCE_MANAGER'],
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-09-02T00:00:00Z',
      },
      {
        id: 'ident-03',
        employeeId: 'EMP-AML-007',
        email: 'mlro@koriepay.com',
        fullName: 'Chidinma Okafor',
        department: 'Compliance & Financial Crime',
        country: 'NG',
        lifecycleStatus: 'ACTIVE',
        mfaEnforced: true,
        mfaMethod: 'TOTP_AND_WEBAUTHN',
        currentAal: 'AAL3',
        roles: ['MLRO', 'COMPLIANCE_OFFICER'],
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-09-03T00:00:00Z',
      },
    ];

    defaultIdentities.forEach((i) => this.identities.set(i.email, i));

    // Seed Active Sessions
    const defaultSessions: IamSessionRecord[] = [
      {
        id: 'sess-01',
        identityId: 'ident-01',
        employeeEmail: 'super.admin@koriepay.com',
        aalLevel: 'AAL3',
        deviceId: 'dev-mac-01',
        devicePlatform: 'macOS Sonoma / Chrome 128 (YubiKey 5C)',
        ipAddress: '105.112.84.12',
        countryCode: 'NG',
        isActive: true,
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: 'sess-02',
        identityId: 'ident-02',
        employeeEmail: 'treasury.lead@koriepay.com',
        aalLevel: 'AAL3',
        deviceId: 'dev-win-02',
        devicePlatform: 'Windows 11 / Edge (Biometric Hello)',
        ipAddress: '41.138.64.19',
        countryCode: 'NE',
        isActive: true,
        lastActivityAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ];

    defaultSessions.forEach((s) => this.sessions.set(s.id, s));

    // Seed Devices
    const defaultDevices: IamDeviceRecord[] = [
      {
        id: 'dev-01',
        deviceId: 'dev-mac-01',
        identityId: 'ident-01',
        employeeEmail: 'super.admin@koriepay.com',
        platform: 'macOS (Corporate Enrolled)',
        hardwareFingerprint: 'SHA256:7f9a2b8c91d4e6...',
        trustStatus: 'TRUSTED',
        postureScore: 98.5,
        lastSeenAt: new Date().toISOString(),
        createdAt: '2026-01-05T00:00:00Z',
      },
      {
        id: 'dev-02',
        deviceId: 'dev-win-02',
        identityId: 'ident-02',
        employeeEmail: 'treasury.lead@koriepay.com',
        platform: 'Windows 11 (Secure Enclave)',
        hardwareFingerprint: 'SHA256:a1b2c3d4e5f6...',
        trustStatus: 'TRUSTED',
        postureScore: 95.0,
        lastSeenAt: new Date().toISOString(),
        createdAt: '2026-01-20T00:00:00Z',
      },
    ];

    defaultDevices.forEach((d) => this.devices.set(d.deviceId, d));
  }

  public getIdentities(): WorkforceIdentityRecord[] {
    return Array.from(this.identities.values());
  }

  public getIdentity(email: string): WorkforceIdentityRecord | undefined {
    return this.identities.get(email);
  }

  public getSessions(emailFilter?: string): IamSessionRecord[] {
    let list = Array.from(this.sessions.values()).filter((s) => s.isActive);
    if (emailFilter) {
      list = list.filter((s) => s.employeeEmail === emailFilter);
    }
    return list;
  }

  public revokeSession(sessionId: string, reason: string = 'ADMINISTRATIVE_REVOCATION'): boolean {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.isActive = false;
    s.revokedAt = new Date().toISOString();
    s.revocationReason = reason;
    this.sessions.set(sessionId, s);
    return true;
  }

  public revokeAllSessionsForIdentity(email: string, reason: string = 'IDENTITY_EMERGENCY_LOCKOUT'): number {
    let count = 0;
    this.sessions.forEach((s, key) => {
      if (s.employeeEmail === email && s.isActive) {
        s.isActive = false;
        s.revokedAt = new Date().toISOString();
        s.revocationReason = reason;
        this.sessions.set(key, s);
        count++;
      }
    });

    const ident = this.identities.get(email);
    if (ident) {
      ident.lifecycleStatus = 'LOCKED';
      ident.updatedAt = new Date().toISOString();
      this.identities.set(email, ident);
    }

    return count;
  }

  public evaluateAbac(params: {
    actorEmail: string;
    resourceType: string;
    resourceId: string;
    action: string;
    requestedAmount?: number;
    jurisdiction?: 'NG' | 'NE';
  }): { allowed: boolean; aalRequired: AuthenticationAssuranceLevel; reason: string } {
    const identity = this.identities.get(params.actorEmail);
    if (!identity) {
      return { allowed: false, aalRequired: 'AAL3', reason: 'IDENTITY_NOT_FOUND' };
    }

    if (identity.lifecycleStatus !== 'ACTIVE') {
      return { allowed: false, aalRequired: 'AAL3', reason: `IDENTITY_${identity.lifecycleStatus}` };
    }

    // High-Risk Financial & Production Resource Actions require AAL3
    const isPrivilegedAction =
      params.action.includes('SETTLEMENT') ||
      params.action.includes('TREASURY') ||
      params.action.includes('AML_DECISION') ||
      params.action.includes('FREEZE') ||
      (params.requestedAmount && params.requestedAmount > 5000000);

    if (isPrivilegedAction && identity.currentAal !== 'AAL3') {
      return {
        allowed: false,
        aalRequired: 'AAL3',
        reason: 'INSUFFICIENT_ASSURANCE_LEVEL: Hardware-bound AAL3 token challenge required.',
      };
    }

    return {
      allowed: true,
      aalRequired: identity.currentAal,
      reason: 'ZERO_TRUST_POLICY_VERIFIED',
    };
  }
}
