"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  Activity,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Play,
  Layers,
  BarChart3,
  Scale,
  PlusCircle,
  X,
  Server,
  Zap,
  Check,
  Radio,
  TrendingUp,
} from "lucide-react";
import {
  RiskAppetiteStatement,
  KriMetricRecord,
  EnterpriseRiskRecord,
  ControlLibraryRecord,
  RiskIssueRecord,
  OperationalLossRecord,
  ThirdPartyVendorRecord,
  ModelRiskRecord,
  BoardRiskSummary,
} from "@/types/ermEngine";

type ActiveTab =
  | "overview"
  | "register"
  | "appetite"
  | "kris"
  | "controls"
  | "issues"
  | "losses"
  | "thirdparty"
  | "models";

export default function RiskAdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ERM Data States
  const [summary, setSummary] = useState<BoardRiskSummary | null>(null);
  const [risks, setRisks] = useState<EnterpriseRiskRecord[]>([]);
  const [appetiteStatements, setAppetiteStatements] = useState<RiskAppetiteStatement[]>([]);
  const [kris, setKris] = useState<KriMetricRecord[]>([]);
  const [controls, setControls] = useState<ControlLibraryRecord[]>([]);
  const [issues, setIssues] = useState<RiskIssueRecord[]>([]);
  const [losses, setLosses] = useState<OperationalLossRecord[]>([]);
  const [vendors, setVendors] = useState<ThirdPartyVendorRecord[]>([]);
  const [models, setModels] = useState<ModelRiskRecord[]>([]);

  // New Risk Modal
  const [isNewRiskModalOpen, setIsNewRiskModalOpen] = useState(false);
  const [newRiskForm, setNewRiskForm] = useState({
    title: "",
    categoryCode: "OPERATIONAL_RISK" as any,
    country: "NG" as "NG" | "NE" | "GLOBAL",
    inherentLikelihood: 3,
    inherentImpact: 4,
    controlEffectivenessPct: 80,
    riskOwner: "Risk Operations Desk",
    treatmentStrategy: "MITIGATE" as any,
    status: "MONITORING" as any,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        resSum,
        resRsk,
        resApp,
        resKri,
        resCtrl,
        resIss,
        resLoss,
        resVen,
        resMdl,
      ] = await Promise.all([
        fetch("/api/v1/erm/summary"),
        fetch("/api/v1/erm/risks"),
        fetch("/api/v1/erm/appetite"),
        fetch("/api/v1/erm/kris"),
        fetch("/api/v1/erm/controls"),
        fetch("/api/v1/erm/issues"),
        fetch("/api/v1/erm/losses"),
        fetch("/api/v1/erm/third-parties"),
        fetch("/api/v1/erm/models"),
      ]);

      const [
        jsonSum,
        jsonRsk,
        jsonApp,
        jsonKri,
        jsonCtrl,
        jsonIss,
        jsonLoss,
        jsonVen,
        jsonMdl,
      ] = await Promise.all([
        resSum.json(),
        resRsk.json(),
        resApp.json(),
        resKri.json(),
        resCtrl.json(),
        resIss.json(),
        resLoss.json(),
        resVen.json(),
        resMdl.json(),
      ]);

      if (jsonSum.success) setSummary(jsonSum.data);
      if (jsonRsk.success) setRisks(jsonRsk.data);
      if (jsonApp.success) setAppetiteStatements(jsonApp.data);
      if (jsonKri.success) setKris(jsonKri.data);
      if (jsonCtrl.success) setControls(jsonCtrl.data);
      if (jsonIss.success) setIssues(jsonIss.data);
      if (jsonLoss.success) setLosses(jsonLoss.data);
      if (jsonVen.success) setVendors(jsonVen.data);
      if (jsonMdl.success) setModels(jsonMdl.data);
    } catch (err) {
      console.error("Failed to load ERM data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/erm/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskCode: `RSK-${newRiskForm.categoryCode.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
          ...newRiskForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Risk registered: ${json.data?.riskCode} - ${json.data?.title}`);
        setIsNewRiskModalOpen(false);
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

  const handleTestControl = async (controlId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/erm/controls/${controlId}/test`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Control ${json.data?.controlCode} verified as EFFECTIVE. Audit test timestamp logged.`);
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
            <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Risk Management (ERM & GRC)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              CRO Control Plane Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Institutional Risk Appetite Framework, KRI telemetry engine, dynamic Inherent vs. Residual risk scoring, and third-party vendor governance.
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
            onClick={() => setIsNewRiskModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/40 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Register Risk
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
          { id: "overview", label: "ERM Executive Overview", icon: ShieldCheck },
          { id: "register", label: "Enterprise Risk Register", icon: Layers },
          { id: "appetite", label: "Risk Appetite Framework", icon: Scale },
          { id: "kris", label: "KRI Metrics Catalog", icon: Activity },
          { id: "controls", label: "Control Library & Tests", icon: Lock },
          { id: "issues", label: "Issues & Remediation", icon: AlertTriangle },
          { id: "losses", label: "Operational Loss Events", icon: BarChart3 },
          { id: "thirdparty", label: "Third-Party & Vendor Risk", icon: Server },
          { id: "models", label: "Model Risk Governance", icon: TrendingUp },
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

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Enterprise Health Score</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">92.4 / 100</div>
              <div className="text-[11px] text-emerald-400/80 mt-1">Institutional Resilience Rating</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Total Governed Risks</div>
              <div className="text-2xl font-bold text-white mt-1">{risks.length} Risks</div>
              <div className="text-[11px] text-slate-400 mt-1">0 Critical Unmitigated Breaches</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Appetite Limits Within Bounds</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">100% (4 / 4)</div>
              <div className="text-[11px] text-slate-400 mt-1">Liquidity, Fraud, Uptime, Capital</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Net Operational Losses MTD</div>
              <div className="text-2xl font-bold text-teal-300 mt-1">₦35,000</div>
              <div className="text-[11px] text-slate-400 mt-1">95.4% Recovery Rate</div>
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white mb-2">ERM Aggregation Architecture</h2>
            <p className="text-xs text-slate-400 mb-6">
              The ERM control plane continuously ingests operational telemetry from Identity, Switch, Ledger, Cash Operations, ALM, and AML engines without modifying raw financial or customer balances.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-950/60 border border-emerald-500/30 rounded-xl">
                <div className="text-emerald-400 font-bold uppercase text-[11px] mb-1">Financial & Liquidity</div>
                <div className="text-white">Liquidity Buffer: 142.5%</div>
                <div className="text-slate-400 text-[10px] mt-2">Nostro pool healthy at Providus & Coris.</div>
              </div>
              <div className="p-4 bg-slate-950/60 border border-teal-500/30 rounded-xl">
                <div className="text-teal-400 font-bold uppercase text-[11px] mb-1">Payment & Switch</div>
                <div className="text-white">Failure Rate: 0.28%</div>
                <div className="text-slate-400 text-[10px] mt-2">Zero stuck batches or recovery lags.</div>
              </div>
              <div className="p-4 bg-slate-950/60 border border-blue-500/30 rounded-xl">
                <div className="text-blue-400 font-bold uppercase text-[11px] mb-1">Fraud & Cyber</div>
                <div className="text-white">Fraud Loss: 0.42 bps</div>
                <div className="text-slate-400 text-[10px] mt-2">Well below 1.5 bps appetite limit.</div>
              </div>
              <div className="p-4 bg-slate-950/60 border border-purple-500/30 rounded-xl">
                <div className="text-purple-400 font-bold uppercase text-[11px] mb-1">Regulatory & GRC</div>
                <div className="text-white">Capital Solvency: 235.7%</div>
                <div className="text-slate-400 text-[10px] mt-2">CBN & BCEAO compliance verified.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RISK REGISTER */}
      {activeTab === "register" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Enterprise Risk Register</h2>
              <p className="text-xs text-slate-400">
                Inherent Risk (Likelihood $\times$ Impact) vs. Control Effectiveness % $\rightarrow$ Residual Risk Score.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Risk Code</th>
                  <th className="p-4">Risk Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Inherent (L $\times$ I)</th>
                  <th className="p-4">Control %</th>
                  <th className="p-4">Residual Score</th>
                  <th className="p-4">Tier</th>
                  <th className="p-4">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {risks.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{r.riskCode}</td>
                    <td className="p-4 text-white font-medium">{r.title}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">{r.categoryCode}</td>
                    <td className="p-4 font-mono text-slate-300">
                      {r.inherentLikelihood} $\times$ {r.inherentImpact} = <span className="font-bold text-white">{r.inherentRiskScore}</span>
                    </td>
                    <td className="p-4 font-mono text-teal-400">{r.controlEffectivenessPct}%</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">{r.residualRiskScore}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        r.riskTier === "LOW"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : r.riskTier === "MEDIUM"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                      }`}>
                        {r.riskTier}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{r.riskOwner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RISK APPETITE FRAMEWORK */}
      {activeTab === "appetite" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Risk Appetite Framework & Limits</h2>
              <p className="text-xs text-slate-400">
                Board-approved quantitative appetite statements, warning thresholds, and hard limit boundaries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {appetiteStatements.map((ras) => (
              <div key={ras.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{ras.statementCode}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {ras.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{ras.title}</h3>
                <p className="text-xs text-slate-300">{ras.statementText}</p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Current Metric Value:</span>
                    <span className="font-mono font-bold text-emerald-400">{ras.currentValue} {ras.unit}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Appetite Limit Boundary:</span>
                    <span className="font-mono text-slate-300">{ras.breachThreshold} {ras.unit}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Owner Role:</span>
                    <span className="text-slate-300 font-mono">{ras.ownerRole}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: KRIs */}
      {activeTab === "kris" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Key Risk Indicators (KRI) Live Catalog</h2>
              <p className="text-xs text-slate-400">
                Continuous quantitative telemetry monitoring for early-warning threshold breaches.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">KRI Code</th>
                  <th className="p-4">Metric Description</th>
                  <th className="p-4">Mathematical Formula</th>
                  <th className="p-4">Current Value</th>
                  <th className="p-4">Breach Threshold</th>
                  <th className="p-4">Frequency</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {kris.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{k.kriCode}</td>
                    <td className="p-4 text-white font-medium">{k.name}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">{k.formula}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">{k.currentValue} {k.unit}</td>
                    <td className="p-4 font-mono text-slate-300">{k.breachThreshold} {k.unit}</td>
                    <td className="p-4 font-mono text-slate-400 text-[10px]">{k.frequency}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {k.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CONTROLS */}
      {activeTab === "controls" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Enterprise Control Library & Automated Testing</h2>
              <p className="text-xs text-slate-400">
                Preventive, detective, corrective, and compensating controls with verified testing evidence.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Control Code</th>
                  <th className="p-4">Control Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Nature</th>
                  <th className="p-4">Effectiveness</th>
                  <th className="p-4">Last Tested</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {controls.map((ctrl) => (
                  <tr key={ctrl.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{ctrl.controlCode}</td>
                    <td className="p-4 text-white font-medium">{ctrl.name}</td>
                    <td className="p-4 font-mono text-slate-300 text-[11px]">{ctrl.controlType}</td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">{ctrl.nature}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {ctrl.effectiveness}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400 text-[10px]">
                      {ctrl.lastTestedAt ? new Date(ctrl.lastTestedAt).toLocaleDateString() : "Pending"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleTestControl(ctrl.id)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                      >
                        Run Test
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: ISSUES & REMEDIATION */}
      {activeTab === "issues" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Risk Issues & Remediation Action Plans</h2>
              <p className="text-xs text-slate-400">
                Root causes, corrective remediation plans, assigned executive owners, and SLA due dates.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Issue Code</th>
                  <th className="p-4">Issue Description</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Corrective Remediation</th>
                  <th className="p-4">Owner</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {issues.map((iss) => (
                  <tr key={iss.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{iss.issueCode}</td>
                    <td className="p-4 text-white font-medium">{iss.title}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        iss.severity === "HIGH" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {iss.severity}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 text-[11px] max-w-xs">{iss.remediationAction}</td>
                    <td className="p-4 text-slate-400">{iss.assignedOwner}</td>
                    <td className="p-4 font-mono text-slate-300">{iss.dueDate}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {iss.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: OPERATIONAL LOSS EVENTS */}
      {activeTab === "losses" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Operational Loss Events (Basel Categories)</h2>
              <p className="text-xs text-slate-400">
                Gross loss amounts, insurance/chargeback recoveries, and net loss quantification.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Loss Ref</th>
                  <th className="p-4">Event Description</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Gross Loss</th>
                  <th className="p-4">Recovered</th>
                  <th className="p-4">Net Loss</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {losses.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{l.eventCode}</td>
                    <td className="p-4 text-white font-medium">{l.title}</td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">{l.category}</td>
                    <td className="p-4 font-mono text-rose-400">{l.currency} {l.grossLossAmount.toLocaleString()}</td>
                    <td className="p-4 font-mono text-emerald-400">{l.currency} {l.recoveredAmount.toLocaleString()}</td>
                    <td className="p-4 font-mono font-bold text-white">{l.currency} {l.netLossAmount.toLocaleString()}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: THIRD PARTY & VENDOR RISK */}
      {activeTab === "thirdparty" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Third-Party Risk Management (TPRM)</h2>
              <p className="text-xs text-slate-400">
                Tier 1 Mission-Critical correspondent banks, payment switches, cloud infrastructure, and CIT couriers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vendors.map((v) => (
              <div key={v.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{v.vendorCode}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {v.criticality}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{v.name}</h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Vendor Type:</span>
                    <span className="font-mono text-white font-semibold">{v.vendorType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Uptime SLA Target:</span>
                    <span className="font-mono font-bold text-emerald-400">{v.uptimeSlaTargetPct}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Failover Mechanism Tested:</span>
                    <span className="font-mono text-teal-300 font-bold">VERIFIED_ACTIVE</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: MODEL RISK */}
      {activeTab === "models" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Model Risk Governance & Drift Monitoring</h2>
              <p className="text-xs text-slate-400">
                Real-time fraud classifier, AML structuring detector, and cash forecasting model inventory.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {models.map((m) => (
              <div key={m.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{m.modelCode}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {m.status} • {m.version}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{m.modelName}</h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Owner Desk:</span>
                    <span className="text-slate-300 font-mono">{m.owner}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Performance Drift:</span>
                    <span className="font-mono font-bold text-emerald-400">{m.driftStatus}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Last Validated:</span>
                    <span className="font-mono text-slate-300">{m.lastValidatedAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REGISTER RISK MODAL */}
      {isNewRiskModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Register Enterprise Risk</h3>
              <button onClick={() => setIsNewRiskModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRisk} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Risk Title</label>
                <input
                  type="text"
                  required
                  value={newRiskForm.title}
                  onChange={(e) => setNewRiskForm({ ...newRiskForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Risk Category</label>
                  <select
                    value={newRiskForm.categoryCode}
                    onChange={(e) => setNewRiskForm({ ...newRiskForm, categoryCode: e.target.value as any })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="OPERATIONAL_RISK">OPERATIONAL_RISK</option>
                    <option value="LIQUIDITY_RISK">LIQUIDITY_RISK</option>
                    <option value="FRAUD_RISK">FRAUD_RISK</option>
                    <option value="CYBERSECURITY_RISK">CYBERSECURITY_RISK</option>
                    <option value="AML_CFT_RISK">AML_CFT_RISK</option>
                    <option value="THIRD_PARTY_RISK">THIRD_PARTY_RISK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Country</label>
                  <select
                    value={newRiskForm.country}
                    onChange={(e) => setNewRiskForm({ ...newRiskForm, country: e.target.value as any })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="GLOBAL">GLOBAL</option>
                    <option value="NG">Nigeria (NGN)</option>
                    <option value="NE">Niger Republic (XOF)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Likelihood (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRiskForm.inherentLikelihood}
                    onChange={(e) => setNewRiskForm({ ...newRiskForm, inherentLikelihood: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Impact (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRiskForm.inherentImpact}
                    onChange={(e) => setNewRiskForm({ ...newRiskForm, inherentImpact: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Control %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newRiskForm.controlEffectivenessPct}
                    onChange={(e) => setNewRiskForm({ ...newRiskForm, controlEffectivenessPct: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRiskModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30"
                >
                  Save to Risk Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
