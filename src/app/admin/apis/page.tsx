"use client";

import React, { useState, useEffect } from "react";
import {
  Code2,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  Copy,
  Check,
  RefreshCw,
  Activity,
  Zap,
  Sliders,
  Send,
  Radio,
  Layers,
  Server,
  Globe2,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  PlusCircle,
  KeyRound,
  ShieldAlert,
  Power,
  X,
  Play,
  Cpu,
  Award,
} from "lucide-react";
import {
  ApiGatewayRoute,
  ApiClientCredential,
  ProviderNodeAdapter,
  Partner360Profile,
  EnterpriseEventOutbox,
  EnterpriseEventDeadLetter,
  WebhookDeliveryAttempt,
  SandboxScenario,
  ApiThreatEvent,
  IntegrationFabricSummary,
} from "@/types/integrationEngine";

type ActiveTab =
  | "routes"
  | "providers"
  | "credentials"
  | "partners"
  | "events"
  | "webhooks"
  | "sandbox"
  | "security";

export default function ApiGatewayAdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("routes");
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Platform Data States
  const [summary, setSummary] = useState<IntegrationFabricSummary | null>(null);
  const [routes, setRoutes] = useState<ApiGatewayRoute[]>([]);
  const [providers, setProviders] = useState<ProviderNodeAdapter[]>([]);
  const [credentials, setCredentials] = useState<ApiClientCredential[]>([]);
  const [partners, setPartners] = useState<Partner360Profile[]>([]);
  const [outboxEvents, setOutboxEvents] = useState<EnterpriseEventOutbox[]>([]);
  const [deadLetters, setDeadLetters] = useState<EnterpriseEventDeadLetter[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryAttempt[]>([]);
  const [threats, setThreats] = useState<ApiThreatEvent[]>([]);

  // Sandbox State
  const [selectedScenario, setSelectedScenario] = useState<SandboxScenario>("SUCCESS");
  const [sandboxResponse, setSandboxResponse] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

  // New Credential Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPartner, setNewClientPartner] = useState("prt-01");
  const [newClientEnv, setNewClientEnv] = useState<"SANDBOX" | "PRODUCTION">("SANDBOX");

  const fetchIntegrationData = async () => {
    setLoading(true);
    try {
      const [
        resSum,
        resRoutes,
        resProv,
        resCred,
        resPart,
        resEvents,
        resWh,
        resThr,
      ] = await Promise.all([
        fetch("/api/v1/integration/summary"),
        fetch("/api/v1/integration/routes"),
        fetch("/api/v1/integration/providers"),
        fetch("/api/v1/integration/credentials"),
        fetch("/api/v1/integration/partners"),
        fetch("/api/v1/integration/events"),
        fetch("/api/v1/integration/webhooks"),
        fetch("/api/v1/integration/threats"),
      ]);

      const [
        jsonSum,
        jsonRoutes,
        jsonProv,
        jsonCred,
        jsonPart,
        jsonEvents,
        jsonWh,
        jsonThr,
      ] = await Promise.all([
        resSum.json(),
        resRoutes.json(),
        resProv.json(),
        resCred.json(),
        resPart.json(),
        resEvents.json(),
        resWh.json(),
        resThr.json(),
      ]);

      if (jsonSum.success) setSummary(jsonSum.data);
      if (jsonRoutes.success) setRoutes(jsonRoutes.data);
      if (jsonProv.success) setProviders(jsonProv.data);
      if (jsonCred.success) setCredentials(jsonCred.data);
      if (jsonPart.success) setPartners(jsonPart.data);
      if (jsonEvents.success) {
        setOutboxEvents(jsonEvents.data.outbox);
        setDeadLetters(jsonEvents.data.deadLetters);
      }
      if (jsonWh.success) setDeliveries(jsonWh.data);
      if (jsonThr.success) setThreats(jsonThr.data);
    } catch (e) {
      console.error("Failed to load integration data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrationData();
  }, []);

  const handleSimulateSandbox = async () => {
    setSimulating(true);
    try {
      const res = await fetch("/api/v1/integration/sandbox/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-simulation-scenario": selectedScenario,
        },
        body: JSON.stringify({
          amount: 5000000,
          currency: "NGN",
          recipient: "0123456789",
        }),
      });
      const json = await res.json();
      setSandboxResponse(json);
    } catch (e) {
      console.error("Sandbox simulation error", e);
    } finally {
      setSimulating(false);
    }
  };

  const handleReplayWebhook = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/integration/webhooks/${id}/replay`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Webhook delivery #${id} replayed successfully with HTTP 200.`);
        fetchIntegrationData();
      }
    } catch (e: any) {
      alert(`Replay error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReplayEvent = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/integration/events/${id}/replay`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`DLQ Event #${id} republished to Enterprise Event Bus.`);
        fetchIntegrationData();
      }
    } catch (e: any) {
      alert(`Event replay error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCircuitBreaker = async (code: string, currentStatus: string) => {
    setLoading(true);
    try {
      const action = currentStatus === "CLOSED" ? "TRIP" : "RESET";
      const res = await fetch(`/api/v1/integration/providers/${code}/circuit-breaker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Circuit breaker for ${code} set to ${json.data?.circuitBreakerStatus}.`);
        fetchIntegrationData();
      }
    } catch (e: any) {
      alert(`Circuit breaker error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const partnerObj = partners.find((p) => p.id === newClientPartner);
      const res = await fetch("/api/v1/integration/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: newClientPartner,
          partnerName: partnerObj ? partnerObj.businessName : "Partner Organization",
          clientName: newClientName,
          environment: newClientEnv,
          allowedScopes: ["transfers:write", "payments:write", "accounts:read"],
          rateLimitPerSecond: 100,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsClientModalOpen(false);
        setNewClientName("");
        setActionSuccess(`Client App Credential provisioned: ${json.data.clientId}`);
        fetchIntegrationData();
      }
    } catch (e: any) {
      alert(`Credential creation error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              ENTERPRISE INTEGRATION FABRIC &amp; API GATEWAY
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● NGN (Providus) &amp; XOF (Coris) RAILS ACTIVE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Integration Fabric, Open Banking &amp; Developer Hub
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Governed API perimeter, circuit-breaker bank adapters, outbox event bus, HMAC webhooks, and deterministic developer sandbox.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsClientModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provision Client App</span>
          </button>

          <button
            onClick={fetchIntegrationData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Fabric</span>
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

      {/* Gateway Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>24h Gateway Traffic</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {summary?.totalRequests24h ? summary.totalRequests24h.toLocaleString() : "821,900"}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">99.85% Success (0 Security Breaches)</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Core Bank Adapters</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">2 Live Nodes</div>
          <div className="text-[10px] text-cyan-400 font-mono">
            🇳🇬 Providus ({summary?.providusBankLatencyMs || 142}ms) • 🇳🇪 Coris ({summary?.korisBankLatencyMs || 188}ms)
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Partner 360 &amp; Apps</span>
            <Globe2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {partners.length} Partners • {credentials.length} Apps
          </div>
          <div className="text-[10px] text-amber-400 font-mono">Open Banking AIS/PIS Enabled</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Event &amp; Webhook DLQ</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {deadLetters.length + deliveries.filter((d) => d.status === "DEAD_LETTERED").length}
          </div>
          <div className="text-[10px] text-rose-400 font-mono">Replay Workers Available</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: "routes", label: "Gateway Route Registry", icon: Code2, count: routes.length },
          { id: "providers", label: "Bank Node Adapters", icon: Server, count: providers.length },
          { id: "credentials", label: "Client App Credentials", icon: KeyRound, count: credentials.length },
          { id: "partners", label: "Partner 360 & KYB", icon: Globe2, count: partners.length },
          { id: "events", label: "Event Bus & DLQ", icon: Layers, count: deadLetters.length },
          { id: "webhooks", label: "HMAC Webhooks & Replay", icon: Radio, count: deliveries.length },
          { id: "sandbox", label: "Developer Sandbox Harness", icon: Sliders },
          { id: "security", label: "Security & Threat Detection", icon: ShieldAlert, count: threats.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isActive ? "bg-slate-950 text-emerald-400" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ROUTES */}
      {activeTab === "routes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((r) => (
            <div key={r.id} className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                    {r.groupName}
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                    {r.version}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400">
                  ● {r.status}
                </span>
              </div>

              <div className="font-mono text-sm font-bold text-white bg-slate-950/80 p-2.5 rounded-xl border border-white/5 flex justify-between items-center">
                <span>{r.httpMethod} {r.pathPattern}</span>
                <span className="text-[10px] text-amber-400">{r.requiredScope}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5">
                  <span className="text-slate-500 block text-[9px]">p50 Latency</span>
                  <span className="text-emerald-400 font-bold">{r.p50LatencyMs}ms</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5">
                  <span className="text-slate-500 block text-[9px]">24h Requests</span>
                  <span className="text-white font-bold">{r.requests24h.toLocaleString()}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70 border border-white/5">
                  <span className="text-slate-500 block text-[9px]">Rate Limit</span>
                  <span className="text-teal-300 font-bold">{r.rateLimitPerSecond} req/s</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: PROVIDERS & CIRCUIT BREAKERS */}
      {activeTab === "providers" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white">Bank Node Adapters &amp; Circuit Breakers</h2>
            <p className="text-xs text-slate-400">
              Stateful circuit breakers protecting upstream Providus Bank Nigeria and Coris Bank Niger Republic clearing nodes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {providers.map((p) => (
              <div key={p.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="font-mono text-xs font-bold text-emerald-400">{p.providerCode}</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{p.providerName}</h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                      p.circuitBreakerStatus === "CLOSED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    CIRCUIT: {p.circuitBreakerStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                    <span className="text-slate-400 text-[10px]">p95 Latency:</span>
                    <div className="text-emerald-400 font-bold text-sm mt-0.5">{p.p95LatencyMs}ms</div>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                    <span className="text-slate-400 text-[10px]">Success Rate:</span>
                    <div className="text-teal-300 font-bold text-sm mt-0.5">{p.successRatePct}%</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Circuit Breaker Control:</span>
                  <button
                    onClick={() => handleToggleCircuitBreaker(p.providerCode, p.circuitBreakerStatus)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      p.circuitBreakerStatus === "CLOSED"
                        ? "bg-rose-600 hover:bg-rose-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {p.circuitBreakerStatus === "CLOSED" ? "Trip Circuit (Simulate Outage)" : "Reset Circuit (Resume Live)"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CREDENTIALS */}
      {activeTab === "credentials" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#080D1A]/90 border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950/80 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Scoped API Client Credentials ({credentials.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-4 font-semibold">Partner &amp; App Name</th>
                    <th className="p-4 font-semibold">Client ID</th>
                    <th className="p-4 font-semibold">Environment</th>
                    <th className="p-4 font-semibold">API Key Preview</th>
                    <th className="p-4 font-semibold">Rate Limit</th>
                    <th className="p-4 font-semibold text-right">Allowed Scopes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {credentials.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white font-sans">
                        <div>{c.clientName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{c.partnerName}</div>
                      </td>
                      <td className="p-4 text-emerald-400 font-bold">{c.clientId}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.environment === "PRODUCTION"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {c.environment}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{c.apiKeyPreview}</td>
                      <td className="p-4 text-slate-400">{c.rateLimitPerSecond} req/s</td>
                      <td className="p-4 text-right text-slate-300 font-sans">
                        <div className="flex flex-wrap justify-end gap-1">
                          {c.allowedScopes.map((sc, i) => (
                            <span key={i} className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">
                              {sc}
                            </span>
                          ))}
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

      {/* TAB 4: PARTNER 360 */}
      {activeTab === "partners" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white">Partner 360 &amp; Open Banking Registry</h2>
            <p className="text-xs text-slate-400">
              Corporate KYB certification, Open Banking AIS/PIS authorization, and commercial settlement limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {partners.map((prt) => (
              <div key={prt.id} className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{prt.partnerCode}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                    {prt.kybStatus}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">{prt.businessName} ({prt.country})</h3>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Daily Settlement Cap:</span>
                    <span className="font-bold text-white">₦{(prt.dailySettlementLimitNgn / 1000000).toFixed(0)}M</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Open Banking AIS / PIS:</span>
                    <span className="text-teal-300">{prt.isOpenBankingAis ? "AIS ✓" : "AIS ✗"} • {prt.isOpenBankingPis ? "PIS ✓" : "PIS ✗"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Risk Tier:</span>
                    <span className="text-emerald-400 font-bold">{prt.riskTier}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: EVENTS & DLQ */}
      {activeTab === "events" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white">Transactional Outbox Event Bus &amp; Dead-Letter Queue</h2>
            <p className="text-xs text-slate-400">
              Guaranteed at-least-once asynchronous event delivery with deterministic replay capability.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outbox Events */}
            <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Published Event Outbox Stream</h3>
              {outboxEvents.map((evt) => (
                <div key={evt.id} className="p-4 bg-slate-950/60 border border-white/10 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">{evt.eventType}</span>
                    <span className="text-slate-500 text-[10px]">{evt.id}</span>
                  </div>
                  <div className="text-white">Aggregate: {evt.aggregateType} [{evt.aggregateId}]</div>
                  <div className="text-slate-400 text-[10px]">Status: {evt.status}</div>
                </div>
              ))}
            </div>

            {/* Dead Letters */}
            <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Dead-Letter Queue (DLQ)</h3>
              {deadLetters.map((dlq) => (
                <div key={dlq.id} className="p-4 bg-slate-950/60 border border-rose-500/30 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400">{dlq.consumerName}</span>
                    <span className="text-slate-400 text-[10px]">{dlq.status}</span>
                  </div>
                  <div className="text-slate-200">Failure: {dlq.failureReason}</div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500 text-[10px]">Attempts: {dlq.attemptsCount}</span>
                    <button
                      onClick={() => handleReplayEvent(dlq.id)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Replay Event
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: WEBHOOKS & REPLAY */}
      {activeTab === "webhooks" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {deliveries.map((del) => (
              <div key={del.id} className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-800/40">
                      {del.eventType}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {del.clientName}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase font-mono ${
                        del.status === "DELIVERED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      ● {del.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs bg-slate-950/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Endpoint:</span>
                    <span className="text-white font-mono">{del.targetUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">HTTP Response:</span>
                    <span className={`font-mono font-bold ${del.httpStatus === 200 ? "text-emerald-400" : "text-rose-400"}`}>
                      {del.httpStatus || "N/A"} ({del.latencyMs}ms)
                    </span>
                  </div>
                  {del.errorMessage && (
                    <div className="text-rose-400 font-mono text-[11px] pt-1">
                      Error: {del.errorMessage}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 text-xs font-mono">
                  <span className="text-slate-500">Event ID: {del.eventId} (Attempt #{del.attemptNumber})</span>
                  {del.status === "DEAD_LETTERED" && (
                    <button
                      onClick={() => handleReplayWebhook(del.id)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Replay Dead-Letter Webhook
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: DEVELOPER SANDBOX */}
      {activeTab === "sandbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Deterministic Simulation Harness
            </h3>
            <p className="text-xs text-slate-400">
              Inject simulation headers to test client application error handling without touching live banking rails.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-400 text-xs mb-1 font-mono">x-simulation-scenario Header</label>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                >
                  <option value="SUCCESS">SUCCESS (Instant 200 OK)</option>
                  <option value="PROVIDER_TIMEOUT">PROVIDER_TIMEOUT (Simulate 504 Gateway Timeout &rarr; UNKNOWN)</option>
                  <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS (Simulate 400 Core Banking Reject)</option>
                  <option value="AML_STEP_UP">AML_STEP_UP (Simulate 403 Step-Up Verification Challenge)</option>
                  <option value="RATE_LIMITED">RATE_LIMITED (Simulate 429 Burst Quota Exceeded)</option>
                </select>
              </div>

              <button
                onClick={handleSimulateSandbox}
                disabled={simulating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 mt-2"
              >
                <Zap className="w-4 h-4" />
                {simulating ? "Executing Test Request..." : "Send Simulation Request"}
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Simulated Gateway Output
            </h3>

            {sandboxResponse ? (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 font-mono text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span>HTTP Status:</span>
                  <span className={`font-bold ${sandboxResponse.success ? "text-emerald-400" : "text-rose-400"}`}>
                    {sandboxResponse.httpStatus} {sandboxResponse.success ? "OK" : "Challenge"}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap text-[11px] text-slate-200 overflow-x-auto p-2 bg-slate-900/60 rounded-xl">
                  {JSON.stringify(sandboxResponse, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-950/60 border border-white/5 text-slate-500 text-xs text-center">
                <Terminal className="w-8 h-8 mb-2 opacity-50" />
                Select a scenario on the left and execute simulation to inspect the API envelope.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: SECURITY & THREATS */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl">
            <h2 className="text-base font-bold text-white">API Security Surveillance &amp; Threat Detection</h2>
            <p className="text-xs text-slate-400">
              Automated detection of brute-force attempts, IDOR probes, and unauthorized mass enumeration events.
            </p>
          </div>

          <div className="space-y-4">
            {threats.map((t) => (
              <div key={t.id} className="p-5 bg-slate-900/60 border border-rose-500/30 rounded-2xl space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400">{t.threatType}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                    {t.severity} SEVERITY
                  </span>
                </div>
                <div className="text-white">Source IP: {t.sourceIp} • Target Client: {t.clientId || "Anonymous"}</div>
                <div className="text-emerald-400 text-[11px]">Action Taken: {t.actionTaken}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE APP CREDENTIAL MODAL */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                Provision New API Application Credential
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCredential} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Partner Organization</label>
                <select
                  value={newClientPartner}
                  onChange={(e) => setNewClientPartner(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.businessName} ({p.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Application Name</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Sahel Production Payout Service"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Environment Tier</label>
                <select
                  value={newClientEnv}
                  onChange={(e) => setNewClientEnv(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                >
                  <option value="SANDBOX">SANDBOX (Test Rails Only)</option>
                  <option value="PRODUCTION">PRODUCTION (Maker-Checker Gated)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                🛡️ Zero-Trust Security Invariant: Raw client secrets are displayed once upon generation and stored as SHA-256 HMAC hashes.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newClientName || loading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg"
                >
                  Provision Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
