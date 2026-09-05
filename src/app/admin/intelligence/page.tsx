"use client";

import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  Sparkles,
  Users,
  TrendingUp,
  AlertTriangle,
  Layers,
  Network,
  Cpu,
  ShieldAlert,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Sliders,
  DollarSign,
  Activity,
  Award,
  Play,
  Lock,
  Search,
  Check,
  X,
  FileText,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Customer360Profile,
  AgentIntelligenceProfile,
  MerchantIntelligenceProfile,
  NetworkGraphNode,
  NetworkGraphEdge,
  FinancialForecastRecord,
  EarlyWarningAlert,
  DecisionRecommendationCard,
  ScenarioSimulationResult,
  AiModelRegistryRecord,
  AiKillSwitchRecord,
  AiCopilotResponse,
  ExecutiveIntelligenceSummary,
} from "@/types/intelligenceEngine";

type ActiveTab =
  | "overview"
  | "customer360"
  | "agent_merchant"
  | "network"
  | "forecasting"
  | "early_warnings"
  | "scenarios"
  | "decisions"
  | "copilot"
  | "governance";

export default function IntelligenceAdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Platform Data States
  const [summary, setSummary] = useState<ExecutiveIntelligenceSummary | null>(null);
  const [customers, setCustomers] = useState<Customer360Profile[]>([]);
  const [agents, setAgents] = useState<AgentIntelligenceProfile[]>([]);
  const [merchants, setMerchants] = useState<MerchantIntelligenceProfile[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: NetworkGraphNode[]; edges: NetworkGraphEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [forecasts, setForecasts] = useState<FinancialForecastRecord[]>([]);
  const [alerts, setAlerts] = useState<EarlyWarningAlert[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecommendationCard[]>([]);
  const [models, setModels] = useState<AiModelRegistryRecord[]>([]);
  const [killSwitches, setKillSwitches] = useState<AiKillSwitchRecord[]>([]);

  // Scenario Simulator State
  const [scenarioForm, setScenarioForm] = useState({
    scenarioName: "Q4 Severe Multi-Vector Stress Test",
    volumeShockPct: -15,
    providerDowntimeHours: 3,
    fxShiftPct: 10,
    liquidityRunPct: 20,
  });
  const [simulationResult, setSimulationResult] = useState<ScenarioSimulationResult | null>(null);

  // AI Copilot State
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotHistory, setCopilotHistory] = useState<
    { query: string; response: AiCopilotResponse }[]
  >([]);

  const fetchIntelligenceData = async () => {
    setLoading(true);
    try {
      const [
        resSum,
        resCust,
        resNet,
        resFcst,
        resAlerts,
        resDec,
        resMdl,
      ] = await Promise.all([
        fetch("/api/v1/intelligence/summary"),
        fetch("/api/v1/intelligence/customer"),
        fetch("/api/v1/intelligence/network"),
        fetch("/api/v1/intelligence/forecasts"),
        fetch("/api/v1/intelligence/early-warnings"),
        fetch("/api/v1/intelligence/decisions"),
        fetch("/api/v1/intelligence/models"),
      ]);

      const [
        jsonSum,
        jsonCust,
        jsonNet,
        jsonFcst,
        jsonAlerts,
        jsonDec,
        jsonMdl,
      ] = await Promise.all([
        resSum.json(),
        resCust.json(),
        resNet.json(),
        resFcst.json(),
        resAlerts.json(),
        resDec.json(),
        resMdl.json(),
      ]);

      if (jsonSum.success) setSummary(jsonSum.data);
      if (jsonCust.success) {
        setCustomers(jsonCust.data.customers);
        setAgents(jsonCust.data.agents);
        setMerchants(jsonCust.data.merchants);
      }
      if (jsonNet.success) setGraphData(jsonNet.data);
      if (jsonFcst.success) setForecasts(jsonFcst.data);
      if (jsonAlerts.success) setAlerts(jsonAlerts.data);
      if (jsonDec.success) setDecisions(jsonDec.data);
      if (jsonMdl.success) {
        setModels(jsonMdl.data.models);
        setKillSwitches(jsonMdl.data.killSwitches);
      }
    } catch (err) {
      console.error("Failed to load intelligence data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligenceData();
  }, []);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/intelligence/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenarioForm),
      });
      const json = await res.json();
      if (json.success) {
        setSimulationResult(json.data);
        setActionSuccess(`Scenario simulation completed: ${json.data.scenarioName}`);
      }
    } catch (err: any) {
      alert(`Simulation Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDecision = async (decisionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/intelligence/decisions/${decisionId}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Decision card approved: ${json.data?.title}. Action routed to operational control plane.`);
        fetchIntelligenceData();
      }
    } catch (err: any) {
      alert(`Approval Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleKillSwitch = async (target: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/intelligence/models/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          switchTarget: target,
          isActive: !currentStatus,
          reason: "Emergency administrative governance intervention",
          activatedBy: "Chief Risk Officer",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Kill switch updated for ${target}: ${!currentStatus ? "ACTIVATED (PAUSED)" : "DEACTIVATED (LIVE)"}`);
        fetchIntelligenceData();
      }
    } catch (err: any) {
      alert(`Kill switch Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopilotQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const query = copilotInput;
    setCopilotInput("");
    setCopilotLoading(true);

    try {
      const res = await fetch("/api/v1/intelligence/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryText: query }),
      });
      const json = await res.json();
      if (json.success) {
        setCopilotHistory((prev) => [...prev, { query, response: json.data }]);
      }
    } catch (err: any) {
      alert(`Copilot Error: ${err.message}`);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Customer Intelligence, BI & AI Decision Command Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              AI Decision Support Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Predictive Customer 360, RFM Segmentation, Network Graph Topology, Multi-Horizon Forecasting, Governed Decision Cards & AI Copilot.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchIntelligenceData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs font-semibold text-slate-200 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Intelligence
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
          { id: "overview", label: "Executive Intelligence Cockpit", icon: BrainCircuit },
          { id: "customer360", label: "Customer 360 & RFM", icon: Users },
          { id: "agent_merchant", label: "Agent & Merchant 360", icon: Award },
          { id: "network", label: "Network Topology Graph", icon: Network },
          { id: "forecasting", label: "Financial & Liquidity Forecasts", icon: TrendingUp },
          { id: "early_warnings", label: "Early Warnings & Anomalies", icon: AlertTriangle },
          { id: "scenarios", label: "What-If Scenario Sandbox", icon: Sliders },
          { id: "decisions", label: "Governed Decision Cards", icon: ShieldCheck },
          { id: "copilot", label: "Enterprise AI Copilot", icon: Sparkles },
          { id: "governance", label: "MLOps Registry & Kill Switch", icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Predicted Monthly Revenue (P50)</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">₦4.62B</div>
              <div className="text-[11px] text-emerald-400/80 mt-1">+6.2% vs Previous Month (92% Conf.)</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Active Customer Ecosystem</div>
              <div className="text-2xl font-bold text-white mt-1">452,000 Users</div>
              <div className="text-[11px] text-slate-400 mt-1">Nigeria 🇳🇬 (82%) • Niger Republic 🇳🇪 (18%)</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Active Early Warning Signals</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{alerts.length} Anomalies</div>
              <div className="text-[11px] text-amber-400/80 mt-1">1 Operations • 1 Agent Cash Float</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Pending Decision Cards (C-Suite)</div>
              <div className="text-2xl font-bold text-purple-300 mt-1">{decisions.filter((d) => d.status === "PENDING").length} Actions</div>
              <div className="text-[11px] text-purple-400/80 mt-1">Awaiting CFO & Cash Lead Approval</div>
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white">AI Decision Authority & Safety Architecture</h2>
            <p className="text-xs text-slate-400">
              The intelligence plane acts strictly as an analytical advisor. All predictive signals, forecasts, and recommendations pass through human-in-the-loop governance before execution by authoritative operational systems.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-950/60 border border-purple-500/30 rounded-xl">
                <div className="text-purple-400 font-bold uppercase text-[11px] mb-1">1. Analytical Projection</div>
                <div className="text-white">Customer 360 & RFM Models</div>
                <div className="text-slate-400 text-[10px] mt-1">Calculates CLV & churn probabilities without mutating raw customer balances.</div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-teal-500/30 rounded-xl">
                <div className="text-teal-400 font-bold uppercase text-[11px] mb-1">2. Predictive Forecasting</div>
                <div className="text-white">Multi-Horizon Forecasting</div>
                <div className="text-slate-400 text-[10px] mt-1">Predicts 7D, 30D, and 90D revenue and Nostro liquidity outflows with confidence intervals.</div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-emerald-500/30 rounded-xl">
                <div className="text-emerald-400 font-bold uppercase text-[11px] mb-1">3. Governed Action Routing</div>
                <div className="text-white">Maker-Checker Approvals</div>
                <div className="text-slate-400 text-[10px] mt-1">High-impact actions require explicit CFO/CRO authorization logged to immutable audit vault.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMER 360 & RFM */}
      {activeTab === "customer360" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Customer 360 Behavioral Intelligence & RFM Scoring</h2>
              <p className="text-xs text-slate-400">
                Recency, Frequency, Monetary (RFM) Segmentation, Historical vs Predicted CLV, and Churn Risk Telemetry.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Customer ID</th>
                  <th className="p-4">Masked Identity</th>
                  <th className="p-4">RFM Segment</th>
                  <th className="p-4">RFM Score</th>
                  <th className="p-4">Historical CLV</th>
                  <th className="p-4">Predicted CLV</th>
                  <th className="p-4">Churn Risk</th>
                  <th className="p-4">Primary Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-purple-300">{c.customerId}</td>
                    <td className="p-4 text-white font-medium">{c.fullNameMasked} ({c.jurisdiction})</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.rfmSegment === "CHAMPIONS"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : c.rfmSegment === "LOYAL_CUSTOMERS"
                          ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                          : c.rfmSegment === "AT_RISK"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}>
                        {c.rfmSegment}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      R:{c.recencyScore} F:{c.frequencyScore} M:{c.monetaryScore}
                    </td>
                    <td className="p-4 font-mono text-white">₦{c.historicalClvNgn.toLocaleString()}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">₦{c.predictedClvNgn.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.churnRiskBand === "HIGH" ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {(c.churnProbability * 100).toFixed(0)}% ({c.churnRiskBand})
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">{c.primaryChannel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AGENT & MERCHANT 360 */}
      {activeTab === "agent_merchant" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Agent & Merchant 360 Network Economics</h2>
              <p className="text-xs text-slate-400">
                Agent productivity scores, float stress probability, and merchant processing gross margins.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agents */}
            <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Agent Network Performance</h3>
              {agents.map((a) => (
                <div key={a.id} className="p-4 bg-slate-950/60 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-purple-300">{a.agentId}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {a.performanceTier}
                    </span>
                  </div>
                  <h4 className="font-bold text-white">{a.agentName} ({a.locationState}, {a.country})</h4>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300 pt-1">
                    <div>Productivity: <strong className="text-white">{a.productivityScore}%</strong></div>
                    <div>Liquidity Health: <strong className="text-teal-300">{a.liquidityHealthScore}%</strong></div>
                    <div>Cash Variance: <strong className="text-slate-400">{a.cashVarianceRate}%</strong></div>
                    <div>Float Stress Risk: <strong className={a.stressProbability > 0.2 ? "text-rose-400" : "text-emerald-400"}>{(a.stressProbability * 100).toFixed(0)}%</strong></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Merchants */}
            <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Commercial Merchant Gross Margins</h3>
              {merchants.map((m) => (
                <div key={m.id} className="p-4 bg-slate-950/60 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-300">{m.merchantId}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {m.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-white">{m.businessName}</h4>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300 pt-1">
                    <div>Monthly GMV: <strong className="text-white">₦{(m.monthlyGmvNgn / 1000000).toFixed(1)}M</strong></div>
                    <div>Processing Margin: <strong className="text-emerald-400">{m.processingMarginPct}%</strong></div>
                    <div>Dispute Ratio: <strong className="text-slate-400">{m.disputeRatioPct}%</strong></div>
                    <div>Growth Trend: <strong className="text-teal-300">+{m.growthTrendPct}%</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NETWORK TOPOLOGY GRAPH */}
      {activeTab === "network" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white">Ecosystem Network Topology & Concentration Graph</h2>
            <p className="text-xs text-slate-400">
              Graph modeling relationships between Bank Nodes (Providus/Coris), Agent Hubs, Merchants, and POS Hardware Terminals.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {graphData.nodes.map((node) => (
                <div key={node.id} className="p-4 bg-slate-950/60 border border-white/10 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">{node.nodeKey}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {node.nodeType}
                    </span>
                  </div>
                  <div className="text-white font-semibold">{node.label}</div>
                  <div className="text-slate-400 text-[10px]">Cluster: {node.clusterId}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FINANCIAL & LIQUIDITY FORECASTS */}
      {activeTab === "forecasting" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Multi-Horizon Financial & Liquidity Forecasts</h2>
              <p className="text-xs text-slate-400">
                Statistical ARIMA, LightGBM, and Holt-Winters models with P10, P50 (Median), and P90 confidence bounds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {forecasts.map((f) => (
              <div key={f.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-300">{f.forecastCode}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                    {f.horizon} Horizon
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">{f.targetMetric}</h3>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Expected Median (P50):</span>
                    <span className="font-bold text-emerald-400">₦{(f.predictedP50 / 1000000000).toFixed(2)}B</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">P10 Lower Bound:</span>
                    <span className="text-slate-300">₦{(f.lowerBoundP10 / 1000000000).toFixed(2)}B</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">P90 Upper Bound:</span>
                    <span className="text-teal-300">₦{(f.upperBoundP90 / 1000000000).toFixed(2)}B</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Model & Confidence:</span>
                    <span className="text-slate-300 font-sans">{f.modelVersion} ({(f.confidenceScore * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: EARLY WARNINGS & ANOMALIES */}
      {activeTab === "early_warnings" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Real-Time Anomaly Detection & Early Warnings</h2>
              <p className="text-xs text-slate-400">
                Automated statistical surveillance across Payment Switch Latency, Agent Float Depletion, and Liquidity Buffers.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {alerts.map((a) => (
              <div key={a.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-300">{a.alertCode}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      a.severity === "CRITICAL" || a.severity === "HIGH"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {a.severity}
                    </span>
                    <span className="text-xs text-slate-400">Domain: {a.domain}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                    {a.status}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">{a.title}</h3>
                <p className="text-xs text-slate-300">Primary Root Cause: {a.primaryDriver}</p>

                <div className="flex items-center gap-6 text-xs font-mono pt-2">
                  <div>Observed: <strong className="text-rose-400">{a.observedValue}</strong></div>
                  <div>Expected Baseline: <strong className="text-slate-300">{a.expectedValue}</strong></div>
                  <div>Deviation: <strong className="text-amber-400">+{a.deviationPct}%</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: WHAT-IF SCENARIO SANDBOX */}
      {activeTab === "scenarios" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white">What-If Scenario Simulation Sandbox</h2>
            <p className="text-xs text-slate-400">
              Simulate macroeconomic and operational shocks in a completely isolated virtual sandbox without altering ledger balances.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Simulation Controls Form */}
            <form onSubmit={handleRunSimulation} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Configure Stress Parameters</h3>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Scenario Title</label>
                <input
                  type="text"
                  value={scenarioForm.scenarioName}
                  onChange={(e) => setScenarioForm({ ...scenarioForm, scenarioName: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Transaction Volume Shock: {scenarioForm.volumeShockPct}%
                </label>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={scenarioForm.volumeShockPct}
                  onChange={(e) => setScenarioForm({ ...scenarioForm, volumeShockPct: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Providus Rail Downtime: {scenarioForm.providerDowntimeHours} Hours
                </label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={scenarioForm.providerDowntimeHours}
                  onChange={(e) => setScenarioForm({ ...scenarioForm, providerDowntimeHours: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  NGN/XOF FX Devaluation Shift: +{scenarioForm.fxShiftPct}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={scenarioForm.fxShiftPct}
                  onChange={(e) => setScenarioForm({ ...scenarioForm, fxShiftPct: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Corridor Liquidity Run Outflow: +{scenarioForm.liquidityRunPct}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={scenarioForm.liquidityRunPct}
                  onChange={(e) => setScenarioForm({ ...scenarioForm, liquidityRunPct: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Execute Isolated Simulation
              </button>
            </form>

            {/* Simulation Results */}
            <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Simulated Impact Scorecard</h3>

              {simulationResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/60 border border-purple-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-sm">{simulationResult.scenarioName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Resilience Classification</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                      simulationResult.resilienceRating === "STABLE"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {simulationResult.resilienceRating}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-slate-950/40 rounded-xl">
                      <span className="text-slate-400 text-[10px]">Projected Monthly Revenue:</span>
                      <div className="text-white font-bold text-sm mt-1">₦{(simulationResult.projectedRevenueNgn / 1000000000).toFixed(2)}B</div>
                      <div className="text-amber-400 text-[10px] mt-0.5">{simulationResult.revenueImpactPct}% Impact</div>
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-xl">
                      <span className="text-slate-400 text-[10px]">Projected EBITDA:</span>
                      <div className="text-white font-bold text-sm mt-1">₦{(simulationResult.projectedEbitdaNgn / 1000000000).toFixed(2)}B</div>
                      <div className="text-amber-400 text-[10px] mt-0.5">{simulationResult.ebitdaImpactPct}% Impact</div>
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-xl">
                      <span className="text-slate-400 text-[10px]">Liquidity Buffer Coverage:</span>
                      <div className="text-teal-300 font-bold text-sm mt-1">{simulationResult.liquidityBufferCoveragePct}%</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">Minimum statutory 100%</div>
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-xl">
                      <span className="text-slate-400 text-[10px]">Capital Solvency Ratio:</span>
                      <div className="text-emerald-400 font-bold text-sm mt-1">{simulationResult.capitalSolvencyRatioPct}%</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">CBN/BCEAO Threshold 110%</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Select parameters and click "Execute Isolated Simulation" to view projected resilience impact.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: GOVERNED DECISION CARDS */}
      {activeTab === "decisions" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Governed Decision Cards (Human-in-the-Loop)</h2>
              <p className="text-xs text-slate-400">
                Actionable recommendations synthesized by decision models requiring dual authorization prior to operational execution.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {decisions.map((dec) => (
              <div key={dec.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-300">{dec.decisionCode}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                        {dec.materialityTier}
                      </span>
                      <span className="text-xs text-slate-400">Domain: {dec.domain}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{dec.title}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {dec.status === "PENDING" ? (
                      <button
                        onClick={() => handleApproveDecision(dec.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Approve Action ({dec.approverRole})
                      </button>
                    ) : (
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                        ✓ APPROVED & ROUTED
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-2">
                  <div>
                    <span className="text-slate-400 font-semibold">Observed Telemetry: </span>
                    <span className="text-slate-200">{dec.observedTelemetry}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-semibold">Recommended Action: </span>
                    <span className="text-white">{dec.recommendedAction}</span>
                  </div>
                  <div>
                    <span className="text-teal-300 font-semibold">Expected Impact: </span>
                    <span className="text-slate-300">{dec.expectedImpact} (Confidence: {dec.confidencePct}%)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: ENTERPRISE AI COPILOT */}
      {activeTab === "copilot" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white">Enterprise AI Executive Copilot</h2>
            <p className="text-xs text-slate-400">
              Natural-language financial and risk intelligence grounded in governed warehouse facts with cognitive citation tags.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-6">
            {/* Conversation Stream */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {copilotHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Ask any question regarding financial performance, Nostro liquidity, agent productivity, or churn risks...
                  <div className="flex flex-wrap justify-center gap-2 mt-4 not-italic">
                    {[
                      "Why did gross fee revenue increase in August?",
                      "What is the projected 7-day liquidity demand for Providus Bank?",
                      "Which customer segments are at risk of churning?",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => setCopilotInput(prompt)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs border border-white/5"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                copilotHistory.map((item, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="p-3.5 bg-slate-800/80 rounded-xl text-xs text-white max-w-xl font-medium">
                      {item.query}
                    </div>

                    <div className="p-4 bg-slate-950/80 border border-purple-500/30 rounded-2xl text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                          {item.response.classificationTag}
                        </span>
                        <span className="text-slate-400 text-[10px] font-mono">
                          Confidence: {item.response.confidencePct}%
                        </span>
                      </div>

                      <div className="text-slate-200 whitespace-pre-line leading-relaxed">
                        {item.response.answer}
                      </div>

                      {item.response.citations.length > 0 && (
                        <div className="pt-2 border-t border-white/10">
                          <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Governed Source Citations:</div>
                          <div className="flex flex-wrap gap-2">
                            {item.response.citations.map((c, cIdx) => (
                              <span key={cIdx} className="px-2 py-0.5 bg-slate-900 border border-white/10 rounded text-[10px] text-teal-300 font-mono">
                                {c.sourceName} [{c.metricCode}]
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleCopilotQuery} className="flex gap-3">
              <input
                type="text"
                placeholder="Ask enterprise AI copilot (e.g., 'Compare NGN vs XOF cross-border corridor volume')..."
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={copilotLoading}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-900/30 transition-all flex items-center gap-2"
              >
                <Send className={`w-4 h-4 ${copilotLoading ? "animate-spin" : ""}`} />
                Analyze
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 10: MLOPS REGISTRY & KILL SWITCH */}
      {activeTab === "governance" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white">MLOps Model Registry & Emergency AI Kill Switches</h2>
            <p className="text-xs text-slate-400">
              Surveillance of model drift, validation metrics, and immediate emergency isolation controls for AI services.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Registry */}
            <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Deployed AI/ML Model Catalog</h3>
              {models.map((m) => (
                <div key={m.id} className="p-4 bg-slate-950/60 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-purple-300">{m.modelCode}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {m.status} • {m.driftStatus}
                    </span>
                  </div>
                  <h4 className="font-bold text-white">{m.modelName}</h4>
                  <div className="text-slate-300 font-mono text-[11px]">
                    Algorithm: <strong className="text-white">{m.algorithm}</strong> • Validation: <strong className="text-teal-300">{m.validationMetric}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Emergency Kill Switches */}
            <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Emergency AI Kill Switches</h3>
              <p className="text-xs text-slate-400">
                Instantly disable specific AI models or Copilot services without affecting core transactional banking.
              </p>

              <div className="space-y-3">
                {killSwitches.map((ks) => (
                  <div key={ks.id} className="p-4 bg-slate-950/60 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold font-mono text-white">{ks.switchTarget}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Status: <strong className={ks.isActive ? "text-rose-400" : "text-emerald-400"}>{ks.isActive ? "ACTIVE (PAUSED)" : "DEACTIVATED (LIVE)"}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleKillSwitch(ks.switchTarget, ks.isActive)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        ks.isActive
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-rose-600 hover:bg-rose-500 text-white"
                      }`}
                    >
                      {ks.isActive ? "Resume Live AI" : "Activate Kill Switch"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
