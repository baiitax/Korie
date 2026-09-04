import { NextResponse } from 'next/server';
import { AmlScreeningProvider } from '@/lib/aml/AmlScreeningProvider';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const screening = AmlScreeningProvider.getInstance();

    const result = await screening.screenEntity(body.name, body.jurisdiction || 'NG');
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
