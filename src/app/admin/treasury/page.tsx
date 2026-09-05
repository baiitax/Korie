"use client";

import React, { useState, useEffect } from "react";
import {
  Coins,
  TrendingUp,
  Building2,
  Globe2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Lock,
  AlertTriangle,
  Activity,
  Sliders,
  CheckCircle,
  DollarSign,
  FileText,
  Play,
  Layers,
  BarChart3,
  Scale,
  Zap,
  PlusCircle,
  X,
  Radio,
  Check,
  Eye,
  Send,
} from "lucide-react";
import {
  TreasuryAccountNode,
  AvailableLiquidityBreakdown,
  TreasuryFundingRequest,
  TreasuryAlert,
} from "@/types/treasuryEngine";
import {
  AlmMaturityBucket,
  AlmAssumptionRecord,
  FundingFacilityRecord,
  TreasuryDealTicket,
  ThreeStatementForecast,
  CapitalPositionRecord,
  UnitEconomicsRecord,
  ReverseStressTestResult,
} from "@/types/financialPlanningAlmEngine";

type ActiveTab =
  | "waterfall"
  | "ladders"
  | "alm"
  | "funding"
  | "threestatement"
  | "economics"
  | "capital"
  | "reversestress";

export default function TreasuryAdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("waterfall");
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Data States
  const [accounts, setAccounts] = useState<TreasuryAccountNode[]>([]);
  const [ladders, setLadders] = useState<AlmMaturityBucket[]>([]);
  const [assumptions, setAssumptions] = useState<AlmAssumptionRecord[]>([]);
  const [facilities, setFacilities] = useState<FundingFacilityRecord[]>([]);
  const [deals, setDeals] = useState<TreasuryDealTicket[]>([]);
  const [forecasts, setForecasts] = useState<ThreeStatementForecast[]>([]);
  const [capitalPositions, setCapitalPositions] = useState<CapitalPositionRecord[]>([]);
  const [economics, setEconomics] = useState<UnitEconomicsRecord[]>([]);
  const [reverseStress, setReverseStress] = useState<ReverseStressTestResult[]>([]);

  // Modals & Forms
  const [isDrawdownModalOpen, setIsDrawdownModalOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<FundingFacilityRecord | null>(null);
  const [drawdownAmount, setDrawdownAmount] = useState("500000000");

  const [scenarioVersion, setScenarioVersion] = useState<"BASE_CASE" | "UPSIDE" | "DOWNSIDE" | "BOARD_PLAN">("BASE_CASE");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        resAcc,
        resLad,
        resAsm,
        resFac,
        resDel,
        res3st,
        resCap,
        resEco,
        resRvs,
      ] = await Promise.all([
        fetch("/api/v1/treasury/positions"),
        fetch("/api/v1/alm/maturity-ladder?currency=NGN"),
        fetch("/api/v1/alm/assumptions"),
        fetch("/api/v1/funding/facilities"),
        fetch("/api/v1/funding/deals"),
        fetch(`/api/v1/planning/three-statement?version=${scenarioVersion}&currency=NGN`),
        fetch("/api/v1/treasury/capital"),
        fetch("/api/v1/planning/economics"),
        fetch("/api/v1/planning/reverse-stress"),
      ]);

      const [
        jsonAcc,
        jsonLad,
        jsonAsm,
        jsonFac,
        jsonDel,
        json3st,
        jsonCap,
        jsonEco,
        jsonRvs,
      ] = await Promise.all([
        resAcc.json(),
        resLad.json(),
        resAsm.json(),
        resFac.json(),
        resDel.json(),
        res3st.json(),
        resCap.json(),
        resEco.json(),
        resRvs.json(),
      ]);

      if (jsonAcc.success) setAccounts(jsonAcc.data);
      if (jsonLad.success) setLadders(jsonLad.data);
      if (jsonAsm.success) setAssumptions(jsonAsm.data);
      if (jsonFac.success) setFacilities(jsonFac.data);
      if (jsonDel.success) setDeals(jsonDel.data);
      if (json3st.success) setForecasts(json3st.data);
      if (jsonCap.success) setCapitalPositions(jsonCap.data);
      if (jsonEco.success) setEconomics(jsonEco.data);
      if (jsonRvs.success) setReverseStress(jsonRvs.data);
    } catch (err) {
      console.error("Failed to load treasury & ALM data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [scenarioVersion]);

  const handleCreateDrawdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/funding/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: selectedFacility.id,
          dealType: "FACILITY_DRAWDOWN",
          amount: parseFloat(drawdownAmount),
          currency: selectedFacility.currency,
          makerId: "treasury.analyst@koriepay.com",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Funding deal ticket ${json.data?.dealReference} created. Awaiting checker authorization.`);
        setIsDrawdownModalOpen(false);
        fetchData();
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeal = async (dealId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/funding/deals/${dealId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkerId: "group.treasurer@koriepay.com" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Funding deal ${json.data?.dealReference} approved & executed. GL Journal: ${json.data?.glJournalId}`);
        fetchData();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Group Treasury, ALM & Financial Planning</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Institutional ALM Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative liquidity waterfall, behavioural ALM maturity ladders, wholesale credit facilities, and dynamically linked 3-statement financial modeling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs font-semibold text-slate-200 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-300 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: "waterfall", label: "Liquidity Waterfall", icon: Layers },
          { id: "ladders", label: "ALM Maturity Ladders", icon: Activity },
          { id: "alm", label: "Behavioural Assumptions", icon: Sliders },
          { id: "funding", label: "Wholesale Credit Facilities", icon: Building2 },
          { id: "threestatement", label: "3-Statement Planning", icon: TrendingUp },
          { id: "economics", label: "Unit Economics", icon: BarChart3 },
          { id: "capital", label: "Capital Solvency", icon: Scale },
          { id: "reversestress", label: "Reverse Stress Runway", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                  : "bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIQUIDITY WATERFALL */}
      {activeTab === "waterfall" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Total Liquid Assets (NGN)</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">₦28,270,000,000</div>
              <div className="text-[11px] text-slate-400 mt-1">Providus Nostro + Checkout Float</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Total Liquid Assets (XOF)</div>
              <div className="text-2xl font-bold text-teal-400 mt-1">14,850,000,000 XOF</div>
              <div className="text-[11px] text-slate-400 mt-1">Coris Bank Sahel Nostro Clearing</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Committed Settlement Obligations</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">₦1,721,780,000</div>
              <div className="text-[11px] text-slate-400 mt-1">T+1 Merchant & Agent Payouts</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Net Liquidity Buffer Surplus</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">₦21,548,220,000</div>
              <div className="text-[11px] text-emerald-400/80 mt-1">+430% Above Statutory Floor</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Treasury Nostro & Settlement Accounts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="p-4">Account Code</th>
                    <th className="p-4">Account Description</th>
                    <th className="p-4">Institution Node</th>
                    <th className="p-4">Currency</th>
                    <th className="p-4">Ledger Balance</th>
                    <th className="p-4">Available Liquidity</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {accounts.map((a) => (
                    <tr key={a.accountCode} className="hover:bg-slate-800/30">
                      <td className="p-4 font-mono font-semibold text-emerald-400">{a.accountCode}</td>
                      <td className="p-4 text-white font-medium">{a.accountName}</td>
                      <td className="p-4 text-slate-400">{a.bankOrProviderName}</td>
                      <td className="p-4 font-mono font-bold text-slate-300">{a.currency}</td>
                      <td className="p-4 font-mono text-white">
                        {a.currency} {(a.ledgerBalanceMinor / 100).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono font-semibold text-emerald-400">
                        {a.currency} {(a.availableBalanceMinor / 100).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALM MATURITY LADDERS */}
      {activeTab === "ladders" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Contractual vs Behavioural ALM Maturity Ladders</h2>
              <p className="text-xs text-slate-400">
                Asset and liability cash-flow profiling across maturity buckets from 0-1 Day to 5+ Years.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Maturity Bucket</th>
                  <th className="p-4">Contractual Inflows</th>
                  <th className="p-4">Contractual Outflows</th>
                  <th className="p-4">Contractual Gap</th>
                  <th className="p-4">Behavioural Inflows</th>
                  <th className="p-4">Behavioural Outflows</th>
                  <th className="p-4">Cumulative Net Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ladders.map((l) => (
                  <tr key={l.bucketCode} className="hover:bg-slate-800/30">
                    <td className="p-4 font-semibold text-white">{l.bucketLabel}</td>
                    <td className="p-4 font-mono text-emerald-400">₦{l.contractualInflows.toLocaleString()}</td>
                    <td className="p-4 font-mono text-rose-400">₦{l.contractualOutflows.toLocaleString()}</td>
                    <td className="p-4 font-mono font-semibold text-slate-300">₦{l.contractualNetGap.toLocaleString()}</td>
                    <td className="p-4 font-mono text-teal-400">₦{l.behaviouralInflows.toLocaleString()}</td>
                    <td className="p-4 font-mono text-amber-400">₦{l.behaviouralOutflows.toLocaleString()}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">₦{l.cumulativeGap.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BEHAVIOURAL ASSUMPTIONS */}
      {activeTab === "alm" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">ALM Behavioural Assumptions Matrix</h2>
              <p className="text-xs text-slate-400">
                Governed deposit stickiness, wallet retention percentages, and non-maturing liability runoff rates.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assumptions.map((asmp) => (
              <div key={asmp.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{asmp.assumptionCode}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {asmp.status} • {asmp.version}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{asmp.name}</h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Core Sticky Float Retention:</span>
                    <span className="font-mono font-bold text-emerald-400">{asmp.coreDepositRetentionPct}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Volatile Instant Runoff:</span>
                    <span className="font-mono text-amber-400">{asmp.volatileRunoffPct}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Approved By:</span>
                    <span className="text-slate-300 font-mono">{asmp.approvedBy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: WHOLESALE CREDIT FACILITIES */}
      {activeTab === "funding" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Institutional Wholesale Credit & Liquidity Facilities</h2>
              <p className="text-xs text-slate-400">
                Commercial bank revolving credit lines, standby liquidity facilities, and Maker-Checker drawdowns.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {facilities.map((fac) => {
              const utilPct = Math.round((fac.utilizedAmount / fac.totalCommittedLimit) * 100);
              return (
                <div key={fac.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400">{fac.facilityCode}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {fac.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{fac.lenderName}</h3>
                    <div className="text-xs text-slate-400 font-mono mt-1">{fac.facilityType} • {fac.legalEntity}</div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Limit:</span>
                      <span className="font-mono font-bold text-white">{fac.currency} {fac.totalCommittedLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Utilized:</span>
                      <span className="font-mono text-amber-400">{fac.currency} {fac.utilizedAmount.toLocaleString()} ({utilPct}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Available Undrawn:</span>
                      <span className="font-mono font-bold text-emerald-400">{fac.currency} {fac.availableUndrawn.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${utilPct}%` }} />
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Covenants:</span> {fac.covenantsSummary}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFacility(fac);
                      setIsDrawdownModalOpen(true);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Request Facility Drawdown
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Funding Deal Tickets & Approvals</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Deal Reference</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Maker</th>
                  <th className="p-4">Checker</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {deals.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{d.dealReference}</td>
                    <td className="p-4 text-slate-300 font-mono text-[11px]">{d.dealType}</td>
                    <td className="p-4 font-mono font-semibold text-white">
                      {d.currency} {d.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-400">{d.makerId}</td>
                    <td className="p-4 text-slate-400">{d.checkerId || "Pending"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        d.status === "EXECUTED"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {d.status === "PROPOSED" && (
                        <button
                          onClick={() => handleApproveDeal(d.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow"
                        >
                          Approve & Execute
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: 3-STATEMENT MODEL */}
      {activeTab === "threestatement" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Integrated Three-Statement Model (P&L, Balance Sheet, Cash Flow)</h2>
              <p className="text-xs text-slate-400">
                Dynamically linked financial projections ensuring Balance Sheet equality (Assets = Liabilities + Equity).
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(["BASE_CASE", "UPSIDE", "DOWNSIDE", "BOARD_PLAN"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setScenarioVersion(v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    scenarioVersion === v
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {forecasts.map((f) => (
              <div key={f.id} className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3 text-xs">
                <div className="font-mono font-bold text-emerald-400">{f.horizon} ({f.versionName})</div>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="text-[11px] font-bold text-slate-300 uppercase">Income Statement (P&L)</div>
                  <div className="flex justify-between"><span className="text-slate-400">Revenue:</span> <span className="font-mono font-bold text-white">₦{f.revenueTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Gross Margin:</span> <span className="font-mono text-emerald-400">₦{f.grossMargin.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Net Profit:</span> <span className="font-mono font-bold text-teal-300">₦{f.netProfit.toLocaleString()}</span></div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="text-[11px] font-bold text-slate-300 uppercase">Balance Sheet</div>
                  <div className="flex justify-between"><span className="text-slate-400">Total Assets:</span> <span className="font-mono font-bold text-white">₦{f.totalAssets.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Liabilities:</span> <span className="font-mono text-amber-400">₦{f.totalLiabilities.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Total Equity:</span> <span className="font-mono text-emerald-400">₦{f.totalEquity.toLocaleString()}</span></div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="text-[11px] font-bold text-slate-300 uppercase">Cash Flow</div>
                  <div className="flex justify-between"><span className="text-slate-400">Operating CF:</span> <span className="font-mono text-emerald-400">₦{f.operatingCashflow.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Ending Cash:</span> <span className="font-mono font-bold text-white">₦{f.endingCashBalance.toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: UNIT ECONOMICS */}
      {activeTab === "economics" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Product & Channel Unit Economics</h2>
              <p className="text-xs text-slate-400">
                Contribution margin breakdown deducting interchange fees, agent commissions, and funding costs.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Monthly Value</th>
                  <th className="p-4">Gross Revenue</th>
                  <th className="p-4">Direct Costs</th>
                  <th className="p-4">Agent Commission</th>
                  <th className="p-4">Contribution Margin</th>
                  <th className="p-4">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {economics.map((e) => (
                  <tr key={e.productCode} className="hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="font-bold text-white">{e.productName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{e.productCode}</div>
                    </td>
                    <td className="p-4 font-mono text-slate-300">₦{e.monthlyVolumeValue.toLocaleString()}</td>
                    <td className="p-4 font-mono font-semibold text-emerald-400">₦{e.grossRevenue.toLocaleString()}</td>
                    <td className="p-4 font-mono text-rose-400">₦{e.interchangeAndRailCosts.toLocaleString()}</td>
                    <td className="p-4 font-mono text-amber-400">₦{e.agentCommissions.toLocaleString()}</td>
                    <td className="p-4 font-mono font-bold text-white">₦{e.contributionMargin.toLocaleString()}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {e.marginPercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: CAPITAL SOLVENCY */}
      {activeTab === "capital" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Sovereign Capital Adequacy & Regulatory Solvency</h2>
              <p className="text-xs text-slate-400">
                Central Bank of Nigeria (CBN) and BCEAO statutory capital requirements and headroom.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {capitalPositions.map((cap) => (
              <div key={cap.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cap.country === "NG" ? "🇳🇬" : "🇳🇪"}</span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {cap.country === "NG" ? "Nigeria (CBN National PSP)" : "Niger Republic (BCEAO E-Money)"}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono">Currency: {cap.currency}</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Total Qualifying Capital:</span>
                    <span className="font-mono font-bold text-emerald-400">{cap.currency} {cap.totalQualifyingCapital.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Regulatory Minimum:</span>
                    <span className="font-mono text-slate-300">{cap.currency} {cap.regulatoryMinimumCapital.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Capital Headroom:</span>
                    <span className="font-mono font-bold text-teal-300">{cap.currency} {cap.capitalHeadroom.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Solvency Coverage Ratio:</span>
                    <span className="font-mono font-bold text-emerald-400">{cap.solvencyRatioPct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: REVERSE STRESS RUNWAY */}
      {activeTab === "reversestress" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Quantitative Reverse Stress Testing & Runway</h2>
              <p className="text-xs text-slate-400">
                Calculates the maximum shocks KoriePay can survive before liquidity buffer depletion.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reverseStress.map((rs) => (
              <div key={rs.scenarioName} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">{rs.scenarioName}</h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Survivable Runway:</span>
                    <span className="font-mono font-bold text-emerald-400">{rs.maximumSurvivableDaysBeforeCrisis} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Daily Surge:</span>
                    <span className="font-mono text-amber-400">₦{rs.maximumDailyWithdrawalSpike.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Settlement Delay:</span>
                    <span className="font-mono text-slate-300">{rs.maximumSettlementDelayDays} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Backstop Required:</span>
                    <span className="font-mono text-white font-bold">₦{rs.recommendedBackstopBuffer.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5">
                  <span className="text-slate-500">Breach Trigger:</span> {rs.criticalBreachFactor}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DRAWDOWN MODAL */}
      {isDrawdownModalOpen && selectedFacility && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Request Facility Drawdown</h3>
              <button onClick={() => setIsDrawdownModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrawdown} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Lender Facility</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedFacility.lenderName} (${selectedFacility.facilityCode})`}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Drawdown Amount ({selectedFacility.currency})
                </label>
                <input
                  type="number"
                  value={drawdownAmount}
                  onChange={(e) => setDrawdownAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDrawdownModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  Submit Deal Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
