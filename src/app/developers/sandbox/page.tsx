"use client";

import React, { useState } from 'react';
import { useDeveloper } from '@/components/developer/DeveloperContext';
import {
  Cpu,
  CreditCard,
  Building,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function SandboxPage() {
  const { simulateApiCall, t } = useDeveloper();

  const [activeScenario, setActiveScenario] = useState<string>('SUCCESS_TRANSFER');
  const [amount, setAmount] = useState<number>(5000000);
  const [corridor, setCorridor] = useState<'NGN_TO_XOF' | 'XOF_TO_NGN'>('NGN_TO_XOF');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const testCards = [
    { type: 'Providus Verve Debit (NGN)', number: '5061 9920 3819 0012', exp: '12/28', cvv: '123', pin: '1234', behavior: 'SUCCESS (All NGN charges)' },
    { type: 'Coris WAEMU Visa (XOF)', number: '4111 2233 4455 6677', exp: '08/29', cvv: '456', pin: '0000', behavior: 'SUCCESS (All XOF charges)' },
    { type: 'Insufficient Funds Card', number: '5061 9900 0000 4001', exp: '01/27', cvv: '999', pin: '1234', behavior: 'FAIL 400 (INSUFFICIENT_FUNDS)' },
    { type: 'Declined / Fraud Suspected Card', number: '4111 0000 0000 4031', exp: '03/26', cvv: '000', pin: '9999', behavior: 'FAIL 403 (SANCTION_FLAGGED)' },
  ];

  const testAccounts = [
    { bank: 'Providus Bank Nigeria', nuban: '9928193820', accountName: 'KORIE / TEST CUSTOMER / NGN', currency: 'NGN', note: 'Instant virtual collection NUBAN' },
    { bank: 'Coris Bank Niger Republic', nuban: '22798102391', accountName: 'KORIE / TEST RECIPIENT / XOF', currency: 'XOF', note: 'WAEMU cross-border beneficiary' },
  ];

  const handleExecuteSimulation = async () => {
    setIsRunning(true);
    setSimResult(null);

    await new Promise(r => setTimeout(r, 450));

    if (activeScenario === 'SUCCESS_TRANSFER') {
      const res = await simulateApiCall('/v1/transfers/cross-border', 'POST', {
        source_currency: corridor === 'NGN_TO_XOF' ? 'NGN' : 'XOF',
        destination_currency: corridor === 'NGN_TO_XOF' ? 'XOF' : 'NGN',
        amount,
        reference: `SIM-SBX-${Date.now()}`,
        recipient: { name: 'Moussa Harouna', bank_code: 'KORIS_NE', account_number: '22798102391' },
      });
      setSimResult(res);
    } else if (activeScenario === 'INSUFFICIENT_FUNDS') {
      setSimResult({
        status: 400,
        latency: 48,
        body: {
          status: 'error',
          code: 'INSUFFICIENT_FUNDS',
          message: 'Available wallet balance is insufficient for amount + fee.',
          request_id: `KP-REQ-SIM-${Date.now().toString(16)}`,
        },
        headers: { 'content-type': 'application/json' },
      });
    } else if (activeScenario === 'TIMEOUT_SWITCH') {
      setSimResult({
        status: 504,
        latency: 950,
        body: {
          status: 'error',
          code: 'UPSTREAM_SWITCH_TIMEOUT',
          message: 'Downstream bank node timed out. Query status to reconcile.',
          request_id: `KP-REQ-SIM-${Date.now().toString(16)}`,
        },
        headers: { 'content-type': 'application/json' },
      });
    } else if (activeScenario === 'DUPLICATE_IDEMPOTENCY') {
      setSimResult({
        status: 409,
        latency: 32,
        body: {
          status: 'error',
          code: 'DUPLICATE_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key lock conflict. Operation already committed.',
          request_id: `KP-REQ-SIM-${Date.now().toString(16)}`,
        },
        headers: { 'content-type': 'application/json' },
      });
    }

    setIsRunning(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ISOLATED TESTBED
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1">{t.sandbox.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.sandbox.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
            Sandbox Ledger Active
          </span>
        </div>
      </div>

      {/* Simulator Control Cockpit */}
      <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Scenario Simulation Engine</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Zero Real-Money Risk</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'SUCCESS_TRANSFER', label: 'Bilateral Transfer (200 OK)', color: 'emerald' },
            { id: 'INSUFFICIENT_FUNDS', label: 'Insufficient Funds (400)', color: 'rose' },
            { id: 'TIMEOUT_SWITCH', label: 'Switch Timeout (504)', color: 'amber' },
            { id: 'DUPLICATE_IDEMPOTENCY', label: 'Duplicate Idempotency (409)', color: 'indigo' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setActiveScenario(s.id)}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition-all ${
                activeScenario === s.id
                  ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-lg'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {activeScenario === 'SUCCESS_TRANSFER' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-white/5 text-xs font-mono">
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Corridor Route</label>
              <select
                value={corridor}
                onChange={e => setCorridor(e.target.value as any)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white font-bold"
              >
                <option value="NGN_TO_XOF">🇳🇬 NGN (Providus) → 🇳🇪 XOF (Coris)</option>
                <option value="XOF_TO_NGN">🇳🇪 XOF (Coris) → 🇳🇬 NGN (Providus)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Minor Unit Amount</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-emerald-400 font-bold"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleExecuteSimulation}
            disabled={isRunning}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isRunning ? 'Simulating...' : 'Execute Test Scenario'}</span>
          </button>
        </div>

        {simResult && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase">Simulation Telemetry</span>
              <span className={`px-2 py-0.5 rounded font-bold ${simResult.status >= 200 && simResult.status < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                HTTP {simResult.status} ({simResult.latency}ms)
              </span>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs text-slate-200 overflow-x-auto max-h-56 custom-scrollbar">
              {JSON.stringify(simResult.body, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 2-Column Split: Test Cards & Test Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Cards */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Sandbox Test Cards</h3>
          </div>

          <div className="space-y-3">
            {testCards.map((c, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{c.type}</span>
                  <button
                    onClick={() => handleCopy(c.number.replace(/\s/g, ''), `card_${idx}`)}
                    className="text-slate-400 hover:text-emerald-400"
                  >
                    {copiedKey === `card_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-emerald-300 font-bold tracking-wider">{c.number}</div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>EXP: {c.exp} | CVV: {c.cvv} | PIN: {c.pin}</span>
                  <span className="text-slate-300">{c.behavior}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Bank Accounts */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-400" />
            <h3 className="font-bold text-white text-sm">Sandbox Banking Node Accounts</h3>
          </div>

          <div className="space-y-3">
            {testAccounts.map((a, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-300">{a.bank}</span>
                  <button
                    onClick={() => handleCopy(a.nuban, `acc_${idx}`)}
                    className="text-slate-400 hover:text-emerald-400"
                  >
                    {copiedKey === `acc_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-white font-bold">{a.nuban} ({a.currency})</div>
                <div className="text-[11px] text-slate-400">{a.accountName}</div>
                <div className="text-[10px] text-slate-500">{a.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
