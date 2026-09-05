'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Download } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Input, Select, Tabs, useBoot, PageSkel, CkTable, Col, Avatar, EmptyState, toneOfRisk } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age, chipTxt } from '@/components/compliance/workspaces/helpers';

const TABS = ['ALL', 'OPEN', 'INVESTIGATING', 'ESCALATED', 'RESOLVED', 'DISMISSED'] as const;
export default function AlertsPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(400);
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const [sev, setSev] = useState('ALL');
  const [kind, setKind] = useState('ALL');
  const [q, setQ] = useState('');
  const [criticalFirst, setCriticalFirst] = useState(true);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return p.alerts
      .filter((a) => (tab === 'ALL' ? true : a.status === tab))
      .filter((a) => (sev === 'ALL' ? true : a.severity === sev))
      .filter((a) => (kind === 'ALL' ? true : a.kind === kind))
      .filter((a) => !query || `${a.id} ${a.title} ${a.customerName ?? ''}`.toLowerCase().includes(query))
      .sort((a, b) => (criticalFirst ? sevRank(a.severity) - sevRank(b.severity) || (a.triggeredAt < b.triggeredAt ? -1 : 1) : a.triggeredAt < b.triggeredAt ? 1 : -1));
  }, [p.alerts, tab, sev, kind, q, criticalFirst]);
  const pg = usePaging(filtered, 10);
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: p.alerts.filter((a) => a.status !== 'RESOLVED' && a.status !== 'DISMISSED').length };
    TABS.filter((x) => x !== 'ALL').forEach((s) => (c[s] = p.alerts.filter((a) => a.status === s).length));
    return c;
  }, [p.alerts]);

  const cols: Col<(typeof filtered)[number]>[] = [
    { key: 'sev', header: t.alrtP.severity, render: (a) => <Chip tone={toneOfRisk(a.severity)}>{a.severity}</Chip> },
    { key: 'title', header: t.alrtP.customerName, render: (a) => (
      <div className="min-w-0 max-w-[300px]"><button onClick={() => router.push(`/compliance/alerts/${a.id}`)} className="block text-[0.74rem] font-bold text-[var(--kpc-ink)] truncate hover:text-[var(--kpc-brand-ink)] w-full text-left">{a.title}</button><span className="block text-[0.62rem] kpc-mono text-[var(--kpc-ink-3)]">{a.id}</span></div> ) },
    { key: 'c', header: t.common.customer, render: (a) => a.customerName ? (
      <button onClick={(e) => { e.stopPropagation(); a.customerId && router.push(`/compliance/customers/${a.customerId.replace('KP-', '')}`); }} className="text-[0.7rem] font-bold text-[var(--kpc-ink-2)] hover:text-[var(--kpc-brand-ink)] truncate max-w-[140px] block">{a.customerName}</button>) : <span className="text-[var(--kpc-ink-3)]">—</span> },
    { key: 'kind', header: t.alrtP.kind, render: (a) => <Chip tone="dim">{a.kind}</Chip> },
    { key: 'am', header: t.common.amount, render: (a) => a.amount ? <span className="kpc-mono text-[0.7rem] font-bold text-[var(--kpc-ink)]">{p.fmtMoney(a.amount, a.currency ?? 'XOF')}</span> : <span className="text-[var(--kpc-ink-3)]">—</span> },
    { key: 'rule', header: t.common.rule, render: (a) => a.ruleCode ? <span className="kpc-mono text-[0.64rem] font-bold text-[var(--kpc-ink-3)]">{a.ruleCode}</span> : <span className="text-[var(--kpc-ink-3)]">—</span> },
    { key: 'st', header: t.common.status, render: (a) => <Chip tone={toneOfRisk(a.status)}>{chipTxt(a.status, t)}</Chip> },
    { key: 'by', header: t.audP.officerCol, render: (a) => <span className="text-[0.66rem] font-semibold text-[var(--kpc-ink-3)]">{a.assignedTo ?? 'Unassigned'}</span> },
    { key: 'ts', header: t.alrtP.age, sortVal: (r) => r.triggeredAt, render: (a) => <Age iso={a.triggeredAt} rel={p.relTime} /> },
  ];

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={Bell} title={t.alrtP.title} sub={t.alrtP.subtitle} actions={<button onClick={() => p.pushToast('info', t.common.export, `${filtered.length} rows (demo)`, true)} className="kpc-btn kpc-btn-outline"><Download className="w-4 h-4" /> {t.common.export}</button>} />
      <Card flat className="mb-4 p-0 overflow-hidden">
        <Tabs items={TABS.map((s) => ({ value: s, label: t.alrtP[s.toLowerCase() as 'all' | 'open' | 'investigating' | 'escalated' | 'resolved' | 'dismissed'], count: counts[s] }))} value={tab} onChange={(v) => { setTab(v as typeof tab); pg.reset(); }} className="px-3 pt-2" />
        <div className="flex flex-col xl:flex-row gap-2.5 p-3 border-t border-[var(--kpc-line)] items-start xl:items-center">
          <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder={`${t.alrtP.title} — ${t.common.search}`} className="!text-[0.78rem]" wrapClass="flex-1 min-w-[220px]" aria-label={t.common.search} />
          <Select value={sev} onChange={(e) => { setSev(e.target.value); pg.reset(); }} aria-label={t.alrtP.severity}>
            <option value="ALL">{t.common.filter} — {t.alrtP.severity}</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          <Select value={kind} onChange={(e) => { setKind(e.target.value); pg.reset(); }} aria-label={t.alrtP.kind}>
            <option value="ALL">{t.common.filter} — {t.alrtP.kind}</option>
            {['AML', 'SCREENING', 'FRAUD', 'RISK'].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-[0.7rem] font-bold text-[var(--kpc-ink-2)] cursor-pointer select-none"><input type="checkbox" checked={criticalFirst} onChange={(e) => setCriticalFirst(e.target.checked)} className="accent-teal-600 w-3.5 h-3.5" /> {t.alrtP.criticalFirst}</label>
        </div>
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.alrtP.title} cols={cols} rows={pg.slice} rowKey={(a) => a.id} onRow={(a) => router.push(`/compliance/alerts/${a.id}`)} dense />
        {!pg.slice.length && <EmptyState title={t.alrtP.queueEmpty} action={<button onClick={() => { setTab('ALL'); setSev('ALL'); setKind('ALL'); setQ(''); }} className="kpc-btn kpc-btn-outline kpc-btn-sm">{t.common.clear}</button>} />}
        <Paginator {...pg} total={filtered.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
function sevRank(s: string) { return s === 'CRITICAL' ? 0 : s === 'HIGH' ? 1 : s === 'MEDIUM' ? 2 : 3; }
