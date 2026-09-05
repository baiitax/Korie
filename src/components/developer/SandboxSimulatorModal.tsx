"use client";

import React, { useState } from 'react';
import { useDeveloper } from './DeveloperContext';
import { Cpu, X, Play, CheckCircle2, AlertTriangle, Clock, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

export const SandboxSimulatorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { simulateApiCall } = useDeveloper();

  const [scenario, setScenario] = useState<string>('SUCCESS_TRANSFER');
  const [amount, setAmount] = useState<number>(5000000);
  const [corridor, setCorridor] = useState<'NGN_TO_XOF' | 'XOF_TO_NGN'>('NGN_TO_XOF');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const scenarios = [
    { id: 'SUCCESS_TRANSFER', name: 'Simulate Successful Bilateral Transfer', desc: 'Debits source ledger and credits beneficiary bank in sub-second SLA.' },
    { id: 'INSUFFICIENT_FUNDS', name: 'Simulate Insufficient Balance (HTTP 400)', desc: 'Validates system behavior when wallet balance is lower than transaction amount + fee.' },
    { id: 'TIMEOUT_SWITCH', name: 'Simulate Upstream Switch Timeout (HTTP 504)', desc: 'Simulates Providus NIP or Coris WAEMU downstream latency threshold.' },
    { id: 'DUPLICATE_IDEMPOTENCY', name: 'Simulate Duplicate Idempotency Key (HTTP 409)', desc: 'Tests duplicate request locking and race-condition prevention.' },
  ];

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);

    await new Promise(r => setTimeout(r, 600));

    if (scenario === 'SUCCESS_TRANSFER') {
      const res = await simulateApiCall('/v1/transfers/cross-border', 'POST', {
        source_currency: corridor === 'NGN_TO_XOF' ? 'NGN' : 'XOF',
        destination_currency: corridor === 'NGN_TO_XOF' ? 'XOF' : 'NGN',
        amount,
        reference: `SIM-${Date.now()}`,
        recipient: { name: 'Moussa Harouna', bank_code: 'KORIS_NE', account_number: '22798102391' },
      });
      setResult(res);
    } else if (scenario === 'INSUFFICIENT_FUNDS') {
      setResult({
        status: 400,
        latency: 45,
        body: {
          status: 'error',
          code: 'INSUFFICIENT_FUNDS',
          message: 'Available wallet balance (₦1,240.00) is insufficient for transfer amount ₦50,000.00 + fee ₦250.00',
          request_id: `KP-REQ-SIM-${Date.now().toString(16)}`,
        },
        headers: { 'content-type': 'application/json' },
      });
    } else if (scenario === 'TIMEOUT_SWITCH') {
      setResult({
        status: 504,
        latency: 820,
        body: {
          status: 'error',
          code: 'UPSTREAM_SWITCH_TIMEOUT',
          message: 'Destination banking node did not return an ACK packet within 10,000ms. Transaction is queued for async reconciliation.',
          request_id: `KP-REQ-SIM-${Date.now().toString(16)}`,
        },
        headers: { 'content-type': 'application/json' },
      });
    } else if (scenario === 'DUPLICATE_IDEMPOTENCY') {
      setResult({
        status: 409,
        latency: 28,
        body: {
          status: 'error',
          code: 'DUPLICATE_IDEMPOTENCY_KEY',
          message: 'A previous request with Idempotency-Key "idem_sim_test_99" is currently locked. Query transaction status instead of retrying POST.',
          request_id: `KP-REQ-SIM-${Date.now().toString(16)}`,
        },
        headers: { 'content-type': 'application/json' },
      });
    }

    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-[#0b1222] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Sandbox Scenario Simulator</h3>
              <p className="text-xs text-slate-400">Test edge cases, switch timeouts & success flows</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Select Simulation Scenario</label>
            <div className="space-y-2">
              {scenarios.map(s => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${
                    scenario === s.id
                      ? 'bg-amber-500/10 border-amber-500/30 text-white'
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{s.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {scenario === 'SUCCESS_TRANSFER' && (
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900 border border-white/5">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Corridor Route</label>
                <select
                  value={corridor}
                  onChange={e => setCorridor(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs font-mono text-white focus:outline-none"
                >
                  <option value="NGN_TO_XOF">🇳🇬 NGN (Providus) → 🇳🇪 XOF (Coris)</option>
                  <option value="XOF_TO_NGN">🇳🇪 XOF (Coris) → 🇳🇬 NGN (Providus)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Amount (Minor Units)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-xs font-mono text-emerald-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? 'Running Scenario...' : 'Execute Simulation'}</span>
            </button>
          </div>

          {result && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 uppercase font-bold">Simulation Output</span>
                <span className={`px-2 py-0.5 rounded font-bold ${result.status >= 200 && result.status < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  HTTP {result.status}
                </span>
              </div>
              <pre className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-slate-200 overflow-x-auto max-h-48 custom-scrollbar">
                {JSON.stringify(result.body, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SandboxSimulatorModal;
