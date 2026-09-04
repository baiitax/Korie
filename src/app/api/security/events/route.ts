import { NextResponse } from 'next/server';
import { SecurityEventPipeline } from '@/lib/iam/SecurityEventPipeline';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const pipeline = SecurityEventPipeline.getInstance();
    const events = pipeline.getEvents(limit);

    return NextResponse.json({
      success: true,
      data: {
        events,
        total: events.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
