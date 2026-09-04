// =============================================================================
// File: src/app/api/v1/adashi/products/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';
import { AdashiProductFactoryEngine } from '@/lib/adashi/AdashiProductFactoryEngine';

export async function GET() {
  try {
    const products = AdashiStore.getProducts();
    return NextResponse.json({ success: true, count: products.length, data: products });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actorId = req.headers.get('x-user-id') || 'usr-admin-001';
    const product = AdashiProductFactoryEngine.createProduct(body, actorId);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
