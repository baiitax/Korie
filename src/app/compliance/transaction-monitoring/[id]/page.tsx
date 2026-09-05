'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Radio, ArrowDownLeft, ArrowUpRight, Gauge, ShieldAlert, History } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, KeyVal, PageHead, EmptyState, toneOfRisk, StatusDot } from '@/components/compliance/ui/Ck';
import { Money, chipTxt } from '@/components/compliance/workspaces/helpers';

export default function TxnDetailPage() {
  const params = useParams();
  const p = useCompliancePortal();
  const { t } = p;
  const id = String(params?.id ?? '');
  const x = p.txnById(`TXN-${id}`);
  if (!x) return <Card className="mt-3"><EmptyState title="Transaction not found" body={`No transaction TXN-${id} in the sample set.`} action={<Link href="/compliance/transaction-monitoring" className="kpc-btn kpc-btn-primary">{t.txnP.title}</Link>} /></Card>;

  const nodeLabel = x.node === 'CORIS_BANK_NE' ? 'Coris Bank · Niger Republic 🇳🇪' : x.node === 'PROVIDUS_BANK_NG' ? 'Providus Bank · Nigeria 🇳🇬' : 'KoriePay rails (cross-border)';
  const related = x.relatedTxnIds?.map((rid) => p.txnById(rid)).filter(Boolean) ?? [];
  const customerTxns = p.customerTxns(x.customerId).filter((y) => y.id !== x.id).slice(0, 4);

  return (
    <div>
      <PageHead icon={Radio} title={<span className="flex items-center gap-2 flex-wrap">{t.txnD.title}<span className="kpc-mono text-[0.8rem] font-extrabold text-[var(--kpc-brand-ink)]">{x.id}</span></span>}
        sub={t.txnD.overview + ' · ' + nodeLabel}
        actions={<>
          <Link href="/compliance/transaction-monitoring" className="kpc-btn kpc-btn-ghost">{t.common.back}</Link>
          {x.customerId && <Link href={`/compliance/customers/${x.customerId.replace('KP-', '')}`} className="kpc-btn kpc-btn-outline">{t.common.customer}</Link>}
        </>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <Chip tone={toneOfRisk(x.decision)}>{x.decision}</Chip>
        <Chip tone={toneOfRisk(x.status)}>{chipTxt(x.status, t)}</Chip>
        <Chip tone={toneOfRisk(x.riskLevel)}>{x.riskScore}/100 {x.riskLevel}</Chip>
        <Chip tone={x.currency === 'XOF' ? 'brand' : 'info'}>{x.currency}</Chip>
        <Chip tone="dim">{x.channel.replace(/_/g, ' ')}</Chip>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.txnD.overview}</h3>
          <KeyVal k={t.txnD.sender} v={x.customerName} strong />
          <KeyVal k={t.txnD.recipient} v={x.counterpartyMasked} />
          <KeyVal k={t.common.amount} v={<span className="text-[1.05rem]"><Money amount={x.amount} currency={x.currency} fmt={p.fmtMoney} /></span>} strong />
          <KeyVal k={t.common.currency} v={x.currency === 'XOF' ? `${t.common.xof} (CFA)` : t.common.ngn} />
          <KeyVal k={t.common.channel} v={x.channel.replace(/_/g, ' ')} />
          <KeyVal k={t.txnP.node} v={nodeLabel} />
          <KeyVal k={t.common.timestamp} v={p.fmtDT(x.timestamp)} mono />
          <KeyVal k={t.common.status} v={<Chip tone={toneOfRisk(x.status)}>{chipTxt(x.status, t)}</Chip>} />
          {x.narration && <KeyVal k={t.common.summary} v={x.narration} />}
        </Card>
        <Card>
          <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] flex items-center gap-2 mb-2"><Gauge className="w-4 h-4 text-[var(--kpc-brand-ink)]" /> {t.txnD.riskAnalysis}</h3>
          <div className="flex items-center gap-4 mb-3">
            <span className="kpc-num text-[1.6rem] font-extrabold" style={{ color: x.riskScore >= 80 ? '#e11d48' : x.riskScore >= 60 ? '#f97316' : x.riskScore >= 40 ? '#f59e0b' : '#10b981' }}>{x.riskScore}</span>
            <div className="flex-1 h-2 rounded-full bg-[rgba(var(--kpc-ring),0.4)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${x.riskScore}%`, background: x.riskScore >= 80 ? '#e11d48' : x.riskScore >= 60 ? '#f97316' : x.riskScore >= 40 ? '#f59e0b' : '#10b981' }} /></div>
          </div>
          <h4 className="text-[0.68rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)] mb-1.5">{t.txnD.rulesTriggered}</h4>
          <div className="space-y-1.5">
            {x.rulesTriggered.map((r) => (
              <div key={r.code} className="flex items-start gap-2.5 rounded-lg border border-[rgba(var(--kpc-ring),0.6)] px-3 py-2">
                <ShieldAlert className={`w-4 h-4 mt-0.5 shrink-0 ${r.severity === 'CRITICAL' ? 'text-rose-500' : r.severity === 'HIGH' ? 'text-orange-500' : 'text-amber-500'}`} />
                <div className="flex-1 min-w-0"><p className="text-[0.72rem] font-bold text-[var(--kpc-ink)]">{r.code} — {r.name === r.code ? r.description : r.name}</p><p className="text-[0.64rem] text-[var(--kpc-ink-3)]">{r.description}</p></div>
                <Chip tone={toneOfRisk(r.severity)}>{r.severity}</Chip>
              </div>
            ))}
            {!x.rulesTriggered.length && <p className="text-[0.7rem] text-[var(--kpc-ink-3)]">{t.txnD.noRules}</p>}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-2">{t.txnD.history}</h3>
            {customerTxns.map((y) => (
              <Link key={y.id} href={`/compliance/transaction-monitoring/${y.id.replace('TXN-', '')}`} className="flex items-center gap-2.5 py-2 border-b border-[rgba(var(--kpc-ring),0.3)] last:border-0">
                {y.direction === 'IN' ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <ArrowUpRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                <span className="kpc-mono text-[0.66rem] font-bold text-[var(--kpc-brand-ink)] flex-1">{y.id}</span>
                <Money amount={y.amount} currency={y.currency} fmt={p.fmtMoney} />
                <span className="text-[0.62rem] text-[var(--kpc-ink-3)]">{p.relTime(y.timestamp)}</span>
              </Link>
            ))}
            {!customerTxns.length && <EmptyState title={t.txnD.noRelated} />}
          </Card>
          <Card>
            <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] flex items-center gap-2 mb-2"><History className="w-4 h-4 text-[var(--kpc-brand-ink)]" /> {t.txnD.auditTrail}</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold text-[var(--kpc-ink-2)]"><StatusDot tone={x.decision === 'PASS' ? 'ok' : 'high'} /> {t.audP.actionCol}: <span className="kpc-mono">{x.decision === 'PASS' ? 'ENGINE_PASS' : 'ENGINE_' + x.decision}</span></div>
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold text-[var(--kpc-ink-2)]"><StatusDot tone="ok" /> {t.audP.resourceCol}: {x.id}</div>
            </div>
            <p className="text-[0.62rem] text-[var(--kpc-ink-3)] mt-2">{t.common.demoNote}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
