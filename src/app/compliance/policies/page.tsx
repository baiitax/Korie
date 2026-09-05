'use client';
import React, { useMemo, useState } from 'react';
import { BookOpen, Search, ShieldCheck } from 'lucide-react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { Card, Chip, PageHead, Input, EmptyState, KeyVal } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator } from '@/components/compliance/workspaces/helpers';

export default function CompliancePoliciesPage() {
  const c = useCompliance();
  const { policies, selectedJurisdiction } = c;
  const [q, setQ] = useState('');
  const rows = useMemo(() => policies
    .filter((p) => (selectedJurisdiction === 'ALL' ? true : p.jurisdiction === selectedJurisdiction || p.jurisdiction === 'CROSS_BORDER'))
    .filter((p) => !q.trim() || `${p.title} ${p.summary} ${p.code}`.toLowerCase().includes(q.trim().toLowerCase())), [policies, q, selectedJurisdiction]);
  const pg = usePaging(rows, 6);
  const tone = (s: string) => (s === 'ACTIVE' ? 'ok' : s === 'IN_REVIEW' ? 'warn' : 'dim') as 'ok' | 'warn' | 'dim';
  return (
    <div>
      <PageHead icon={BookOpen} title="Policy Framework" sub="Board-approved compliance manuals, thresholds and AML/CFT controls." />
      <div className="mb-4">
        <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder="Search policies by title, code or keyword…" className="!text-[0.78rem] xl:w-96" icon={<Search className="w-4 h-4" />} aria-label="Search policies" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pg.slice.map((p) => (
          <div key={p.id} className="kpc-card p-4 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="kpc-mono text-[0.68rem] font-extrabold text-[var(--kpc-brand-ink)]">{p.code}</span>
              <div className="flex gap-1.5"><Chip tone="dim" className="kpc-mono">v{p.version}</Chip><Chip tone={tone(p.status)}>{p.status.replace(/_/g, ' ')}</Chip></div>
            </div>
            <p className="text-[0.82rem] font-extrabold text-[var(--kpc-ink)]">{p.title}</p>
            <p className="text-[0.7rem] text-[var(--kpc-ink-2)] mt-1.5 flex-1 leading-relaxed">{p.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mt-3">
              <KeyVal k="Approved by" v={p.approvedBy ?? '—'} />
              <KeyVal k="Effective" v={p.effectiveDate} />
              <KeyVal k="Next review" v={p.nextReviewDate} />
              <KeyVal k="Jurisdiction" v={p.jurisdiction?.replace(/_/g, ' ') ?? '—'} />
            </div>
            <div className="mt-3 pt-3 border-t border-[rgba(var(--kpc-ring),0.4)] flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[0.64rem] font-extrabold text-emerald-600 dark:text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" /> ACTIVE MANDATORY POLICY</span>
              <Chip tone="dim" className="kpc-mono">internal · vault (demo)</Chip>
            </div>
          </div>
        ))}
        {!pg.slice.length && <div className="md:col-span-2"><Card><EmptyState title="No policies match the current filters." /></Card></div>}
      </div>
      <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
    </div>
  );
}
