// =============================================================================
// File: src/lib/agent/AgentProductOverview.ts
// Description: Stage-4 services-hub projection. Aggregates catalog truth from
// the product engines (billers, card products, FX corridors), today's KPIs from
// the shared kiosk operation stream, and engine limit seeds — computed fresh at
// request time, nothing stored or fabricated client-side.
// =============================================================================

import { AgentKioskStore } from "./AgentKioskStore";
import { BillerServiceEngine, AGENT_SINGLE_OP_LIMIT_NGN } from "./BillerServiceEngine";
import { CardServiceEngine } from "./CardServiceEngine";
import { FxDeskServiceEngine } from "./FxDeskServiceEngine";
import { AccountServiceEngine } from "./AccountServiceEngine";
import { AgentProductKpi, AgentServicesOverview } from "@/types/agentProducts";
import { AGENT_PORTAL_ENGINE_AGENT_ID } from "./agentPortalConstants";

function agentId(): string {
  return AGENT_PORTAL_ENGINE_AGENT_ID;
}

export function getServicesOverview(): AgentServicesOverview {
  const billerEngine = BillerServiceEngine.getInstance();
  const cardEngine = CardServiceEngine.getInstance();
  const fxEngine = FxDeskServiceEngine.getInstance();
  const acctEngine = AccountServiceEngine.getInstance();

  const corridor = fxEngine.corridorReference();
  const usd = fxEngine.usdMarketCard();

  const ops = AgentKioskStore.getOperations(agentId(), 1000);
  const todayKey = new Date().toISOString().slice(0, 10);
  const typeToProduct: Record<string, AgentProductKpi["product"]> = {
    CASH_IN: "CASH_IN",
    CASH_OUT: "CASH_OUT",
    ACCOUNT_OPENING: "ACCOUNT_OPENING",
    BILL_PAYMENT: "BILL_PAYMENT",
    CARD_APPLICATION_FEE: "CARD_APPLICATION",
    FX_CONVERSION: "FX_CONVERSION",
  };
  const productOrder: AgentProductKpi["product"][] = ["CASH_IN", "CASH_OUT", "ACCOUNT_OPENING", "BILL_PAYMENT", "CARD_APPLICATION", "FX_CONVERSION"];
  const todayRows = ops.filter((op) => (op.createdAt || "").slice(0, 10) === todayKey);

  const todayKpis: AgentProductKpi[] = productOrder
    .map((product) => {
      const rows = todayRows.filter((op) => typeToProduct[op.type] === product);
      return {
        product,
        todayCount: rows.length,
        todayVolume: rows.reduce((sum, r) => sum + (r.amount || 0), 0),
      };
    })
    .filter((k) => k.todayCount > 0);

  return {
    limits: {
      singleTransactionNgn: AGENT_SINGLE_OP_LIMIT_NGN,
      billMinNgn: Math.min(...billerEngine.listBillers().map((b) => b.minAmountNgn)),
      billMaxNgn: Math.max(...billerEngine.listBillers().map((b) => b.maxAmountNgn)),
      fxSingleMaxNgn: AGENT_SINGLE_OP_LIMIT_NGN,
      fxDailyMaxNgn: 1_000_000,
      cardIssueFeeMaxNgn: Math.max(...cardEngine.listProducts().map((p) => p.issueFeeNgn)),
    },
    catalogs: {
      activeBillers: billerEngine.listBillers().length,
      billerCategories: billerEngine.listCategories(),
      activeCardProducts: cardEngine.listProducts().length,
      openableAccounts: acctEngine.listOpenableProducts().length,
      fxCorridor: corridor ? { pair: corridor.pair, referenceRate: corridor.referenceRateXofPerNgn, status: corridor.status } : null,
      usdCorridor: usd ? { pair: usd.pair, referenceRate: usd.referenceRate, status: usd.status } : null,
    },
    today: todayKpis,
    generatedAt: new Date().toISOString(),
  };
}
