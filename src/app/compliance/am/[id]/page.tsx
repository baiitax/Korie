'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ShieldAlert, FileText, CheckCircle2, XCircle, TrendingUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, KeyVal, PageHead, Modal, EmptyState, Avatar, toneOfRisk, useBoot, PageSkel } from '@/components/compliance/ui/Ck';
import { chipTxt, Money, Age } from '@/components/compliance/workspaces/helpers';

type Act = 'REPORT' | 'FALSE_POSITIVE' | 'NO_ACTION';
export default function AmlDetailPage() {
  const params = useParams();
  const router = useRouter();
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(360);
  const id = String(params?.id ?? '');
  const x = p.alertById(`AML-${id}`);
  const [decision, setDecision] = useState<Act | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!ready) return <PageSkel />;
  if (!x || x.kind !== 'AML') return <Card className="mt-3"><EmptyState title="AML alert not found" body={`No alert AML-${id} in the demo set.`} action={<Link href="/compliance/am" className="kpc-btn kpc-btn-primary">{t.amlP.title}</Link>} /></Card>;

  const doDecision = () => {
    if (busy || !decision) return;
    setBusy(true);
    const action = decision === 'REPORT' ? 'ESCALATE' : decision === 'FALSE_POSITIVE' ? 'DISMISS' : 'RESOLVE';
    window.setTimeout(() => {
      p.alertAction(x!.id, action, note.trim() || (decision === 'REPORT' ? 'Reported as SAR (demo — regulator channel not wired)' : decision === 'FALSE_POSITIVE' ? 'Marked false positive' : 'No further action'));
      setDecision(null); setNote(''); setBusy(false);
      router.refresh();
    }, 340);
  };

  return (
    <div>
      <PageHead icon={ShieldAlert} title={<span className="flex items-center gap-2 flex-wrap">{t.amlD.title}<span className="kpc-mono text-[0.8rem] font-extrabold text-[var(--kpc-brand-ink)]">{x.id}</span></span>}
        sub={x.title}
        actions={<><Link href="/compliance/am" className="kpc-btn kpc-btn-ghost">{t.common.back}</Link>{x.customerId && <Link href={`/compliance/customers/${x.customerId.replace('KP-', '')}`} className="kpc-btn kpc-btn-outline">{t.common.customer}</Link>}</>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <Chip tone={toneOfRisk(x.severity)}>{x.severity}</Chip>
        <Chip tone={toneOfRisk(x.status)}>{chipTxt(x.status, t)}</Chip>
        {x.ruleCode && <Chip tone="dim" className="kpc-mono">{x.ruleCode}</Chip>}
        {x.assignedTo && <Chip tone="brand">{t.audP.officerCol}: {x.assignedTo}</Chip>}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.amlD.alertSummary}</h3>
            <p className="text-[0.78rem] text-[var(--kpc-ink-2)] leading-relaxed">{x.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 mt-3">
              <KeyVal k={t.common.customer} v={x.customerName ?? '—'} strong />
              <KeyVal k={t.common.amount} v={x.amount ? <Money amount={x.amount} currency={(x.currency ?? 'XOF') as 'XOF' | 'NGN'} fmt={p.fmtMoney} /> : '—'} strong />
              <KeyVal k={t.amlD.flaggedAt} v={p.fmtDT(x.triggeredAt)} />
              <KeyVal k={t.alrtP.kind} v={x.kind} />
            </div>
            {x.slaAt && <KeyVal k={t.common.sla} v={p.relTime(x.slaAt)} />}
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.amlD.indicators}</h3>
            <div className="space-y-1.5">
              {x.evidence.map((e, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg kpc-inset px-3 py-2 text-[0.72rem] font-semibold text-[var(--kpc-ink-2)]"><TrendingUp className="w-4 h-4 text-orange-500 shrink-0" /><span>{e}</span></div>
              ))}
              {!x.evidence.length && <p className="text-[0.7rem] text-[var(--kpc-ink-3)]">{t.amlD.noIndicators}</p>}
            </div>
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.amlD.relatedTxns}</h3>
            <div className="space-y-1.5">
              {x.ruleCode && x.ruleCode.startsWith('AML-') ? (() => {
                const rel = p.txns.filter((txn) => txn.rulesTriggered.some((r) => r.code === x.ruleCode)).slice(0, 4);
                if (!rel.length) return <p className="text-[0.7rem] text-[var(--kpc-ink-3)]">{t.amlD.noRelated}</p>;
                return rel.map((txn) => (
                  <Link key={txn.id} href={`/compliance/transaction-monitoring/${txn.id.replace('TXN-', '')}`} className="flex items-center gap-2.5 rounded-lg border border-[rgba(var(--kpc-ring),0.6)] px-3 py-2 hover:bg-[rgba(var(--kpc-ring),0.3)]">
                    {txn.direction === 'IN' ? <ArrowDownLeft className="w-4 h-4 text-emerald-500 shrink-0" /> : <ArrowUpRight className="w-4 h-4 text-sky-500 shrink-0" />}
                    <span className="kpc-mono text-[0.66rem] font-bold text-[var(--kpc-brand-ink)]">{txn.id}</span>
                    <Money amount={txn.amount} currency={txn.currency} fmt={p.fmtMoney} />
                    <span className="ml-auto text-[0.62rem] text-[var(--kpc-ink-3)]">{p.relTime(txn.timestamp)}</span>
                  </Link>
                ));
              })() : <p className="text-[0.7rem] text-[var(--kpc-ink-3)]">{t.amlD.noRelated}</p>}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-1">{t.amlD.decisionLabel}</h3>
            <p className="text-[0.62rem] text-[var(--kpc-ink-3)] mb-3">{t.common.demoNote}</p>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => setDecision('REPORT')} className="kpc-btn kpc-btn-warn"><FileText className="w-4 h-4" /> {t.amlD.reportSar}</button>
              <button onClick={() => setDecision('FALSE_POSITIVE')} className="kpc-btn kpc-btn-outline"><XCircle className="w-4 h-4" /> {t.amlD.markFalsePositive}</button>
              <button onClick={() => setDecision('NO_ACTION')} className="kpc-btn kpc-btn-ghost"><CheckCircle2 className="w-4 h-4" /> {t.amlD.noAction}</button>
            </div>
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.amlD.auditTrail}</h3>
            <div className="relative pl-5">
              {x.timeline.map((ev, i, arr) => (
                <div key={i} className="relative pb-3">
                  {i < arr.length - 1 && <span className="absolute left-[-11px] top-3.5 bottom-0 w-px bg-[rgba(var(--kpc-ring),0.5)]" />}
                  <span className="absolute left-[-15px] top-1 w-2 h-2 rounded-full bg-teal-500 ring-4 ring-teal-500/15" />
                  <p className="text-[0.7rem] font-bold text-[var(--kpc-ink)]">{ev.text}</p>
                  <p className="text-[0.6rem] text-[var(--kpc-ink-3)] mt-0.5">{ev.by ? `${ev.by} · ` : ''}{p.fmtDT(ev.at)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <Modal open={!!decision} onClose={() => setDecision(null)} title={decision ? (decision === 'REPORT' ? t.amlD.reportSar : decision === 'FALSE_POSITIVE' ? t.amlD.markFalsePositive : t.amlD.noAction) : ''}
        footer={<><button onClick={() => setDecision(null)} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button><button onClick={doDecision} className={`kpc-btn ${decision === 'REPORT' ? 'kpc-btn-warn' : 'kpc-btn-primary'}`}>{busy ? '…' : t.common.confirm}</button></>}>
        <p className="text-[0.74rem] text-[var(--kpc-ink-2)] mb-3">{decision === 'REPORT' ? t.amlD.reportBody : decision === 'FALSE_POSITIVE' ? t.amlD.fpBody : t.amlD.noActionBody}</p>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.kycD.decisionReasonPh} className="kpc-input !leading-relaxed resize-none" />
      </Modal>
    </div>
  );
}
