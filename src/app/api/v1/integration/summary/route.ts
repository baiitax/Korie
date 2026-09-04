import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayRouterEngine } from '@/lib/integration/ApiGatewayRouterEngine';
import { ProviderConnectivityEngine } from '@/lib/integration/ProviderConnectivityEngine';
import { PartnerManagementEngine } from '@/lib/integration/PartnerManagementEngine';
import { WebhookPlatformEngine } from '@/lib/integration/WebhookPlatformEngine';

export async function GET(req: NextRequest) {
  try {
    const routerEngine = ApiGatewayRouterEngine.getInstance();
    const provEngine = ProviderConnectivityEngine.getInstance();
    const partEngine = PartnerManagementEngine.getInstance();
    const whEngine = WebhookPlatformEngine.getInstance();

    const routes = routerEngine.getRoutes();
    const credentials = routerEngine.getCredentials();
    const providers = provEngine.getProviders();
    const partners = partEngine.getPartners();
    const deliveries = whEngine.getDeliveries();

    const deadLetters = deliveries.filter((d) => d.status === 'DEAD_LETTERED');
    const totalRequests = routes.reduce((acc, r) => acc + r.requests24h, 0);

    const providus = providers.find((p) => p.providerCode === 'PROV-NG-01')?.p95LatencyMs || 142;
    const koris = providers.find((p) => p.providerCode === 'KORIS-NE-01')?.p95LatencyMs || 188;

    return NextResponse.json({
      success: true,
      data: {
        totalRequests24h: totalRequests,
        gatewaySuccessRatePct: 99.85,
        activeRoutesCount: routes.length,
        activePartnersCount: partners.length,
        activeCredentialsCount: credentials.length,
        deadLetterEventsCount: deadLetters.length,
        providusBankLatencyMs: providus,
        korisBankLatencyMs: koris,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
