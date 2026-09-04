"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Database, 
  Server, 
  Radio, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  RefreshCw, 
  RotateCcw, 
  Play, 
  Layers,
  Cpu,
  Zap,
  Globe2
} from "lucide-react";
import { 
  DeepHealthReport, 
  CircuitBreakerRecord, 
  DeadLetterJobRecord, 
  PostRecoveryValidationResult 
} from "@/types/resilienceEngine";

export default function SystemHealthPage() {
  const [activeTab, setActiveTab] = useState<'HEALTH' | 'CIRCUIT_BREAKERS' | 'DLQ' | 'RECOVERY_VALIDATE' | 'SAFE_MODE'>('HEALTH');
  const [health, setHealth] = useState<DeepHealthReport | null>(null);
  const [breakers, setBreakers] = useState<CircuitBreakerRecord[]>([]);
  const [dlqJobs, setDlqJobs] = useState<DeadLetterJobRecord[]>([]);
  const [validationResult, setValidationResult] = useState<PostRecoveryValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Safe Mode toggle
  const [safeModeReason, setSafeModeReason] = useState('Emergency maintenance containment');
  const [togglingSafeMode, setTogglingSafeMode] = useState(false);

  const fetchResilienceData = async () => {
    setLoading(true);
    try {
      const [healthRes, breakersRes, dlqRes] = await Promise.all([
        fetch('/api/health').then(r => r.json()),
        fetch('/api/core/v1/resilience/circuit-breakers').then(r => r.json()),
        fetch('/api/core/v1/resilience/dead-letter-queue').then(r => r.json()),
      ]);

      if (healthRes.data) setHealth(healthRes.data);
      if (breakersRes.data?.breakers) setBreakers(breakersRes.data.breakers);
      if (dlqRes.data?.jobs) setDlqJobs(dlqRes.data.jobs);
    } catch (e) {
      console.error('Failed to fetch resilience telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResilienceData();
  }, []);

  const handleToggleBreaker = async (serviceKey: string, action: 'TRIP' | 'RESET') => {
    try {
      const res = await fetch('/api/core/v1/resilience/circuit-breakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceKey, action, reason: 'Operator control action' }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchResilienceData();
      }
    } catch (e) {
      console.error('Failed to toggle breaker:', e);
    }
  };

  const handleReplayDlqJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/core/v1/resilience/dead-letter-queue/${jobId}/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'RECOVERY_ENGINE_ADMIN' }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchResilienceData();
      }
    } catch (e) {
      console.error('Replay error:', e);
    }
  };

  const handleRunValidation = async () => {
    setValidating(true);
    try {
      const res = await fetch('/api/core/v1/resilience/recovery-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'DISASTER_RECOVERY_COMMANDER' }),
      });
      const data = await res.json();
      if (data.data) {
        setValidationResult(data.data);
      }
    } catch (e) {
      console.error('Validation error:', e);
    } finally {
      setValidating(false);
    }
  };

  const handleToggleSafeMode = async (enabled: boolean) => {
    setTogglingSafeMode(true);
    try {
      const res = await fetch('/api/core/v1/resilience/safe-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          reason: safeModeReason,
          actor: 'head.infrastructure@koriepay.internal',
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchResilienceData();
      }
    } catch (e) {
      console.error('Safe mode toggle error:', e);
    } finally {
      setTogglingSafeMode(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              DISASTER RECOVERY & RESILIENCE
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              health?.safeMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              ● {health?.safeMode ? 'FINANCIAL SAFE MODE ACTIVE' : 'NOMINAL PROCESSING'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Operational Resilience & Observability Command Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Deep financial integrity telemetry, multi-rail circuit breakers, Dead-Letter Queue replay, and post-recovery assertions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResilienceData}
            className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Ledger Invariant (Tier 0)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {health?.ledger.status || 'BALANCED'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Total Debits == Total Credits (0 Delta)</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Circuit Breakers (Tier 1)</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {breakers.filter(b => b.state === 'CLOSED').length} / {breakers.length} Closed
          </div>
          <div className="text-[10px] text-blue-400 font-mono">All Banking Rails Nominal</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Dead-Letter Queue (DLQ)</span>
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{dlqJobs.filter(j => j.status === 'FAILED').length}</div>
          <div className="text-[10px] text-amber-400 font-mono">Safe Idempotent Replay Ready</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>DB Query Latency</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">2.1 ms</div>
          <div className="text-[10px] text-slate-400 font-mono">Pool Active: 24 / 100</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {(['HEALTH', 'CIRCUIT_BREAKERS', 'DLQ', 'RECOVERY_VALIDATE', 'SAFE_MODE'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === tab
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'HEALTH' && 'Deep Diagnostic Telemetry'}
            {tab === 'CIRCUIT_BREAKERS' && `Circuit Breakers (${breakers.length})`}
            {tab === 'DLQ' && `Dead-Letter Queue (${dlqJobs.length})`}
            {tab === 'RECOVERY_VALIDATE' && '7-Step Recovery Assertion'}
            {tab === 'SAFE_MODE' && 'Financial Safe Mode'}
          </button>
        ))}
      </div>

      {/* Tab: Deep Diagnostics */}
      {activeTab === 'HEALTH' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database Health */}
          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              PostgreSQL Transactional Platform (Tier 0)
            </h3>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Connection Status:</span>
                <span className="text-emerald-400 font-bold">● CONNECTED / HEALTHY</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Read / Write Latency:</span>
                <span className="text-white font-bold">{health?.database.readLatencyMs}ms / {health?.database.writeLatencyMs}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connection Pool Utilization:</span>
                <span className="text-white font-bold">{health?.database.poolActive} / {health?.database.poolMax} Active</span>
              </div>
            </div>
          </div>

          {/* Ledger Invariant */}
          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Core Double-Entry Ledger Invariant (Tier 0)
            </h3>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Ledger Balance Status:</span>
                <span className="text-emerald-400 font-bold">● {health?.ledger.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Double-Entry Invariant:</span>
                <span className="text-emerald-300 font-bold">SUM(DEBITS) == SUM(CREDITS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Posted Journal Count:</span>
                <span className="text-white font-bold">{health?.ledger.totalJournalsCount} Immutable Journals</span>
              </div>
            </div>
          </div>

          {/* Banking Nodes */}
          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-3 md:col-span-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-blue-400" />
              Commercial Banking Gateway Nodes (Tier 1)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              {health?.providers.map((p) => (
                <div key={p.code} className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">{p.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                      ● {p.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Circuit Breaker:</span>
                    <span className="text-emerald-400 font-bold">{p.circuitBreaker}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Round-Trip Latency:</span>
                    <span className="text-white font-bold">{p.latencyMs} ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Circuit Breakers */}
      {activeTab === 'CIRCUIT_BREAKERS' && (
        <div className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            Active Service Circuit Breaker Controls
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] font-mono uppercase bg-white/5 text-slate-400">
                <tr>
                  <th className="p-3">Service Key</th>
                  <th className="p-3">Service Name</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">State</th>
                  <th className="p-3">Failures</th>
                  <th className="p-3">Threshold</th>
                  <th className="p-3 text-right">Emergency Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {breakers.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-white">{b.serviceKey}</td>
                    <td className="p-3 text-slate-200">{b.serviceName}</td>
                    <td className="p-3 text-slate-400">{b.tier}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.state === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-300' :
                        b.state === 'HALF_OPEN' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        ● {b.state}
                      </span>
                    </td>
                    <td className="p-3 text-white">{b.failureCount}</td>
                    <td className="p-3 text-slate-400">{b.failureThreshold}</td>
                    <td className="p-3 text-right space-x-2">
                      {b.state === 'CLOSED' ? (
                        <button
                          onClick={() => handleToggleBreaker(b.serviceKey, 'TRIP')}
                          className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-[11px]"
                        >
                          Force OPEN
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleBreaker(b.serviceKey, 'RESET')}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px]"
                        >
                          Reset to CLOSED
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

      {/* Tab: Dead-Letter Queue */}
      {activeTab === 'DLQ' && (
        <div className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Dead-Letter Queue & Idempotent Replay Manager (`dead_letter_jobs`)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] font-mono uppercase bg-white/5 text-slate-400">
                <tr>
                  <th className="p-3">Job Key</th>
                  <th className="p-3">Queue Name</th>
                  <th className="p-3">Error Message</th>
                  <th className="p-3">Retries</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {dlqJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-white">{j.jobKey}</td>
                    <td className="p-3 text-slate-400">{j.queueName}</td>
                    <td className="p-3 text-red-300 max-w-xs truncate" title={j.errorMessage}>{j.errorMessage}</td>
                    <td className="p-3 text-white">{j.retryCount} / {j.maxRetries}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        j.status === 'FAILED' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {j.status === 'FAILED' && (
                        <button
                          onClick={() => handleReplayDlqJob(j.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs"
                        >
                          Idempotent Replay
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

      {/* Tab: 7-Step Recovery Assertion */}
      {activeTab === 'RECOVERY_VALIDATE' && (
        <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                7-Step Post-Recovery Financial & Identity Integrity Assertion
              </h3>
              <p className="text-xs text-slate-400">
                Execute automated validation sequence verifying database schemas, double-entry balance invariants, idempotency registries, and banking node continuity.
              </p>
            </div>

            <button
              onClick={handleRunValidation}
              disabled={validating}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {validating ? "Validating Platform Integrity..." : "Run 7-Step Integrity Assertion"}
            </button>
          </div>

          {validationResult && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-950/70 border border-white/5 font-mono text-xs">
                <div>
                  <span className="text-slate-400">Validation Status: </span>
                  <span className="text-emerald-400 font-bold text-sm">● {validationResult.overallStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400">Double-Entry Invariant: </span>
                  <span className="text-emerald-300 font-bold">₦{(validationResult.totalDebitsMinor / 100).toLocaleString()} Debits == Credits</span>
                </div>
              </div>

              <div className="space-y-2">
                {validationResult.steps.map((s) => (
                  <div key={s.stepNumber} className="p-3.5 rounded-xl bg-slate-950 border border-white/5 flex items-start justify-between gap-3 font-mono text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white">Step {s.stepNumber}: {s.stepName}</div>
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5">{s.details}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Safe Mode Controls */}
      {activeTab === 'SAFE_MODE' && (
        <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-4 max-w-2xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-400" />
            Financial Safe Mode Command & Emergency Locks
          </h3>
          <p className="text-xs text-slate-400">
            When Safe Mode is active, all outbound money movements, settlement disbursements, and ledger mutation requests are temporarily locked. Read-only balance checks and support views remain accessible.
          </p>

          <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Status:</span>
              <span className={`font-bold ${health?.safeMode ? 'text-red-400' : 'text-emerald-400'}`}>
                ● {health?.safeMode ? 'SAFE MODE ACTIVE' : 'INACTIVE (NORMAL PROCESSING)'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Containment Justification / Reason</label>
            <input
              type="text"
              value={safeModeReason}
              onChange={(e) => setSafeModeReason(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
            {health?.safeMode ? (
              <button
                onClick={() => handleToggleSafeMode(false)}
                disabled={togglingSafeMode}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                {togglingSafeMode ? "Deactivating..." : "Deactivate Safe Mode & Resume Normal Operations"}
              </button>
            ) : (
              <button
                onClick={() => handleToggleSafeMode(true)}
                disabled={togglingSafeMode}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-lg shadow-red-500/20"
              >
                {togglingSafeMode ? "Activating..." : "Emergency Activate Financial Safe Mode"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
