'use client';
import React, { useMemo, useState } from 'react';
import { ListTodo, Play, CheckCircle2 } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Tabs, useBoot, PageSkel, CkTable, Col, Modal, Avatar, EmptyState, toneOfRisk, KeyVal } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age, chipTxt } from '@/components/compliance/workspaces/helpers';

const TABS = ['OPEN', 'DONE'] as const;
export default function TasksPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(380);
  const [tab, setTab] = useState<(typeof TABS)[number]>('OPEN');
  const [onlyMine, setOnlyMine] = useState(true);
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const base = useMemo(() => [...p.tasks].sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1)), [p.tasks]);
  const rows = useMemo(() => base
    .filter((x) => (tab === 'OPEN' ? x.status === 'OPEN' || x.status === 'IN_PROGRESS' || x.status === 'OVERDUE' : x.status === 'DONE'))
    .filter((x) => (onlyMine ? x.assigneeId === p.currentOfficer.id : true)), [base, tab, onlyMine, p.currentOfficer.id]);
  const pg = usePaging(rows, 9);

  const doTask = (action: 'START' | 'DONE') => {
    if (!target || busy) return;
    setBusy(true);
    window.setTimeout(() => { p.taskAction(target, action); setTarget(null); setBusy(false); }, 300);
  };

  const cols: Col<(typeof rows)[number]>[] = [
    { key: 'title', header: t.common.title, render: (x) => (
      <div className="min-w-0"><p className="text-[0.74rem] font-bold text-[var(--kpc-ink)] truncate max-w-[260px]">{x.title}</p><span className="text-[0.6rem] kpc-mono text-[var(--kpc-ink-3)]">{x.kind.replace(/_/g, ' ')}{x.relatedRef ? ` · ${x.relatedRef}` : ''}</span></div> ) },
    { key: 'cust', header: t.common.customer, render: (x) => x.customerName ?? <span className="text-[var(--kpc-ink-3)]">—</span> },
    { key: 'assign', header: t.tskP.assignee, render: (x) => <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-[var(--kpc-ink-2)]"><Avatar name={x.assigneeName} size={20} />{x.assigneeName}{x.assigneeId === p.currentOfficer.id && <Chip tone="brand">{t.tskP.my}</Chip>}</span> },
    { key: 'pr', header: t.common.priority, render: (x) => <Chip tone={toneOfRisk(x.priority)}>{x.priority}</Chip> },
    { key: 'st', header: t.common.status, render: (x) => <Chip tone={toneOfRisk(x.status)}>{chipTxt(x.status, t)}</Chip> },
    { key: 'due', header: t.tskP.dueAt, sortVal: (r) => r.dueAt, render: (x) => <span className={`kpc-mono text-[0.68rem] font-bold ${new Date(x.dueAt).getTime() < Date.now() && x.status !== 'DONE' ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--kpc-ink-3)]'}`}><Age iso={x.dueAt} rel={p.relTime} /></span> },
    { key: 'go', header: t.common.actions, render: (x) => x.status === 'DONE' ? <Chip tone="ok">{t.tskP.completed}</Chip> : (
      <span className="flex gap-1.5">
        {x.status === 'OPEN' && <button onClick={(e) => { e.stopPropagation(); p.taskAction(x.id, 'START'); }} className="kpc-btn kpc-btn-outline kpc-btn-sm"><Play className="w-3.5 h-3.5" /> {t.tskP.start}</button>}
        <button onClick={(e) => { e.stopPropagation(); setTarget(x.id); }} className="kpc-btn kpc-btn-primary kpc-btn-sm" disabled={!onlyMine}>{t.tskP.markDone}</button>
      </span> ) },
  ];

  if (!ready) return <PageSkel />;
  const active = p.tasks.find((x) => x.id === target);
  return (
    <div>
      <PageHead icon={ListTodo} title={t.tskP.title} sub={t.tskP.subtitle} />
      <div className="flex flex-col xl:flex-row gap-2.5 mb-4 items-start xl:items-center justify-between">
        <Tabs className="flex-1 overflow-x-auto" items={[
          { value: 'OPEN', label: `${t.tskP.my} (${t.common.open})`, count: base.filter((x) => x.status !== 'DONE').length },
          { value: 'DONE', label: t.tskP.completed, count: base.filter((x) => x.status === 'DONE').length },
        ]} value={tab} onChange={(v) => { setTab(v as typeof tab); pg.reset(); }} />
        <label className="flex items-center gap-2 text-[0.7rem] font-bold text-[var(--kpc-ink-2)] cursor-pointer select-none"><input type="checkbox" checked={onlyMine} onChange={(e) => { setOnlyMine(e.target.checked); pg.reset(); }} className="accent-teal-600 w-3.5 h-3.5" /> {t.tskP.my}</label>
      </div>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.tskP.title} cols={cols} rows={pg.slice} rowKey={(x) => x.id} dense />
        {!pg.slice.length && <EmptyState title={t.tskP.noTasks} />}
        <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
      </Card>
      <Modal open={!!active && !!target} onClose={() => setTarget(null)} title={t.tskP.confirmDone}
        footer={<><button onClick={() => setTarget(null)} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button><button onClick={() => doTask('DONE')} className="kpc-btn kpc-btn-primary">{busy ? '…' : t.common.confirm}</button></>}>
        {active && <div><KeyVal k={t.common.title} v={active.title} /><KeyVal k={t.tskP.assignee} v={active.assigneeName} /><KeyVal k={t.tskP.dueAt} v={p.fmtDT(active.dueAt)} /></div>}
      </Modal>
    </div>
  );
}
