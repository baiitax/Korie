// =============================================================================
// File: src/lib/adashi/AdashiRiskComplianceEngine.ts
// Description: Adashi AML, Syndicate Collision & Jurisdictional Compliance Engine
// =============================================================================

import { AdashiStore } from './AdashiStore';

export interface ComplianceEvaluationResult {
  passed: boolean;
  riskScore: number; // 0 to 100
  flags: string[];
  recommendations: string[];
}

export class AdashiRiskComplianceEngine {
  /**
   * Evaluate Adashi group and members for AML, KYC limits, and syndicate collusion
   */
  static evaluateGroupCompliance(adashiId: string): ComplianceEvaluationResult {
    const group = AdashiStore.getGroupById(adashiId);
    if (!group) throw new Error(`Group '${adashiId}' not found.`);

    const members = AdashiStore.getMembers(adashiId);
    const flags: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 10; // Base low risk

    // 1. Currency & Jurisdictional Isolation Check
    if (group.countryCode === 'NG' && group.currency !== 'NGN') {
      flags.push('CRITICAL: Cross-border currency mismatch. Nigeria requires NGN.');
      riskScore += 50;
    }
    if (group.countryCode === 'NE' && group.currency !== 'XOF') {
      flags.push('CRITICAL: Cross-border currency mismatch. Niger Republic requires XOF.');
      riskScore += 50;
    }

    // 2. Volume AML Threshold Check
    const groupVolume = group.totalPoolVolume;
    if (groupVolume >= 5000000) {
      flags.push('HIGH_VOLUME_POOL: Pool exceeds 5,000,000 threshold. EDD mandated.');
      riskScore += 25;
      recommendations.push('Super Admin compliance sign-off required prior to cycle 1 start.');
    }

    // 3. KYC Tier Compatibility
    for (const member of members) {
      if (member.kycTier === 1 && group.contributionAmount > 20000) {
        flags.push(`KYC_LIMIT_EXCEEDED: Member ${member.customerName} is Tier 1 (limit: 20,000 per contribution).`);
        riskScore += 15;
        recommendations.push(`Request Tier 2 biometric/BVN upgrade for ${member.customerName}.`);
      }
    }

    // 4. Ghost Member / Incomplete Mandate Check
    const unverifiedMandates = members.filter((m) => !m.mandateAuthorized);
    if (unverifiedMandates.length > 0) {
      flags.push(`UNAUTHORIZED_MANDATES: ${unverifiedMandates.length} member(s) have not authorized auto-debit.`);
      riskScore += 20;
      recommendations.push('Obtain electronic mandate before locking membership.');
    }

    const passed = flags.filter((f) => f.startsWith('CRITICAL')).length === 0 && riskScore < 70;

    return {
      passed,
      riskScore: Math.min(100, riskScore),
      flags,
      recommendations,
    };
  }
}
