import { NextRequest, NextResponse } from 'next/server';
import { ModelRiskEngine } from '@/lib/erm/ModelRiskEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = ModelRiskEngine.getInstance();
    const models = engine.getModels();

    return NextResponse.json({
      success: true,
      data: models,
      count: models.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
