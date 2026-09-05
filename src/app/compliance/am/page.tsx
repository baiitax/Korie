'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Download } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Input, Select, useBoot, PageSkel, CkTable, Col, EmptyState, toneOfRisk, Avatar } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Money, Age, chipTxt } from '@/components/compliance/workspaces/helpers';

export default function AmlPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(400);
  const [q, setQ] = useState('');
  const [sev, setSev] = useState('ALL');
  const [stat, setStat] = useState('ALL');

  const aml = useMemo(() => p.alerts.filter((a) => a.kind === 'AML'), [p.alerts]);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return aml
      .filter((x) => (sev === 'ALL' ? true : x.severity === sev))
      .filter((x) => (stat === 'ALL' ? true : x.status === stat))
      .filter((x) => !query || `${x.id} ${x.customerName ?? ''} ${x.title} ${x.ruleCode ?? ''}`.toLowerCase().includes(query))
      .sort((a, b) => (rk(a.severity) - rk(b.severity)) || (a.triggeredAt < b.triggeredAt ? -1 : 1));
  }, [aml, q, sev, stat]);
  const pg = usePaging(filtered, 9);
  const counts = useMemo(() => ({
    high: aml.filter((x) => (x.severity === 'HIGH' || x.severity === 'CRITICAL') && x.status !== 'RESOLVED' && x.status !== 'DISMISSED').length,
    med: aml.filter((x) => x.severity === 'MEDIUM').length,
    open: aml.filter((x) => x.status === 'OPEN' || x.status === 'INVESTIGATING').length,
    closed: aml.filter((x) => x.status === 'RESOLVED' || x.status === 'DISMISSED').length,
  }), [aml]);

  const cols: Col<(typeof filtered)[number]>[] = [
    { key: 'id', header: t.amlP.alertId, render: (x) => <span className="kpc-mono text-[0.7rem] font-extrabold text-[var(--kpc-brand-ink)]">{x.id}</span> },
    { key: 'c', header: t.common.customer, render: (x) => {
      const cid = x.customerId;
      if (!cid) return <span className="text-[var(--kpc-ink-3)]">—</span>;
      return <div className="flex items-center gap-2 min-w-0"><Avatar name={x.customerName ?? '?'} size={26} /><button onClick={(e) => { e.stopPropagation(); router.push(`/compliance/customers/${cid.replace('KP-', '')}`); }} className="block text-[0.74rem] font-bold text-[var(--kpc-ink)] truncate max-w-[140px] hover:text-[var(--kpc-brand-ink)]">{x.customerName}</button></div>;
    } },
    { key: 'sc', header: t.amlP.scenario, render: (x) => <span className="text-[0.64rem] font-semibold text-[var(--kpc-ink-2)] truncate block max-w-[220px]">{x.title}</span> },
    { key: 'am', header: t.common.amount, render: (x) => x.amount ? <Money amount={x.amount} currency={(x.currency ?? 'XOF') as 'XOF' | 'NGN'} fmt={p.fmtMoney} strong /> : <span className="text-[var(--kpc-ink-3)]">—</span> },
    { key: 'rl', header: t.alrtP.severity, render: (x) => <Chip tone={toneOfRisk(x.severity)}>{x.severity}</Chip> },
    { key: 'st', header: t.common.status, render: (x) => <Chip tone={toneOfRisk(x.status)}>{chipTxt(x.status, t)}</Chip> },
    { key: 'ts', header: t.common.timestamp, render: (x) => <Age iso={x.triggeredAt} rel={p.relTime} /> },
  ];

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={ShieldAlert} title={t.amlP.title} sub={t.amlP.subtitle} actions={<button onClick={() => p.pushToast('info', t.common.export, `${filtered.length} rows (demo)`, true)} className="kpc-btn kpc-btn-outline"><Download className="w-4 h-4" /> {t.common.export}</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Mini s={t.amlP.highAlerts} v={counts.high} c="text-rose-600 dark:text-rose-400" />
        <Mini s={t.amlP.medium} v={counts.med} c="text-amber-600 dark:text-amber-400" />
        <Mini s={t.amlP.openWork} v={counts.open} c="text-teal-600 dark:text-teal-400" />
        <Mini s={t.amlP.closed} v={counts.closed} c="text-emerald-600 dark:text-emerald-400" />
      </div>
      <Card flat className="mb-4 p-3">
        <div className="flex flex-col xl:flex-row gap-2.5">
          <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder={`${t.amlP.title} — ${t.common.search}`} className="!text-[0.78rem]" wrapClass="flex-1 min-w-[220px]" aria-label={t.common.search} />
          <Select value={sev} onChange={(e) => { setSev(e.target.value); pg.reset(); }} aria-label={t.alrtP.severity}>
            <option value="ALL">{t.common.filter} — {t.alrtP.severity}</option>
            {['CRITICAL', 'HIGH', 'MEDIUM'].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          <Select value={stat} onChange={(e) => { setStat(e.target.value); pg.reset(); }} aria-label={t.common.status}>
            <option value="ALL">{t.common.filter} — {t.common.status}</option>
            {['OPEN', 'INVESTIGATING', 'ESCALATED', 'REVIEWED', 'DISMISSED', 'CLOSED'].map((v) => <option key={v} value={v}>{chipTxt(v, t)}</option>)}
          </Select>
        </div>
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.amlP.title} cols={cols} rows={pg.slice} rowKey={(x) => x.id} onRow={(x) => router.push(`/compliance/am/${x.id.replace('AML-', '')}`)} dense />
        {!pg.slice.length && <EmptyState title={t.amlP.emptyQueue} />}
        <Paginator {...pg} total={filtered.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
function rk(r: string) { return r === 'CRITICAL' ? 0 : r === 'HIGH' ? 1 : 2; }
function Mini({ s, v, c }: { s: string; v: React.ReactNode; c: string }) {
  return <div className="kpc-card kpc-card-flat p-3.5"><p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)]">{s}</p><p className={`kpc-num text-[1.3rem] font-extrabold mt-1 ${c}`}>{v}</p></div>;
}
