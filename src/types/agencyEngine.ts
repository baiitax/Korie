// Agency Banking, Device Trust, Terminal Fleet & Consumer Redress Type Definitions

export type AgentLifecycleStatus =
  | 'PROSPECT'
  | 'APPLICATION'
  | 'KYC_PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'UNDER_REVIEW'
  | 'TERMINATED';

export type DeviceTrustLevel =
  | 'UNKNOWN'
  | 'LOW'
  | 'STANDARD'
  | 'TRUSTED'
  | 'HIGH_TRUST'
  | 'RESTRICTED'
  | 'COMPROMISED';

export type TerminalStatus =
  | 'INVENTORY'
  | 'ASSIGNED'
  | 'ACTIVE'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'MAINTENANCE'
  | 'LOST'
  | 'STOLEN'
  | 'DECOMMISSIONED';

export interface AggregatorRecord {
  id: string;
  aggregatorCode: string;
  businessName: string;
  country: 'NG' | 'NE';
  legalEntity: string;
  kybStatus: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
  status: 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED' | 'TERMINATED';
  createdAt: string;
}

export interface AgencyDeviceRecord {
  id: string;
  deviceId: string;
  agentId: string;
  agentName?: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  hardwareFingerprint: string;
  trustLevel: DeviceTrustLevel;
  isRooted: boolean;
  attestationScore: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface AgencyTerminalRecord {
  id: string;
  terminalId: string;
  terminalSerial: string;
  terminalType: string;
  agentId?: string;
  agentName?: string;
  deviceId?: string;
  status: TerminalStatus;
  capabilities: string[];
  lastHeartbeatAt: string;
  createdAt: string;
}

export interface ChannelAuthorizationRequest {
  agentId: string;
  deviceId: string;
  terminalId: string;
  transactionType: string;
  amount: number;
  currency: 'NGN' | 'XOF';
  latitude?: number;
  longitude?: number;
}

export interface ChannelAuthorizationResult {
  decision: 'ALLOW' | 'STEP_UP' | 'REVIEW' | 'DECLINE';
  authorized: boolean;
  reasonCodes: string[];
  evaluatedAt: string;
}

export interface AgentCashCountRecord {
  id: string;
  agentId: string;
  currency: 'NGN' | 'XOF';
  denominationBreakdown: Record<string, number>;
  totalPhysicalCash: number;
  expectedCash: number;
  varianceAmount: number;
  status: 'MATCHED' | 'SHORT' | 'OVER' | 'UNDER_REVIEW';
  submittedBy: string;
  createdAt: string;
}

export interface AgencyConsumerComplaintRecord {
  id: string;
  complaintReference: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  country: 'NG' | 'NE';
  agentId?: string;
  agentName?: string;
  terminalId?: string;
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'OPENED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  disputedAmount: number;
  currency: 'NGN' | 'XOF';
  description: string;
  slaDueAt: string;
  glJournalId?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}
