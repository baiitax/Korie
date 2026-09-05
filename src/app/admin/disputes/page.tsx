'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Search,
  RefreshCw,
  PlusCircle,
  Eye,
  DollarSign,
  Send,
  X,
  FileText,
  User,
  Smartphone,
  RotateCcw,
  Layers,
  Activity,
  Zap,
  CheckCircle,
  Lock,
  Unlock,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import {
  RecoveryCaseRecord,
  PaymentRefundRecord,
  DisputeCaseRecord,
  ChargebackCaseRecord,
} from '@/types/recoveryEngine';

export default function DisputesAndRecoveryAdminPage() {
  const [activeTab, setActiveTab] = useState<'RECOVERY' | 'DISPUTES' | 'REFUNDS' | 'CHARGEBACKS'>('RECOVERY');
  const [recoveryCases, setRecoveryCases] = useState<RecoveryCaseRecord[]>([]);
  const [disputes, setDisputes] = useState<DisputeCaseRecord[]>([]);
  const [refunds, setRefunds] = useState<PaymentRefundRecord[]>([]);
  const [chargebacks, setChargebacks] = useState<ChargebackCaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'NGN' | 'XOF'>('ALL');

  // Modal States
  const [selectedDispute, setSelectedDispute] = useState<DisputeCaseRecord | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState<'CUSTOMER_FAVOUR' | 'MERCHANT_FAVOUR' | 'NO_ACTION'>('CUSTOMER_FAVOUR');
  const [decisionNotes, setDecisionNotes] = useState('');

  // Refund Form State
  const [refundTxnRef, setRefundTxnRef] = useState('PAY-NG-20260901');
  const [refundOrigAmount, setRefundOrigAmount] = useState('5000000');
  const [refundAmount, setRefundAmount] = useState('500000');
  const [refundCurrency, setRefundCurrency] = useState<'NGN' | 'XOF'>('NGN');
  const [refundReason, setRefundReason] = useState('Customer claim: partial order delivery cancellation.');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, dispRes, refRes, cbRes] = await Promise.all([
        fetch('/api/recovery/cases').then((r) => r.json()),
        fetch('/api/disputes').then((r) => r.json()),
        fetch('/api/refunds').then((r) => r.json()),
        fetch('/api/chargebacks').then((r) => r.json()),
      ]);

      if (recRes.success) setRecoveryCases(recRes.data.cases);
      if (dispRes.success) setDisputes(dispRes.data.disputes);
      if (refRes.success) setRefunds(refRes.data.refunds);
      if (cbRes.success) setChargebacks(cbRes.data.chargebacks);
    } catch (e) {
      console.error('Failed to load recovery and dispute telemetry', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQueryProviderStatus = async (caseId: string, transactionReference: string) => {
    try {
      const res = await fetch('/api/recovery/query-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, transactionReference }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Provider Status Query Result: ${json.data.message}`);
        fetchData();
      }
    } catch (e) {
      console.error('Status inquiry error', e);
    }
  };

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalTransactionReference: refundTxnRef,
          originalAmount: refundOrigAmount,
          refundAmount: refundAmount,
          currency: refundCurrency,
          refundReason: refundReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsRefundModalOpen(false);
        setRefundReason('');
        alert(`Refund committed to Core Ledger! Refund Reference: ${json.refund.refundReference}`);
        fetchData();
      } else {
        alert(`Refund Failed: ${json.error}`);
      }
    } catch (e) {
      console.error('Refund execution error', e);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    try {
      const res = await fetch(`/api/disputes/${selectedDispute.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: decisionOutcome,
          decisionNotes: decisionNotes,
          decidedBy: 'disputes.manager@koriepay.com',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsDecisionModalOpen(false);
        setSelectedDispute(null);
        setDecisionNotes('');
        alert(`Dispute ${selectedDispute.disputeReference} resolved: [${decisionOutcome}]`);
        fetchData();
      }
    } catch (e) {
      console.error('Dispute resolution error', e);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              TRANSACTION RECOVERY &amp; REVERSALS PLATFORM
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● STATUTORY REDRESS &amp; CHARGEBACK DESK
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Financial Exception Management, Disputes &amp; Refunds Control
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Resolve timed-out NIP/BCEAO payments, double-debit anomalies, partial refunds, and acquiring network chargebacks with double-entry ledger truth.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRefundModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Process Refund</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* Financial Exposure KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Pending Recovery Cases</span>
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {recoveryCases.filter((c) => c.status !== 'RESOLVED').length}
          </div>
          <div className="text-[10px] text-amber-400 font-mono">Timed-Out / Unknown State</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Active Consumer Disputes</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {disputes.filter((d) => d.status !== 'RESOLVED').length}
          </div>
          <div className="text-[10px] text-rose-400 font-mono">Dispute Reserves Held</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Refunds Executed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{refunds.length}</div>
          <div className="text-[10px] text-emerald-400 font-mono">100% Reconciled to GL</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Network Chargebacks</span>
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{chargebacks.length}</div>
          <div className="text-[10px] text-cyan-400 font-mono">NIBSS &amp; GIM-UEMOA</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'RECOVERY', label: 'Unknown & Failed Recovery', icon: RotateCcw, count: recoveryCases.length },
          { id: 'DISPUTES', label: 'Disputes & Evidence Vault', icon: AlertCircle, count: disputes.length },
          { id: 'REFUNDS', label: 'Refunds & Ledger Compensations', icon: CheckCircle2, count: refunds.length },
          { id: 'CHARGEBACKS', label: 'Network Chargebacks', icon: ShieldAlert, count: chargebacks.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: RECOVERY DESK */}
      {activeTab === 'RECOVERY' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {recoveryCases.map((rc) => (
              <div
                key={rc.id}
                className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 hover:border-amber-500/40 transition space-y-3 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-800/40">
                      {rc.caseReference}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                        rc.priority === 'P0' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {rc.priority} PRIORITY
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      Category: {rc.failureCategory}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                      Node: {rc.providerId}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400">Exposure: </span>
                    <span className="text-sm font-extrabold text-emerald-400 font-mono">
                      {rc.currency} {rc.financialExposure.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Subject Customer</span>
                    <span className="text-white font-bold">{rc.customerName || rc.customerId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Transaction Reference</span>
                    <span className="text-emerald-400 font-mono">{rc.transactionReference}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>Status: <strong className="text-white">{rc.status}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      SLA Due: {new Date(rc.slaDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {rc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleQueryProviderStatus(rc.id, rc.transactionReference)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Query Provider Status Adapter
                    </button>
                  )}
                  {rc.status === 'RESOLVED' && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-800/40">
                      RESOLVED &amp; RECONCILED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: DISPUTES & EVIDENCE */}
      {activeTab === 'DISPUTES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {disputes.map((disp) => (
              <div
                key={disp.id}
                className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-3 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded border border-rose-800/40">
                      {disp.disputeReference}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                      {disp.category}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      Claimant: {disp.claimantType}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400">Claim Amount: </span>
                    <span className="text-sm font-extrabold text-rose-400 font-mono">
                      {disp.currency} {disp.claimAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-xs bg-slate-950/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Claimant:</span>
                    <span className="text-white font-bold">{disp.claimantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Linked Transaction:</span>
                    <span className="text-emerald-400 font-mono">{disp.transactionReference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Held Dispute Reserve:</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {disp.currency} {disp.heldReserveAmount.toLocaleString()} Locked
                    </span>
                  </div>
                </div>

                {/* Evidence Attachments */}
                {disp.evidence && disp.evidence.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1 text-xs">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      Hash-Verified Evidence ({disp.evidence.length} files)
                    </span>
                    {disp.evidence.map((ev) => (
                      <div key={ev.id} className="flex justify-between items-center text-[11px] font-mono text-slate-300">
                        <span>{ev.fileName} ({ev.evidenceType})</span>
                        <span className="text-emerald-400">SHA256: {ev.fileHashSha256.slice(0, 16)}...</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-400 font-mono">
                    Status: <strong className="text-white">{disp.status}</strong>
                    {disp.resolutionOutcome && (
                      <span className="ml-2 text-emerald-400">({disp.resolutionOutcome})</span>
                    )}
                  </div>

                  {disp.status !== 'RESOLVED' && (
                    <button
                      onClick={() => {
                        setSelectedDispute(disp);
                        setIsDecisionModalOpen(true);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve Dispute Claim
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: REFUNDS & COMPENSATIONS */}
      {activeTab === 'REFUNDS' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#080D1A]/90 border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950/80 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Executed Core Ledger Refunds ({refunds.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-4 font-semibold">Refund Ref</th>
                    <th className="p-4 font-semibold">Customer</th>
                    <th className="p-4 font-semibold">Original Tx Ref</th>
                    <th className="p-4 font-semibold">Original Amount</th>
                    <th className="p-4 font-semibold">Refund Amount</th>
                    <th className="p-4 font-semibold">Remaining Allowance</th>
                    <th className="p-4 font-semibold text-right">GL Journal Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {refunds.map((ref) => (
                    <tr key={ref.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-amber-400">{ref.refundReference}</td>
                      <td className="p-4 font-bold text-white font-sans">{ref.customerName}</td>
                      <td className="p-4 text-emerald-400">{ref.originalTransactionReference}</td>
                      <td className="p-4 text-slate-300">{ref.currency} {ref.originalAmount.toLocaleString()}</td>
                      <td className="p-4 font-bold text-emerald-400">{ref.currency} {ref.refundAmount.toLocaleString()}</td>
                      <td className="p-4 text-slate-400">{ref.currency} {ref.remainingRefundableAmount.toLocaleString()}</td>
                      <td className="p-4 text-right text-slate-300 font-sans">{ref.glJournalId || 'Automated Ledger Entry'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: CHARGEBACKS */}
      {activeTab === 'CHARGEBACKS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {chargebacks.map((cb) => (
              <div
                key={cb.id}
                className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-3 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded border border-rose-800/40">
                      {cb.chargebackReference}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      Network: {cb.networkSource}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400">Chargeback Volume: </span>
                    <span className="text-sm font-extrabold text-rose-400 font-mono">
                      {cb.currency} {cb.chargebackAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-xs bg-slate-950/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reason Code:</span>
                    <span className="text-white font-mono font-bold">{cb.reasonCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Response Deadline:</span>
                    <span className="text-rose-400 font-mono font-bold">
                      {new Date(cb.responseDeadline).toLocaleDateString()} ({new Date(cb.responseDeadline).toLocaleTimeString()})
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 text-xs font-mono">
                  <span className="text-slate-400">Status: <strong className="text-amber-400">{cb.status}</strong></span>
                  <button className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold">
                    Submit Representment Dossier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Process Core Ledger Compensating Refund
              </h3>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleExecuteRefund} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Target Transaction Reference</label>
                <input
                  type="text"
                  value={refundTxnRef}
                  onChange={(e) => setRefundTxnRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Original Volume</label>
                  <input
                    type="number"
                    value={refundOrigAmount}
                    onChange={(e) => setRefundOrigAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1">Refund Amount</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold text-emerald-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Currency Corridor</label>
                <select
                  value={refundCurrency}
                  onChange={(e) => setRefundCurrency(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="NGN">NGN (Nigeria - Providus Bank Node)</option>
                  <option value="XOF">XOF (Niger Republic - Coris Bank Node)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Refund Justification &amp; Customer Reason</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Document grounds for refund..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white h-24"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                🛡️ Non-Negotiable Financial Invariant: Automatically validates remaining refundable balance to prevent double-refund attacks.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!refundReason}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg"
                >
                  Post Compensating Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPUTE DECISION MODAL */}
      {isDecisionModalOpen && selectedDispute && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-amber-400" />
                Resolve Dispute: {selectedDispute.disputeReference}
              </h3>
              <button onClick={() => setIsDecisionModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Decision Outcome</label>
                <select
                  value={decisionOutcome}
                  onChange={(e) => setDecisionOutcome(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="CUSTOMER_FAVOUR">CUSTOMER FAVOUR (Post Redress Refund)</option>
                  <option value="MERCHANT_FAVOUR">MERCHANT FAVOUR (Release Held Reserve)</option>
                  <option value="NO_ACTION">DISMISS / NO ACTION</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Resolution Justification Notes</label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Document forensic findings and evidence verification..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white h-24"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsDecisionModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveDispute}
                disabled={!decisionNotes}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg"
              >
                Authorize Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
