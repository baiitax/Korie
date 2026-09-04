"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Smartphone,
  Coins,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  Eye,
  Sliders,
  X,
  Send,
  UserCheck,
  Award,
  Lock,
  Cpu,
  Radio,
  Clock,
  HelpCircle,
  Scale,
  DollarSign,
  FileText,
  MapPin,
  Check,
  Zap,
} from "lucide-react";
import { AgentRecord, AgentStatus, AgentTier, TerminalRecord } from "@/types/agentDeviceTerminalEngine";
import { AgencyDeviceRecord, AgentCashCountRecord, AgencyConsumerComplaintRecord } from "@/types/agencyEngine";

type ActiveTab = "agents" | "devices" | "terminals" | "authz" | "reconciliation" | "complaints" | "regulatory";

export default function AgentsAdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("agents");
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [terminals, setTerminals] = useState<TerminalRecord[]>([]);
  const [devices, setDevices] = useState<AgencyDeviceRecord[]>([]);
  const [cashCounts, setCashCounts] = useState<AgentCashCountRecord[]>([]);
  const [complaints, setComplaints] = useState<AgencyConsumerComplaintRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("GLOBAL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [selectedAgent, setSelectedAgent] = useState<AgentRecord | null>(null);
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Authz Simulator State
  const [authzAgentId, setAuthzAgentId] = useState("agt-ng-001");
  const [authzDeviceId, setAuthzDeviceId] = useState("DEV-POS-NG-01");
  const [authzTerminalId, setAuthzTerminalId] = useState("TID-NG-009182");
  const [authzTxType, setAuthzTxType] = useState("CASH_OUT");
  const [authzAmount, setAuthzAmount] = useState("25000");
  const [authzCurrency, setAuthzCurrency] = useState<"NGN" | "XOF">("NGN");
  const [authzResult, setAuthzResult] = useState<any>(null);
  const [authzEvaluating, setAuthzEvaluating] = useState(false);

  // Cash Count Form
  const [cashCountAgentId, setCashCountAgentId] = useState("agt-ng-001");
  const [denom1000, setDenom1000] = useState("1500");
  const [denom500, setDenom500] = useState("700");
  const [denom200, setDenom200] = useState("0");
  const [expectedCash, setExpectedCash] = useState("1850000");

  // Forms
  const [newAgentForm, setNewAgentForm] = useState({
    legalName: "",
    tradingName: "",
    country: "NG" as "NG" | "NE",
    currency: "NGN" as "NGN" | "XOF",
    phone: "",
    email: "",
    region: "North Central",
    stateOrProvince: "FCT Abuja",
    lgaOrDistrict: "AMAC",
    tier: "TIER_1" as AgentTier,
    riskTier: "LOW" as const,
    dailyTransactionLimit: 1000000,
    singleTransactionLimit: 100000,
    maxCashHolding: 2000000,
    tenantId: "tenant-korie-core",
  });

  const [limitsForm, setLimitsForm] = useState({
    dailyLimit: "2500000",
    singleLimit: "200000",
    maxCash: "5000000",
  });

  const [statusForm, setStatusForm] = useState({
    newStatus: "ACTIVE" as AgentStatus,
    reasonCode: "VERIFIED_OPERATIONS",
    notes: "Verified by Compliance Desk",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Agents
      const resAgents = await fetch(`/api/agents?country=${countryFilter}`);
      const jsonAgents = await resAgents.json();
      if (jsonAgents.success && jsonAgents.data) {
        setAgents(jsonAgents.data.agents || []);
      }

      // Terminals
      const resTerm = await fetch(`/api/terminals`);
      const jsonTerm = await resTerm.json();
      if (jsonTerm.success && jsonTerm.data) {
        setTerminals(jsonTerm.data.terminals || []);
      }

      // Devices
      const resDev = await fetch(`/api/v1/agency/devices`);
      const jsonDev = await resDev.json();
      if (jsonDev.success && jsonDev.data) {
        setDevices(jsonDev.data || []);
      }

      // Cash Counts
      const resCash = await fetch(`/api/v1/agency/cash-counts`);
      const jsonCash = await resCash.json();
      if (jsonCash.success && jsonCash.data) {
        setCashCounts(jsonCash.data || []);
      }

      // Complaints
      const resComp = await fetch(`/api/v1/agency/complaints`);
      const jsonComp = await resComp.json();
      if (jsonComp.success && jsonComp.data) {
        setComplaints(jsonComp.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch agency data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [countryFilter]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAgentForm),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Agent onboarded successfully: ${json.agent?.agentCode}`);
        setIsNewAgentModalOpen(false);
        fetchData();
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_LIMITS",
          dailyLimit: Number(limitsForm.dailyLimit),
          singleLimit: Number(limitsForm.singleLimit),
          maxCash: Number(limitsForm.maxCash),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Limits updated for ${selectedAgent.agentCode}`);
        setIsLimitsModalOpen(false);
        fetchData();
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TRANSITION_STATUS",
          newStatus: statusForm.newStatus,
          reasonCode: statusForm.reasonCode,
          notes: statusForm.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Status changed to ${statusForm.newStatus} for ${selectedAgent.agentCode}`);
        setIsStatusModalOpen(false);
        fetchData();
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAuthzSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthzEvaluating(true);
    try {
      const res = await fetch("/api/v1/agency/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: authzAgentId,
          deviceId: authzDeviceId,
          terminalId: authzTerminalId,
          transactionType: authzTxType,
          amount: parseFloat(authzAmount),
          currency: authzCurrency,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAuthzResult(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuthzEvaluating(false);
    }
  };

  const handleSubmitCashCount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/agency/cash-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: cashCountAgentId,
          currency: "NGN",
          denominationBreakdown: {
            "1000": parseInt(denom1000, 10) || 0,
            "500": parseInt(denom500, 10) || 0,
            "200": parseInt(denom200, 10) || 0,
          },
          expectedCash: parseFloat(expectedCash) || 0,
          submittedBy: "admin@koriepay.com",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Cash count submitted with status: ${json.data.status}`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveComplaint = async (complaintId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/agency/complaints/${complaintId}/redress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: "Customer debited in error; double-entry refund posted to customer wallet from redress expense GL.",
          resolvedBy: "admin@koriepay.com",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Complaint ${json.data.complaintReference} resolved with GL redress journal ${json.data.glJournalId}`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      search === "" ||
      a.agentCode.toLowerCase().includes(search.toLowerCase()) ||
      a.tradingName.toLowerCase().includes(search.toLowerCase()) ||
      a.phone.includes(search);
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Agency Banking Command Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              CBN & BCEAO Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative fleet governance, device trust attestation, POS terminal custody, float subledgers, and consumer grievance redress.
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
            onClick={() => setIsNewAgentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/40 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Onboard Agent
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
          { id: "agents", label: "Agent Master & KYC", icon: Building2 },
          { id: "devices", label: "Device Trust & Attestation", icon: Smartphone },
          { id: "terminals", label: "POS Fleet & Custody", icon: Cpu },
          { id: "authz", label: "Channel Authorization", icon: Zap },
          { id: "reconciliation", label: "Cash Till & Float", icon: Coins },
          { id: "complaints", label: "Consumer Redress", icon: HelpCircle },
          { id: "regulatory", label: "Regulatory Control", icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
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

      {/* TAB 1: AGENTS */}
      {activeTab === "agents" && (
        <div className="space-y-6">
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Total Active Agents</div>
              <div className="text-2xl font-bold text-white mt-1">
                {agents.filter((a) => a.status === "ACTIVE").length}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Across NG & NE Networks
              </div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Combined Electronic Float</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ₦{agents.reduce((acc, a) => acc + (a.currency === "NGN" ? a.floatBalance : 0), 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Core Ledger Float Subledger</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Under Review / Risk Held</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {agents.filter((a) => a.status === "UNDER_REVIEW" || a.status === "SUSPENDED").length}
              </div>
              <div className="text-[11px] text-amber-400/80 mt-1">Pending Compliance Clearance</div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
              <div className="text-xs font-mono uppercase text-slate-400">Average Quality Score</div>
              <div className="text-2xl font-bold text-teal-400 mt-1">94.8%</div>
              <div className="text-[11px] text-teal-400/80 mt-1">SLA & Operational Uptime</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900/40 border border-white/5 rounded-xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search agent code, name, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-slate-800 border border-white/10 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="GLOBAL">All Jurisdictions</option>
                <option value="NG">Nigeria (CBN / NGN)</option>
                <option value="NE">Niger Republic (BCEAO / XOF)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-white/10 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          {/* Agents Table */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="p-4">Agent Identifier</th>
                    <th className="p-4">Trading Name & Location</th>
                    <th className="p-4">Tier & Risk</th>
                    <th className="p-4">Float Balance</th>
                    <th className="p-4">Daily Limit</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono font-semibold text-emerald-400">
                        {agent.agentCode}
                        <div className="text-[10px] text-slate-500 font-normal">{agent.country} • {agent.currency}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-white">{agent.tradingName}</div>
                        <div className="text-[11px] text-slate-400">{agent.stateOrProvince}, {agent.region}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-white/10">
                          {agent.tier}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">Risk: {agent.riskTier}</div>
                      </td>
                      <td className="p-4 font-mono font-semibold text-white">
                        {agent.currency} {agent.floatBalance.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-slate-300">
                        {agent.currency} {agent.dailyTransactionLimit.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            agent.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : agent.status === "UNDER_REVIEW"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {agent.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedAgent(agent);
                              setLimitsForm({
                                dailyLimit: agent.dailyTransactionLimit.toString(),
                                singleLimit: agent.singleTransactionLimit.toString(),
                                maxCash: agent.maxCashHolding.toString(),
                              });
                              setIsLimitsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Configure Limits"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAgent(agent);
                              setStatusForm({
                                newStatus: agent.status,
                                reasonCode: "GOVERNANCE_REVIEW",
                                notes: "Admin review initiated",
                              });
                              setIsStatusModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Change Lifecycle Status"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEVICE TRUST */}
      {activeTab === "devices" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Device Trust & Hardware Security Registry</h2>
              <p className="text-xs text-slate-400">
                Cryptographic hardware fingerprinting, Google Play Integrity tokens, and root/jailbreak detection.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Device ID</th>
                  <th className="p-4">Assigned Agent</th>
                  <th className="p-4">Manufacturer & Model</th>
                  <th className="p-4">Attestation Score</th>
                  <th className="p-4">Root / Integrity</th>
                  <th className="p-4">Trust Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {devices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{dev.deviceId}</td>
                    <td className="p-4 text-white font-medium">{dev.agentName}</td>
                    <td className="p-4 text-slate-300">{dev.manufacturer} - {dev.model}</td>
                    <td className="p-4 font-mono text-teal-400">{dev.attestationScore}%</td>
                    <td className="p-4">
                      {dev.isRooted ? (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> ROOTED / COMPROMISED
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> SECURE_ENCLAVE
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        dev.trustLevel === "TRUSTED"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}>
                        {dev.trustLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TERMINALS */}
      {activeTab === "terminals" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">POS Terminal Fleet & Custody Management</h2>
              <p className="text-xs text-slate-400">
                Hardware inventory serials, firmware versions, battery telemetry, and geofence enforcement.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Terminal ID (TID)</th>
                  <th className="p-4">Serial Number</th>
                  <th className="p-4">Hardware Model</th>
                  <th className="p-4">Battery & Signal</th>
                  <th className="p-4">Geofence State</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {terminals.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{t.terminalId}</td>
                    <td className="p-4 font-mono text-slate-400">{t.serialNumber}</td>
                    <td className="p-4 text-white">{t.manufacturer} {t.model}</td>
                    <td className="p-4 font-mono text-slate-300">{t.batteryLevel}% • {t.networkType}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        t.currentLocationState === "IN_ZONE" ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                      }`}>
                        {t.currentLocationState}
                      </span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CHANNEL AUTHORIZATION */}
      {activeTab === "authz" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white mb-2">Channel Authorization Simulator</h2>
            <p className="text-xs text-slate-400 mb-6">
              Simulate multi-dimensional channel authorization across Agent Status, Device Attestation, Terminal Inventory, Geofence, and Limit policies.
            </p>

            <form onSubmit={handleRunAuthzSimulation} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Agent ID</label>
                <input
                  type="text"
                  value={authzAgentId}
                  onChange={(e) => setAuthzAgentId(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Device ID</label>
                  <input
                    type="text"
                    value={authzDeviceId}
                    onChange={(e) => setAuthzDeviceId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Terminal ID</label>
                  <input
                    type="text"
                    value={authzTerminalId}
                    onChange={(e) => setAuthzTerminalId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Tx Type</label>
                  <select
                    value={authzTxType}
                    onChange={(e) => setAuthzTxType(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="CASH_OUT">CASH_OUT</option>
                    <option value="CASH_IN">CASH_IN</option>
                    <option value="TRANSFER">TRANSFER</option>
                    <option value="BILL_PAYMENT">BILL_PAYMENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Amount</label>
                  <input
                    type="number"
                    value={authzAmount}
                    onChange={(e) => setAuthzAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Currency</label>
                  <select
                    value={authzCurrency}
                    onChange={(e) => setAuthzCurrency(e.target.value as "NGN" | "XOF")}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="NGN">NGN</option>
                    <option value="XOF">XOF</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={authzEvaluating}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
              >
                {authzEvaluating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Evaluate Channel Policy
              </button>
            </form>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-2">Authorization Decision Result</h3>
              <p className="text-xs text-slate-400 mb-4">Live policy evaluation breakdown and reason codes.</p>

              {authzResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${
                    authzResult.decision === "ALLOW"
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-400"
                  }`}>
                    <div className="text-xl font-bold font-mono">DECISION: {authzResult.decision}</div>
                    <div className="text-xs mt-1">Authorized: {authzResult.authorized ? "TRUE" : "FALSE"}</div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-white/5 font-mono text-xs text-slate-300">
                    <div className="text-slate-500 uppercase text-[10px] mb-2 font-semibold">Reason Codes:</div>
                    <ul className="list-disc pl-4 space-y-1">
                      {authzResult.reasonCodes?.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                    <div className="text-[10px] text-slate-500 mt-4">Evaluated At: {authzResult.evaluatedAt}</div>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                  Run a simulation on the left to see policy results
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CASH RECONCILIATION */}
      {activeTab === "reconciliation" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 p-6 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h3 className="text-base font-bold text-white mb-2">Submit Daily Cash Count</h3>
            <p className="text-xs text-slate-400 mb-4">End-of-day physical till denomination count.</p>

            <form onSubmit={handleSubmitCashCount} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Agent</label>
                <select
                  value={cashCountAgentId}
                  onChange={(e) => setCashCountAgentId(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.tradingName} ({a.agentCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">₦1,000 Notes Count</label>
                <input
                  type="number"
                  value={denom1000}
                  onChange={(e) => setDenom1000(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">₦500 Notes Count</label>
                <input
                  type="number"
                  value={denom500}
                  onChange={(e) => setDenom500(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Expected Closing Cash</label>
                <input
                  type="number"
                  value={expectedCash}
                  onChange={(e) => setExpectedCash(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow-lg shadow-emerald-900/30"
              >
                Submit Reconciliation Count
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Cash Reconciliation Audits</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="p-4">Agent ID</th>
                    <th className="p-4">Total Counted</th>
                    <th className="p-4">Expected Cash</th>
                    <th className="p-4">Variance</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cashCounts.map((cc) => (
                    <tr key={cc.id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-mono text-emerald-400">{cc.agentId}</td>
                      <td className="p-4 font-mono font-semibold text-white">
                        {cc.currency} {cc.totalPhysicalCash.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-slate-400">
                        {cc.currency} {cc.expectedCash.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-300">
                        {cc.currency} {cc.varianceAmount.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          cc.status === "MATCHED"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                        }`}>
                          {cc.status}
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

      {/* TAB 6: CONSUMER PROTECTION & REDRESS */}
      {activeTab === "complaints" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Consumer Protection & Redress Governance</h2>
              <p className="text-xs text-slate-400">
                Statutory 24h P0 resolution SLA clock, disputed transaction logs, and immutable General Ledger redress compensations.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-4">Complaint Ref</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Disputed Amount</th>
                  <th className="p-4">Priority & SLA</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Redress Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {complaints.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-semibold text-emerald-400">{comp.complaintReference}</td>
                    <td className="p-4">
                      <div className="text-white font-medium">{comp.customerName}</div>
                      <div className="text-[10px] text-slate-400">{comp.customerPhone}</div>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{comp.category}</td>
                    <td className="p-4 font-mono text-white font-semibold">
                      {comp.currency} {comp.disputedAmount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                        {comp.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        comp.status === "RESOLVED"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}>
                        {comp.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {comp.status !== "RESOLVED" ? (
                        <button
                          onClick={() => handleResolveComplaint(comp.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow"
                        >
                          Approve Redress
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">Redress Posted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: REGULATORY CONTROL */}
      {activeTab === "regulatory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🇳🇬</span>
              <div>
                <h3 className="text-base font-bold text-white">Central Bank of Nigeria (CBN)</h3>
                <p className="text-xs text-slate-400">Framework: CBN/BSD/DIR/GEN/09/2025</p>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Single Transaction Cap</span>
                <span className="font-mono text-white font-semibold">₦200,000</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Daily Transaction Cap</span>
                <span className="font-mono text-white font-semibold">₦2,500,000</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Max Physical Cash in Till</span>
                <span className="font-mono text-white font-semibold">₦5,000,000</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">P0 Statutory Grievance Resolution SLA</span>
                <span className="font-mono text-emerald-400 font-semibold">24 Hours</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🇳🇪</span>
              <div>
                <h3 className="text-base font-bold text-white">BCEAO (UEMOA / Niger Republic)</h3>
                <p className="text-xs text-slate-400">Framework: BCEAO/DSP/UEMOA/04/2026</p>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Single Transaction Cap</span>
                <span className="font-mono text-white font-semibold">500,000 XOF</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Daily Transaction Cap</span>
                <span className="font-mono text-white font-semibold">5,000,000 XOF</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Max Physical Cash in Till</span>
                <span className="font-mono text-white font-semibold">10,000,000 XOF</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">P0 Statutory Grievance Resolution SLA</span>
                <span className="font-mono text-emerald-400 font-semibold">48 Hours</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIMITS MODAL */}
      {isLimitsModalOpen && selectedAgent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Configure Agent Limits</h3>
              <button onClick={() => setIsLimitsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLimits} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Daily Limit ({selectedAgent.currency})
                </label>
                <input
                  type="number"
                  value={limitsForm.dailyLimit}
                  onChange={(e) => setLimitsForm({ ...limitsForm, dailyLimit: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Single Tx Limit ({selectedAgent.currency})
                </label>
                <input
                  type="number"
                  value={limitsForm.singleLimit}
                  onChange={(e) => setLimitsForm({ ...limitsForm, singleLimit: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Max Till Cash ({selectedAgent.currency})
                </label>
                <input
                  type="number"
                  value={limitsForm.maxCash}
                  onChange={(e) => setLimitsForm({ ...limitsForm, maxCash: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLimitsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  Save Limits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      {isStatusModalOpen && selectedAgent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Transition Agent Status</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">New Lifecycle Status</label>
                <select
                  value={statusForm.newStatus}
                  onChange={(e) => setStatusForm({ ...statusForm, newStatus: e.target.value as AgentStatus })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Reason Code</label>
                <input
                  type="text"
                  value={statusForm.reasonCode}
                  onChange={(e) => setStatusForm({ ...statusForm, reasonCode: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Notes</label>
                <textarea
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  Confirm Transition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW AGENT MODAL */}
      {isNewAgentModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Onboard New Agent</h3>
              <button onClick={() => setIsNewAgentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Country</label>
                  <select
                    value={newAgentForm.country}
                    onChange={(e) => {
                      const c = e.target.value as "NG" | "NE";
                      setNewAgentForm({
                        ...newAgentForm,
                        country: c,
                        currency: c === "NG" ? "NGN" : "XOF",
                        stateOrProvince: c === "NG" ? "FCT Abuja" : "Niamey Capitale",
                        region: c === "NG" ? "North Central" : "Niamey",
                      });
                    }}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="NG">Nigeria (NGN)</option>
                    <option value="NE">Niger Republic (XOF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Agent Tier</label>
                  <select
                    value={newAgentForm.tier}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, tier: e.target.value as AgentTier })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="TIER_1">Tier 1 (Entry)</option>
                    <option value="TIER_2">Tier 2 (Standard)</option>
                    <option value="TIER_3">Tier 3 (High Volume)</option>
                    <option value="SUPER_AGENT">Super Agent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Trading Name</label>
                  <input
                    type="text"
                    required
                    value={newAgentForm.tradingName}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, tradingName: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Legal Name</label>
                  <input
                    type="text"
                    required
                    value={newAgentForm.legalName}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, legalName: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newAgentForm.phone}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={newAgentForm.email}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, email: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewAgentModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
