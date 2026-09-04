import { NextRequest, NextResponse } from 'next/server';
import { CashMovementEngine } from '@/lib/cash/CashMovementEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = CashMovementEngine.getInstance();
    const movements = engine.getMovements();

    return NextResponse.json({
      success: true,
      data: movements,
      count: movements.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const engine = CashMovementEngine.getInstance();

    if (body.action === 'CREATE') {
      const movement = engine.createMovement(body);
      return NextResponse.json({ success: true, data: movement });
    }

    if (body.action === 'APPROVE') {
      const res = engine.approveMovement(body.movementId, body.approvedBy || 'supervisor@koriepay.com');
      return NextResponse.json(res);
    }

    if (body.action === 'DISPATCH') {
      const res = engine.dispatchMovement(body.movementId);
      return NextResponse.json(res);
    }

    if (body.action === 'RECEIVE') {
      const res = engine.receiveMovement(body.movementId, body.receivedBy || 'receiver@koriepay.com');
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
