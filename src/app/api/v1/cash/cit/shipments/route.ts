import { NextRequest, NextResponse } from 'next/server';
import { CitOperationsEngine } from '@/lib/cash/CitOperationsEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = CitOperationsEngine.getInstance();
    const shipments = engine.getShipments();

    return NextResponse.json({
      success: true,
      data: shipments,
      count: shipments.length,
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
    const engine = CitOperationsEngine.getInstance();

    if (body.action === 'CUSTODY_EVENT') {
      const res = engine.recordCustodyEvent({
        shipmentId: body.shipmentId,
        eventType: body.eventType,
        actor: body.actor,
        actorRole: body.actorRole,
        locationCoordinates: body.locationCoordinates,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
