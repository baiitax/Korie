// =============================================================================
// File: src/app/agent/adashi/page.tsx
// Description: Agent Adashi / Ajo Command Center — real DB-backed lifecycle
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Lock,
  ArrowRight,
  X,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { agencyApiFetch } from '@/lib/agency/agentSession';

interface AdashiProductSummary {
  id: string;
  productCode: string;
  productName: string;
  currency: 'NGN' | 'XOF';
  contributionAmount: number;
  cadence: string;
  minMembers: number;
  maxMembers: number;
  platformFeePercent: number;
  agentCommissionPercent: number;
  payoutMakerCheckerThreshold: number;
}

interface AdashiGroupSummary {
  id: string;
  reference: string;
  name: string;
  currency: 'NGN' | 'XOF';
  contributionAmount: number;
  frequency: string;
  targetMembers: number;
  currentMembersCount: number;
  totalCycles: number;
  currentCycleNumber: number;
  totalPoolVolume: number;
  status: string;
}

interface GroupDetail {
  id: string;
  groupCode: string;
  groupName: string;
  currency: string;
  cadence: string;
  contributionAmount: number;
  targetMembers: number;
  currentMembersCount: number;
  totalCycles: number;
  currentCycleNumber: number;
  totalPoolVolume: number;
  status: string;
  members: {
    id: string;
    customerName: string;
    customerPhone: string | null;
    status: string;
    kycTier: number;
    assignedPosition: number | null;
    mandateAuthorized: boolean;
    totalContributedAmount: number;
    totalPayoutReceived: number;
  }[];
  cycles: {
    id: string;
    cycleNumber: number;
    beneficiaryName: string;
    expectedCollectionAmount: number;
    actualCollectedAmount: number;
    netPayoutAmount: number;
    currency: string;
    status: string;
    obligations: { id: string; amount: number; currency: string; status: string; dueDate: string; paidAt: string | null }[];
  }[];
}

function symbol(currency: string) {
  return currency === 'NGN' ? '₦' : 'CFA';
}

