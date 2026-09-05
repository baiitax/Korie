'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, useBoot, PageSkel, CkTable, Col, Avatar, EmptyState, Tabs, toneOfRisk } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

const TABS = ['ALL', 'POTENTIAL_MATCH', 'UNDER_REVIEW', 'CONFIRMED_MATCH', 'FALSE_POSITIVE'] as const;
export default function PepPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(380);
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const list = useMemo(() => p.matches.filter((m) => m.kind === 'PEP' && (tab === 'ALL' ? true : m.status === tab)), [p.matches, tab]);
  const pg = usePaging(list, 8);
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: p.matches.filter((m) => m.kind === 'PEP').length };
    TABS.filter((x) => x !== 'ALL').forEach((s) => (c[s] = p.matches.filter((m) => m.kind === 'PEP' && m.status === s).length));
    return c;
  }, [p.matches]);
  const pepJur = (c: 'NE' | 'NG' | string) => c === 'NE' ? `🇳🇪 ${t.common.niger}` : c === 'NG' ? `🇳🇬 ${t.common.nigeria}` : t.common.crossBorder;
  const cols: Col<(typeof list)[number]>[] = [
    { key: 'name', header: t.common.customer, render: (m) => (
      <div className="flex items-center gap-2.5"><Avatar name={m.customerName} size={28} /><div className="min-w-0"><button onClick={() => router.push(`/compliance/pep/${m.id}`)} className="block text-[0.76rem] font-bold text-[var(--kpc-ink)] truncate max-w-[170px] hover:text-[var(--kpc-brand-ink)]">{m.customerName}</button><span className="block text-[0.6rem] kpc-mono text-[var(--kpc-ink-3)]">{m.customerId}</span></div></div> ) },
    { key: 'pos', header: t.pepP.position, render: (m) => <span className="text-[0.68rem] font-bold text-[var(--kpc-ink-2)]">{m.listName}</span> },
    { key: 'jur', header: t.pepP.jurisdiction, render: (m) => <span className="text-[0.64rem] text-[var(--kpc-ink-3)]">{pepJur(m.country)}</span> },
    { key: 'score', header: t.sancP.matchScore, render: (m) => <span className="kpc-mono text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{m.score}%</span> },
    { key: 'st', header: t.common.status, render: (m) => <Chip tone={toneOfRisk(m.status)}>{m.status.replace(/_/g, ' ')}</Chip> },
    { key: 'at', header: t.common.submitted, sortVal: (r) => r.triggeredAt, render: (m) => <Age iso={m.triggeredAt} rel={p.relTime} /> },
    { key: 'go', header: t.common.actions, render: (m) => <span className="kpc-btn kpc-btn-outline kpc-btn-sm" onClick={() => router.push(`/compliance/pep/${m.id}`)}>{t.sancP.decision}</span> },
  ];
  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={Landmark} title={t.pepP.title} sub={t.pepP.subtitle} />
      <Card flat className="mb-4 p-0 overflow-hidden">
        <Tabs items={TABS.map((s) => ({ value: s, label: s === 'ALL' ? t.common.all : s.replace(/_/g, ' '), count: counts[s] }))} value={tab} onChange={(v) => { setTab(v as typeof tab); pg.reset(); }} className="px-3 pt-2" />
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.pepP.title} cols={cols} rows={pg.slice} rowKey={(m) => m.id} onRow={(m) => router.push(`/compliance/pep/${m.id}`)} dense />
        {!pg.slice.length && <EmptyState title={t.common.noResults} />}
        <Paginator {...pg} total={list.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
