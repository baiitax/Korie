import { NextRequest, NextResponse } from 'next/server';
import { CustomerIntelligenceEngine } from '@/lib/intelligence/CustomerIntelligenceEngine';
import { AgentMerchantIntelligenceEngine } from '@/lib/intelligence/AgentMerchantIntelligenceEngine';

export async function GET(req: NextRequest) {
  try {
    const custEngine = CustomerIntelligenceEngine.getInstance();
    const amEngine = AgentMerchantIntelligenceEngine.getInstance();

    const profiles = custEngine.getProfiles();
    const agents = amEngine.getAgents();
    const merchants = amEngine.getMerchants();

    return NextResponse.json({
      success: true,
      data: {
        customers: profiles,
        agents,
        merchants,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
