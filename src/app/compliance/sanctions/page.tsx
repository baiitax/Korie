'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, useBoot, PageSkel, CkTable, Col, Avatar, EmptyState, Tabs, toneOfRisk } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

const TABS = ['ALL', 'POTENTIAL_MATCH', 'UNDER_REVIEW', 'CONFIRMED_MATCH', 'FALSE_POSITIVE'] as const;
export default function SanctionsPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(380);
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');

  const list = useMemo(() => p.matches.filter((m) => m.kind === 'SANCTIONS' && (tab === 'ALL' ? true : m.status === tab)), [p.matches, tab]);
  const pg = usePaging(list, 8);
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: p.matches.filter((m) => m.kind === 'SANCTIONS').length };
    TABS.filter((x) => x !== 'ALL').forEach((s) => (c[s] = p.matches.filter((m) => m.kind === 'SANCTIONS' && m.status === s).length));
    return c;
  }, [p.matches]);

  const cols: Col<(typeof list)[number]>[] = [
    { key: 'name', header: t.common.customer, render: (m) => (
      <div className="flex items-center gap-2.5"><Avatar name={m.customerName} size={28} /><div className="min-w-0"><button onClick={() => router.push(`/compliance/sanctions/${m.id}`)} className="block text-[0.76rem] font-bold text-[var(--kpc-ink)] truncate max-w-[170px] hover:text-[var(--kpc-brand-ink)]">{m.customerName}</button><span className="block text-[0.6rem] kpc-mono text-[var(--kpc-ink-3)]">{m.customerId} · {m.country === 'NE' ? '🇳🇪' : '🇳🇬'}</span></div></div> ) },
    { key: 'list', header: t.sancP.listName, render: (m) => <span className="text-[0.68rem] font-bold text-[var(--kpc-ink-2)]">{m.listName}</span> },
    { key: 'fields', header: t.sancP.matchedFields, render: (m) => <span className="text-[0.64rem] text-[var(--kpc-ink-3)] truncate block max-w-[180px]">{m.matchedFields.join(', ')}</span> },
    { key: 'score', header: t.sancP.matchScore, render: (m) => <span className="kpc-mono text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{m.score}%</span> },
    { key: 'st', header: t.common.status, render: (m) => <Chip tone={toneOfRisk(m.status)}>{m.status.replace(/_/g, ' ')}</Chip> },
    { key: 'at', header: t.common.submitted, sortVal: (r) => r.triggeredAt, render: (m) => <Age iso={m.triggeredAt} rel={p.relTime} /> },
    { key: 'go', header: t.common.actions, render: (m) => <span className="kpc-btn kpc-btn-outline kpc-btn-sm" onClick={() => router.push(`/compliance/sanctions/${m.id}`)}>{t.sancP.decision}</span> },
  ];

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={Fingerprint} title={t.sancP.title} sub={t.sancP.subtitle} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <K s={t.sancP.screenings} v="1,840" tone="teal" />
        <K s={t.sancP.potential} v={counts.POTENTIAL_MATCH} tone="amber" />
        <K s={t.sancP.confirmedList} v={counts.CONFIRMED_MATCH} tone="rose" />
        <K s={t.sancP.cleared} v={counts.FALSE_POSITIVE} tone="emerald" />
      </div>
      <Card flat className="mb-4 p-0 overflow-hidden">
        <Tabs items={TABS.map((s) => ({ value: s, label: s === 'ALL' ? t.common.all : s.replace(/_/g, ' '), count: counts[s] }))} value={tab} onChange={(v) => { setTab(v as typeof tab); pg.reset(); }} className="px-3 pt-2" />
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.sancP.title} cols={cols} rows={pg.slice} rowKey={(m) => m.id} onRow={(m) => router.push(`/compliance/sanctions/${m.id}`)} dense />
        {!pg.slice.length && <EmptyState title={t.common.noResults} action={<button onClick={() => setTab('ALL')} className="kpc-btn kpc-btn-outline kpc-btn-sm">{t.common.clear}</button>} />}
        <Paginator {...pg} total={list.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
function K({ s, v, tone }: { s: string; v: React.ReactNode; tone: 'teal' | 'amber' | 'rose' | 'emerald' }) {
  const c = { teal: 'text-teal-600 dark:text-teal-400', amber: 'text-amber-600 dark:text-amber-400', rose: 'text-rose-600 dark:text-rose-400', emerald: 'text-emerald-600 dark:text-emerald-400' }[tone];
  return <div className="kpc-card kpc-card-flat p-3.5"><p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)]">{s}</p><p className={`kpc-num text-[1.3rem] font-extrabold mt-1 ${c}`}>{v}</p></div>;
}
