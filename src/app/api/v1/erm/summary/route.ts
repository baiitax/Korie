import { NextRequest, NextResponse } from 'next/server';
import { RiskRegisterEngine } from '@/lib/erm/RiskRegisterEngine';
import { RiskAppetiteEngine } from '@/lib/erm/RiskAppetiteEngine';
import { IssueRemediationEngine } from '@/lib/erm/IssueRemediationEngine';
import { OperationalLossEngine } from '@/lib/erm/OperationalLossEngine';

export async function GET(req: NextRequest) {
  try {
    const riskEngine = RiskRegisterEngine.getInstance();
    const appetiteEngine = RiskAppetiteEngine.getInstance();
    const issueEngine = IssueRemediationEngine.getInstance();
    const lossEngine = OperationalLossEngine.getInstance();

    const risks = riskEngine.getRisks();
    const statements = appetiteEngine.getStatements();
    const issues = issueEngine.getIssues();
    const losses = lossEngine.getLossEvents();

    const criticalRisks = risks.filter((r) => r.riskTier === 'CRITICAL' || r.riskTier === 'HIGH');
    const appetiteBreaches = statements.filter((s) => s.status === 'BREACH' || s.status === 'CRITICAL_BREACH');
    const openHighIssues = issues.filter((i) => (i.severity === 'HIGH' || i.severity === 'CRITICAL') && i.status !== 'CLOSED');
    const totalNetLoss = losses.reduce((acc, l) => acc + l.netLossAmount, 0);

    return NextResponse.json({
      success: true,
      data: {
        enterpriseRiskScore: 92.4, // Institutional health score out of 100
        totalRisksCount: risks.length,
        criticalRisksCount: criticalRisks.length,
        appetiteBreachesCount: appetiteBreaches.length,
        openHighIssuesCount: openHighIssues.length,
        totalNetLosses: totalNetLoss,
        currency: 'NGN',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
