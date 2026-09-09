// Bank Core API — liquidity rail status: nostro positions at partner banks,
// the resolved gateway mode (SIMULATED/LIVE from the admin Configuration Hub
// BANK_NODE connectors) and the recent bank transaction log.
// GET /api/bank/v1/liquidity?nodeId=providus_ng
import { NextRequest, NextResponse } from 'next/server';
import { BankCoreEngine } from '@/lib/bank/BankCoreEngine';
import { bankApiGuard } from '@/lib/bank/bankApiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = bankApiGuard(req);
  if (denied) return denied;
  try {
    const engine = BankCoreEngine.getInstance();
    const nodeId = new URL(req.url).searchParams.get('nodeId');
    let positions = engine.liquidityPositions();
    if (nodeId) positions = positions.filter((p) => p.nodeId === nodeId);
    return NextResponse.json({
      success: true,
      data: {
        gateway: engine.gatewayMode(),
        positions,
        recentTransactions: engine.transactions(10),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Liquidity engine error';
    return NextResponse.json({ success: false, error: { code: 'ENGINE_ERROR', message } }, { status: 500 });
  }
}
