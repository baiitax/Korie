// Enterprise IAM, Privileged Access Management & SOC Type Definitions

export type SecuritySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AuthenticationAssuranceLevel = 'AAL1' | 'AAL2' | 'AAL3';

export type WorkforceLifecycleStatus =
  | 'INVITED'
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'LOCKED'
  | 'RESTRICTED'
  | 'OFFBOARDED'
  | 'DELETED_REFERENCE_ONLY';

export interface WorkforceIdentityRecord {
  id: string;
  employeeId: string;
  email: string;
  fullName: string;
  department: string;
  country: 'NG' | 'NE' | 'GLOBAL';
  lifecycleStatus: WorkforceLifecycleStatus;
  mfaEnforced: boolean;
  mfaMethod: string;
  currentAal: AuthenticationAssuranceLevel;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IamSessionRecord {
  id: string;
  identityId: string;
  employeeEmail: string;
  aalLevel: AuthenticationAssuranceLevel;
  deviceId: string;
  devicePlatform: string;
  ipAddress: string;
  countryCode: 'NG' | 'NE';
  isActive: boolean;
  revokedAt?: string;
  revocationReason?: string;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface IamDeviceRecord {
  id: string;
  deviceId: string;
  identityId: string;
  employeeEmail: string;
  platform: string;
  hardwareFingerprint: string;
  trustStatus: 'UNKNOWN' | 'PENDING' | 'TRUSTED' | 'RESTRICTED' | 'BLOCKED' | 'RETIRED';
  postureScore: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface PrivilegedAccessRequest {
  id: string;
  requestReference: string;
  requesterEmail: string;
  targetRoleCode: string;
  justification: string;
  changeTicketRef: string;
  durationMinutes: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';
  checkerEmail?: string;
  decidedAt?: string;
  leaseStartsAt?: string;
  leaseExpiresAt?: string;
  createdAt: string;
}

export interface BreakGlassEvent {
  id: string;
  incidentRef: string;
  actorEmail: string;
  justification: string;
  durationMinutes: number;
  aalUsed: AuthenticationAssuranceLevel;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface SecurityEventRecord {
  id: string;
  eventType: string;
  severity: SecuritySeverity;
  actorId: string;
  actorType: 'WORKFORCE' | 'SERVICE_ACCOUNT' | 'CUSTOMER' | 'SYSTEM';
  sessionId?: string;
  deviceId?: string;
  ipAddress: string;
  countryCode: 'NG' | 'NE';
  resourceType: string;
  resourceId: string;
  action: string;
  result: 'SUCCESS' | 'DENIED' | 'CHALLENGED' | 'ABORTED';
  reason?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SecurityAlertRecord {
  id: string;
  alertCode: string;
  title: string;
  severity: SecuritySeverity;
  status: 'NEW' | 'TRIAGED' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'FALSE_POSITIVE';
  targetIdentity: string;
  summary: string;
  evidencePayload: Record<string, any>;
  assignedAnalyst?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SecurityIncidentRecord {
  id: string;
  incidentReference: string;
  title: string;
  severity: SecuritySeverity;
  status:
    | 'DETECTED'
    | 'TRIAGED'
    | 'INVESTIGATING'
    | 'CONTAINMENT'
    | 'ERADICATION'
    | 'RECOVERY'
    | 'POST_INCIDENT_REVIEW'
    | 'CLOSED';
  incidentCommander: string;
  affectedServices: string[];
  affectedCountries: string[];
  containmentState: string;
  createdAt: string;
  closedAt?: string;
  notes?: { id: string; authorEmail: string; content: string; createdAt: string }[];
}

export interface SecurityPostureDimension {
  name: string;
  score: number; // 0 - 100
  weight: number;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
  details: string;
}

export interface SecurityPostureReport {
  compositeScore: number;
  tier: 'TIER_1_FORTIFIED' | 'COMPLIANT' | 'ELEVATED_RISK' | 'CRITICAL_DEFICIT';
  evaluatedAt: string;
  dimensions: SecurityPostureDimension[];
}
