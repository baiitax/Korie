import { NextResponse } from 'next/server';
import { ProductSimulationEngine } from '@/lib/products/ProductSimulationEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const simEngine = ProductSimulationEngine.getInstance();

    const result = simEngine.simulateProductTransaction({
      productCode: body.productCode,
      amount: Number(body.amount),
      channel: body.channel || 'NIP',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
