// =============================================================================
// File: src/app/agent/adashi/page.tsx
// Description: Agent Adashi / Ajo Command Center for Agent Operations
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  Users,
  Plus,
  QrCode,
  Lock,
  Share2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  Sliders,
  DollarSign,
  ChevronRight,
  X,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import {
  AdashiGroup,
  AdashiProduct,
  AdashiGroupMember,
  AdashiCycle,
  AdashiContributionObligation,
} from '@/types/adashiEngine';

export default function AgentAdashiPage() {
  const [groups, setGroups] = useState<AdashiGroup[]>([]);
  const [products, setProducts] = useState<AdashiProduct[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Wizard State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createForm, setCreateForm] = useState({
    productId: '',
    groupName: '',
    targetMembers: 6,
  });

  // Invite Member Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    kycTier: 2,
  });
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      const [groupsRes, productsRes] = await Promise.all([
        fetch('/api/v1/adashi/groups').then((r) => r.json()),
        fetch('/api/v1/adashi/products').then((r) => r.json()),
      ]);

      if (groupsRes.success) {
        setGroups(groupsRes.data);
        if (groupsRes.data.length > 0 && !selectedGroupId) {
          setSelectedGroupId(groupsRes.data[0].id);
        }
      }
      if (productsRes.success) {
        setProducts(productsRes.data);
        if (productsRes.data.length > 0 && !createForm.productId) {
          setCreateForm((prev) => ({ ...prev, productId: productsRes.data[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/adashi/groups/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedGroupDetails(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetails(selectedGroupId);
    }
  }, [selectedGroupId]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch('/api/v1/adashi/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          creatorId: 'usr-agent-001',
          creatorRole: 'AGENT',
          creatorName: 'Ibrahim Danladi',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setCreateStep(1);
        await fetchAgentData();
        setSelectedGroupId(data.data.id);
      } else {
        alert(data.error || 'Creation failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/adashi/groups/${selectedGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-agent-001' },
        body: JSON.stringify({
          customerId: `cust-agent-${Date.now().toString().slice(-4)}`,
          ...inviteForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowInviteModal(false);
        setInviteForm({ customerName: '', customerPhone: '', customerEmail: '', kycTier: 2 });
        fetchGroupDetails(selectedGroupId);
        fetchAgentData();
      } else {
        alert(data.error || 'Failed to invite member');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptMemberConsent = async (memberId: string) => {
    if (!selectedGroupId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/adashi/groups/${selectedGroupId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          consentGranted: true,
          mandateAuthorized: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchGroupDetails(selectedGroupId);
      } else {
        alert(data.error || 'Consent recording failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockQuorum = async () => {
    if (!selectedGroupId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/adashi/groups/${selectedGroupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-agent-001' },
        body: JSON.stringify({ action: 'LOCK_MEMBERSHIP' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchGroupDetails(selectedGroupId);
        fetchAgentData();
      } else {
        alert(data.error || 'Lock failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateRotation = async () => {
    if (!selectedGroupId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/adashi/groups/${selectedGroupId}/rotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-agent-001' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        fetchGroupDetails(selectedGroupId);
        fetchAgentData();
      } else {
        alert(data.error || 'Rotation failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartGroup = async () => {
    if (!selectedGroupId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/adashi/groups/${selectedGroupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-agent-001' },
        body: JSON.stringify({ action: 'START_GROUP' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchGroupDetails(selectedGroupId);
        fetchAgentData();
      } else {
        alert(data.error || 'Start failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollectObligation = async (obligationId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/v1/adashi/obligations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': `idemp-agent-${obligationId}-${Date.now()}`,
        },
        body: JSON.stringify({ obligationId, paymentMethod: 'CASH_AGENT_COLLECTED' }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedGroupId) fetchGroupDetails(selectedGroupId);
      } else {
        alert(data.error || 'Collection failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerPayout = async (cycleId: string) => {
    if (!selectedGroupId) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/v1/adashi/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'usr-agent-001',
          'x-user-name': 'Agent Ibrahim Danladi',
        },
        body: JSON.stringify({ adashiId: selectedGroupId, cycleId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Payout initiated! If amount is >= 500k, it is routed to Super Admin Maker-Checker dual control queue.');
        fetchGroupDetails(selectedGroupId);
        fetchAgentData();
      } else {
        alert(data.error || 'Payout initiation failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const currentGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              AGENT ROSCA HUB
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Commission: 0.5% - 1.0%
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            Adashi / Ajo Agent Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create trusted community savings circles, verify member quorum, enforce electronic mandates, and trigger guaranteed cycle payouts.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Adashi</span>
        </button>
      </div>

      {/* Main Grid: Left Group Selector, Right Group Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Circle List */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>MY ADASHI CIRCLES</span>
            <span className="text-amber-400">{groups.length}</span>
          </div>

          <div className="space-y-2">
            {groups.map((g) => {
              const isSelected = g.id === selectedGroupId;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-[#0d162a] border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-[#070b16] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs truncate max-w-[180px]">
                      {g.groupName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      g.status === 'ACTIVE_IN_PROGRESS'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : g.status === 'MEMBERSHIP_LOCKED'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {g.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                    <span className="text-amber-400 font-bold">
                      {g.currency === 'NGN' ? '₦' : 'CFA'}{g.contributionAmount.toLocaleString()}
                    </span>
                    <span>{g.currentMembersCount}/{g.targetMembers} Savers</span>
                  </div>

                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${(g.currentCycleNumber / g.totalCycles) * 100}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Group Workspace */}
        <div className="lg:col-span-2 space-y-5">
          {selectedGroupDetails ? (
            <div className="space-y-5">
              {/* Group Hero Card */}
              <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        {selectedGroupDetails.groupCode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300">
                        {selectedGroupDetails.currency} • {selectedGroupDetails.cadence}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1">
                      {selectedGroupDetails.groupName}
                    </h2>
                  </div>

                  {/* Stage Action Button */}
                  <div className="flex items-center gap-2">
                    {selectedGroupDetails.status === 'INVITING_MEMBERS' && (
                      <button
                        onClick={handleLockQuorum}
                        disabled={actionLoading || selectedGroupDetails.members?.length !== selectedGroupDetails.targetMembers}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-lg shadow-blue-500/20"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock Membership Quorum</span>
                      </button>
                    )}

                    {selectedGroupDetails.status === 'MEMBERSHIP_LOCKED' && (
                      <button
                        onClick={handleGenerateRotation}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-bold shadow-lg shadow-purple-500/20"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Publish Deterministic Rotation</span>
                      </button>
                    )}

                    {selectedGroupDetails.status === 'ROTATION_PUBLISHED' && (
                      <button
                        onClick={handleStartGroup}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Start Cycle 1 Collection</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Total Pool Volume</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {selectedGroupDetails.currency === 'NGN' ? '₦' : 'CFA'}{selectedGroupDetails.totalPoolVolume.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Contribution / Slot</div>
                    <div className="text-sm font-extrabold text-amber-400 mt-0.5">
                      {selectedGroupDetails.currency === 'NGN' ? '₦' : 'CFA'}{selectedGroupDetails.contributionAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Quorum Savers</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {selectedGroupDetails.members?.length || 0} / {selectedGroupDetails.targetMembers}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Current Cycle</div>
                    <div className="text-sm font-extrabold text-emerald-400 mt-0.5">
                      #{selectedGroupDetails.currentCycleNumber} of {selectedGroupDetails.totalCycles}
                    </div>
                  </div>
                </div>
              </div>

              {/* Members Enrolled Section */}
              <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Enrolled Circle Savers</h3>
                    <p className="text-[11px] text-slate-400">
                      All members must grant electronic debit mandate before membership locking.
                    </p>
                  </div>
                  {selectedGroupDetails.status === 'INVITING_MEMBERS' && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/20 text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Invite Member</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedGroupDetails.members?.map((m: AdashiGroupMember) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">
                          {m.assignedPosition ? `#${m.assignedPosition}` : '•'}
                        </div>
                        <div>
                          <div className="font-bold text-white">{m.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {m.customerPhone} • Tier {m.kycTier}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <div className="text-slate-300">
                            Contributed: {selectedGroupDetails.currency === 'NGN' ? '₦' : 'CFA'}{m.totalContributedAmount.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-emerald-400">
                            Payout: {selectedGroupDetails.currency === 'NGN' ? '₦' : 'CFA'}{m.totalPayoutReceived.toLocaleString()}
                          </div>
                        </div>

                        {m.status === 'INVITED' && (
                          <button
                            onClick={() => handleAcceptMemberConsent(m.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold"
                          >
                            Record Consent
                          </button>
                        )}

                        {m.mandateAuthorized ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            Mandate Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Mandate Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Cycle Operations */}
              {selectedGroupDetails.cycles?.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-white">Active Cycle Execution</h3>
                  {selectedGroupDetails.cycles.map((cyc: AdashiCycle) => (
                    <div key={cyc.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-mono text-emerald-400 font-bold">CYCLE #{cyc.cycleNumber}</div>
                          <div className="text-sm font-bold text-white">Beneficiary: {cyc.beneficiaryName}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-white/5 text-slate-300">
                          {cyc.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/5">
                        <div>
                          <span className="text-slate-400">Collected: </span>
                          <span className="font-bold text-white">
                            {cyc.currency === 'NGN' ? '₦' : 'CFA'}{cyc.actualCollectedAmount.toLocaleString()} / {cyc.expectedCollectionAmount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Net Beneficiary Payout: </span>
                          <span className="font-bold text-emerald-400">
                            {cyc.currency === 'NGN' ? '₦' : 'CFA'}{cyc.netPayoutAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {cyc.status === 'COLLECTION_COMPLETED' && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleTriggerPayout(cyc.id)}
                            disabled={actionLoading}
                            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
                          >
                            Disburse Beneficiary Payout
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#0d162a] border border-white/5 text-slate-400">
              Select or create an Adashi circle to manage operations.
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1d] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Create New Adashi Group</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Select Product Template</label>
                <select
                  value={createForm.productId}
                  onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.currency} - {p.currency === 'NGN' ? '₦' : 'CFA'}{p.contributionAmount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Circle / Guild Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alaba Traders Savings Circle"
                  value={createForm.groupName}
                  onChange={(e) => setCreateForm({ ...createForm, groupName: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Target Quorum Members</label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  required
                  value={createForm.targetMembers}
                  onChange={(e) => setCreateForm({ ...createForm, targetMembers: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Create Circle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1d] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Invite Saver to Adashi</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteMember} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Saver Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Halima Danbaba"
                  value={inviteForm.customerName}
                  onChange={(e) => setInviteForm({ ...inviteForm, customerName: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Phone Number (WhatsApp/SMS)</label>
                <input
                  type="text"
                  required
                  placeholder="+2348012345678"
                  value={inviteForm.customerPhone}
                  onChange={(e) => setInviteForm({ ...inviteForm, customerPhone: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">KYC Verification Tier</label>
                <select
                  value={inviteForm.kycTier}
                  onChange={(e) => setInviteForm({ ...inviteForm, kycTier: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                >
                  <option value={1}>Tier 1 (Phone Verified - Max 20k)</option>
                  <option value={2}>Tier 2 (BVN / NIN / National ID Verified)</option>
                  <option value={3}>Tier 3 (Address & Biometric Certified)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
