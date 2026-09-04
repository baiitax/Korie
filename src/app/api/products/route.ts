import { NextResponse } from 'next/server';
import { BankingProductFactory } from '@/lib/products/BankingProductFactory';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jurisdiction = searchParams.get('jurisdiction') || undefined;
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;

    const factory = BankingProductFactory.getInstance();
    const products = factory.getProducts({ jurisdiction, status, type });

    return NextResponse.json({
      success: true,
      data: {
        products,
        total: products.length,
        active: products.filter((p) => p.status === 'ACTIVE').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const factory = BankingProductFactory.getInstance();

    const product = factory.createProduct(body);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
