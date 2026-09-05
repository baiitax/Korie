'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FileSearch, ArrowUpRight, CheckCircle2, RotateCcw, MessageSquarePlus, FolderSearch, Clock3 } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, KeyVal, PageHead, Modal, Input, EmptyState, toneOfRisk, Avatar, StatusDot } from '@/components/compliance/ui/Ck';
import { chipTxt, Money } from '@/components/compliance/workspaces/helpers';

type Act = 'ESCALATE' | 'RESOLVE' | 'REOPEN' | 'ACK';
export default function CaseWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const p = useCompliancePortal();
  const { t } = p;
  const id = String(params?.id ?? '');
  const c = p.caseById(id);
  const [confirm, setConfirm] = useState<Act | null>(null);
  const [note, setNote] = useState('');
  const [newNote, setNewNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!c) return <Card className="mt-3"><EmptyState title="Case not found" body={`No case ${id} in the demo set.`} action={<Link href="/compliance/cases" className="kpc-btn kpc-btn-primary">{t.caseP.title}</Link>} /></Card>;

  const doAct = () => {
    if ((confirm === 'ESCALATE' || confirm === 'RESOLVE') && !note.trim()) return;
    setBusy(true);
    window.setTimeout(() => { p.caseAction(c!.caseNumber, confirm!, note.trim() || undefined); setConfirm(null); setNote(''); setBusy(false); router.refresh(); }, 320);
  };
  const addNote = () => { if (!newNote.trim()) return; p.addCaseNote(c.caseNumber, newNote.trim()); setNewNote(''); };

  const slaMs = new Date(c.deadlineSla).getTime() - Date.now();
  const slaTone = slaMs < 0 ? 'critical' : slaMs < 24 * 3600_000 ? 'high' : slaMs < 72 * 3600_000 ? 'medium' : 'low';

  return (
    <div>
      <PageHead icon={FileSearch} title={<span className="flex items-center gap-2 flex-wrap">{c.caseNumber}<Chip tone="dim" className="kpc-mono">{c.caseType.replace(/_/g, ' ')}</Chip></span>}
        sub={t.caseD.title + ' — ' + c.title}
        actions={<><Link href="/compliance/cases" className="kpc-btn kpc-btn-ghost">{t.common.back}</Link>{c.customerId && <Link href={`/compliance/customers/${c.customerId.replace('KP-', '')}`} className="kpc-btn kpc-btn-outline">{t.common.customer}</Link>}</>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <Chip tone={toneOfRisk(c.status)}>{chipTxt(c.status, t)}</Chip>
        <Chip tone={c.priority === 'URGENT' ? 'critical' : c.priority === 'HIGH' ? 'high' : 'medium'}>{c.priority}</Chip>
        <Chip tone={toneOfRisk(c.riskLevel)}>{c.riskLevel}</Chip>
        <Chip tone={slaTone as never}><Clock3 className="w-3 h-3" /> SLA {p.relTime(c.deadlineSla)}</Chip>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.caseD.summaryBlock}</h3>
            <p className="text-[0.78rem] text-[var(--kpc-ink-2)] leading-relaxed">{c.summary}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 mt-3">
              <KeyVal k={t.caseP.target} v={c.customerName ?? '—'} strong />
              <KeyVal k={t.caseD.assignee} v={c.assignedOfficerName} />
              <KeyVal k={t.caseP.linkedAlert} v={c.relatedAlertIds.length ? c.relatedAlertIds.join(', ') : '—'} mono />
              {c.amount ? <KeyVal k={t.common.amount} v={<Money amount={c.amount} currency={c.currency ?? 'XOF'} fmt={p.fmtMoney} />} strong /> : null}
              <KeyVal k={t.caseP.createdCol} v={p.fmtDT(c.createdAt)} />
              <KeyVal k={t.caseP.updatedCol} v={p.fmtDT(c.updatedAt)} />
            </div>
            {c.relatedAlertIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.relatedAlertIds.map((al) => <Link key={al} href={`/compliance/alerts/${al}`} className="kpc-chip tone-warn hover:opacity-80">{al}</Link>)}
              </div>
            )}
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.caseD.timelineBlock}</h3>
            <div className="relative pl-5">
              {c.timeline.map((ev, i, arr) => (
                <div key={i} className="relative pb-3.5">
                  {i < arr.length - 1 && <span className="absolute left-[-11px] top-4 bottom-0 w-px bg-[rgba(var(--kpc-ring),0.5)]" />}
                  <div className="flex items-start gap-2.5"><span className="absolute left-[-15px] top-1 w-2 h-2 rounded-full bg-teal-500 ring-4 ring-teal-500/15" /><div className="flex-1"><p className="text-[0.74rem] font-bold text-[var(--kpc-ink)]">{ev.text}</p><p className="text-[0.62rem] text-[var(--kpc-ink-3)] mt-0.5">{ev.by ? `${ev.by} · ` : ''}{p.fmtDT(ev.at)}</p></div></div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.caseD.notesBlock}</h3>
            <div className="space-y-2 mb-3">
              {c.notes.map((n, i) => <div key={i} className="kpc-inset px-3.5 py-2.5 text-[0.74rem] font-semibold text-[var(--kpc-ink-2)] flex items-start gap-2"><MessageSquarePlus className="w-3.5 h-3.5 mt-0.5 text-[var(--kpc-ink-3)] shrink-0" /><span>{n}</span></div>)}
              {!c.notes.length && <p className="text-[0.7rem] text-[var(--kpc-ink-3)]">{t.caseD.notesEmpty}</p>}
            </div>
            <div className="flex gap-2">
              <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} placeholder={t.caseD.addNotePh} className="!text-[0.76rem]" wrapClass="flex-1" />
              <button onClick={addNote} className="kpc-btn kpc-btn-outline">{t.alrtD.addNote}</button>
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-1">{t.caseD.decisionBlock}</h3>
            <p className="text-[0.62rem] text-[var(--kpc-ink-3)] mb-3">{t.common.demoNote}</p>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => setConfirm('ESCALATE')} className="kpc-btn kpc-btn-warn"><ArrowUpRight className="w-4 h-4" /> {t.caseD.escalateBtn}</button>
              <button onClick={() => setConfirm('RESOLVE')} className="kpc-btn kpc-btn-primary"><CheckCircle2 className="w-4 h-4" /> {t.caseD.resolveBtn}</button>
              {['RESOLVED', 'CLOSED'].includes(c.status) && <button onClick={() => setConfirm('REOPEN')} className="kpc-btn kpc-btn-outline"><RotateCcw className="w-4 h-4" /> {t.caseD.reopenBtn}</button>}
            </div>
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2"><FolderSearch className="w-4 h-4 text-[var(--kpc-brand-ink)] inline mr-1" /> {t.caseD.assignee}</h3>
            <div className="flex items-center gap-2.5">
              <Avatar name={c.assignedOfficerName} size={34} />
              <div><p className="text-[0.78rem] font-bold text-[var(--kpc-ink)]">{c.assignedOfficerName}</p><p className="text-[0.62rem] text-[var(--kpc-ink-3)]">{p.currentOfficer.id === c.assignedOfficerId ? 'Current officer' : 'Case officer'}</p></div>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? t.cases.decisionForm : ''}
        footer={<><button onClick={() => setConfirm(null)} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button><button disabled={(confirm === 'ESCALATE' || confirm === 'RESOLVE') && !note.trim()} onClick={doAct} className={`kpc-btn ${confirm === 'ESCALATE' ? 'kpc-btn-warn' : 'kpc-btn-primary'}`}>{busy ? '…' : t.common.confirm}</button></>}>
        {confirm === 'RESOLVE' && <label className="block text-[0.72rem] font-bold text-[var(--kpc-ink-2)] mb-2">{t.caseD.resolveBody}</label>}
        {confirm === 'ESCALATE' && <label className="block text-[0.72rem] font-bold text-[var(--kpc-ink-2)] mb-2">{t.caseD.escBody}</label>}
        {(confirm === 'RESOLVE' || confirm === 'ESCALATE') && <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={confirm === 'RESOLVE' ? t.caseD.resolveReason : t.kycD.decisionReasonPh} className="kpc-input !leading-relaxed resize-none" />}
      </Modal>
    </div>
  );
}
