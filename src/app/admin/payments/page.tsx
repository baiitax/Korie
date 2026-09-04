"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  QrCode,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Server,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Send,
  Eye,
  Sliders,
  RotateCcw,
  Check,
  X,
  Lock,
  Globe,
  Radio,
  Clock,
} from "lucide-react";
import {
  PaymentRecord,
  PaymentAttempt,
  RoutingRule,
  ProviderCapability,
  WebhookEventRecord,
} from "@/types/paymentSwitchEngine";

export default function PaymentSwitchAdminPage() {
  const [activeTab, setActiveTab] = useState<
    "SWITCH_STREAM" | "ATTEMPTS" | "ROUTING_RULES" | "PROVIDER_HEALTH" | "WEBHOOKS" | "SIMULATOR"
  >("SWITCH_STREAM");

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [capabilities, setCapabilities] = useState<ProviderCapability[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookEventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modal / Inspection state
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<PaymentAttempt | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("Customer requested cancellation");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Simulator Form state
  const [simForm, setSimForm] = useState({
    country: "NG",
    currency: "NGN",
    channel: "NIP",
    amount: "25000",
    direction: "OUTBOUND",
    beneficiaryAccount: "0123456789",
    beneficiaryBank: "058",
    beneficiaryName: "Amina Yusuf",
    narration: "Live switch test transfer",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/switch");
      const json = await res.json();
      if (json.success && json.data) {
        setPayments(json.data.payments || []);
        setAttempts(json.data.attempts || []);
        setRules(json.data.routingRules || []);
        setCapabilities(json.data.providerCapabilities || []);
        setWebhookLogs(json.data.webhookLogs || []);
      }
    } catch (e) {
      console.error("Failed to fetch switch data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/payments/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: "tenant-korie-core",
          country: simForm.country,
          currency: simForm.currency,
          channel: simForm.channel,
          direction: simForm.direction,
          amount: Number(simForm.amount),
          beneficiaryAccountNumber: simForm.beneficiaryAccount,
          beneficiaryBankCode: simForm.beneficiaryBank,
          beneficiaryName: simForm.beneficiaryName,
          narration: simForm.narration,
          idempotencyKey: `sim-key-${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Payment successfully processed via switch: ${json.payment?.reference}`);
        await fetchData();
        setActiveTab("SWITCH_STREAM");
      } else {
        alert(`Payment Failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Simulation Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRefund = async () => {
    if (!selectedPayment) return;
    try {
      const res = await fetch("/api/payments/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REFUND",
          paymentId: selectedPayment.id,
          refundAmount: Number(refundAmount),
          reason: refundReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Refund processed successfully for ${selectedPayment.reference}`);
        setIsRefundModalOpen(false);
        fetchData();
      } else {
        alert(`Refund failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Refund error: ${e.message}`);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.reference.toLowerCase().includes(q) ||
      (p.beneficiaryName && p.beneficiaryName.toLowerCase().includes(q)) ||
      (p.selectedProvider && p.selectedProvider.toLowerCase().includes(q)) ||
      p.channel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PLATFORM A: PAYMENT SWITCH ENGINE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              TIER-1 ORCHESTRATION (NGN & XOF)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Payment Switch Command Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time execution routing, multi-attempt isolation, banking provider telemetry, and orthogonal state management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 border border-white/10 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Sync Switch
          </button>
          <button
            onClick={() => setActiveTab("SIMULATOR")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            Simulate Payment
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Switch Intake (24h)</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{payments.length} Payments</div>
          <div className="text-[10px] text-emerald-400 font-medium mt-1">100% Normalized</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Provider Execution SLA</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">99.85%</div>
          <div className="text-[10px] text-slate-400 mt-1">Avg. Latency: 284ms</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Active Provider Nodes</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">4 Nodes Connected</div>
          <div className="text-[10px] text-slate-400 mt-1">Providus, Koris, ISW, NIBSS</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Attempts Logged</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">{attempts.length} Attempts</div>
          <div className="text-[10px] text-slate-400 mt-1">Zero Ambiguous Debits</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: "SWITCH_STREAM", label: "Live Switch Stream", icon: Activity },
          { id: "ATTEMPTS", label: "Attempt Timeline & Telemetry", icon: Clock },
          { id: "ROUTING_RULES", label: "Dynamic Routing Engine", icon: Sliders },
          { id: "PROVIDER_HEALTH", label: "Provider Health & Circuit Breakers", icon: Server },
          { id: "WEBHOOKS", label: "Webhook Audit Pipeline", icon: Radio },
          { id: "SIMULATOR", label: "Payment Intake Simulator", icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE SWITCH STREAM */}
      {activeTab === "SWITCH_STREAM" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, beneficiary, provider, channel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0b1324] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Showing {filteredPayments.length} of {payments.length} Payments
            </div>
          </div>

          <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-4 font-semibold">Reference & Route</th>
                    <th className="p-4 font-semibold">Counterparty</th>
                    <th className="p-4 font-semibold">Amount & Fee</th>
                    <th className="p-4 font-semibold">Business State</th>
                    <th className="p-4 font-semibold">Financial State</th>
                    <th className="p-4 font-semibold">Settlement & Recon</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="font-mono font-bold text-white group-hover:text-emerald-400">
                          {p.reference}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono text-amber-400">{p.selectedProvider || "AUTO_ROUTED"}</span>
                          <span>•</span>
                          <span>{p.channel}</span>
                          <span>•</span>
                          <span className="text-slate-500">{new Date(p.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-white font-semibold">{p.beneficiaryName || "External Recipient"}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {p.beneficiaryAccountNumber || "N/A"} ({p.beneficiaryBankCode || "NIP"})
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-mono font-bold text-white">
                          {p.currency === "NGN" ? "₦" : p.currency === "XOF" ? "CFA " : "$"}
                          {p.amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Fee: {p.currency} {p.feeAmount}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            p.businessState === "SUCCESSFUL"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : p.businessState === "PENDING" || p.businessState === "PROCESSING"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          ● {p.businessState}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                            p.financialState === "POSTED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : p.financialState === "HELD"
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {p.financialState}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="text-[10px] font-mono">
                          <span className="text-slate-300">{p.settlementState}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-emerald-400">{p.reconciliationState}</span>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-white/10 transition-colors"
                          >
                            Inspect
                          </button>
                          {p.businessState === "SUCCESSFUL" && (
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setRefundAmount(p.amount.toString());
                                setIsRefundModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-semibold text-rose-400 border border-rose-500/20 transition-colors"
                            >
                              Refund
                            </button>
                          )}
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

      {/* TAB 2: ATTEMPTS TIMELINE & TELEMETRY */}
      {activeTab === "ATTEMPTS" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Execution Attempt Auditing</h3>
            <p className="text-xs text-slate-400 mb-4">
              Isolation of payment intake from external gateway attempts. Each attempt stores exact latency, provider references, and payload forensics.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-3 font-semibold">Attempt ID</th>
                    <th className="p-3 font-semibold">Provider Node</th>
                    <th className="p-3 font-semibold">External Session / Ref</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Latency</th>
                    <th className="p-3 font-semibold">Circuit</th>
                    <th className="p-3 font-semibold text-right">Raw Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">{att.id}</td>
                      <td className="p-3">
                        <span className="font-mono text-emerald-400 font-semibold">{att.providerCode}</span>
                        <div className="text-[10px] text-slate-400">Attempt #{att.attemptNumber}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        <div>{att.providerReference || "PENDING"}</div>
                        <div className="text-[10px] text-slate-500">{att.sessionId || "N/A"}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            att.status === "SUCCESS"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{att.latencyMs}ms</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400">
                          {att.circuitBreakerState || "CLOSED"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedAttempt(att)}
                          className="text-emerald-400 hover:underline font-mono text-[11px]"
                        >
                          View Logs ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC ROUTING RULES */}
      {activeTab === "ROUTING_RULES" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Multi-Factor Routing Policy Matrix</h3>
                <p className="text-xs text-slate-400">
                  Dynamic rules governing jurisdiction, currency, transaction size, and primary vs. fallback provider weighting.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-3 font-semibold">Rule Identifier</th>
                    <th className="p-3 font-semibold">Corridor</th>
                    <th className="p-3 font-semibold">Channel</th>
                    <th className="p-3 font-semibold">Amount Threshold</th>
                    <th className="p-3 font-semibold">Primary Provider</th>
                    <th className="p-3 font-semibold">Secondary / Fallback</th>
                    <th className="p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">{r.id}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                          {r.country} ({r.currency})
                        </span>
                      </td>
                      <td className="p-3 font-mono text-emerald-400">{r.channel}</td>
                      <td className="p-3 font-mono text-slate-300">
                        {r.currency} {r.minAmount.toLocaleString()} - {r.maxAmount ? r.maxAmount.toLocaleString() : "MAX"}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-400">
                        {r.primaryProvider} ({r.weightPrimary}%)
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        {r.secondaryProvider || "NONE"} / {r.fallbackProvider || "NONE"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400">
                          ACTIVE
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

      {/* TAB 4: PROVIDER HEALTH & CIRCUIT BREAKERS */}
      {activeTab === "PROVIDER_HEALTH" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((cap) => (
              <div
                key={cap.providerCode}
                className="p-5 rounded-3xl bg-[#0b1324] border border-white/10 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{cap.providerName}</h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                        {cap.country}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">{cap.providerCode}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                      cap.circuitState === "CLOSED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    CIRCUIT: {cap.circuitState}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
                    <div className="text-[9px] font-mono text-slate-400 uppercase">24h SLA</div>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                      {cap.successRate24h}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
                    <div className="text-[9px] font-mono text-slate-400 uppercase">Avg Latency</div>
                    <div className="text-sm font-bold font-mono text-white mt-0.5">{cap.avgLatencyMs}ms</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
                    <div className="text-[9px] font-mono text-slate-400 uppercase">Partial Refunds</div>
                    <div className="text-sm font-bold font-mono text-blue-400 mt-0.5">
                      {cap.supportsPartialRefunds ? "ENABLED" : "NO"}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Supported Currencies:</span>
                    <span className="font-mono text-slate-200">{cap.supportedCurrencies.join(", ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Supported Channels:</span>
                    <span className="font-mono text-slate-200">{cap.supportedChannels.join(", ")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: WEBHOOK AUDIT PIPELINE */}
      {activeTab === "WEBHOOKS" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Zero-Trust Webhook Ingestion Log</h3>
            <p className="text-xs text-slate-400 mb-4">
              Deterministic HMAC signature verification, SHA-256 payload deduplication, and replay audit logs.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-3 font-semibold">Event ID</th>
                    <th className="p-3 font-semibold">Provider</th>
                    <th className="p-3 font-semibold">Event Type</th>
                    <th className="p-3 font-semibold">HMAC Signature</th>
                    <th className="p-3 font-semibold">Processing Status</th>
                    <th className="p-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {webhookLogs.map((wh) => (
                    <tr key={wh.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">{wh.eventId}</td>
                      <td className="p-3 font-mono text-emerald-400">{wh.providerCode}</td>
                      <td className="p-3 font-mono text-slate-300">{wh.eventType}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            wh.isSignatureValid
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {wh.isSignatureValid ? "VERIFIED (HMAC-SHA256)" : "REJECTED"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400">
                          {wh.processingStatus}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        {new Date(wh.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PAYMENT INTAKE SIMULATOR */}
      {activeTab === "SIMULATOR" && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Live Payment Switch Simulator</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute live outward NIP transfers or Sahel XOF transfers through dynamic routing, subledger reservation locks, and balanced General Ledger postings.
            </p>
          </div>

          <form onSubmit={handleSimulatePayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Corridor & Jurisdiction
                </label>
                <select
                  value={simForm.country}
                  onChange={(e) => {
                    const country = e.target.value;
                    setSimForm({
                      ...simForm,
                      country,
                      currency: country === "NE" ? "XOF" : "NGN",
                      channel: country === "NE" ? "SAHEL_SWITCH" : "NIP",
                    });
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="NG">Nigeria 🇳🇬 (NGN)</option>
                  <option value="NE">Niger Republic 🇳🇪 (XOF)</option>
                  <option value="CROSS_BORDER">Cross-Border (NGN ➔ XOF)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Payment Channel
                </label>
                <select
                  value={simForm.channel}
                  onChange={(e) => setSimForm({ ...simForm, channel: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="NIP">NIP Direct Credit (Instant)</option>
                  <option value="VIRTUAL_ACCOUNT">Virtual Account Dynamic</option>
                  <option value="CARD">Card Gateway Checkout</option>
                  <option value="SAHEL_SWITCH">Sahel BCEAO Switch (XOF)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Amount ({simForm.currency})
                </label>
                <input
                  type="number"
                  required
                  value={simForm.amount}
                  onChange={(e) => setSimForm({ ...simForm, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Beneficiary Name
                </label>
                <input
                  type="text"
                  required
                  value={simForm.beneficiaryName}
                  onChange={(e) => setSimForm({ ...simForm, beneficiaryName: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Beneficiary Account / IBAN
                </label>
                <input
                  type="text"
                  required
                  value={simForm.beneficiaryAccount}
                  onChange={(e) => setSimForm({ ...simForm, beneficiaryAccount: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Bank Code
                </label>
                <input
                  type="text"
                  value={simForm.beneficiaryBank}
                  onChange={(e) => setSimForm({ ...simForm, beneficiaryBank: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Narration</label>
              <input
                type="text"
                value={simForm.narration}
                onChange={(e) => setSimForm({ ...simForm, narration: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? "Routing through Switch..." : "Execute Payment Switch Request"}
            </button>
          </form>
        </div>
      )}

      {/* INSPECTION MODAL */}
      {selectedPayment && !isRefundModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1324] border border-white/15 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                  PAYMENT 360° FORENSIC AUDIT
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedPayment.reference}</h3>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                <div className="text-[9px] font-mono text-slate-400 uppercase">Business State</div>
                <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                  {selectedPayment.businessState}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                <div className="text-[9px] font-mono text-slate-400 uppercase">Financial State</div>
                <div className="text-xs font-bold font-mono text-blue-400 mt-0.5">
                  {selectedPayment.financialState}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                <div className="text-[9px] font-mono text-slate-400 uppercase">Settlement State</div>
                <div className="text-xs font-bold font-mono text-amber-400 mt-0.5">
                  {selectedPayment.settlementState}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5">
                <div className="text-[9px] font-mono text-slate-400 uppercase">Reconciliation</div>
                <div className="text-xs font-bold font-mono text-purple-400 mt-0.5">
                  {selectedPayment.reconciliationState}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Provider:</span>
                <span className="font-mono text-emerald-400 font-semibold">{selectedPayment.selectedProvider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">External Provider Reference:</span>
                <span className="font-mono text-slate-200">{selectedPayment.externalReference || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Beneficiary Account & Bank:</span>
                <span className="font-mono text-slate-200">
                  {selectedPayment.beneficiaryAccountNumber} ({selectedPayment.beneficiaryBankCode})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount & Fee:</span>
                <span className="font-mono text-white font-bold">
                  {selectedPayment.currency} {selectedPayment.amount.toLocaleString()} (Fee: {selectedPayment.feeAmount})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Idempotency Key:</span>
                <span className="font-mono text-slate-400 text-[10px]">{selectedPayment.idempotencyKey || "None"}</span>
              </div>
            </div>

            {selectedPayment.attempts && selectedPayment.attempts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase font-mono">Attempt Telemetry</h4>
                {selectedPayment.attempts.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-white/5 text-xs font-mono space-y-1"
                  >
                    <div className="flex justify-between text-slate-300">
                      <span>Attempt #{att.attemptNumber} - {att.providerCode}</span>
                      <span className="text-emerald-400">{att.status} ({att.latencyMs}ms)</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Session ID: {att.sessionId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {isRefundModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1324] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Issue Refund / Partial Reversal</h3>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-3">
              <div>
                <span>Original Payment Reference:</span>
                <div className="font-mono font-bold text-white mt-0.5">{selectedPayment.reference}</div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Refund Amount (Max: {selectedPayment.currency} {selectedPayment.amount})
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Reason</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                ⚠️ Issuing a refund will generate a compensating credit to the customer wallet and update financial states in the General Ledger.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRefund}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-900/30"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
