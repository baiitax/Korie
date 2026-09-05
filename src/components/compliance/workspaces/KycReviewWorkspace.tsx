'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCheck, FileText, Fingerprint, ShieldCheck, Gauge, BadgeCheck, Eye, ArrowUpRight, AlertTriangle, RotateCcw } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, KeyVal, PageHead, Avatar, Modal, Input, useBoot, PageSkel, EmptyState, toneOfRisk } from '@/components/compliance/ui/Ck';
import { chipTxt } from './helpers';

type Decision = 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE';

export function KycReviewWorkspace({ id }: { id: string }) {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(380);
  const rec = p.kycById(`KYC-${id}`);
  const customer = p.customerById(rec?.customerId);
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [docView, setDocView] = useState<string | null>(null);
  const doc = rec?.documents.find((d) => d.id === docView);

  if (!ready) return <PageSkel />;
  if (!rec) return <Card className="mt-2"><EmptyState title="KYC application not found" body={`No application ${id} in the demo set.`} action={<Link href="/compliance/kyc" className="kpc-btn kpc-btn-primary">{t.kycP.title}</Link>} /></Card>;

  const doDecision = () => {
    if (!reason.trim() || busy) return;
    setBusy(true);
    window.setTimeout(() => {
      p.decideKyc(rec!.id, confirm!, reason.trim());
      setConfirm(null); setReason(''); setBusy(false);
      router.push('/compliance/kyc');
    }, 420);
  };

  const decLabel: Record<Decision, string> = { APPROVE: t.kycD.approve, REJECT: t.kycD.reject, REQUEST_INFO: t.kycD.requestMore, ESCALATE: t.kycD.escalate };
  const confirmTitle: Record<Decision, string> = { APPROVE: t.kycD.confirmApprove, REJECT: t.kycD.confirmReject, REQUEST_INFO: t.kycD.confirmReq, ESCALATE: t.kycD.confirmEsc };
  const confirmBody: Record<Decision, string> = { APPROVE: t.kycD.confirmApproveBody, REJECT: t.kycD.confirmRejectBody, REQUEST_INFO: t.kycD.confirmReqBody, ESCALATE: t.kycD.confirmEscBody };

  return (
    <div>
      <PageHead icon={UserCheck} title={<span className="flex items-center gap-2 flex-wrap">{rec.customerName}<Chip tone="dim" className="kpc-mono">{rec.id}</Chip></span>}
        sub={t.kycD.sub}
        actions={<>
          <Link href="/compliance/kyc" className="kpc-btn kpc-btn-ghost">{t.common.back}</Link>
          {customer && <Link href={`/compliance/customers/${customer.id.replace('KP-', '')}`} className="kpc-btn kpc-btn-outline">{t.common.customer}</Link>}
        </>} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {/* customer information */}
          <Card>
            <CardHead icon={UserCheck} title={t.kycD.customerInfo} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 mt-1">
              <KeyVal k={t.common.customerId} v={rec.customerId} mono strong />
              <KeyVal k={t.common.country} v={rec.country === 'NE' ? `${t.common.niger} 🇳🇪` : `${t.common.nigeria} 🇳🇬`} />
              <KeyVal k={t.kycP.level} v={rec.tier.replace('_', ' ')} />
              <KeyVal k="Phone" v={rec.phoneMasked} mono />
              <KeyVal k="Email" v={rec.emailMasked} mono />
              <KeyVal k="NIN / CNI" v={rec.ninMasked ?? '—'} mono />
              {rec.bvnMasked && <KeyVal k="BVN" v={rec.bvnMasked} mono />}
              <KeyVal k={t.kycCommon.informationRequested} v={t.common.addressCheck ? rec.addressStatus : rec.addressStatus} />
            </div>
          </Card>

          {/* documents */}
          <Card>
            <CardHead icon={FileText} title={t.kycD.documents} sub={`${rec.documents.length} ${t.custD.documentsStatus}`} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-2">
              {rec.documents.map((d) => (
                <button key={d.id} onClick={() => setDocView(d.id)} className={`text-left rounded-xl border p-3 transition hover:border-[rgba(13,148,136,0.45)] ${docView === d.id ? 'kpc-card-active' : 'border-[rgba(var(--kpc-ring),0.7)] bg-[var(--kpc-bg-2)]'}`}>
                  <div className="flex items-center justify-between"><FileText className="w-4 h-4 text-[var(--kpc-ink-3)]" /><Chip tone={toneOfRisk(d.status)}>{d.status === 'VERIFIED' ? t.kycCommon.verified : d.status === 'REJECTED' ? t.kycCommon.rejected : d.status === 'PENDING' ? t.kycCommon.pending : chipTxt(d.status, t)}</Chip></div>
                  <p className="text-[0.7rem] font-bold text-[var(--kpc-ink)] mt-2 leading-snug">{d.docType}</p>
                  <p className="text-[0.6rem] kpc-mono text-[var(--kpc-ink-3)] mt-0.5">{d.refMasked}</p>
                </button>
              ))}
            </div>
            {doc && (
              <div className="mt-3 kpc-inset p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]"><p className="text-[0.74rem] font-bold text-[var(--kpc-ink)]">{doc.docType}</p><p className="text-[0.62rem] text-[var(--kpc-ink-3)]">{t.kycD.docMeta}: {doc.category} · {doc.method} {doc.score != null ? ` · ${t.kycD.matchAuto} ${doc.score}%` : ''}</p></div>
                <Chip tone={toneOfRisk(doc.status)}>{doc.status === 'VERIFIED' ? t.kycCommon.verified : doc.status === 'REJECTED' ? t.kycCommon.rejected : doc.status === 'PENDING' ? t.kycCommon.pending : chipTxt(doc.status, t)}</Chip>
                <span className="kpc-chip tone-dim"><Eye className="w-3 h-3" /> Secure viewer (demo frame)</span>
              </div>
            )}
          </Card>

          {/* identity match + results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHead icon={ShieldCheck} title={t.kycD.identityMatch} />
              <div className="mt-1">
                <KeyVal k={t.kycD.matchAuto} v={rec.documents.find((d) => d.status === 'VERIFIED' && d.score) ? `${rec.documents.find((d) => d.score)?.score}%` : '—'} strong />
                <KeyVal k={t.kycD.liveness} v={rec.documents.some((d) => d.category === 'BIOMETRIC' && d.status === 'VERIFIED') ? t.kycCommon.verified : t.kycCommon.pending} />
                <KeyVal k="NIN / CNI" v={rec.ninMasked ? `${t.common.pending === t.common.pending ? 'Present' : ''} · masked` : '—'} mono />
              </div>
            </Card>
            <Card>
              <CardHead icon={Gauge} title={t.kycD.results} />
              <div className="mt-1">
                <KeyVal k={t.kycD.addressCheck} v={<Chip tone={rec.addressStatus === 'VERIFIED' ? 'ok' : 'warn'}>{rec.addressStatus === 'VERIFIED' ? t.kycCommon.verified : t.kycCommon.pending}</Chip>} />
                <KeyVal k={t.common.submitted} v={p.fmtDT(rec.submittedAt)} />
                <KeyVal k={t.common.reviewer} v={rec.reviewerName ?? t.kycD.notStarted} />
              </div>
            </Card>
          </div>
        </div>

        {/* right rail */}
        <div className="space-y-4">
          <Card>
            <CardHead icon={Fingerprint} title={t.kycD.screeningTitle} />
            <div className="mt-1 space-y-1.5">
              <Row2 k={t.kycD.sanctionsCheck} v={<Chip tone={rec.screening.sanctions === 'CLEAN' ? 'ok' : rec.screening.sanctions === 'POTENTIAL_MATCH' ? 'warn' : 'critical'}>{rec.screening.sanctions.replace(/_/g, ' ')}</Chip>} />
              <Row2 k={t.kycD.pepCheck} v={<Chip tone={rec.screening.pep === 'CLEAN' ? 'ok' : 'warn'}>{rec.screening.pep.replace(/_/g, ' ')}</Chip>} />
              {rec.screening.sanctions !== 'CLEAN' && <p className="text-[0.64rem] text-amber-600 dark:text-amber-400 flex gap-1.5 items-start"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Review matches before any decision — see Screening desks.</p>}
            </div>
          </Card>
          <Card>
            <CardHead icon={Gauge} title={t.kycD.riskTitle} />
            <div className="flex items-center gap-4 mt-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-extrabold kpc-num text-[0.95rem] ring-4" style={{ color: scoreColor(rec.riskScore), boxShadow: `0 0 0 4px ${scoreColor(rec.riskScore)}22` }}>{rec.riskScore}</div>
              <div><Chip tone={toneOfRisk(rec.riskLevel)}>{rec.riskLevel}</Chip><p className="text-[0.62rem] text-[var(--kpc-ink-3)] mt-1">{t.common.total} · /100</p></div>
            </div>
          </Card>

          {/* decision panel */}
          <Card className="!border-t-2 !border-t-teal-600/40">
            <CardHead icon={BadgeCheck} title={t.kycD.decision} sub={t.kycD.decisionLogged} />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => setConfirm('APPROVE')} className="kpc-btn kpc-btn-primary !py-2.5"><BadgeCheck className="w-4 h-4" /> {t.kycD.approve}</button>
              <button onClick={() => setConfirm('REJECT')} className="kpc-btn kpc-btn-danger !py-2.5">{t.kycD.reject}</button>
              <button onClick={() => setConfirm('REQUEST_INFO')} className="kpc-btn kpc-btn-outline !py-2.5"><RotateCcw className="w-4 h-4" /> {t.kycD.requestMore}</button>
              <button onClick={() => setConfirm('ESCALATE')} className="kpc-btn kpc-btn-warn !py-2.5"><ArrowUpRight className="w-4 h-4" /> {t.kycD.escalate}</button>
            </div>
            <p className="text-[0.6rem] text-[var(--kpc-ink-3)] mt-3">{t.common.demoNote} — decisions update the demo store + audit log.</p>
          </Card>
        </div>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? confirmTitle[confirm] : ''}
        footer={<>
          <button onClick={() => setConfirm(null)} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button>
          <button disabled={!reason.trim() || busy} onClick={doDecision} className={`kpc-btn ${confirm === 'REJECT' ? 'kpc-btn-danger' : confirm === 'ESCALATE' ? 'kpc-btn-warn' : 'kpc-btn-primary'}`}>{busy ? '…' : t.common.confirm}</button>
        </>}>
        <p className="text-[0.74rem] text-[var(--kpc-ink-2)] mb-3">{confirm ? confirmBody[confirm] : ''}</p>
        <label className="block text-[0.68rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)] mb-1.5" htmlFor="kyc-reason">{t.kycD.decisionReason}</label>
        <textarea id="kyc-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.kycD.decisionReasonPh} className="kpc-input !leading-relaxed resize-none" />
      </Modal>
    </div>
  );
}

function CardHead({ icon: Icon, title, sub }: { icon: React.ComponentType<{ className?: string }>; title: React.ReactNode; sub?: React.ReactNode }) {
  return (<div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center"><Icon className="w-4 h-4" /></span><div><h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{title}</h3>{sub && <p className="text-[0.64rem] text-[var(--kpc-ink-3)]">{sub}</p>}</div></div>);
}
function Row2({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[rgba(var(--kpc-ring),0.3)] last:border-0"><span className="text-[0.7rem] text-[var(--kpc-ink-3)]">{k}</span>{v}</div>;
}
function scoreColor(s: number) { return s >= 80 ? '#e11d48' : s >= 60 ? '#f97316' : s >= 40 ? '#f59e0b' : '#10b981'; }
