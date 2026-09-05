'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Fingerprint, ShieldAlert, BadgeCheck, XCircle } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, KeyVal, PageHead, Modal, EmptyState, Avatar, toneOfRisk, useBoot, PageSkel } from '@/components/compliance/ui/Ck';

export default function SanctionsMatchPage() {
  const params = useParams();
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(340);
  const id = String(params?.id ?? '');
  const m = p.matchById(id);
  const [decision, setDecision] = useState<'CONFIRM' | 'FALSE_POSITIVE' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!ready) return <PageSkel />;
  if (!m) return <Card className="mt-3"><EmptyState title="Match not found" action={<Link href="/compliance/sanctions" className="kpc-btn kpc-btn-primary">{t.sancP.title}</Link>} /></Card>;
  const customer = p.customerById(m.customerId);
  const doDecision = () => {
    if (busy) return;
    setBusy(true);
    window.setTimeout(() => { p.screeningDecision(m!.id, decision!, note.trim() || undefined); setDecision(null); setNote(''); setBusy(false); router.push('/compliance/sanctions'); }, 340);
  };
  return (
    <div>
      <PageHead icon={Fingerprint} title={<span className="flex items-center gap-2 flex-wrap">{m.customerName}<Chip tone="dim" className="kpc-mono">{m.id}</Chip></span>} sub={`${t.sancP.listName}: ${m.listName}`}
        actions={<><Link href="/compliance/sanctions" className="kpc-btn kpc-btn-ghost">{t.common.back}</Link>{customer && <Link href={`/compliance/customers/${customer.id.replace('KP-', '')}`} className="kpc-btn kpc-btn-outline">{t.common.customer}</Link>}</>} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> {t.kycD.identityMatch}</h3>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="relative w-28 h-28"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90"><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(var(--kpc-ring),0.4)" strokeWidth="10" /><circle cx="60" cy="60" r="50" fill="none" stroke={m.score >= 80 ? '#e11d48' : m.score >= 60 ? '#f97316' : '#f59e0b'} strokeWidth="10" strokeDasharray={`${(m.score / 100) * 314} 314`} strokeLinecap="round" /></svg><span className="absolute inset-0 flex items-center justify-center kpc-num text-[1.25rem] font-extrabold text-[var(--kpc-ink)]">{m.score}%</span></div>
            <div className="flex-1 min-w-[220px]">
              <KeyVal k={t.sancP.listName} v={m.listName} strong />
              <KeyVal k={t.sancP.matchedFields} v={m.matchedFields.join(', ')} />
              <KeyVal k={t.common.country} v={m.country === 'NE' ? '🇳🇪 ' + t.common.niger : '🇳🇬 ' + t.common.nigeria} />
              <KeyVal k={t.common.status} v={<Chip tone={toneOfRisk(m.status)}>{m.status.replace(/_/g, ' ')}</Chip>} />
              <KeyVal k={t.common.submitted} v={p.fmtDT(m.triggeredAt)} />
              {m.reviewedBy && <KeyVal k={t.common.reviewer} v={m.reviewedBy} />}
            </div>
          </div>
          {m.notes && <p className="text-[0.7rem] text-[var(--kpc-ink-2)] bg-[rgba(var(--kpc-ring),0.4)] rounded-lg px-3 py-2 mt-3">📝 {m.notes}</p>}
        </Card>
        <div className="space-y-4">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-1">{t.sancP.decision}</h3>
            <p className="text-[0.64rem] text-[var(--kpc-ink-3)] mb-3">{t.common.demoNote}</p>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => setDecision('CONFIRM')} className="kpc-btn kpc-btn-danger"><BadgeCheck className="w-4 h-4" /> {t.sancP.confirmFreeze}</button>
              <button onClick={() => setDecision('FALSE_POSITIVE')} className="kpc-btn kpc-btn-outline"><XCircle className="w-4 h-4" /> {t.sancP.markFalsePositive}</button>
            </div>
          </Card>
        </div>
      </div>
      <Modal open={!!decision} onClose={() => setDecision(null)} title={decision === 'CONFIRM' ? t.sancP.confirmFreeze : t.sancP.markFalsePositive}
        footer={<><button onClick={() => setDecision(null)} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button><button onClick={doDecision} className={`kpc-btn ${decision === 'CONFIRM' ? 'kpc-btn-danger' : 'kpc-btn-primary'}`}>{busy ? '…' : t.common.confirm}</button></>}>
        <p className="text-[0.74rem] text-[var(--kpc-ink-2)] mb-3">{decision === 'CONFIRM' ? t.sancP.confirmBody : t.sancP.fpBody}</p>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.kycD.decisionReasonPh} className="kpc-input !leading-relaxed resize-none" />
      </Modal>
    </div>
  );
}
