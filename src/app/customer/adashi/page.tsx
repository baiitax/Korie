// =============================================================================
// File: src/app/customer/adashi/page.tsx
// Description: Customer Adashi / Ajo Hub — real DB-backed rotating savings
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCustomer } from '@/components/customer/CustomerContext';
import { customerApiFetch } from '@/lib/customer/customerSession';
import {
  CheckCircle2,
  RefreshCw,
  Check,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface AdashiGroupSummary {
  id: string;
  reference: string;
  name: string;
  currency: 'NGN' | 'XOF';
  countryCode: string;
  contributionAmount: number;
  frequency: string;
  targetMembers: number;
  currentMembersCount: number;
  totalCycles: number;
  currentCycleNumber: number;
  totalPoolVolume: number;
  status: string;
  myMembership: {
    id: string;
    status: string;
    kycTier: number;
    assignedPosition: number | null;
    mandateAuthorized: boolean;
    totalContributed: number;
    totalPayoutReceived: number;
  } | null;
}

interface GroupDetails {
  group: AdashiGroupSummary;
  myMembership: AdashiGroupSummary['myMembership'];
  members: { id: string; name: string; isMe: boolean; status: string; assignedPosition: number | null }[];
  cycles: { id: string; cycleNumber: number; beneficiaryName: string; isMyPayout: boolean; status: string; expectedPool: number; collectedPool: number; netPayoutAmount: number; currency: string }[];
  myObligations: { id: string; cycleNumber: number; amount: number; currency: string; status: string; dueDate: string; paidAt: string | null }[];
}

function symbol(currency: string) {
  return currency === 'NGN' ? '₦' : 'CFA';
}

export default function CustomerAdashiHub() {
  const { t } = useCustomer();
  const [groups, setGroups] = useState<AdashiGroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerApiFetch('/api/customer/portal/adashi/groups');
      const data = await res.json();
      if (data.status === 'success' || data.data) {
        const list: AdashiGroupSummary[] = data.data?.groups || [];
        setGroups(list);
        if (list.length > 0 && !selectedGroupId) setSelectedGroupId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  const fetchDetails = useCallback(async (groupId: string) => {
    try {
      const res = await customerApiFetch(`/api/customer/portal/adashi/groups/${groupId}`);
      const data = await res.json();
      if (data.data) setDetails(data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedGroupId) fetchDetails(selectedGroupId);
  }, [selectedGroupId, fetchDetails]);

  const handleAcceptConsent = async () => {
    if (!selectedGroupId) return;
    try {
      setBusy(true);
      setMessage(null);
      const res = await customerApiFetch(`/api/customer/portal/adashi/groups/${selectedGroupId}/consent`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ ok: true, text: data.message || 'Consent accepted.' });
        fetchDetails(selectedGroupId);
        fetchGroups();
      } else {
        setMessage({ ok: false, text: data.error?.message || 'Could not accept consent.' });
      }
    } catch (err: any) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handlePayObligation = async (obligationId: string) => {
    try {
      setBusy(true);
      setMessage(null);
      const res = await customerApiFetch(`/api/customer/portal/adashi/obligations/${obligationId}/pay`, {
        method: 'POST',
        headers: { 'idempotency-key': `idemp-cust-${obligationId}-${Date.now()}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ ok: true, text: data.message || t('customer.adashi.paySuccess') });
        if (selectedGroupId) fetchDetails(selectedGroupId);
      } else {
        setMessage({ ok: false, text: data.error?.message || t('customer.adashi.payFailed') });
      }
    } catch (err: any) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const openObligation = details?.myObligations.find((o) => o.status !== 'PAID');
  const needsConsent = details?.myMembership?.status === 'INVITED';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
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
        <button
          onClick={fetchGroups}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('customer.adashi.syncStatus')}</span>
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${message.ok ? 'bg-[var(--success-soft)] border-[var(--success)]/30 text-[var(--success)]' : 'bg-rose-500/5 border-rose-500/20 text-rose-300'}`}>
          {message.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] text-sm">
          You are not part of any Adashi circle yet. Ask your KoriePay agent to invite you, or visit an agent to start one.
        </div>
      )}

      {groups.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase text-[var(--foreground-muted)] font-bold flex items-center justify-between">
              <span>{t('customer.adashi.myActiveCircles')}</span>
              <span className="text-[var(--brand-primary)]">{groups.length}</span>
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
                        ? 'bg-[var(--brand-soft)] border-[var(--border-strong)] shadow-[var(--shadow-sm)]'
                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--foreground)] text-xs truncate max-w-[170px]">{g.name}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[var(--warning-soft)] text-[var(--warning)]">
                        {g.myMembership?.status || g.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-[var(--foreground-muted)] mt-2">
                      <span className="text-[var(--brand-primary)] font-bold">
                        {symbol(g.currency)}{g.contributionAmount.toLocaleString()} / {g.frequency.toLowerCase()}
                      </span>
                      <span>
                        {t('customer.adashi.slot')} {g.currentCycleNumber}/{g.totalCycles}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            {details ? (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--brand-border)] space-y-4 shadow-[var(--shadow-card)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-[var(--brand-primary)] font-bold">{details.group.reference}</span>
                      <h2 className="text-lg font-bold text-[var(--foreground)] mt-0.5">{details.group.name}</h2>
                    </div>
                    {details.myMembership?.assignedPosition && (
                      <div className="p-3 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-right">
                        <div className="text-[10px] text-[var(--brand-primary)] font-mono font-bold uppercase">{t('customer.adashi.myRotationSlot')}</div>
                        <div className="text-xl font-extrabold text-[var(--foreground)] font-mono">#{details.myMembership.assignedPosition}</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                    <Metric label={t('customer.adashi.myTotalContributed')} value={`${symbol(details.group.currency)}${(details.myMembership?.totalContributed || 0).toLocaleString()}`} />
                    <Metric label={t('customer.adashi.myLumpSumPayout')} value={`${symbol(details.group.currency)}${(details.myMembership?.totalPayoutReceived || 0).toLocaleString()}`} accent />
                    <Metric
                      label={t('customer.adashi.debitMandate')}
                      value={
                        details.myMembership?.mandateAuthorized ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t('customer.adashi.authorized')}
                          </span>
                        ) : (
                          <span className="text-[var(--warning)]">Pending</span>
                        )
                      }
                      accent={!!details.myMembership?.mandateAuthorized}
                    />
                  </div>
                </div>

                {needsConsent && (
                  <div className="p-5 rounded-2xl bg-[var(--warning-soft)] border border-[var(--warning)]/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[var(--warning)]" />
                      <h3 className="text-sm font-bold text-[var(--foreground)]">Accept invitation & authorize contribution mandate</h3>
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      By accepting, you agree to this circle's rotation terms and authorize KoriePay to debit your wallet for each cycle's contribution when it is due.
                    </p>
                    <button
                      onClick={handleAcceptConsent}
                      disabled={busy}
                      className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] text-xs font-bold disabled:opacity-50"
                    >
                      Accept & Join Circle
                    </button>
                  </div>
                )}

                <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4 shadow-[var(--shadow-card)]">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--foreground)]">{t('customer.adashi.rotationSequence')}</h3>
                    <p className="text-[11px] text-[var(--foreground-muted)]">{t('customer.adashi.rotationSeqDesc')}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {details.members.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                          m.isMe ? 'bg-[var(--brand-soft)] border-[var(--brand-border)]' : 'bg-[var(--surface-elevated)] border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-[var(--surface)] text-[10px] font-mono font-bold text-[var(--foreground-muted)]">
                            {t('customer.adashi.slot')} {m.assignedPosition ? `#${m.assignedPosition}` : '—'}
                          </span>
                          {m.isMe && (
                            <span className="px-1.5 py-0.5 rounded bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-[9px] font-bold font-mono">
                              {t('customer.adashi.you')}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-[var(--foreground)] truncate">{m.name}</div>
                        <div className="text-[10px] text-[var(--foreground-muted)] font-mono">{m.status.replaceAll('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4 shadow-[var(--shadow-card)]">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">{t('customer.adashi.contributionObligations')}</h3>
                  {openObligation ? (
                    <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono text-[var(--brand-primary)] font-bold">
                          {t('customer.adashi.contributionDue', { cycle: openObligation.cycleNumber }).toUpperCase()}
                        </div>
                        <div className="text-sm font-bold text-[var(--foreground)] mt-0.5">
                          {symbol(openObligation.currency)}{openObligation.amount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{t('customer.adashi.autoDebitNote')}</div>
                      </div>
                      <button
                        onClick={() => handlePayObligation(openObligation.id)}
                        disabled={busy}
                        className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] text-xs font-bold shadow-[var(--shadow-md)] whitespace-nowrap disabled:opacity-50"
                      >
                        {t('customer.adashi.payContribution')}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--foreground-muted)] flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--success)]" />
                      All your contributions for this circle are up to date.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]">
                {t('customer.adashi.loading')}
              </div>
            )}
          </div>
        </div>
      )}
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
