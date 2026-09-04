// =============================================================================
// File: src/app/customer/adashi/page.tsx
// Description: Customer Adashi / Ajo Hub for Personal Rotating Savings & Payouts
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Lock,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  AdashiGroup,
  AdashiGroupMember,
  AdashiCycle,
  AdashiContributionObligation,
} from '@/types/adashiEngine';

export default function CustomerAdashiHub() {
  const [groups, setGroups] = useState<AdashiGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'MY_ROTATIONS' | 'EXPLORE'>('MY_ROTATIONS');

  const currentCustomerId = 'cust-ng-101'; // Default demo customer (Amina Bello)

  const fetchCustomerCircles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/adashi/groups');
      const data = await res.json();
      if (data.success) {
        setGroups(data.data);
        if (data.data.length > 0 && !selectedGroupId) {
          setSelectedGroupId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/adashi/groups/${id}`);
      const data = await res.json();
      if (data.success) {
        setGroupDetails(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomerCircles();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchDetails(selectedGroupId);
    }
  }, [selectedGroupId]);

  const handlePayObligation = async (obligationId: string) => {
    try {
      setPayLoading(true);
      const res = await fetch('/api/v1/adashi/obligations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': `idemp-cust-${obligationId}-${Date.now()}`,
        },
        body: JSON.stringify({
          obligationId,
          paymentMethod: 'WALLET_AUTO_DEBIT',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Contribution successfully paid from KoriePay Wallet!');
        if (selectedGroupId) fetchDetails(selectedGroupId);
      } else {
        alert(data.error || 'Payment failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  const myMemberRecord: AdashiGroupMember | undefined = groupDetails?.members?.find(
    (m: AdashiGroupMember) => m.customerId === currentCustomerId || m.customerPhone === '+2348031112233'
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              TRUSTED ROTATING SAVINGS (ROSCA)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Escrow Vault Protected
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            Adashi / Ajo Collective Savings Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build discipline with trusted community circles. Cryptographically certified rotation turns, zero hidden charges, and instant payouts into your KoriePay wallet.
          </p>
        </div>

        <button
          onClick={fetchCustomerCircles}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Circle Navigation */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>MY ACTIVE CIRCLES</span>
            <span className="text-emerald-400">{groups.length}</span>
          </div>

          <div className="space-y-2">
            {groups.map((g) => {
              const isSelected = g.id === selectedGroupId;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-[#0d162a] border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-[#070b16] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs truncate max-w-[170px]">
                      {g.groupName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      g.status === 'ACTIVE_IN_PROGRESS'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {g.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2">
                    <span className="text-emerald-400 font-bold">
                      {g.currency === 'NGN' ? '₦' : 'CFA'}{g.contributionAmount.toLocaleString()} / {g.cadence.toLowerCase()}
                    </span>
                    <span>Cycle {g.currentCycleNumber}/{g.totalCycles}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Circle 360 View */}
        <div className="lg:col-span-2 space-y-5">
          {groupDetails ? (
            <div className="space-y-5">
              {/* Highlight Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0d162a] to-[#070d1d] border border-emerald-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {groupDetails.groupCode}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-0.5">
                      {groupDetails.groupName}
                    </h2>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Managed by Agent: <span className="text-slate-200 font-semibold">{groupDetails.assignedAgentName || 'Central Agent'}</span>
                    </div>
                  </div>

                  {myMemberRecord && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-right">
                      <div className="text-[10px] text-emerald-400 font-mono font-bold uppercase">MY ROTATION SLOT</div>
                      <div className="text-xl font-extrabold text-white font-mono">
                        #{myMemberRecord.assignedPosition || 1}
                      </div>
                    </div>
                  )}
                </div>

                {/* Contribution & Payout Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">My Total Contributed</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {groupDetails.currency === 'NGN' ? '₦' : 'CFA'}{(myMemberRecord?.totalContributedAmount || 20000).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">My Lump-Sum Payout</div>
                    <div className="text-sm font-extrabold text-emerald-400 mt-0.5">
                      {groupDetails.currency === 'NGN' ? '₦' : 'CFA'}{(myMemberRecord?.totalPayoutReceived || (groupDetails.contributionAmount * groupDetails.targetMembers * 0.985)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Debit Mandate</div>
                    <div className="text-sm font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Authorized</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotation Timeline Visualizer */}
              <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Cryptographic Rotation Sequence</h3>
                    <p className="text-[11px] text-slate-400">
                      Verifiable deterministic order generated via HMAC-SHA256. Zero agent tampering.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                    Fairness: 99.8%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {groupDetails.members?.map((m: AdashiGroupMember, idx: number) => {
                    const pos = m.assignedPosition || idx + 1;
                    const isMe = m.customerId === currentCustomerId || m.customerName === 'Amina Bello';
                    const isCompleted = pos < groupDetails.currentCycleNumber;
                    const isCurrent = pos === groupDetails.currentCycleNumber;

                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                          isMe
                            ? 'bg-emerald-500/10 border-emerald-500/40'
                            : isCurrent
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-slate-900/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono font-bold text-slate-300">
                            Slot #{pos}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 text-[9px] font-bold font-mono">
                              YOU
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Paid Out
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-amber-400 text-[10px] font-mono font-bold animate-pulse">
                              ● Current Turn
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-white truncate">{m.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Payout: {groupDetails.currency === 'NGN' ? '₦' : 'CFA'}{(groupDetails.contributionAmount * groupDetails.targetMembers * 0.985).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Cycle Contributions */}
              <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-white">Upcoming Contribution Obligations</h3>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-emerald-400 font-bold">CYCLE #{groupDetails.currentCycleNumber} CONTRIBUTION</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {groupDetails.currency === 'NGN' ? '₦' : 'CFA'}{groupDetails.contributionAmount.toLocaleString()} Due on Friday
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Auto-debit will execute from KoriePay Wallet. Ensure sufficient balance.
                    </div>
                  </div>

                  <button
                    onClick={() => handlePayObligation('obl-001')}
                    disabled={payLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                  >
                    Pay Contribution Now
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#0d162a] border border-white/5 text-slate-400">
              Loading your savings circles...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
