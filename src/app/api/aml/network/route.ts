import { NextResponse } from 'next/server';
import { AmlNetworkGraphEngine } from '@/lib/aml/AmlNetworkGraphEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId') || 'cust-ng-001-ibrahim';

    const engine = AmlNetworkGraphEngine.getInstance();
    const network = engine.getNetworkForEntity(entityId);

    return NextResponse.json({ success: true, data: network });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
