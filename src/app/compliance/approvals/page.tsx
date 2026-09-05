'use client';
import React, { useMemo, useState } from 'react';
import { CheckSquare, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Tabs, useBoot, PageSkel, CkTable, Col, Modal, Avatar, EmptyState, toneOfRisk, KeyVal } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

const TABS = ['PENDING', 'DECIDED'] as const;
export default function ApprovalsPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(380);
  const [tab, setTab] = useState<(typeof TABS)[number]>('PENDING');
  const [target, setTarget] = useState<string | null>(null);
  const [decision, setDecision] = useState<'APPROVE' | 'DENY' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const sorted = [...p.approvals].sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
    return tab === 'PENDING' ? sorted.filter((a) => a.status === 'PENDING') : sorted.filter((a) => a.status !== 'PENDING');
  }, [p.approvals, tab]);
  const pg = usePaging(rows, 8);

  const doDecide = () => {
    if (!target || !decision || busy) return;
    setBusy(true);
    window.setTimeout(() => { p.approvalDecision(target, decision, note.trim() || undefined); setTarget(null); setDecision(null); setNote(''); setBusy(false); }, 320);
  };

  const cols: Col<(typeof rows)[number]>[] = [
    { key: 'type', header: t.aprP.typeCol, render: (a) => <Chip tone={a.type === 'SAR_FILING' || a.type === 'ACCOUNT_RESTRICTION' || a.type === 'RISK_OVERRIDE' ? 'warn' : 'dim'}>{a.type.replace(/_/g, ' ')}</Chip> },
    { key: 'title', header: t.common.title, render: (a) => <p className="text-[0.74rem] font-bold text-[var(--kpc-ink)] max-w-[240px] truncate">{a.title}</p> },
    { key: 'cust', header: t.common.customer, render: (a) => a.customerName ?? <span className="text-[var(--kpc-ink-3)]">—</span> },
    { key: 'req', header: t.aprP.requestedBy, render: (a) => <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-[var(--kpc-ink-2)]"><Avatar name={a.requestedByName} size={20} />{a.requestedByName}</span> },
    { key: 'at', header: t.aprP.requestedAt, sortVal: (r) => r.requestedAt, render: (a) => <Age iso={a.requestedAt} rel={p.relTime} /> },
    { key: 'st', header: t.common.status, render: (a) => a.status === 'PENDING' ? <Chip tone="warn">{t.common.pending}</Chip> : <Chip tone={a.status === 'APPROVED' ? 'ok' : 'critical'}>{a.status}</Chip> },
    { key: 'dec', header: t.aprP.decisionCol, render: (a) => a.status !== 'PENDING' ? <span className="text-[0.66rem] font-semibold text-[var(--kpc-ink-3)]">{a.decidedByName} · {p.relTime(a.decidedAt ?? a.requestedAt)}</span> : (
      <span className="flex gap-1.5">
        <button onClick={(e) => { e.stopPropagation(); setTarget(a.id); setDecision('APPROVE'); }} className="kpc-btn kpc-btn-ok kpc-btn-sm"><ThumbsUp className="w-3.5 h-3.5" /> {t.common.approve}</button>
        <button onClick={(e) => { e.stopPropagation(); setTarget(a.id); setDecision('DENY'); }} className="kpc-btn kpc-btn-danger kpc-btn-sm"><ThumbsDown className="w-3.5 h-3.5" /> {t.common.reject}</button>
      </span> ) },
  ];

  if (!ready) return <PageSkel />;
  const active = p.approvals.find((a) => a.id === target);
  return (
    <div>
      <PageHead icon={CheckSquare} title={t.aprP.title} sub={t.aprP.subtitle} />
      <Card flat className="mb-4 p-0 overflow-hidden">
        <Tabs className="px-3 pt-2" items={[{ value: 'PENDING', label: t.aprP.myQueue, count: p.approvals.filter((a) => a.status === 'PENDING').length }, { value: 'DECIDED', label: t.aprP.approvedAt, count: p.approvals.filter((a) => a.status !== 'PENDING').length }]} value={tab} onChange={(v) => { setTab(v as typeof tab); pg.reset(); }} />
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.aprP.title} cols={cols} rows={pg.slice} rowKey={(a) => a.id} dense />
        {!pg.slice.length && <EmptyState title={t.aprP.noPending} />}
        <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
      </Card>
      <Modal open={!!active && !!decision} onClose={() => { setTarget(null); setDecision(null); }} title={decision === 'APPROVE' ? t.aprP.approveConfirm : t.aprP.denyConfirm}
        footer={<><button onClick={() => { setTarget(null); setDecision(null); }} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button><button onClick={doDecide} className={`kpc-btn ${decision === 'APPROVE' ? 'kpc-btn-ok' : 'kpc-btn-danger'}`}>{busy ? '…' : t.common.confirm}</button></>}>
        {active && <div className="mb-3"><KeyVal k={t.common.title} v={active.title} /><KeyVal k={t.aprP.typeCol} v={active.type.replace(/_/g, ' ')} /><KeyVal k={t.aprP.requestedBy} v={`${active.requestedByName} · ${p.relTime(active.requestedAt)}`} /><p className="text-[0.72rem] font-semibold text-[var(--kpc-ink-2)] mt-2">{active.summary}</p></div>}
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.aprP.noteOptional} className="kpc-input !leading-relaxed resize-none" />
      </Modal>
    </div>
  );
}
