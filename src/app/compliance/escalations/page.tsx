'use client';
import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Eye } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Tabs, useBoot, PageSkel, Modal, EmptyState, KeyVal, Avatar, toneOfRisk } from '@/components/compliance/ui/Ck';
import { Age } from '@/components/compliance/workspaces/helpers';

const TABS = ['OPEN', 'RESOLVED'] as const;
export default function EscalationsPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(380);
  const [tab, setTab] = useState<(typeof TABS)[number]>('OPEN');
  const [target, setTarget] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const sorted = [...p.escalations].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return tab === 'OPEN' ? sorted.filter((e) => e.status !== 'RESOLVED') : sorted.filter((e) => e.status === 'RESOLVED');
  }, [p.escalations, tab]);
  const active = p.escalations.find((e) => e.id === target);
  const doAct = (action: 'ACK' | 'RESOLVE') => {
    if (!target || busy || (action === 'RESOLVE' && !note.trim())) return;
    setBusy(true);
    window.setTimeout(() => { p.escalationAction(target, action, note.trim() || undefined); setTarget(null); setNote(''); setBusy(false); }, 300);
  };

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={ArrowUpRight} title={t.escP.title} sub={t.escP.subtitle} />
      <Tabs className="mb-4" items={[
        { value: 'OPEN', label: `${t.common.open}`, count: p.escalations.filter((e) => e.status !== 'RESOLVED').length },
        { value: 'RESOLVED', label: t.statuses.resolved, count: p.escalations.filter((e) => e.status === 'RESOLVED').length },
      ]} value={tab} onChange={(v) => setTab(v as typeof tab)} />
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {rows.map((e) => (
          <div key={e.id} className="kpc-card p-4 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="kpc-mono text-[0.72rem] font-extrabold text-[var(--kpc-brand-ink)]">{e.id}</span>
              <Chip tone={e.level === 'CRITICAL' ? 'critical' : e.level === 'REGULATORY' ? 'high' : 'warn'}>{e.level.replace(/_/g, ' ')}</Chip>
            </div>
            <p className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] leading-snug">{e.title}</p>
            <p className="text-[0.68rem] text-[var(--kpc-ink-3)] mt-1.5 line-clamp-3 flex-1">{e.summary}</p>
            <div className="flex items-center gap-2 mt-3 text-[0.64rem] font-semibold text-[var(--kpc-ink-3)]">
              <Avatar name={e.raisedByName} size={20} /><span>{e.raisedByName}</span>
              <span className="ml-auto">{t.escP.assignedTo}: {e.assignedRole.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[0.64rem] font-semibold text-[var(--kpc-ink-3)]">
              <span>SLA <Age iso={e.slaAt} rel={p.relTime} /></span>
              {e.refs.length > 0 && <span className="kpc-mono truncate">{e.refs.join(' · ')}</span>}
            </div>
            {e.status === 'RESOLVED' ? <Chip tone="ok" className="self-start mt-3">{t.statuses.resolved}{e.resolutionNote ? ` — ${e.resolutionNote}` : ''}</Chip>
              : (
                <div className="flex gap-2 mt-3">
                  {e.status === 'OPEN' && <button onClick={() => setTarget(e.id)} className="kpc-btn kpc-btn-outline kpc-btn-sm flex-1" disabled={e.assignedRole.includes('REGULATORY_LIAISON')}><Eye className="w-3.5 h-3.5" /> {t.escP.acknowledge}</button>}
                  <button onClick={() => setTarget(e.id)} className="kpc-btn kpc-btn-primary kpc-btn-sm flex-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t.escP.resolveEsc}</button>
                </div>
              )}
          </div>
        ))}
        {!rows.length && <div className="md:col-span-2 2xl:col-span-3"><Card><EmptyState title={t.escP.noEsc} /></Card></div>}
      </div>
      <Modal open={!!active && !!target} onClose={() => { setTarget(null); setNote(''); }} title={active?.status === 'OPEN' && active.assignedRole.includes('REGULATORY_LIAISON') ? t.escP.ackBody : t.escP.resolveBody}
        footer={<>
          <button onClick={() => { setTarget(null); setNote(''); }} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button>
          {active?.status === 'OPEN' && <button onClick={() => doAct('ACK')} className="kpc-btn kpc-btn-outline">{t.escP.acknowledge}</button>}
          <button disabled={!note.trim()} onClick={() => doAct('RESOLVE')} className="kpc-btn kpc-btn-primary">{busy ? '…' : t.common.confirm}</button>
        </>}>
        <p className="text-[0.74rem] text-[var(--kpc-ink-2)] mb-3">{active?.summary}</p>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.escP.resolveBody} className="kpc-input !leading-relaxed resize-none" />
      </Modal>
    </div>
  );
}
