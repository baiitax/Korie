import { 
  FraudCaseRecord, 
  RiskHoldRecord, 
  RiskHoldType, 
  RiskRuleHit, 
  RiskBand 
} from '@/types/riskEngine';
import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';

export class FraudCaseManagementEngine {
  private static cases: Map<string, FraudCaseRecord> = new Map();
  private static holds: Map<string, RiskHoldRecord> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialData();
    }
  }

  private static seedInitialData() {
    if (this.cases.size > 0) return;

    // Seed realistic baseline Fraud Cases
    const case1: FraudCaseRecord = {
      id: 'case_20260903_001',
      caseReference: 'CASE-20260903-8821',
      entityId: 'agt_kano_bello',
      entityType: 'AGENT',
      transactionReference: 'TXN-KANO-9921',
      riskScore: 78,
      riskBand: 'HIGH',
      status: 'OPEN',
      priority: 'HIGH',
      assignedDesk: 'AGENT_NETWORK_SUPERVISION',
      assignedOfficer: 'investigator.risk@koriepay.internal',
      slaDueAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      isSlaBreached: false,
      ruleHits: [
        {
          ruleId: 'RR-AGT-001',
          ruleCode: 'RULE_AGENT_CYCLING_10M',
          ruleName: 'Agent Float Cycling / Self-Dealing',
          scoreDelta: 65,
          severity: 'HIGH',
          forcedAction: 'HOLD',
          description: '10+ cash-in/cash-out cycles within 24 hours to same phone number.',
        },
      ],
      evidenceSummary: 'Rapid transaction cycling pattern detected on agent terminal POS-KANO-11.',
      createdAt: new Date().toISOString(),
    };
    this.cases.set(case1.id, case1);

    // Seed realistic baseline Risk Hold
    const hold1: RiskHoldRecord = {
      id: 'hold_20260903_001',
      holdReference: 'HOLD-RSK-20260903-1029',
      entityId: 'agt_kano_bello',
      transactionReference: 'TXN-KANO-9921',
      amountMinor: 850_000_00,
      currency: 'NGN',
      holdType: 'RISK_HOLD',
      status: 'ACTIVE',
      reason: 'Automated protective hold triggered by agent float cycling alert.',
      createdBy: 'AUTOMATED_RISK_ENGINE',
      createdAt: new Date().toISOString(),
    };
    this.holds.set(hold1.id, hold1);
  }

  public static createCase(params: {
    entityId: string;
    entityType: any;
    transactionReference?: string;
    riskScore: number;
    riskBand: RiskBand;
    ruleHits: RiskRuleHit[];
    evidenceSummary: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): FraudCaseRecord {
    this.ensureInitialized();
    const caseRef = `CASE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `case_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // SLA: Critical = 4h, High = 12h, Medium = 24h, Low = 48h
    const slaHours = params.priority === 'CRITICAL' ? 4 : params.priority === 'HIGH' ? 12 : 24;
    const slaDueAt = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

    const record: FraudCaseRecord = {
      id,
      caseReference: caseRef,
      entityId: params.entityId,
      entityType: params.entityType,
      transactionReference: params.transactionReference,
      riskScore: params.riskScore,
      riskBand: params.riskBand,
      status: 'OPEN',
      priority: params.priority || (params.riskScore >= 80 ? 'CRITICAL' : 'HIGH'),
      assignedDesk: 'FRAUD_INVESTIGATION_DESK',
      slaDueAt,
      isSlaBreached: false,
      ruleHits: params.ruleHits,
      evidenceSummary: params.evidenceSummary,
      createdAt: new Date().toISOString(),
    };

    this.cases.set(id, record);
    return record;
  }

  public static createHold(params: {
    entityId: string;
    transactionReference?: string;
    amountMinor: number;
    currency: 'NGN' | 'XOF' | 'USD';
    holdType?: RiskHoldType;
    reason: string;
    createdBy: string;
  }): RiskHoldRecord {
    this.ensureInitialized();
    const holdRef = `HOLD-RSK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `hold_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const record: RiskHoldRecord = {
      id,
      holdReference: holdRef,
      entityId: params.entityId,
      transactionReference: params.transactionReference,
      amountMinor: params.amountMinor,
      currency: params.currency,
      holdType: params.holdType || 'RISK_HOLD',
      status: 'ACTIVE',
      reason: params.reason,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString(),
    };

    this.holds.set(id, record);
    return record;
  }

  public static releaseHold(params: {
    holdId: string;
    releasedBy: string;
    releaseReason: string;
  }): RiskHoldRecord {
    this.ensureInitialized();
    const hold = this.holds.get(params.holdId);
    if (!hold) {
      throw new Error(`Risk hold with ID ${params.holdId} not found.`);
    }
    if (hold.status !== 'ACTIVE') {
      throw new Error(`Risk hold ${hold.holdReference} is already ${hold.status}.`);
    }

    // Segregation of Duties: Creator cannot release hold without checker sign-off
    if (hold.createdBy !== 'AUTOMATED_RISK_ENGINE' && hold.createdBy.toLowerCase() === params.releasedBy.toLowerCase()) {
      throw new Error('Maker-Checker Violation: Hold creator cannot authorize its release.');
    }

    hold.status = 'RELEASED';
    hold.releasedBy = params.releasedBy;
    hold.releaseReason = params.releaseReason;
    hold.releasedAt = new Date().toISOString();

    return hold;
  }

  public static resolveCase(params: {
    caseId: string;
    resolutionStatus: 'RESOLVED' | 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE' | 'CLOSED';
    resolutionNotes: string;
    resolvedBy: string;
  }): FraudCaseRecord {
    this.ensureInitialized();
    const c = this.cases.get(params.caseId);
    if (!c) {
      throw new Error(`Fraud case with ID ${params.caseId} not found.`);
    }

    c.status = params.resolutionStatus;
    c.resolutionNotes = params.resolutionNotes;
    c.resolvedBy = params.resolvedBy;
    c.resolvedAt = new Date().toISOString();

    return c;
  }

  public static getAllCases(): FraudCaseRecord[] {
    this.ensureInitialized();
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static getAllHolds(): RiskHoldRecord[] {
    this.ensureInitialized();
    return Array.from(this.holds.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
