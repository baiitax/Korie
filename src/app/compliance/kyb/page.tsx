'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Download } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, Tabs, PageHead, Input, useBoot, PageSkel, CkTable, Col, EmptyState, Avatar, toneOfRisk } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age, chipTxt } from '@/components/compliance/workspaces/helpers';

const TABS = ['ALL', 'PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED'] as const;
export default function KybQueuePage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(420);
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return p.kyb
      .filter((k) => (tab === 'ALL' ? true : k.status === tab))
      .filter((k) => !query || `${k.businessName} ${k.id} ${k.regNumberMasked}`.toLowerCase().includes(query))
      .sort((a, b) => (a.country === b.country ? 0 : a.country === 'NE' ? -1 : 1));
  }, [p.kyb, tab, q]);
  const pg = usePaging(filtered, 8);
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: p.kyb.length };
    TABS.filter((x) => x !== 'ALL').forEach((s) => (c[s] = p.kyb.filter((k) => k.status === s).length));
    return c;
  }, [p.kyb]);

  const cols: Col<(typeof filtered)[number]>[] = [
    { key: 'b', header: t.kybP.business, render: (k) => (
      <div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0"><Building2 className="w-4 h-4" /></span><div className="min-w-0">
        <button onClick={() => router.push(`/compliance/kyb/${k.id.replace('KYB-', '')}`)} className="block text-[0.76rem] font-bold text-[var(--kpc-ink)] truncate hover:text-[var(--kpc-brand-ink)] max-w-[180px]">{k.businessName}</button>
        <span className="block text-[0.62rem] kpc-mono text-[var(--kpc-ink-3)]">{k.id} · {k.country === 'NE' ? '🇳🇪' : '🇳🇬'} {k.regNumberMasked}</span></div></div> ) },
    { key: 'type', header: t.common.type, render: (k) => <span className="text-[0.66rem] font-bold text-[var(--kpc-ink-3)]">{k.businessType.replace(/_/g, ' ')}</span> },
    { key: 'ind', header: t.kybP.industry, render: (k) => <span className="text-[0.68rem] font-semibold text-[var(--kpc-ink-2)]">{k.industry ?? '—'}</span> },
    { key: 'dirs', header: t.kybP.directors, render: (k) => <span className="text-[0.72rem] font-bold text-[var(--kpc-ink-2)]">{k.directors.length}</span> },
    { key: 'docs', header: t.kycP.doc, render: (k) => <span className="text-[0.72rem] font-bold text-[var(--kpc-ink-2)]">{k.documents.length}</span> },
    { key: 'risk', header: t.common.risk, render: (k) => <Chip tone={toneOfRisk(k.riskLevel)}>{k.riskLevel}</Chip> },
    { key: 'st', header: t.common.status, render: (k) => <Chip tone={toneOfRisk(k.status)}>{chipTxt(k.status, t)}</Chip> },
    { key: 'sub', header: t.common.submitted, sortVal: (r) => r.submittedAt, render: (k) => <Age iso={k.submittedAt} rel={p.relTime} /> },
  ];

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={Building2} title={t.kybP.title} sub={t.kybP.subtitle} actions={<button onClick={() => p.pushToast('info', t.common.export, `${filtered.length} rows (demo)`, true)} className="kpc-btn kpc-btn-outline"><Download className="w-4 h-4" /> {t.common.export}</button>} />
      <Card flat className="mb-4 p-0 overflow-hidden">
        <Tabs items={TABS.map((s) => ({ value: s, label: t.kycP[`tabs${s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}` as keyof typeof t.kycP] as string, count: counts[s] }))} value={tab} onChange={(v) => { setTab(v as typeof tab); pg.reset(); }} className="px-3 pt-2" />
        <div className="flex flex-col md:flex-row gap-2.5 p-3 border-t border-[var(--kpc-line)]">
          <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder={`${t.kybP.title} — ${t.common.search}`} className="!text-[0.78rem]" wrapClass="flex-1" aria-label={t.common.search} />
        </div>
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.kybP.title} cols={cols} rows={pg.slice} rowKey={(k) => k.id} onRow={(k) => router.push(`/compliance/kyb/${k.id.replace('KYB-', '')}`)} dense />
        {!pg.slice.length && <EmptyState title={t.kybP.queueEmpty} action={<button onClick={() => { setTab('ALL'); setQ(''); }} className="kpc-btn kpc-btn-outline kpc-btn-sm">{t.common.clear}</button>} />}
        <Paginator {...pg} total={filtered.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
