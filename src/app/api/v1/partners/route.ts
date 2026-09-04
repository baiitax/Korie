import { NextResponse } from 'next/server';
import { PartnerManagementEngine } from '@/lib/gateway/PartnerManagementEngine';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';

export async function GET(request: Request) {
  try {
    const partnerEngine = PartnerManagementEngine.getInstance();
    const gateway = ApiGatewayEngine.getInstance();

    const partners = partnerEngine.getPartners();
    return NextResponse.json(gateway.createResponse({ partners, total: partners.length }));
  } catch (error: any) {
    const gateway = ApiGatewayEngine.getInstance();
    return NextResponse.json(gateway.createError('INTERNAL_ERROR', error.message), { status: 500 });
  }
}
