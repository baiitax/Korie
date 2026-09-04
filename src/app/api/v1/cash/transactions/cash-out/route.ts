import { NextRequest, NextResponse } from 'next/server';
import { CashOrchestratorEngine } from '@/lib/cash/CashOrchestratorEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = CashOrchestratorEngine.getInstance();
    const result = engine.processCashOut({
      agentId: body.agentId || 'agt-ng-001',
      locationId: body.locationId || 'loc-till-garba',
      customerId: body.customerId || 'cust-001',
      amount: parseFloat(body.amount),
      currency: body.currency || 'NGN',
      terminalId: body.terminalId || 'TID-NG-009182',
      deviceId: body.deviceId || 'DEV-POS-NG-01',
      operatorId: body.operatorId || 'musa.garba@koriepay.ng',
      idempotencyKey: body.idempotencyKey || `idemp-cout-${Date.now()}`,
    });

    return NextResponse.json({
      success: result.success,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
