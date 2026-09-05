'use client';

import React, { useState, useEffect } from 'react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import {
  Radio,
  Search,
  Filter,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Clock,
  Layers,
  ArrowDownRight,
  ShieldAlert,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface TelemetryRow {
  id: string;
  transactionId: string;
  timestamp: string;
  originEntityName: string;
  destinationEntityName: string;
  amount: number;
  currency: 'NGN' | 'XOF' | 'USD';
  riskScore: number;
  ruleDecision: 'PASS' | 'FLAG' | 'BLOCK';
  node: string;
  channel: string;
}

export default function TransactionMonitoringPage() {
  const { formatCurrency, formatDate } = useCompliance();
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | 'PASS' | 'FLAG' | 'BLOCK'>('ALL');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<'ALL' | 'NG' | 'NE'>('ALL');

  // Live Telemetry Feed State
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([
    {
      id: 'tel-01',
      transactionId: 'TXN-NG-889102',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      originEntityName: 'Ibrahim Bello (Lagos Main)',
      destinationEntityName: 'Amina Gambo (FBN)',
      amount: 4850000,
      currency: 'NGN',
      riskScore: 84,
      ruleDecision: 'FLAG',
      node: 'Providus Bank NG (Core NIP Node)',
      channel: 'NIP',
    },
    {
      id: 'tel-02',
      transactionId: 'TXN-NE-441209',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      originEntityName: 'Amara Diallo (Niamey)',
      destinationEntityName: 'Sahel Kiosque Agency #12',
      amount: 4750000,
      currency: 'XOF',
      riskScore: 68,
      ruleDecision: 'FLAG',
      node: 'Coris Bank NE (UEMOA Clearing)',
      channel: 'AGENCY_CASH',
    },
    {
      id: 'tel-03',
      transactionId: 'TXN-NG-889103',
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      originEntityName: 'Dangote Flour Mills PLC',
      destinationEntityName: 'Korie Settlement Omnibus',
      amount: 25000000,
      currency: 'NGN',
      riskScore: 12,
      ruleDecision: 'PASS',
      node: 'Providus Bank NG (RTGS Inflow)',
      channel: 'RTGS',
    },
    {
      id: 'tel-04',
      transactionId: 'TXN-NE-441210',
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      originEntityName: 'Société Nigérienne d’Énergie',
      destinationEntityName: 'Coris Corporate Clearing',
      amount: 15500000,
      currency: 'XOF',
      riskScore: 8,
      ruleDecision: 'PASS',
      node: 'Coris Bank NE (BCEAO Transfer)',
      channel: 'BCEAO_SIP',
    },
    {
      id: 'tel-05',
      transactionId: 'TXN-NG-889104',
      timestamp: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
      originEntityName: 'Unknown Device (Tor Subnet)',
      destinationEntityName: 'FastPay Aggregator',
      amount: 890000,
      currency: 'NGN',
      riskScore: 92,
      ruleDecision: 'BLOCK',
      node: 'Providus Bank NG (Card POS)',
      channel: 'POS',
    },
  ]);

  const filtered = telemetry.filter((t) => {
    if (decisionFilter !== 'ALL' && t.ruleDecision !== decisionFilter) return false;
    if (jurisdictionFilter === 'NG' && t.currency !== 'NGN') return false;
    if (jurisdictionFilter === 'NE' && t.currency !== 'XOF') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.transactionId.toLowerCase().includes(q) ||
        t.originEntityName.toLowerCase().includes(q) ||
        t.destinationEntityName.toLowerCase().includes(q) ||
        t.node.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              SYNCHRONOUS SURVEILLANCE TELEMETRY
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ● REAL-TIME DECISION INGESTION
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Transaction Monitoring Live Stream</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time scoring stream evaluated across Providus Bank NG &amp; Coris Bank NE ledger settlement nodes.
          </p>
        </div>
      </div>

      {/* Corridor Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Stream Throughput</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">420 tx/min</div>
          <div className="text-[10px] text-emerald-400 font-mono">Sub-15ms Rule Ingestion</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Flagged for Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{telemetry.filter((t) => t.ruleDecision === 'FLAG').length}</div>
          <div className="text-[10px] text-amber-400 font-mono">Routing to AML Alert Desk</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Hard Blocked</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{telemetry.filter((t) => t.ruleDecision === 'BLOCK').length}</div>
          <div className="text-[10px] text-rose-400 font-mono">Risk Hold / Auth Gateway Reject</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Active Corridors</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">NG &amp; NE</div>
          <div className="text-[10px] text-cyan-400 font-mono">NIP / BCEAO / POS / BDC</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by transaction ref, origin, destination, or settlement node..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            {(['ALL', 'NG', 'NE'] as const).map((jur) => (
              <button
                key={jur}
                onClick={() => setJurisdictionFilter(jur)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  jurisdictionFilter === jur ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {jur === 'ALL' ? 'All Corridors' : jur === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'PASS', 'FLAG', 'BLOCK'] as const).map((dec) => (
              <button
                key={dec}
                onClick={() => setDecisionFilter(dec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  decisionFilter === dec
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {dec}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stream Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Tx ID</th>
                <th className="p-4">Origin Account</th>
                <th className="p-4">Destination Counterparty</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Risk Score</th>
                <th className="p-4">Decision</th>
                <th className="p-4 text-right">Settlement Node</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 text-slate-400">{formatDate(row.timestamp).slice(11)}</td>
                  <td className="p-4 text-slate-200 font-bold">{row.transactionId}</td>
                  <td className="p-4 font-sans font-medium text-white">{row.originEntityName}</td>
                  <td className="p-4 font-sans text-slate-300">{row.destinationEntityName}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                      {row.channel}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-emerald-400">
                    {formatCurrency(row.amount, row.currency)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.riskScore > 75
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : row.riskScore > 40
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {row.riskScore}/100
                    </span>
                  </td>
                  <td className="p-4 font-sans">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 w-fit ${
                        row.ruleDecision === 'PASS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : row.ruleDecision === 'FLAG'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {row.ruleDecision === 'PASS' && <CheckCircle className="w-3 h-3" />}
                      {row.ruleDecision === 'FLAG' && <AlertTriangle className="w-3 h-3" />}
                      {row.ruleDecision === 'BLOCK' && <XCircle className="w-3 h-3" />}
                      {row.ruleDecision}
                    </span>
                  </td>
                  <td className="p-4 text-right font-sans text-slate-400 text-[11px]">{row.node}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
