// Type definitions for Agent Fleet, Device Trust, Terminal Management & Geofencing

export type AgentStatus =
  | 'PROSPECT'
  | 'APPLICATION'
  | 'KYC_PENDING'
  | 'KYC_VERIFICATION'
  | 'APPROVED'
  | 'TRAINING_REQUIRED'
  | 'TRAINED'
  | 'ACTIVATION_PENDING'
  | 'ACTIVE'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'UNDER_REVIEW'
  | 'DEACTIVATED'
  | 'TERMINATED';

export type AgentTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'SUPER_AGENT';
export type AgentRiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AgentRecord {
  id: string;
  agentCode: string;
  tenantId: string;
  identityRecordId?: string;
  legalName: string;
  tradingName: string;
  country: 'NG' | 'NE';
  currency: 'NGN' | 'XOF';
  phone: string;
  email?: string;
  region: string;
  stateOrProvince: string;
  lgaOrDistrict: string;
  branchId?: string;
  aggregatorId?: string;
  status: AgentStatus;
  tier: AgentTier;
  qualityScore: number;
  riskTier: AgentRiskTier;
  dailyTransactionLimit: number;
  singleTransactionLimit: number;
  maxCashHolding: number;
  floatBalance: number;
  commissionEarned24h: number;
  successRate24h: number;
  activeTerminalId?: string;
  assignedDeviceId?: string;
  activatedAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeviceType =
  | 'ANDROID'
  | 'IOS'
  | 'POS_HARDWARE'
  | 'SMART_POS'
  | 'TABLET'
  | 'FIELD_TERMINAL'
  | 'WEB_BROWSER';

export type DeviceTrustStatus =
  | 'TRUSTED'
  | 'NORMAL'
  | 'ELEVATED_RISK'
  | 'HIGH_RISK'
  | 'COMPROMISED'
  | 'BLOCKED';

export interface DeviceRecord {
  id: string;
  deviceId: string;
  deviceType: DeviceType;
  modelName: string;
  osVersion: string;
  appVersion: string;
  publicKeyPem?: string;
  keyVersion: number;
  attestationStatus: 'VERIFIED' | 'FAILED' | 'UNAVAILABLE' | 'EXPIRED';
  trustStatus: DeviceTrustStatus;
  trustScore: number;
  assignedAgentId?: string;
  isCompromised: boolean;
  lastIpAddress?: string;
  lastLocationLat?: number;
  lastLocationLng?: number;
  lastActiveAt?: string;
  registeredAt: string;
  updatedAt: string;
}

export type TerminalType = 'POS' | 'SOFTPOS' | 'ANDROID_POS' | 'SMART_TERMINAL' | 'KIOSK';

export type TerminalStatus =
  | 'PROCURED'
  | 'INVENTORIED'
  | 'CONFIGURED'
  | 'ASSIGNED'
  | 'ACTIVATION_PENDING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'SUSPENDED'
  | 'QUARANTINED'
  | 'RETURNED'
  | 'REPAIRED'
  | 'REASSIGNED'
  | 'RETIRED';

export type LocationState =
  | 'IN_ZONE'
  | 'OUT_OF_ZONE'
  | 'LOCATION_UNKNOWN'
  | 'LOCATION_SUSPICIOUS'
  | 'LOCATION_BLOCKED';

export interface TerminalRecord {
  id: string;
  terminalId: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  terminalType: TerminalType;
  country: 'NG' | 'NE';
  status: TerminalStatus;
  assignedAgentId?: string;
  assignedMerchantId?: string;
  activeDeviceId?: string;
  registeredLat?: number;
  registeredLng?: number;
  geofenceRadiusMeters: number;
  currentLocationState: LocationState;
  lastKnownLat?: number;
  lastKnownLng?: number;
  lastHeartbeatAt?: string;
  batteryLevel?: number;
  networkType?: string;
  firmwareVersion: string;
  appVersion: string;
  keyVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface TerminalAssignmentHistory {
  id: string;
  terminalId: string;
  agentId?: string;
  merchantId?: string;
  assignedBy: string;
  assignedAt: string;
  unassignedAt?: string;
  reason: string;
}
