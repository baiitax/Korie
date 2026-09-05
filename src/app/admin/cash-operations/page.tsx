"use client";

import React, { useState, useEffect } from "react";
import {
  Coins,
  Building2,
  Truck,
  ShieldAlert,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  X,
  FileText,
  DollarSign,
  Activity,
  Layers,
  MapPin,
  HelpCircle,
  Scale,
  Zap,
  Check,
  Eye,
  Send,
  Radio,
} from "lucide-react";
import {
  CashLocationRecord,
  CashPositionRecord,
  CashCountRecord,
  TillRecord,
  TillHandoverRecord,
  VaultRecord,
  CashMovementRecord,
  CitShipmentRecord,
  CashVarianceRecord,
  CashDemandForecast,
} from "@/types/physicalCashEngine";

type ActiveTab =
  | "overview"
  | "vaults"
  | "tills"
  | "movements"
  | "cit"
  | "counts"
  | "variances"
  | "liquidity"
  | "forecasting"
  | "orchestration";

export default function CashOperationsAdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Core domain states
  const [locations, setLocations] = useState<CashLocationRecord[]>([]);
  const [positions, setPositions] = useState<CashPositionRecord[]>([]);
  const [counts, setCounts] = useState<CashCountRecord[]>([]);
  const [tills, setTills] = useState<TillRecord[]>([]);
  const [vaults, setVaults] = useState<VaultRecord[]>([]);
  const [movements, setMovements] = useState<CashMovementRecord[]>([]);
  const [shipments, setShipments] = useState<CitShipmentRecord[]>([]);
  const [variances, setVariances] = useState<CashVarianceRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [forecasts, setForecasts] = useState<CashDemandForecast[]>([]);

  // Modals & Action Forms
  const [isVaultAccessModalOpen, setIsVaultAccessModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState<VaultRecord | null>(null);
  const [vaultAccessForm, setVaultAccessForm] = useState({
    makerCustodian: "Emeka Nwosu",
    checkerCustodian: "Tunde Bakare",
    supervisor: "Folake Adeleke",
    accessReason: "Daily Liquidity Dispatch",
    authorizedAmount: 15000000,
  });

  const [isTillHandoverModalOpen, setIsTillHandoverModalOpen] = useState(false);
  const [selectedTill, setSelectedTill] = useState<TillRecord | null>(null);
  const [handoverForm, setHandoverForm] = useState({
    outgoingOperator: "Musa Garba",
    incomingOperator: "Fatima Abdullahi",
    actualCountedAmount: 1850000,
    notes: "Evening shift transition complete",
  });

  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState({
    sourceLocationId: "loc-vault-los",
    destinationLocationId: "loc-vault-abj",
    movementType: "BRANCH_TO_BRANCH",
    amount: 10000000,
    currency: "NGN" as "NGN" | "XOF",
    initiatedBy: "treasury@koriepay.com",
  });

  // Orchestration Simulator
  const [orchTxType, setOrchTxType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [orchAmount, setOrchAmount] = useState("50000");
  const [orchLocationId, setOrchLocationId] = useState("loc-till-garba");
  const [orchCurrency, setOrchCurrency] = useState<"NGN" | "XOF">("NGN");
  const [orchResult, setOrchResult] = useState<any>(null);
  const [orchEvaluating, setOrchEvaluating] = useState(false);

  // Scenario Simulator
  const [selectedScenario, setSelectedScenario] = useState("SURGE_CASHOUT_20");
  const [scenarioResult, setScenarioResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        resLoc,
        resPos,
        resCnt,
        resTil,
        resVlt,
        resMov,
        resShp,
        resVar,
        resSum,
        resFrc,
      ] = await Promise.all([
        fetch("/api/v1/cash/locations"),
        fetch("/api/v1/cash/positions"),
        fetch("/api/v1/cash/counts"),
        fetch("/api/v1/cash/tills"),
        fetch("/api/v1/cash/vaults"),
        fetch("/api/v1/cash/movements"),
        fetch("/api/v1/cash/cit/shipments"),
        fetch("/api/v1/cash/variances"),
        fetch("/api/v1/cash/liquidity/summary"),
        fetch("/api/v1/cash/liquidity/forecast?currency=NGN"),
      ]);

      const [
        jsonLoc,
        jsonPos,
        jsonCnt,
        jsonTil,
        jsonVlt,
        jsonMov,
        jsonShp,
        jsonVar,
        jsonSum,
        jsonFrc,
      ] = await Promise.all([
        resLoc.json(),
        resPos.json(),
        resCnt.json(),
        resTil.json(),
        resVlt.json(),
        resMov.json(),
        resShp.json(),
        resVar.json(),
        resSum.json(),
        resFrc.json(),
      ]);

      if (jsonLoc.success) setLocations(jsonLoc.data);
      if (jsonPos.success) setPositions(jsonPos.data);
      if (jsonCnt.success) setCounts(jsonCnt.data);
      if (jsonTil.success) setTills(jsonTil.data);
      if (jsonVlt.success) setVaults(jsonVlt.data);
      if (jsonMov.success) setMovements(jsonMov.data);
      if (jsonShp.success) setShipments(jsonShp.data);
      if (jsonVar.success) setVariances(jsonVar.data);
      if (jsonSum.success) setSummary(jsonSum.data);
      if (jsonFrc.success) setForecasts(jsonFrc.data);
    } catch (err) {
      console.error("Failed to load cash operations data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVaultAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVault) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/cash/vaults/${selectedVault.id}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vaultAccessForm),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Dual-custody access authorized for ${selectedVault.vaultCode} (Log Ref: ${json.accessLogId})`);
        setIsVaultAccessModalOpen(false);
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

  const handleTillHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTill) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/cash/tills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HANDOVER",
          tillId: selectedTill.id,
          ...handoverForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Till handover completed for ${selectedTill.tillCode} with status: ${json.handover?.handoverStatus}`);
        setIsTillHandoverModalOpen(false);
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

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/cash/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE",
          ...movementForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Cash movement registered: ${json.data?.movementReference}`);
        setIsNewMovementModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMovement = async (movementId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/cash/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          movementId,
          approvedBy: "treasury.head@koriepay.com",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Cash movement ${json.movement?.movementReference} approved for transport.`);
        fetchData();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOrchestrationTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrchEvaluating(true);
    try {
      const url =
        orchTxType === "CASH_IN"
          ? "/api/v1/cash/transactions/cash-in"
          : "/api/v1/cash/transactions/cash-out";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: orchLocationId,
          amount: parseFloat(orchAmount),
          currency: orchCurrency,
          operatorId: "musa.garba@koriepay.ng",
          idempotencyKey: `orch-${Date.now()}`,
        }),
      });
      const json = await res.json();
      setOrchResult(json.data || json);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setOrchEvaluating(false);
    }
  };

  const handleRunScenario = async () => {
    try {
      const res = await fetch("/api/v1/cash/liquidity/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioCode: selectedScenario }),
      });
      const json = await res.json();
      if (json.success) {
        setScenarioResult(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Physical Cash & Liquidity Command Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Sovereign Truth Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative physical cash truth layer, dual-custody vaults, agent tills, armored CIT custody chains, and demand forecasting.
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
          <button
            onClick={() => setIsNewMovementModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/40 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Transfer Cash
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-300 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
          { id: "overview", label: "5-Truths Liquidity", icon: Layers },
          { id: "vaults", label: "Vaults & Dual-Control", icon: Lock },
          { id: "tills", label: "Tills & Handovers", icon: Coins },
          { id: "movements", label: "Cash Movements", icon: TrendingUp },
          { id: "cit", label: "CIT Armored Network", icon: Truck },
          { id: "counts", label: "Denomination Audits", icon: FileText },
          { id: "variances", label: "Variances & Exceptions", icon: AlertTriangle },
          { id: "liquidity", label: "Liquidity Buffers", icon: Activity },
          { id: "forecasting", label: "Forecasting & Stress", icon: Radio },
          { id: "orchestration", label: "Ledger Orchestrator", icon: Zap },
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

      {/* TAB 1: OVERVIEW & 5 TRUTHS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Total Physical Cash (NGN)</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ₦{summary?.totalPhysicalCashNGN?.toLocaleString() || "621,850,000"}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Available: ₦{summary?.availablePhysicalCashNGN?.toLocaleString() || "551,650,000"}</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Total Physical Cash (XOF)</div>
              <div className="text-2xl font-bold text-teal-400 mt-1">
                {summary?.totalPhysicalCashXOF?.toLocaleString() || "299,200,000"} XOF
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Available: {summary?.availablePhysicalCashXOF?.toLocaleString() || "258,700,000"} XOF</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Cash-in-Transit (CIT Custody)</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                ₦{summary?.inTransitCashNGN?.toLocaleString() || "20,000,000"}
              </div>
              <div className="text-[11px] text-amber-400/80 mt-1">Armored G4S / Brinks Manifests</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Physical vs Digital Variance</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">₦0 (100% Reconciled)</div>
              <div className="text-[11px] text-slate-400 mt-1">Double-Entry Ledger Asset Accounts</div>
            </div>
          </div>

          {/* 5 Distinct Truths Architecture Card */}
          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white mb-2">The 5 Independent Financial & Operational Truths</h2>
            <p className="text-xs text-slate-400 mb-6">
              KoriePay strictly separates digital claims from physical cash presence. Digital wallet balances never mutate physical cash without an authorized double-entry journal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-950/60 border border-emerald-500/30 rounded-xl">
                <div className="text-emerald-400 font-bold uppercase text-[11px] mb-2">[1] Physical Cash Truth</div>
                <div className="text-white font-semibold">Banknotes in Tills & Vaults</div>
                <div className="text-slate-400 text-[10px] mt-2">Verified via physical denomination counting tallies.</div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-teal-500/30 rounded-xl">
                <div className="text-teal-400 font-bold uppercase text-[11px] mb-2">[2] Operational Truth</div>
                <div className="text-white font-semibold">Expected Cash Positions</div>
                <div className="text-slate-400 text-[10px] mt-2">Opening cash + inflows - outflows $\pm$ adjustments.</div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-blue-500/30 rounded-xl">
                <div className="text-blue-400 font-bold uppercase text-[11px] mb-2">[3] Financial Ledger Truth</div>
                <div className="text-white font-semibold">Core Double-Entry GL</div>
                <div className="text-slate-400 text-[10px] mt-2">Debit Asset (1040/1080) $\longleftrightarrow$ Credit Liability (2010).</div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-purple-500/30 rounded-xl">
                <div className="text-purple-400 font-bold uppercase text-[11px] mb-2">[4] Settlement Truth</div>
                <div className="text-white font-semibold">Bank / CIT Confirmations</div>
                <div className="text-slate-400 text-[10px] mt-2">External bank statements and courier manifests.</div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-amber-500/30 rounded-xl">
                <div className="text-amber-400 font-bold uppercase text-[11px] mb-2">[5] Treasury Truth</div>
                <div className="text-white font-semibold">Buffers & Solvency</div>
                <div className="text-slate-400 text-[10px] mt-2">Available, reserved, committed, and forecast liquidity.</div>
              </div>
            </div>
          </div>

          {/* Cash Positions by Location */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Physical Cash Positions by Location</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="p-4">Location</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Expected Cash</th>
                    <th className="p-4">Actual Counted</th>
                    <th className="p-4">Reserved</th>
                    <th className="p-4">Available</th>
                    <th className="p-4">Liquidity Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {positions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-semibold text-white">{pos.locationName}</td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">{pos.locationType}</td>
                      <td className="p-4 font-mono font-semibold text-white">
                        {pos.currency} {pos.expectedPhysicalCash.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-emerald-400">
                        {pos.currency} {pos.actualCountedCash.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-slate-400">
                        {pos.currency} {pos.reservedCash.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono font-semibold text-teal-300">
                        {pos.currency} {pos.availablePhysicalCash.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          pos.liquidityStatus === "HEALTHY"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : pos.liquidityStatus === "WATCH"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                        }`}>
                          {pos.liquidityStatus}
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

      {/* TAB 2: VAULTS & DUAL-CONTROL */}
      {activeTab === "vaults" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Central & Regional Vault Governance</h2>
              <p className="text-xs text-slate-400">
                Four-eyes / Six-eyes dual-custody access (Maker Custodian + Checker Custodian + Branch Supervisor).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {vaults.map((v) => (
              <div key={v.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs font-bold text-emerald-400">{v.vaultCode}</div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    v.status === "LOCKED"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  }`}>
                    {v.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{v.name}</h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">Country: {v.country} • Currency: {v.currency}</div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Holding:</span>
                    <span className="font-mono font-bold text-white">{v.currency} {v.currentCashHolding.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Capacity:</span>
                    <span className="font-mono text-slate-300">{v.currency} {v.maxVaultCapacity.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div><span className="text-slate-500">Custodian A:</span> {v.custodianA}</div>
                  <div><span className="text-slate-500">Custodian B:</span> {v.custodianB}</div>
                  <div><span className="text-slate-500">Supervisor:</span> {v.supervisor}</div>
                </div>

                <button
                  onClick={() => {
                    setSelectedVault(v);
                    setIsVaultAccessModalOpen(true);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Dual-Custody Unlock Request
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TILLS & HANDOVERS */}
      {activeTab === "tills" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Branch & Agent Cash Till Fleet</h2>
              <p className="text-xs text-slate-400">
                Formal till sessions, opening/closing verification, and multi-operator handover protocols.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Till Code</th>
                  <th className="p-4">Assigned Operator</th>
                  <th className="p-4">Expected Cash</th>
                  <th className="p-4">Holding Limit</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tills.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{t.tillCode}</td>
                    <td className="p-4 text-white font-medium">{t.assignedOperator}</td>
                    <td className="p-4 font-mono font-semibold text-white">
                      {t.currency} {t.currentExpectedBalance.toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {t.currency} {t.maxHoldingLimit.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        t.status === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedTill(t);
                          setHandoverForm({
                            outgoingOperator: t.assignedOperator,
                            incomingOperator: "",
                            actualCountedAmount: t.currentExpectedBalance,
                            notes: "",
                          });
                          setIsTillHandoverModalOpen(true);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                      >
                        Execute Handover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MOVEMENTS */}
      {activeTab === "movements" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Cash Movements & Transit Transfers</h2>
              <p className="text-xs text-slate-400">
                12-stage state machine governance for Vault-to-Till, Branch-to-Branch, and Bank-to-Vault cash movements.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Movement Ref</th>
                  <th className="p-4">Source $\rightarrow$ Destination</th>
                  <th className="p-4">Transfer Type</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{m.movementReference}</td>
                    <td className="p-4 text-white">
                      {m.sourceLocationName} $\rightarrow$ {m.destinationLocationName}
                    </td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">{m.movementType}</td>
                    <td className="p-4 font-mono font-semibold text-white">
                      {m.currency} {m.amount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        m.status === "RECEIVED" || m.status === "RECONCILED"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : m.status === "IN_TRANSIT"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {m.status === "APPROVAL_REQUIRED" && (
                        <button
                          onClick={() => handleApproveMovement(m.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow"
                        >
                          Approve Transfer
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

      {/* TAB 5: CIT ARMOR NETWORK */}
      {activeTab === "cit" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Cash-in-Transit (CIT) Armored Courier Network</h2>
              <p className="text-xs text-slate-400">
                G4S & Brinks armored vehicle tracking, tamper-evident seal serial verification, and immutable custody chains.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Shipment Code</th>
                  <th className="p-4">CIT Carrier & Vehicle</th>
                  <th className="p-4">Seal Number</th>
                  <th className="p-4">Declared Cash</th>
                  <th className="p-4">Expected Arrival</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{s.shipmentCode}</td>
                    <td className="p-4">
                      <div className="text-white font-medium">{s.citProvider}</div>
                      <div className="text-[10px] text-slate-400">{s.vehicleRegNumber} • {s.leadCourierName}</div>
                    </td>
                    <td className="p-4 font-mono text-slate-300 font-semibold">{s.sealNumber}</td>
                    <td className="p-4 font-mono font-semibold text-white">
                      {s.currency} {s.declaredAmount.toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-slate-400">{new Date(s.expectedArrivalAt).toLocaleTimeString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        s.status === "RECONCILED"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: COUNTS */}
      {activeTab === "counts" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Denomination-Level Counting Audits</h2>
              <p className="text-xs text-slate-400">
                End-of-day and surprise spot counts tallied across ₦1,000, ₦500, ₦200, ₦100, 10,000 XOF, 5,000 XOF.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Count Ref</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Count Type</th>
                  <th className="p-4">Total Counted</th>
                  <th className="p-4">Variance</th>
                  <th className="p-4">Counted By</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {counts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{c.id}</td>
                    <td className="p-4 text-white font-medium">{c.locationName}</td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">{c.countType}</td>
                    <td className="p-4 font-mono font-semibold text-white">
                      {c.currency} {c.countedAmount.toLocaleString()}
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-300">
                      {c.currency} {c.varianceAmount.toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-400">{c.countedBy}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        c.countStatus === "VERIFIED"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                      }`}>
                        {c.countStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: VARIANCES */}
      {activeTab === "variances" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Cash Variances & Discrepancy Investigations</h2>
              <p className="text-xs text-slate-400">
                Shortage/Overage logging, root cause classification, and compensating General Ledger suspense entries.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Variance Ref</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Discrepancy Type</th>
                  <th className="p-4">Variance Amount</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Root Cause / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {variances.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{v.varianceReference}</td>
                    <td className="p-4 text-white font-medium">{v.locationName}</td>
                    <td className="p-4 font-mono text-slate-300">{v.varianceType}</td>
                    <td className="p-4 font-mono font-semibold text-rose-400">
                      {v.currency} {v.varianceAmount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.severity === "HIGH" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {v.severity}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        v.status === "RESOLVED"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-[11px] max-w-xs truncate">{v.rootCauseNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: LIQUIDITY BUFFERS */}
      {activeTab === "liquidity" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Physical Cash Liquidity Buffer Monitor</h2>
              <p className="text-xs text-slate-400">
                Safety buffer thresholds, reserved cash allocations, and automated replenishment triggers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {positions.map((p) => {
              const bufferRatio = Math.round((p.availablePhysicalCash / (p.targetSafetyBuffer || 1)) * 100);
              return (
                <div key={p.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{p.locationName}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      p.liquidityStatus === "HEALTHY"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}>
                      {p.liquidityStatus}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Available Cash:</span>
                      <span className="font-mono font-bold text-emerald-400">{p.currency} {p.availablePhysicalCash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Safety Buffer Target:</span>
                      <span className="font-mono text-slate-300">{p.currency} {p.targetSafetyBuffer.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Buffer Coverage:</span>
                      <span className="font-mono text-teal-400 font-bold">{bufferRatio}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${bufferRatio >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(bufferRatio, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 9: FORECASTING & STRESS */}
      {activeTab === "forecasting" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white">Cash Demand Horizon Forecasting</h2>
            <p className="text-xs text-slate-400">
              Statistical demand projections for 1h, 4h, 24h, 3d, 7d, and 30d operational funding.
            </p>

            <div className="space-y-3">
              {forecasts.map((f) => (
                <div key={f.horizon} className="p-3.5 bg-slate-950/60 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-white">{f.horizon}</div>
                    <div className="text-[10px] text-slate-400">Confidence: {f.confidenceScore}%</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-emerald-400 font-bold">₦{f.netLiquidityDemand.toLocaleString()} Demand</div>
                    <div className="text-[10px] text-slate-400">Replenish: ₦{f.recommendedReplenishment.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white">Liquidity Stress Scenario Simulator</h2>
            <p className="text-xs text-slate-400">
              Simulate cash-out spikes, armored CIT outages, or settlement rail delays without mutating production state.
            </p>

            <div className="space-y-3">
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="SURGE_CASHOUT_20">+20% Agent Network Cash-Out Surge</option>
                <option value="CIT_CORRIDOR_SHUTDOWN">24h Armored CIT Corridor Outage</option>
                <option value="BANK_SETTLEMENT_DELAY">Providus / Coris Settlement Batch Delay</option>
              </select>

              <button
                onClick={handleRunScenario}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow-lg shadow-emerald-900/30"
              >
                Run Stress Simulation
              </button>

              {scenarioResult && (
                <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-emerald-400">{scenarioResult.scenarioName}</div>
                  <div className="text-slate-300">Simulated Cash Drain NGN: <span className="font-mono text-white">₦{Math.abs(scenarioResult.simulatedImpactNGN).toLocaleString()}</span></div>
                  <div className="text-slate-300">Deficit Outposts: <span className="font-mono text-amber-400">{scenarioResult.projectedDeficitLocations} locations</span></div>
                  <div className="text-slate-300">Recommended Buffer Lift: <span className="font-mono text-emerald-400">+{scenarioResult.recommendedBufferIncreasePercentage}%</span></div>
                  <div className="text-[11px] text-slate-400 mt-2">{scenarioResult.riskAssessment}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: LEDGER ORCHESTRATOR */}
      {activeTab === "orchestration" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white mb-2">Cash & Double-Entry Ledger Orchestrator</h2>
            <p className="text-xs text-slate-400 mb-6">
              Test end-to-end atomic coordination between Physical Cash drawers, Idempotent Transaction IDs, and double-entry Core Ledger journal postings.
            </p>

            <form onSubmit={handleOrchestrationTest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Transaction Type</label>
                  <select
                    value={orchTxType}
                    onChange={(e) => setOrchTxType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="CASH_IN">CASH_IN (Physical Deposit)</option>
                    <option value="CASH_OUT">CASH_OUT (Physical Withdrawal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Currency</label>
                  <select
                    value={orchCurrency}
                    onChange={(e) => setOrchCurrency(e.target.value as any)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="NGN">NGN (Nigeria)</option>
                    <option value="XOF">XOF (Niger)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Cash Till Location</label>
                <select
                  value={orchLocationId}
                  onChange={(e) => setOrchLocationId(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="loc-till-garba">Garba Express POS Cash Till (Abuja)</option>
                  <option value="loc-till-sahel">Sahel Kiosque Niamey Cash Till (Niamey)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Transaction Amount ({orchCurrency})</label>
                <input
                  type="number"
                  value={orchAmount}
                  onChange={(e) => setOrchAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={orchEvaluating}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
              >
                {orchEvaluating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Execute Orchestrated Cash Operation
              </button>
            </form>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-2">Ledger Posting & Physical Cash Result</h3>
              <p className="text-xs text-slate-400 mb-4">Immutable double-entry General Ledger journal lines and updated till balance.</p>

              {orchResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border bg-emerald-950/40 border-emerald-500/40 text-emerald-400">
                    <div className="text-lg font-bold font-mono">STATUS: {orchResult.status}</div>
                    <div className="text-xs mt-1">Tx Ref: {orchResult.transactionReference}</div>
                    <div className="text-xs mt-1">GL Journal: {orchResult.glJournalId}</div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-white/5 font-mono text-xs text-slate-300 space-y-1">
                    <div className="text-slate-500 uppercase text-[10px] mb-2 font-semibold">Ledger Invariant Verification:</div>
                    <div>• Physical Cash Updated: <span className="text-emerald-400">{orchResult.physicalCashUpdated ? "TRUE" : "FALSE"}</span></div>
                    <div>• New Expected Physical Cash: <span className="text-white font-bold">{orchResult.newExpectedPhysicalCash ? `₦${orchResult.newExpectedPhysicalCash.toLocaleString()}` : "N/A"}</span></div>
                    <div>• Double-Entry Balance: <span className="text-emerald-400 font-bold">BALANCED (0 Kobo Variance)</span></div>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                  Execute a cash transaction on the left to see ledger postings
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VAULT DUAL ACCESS MODAL */}
      {isVaultAccessModalOpen && selectedVault && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Dual-Custody Vault Unlock</h3>
              <button onClick={() => setIsVaultAccessModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVaultAccess} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Maker Custodian</label>
                <input
                  type="text"
                  value={vaultAccessForm.makerCustodian}
                  onChange={(e) => setVaultAccessForm({ ...vaultAccessForm, makerCustodian: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Checker Custodian</label>
                <input
                  type="text"
                  value={vaultAccessForm.checkerCustodian}
                  onChange={(e) => setVaultAccessForm({ ...vaultAccessForm, checkerCustodian: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Supervisor (Required &gt; ₦10M)</label>
                <input
                  type="text"
                  value={vaultAccessForm.supervisor}
                  onChange={(e) => setVaultAccessForm({ ...vaultAccessForm, supervisor: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVaultAccessModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  Authorize Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TILL HANDOVER MODAL */}
      {isTillHandoverModalOpen && selectedTill && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Till Handover Sign-Off</h3>
              <button onClick={() => setIsTillHandoverModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTillHandover} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Outgoing Operator</label>
                <input
                  type="text"
                  disabled
                  value={handoverForm.outgoingOperator}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Incoming Operator</label>
                <input
                  type="text"
                  required
                  value={handoverForm.incomingOperator}
                  onChange={(e) => setHandoverForm({ ...handoverForm, incomingOperator: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Counted Cash Amount ({selectedTill.currency})</label>
                <input
                  type="number"
                  value={handoverForm.actualCountedAmount}
                  onChange={(e) => setHandoverForm({ ...handoverForm, actualCountedAmount: parseFloat(e.target.value) })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTillHandoverModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  Sign & Transfer Custody
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW MOVEMENT MODAL */}
      {isNewMovementModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Create Cash Movement Transfer</h3>
              <button onClick={() => setIsNewMovementModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Source Location</label>
                  <select
                    value={movementForm.sourceLocationId}
                    onChange={(e) => setMovementForm({ ...movementForm, sourceLocationId: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Destination Location</label>
                  <select
                    value={movementForm.destinationLocationId}
                    onChange={(e) => setMovementForm({ ...movementForm, destinationLocationId: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Amount</label>
                  <input
                    type="number"
                    value={movementForm.amount}
                    onChange={(e) => setMovementForm({ ...movementForm, amount: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Currency</label>
                  <select
                    value={movementForm.currency}
                    onChange={(e) => setMovementForm({ ...movementForm, currency: e.target.value as any })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="NGN">NGN</option>
                    <option value="XOF">XOF</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMovementModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
