import { 
  RiskEvaluationRequest, 
  RiskDecisionRecord, 
  RiskDecisionOutcome, 
  RiskBand, 
  RiskRuleHit 
} from '@/types/riskEngine';
import { RiskSignalEngine } from './RiskSignalEngine';
import { VelocityEngine } from './VelocityEngine';
import { EntityRiskProfilingEngine } from './EntityRiskProfilingEngine';
import { FraudCaseManagementEngine } from './FraudCaseManagementEngine';

export class RiskDecisionEngine {
  private static decisions: Map<string, RiskDecisionRecord> = new Map();

  public static evaluateTransaction(req: RiskEvaluationRequest): RiskDecisionRecord {
    const startTime = Date.now();
    const signals = RiskSignalEngine.extractSignals(req);
    const ruleHits: RiskRuleHit[] = [];

    // 1. Evaluate Rule: RR-DEV-001 (New Device)
    if (signals.isNewDevice) {
      ruleHits.push({
        ruleId: 'RR-DEV-001',
        ruleCode: 'RULE_DEV_NEW_SIGNATURE',
        ruleName: 'Unknown / New Device Signature',
        scoreDelta: 25,
        severity: 'MEDIUM',
        forcedAction: 'ALLOW_WITH_STEP_UP',
        description: 'Transaction initiated from a hardware hash never seen on account.',
      });
    }

    // 2. Evaluate Rule: RR-DEV-002 (Multi-Account Device Switching)
    if (signals.deviceAccountsCount24h >= 4) {
      ruleHits.push({
        ruleId: 'RR-DEV-002',
        ruleCode: 'RULE_DEV_MULTI_ACCOUNT_24H',
        ruleName: 'Rapid Multi-Account Device Switching',
        scoreDelta: 55,
        severity: 'HIGH',
        forcedAction: 'HOLD',
        description: `Device bound to ${signals.deviceAccountsCount24h} distinct accounts in 24h.`,
      });
    }

    // 3. Evaluate Rule: RR-GEO-001 (Geovelocity / Impossible Travel)
    if (signals.geovelocityKmh > 800) {
      ruleHits.push({
        ruleId: 'RR-GEO-001',
        ruleCode: 'RULE_GEO_IMPOSSIBLE_TRAVEL',
        ruleName: 'Geovelocity / Impossible Travel Anomaly',
        scoreDelta: 70,
        severity: 'CRITICAL',
        forcedAction: 'HOLD',
        description: `Geovelocity rate of ${signals.geovelocityKmh} km/h implies impossible physical travel.`,
      });
    }

    // 4. Evaluate Rule: RR-NET-001 (VPN / Proxy Node)
    if (signals.isVpnOrProxy) {
      ruleHits.push({
        ruleId: 'RR-NET-001',
        ruleCode: 'RULE_NET_VPN_PROXY',
        ruleName: 'High-Risk VPN / Tor / Proxy Connection',
        scoreDelta: 30,
        severity: 'MEDIUM',
        forcedAction: 'ALLOW_WITH_STEP_UP',
        description: 'Connection originates from commercial VPN / proxy subnet.',
      });
    }

    // 5. Evaluate Rule: RR-TXN-001 (High-Value First-Time Beneficiary)
    if (signals.isNewBeneficiary && req.amountMinor >= 50_000_000) {
      ruleHits.push({
        ruleId: 'RR-TXN-001',
        ruleCode: 'RULE_TXN_NEW_BENEFICIARY_HIGH_VAL',
        ruleName: 'High-Value First-Time Beneficiary',
        scoreDelta: 40,
        severity: 'HIGH',
        forcedAction: 'REVIEW',
        description: `High-value transfer (${(req.amountMinor / 100).toLocaleString()} ${req.currency}) to an unverified new counterparty.`,
      });
    }

    // 6. Evaluate Rule: RR-VEL-001 (10-Minute Velocity Burst)
    if (signals.txnCount10m >= 5) {
      ruleHits.push({
        ruleId: 'RR-VEL-001',
        ruleCode: 'RULE_VEL_10M_BURST',
        ruleName: 'Velocity Burst (10-Minute Count)',
        scoreDelta: 50,
        severity: 'HIGH',
        forcedAction: 'HOLD',
        description: `5 or more transactions (${signals.txnCount10m}) initiated within 10 minutes.`,
      });
    }

    // 7. Evaluate Rule: RR-VEL-002 (1-Hour Volume Burst)
    if (signals.txnVolume1hMinor >= 200_000_000) {
      ruleHits.push({
        ruleId: 'RR-VEL-002',
        ruleCode: 'RULE_VEL_1H_VOLUME',
        ruleName: 'Velocity Burst (1-Hour Cumulative Volume)',
        scoreDelta: 45,
        severity: 'HIGH',
        forcedAction: 'REVIEW',
        description: 'Cumulative volume in 1 hour exceeds ₦2,000,000.',
      });
    }

    // 8. Calculate Composite Score
    let compositeScore = 10; // baseline safe score
    for (const hit of ruleHits) {
      compositeScore += hit.scoreDelta;
    }
    compositeScore = Math.min(100, Math.max(0, compositeScore));

    // 9. Map Risk Band
    let riskBand: RiskBand = 'LOW';
    if (compositeScore < 20) riskBand = 'VERY_LOW';
    else if (compositeScore < 40) riskBand = 'LOW';
    else if (compositeScore < 60) riskBand = 'MEDIUM';
    else if (compositeScore < 80) riskBand = 'HIGH';
    else if (compositeScore < 95) riskBand = 'VERY_HIGH';
    else riskBand = 'CRITICAL';

    // 10. Determine Final Decision
    let finalDecision: RiskDecisionOutcome = 'ALLOW';
    if (riskBand === 'VERY_LOW' || riskBand === 'LOW') {
      finalDecision = 'ALLOW';
    } else if (riskBand === 'MEDIUM') {
      finalDecision = 'ALLOW_WITH_STEP_UP';
    } else if (riskBand === 'HIGH') {
      finalDecision = 'REVIEW';
    } else if (riskBand === 'VERY_HIGH') {
      finalDecision = 'HOLD';
    } else {
      finalDecision = 'DECLINE';
    }

    // Check forced rule action hierarchy: BLOCK > DECLINE > HOLD > REVIEW > ALLOW_WITH_STEP_UP > ALLOW
    const actionPrecedence: Record<RiskDecisionOutcome, number> = {
      BLOCK: 6,
      DECLINE: 5,
      HOLD: 4,
      REVIEW: 3,
      ALLOW_WITH_STEP_UP: 2,
      ALLOW: 1,
    };

    for (const hit of ruleHits) {
      if (hit.forcedAction && actionPrecedence[hit.forcedAction] > actionPrecedence[finalDecision]) {
        finalDecision = hit.forcedAction;
      }
    }

    // 11. Record Transaction into Velocity Store
    VelocityEngine.recordTransaction(req.entityType, req.entityId, req.amountMinor);

    // 12. Update Entity Risk Profile
    EntityRiskProfilingEngine.updateProfileScore(req.entityId, compositeScore, riskBand);

    const latencyMs = Math.max(1, Date.now() - startTime);
    const decisionId = `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const decisionRecord: RiskDecisionRecord = {
      id: decisionId,
      transactionReference: req.transactionReference,
      entityId: req.entityId,
      entityType: req.entityType,
      compositeScore,
      riskBand,
      decision: finalDecision,
      decisionReason: ruleHits.length > 0 
        ? ruleHits.map(h => h.ruleName).join('; ')
        : 'All standard behavioral and device signals within baseline risk parameters.',
      ruleHits,
      signalsSnapshot: signals as any,
      policyVersion: 'v1.2.0',
      modelVersion: 'HEURISTIC-RULES-V2',
      executionLatencyMs: latencyMs,
      createdAt: new Date().toISOString(),
    };

    this.decisions.set(decisionId, decisionRecord);

    // 13. Auto-Trigger Fraud Case or Risk Hold if High Risk
    if (finalDecision === 'HOLD' || finalDecision === 'DECLINE' || finalDecision === 'REVIEW') {
      FraudCaseManagementEngine.createCase({
        entityId: req.entityId,
        entityType: req.entityType,
        transactionReference: req.transactionReference,
        riskScore: compositeScore,
        riskBand,
        ruleHits,
        evidenceSummary: `Automated decision [${finalDecision}] triggered by ${ruleHits.length} risk rule violations.`,
        priority: finalDecision === 'DECLINE' ? 'CRITICAL' : 'HIGH',
      });

      if (finalDecision === 'HOLD') {
        FraudCaseManagementEngine.createHold({
          entityId: req.entityId,
          transactionReference: req.transactionReference,
          amountMinor: req.amountMinor,
          currency: req.currency,
          reason: `Automated risk hold: ${ruleHits.map(h => h.ruleName).join(', ')}`,
          createdBy: 'AUTOMATED_RISK_ENGINE',
        });
      }
    }

    return decisionRecord;
  }

  public static getDecisionById(id: string): RiskDecisionRecord | undefined {
    return this.decisions.get(id);
  }

  public static getAllDecisions(): RiskDecisionRecord[] {
    return Array.from(this.decisions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
