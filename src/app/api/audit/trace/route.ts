import { NextResponse } from 'next/server';
import { ForensicTrace360Engine } from '@/lib/audit/ForensicTrace360Engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ success: false, error: 'REFERENCE_REQUIRED' }, { status: 400 });
    }

    const engine = ForensicTrace360Engine.getInstance();
    const result = engine.traceByReference(ref);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
