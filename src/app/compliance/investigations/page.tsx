'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderSearch } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, Tabs, PageHead, useBoot, PageSkel, EmptyState, Avatar, toneOfRisk, KeyVal } from '@/components/compliance/ui/Ck';
import { Age } from '@/components/compliance/workspaces/helpers';

const TABS = ['ACTIVE', 'PENDING', 'ESCALATED', 'COMPLETED'] as const;
export default function InvestigationsPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(380);
  const [tab, setTab] = useState<(typeof TABS)[number]>('ACTIVE');

  const groups = useMemo(() => {
    const done = ['RESOLVED', 'CLOSED'];
    return {
      ACTIVE: p.cases.filter((c) => !done.includes(c.status) && c.status !== 'ESCALATED' && c.status !== 'WAITING_FOR_INFO' && c.status !== 'PENDING_DECISION'),
      PENDING: p.cases.filter((c) => c.status === 'WAITING_FOR_INFO' || c.status === 'PENDING_DECISION' || c.status === 'REOPENED'),
      ESCALATED: p.cases.filter((c) => c.status === 'ESCALATED'),
      COMPLETED: p.cases.filter((c) => done.includes(c.status)),
    };
  }, [p.cases]);
  const rows = groups[tab];

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={FolderSearch} title={t.invP.title} sub={t.invP.subtitle} />
      <Tabs className="mb-4" items={TABS.map((s) => ({ value: s, label: t.invP[s.toLowerCase() as 'active' | 'pending' | 'escalated' | 'completed'], count: groups[s].length }))} value={tab} onChange={(v) => setTab(v as typeof tab)} />
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {rows.map((c) => (
          <button key={c.id} onClick={() => router.push(`/compliance/cases/${c.caseNumber}`)} className="kpc-card kpc-card-hover p-4 text-left">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="kpc-mono text-[0.72rem] font-extrabold text-[var(--kpc-brand-ink)]">{c.caseNumber}</span>
              <Chip tone={toneOfRisk(c.priority)}>{c.priority}</Chip>
            </div>
            <p className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] leading-snug line-clamp-2">{c.title}</p>
            <div className="flex items-center gap-2 mt-2.5">
              <Avatar name={c.customerName ?? '?'} size={24} />
              <span className="text-[0.7rem] font-bold text-[var(--kpc-ink-2)] truncate">{c.customerName ?? 'System'}</span>
              <span className="ml-auto"><Chip tone={toneOfRisk(c.status)}>{c.status.replace(/_/g, ' ')}</Chip></span>
            </div>
            <div className="flex items-center justify-between mt-3 text-[0.64rem] text-[var(--kpc-ink-3)] font-semibold">
              <span>{c.assignedOfficerName}</span>
              <span>SLA <Age iso={c.deadlineSla} rel={p.relTime} /></span>
            </div>
          </button>
        ))}
        {!rows.length && <div className="md:col-span-2 2xl:col-span-3"><Card><EmptyState title={t.invP.emptyQueue} /></Card></div>}
      </div>
    </div>
  );
}
