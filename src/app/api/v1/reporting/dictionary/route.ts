import { NextRequest, NextResponse } from 'next/server';
import { DataDictionaryEngine } from '@/lib/reporting/DataDictionaryEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = DataDictionaryEngine.getInstance();
    const entries = engine.getEntries();

    return NextResponse.json({
      success: true,
      data: entries,
      count: entries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
