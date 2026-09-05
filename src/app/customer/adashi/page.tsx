// =============================================================================
// File: src/app/customer/adashi/page.tsx
// Description: Customer Adashi / Ajo Hub for Personal Rotating Savings & Payouts
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCustomer } from '@/components/customer/CustomerContext';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
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
  const { t } = useCustomer();
  const [groups, setGroups] = useState<AdashiGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'MY_ROTATIONS' | 'EXPLORE'>('MY_ROTATIONS');

  const currentCustomerId = 'cust-ng-101';

  const fetchCustomerCircles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/adashi/groups');
      const data = await res.json();
      if (data.success) {
        setGroups(data.data);
        if (data.data.length > 0 && !selectedGroupId) setSelectedGroupId(data.data[0].id);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/adashi/groups/${id}`);
      const data = await res.json();
      if (data.success) setGroupDetails(data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchCustomerCircles(); }, []);
  useEffect(() => { if (selectedGroupId) fetchDetails(selectedGroupId); }, [selectedGroupId]);

  const handlePayObligation = async (obligationId: string) => {
    try {
      setPayLoading(true);
      const res = await fetch('/api/v1/adashi/obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'idempotency-key': `idemp-cust-${obligationId}-${Date.now()}` },
        body: JSON.stringify({ obligationId, paymentMethod: 'WALLET_AUTO_DEBIT' }),
      });
      const data = await res.json();
      if (data.success) {
        alert(t('customer.adashi.paySuccess'));
        if (selectedGroupId) fetchDetails(selectedGroupId);
      } else {
        alert(data.error || t('customer.adashi.payFailed'));
      }
    } catch (err: any) { alert(err.message); } finally { setPayLoading(false); }
  };

  const myMemberRecord: AdashiGroupMember | undefined = groupDetails?.members?.find(
    (m: AdashiGroupMember) => m.customerId === currentCustomerId || m.customerPhone === '+2348031112233'
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-border)] font-bold">
              {t('customer.adashi.trustedRosca')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[var(--info-soft)] text-[var(--info)] border border-[var(--info-soft)]">
              {t('customer.adashi.escrowVault')}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] mt-1">{t('customer.adashi.title')}</h1>
          <p className="text-xs text-[var(--foreground-muted)] mt-1">{t('customer.adashi.subtitle')}</p>
        </div>
        <button onClick={fetchCustomerCircles} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] text-xs font-semibold transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('customer.adashi.syncStatus')}</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Circle Navigation */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-[var(--foreground-muted)] font-bold flex items-center justify-between">
            <span>{t('customer.adashi.myActiveCircles')}</span>
            <span className="text-[var(--brand-primary)]">{groups.length}</span>
          </div>
          <div className="space-y-2">
            {groups.map((g) => {
              const isSelected = g.id === selectedGroupId;
              return (
                <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected ? 'bg-[var(--brand-soft)] border-[var(--border-strong)] shadow-[var(--shadow-sm)]' : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--foreground)] text-xs truncate max-w-[170px]">{g.groupName}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      g.status === 'ACTIVE_IN_PROGRESS' ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)]' : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                    }`}>{g.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--foreground-muted)] mt-2">
                    <span className="text-[var(--brand-primary)] font-bold">
                      {g.currency === 'NGN' ? '₦' : 'CFA'}{g.contributionAmount.toLocaleString()} / {g.cadence.toLowerCase()}
                    </span>
                    <span>{t('customer.adashi.slot')} {g.currentCycleNumber}/{g.totalCycles}</span>
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
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--brand-border)] space-y-4 shadow-[var(--shadow-card)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[var(--brand-primary)] font-bold">{groupDetails.groupCode}</span>
                    <h2 className="text-lg font-bold text-[var(--foreground)] mt-0.5">{groupDetails.groupName}</h2>
                    <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                      {t('customer.adashi.rotationSequence')}: <span className="text-[var(--foreground)] font-semibold">{groupDetails.assignedAgentName || t('customer.adashi.slot')}</span>
                    </div>
                  </div>
                  {myMemberRecord && (
                    <div className="p-3 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-right">
                      <div className="text-[10px] text-[var(--brand-primary)] font-mono font-bold uppercase">{t('customer.adashi.myRotationSlot')}</div>
                      <div className="text-xl font-extrabold text-[var(--foreground)] font-mono">#{myMemberRecord.assignedPosition || 1}</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                  <Metric label={t('customer.adashi.myTotalContributed')} value={`${groupDetails.currency === 'NGN' ? '₦' : 'CFA'}${(myMemberRecord?.totalContributedAmount || 20000).toLocaleString()}`} />
                  <Metric label={t('customer.adashi.myLumpSumPayout')} value={`${groupDetails.currency === 'NGN' ? '₦' : 'CFA'}${(myMemberRecord?.totalPayoutReceived || (groupDetails.contributionAmount * groupDetails.targetMembers * 0.985)).toLocaleString()}`} accent />
                  <Metric label={t('customer.adashi.debitMandate')} value={<span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t('customer.adashi.authorized')}</span>} accent />
                </div>
              </div>

              {/* Rotation Timeline Visualizer */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]">{t('customer.adashi.rotationSequence')}</h3>
                    <p className="text-[11px] text-[var(--foreground-muted)]">{t('customer.adashi.rotationSeqDesc')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {groupDetails.members?.map((m: AdashiGroupMember, idx: number) => {
                    const pos = m.assignedPosition || idx + 1;
                    const isMe = m.customerId === currentCustomerId || m.customerName === 'Amina Bello';
                    const isCompleted = pos < groupDetails.currentCycleNumber;
                    const isCurrent = pos === groupDetails.currentCycleNumber;
                    return (
                      <div key={m.id} className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                        isMe ? 'bg-[var(--brand-soft)] border-[var(--brand-border)]'
                        : isCurrent ? 'bg-[var(--warning-soft)] border-[var(--warning-soft)]'
                        : 'bg-[var(--surface-elevated)] border-[var(--border)]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-[var(--surface)] text-[10px] font-mono font-bold text-[var(--foreground-muted)]">{t('customer.adashi.slot')} #{pos}</span>
                          {isMe && <span className="px-1.5 py-0.5 rounded bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-[9px] font-bold font-mono">{t('customer.adashi.you')}</span>}
                          {isCompleted && <span className="text-[var(--success)] text-[10px] font-mono font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> {t('customer.adashi.paidOut')}</span>}
                          {isCurrent && <span className="text-[var(--warning)] text-[10px] font-mono font-bold animate-pulse">● {t('customer.adashi.currentTurn')}</span>}
                        </div>
                        <div className="font-bold text-[var(--foreground)] truncate">{m.customerName}</div>
                        <div className="text-[10px] text-[var(--foreground-muted)] font-mono">
                          {t('customer.adashi.payout')}: {groupDetails.currency === 'NGN' ? '₦' : 'CFA'}{(groupDetails.contributionAmount * groupDetails.targetMembers * 0.985).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Cycle Contributions */}
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4 shadow-[var(--shadow-card)]">
                <h3 className="text-sm font-bold text-[var(--foreground)]">{t('customer.adashi.contributionObligations')}</h3>
                <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-[var(--brand-primary)] font-bold">{t('customer.adashi.contributionDue', { cycle: groupDetails.currentCycleNumber }).toUpperCase()}</div>
                    <div className="text-sm font-bold text-[var(--foreground)] mt-0.5">
                      {groupDetails.currency === 'NGN' ? '₦' : 'CFA'}{groupDetails.contributionAmount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{t('customer.adashi.autoDebitNote')}</div>
                  </div>
                  <button onClick={() => handlePayObligation('obl-001')} disabled={payLoading}
                    className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] text-xs font-bold shadow-[var(--shadow-md)] whitespace-nowrap disabled:opacity-50">
                    {t('customer.adashi.payContribution')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]">
              {t('customer.adashi.loading')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
      <div className="text-[10px] text-[var(--foreground-muted)] uppercase">{label}</div>
      <div className={`text-sm font-extrabold mt-0.5 ${accent ? 'text-[var(--brand-primary)]' : 'text-[var(--foreground)]'}`}>{value}</div>
    </div>
  );
}
