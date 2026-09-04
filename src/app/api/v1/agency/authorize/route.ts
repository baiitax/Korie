import { NextRequest, NextResponse } from 'next/server';
import { ChannelAuthorizationEngine } from '@/lib/agency/ChannelAuthorizationEngine';
import { ChannelAuthorizationRequest } from '@/types/agencyEngine';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChannelAuthorizationRequest;
    const engine = ChannelAuthorizationEngine.getInstance();
    const result = engine.authorizeChannelOperation(body);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
