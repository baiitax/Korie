// Physical Cash, Vault/Till, CIT & Liquidity Operations Domain Types

export type CashLocationType =
  | 'CENTRAL_VAULT'
  | 'REGIONAL_VAULT'
  | 'BRANCH_VAULT'
  | 'CASH_CENTER'
  | 'BRANCH_TILL'
  | 'AGENT_TILL'
  | 'AGENT_SAFE'
  | 'ATM_CASH_LOCATION'
  | 'CIT_VEHICLE'
  | 'CIT_HUB'
  | 'BANK_LOCATION'
  | 'TEMPORARY_SECURED_LOCATION';

export type LiquidityState = 'HEALTHY' | 'WATCH' | 'LOW' | 'CRITICAL' | 'RESTRICTED' | 'EMERGENCY';

export type TillStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'OPEN'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'HANDOVER_PENDING'
  | 'CLOSED'
  | 'RECONCILED';

export type CashMovementStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVED'
  | 'PREPARED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'COUNTED'
  | 'VERIFIED'
  | 'RECONCILED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'FAILED'
  | 'LOST'
  | 'DAMAGED'
  | 'DISPUTED'
  | 'EXCEPTION';

export type CitShipmentStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'PREPARED'
  | 'SEALED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'RECEIVED'
  | 'COUNTED'
  | 'VERIFIED'
  | 'RECONCILED'
  | 'DELAYED'
  | 'TAMPERED'
  | 'SHORT_DELIVERY'
  | 'OVER_DELIVERY'
  | 'ROUTE_DEVIATION'
  | 'INCIDENT';

export interface CashLocationRecord {
  id: string;
  locationCode: string;
  name: string;
  locationType: CashLocationType;
  country: 'NG' | 'NE';
  currency: 'NGN' | 'XOF';
  legalEntity: string;
  region: string;
  stateOrProvince: string;
  parentLocationId?: string;
  custodyOwner: string;
  operationalOwner: string;
  riskClassification: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface CashPositionRecord {
  id: string;
  locationId: string;
  locationName?: string;
  locationType?: CashLocationType;
  currency: 'NGN' | 'XOF';
  openingPhysicalCash: number;
  cashInflows: number;
  cashOutflows: number;
  expectedPhysicalCash: number;
  actualCountedCash: number;
  varianceAmount: number;
  reservedCash: number;
  availablePhysicalCash: number;
  targetSafetyBuffer: number;
  liquidityStatus: LiquidityState;
  lastCountedAt: string;
  updatedAt: string;
}

export interface CashCountRecord {
  id: string;
  locationId: string;
  locationName?: string;
  countType: string;
  currency: 'NGN' | 'XOF';
  expectedAmount: number;
  countedAmount: number;
  varianceAmount: number;
  denominationBreakdown: Record<string, number>;
  countedBy: string;
  verifiedBy?: string;
  countStatus: string;
  notes?: string;
  createdAt: string;
}

export interface TillRecord {
  id: string;
  tillCode: string;
  locationId: string;
  locationName?: string;
  assignedOperator: string;
  currency: 'NGN' | 'XOF';
  status: TillStatus;
  openingBalance: number;
  currentExpectedBalance: number;
  maxHoldingLimit: number;
  lastOpenedAt?: string;
  lastClosedAt?: string;
  createdAt: string;
}

export interface TillHandoverRecord {
  id: string;
  tillId: string;
  outgoingOperator: string;
  incomingOperator: string;
  systemExpectedAmount: number;
  actualCountedAmount: number;
  varianceAmount: number;
  handoverStatus: 'INITIATED' | 'COUNTED' | 'VERIFIED' | 'COMPLETED' | 'DISPUTED';
  notes?: string;
  createdAt: string;
}

export interface VaultRecord {
  id: string;
  vaultCode: string;
  name: string;
  locationId: string;
  country: 'NG' | 'NE';
  currency: 'NGN' | 'XOF';
  custodianA: string;
  custodianB: string;
  supervisor?: string;
  dualControlRequired: boolean;
  maxVaultCapacity: number;
  currentCashHolding: number;
  status: 'LOCKED' | 'OPEN' | 'MAINTENANCE' | 'EMERGENCY_LOCKDOWN';
  lastOpenedAt?: string;
  createdAt: string;
}

export interface CashMovementRecord {
  id: string;
  movementReference: string;
  sourceLocationId: string;
  sourceLocationName?: string;
  destinationLocationId: string;
  destinationLocationName?: string;
  movementType: string;
  amount: number;
  currency: 'NGN' | 'XOF';
  status: CashMovementStatus;
  initiatedBy: string;
  approvedBy?: string;
  receivedBy?: string;
  glJournalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CitShipmentRecord {
  id: string;
  shipmentCode: string;
  movementId: string;
  citProvider: string;
  vehicleRegNumber: string;
  leadCourierName: string;
  sealNumber: string;
  currency: 'NGN' | 'XOF';
  declaredAmount: number;
  countedReceivedAmount?: number;
  varianceAmount: number;
  status: CitShipmentStatus;
  pickupAt?: string;
  expectedArrivalAt: string;
  actualArrivalAt?: string;
  createdAt: string;
}

export interface CitCustodyEvent {
  id: string;
  shipmentId: string;
  eventType: string;
  actor: string;
  actorRole: string;
  locationCoordinates?: string;
  evidenceHash: string;
  previousEventHash?: string;
  timestamp: string;
}

export interface CashVarianceRecord {
  id: string;
  varianceReference: string;
  locationId: string;
  locationName?: string;
  currency: 'NGN' | 'XOF';
  expectedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  varianceType: 'NO_VARIANCE' | 'SHORTAGE' | 'OVERAGE' | 'DENOMINATION_MISMATCH' | 'UNIDENTIFIED_CASH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'VARIANCE_DETECTED' | 'INVESTIGATION_REQUIRED' | 'REVIEW' | 'APPROVED_ADJUSTMENT' | 'RESOLVED';
  investigatedBy?: string;
  glSuspenseJournalId?: string;
  rootCauseNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface CashIncidentRecord {
  id: string;
  incidentCode: string;
  incidentType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  locationId?: string;
  shipmentId?: string;
  disputedAmount: number;
  currency: 'NGN' | 'XOF';
  description: string;
  status: 'OPEN' | 'TRIAGED' | 'INVESTIGATING' | 'ACTION_REQUIRED' | 'RESOLVED' | 'CLOSED';
  reportedBy: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface CashDemandForecast {
  horizon: '1_HOUR' | '4_HOURS' | '24_HOURS' | '3_DAYS' | '7_DAYS' | '30_DAYS';
  currency: 'NGN' | 'XOF';
  expectedInflows: number;
  expectedOutflows: number;
  netLiquidityDemand: number;
  confidenceScore: number;
  recommendedReplenishment: number;
}
