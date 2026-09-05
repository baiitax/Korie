'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gauge, AlertOctagon, MapPin, Smartphone, UserCog, ChevronRight } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, SectionHeader, PageHead, Chip, CkTable, Col, Seg, Input, Select, useBoot, PageSkel, EmptyState, Avatar, StatusDot, toneOfRisk } from '@/components/compliance/ui/Ck';
import { Donut, HBarRows, Legend, TONE_HEX } from '@/components/compliance/ui/charts';
import { Paginator, usePaging } from '@/components/compliance/workspaces/helpers';

export default function RiskPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(450);
  const [seg, setSeg] = useState<'ALL' | 'HIGH' | 'CRITICAL'>('ALL');
  const [q, setQ] = useState('');

  const highRisk = useMemo(() => {
    const query = q.trim().toLowerCase();
    return p.customers
      .filter((c) => (c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL'))
      .filter((c) => (seg === 'ALL' ? true : c.riskLevel === seg))
      .filter((c) => !query || `${c.firstName} ${c.lastName} ${c.id}`.toLowerCase().includes(query));
  }, [p.customers, seg, q]);
  const pg = usePaging(highRisk, 8);

  const fraudAlerts = p.alerts.filter((a) => a.kind === 'FRAUD' || a.kind === 'RISK');
  const dist = p.totals.riskDistribution.map((r) => ({ label: r.level, value: r.count, color: TONE_HEX[r.level.toLowerCase()] }));
  const geoAnomalies = fraudAlerts.filter((a) => a.title.toLowerCase().includes('geo') || a.title.toLowerCase().includes('velocity'));
  const deviceRisk = fraudAlerts.filter((a) => a.title.toLowerCase().includes('device'));

  const cols: Col<(typeof highRisk)[number]>[] = [
    { key: 'name', header: t.common.customer, render: (c) => (
      <div className="flex items-center gap-2.5"><Avatar name={c.firstName} size={28} /><div className="min-w-0">
        <button onClick={() => router.push(`/compliance/customers/${c.id.replace('KP-', '')}`)} className="block text-[0.76rem] font-bold text-[var(--kpc-ink)] truncate hover:text-[var(--kpc-brand-ink)] max-w-[170px]">{c.firstName} {c.lastName}</button>
        <span className="block text-[0.62rem] kpc-mono text-[var(--kpc-ink-3)]">{c.id}</span></div></div> ) },
    { key: 'risk', header: t.common.risk, sortVal: (r) => r.riskScore, render: (c) => <Chip tone={c.riskLevel === 'CRITICAL' ? 'critical' : 'high'}>{c.riskLevel} · {c.riskScore}</Chip> },
    { key: 'flags', header: t.common.alerts, render: (c) => <Chip tone={c.sanctionsMatches + c.pepMatches ? 'critical' : 'warn'}>{c.openAlerts} open{c.sanctionsMatches + c.pepMatches ? ` · ${c.sanctionsMatches + c.pepMatches} match` : ''}</Chip> },
    { key: 'acct', header: t.custD.accountStatusLabel, render: (c) => <Chip tone={toneOfRisk(c.accountStatus)}>{c.accountStatus}</Chip> },
    { key: 'ver', header: t.common.verification, render: (c) => <Chip tone={toneOfRisk(c.verificationStatus)}>{c.verificationStatus === 'VERIFIED' ? t.kycCommon.verified : c.verificationStatus}</Chip> },
    { key: 'go', header: '', render: (c) => <span className="text-[var(--kpc-ink-3)] inline-flex"><ChevronRight className="w-4 h-4" /></span> },
  ];

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={Gauge} title={t.riskP.title} sub={t.riskP.subtitle} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <SectionHeader title={t.dash.riskDistTitle} />
          <Donut segs={dist} size={160} thickness={18} centerSub="customers" />
          <div className="mt-4"><HBarRows rows={p.totals.riskDistribution.map((r) => ({ label: t.riskLevels[r.level.toLowerCase() as 'low' | 'medium' | 'high' | 'critical'], value: r.count, count: r.count.toLocaleString(), pct: Math.round((r.count / p.totals.totalCustomers) * 1000) / 10, color: TONE_HEX[r.level.toLowerCase()] }))} /></div>
        </Card>
        <Card>
          <SectionHeader title={t.riskP.fraudAlerts} sub={t.dash.attnSub} />
          <div className="space-y-1.5">
            {fraudAlerts.map((a) => (
              <Link key={a.id} href={`/compliance/alerts/${a.id}`} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 border border-transparent hover:border-[rgba(13,148,136,0.3)] hover:bg-[rgba(13,148,136,0.05)]">
                <AlertOctagon className={`w-4 h-4 shrink-0 ${a.severity === 'CRITICAL' ? 'text-rose-500' : 'text-orange-500'}`} />
                <div className="min-w-0 flex-1"><p className="text-[0.72rem] font-bold text-[var(--kpc-ink)] truncate">{a.title}</p><p className="text-[0.62rem] text-[var(--kpc-ink-3)] truncate">{a.customerName}</p></div>
                <Chip tone={toneOfRisk(a.severity)}>{a.severity}</Chip>
              </Link>
            ))}
            {!fraudAlerts.length && <EmptyState title={t.dash.attnEmpty} />}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-4"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center"><MapPin className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /></span><div><p className="text-[0.78rem] font-extrabold text-[var(--kpc-ink)]">{t.riskP.geoAnomalies}</p><p className="text-[1.4rem] font-extrabold kpc-num text-[var(--kpc-ink)]">{geoAnomalies.length}</p></div></div>
            <div className="mt-2 space-y-1">{geoAnomalies.map((a) => <Link key={a.id} href={`/compliance/alerts/${a.id}`} className="flex items-center gap-2 text-[0.68rem] font-semibold text-[var(--kpc-ink-2)] hover:text-[var(--kpc-brand-ink)]"><StatusDot tone={toneOfRisk(a.severity) as never} /><span className="truncate">{a.title}</span></Link>)}</div></Card>
          <Card className="p-4"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center"><Smartphone className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /></span><div><p className="text-[0.78rem] font-extrabold text-[var(--kpc-ink)]">{t.riskP.deviceRisk}</p><p className="text-[1.4rem] font-extrabold kpc-num text-[var(--kpc-ink)]">{deviceRisk.length}</p></div></div>
            <div className="mt-2 space-y-1">{deviceRisk.map((a) => <Link key={a.id} href={`/compliance/alerts/${a.id}`} className="flex items-center gap-2 text-[0.68rem] font-semibold text-[var(--kpc-ink-2)] hover:text-[var(--kpc-brand-ink)]"><StatusDot tone={toneOfRisk(a.severity) as never} /><span className="truncate">{a.title}</span></Link>)}</div></Card>
        </div>
      </div>
      <Card flat className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-[var(--kpc-line)]">
          <SectionHeader title={t.riskP.highRiskList} actions={<Seg options={[{ value: 'ALL', label: t.common.all }, { value: 'HIGH', label: t.common.highRisk }, { value: 'CRITICAL', label: t.common.criticalRisk }]} value={seg} onChange={(v) => { setSeg(v as typeof seg); pg.reset(); }} />} />
        </div>
        <CkTable aria-label={t.riskP.highRiskList} cols={cols} rows={pg.slice} rowKey={(r) => r.id} onRow={(c) => router.push(`/compliance/customers/${c.id.replace('KP-', '')}`)} dense />
        <Paginator {...pg} total={highRisk.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