export default function AgentAdashiPage() {
  const [groups, setGroups] = useState<AdashiGroupSummary[]>([]);
  const [products, setProducts] = useState<AdashiProductSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ productId: '', groupName: '', targetMembers: 6 });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      const [groupsRes, productsRes] = await Promise.all([
        agencyApiFetch('/api/v1/agency/adashi/groups').then((r) => r.json()),
        agencyApiFetch('/api/v1/agency/adashi/products').then((r) => r.json()),
      ]);
      if (groupsRes.data) {
        const list: AdashiGroupSummary[] = groupsRes.data.groups || [];
        setGroups(list);
        if (list.length > 0 && !selectedGroupId) setSelectedGroupId(list[0].id);
      }
      if (productsRes.data) {
        const list: AdashiProductSummary[] = productsRes.data.products || [];
        setProducts(list);
        if (list.length > 0 && !createForm.productId) {
          setCreateForm((prev) => ({ ...prev, productId: list[0].id }));
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
      const res = await agencyApiFetch(`/api/v1/agency/adashi/groups/${id}`);
      const data = await res.json();
      if (data.data) setSelectedGroupDetails(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAgentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedGroupId) fetchGroupDetails(selectedGroupId);
  }, [selectedGroupId]);

  const runAction = async (fn: () => Promise<Response>, successRefresh = true) => {
    try {
      setActionLoading(true);
      setNotice(null);
      const res = await fn();
      const data = await res.json();
      if (res.ok) {
        setNotice({ ok: true, text: data.message || 'Done.' });
        if (successRefresh && selectedGroupId) fetchGroupDetails(selectedGroupId);
        fetchAgentData();
        return true;
      } else {
        setNotice({ ok: false, text: data.error?.message || 'Action failed.' });
        return false;
      }
    } catch (err: any) {
      setNotice({ ok: false, text: err.message });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await runAction(() =>
      agencyApiFetch('/api/v1/agency/adashi/groups', { method: 'POST', body: JSON.stringify(createForm) }),
      false,
    );
    if (ok) {
      setShowCreateModal(false);
      setCreateForm({ productId: products[0]?.id || '', groupName: '', targetMembers: 6 });
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    const ok = await runAction(() =>
      agencyApiFetch(`/api/v1/agency/adashi/groups/${selectedGroupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ customerPhone: invitePhone }),
      }),
    );
    if (ok) {
      setShowInviteModal(false);
      setInvitePhone('');
    }
  };

  const handleLockQuorum = () =>
    selectedGroupId && runAction(() => agencyApiFetch(`/api/v1/agency/adashi/groups/${selectedGroupId}/lock`, { method: 'POST' }));

  const handleGenerateRotation = () =>
    selectedGroupId && runAction(() => agencyApiFetch(`/api/v1/agency/adashi/groups/${selectedGroupId}/allocate`, { method: 'POST' }));

  const handleStartGroup = () =>
    selectedGroupId && runAction(() => agencyApiFetch(`/api/v1/agency/adashi/groups/${selectedGroupId}/start`, { method: 'POST' }));

  const handleCollectObligation = (obligationId: string) =>
    runAction(() =>
      agencyApiFetch(`/api/v1/agency/adashi/obligations/${obligationId}/collect`, {
        method: 'POST',
        headers: { 'idempotency-key': `idemp-agent-${obligationId}-${Date.now()}` },
      }),
    );

  const handleTriggerPayout = (cycleId: string) =>
    runAction(() => agencyApiFetch(`/api/v1/agency/adashi/cycles/${cycleId}/payout`, { method: 'POST' }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              AGENT ROSCA HUB
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live escrow ledger
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">Adashi / Ajo Agent Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create trusted community savings circles, verify member quorum, enforce electronic mandates, and trigger real ledger-backed cycle payouts.
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

      {notice && (
        <div className={`p-3 rounded-xl border text-xs ${notice.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>MY ADASHI CIRCLES</span>
            <span className="text-amber-400">{groups.length}</span>
          </div>

          {!loading && groups.length === 0 && (
            <div className="p-6 text-center rounded-2xl bg-[#0d162a] border border-white/5 text-slate-400 text-xs">
              You have no assigned circles yet. Create one to get started.
            </div>
          )}

          <div className="space-y-2">
            {groups.map((g) => {
              const isSelected = g.id === selectedGroupId;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                    isSelected ? 'bg-[#0d162a] border-amber-500/50 shadow-lg shadow-amber-500/10' : 'bg-[#070b16] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs truncate max-w-[180px]">{g.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        g.status === 'ACTIVE_IN_PROGRESS'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : g.status === 'MEMBERSHIP_LOCKED' || g.status === 'ROTATION_PUBLISHED'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {g.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                    <span className="text-amber-400 font-bold">
                      {symbol(g.currency)}{g.contributionAmount.toLocaleString()}
                    </span>
                    <span>{g.currentMembersCount}/{g.targetMembers} Savers</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${g.totalCycles ? (g.currentCycleNumber / g.totalCycles) * 100 : 0}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {selectedGroupDetails ? (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-amber-400 font-bold">{selectedGroupDetails.groupCode}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300">
                        {selectedGroupDetails.currency} • {selectedGroupDetails.cadence}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1">{selectedGroupDetails.groupName}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedGroupDetails.status === 'OPEN_FOR_MEMBERS' && (
                      <button
                        onClick={handleLockQuorum}
                        disabled={actionLoading || selectedGroupDetails.members.length !== selectedGroupDetails.targetMembers}
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Total Pool Volume</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {symbol(selectedGroupDetails.currency)}{selectedGroupDetails.totalPoolVolume.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Contribution / Slot</div>
                    <div className="text-sm font-extrabold text-amber-400 mt-0.5">
                      {symbol(selectedGroupDetails.currency)}{selectedGroupDetails.contributionAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Quorum Savers</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {selectedGroupDetails.members.length} / {selectedGroupDetails.targetMembers}
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

              <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Enrolled Circle Savers</h3>
                    <p className="text-[11px] text-slate-400">Each member accepts their own invitation and authorizes their debit mandate in the customer app.</p>
                  </div>
                  {selectedGroupDetails.status === 'OPEN_FOR_MEMBERS' && (
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
                  {selectedGroupDetails.members.length === 0 && (
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-xs text-slate-400">No members invited yet.</div>
                  )}
                  {selectedGroupDetails.members.map((m) => (
                    <div key={m.id} className="p-3 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">
                          {m.assignedPosition ? `#${m.assignedPosition}` : '•'}
                        </div>
                        <div>
                          <div className="font-bold text-white">{m.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{m.customerPhone} • Tier {m.kycTier}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <div className="text-slate-300">Contributed: {symbol(selectedGroupDetails.currency)}{m.totalContributedAmount.toLocaleString()}</div>
                          <div className="text-[10px] text-emerald-400">Payout: {symbol(selectedGroupDetails.currency)}{m.totalPayoutReceived.toLocaleString()}</div>
                        </div>

                        {m.status === 'INVITED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/10 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Awaiting saver consent
                          </span>
                        )}
                        {m.mandateAuthorized ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Mandate Active</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">Mandate Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedGroupDetails.cycles.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-white">Active Cycle Execution</h3>
                  {selectedGroupDetails.cycles.map((cyc) => (
                    <div key={cyc.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-mono text-emerald-400 font-bold">CYCLE #{cyc.cycleNumber}</div>
                          <div className="text-sm font-bold text-white">Beneficiary: {cyc.beneficiaryName}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-white/5 text-slate-300">{cyc.status.replaceAll('_', ' ')}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/5">
                        <div>
                          <span className="text-slate-400">Collected: </span>
                          <span className="font-bold text-white">
                            {symbol(cyc.currency)}{cyc.actualCollectedAmount.toLocaleString()} / {cyc.expectedCollectionAmount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Net Beneficiary Payout: </span>
                          <span className="font-bold text-emerald-400">{symbol(cyc.currency)}{cyc.netPayoutAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      {cyc.obligations.some((o) => o.status !== 'PAID') && (
                        <div className="pt-2 border-t border-white/5 space-y-1.5">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Outstanding contributions</div>
                          {cyc.obligations.filter((o) => o.status !== 'PAID').map((o) => (
                            <div key={o.id} className="flex items-center justify-between text-[11px] font-mono bg-slate-950/40 rounded-lg px-2.5 py-1.5">
                              <span className="text-slate-300">{symbol(o.currency)}{o.amount.toLocaleString()} • {o.status}</span>
                              <button
                                onClick={() => handleCollectObligation(o.id)}
                                disabled={actionLoading}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold"
                              >
                                <Wallet className="w-3 h-3" /> Collect Cash
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

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
                      {cyc.status === 'PAYOUT_PENDING_APPROVAL' && (
                        <div className="flex justify-end pt-2">
                          <span className="text-[11px] font-mono text-amber-400">Awaiting compliance officer approval (maker-checker threshold).</span>
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
                      {p.productName} ({p.currency} - {symbol(p.currency)}{p.contributionAmount.toLocaleString()})
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
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                  Create Circle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <label className="text-[10px] text-slate-400 uppercase font-mono">Saver's Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+2348012345678"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  The saver must already have a KoriePay account. We'll send them the invitation to accept and authorize their contribution mandate.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
