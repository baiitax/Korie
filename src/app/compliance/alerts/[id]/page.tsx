'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Bell, ShieldAlert, Fingerprint, AlertOctagon, CheckCheck, ArrowUpRight, XCircle, FilePlus2, MessageSquarePlus, Clock3 } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, KeyVal, PageHead, Modal, Input, EmptyState, toneOfRisk, StatusDot } from '@/components/compliance/ui/Ck';
import { chipTxt } from '@/components/compliance/workspaces/helpers';

type Act = 'ACK' | 'INVESTIGATE' | 'ESCALATE' | 'RESOLVE' | 'DISMISS' | 'CREATE_CASE';
export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const p = useCompliancePortal();
  const { t } = p;
  const id = String(params?.id ?? '');
  const a = p.alertById(id);
  const [confirm, setConfirm] = useState<Act | null>(null);
  const [note, setNote] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [busy, setBusy] = useState(false);

  if (!a) return <Card className="mt-3"><EmptyState title="Alert not found" body={`No alert ${id} in the demo set.`} action={<Link href="/compliance/alerts" className="kpc-btn kpc-btn-primary">{t.alrtP.title}</Link>} /></Card>;

  const act = (action: Act) => {
    if ((action === 'ESCALATE' || action === 'RESOLVE' || action === 'DISMISS') && !note.trim()) return;
    if (busy) return;
    setBusy(true);
    window.setTimeout(() => {
      p.alertAction(a!.id, action, note.trim() || undefined);
      setConfirm(null); setNote(''); setBusy(false);
      if (action === 'RESOLVE' || action === 'DISMISS' || action === 'CREATE_CASE') { /* stay on detail for case link */ }
    }, 350);
  };
  const addNote = () => { if (!noteInput.trim()) return; p.addAlertNote(a.id, noteInput.trim()); setNoteInput(''); };

  const kindIcon = a.kind === 'AML' ? ShieldAlert : a.kind === 'SCREENING' ? Fingerprint : AlertOctagon;
  const needReason = confirm === 'ESCALATE' || confirm === 'RESOLVE' || confirm === 'DISMISS';
  const caseLink = a.relatedCaseNumber ? p.caseById(a.relatedCaseNumber) : undefined;

  return (
    <div>
      <PageHead icon={Bell} title={<span className="flex items-center gap-2 flex-wrap">{a.title}<Chip tone="dim" className="kpc-mono">{a.id}</Chip></span>}
        sub={t.alrtD.title + ' · ' + t.alrtD.summary}
        actions={<><Link href="/compliance/alerts" className="kpc-btn kpc-btn-ghost">{t.common.back}</Link>{a.customerId && <Link href={`/compliance/customers/${a.customerId.replace('KP-', '')}`} className="kpc-btn kpc-btn-outline">{t.common.customer}</Link>}</>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <Chip tone={toneOfRisk(a.severity)}>{a.severity}</Chip>
        <Chip tone={toneOfRisk(a.status)}>{chipTxt(a.status, t)}</Chip>
        <Chip tone="dim">{a.kind}</Chip>
        {a.ruleCode && <Chip tone="dim" className="kpc-mono">{a.ruleCode}</Chip>}
        {a.country && <Chip tone="dim">{a.country === 'NE' ? '🇳🇪 Niger' : '🇳🇬 Nigeria'}</Chip>}
        {a.assignedTo && <Chip tone="brand">{t.audP.officerCol}: {a.assignedTo}</Chip>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.alrtD.summary}</h3>
            <p className="text-[0.78rem] text-[var(--kpc-ink-2)] leading-relaxed">{a.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 mt-3">
              <KeyVal k={t.alrtD.trigger} v={a.ruleCode ?? 'Manual'} mono strong />
              <KeyVal k={t.common.customer} v={a.customerName ?? '—'} strong />
              <KeyVal k={t.common.amount} v={a.amount ? p.fmtMoney(a.amount, a.currency ?? 'XOF') : '—'} strong />
              <KeyVal k={t.alrtP.age} v={p.relTime(a.triggeredAt)} />
              {a.slaAt && <KeyVal k={t.common.sla} v={p.relTime(a.slaAt)} />}
              <KeyVal k={t.common.timestamp} v={p.fmtDT(a.triggeredAt)} mono />
              {caseLink && <KeyVal k={t.alrtD.caseRef} v={<Link href={`/compliance/cases/${caseLink.caseNumber}`} className="kpc-link">{caseLink.caseNumber}</Link>} />}
            </div>
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.alrtD.evidence}</h3>
            <div className="space-y-1.5">
              {a.evidence.map((e, i) => <div key={i} className="flex items-center gap-2.5 rounded-lg kpc-inset px-3 py-2 text-[0.72rem] font-semibold text-[var(--kpc-ink-2)]"><StatusDot tone="info" /><span>{e}</span></div>)}
            </div>
            <div className="flex gap-2 mt-3">
              <Input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} placeholder={t.alrtD.notePh} className="!text-[0.76rem]" wrapClass="flex-1" />
              <button onClick={addNote} className="kpc-btn kpc-btn-outline"><MessageSquarePlus className="w-4 h-4" /> {t.alrtD.addNote}</button>
            </div>
            {a.notes && <p className="text-[0.7rem] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-3">📝 {a.notes}</p>}
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.alrtD.timeline}</h3>
            <div className="relative pl-5">
              {a.timeline.map((ev, i, arr) => (
                <div key={i} className="relative pb-3.5">
                  {i < arr.length - 1 && <span className="absolute left-[-11px] top-4 bottom-0 w-px bg-[rgba(var(--kpc-ring),0.5)]" />}
                  <div className="flex items-start gap-2.5"><span className="absolute left-[-15px] top-1 w-2 h-2 rounded-full bg-teal-500 ring-4 ring-teal-500/15" /><div className="flex-1"><p className="text-[0.74rem] font-bold text-[var(--kpc-ink)]">{ev.text}</p><p className="text-[0.62rem] text-[var(--kpc-ink-3)] mt-0.5">{ev.by ? `${ev.by} · ` : ''}{p.fmtDT(ev.at)}</p></div></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-1">{t.alrtD.actionsLabel}</h3>
            <p className="text-[0.62rem] text-[var(--kpc-ink-3)] mb-3">{t.common.demoNote} — actions write to the audit log.</p>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => setConfirm('ACK')} className="kpc-btn kpc-btn-outline"><CheckCheck className="w-4 h-4" /> {t.alrtD.ack}</button>
              <button onClick={() => setConfirm('INVESTIGATE')} className="kpc-btn kpc-btn-primary"><Bell className="w-4 h-4" /> {t.alrtD.investigate}</button>
              <button onClick={() => setConfirm('ESCALATE')} className="kpc-btn kpc-btn-warn"><ArrowUpRight className="w-4 h-4" /> {t.alrtD.escalateTo}</button>
              <button onClick={() => setConfirm('CREATE_CASE')} className="kpc-btn kpc-btn-dark"><FilePlus2 className="w-4 h-4" /> {t.alrtD.createCase}</button>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setConfirm('RESOLVE')} className="kpc-btn kpc-btn-outline"><CheckCheck className="w-4 h-4" /> {t.alrtD.resolve}</button>
                <button onClick={() => setConfirm('DISMISS')} className="kpc-btn kpc-btn-ghost text-rose-600 dark:text-rose-400"><XCircle className="w-4 h-4" /> {t.alrtD.dismiss}</button>
              </div>
            </div>
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] flex items-center gap-2 mb-2"><Clock3 className="w-4 h-4 text-[var(--kpc-brand-ink)]" /> {t.alrtD.relatedActivity}</h3>
            {a.customerId && <Link href={`/compliance/customers/${a.customerId.replace('KP-', '')}`} className="text-[0.72rem] font-bold text-[var(--kpc-ink-2)] hover:text-[var(--kpc-brand-ink)]">View {a.customerName} compliance profile →</Link>}
            {!caseLink && <p className="text-[0.64rem] text-[var(--kpc-ink-3)] mt-2">{t.alrtD.noCase}</p>}
            {caseLink && <Link href={`/compliance/cases/${caseLink.caseNumber}`} className="text-[0.72rem] font-bold text-[var(--kpc-ink-2)] hover:text-[var(--kpc-brand-ink)] block mt-1">{t.alrtD.caseRef}: {caseLink.caseNumber} →</Link>}
          </Card>
        </div>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? t.cases.decisionForm : ''}
        footer={<><button onClick={() => setConfirm(null)} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button>
          <button disabled={needReason && !note.trim()} onClick={() => confirm && act(confirm)} className="kpc-btn kpc-btn-primary">{busy ? '…' : t.common.confirm}</button></>}>
        {confirm === 'CREATE_CASE' && <p className="text-[0.74rem] text-[var(--kpc-ink-2)] mb-3">{t.dash.attentionCases ? 'A new investigation case will be opened from this alert and linked here.' : ''}</p>}
        {confirm === 'RESOLVE' && <p className="text-[0.74rem] text-[var(--kpc-ink-2)] mb-3">{t.alrtD.resolvedHint}</p>}
        {needReason && (
          <>
            <label className="block text-[0.68rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)] mb-1.5">{t.kycD.decisionReason}</label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.kycD.decisionReasonPh} className="kpc-input !leading-relaxed resize-none" />
          </>
        )}
      </Modal>
    </div>
  );
}
