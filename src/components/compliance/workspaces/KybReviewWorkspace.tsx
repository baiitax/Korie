'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, UserCheck, Fingerprint, BadgeCheck, ArrowUpRight, RotateCcw, Users } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, KeyVal, PageHead, Modal, useBoot, PageSkel, EmptyState, Avatar, toneOfRisk, CkTable, Col } from '@/components/compliance/ui/Ck';
import { chipTxt } from './helpers';

type Decision = 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
export function KybReviewWorkspace({ id }: { id: string }) {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(380);
  const rec = p.kybById(`KYB-${id}`);
  const customer = p.customerById(rec?.customerId);
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ready) return <PageSkel />;
  if (!rec) return <Card className="mt-2"><EmptyState title="KYB application not found" action={<Link href="/compliance/kyb" className="kpc-btn kpc-btn-primary">{t.kybP.title}</Link>} /></Card>;

  const doDecision = () => {
    if (!reason.trim() || busy) return;
    setBusy(true);
    window.setTimeout(() => { p.decideKyb(rec!.id, confirm!, reason.trim()); setConfirm(null); setReason(''); setBusy(false); router.push('/compliance/kyb'); }, 380);
  };

  const directorCols: Col<(typeof rec.directors)[number]>[] = [
    { key: 'd', header: t.kybP.directors, render: (d) => <div className="flex items-center gap-2"><Avatar name={d.name} size={26} /><span className="text-[0.74rem] font-bold text-[var(--kpc-ink)]">{d.name}</span></div> },
    { key: 'role', header: t.common.title, render: (d) => <span className="text-[0.7rem] font-semibold text-[var(--kpc-ink-2)]">{d.role}</span> },
    { key: 'idm', header: t.common.customerId, render: (d) => <span className="kpc-mono text-[0.66rem] text-[var(--kpc-ink-3)]">{d.idMasked}</span> },
    { key: 'risk', header: t.common.risk, render: (d) => <Chip tone={toneOfRisk(d.riskLevel)}>{d.riskLevel}</Chip> },
  ];

  return (
    <div>
      <PageHead icon={Building2} title={<span className="flex items-center gap-2 flex-wrap">{rec.businessName}<Chip tone="dim" className="kpc-mono">{rec.id}</Chip></span>}
        sub={t.kybD.sub}
        actions={<>{customer && <Link href={`/compliance/customers/${customer.id.replace('KP-', '')}`} className="kpc-btn kpc-btn-outline">{t.common.customer}</Link>}<Link href="/compliance/kyb" className="kpc-btn kpc-btn-ghost">{t.common.back}</Link></>} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-[var(--kpc-brand-ink)]" /> {t.kybD.ownership}</h3>
            <CkTable aria-label={t.kybD.ownership} cols={directorCols} rows={rec.directors} rowKey={(d) => d.name} dense />
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] flex items-center gap-2 mb-2"><Fingerprint className="w-4 h-4 text-[var(--kpc-brand-ink)]" /> {t.kycD.screeningTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
              <KeyVal k={t.kycD.sanctionsCheck} v={<Chip tone={rec.screening.sanctions === 'CLEAN' ? 'ok' : rec.screening.sanctions === 'CONFIRMED_MATCH' ? 'critical' : 'warn'}>{rec.screening.sanctions.replace(/_/g, ' ')}</Chip>} />
              <KeyVal k={t.kycD.pepCheck} v={<Chip tone={rec.screening.pep === 'CLEAN' ? 'ok' : 'warn'}>{rec.screening.pep.replace(/_/g, ' ')}</Chip>} />
              <KeyVal k={t.common.risk} v={<Chip tone={toneOfRisk(rec.riskLevel)}>{rec.riskLevel} · {rec.riskScore}</Chip>} />
            </div>
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.kycD.documents}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {rec.documents.map((d) => (
                <div key={d.id} className="rounded-xl border border-[rgba(var(--kpc-ring),0.7)] bg-[var(--kpc-bg-2)] p-3">
                  <div className="flex items-center justify-between"><span className="text-[0.66rem] font-bold text-[var(--kpc-ink-3)] uppercase tracking-wide">{d.category}</span><Chip tone={toneOfRisk(d.status)}>{chipTxt(d.status, t)}</Chip></div>
                  <p className="text-[0.7rem] font-bold text-[var(--kpc-ink)] mt-1.5">{d.docType}</p>
                  <p className="text-[0.6rem] kpc-mono text-[var(--kpc-ink-3)] mt-0.5">{d.refMasked}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.kybD.businessInfo}</h3>
            <KeyVal k={t.kybP.registration} v={rec.regNumberMasked} mono strong />
            <KeyVal k={t.common.country} v={rec.country === 'NE' ? `${t.common.niger} 🇳🇪` : `${t.common.nigeria} 🇳🇬`} />
            <KeyVal k={t.common.type} v={rec.businessType.replace(/_/g, ' ')} />
            <KeyVal k={t.kybP.industry} v={rec.industry ?? '—'} />
            <KeyVal k={t.common.submitted} v={p.fmtDT(rec.submittedAt)} />
            <KeyVal k={t.common.reviewer} v={rec.reviewerName ?? t.kycD.notStarted} />
          </Card>
          <Card className="!border-t-2 !border-t-teal-600/40">
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.kybD.review}</h3>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => setConfirm('APPROVE')} className="kpc-btn kpc-btn-primary !py-2.5"><BadgeCheck className="w-4 h-4" /> {t.kybD.approve}</button>
              <button onClick={() => setConfirm('REJECT')} className="kpc-btn kpc-btn-danger !py-2.5">{t.kybD.reject}</button>
              <button onClick={() => setConfirm('REQUEST_INFO')} className="kpc-btn kpc-btn-outline !py-2.5"><RotateCcw className="w-4 h-4" /> {t.kybD.requestMore}</button>
            </div>
          </Card>
        </div>
      </div>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={t.kycD.decision}
        footer={<><button onClick={() => setConfirm(null)} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button><button disabled={!reason.trim() || busy} onClick={doDecision} className={`kpc-btn ${confirm === 'REJECT' ? 'kpc-btn-danger' : 'kpc-btn-primary'}`}>{busy ? '…' : t.common.confirm}</button></>}>
        <label className="block text-[0.68rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)] mb-1.5">{t.kycD.decisionReason}</label>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.kycD.decisionReasonPh} className="kpc-input !leading-relaxed resize-none" />
      </Modal>
    </div>
  );
}
