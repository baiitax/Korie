'use client';
import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Search, AlertTriangle, Clock3 } from 'lucide-react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { Card, Chip, PageHead, Input, Tabs, EmptyState, KeyVal } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

const TABS = ['ALL', 'OVERDUE', 'DUE_SOON', 'UPCOMING', 'COMPLETED'] as const;
export default function ComplianceCalendarPage() {
  const c = useCompliance();
  const { calendarEvents, acknowledgeCalendarEvent, formatDate } = c;
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const [q, setQ] = useState('');
  const rows = useMemo(() => calendarEvents
    .filter((e) => (tab === 'ALL' ? true : e.status === tab))
    .filter((e) => !q.trim() || `${e.title} ${e.regulator}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)), [calendarEvents, tab, q]);
  const pg = usePaging(rows, 8);
  const counts = useMemo(() => {
    const m: Record<string, number> = { ALL: calendarEvents.length };
    TABS.filter((x) => x !== 'ALL').forEach((s) => (m[s] = calendarEvents.filter((e) => e.status === s).length));
    return m;
  }, [calendarEvents]);
  const tone = (s: string) => (s === 'OVERDUE' ? 'critical' : s === 'DUE_SOON' ? 'high' : s === 'UPCOMING' ? 'warn' : 'ok') as 'critical' | 'high' | 'warn' | 'ok';
  return (
    <div>
      <PageHead icon={CalendarDays} title="Obligation Calendar" sub="Filing deadlines for CBN, NFIU, BCEAO and CENTIF statutory returns — NE and NG stations." />
      <div className="mb-4 flex flex-col xl:flex-row gap-2.5 justify-between">
        <Tabs items={TABS.map((s) => ({ value: s, label: s.replace(/_/g, ' '), count: counts[s] }))} value={tab} onChange={(v) => { setTab(v as typeof tab); pg.reset(); }} />
        <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder="Search obligations…" className="!text-[0.78rem] xl:w-72" icon={<Search className="w-4 h-4" />} aria-label="Search obligations" />
      </div>
      <div className="space-y-2.5">
        {pg.slice.map((e) => (
          <div key={e.id} className="kpc-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${e.status === 'OVERDUE' || e.status === 'DUE_SOON' ? 'bg-rose-500/10 text-rose-500' : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'}`}>{e.status === 'OVERDUE' || e.status === 'DUE_SOON' ? <AlertTriangle className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[0.78rem] font-extrabold text-[var(--kpc-ink)]">{e.title}</p>
              <p className="text-[0.64rem] font-semibold text-[var(--kpc-ink-3)]">{e.regulator} · {e.category ?? e.jurisdiction.replace(/_/g, ' ')}{e.assignedTo ? ` · ${e.assignedTo}` : ''}</p>
            </div>
            <KeyVal k="Due" v={formatDate(e.dueDate)} />
            <Chip tone={tone(e.status)}>{e.status.replace(/_/g, ' ')}</Chip>
            {e.status !== 'COMPLETED' && <button onClick={() => acknowledgeCalendarEvent(e.id)} className="kpc-btn kpc-btn-outline kpc-btn-sm shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> Mark complete</button>}
          </div>
        ))}
        {!pg.slice.length && <Card><EmptyState title="No obligations match the current filters." /></Card>}
      </div>
      <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
    </div>
  );
}
