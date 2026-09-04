import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const rules = [
      {
        ruleId: 'RR-DEV-001',
        ruleCode: 'RULE_DEV_NEW_SIGNATURE',
        ruleName: 'Unknown / New Device Signature',
        scope: 'GLOBAL',
        severity: 'MEDIUM',
        scoreDelta: 25,
        defaultAction: 'ALLOW_WITH_STEP_UP',
        description: 'Transaction initiated from a hardware hash never seen on account.',
        isActive: true,
      },
      {
        ruleId: 'RR-DEV-002',
        ruleCode: 'RULE_DEV_MULTI_ACCOUNT_24H',
        ruleName: 'Rapid Multi-Account Device Switching',
        scope: 'GLOBAL',
        severity: 'HIGH',
        scoreDelta: 55,
        defaultAction: 'HOLD',
        description: 'Device bound to 4 or more distinct customer accounts in 24 hours.',
        isActive: true,
      },
      {
        ruleId: 'RR-GEO-001',
        ruleCode: 'RULE_GEO_IMPOSSIBLE_TRAVEL',
        ruleName: 'Geovelocity / Impossible Travel Anomaly',
        scope: 'GLOBAL',
        severity: 'CRITICAL',
        scoreDelta: 70,
        defaultAction: 'HOLD',
        description: 'Geovelocity rate exceeds 800 km/h between successive transactions.',
        isActive: true,
      },
      {
        ruleId: 'RR-NET-001',
        ruleCode: 'RULE_NET_VPN_PROXY',
        ruleName: 'High-Risk VPN / Tor / Proxy Connection',
        scope: 'GLOBAL',
        severity: 'MEDIUM',
        scoreDelta: 30,
        defaultAction: 'ALLOW_WITH_STEP_UP',
        description: 'Connection originates from commercial VPN / proxy subnet.',
        isActive: true,
      },
      {
        ruleId: 'RR-TXN-001',
        ruleCode: 'RULE_TXN_NEW_BENEFICIARY_HIGH_VAL',
        ruleName: 'High-Value First-Time Beneficiary',
        scope: 'CUSTOMER',
        severity: 'HIGH',
        scoreDelta: 40,
        defaultAction: 'REVIEW',
        description: 'High-value transfer (> ₦500,000) to an unverified new counterparty.',
        isActive: true,
      },
      {
        ruleId: 'RR-VEL-001',
        ruleCode: 'RULE_VEL_10M_BURST',
        ruleName: 'Velocity Burst (10-Minute Count)',
        scope: 'CUSTOMER',
        severity: 'HIGH',
        scoreDelta: 50,
        defaultAction: 'HOLD',
        description: '5 or more transactions initiated within 10 minutes.',
        isActive: true,
      },
      {
        ruleId: 'RR-AGT-001',
        ruleCode: 'RULE_AGENT_CYCLING_10M',
        ruleName: 'Agent Float Cycling / Self-Dealing',
        scope: 'AGENT',
        severity: 'HIGH',
        scoreDelta: 65,
        defaultAction: 'HOLD',
        description: 'Agent cycling cash-in/cash-out through identical customer phone/account.',
        isActive: true,
      },
    ];

    return ApiResponse.success({
      count: rules.length,
      rules,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'RISK_RULES_FETCH_ERROR', 500);
  }
}
