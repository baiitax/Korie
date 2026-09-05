'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Download } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, Tabs, PageHead, Input, Select, useBoot, PageSkel, CkTable, Col, Avatar, EmptyState, toneOfRisk } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age, chipTxt } from '@/components/compliance/workspaces/helpers';

const TABS = ['ALL', 'PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'] as const;
export default function KycQueuePage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(420);
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('ALL');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return p.kyc
      .filter((k) => (tab === 'ALL' ? true : k.status === tab))
      .filter((k) => (tier === 'ALL' ? true : k.tier === tier))
      .filter((k) => !query || `${k.customerName} ${k.id} ${k.emailMasked}`.toLowerCase().includes(query))
      .sort((a, b) => (a.country === b.country ? 0 : a.country === 'NE' ? -1 : 1));
  }, [p.kyc, tab, q, tier]);
  const pg = usePaging(filtered, 9);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: p.kyc.length };
    TABS.filter((x) => x !== 'ALL').forEach((s) => (c[s] = p.kyc.filter((k) => k.status === s).length));
    return c;
  }, [p.kyc]);

  const cols: Col<(typeof filtered)[number]>[] = [
    { key: 'a', header: t.kycP.applicant, render: (k) => (
      <div className="flex items-center gap-2.5"><Avatar name={k.customerName} size={28} /><div className="min-w-0">
        <button onClick={() => router.push(`/compliance/kyc/${k.id.replace('KYC-', '')}`)} className="block text-[0.76rem] font-bold text-[var(--kpc-ink)] truncate hover:text-[var(--kpc-brand-ink)] max-w-[170px]">{k.customerName}</button>
        <span className="block text-[0.62rem] kpc-mono text-[var(--kpc-ink-3)]">{k.id} · {k.country === 'NE' ? '🇳🇪' : '🇳🇬'} {k.currency}</span></div></div> ) },
    { key: 'tier', header: t.kycP.level, render: (k) => <Chip tone="dim">{k.tier.replace('_', ' ')}</Chip> },
    { key: 'docs', header: t.kycP.doc, render: (k) => <span className="text-[0.72rem] font-bold text-[var(--kpc-ink-2)]">{k.documents.length}</span> },
    { key: 'risk', header: t.common.risk, render: (k) => <Chip tone={toneOfRisk(k.riskLevel)}>{k.riskLevel}</Chip> },
    { key: 'sub', header: t.common.submitted, sortVal: (r) => r.submittedAt, render: (k) => <Age iso={k.submittedAt} rel={p.relTime} /> },
    { key: 'st', header: t.common.status, render: (k) => <Chip tone={toneOfRisk(k.status)}>{chipTxt(k.status, t)}</Chip> },
    { key: 'rev', header: t.common.reviewer, render: (k) => <span className="text-[0.68rem] font-semibold text-[var(--kpc-ink-2)]">{k.reviewerName ?? '—'}</span> },
    { key: 'go', header: t.kycP.review, render: (k) => <span className="kpc-btn kpc-btn-primary kpc-btn-sm" onClick={() => router.push(`/compliance/kyc/${k.id.replace('KYC-', '')}`)}>{t.kycP.review}</span> },
  ];

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={UserCheck} title={t.kycP.title} sub={t.kycP.subtitle} actions={<button onClick={() => p.pushToast('info', t.common.export, `${filtered.length} rows (demo)`, true)} className="kpc-btn kpc-btn-outline"><Download className="w-4 h-4" /> {t.common.export}</button>} />
      <Card flat className="mb-4 p-0 overflow-hidden">
        <Tabs items={TABS.map((s) => ({ value: s, label: t.kycP[`tabs${s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}` as keyof typeof t.kycP] as string, count: counts[s] }))} value={tab} onChange={(v) => { setTab(v as typeof tab); pg.reset(); }} className="px-3 pt-2" />
        <div className="flex flex-col md:flex-row gap-2.5 p-3 border-t border-[var(--kpc-line)]">
          <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder={`${t.kycP.title} — ${t.common.search}`} className="!text-[0.78rem]" wrapClass="flex-1" aria-label={t.common.search} />
          <Select value={tier} onChange={(e) => { setTier(e.target.value); pg.reset(); }} aria-label={t.kycP.level}>
            <option value="ALL">{t.common.filter} — {t.kycP.level}</option>
            {['TIER_1', 'TIER_2', 'TIER_3'].map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}
          </Select>
          <span className="text-[0.62rem] text-[var(--kpc-ink-3)] font-semibold self-center">Niger (CNI) first · sample data</span>
        </div>
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.kycP.title} cols={cols} rows={pg.slice} rowKey={(k) => k.id} onRow={(k) => router.push(`/compliance/kyc/${k.id.replace('KYC-', '')}`)} dense />
        {!pg.slice.length && <EmptyState title={t.kycP.queueEmpty} action={<button onClick={() => { setTab('ALL'); setQ(''); }} className="kpc-btn kpc-btn-outline kpc-btn-sm">{t.common.clear}</button>} />}
        <Paginator {...pg} total={filtered.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
