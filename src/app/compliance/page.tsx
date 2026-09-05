'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, UserCheck, ShieldAlert, FolderSearch, Fingerprint, ArrowRight, Clock3, AlertOctagon,
  FileSearch, CheckSquare, Activity, Lock, Building2, FileBarChart2, Radio, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import {
  Card, SectionHeader, Kpi, Chip, Avatar, ViewAll, PageHead, useBoot, PageSkel,
  toneOfRisk, TONE_CLASS, StatusDot,
} from '@/components/compliance/ui/Ck';
import { Bars, Donut, HBarRows, Legend, Sparkline, TONE_HEX, useThemeColors } from '@/components/compliance/ui/charts';
import { useNowTick } from '@/components/compliance/workspaces/helpers';

export default function ComplianceDashboardPage() {
  const p = useCompliancePortal();
  const { t, stats, totals } = p;
  const { ready } = useBoot(500);
  const hex = useThemeColors();
  useNowTick(60_000);

  const [kycRange, setKycRange] = useState('30D');
  const rangeMul: Record<string, number> = { '7D': 0.23, '30D': 1, '90D': 2.7, '12M': 9.6 };
  const mul = rangeMul[kycRange];

  const riskRows = useMemo(() => {
    const total = totals.riskDistribution.reduce((a, b) => a + b.count, 0);
    const map: Record<string, keyof typeof TONE_HEX> = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' };
    return totals.riskDistribution.map((r) => {
      const level = t.riskLevels[r.level.toLowerCase() as 'low' | 'medium' | 'high' | 'critical'];
      return {
        label: <span className="inline-flex items-center gap-2">{level} {r.level === 'HIGH' || r.level === 'CRITICAL' ? <Chip tone={map[r.level] === 'critical' ? 'critical' : 'high'}>{r.count}</Chip> : null}</span>,
        value: r.count,
        count: r.count.toLocaleString(),
        pct: Math.round((r.count / total) * 1000) / 10,
        color: TONE_HEX[map[r.level]],
      };
    });
  }, [totals, t]);

  const kycData = [
    { label: t.dash.kycSubmitted, value: Math.round(totals.kycVolume.submitted * mul), color: '#0ea5e9' },
    { label: t.dash.kycApproved, value: Math.round(totals.kycVolume.verified * mul), color: TONE_HEX.ok },
    { label: t.dash.kycManual, value: Math.round(totals.kycVolume.manualReview * mul), color: TONE_HEX.warn },
    { label: t.dash.kycRejected, value: Math.round(totals.kycVolume.rejected * mul), color: TONE_HEX.critical },
    { label: t.dash.kycExpired, value: Math.round(totals.kycVolume.expired * mul), color: '#94a3b8' },
  ];

  const openAlerts = p.alerts.filter((a) => a.status !== 'RESOLVED' && a.status !== 'DISMISSED');
  const alertsBySev = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => ({
    label: t.alrtP.severity + ' ' + s.charAt(0) + s.slice(1).toLowerCase(),
    value: openAlerts.filter((a) => a.severity === s).length,
    color: TONE_HEX[s.toLowerCase()],
  })).filter((x) => x.value > 0);

  const txDays = useMemo(() => {
    const names: string[] = [];
    for (let i = 6; i >= 0; i--) names.push(new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(Date.now() - i * 864e5)));
    const base = [14280, 14820, 14640, 15110, 14990, 15320, 14820];
    const flag = [9, 12, 8, 14, 11, 13, 10];
    return { names, base, flag };
  }, []);

  const attn = useMemo(() => {
    const rows: { id: string; tone: 'critical' | 'high' | 'medium' | 'low' | 'ok'; text: string; sub: string; href: string; badge?: string }[] = [];
    p.kyc.filter((k) => k.status === 'PENDING' || k.status === 'IN_REVIEW').slice(0, 2).forEach((k) =>
      rows.push({ id: 'k' + k.id, tone: 'medium', text: `${k.customerName} — ${k.tier.replace('_', ' ')}`, sub: k.status === 'IN_REVIEW' ? t.kycP.tabsManual : t.common.pending, href: `/compliance/kyc/${k.id.replace('KYC-', '')}`, badge: t.common.requiresAttention }));
    p.alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').slice(0, 2).forEach((a) =>
      rows.push({ id: a.id, tone: 'critical', text: a.title, sub: `${a.customerName ?? ''} · ${a.id}`, href: `/compliance/alerts/${a.id}` }));
    p.matches.filter((m) => m.status === 'POTENTIAL_MATCH' || m.status === 'UNDER_REVIEW').slice(0, 2).forEach((m) =>
      rows.push({ id: m.id, tone: 'high', text: `${m.listName} — ${m.customerName}`, sub: `${m.score}% · ${m.kind}`, href: `/compliance/sanctions/${m.id}` }));
    p.cases.filter((c) => c.status !== 'RESOLVED' && new Date(c.deadlineSla).getTime() - Date.now() < 36 * 3600_000).slice(0, 2).forEach((c) =>
      rows.push({ id: c.id, tone: 'high', text: `${c.caseNumber} · ${c.title}`, sub: `${c.customerName ?? ''} · SLA ${p.relTime(c.deadlineSla)}`, href: `/compliance/cases/${c.caseNumber}` }));
    p.approvals.filter((a) => a.status === 'PENDING').slice(0, 2).forEach((a) =>
      rows.push({ id: a.id, tone: 'medium', text: `${a.title}`, sub: `${a.type.replace(/_/g, ' ')} · ${a.requestedByName}`, href: '/compliance/approvals' }));
    p.escalations.filter((e) => e.status === 'OPEN' || e.status === 'ACKNOWLEDGED').slice(0, 2).forEach((e) =>
      rows.push({ id: e.id, tone: 'high', text: `${e.title}`, sub: `${e.level} · ${e.raisedByName}`, href: '/compliance/escalations' }));
    return rows.slice(0, 8);
  }, [p]);

  if (!ready) return <PageSkel />;

  return (
    <div className="space-y-5">
      <PageHead
        icon={Sparkles}
        title={t.dash.title}
        sub={t.dash.subtitle}
        actions={
          <>
            <Link href="/compliance/kyc" className="kpc-btn kpc-btn-primary"><UserCheck className="w-4 h-4" /> {t.dash.viewKyc}</Link>
            <Link href="/compliance/alerts" className="kpc-btn kpc-btn-dark"><AlertOctagon className="w-4 h-4" /> {t.dash.viewAlerts}</Link>
            <Link href="/compliance/cases" className="kpc-btn kpc-btn-outline"><FileSearch className="w-4 h-4" /> {t.dash.viewCases}</Link>
          </>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label={t.dash.kpiCustomers} value={totals.totalCustomers.toLocaleString()} icon={Users} tone="brand" delta="+3.8%" sub={t.dash.kpiCustomersSub} to="/compliance/customers" />
        <Kpi label={t.dash.kpiKyc} value={stats.kycOpen} icon={UserCheck} tone="warn" sub={t.dash.requiresAttention} to="/compliance/kyc" />
        <Kpi label={t.dash.kpiRisk} value={totals.highRiskCustomers} icon={Activity} tone="high" sub={t.dash.reviewRequired} to="/compliance/risk" />
        <Kpi label={t.dash.kpiAlerts} value={totals.openAmlAlerts} icon={ShieldAlert} tone="critical" sub={`${totals.criticalAmlAlerts} ${t.dash.critical}`} to="/compliance/alerts" />
        <Kpi label={t.dash.kpiCases} value={totals.openCases} icon={FolderSearch} tone="high" sub={`${totals.escalatedCases} ${t.dash.escalated}`} to="/compliance/cases" />
        <Kpi label={t.dash.kpiMatches} value={totals.screeningMatches} icon={Fingerprint} tone="warn" sub={`${totals.screeningRequireReview} ${t.dash.requireReview}`} to="/compliance/sanctions" />
      </div>

      {/* risk / kyc / aml */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <SectionHeader title={t.dash.riskDistTitle} actions={<ViewAll href="/compliance/risk" />} />
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Donut
              segs={totals.riskDistribution.map((r) => ({ label: r.level, value: r.count, color: TONE_HEX[r.level.toLowerCase()] }))}
              centerSub={t.dash.kpiCustomers}
            />
            <div className="flex-1 w-full min-w-0">
              <HBarRows rows={riskRows} />
            </div>
          </div>
          <div className="mt-3"><Legend items={totals.riskDistribution.map((r) => ({ label: t.riskLevels[r.level.toLowerCase() as 'low' | 'medium' | 'high' | 'critical'], color: TONE_HEX[r.level.toLowerCase()], count: r.count.toLocaleString() }))} /></div>
        </Card>

        <Card>
          <SectionHeader title={t.dash.kycTitle} actions={
            <div className="flex items-center gap-1 text-[0.68rem] font-bold text-[var(--kpc-ink-3)]">
              {Object.keys(rangeMul).map((k) => (
                <button key={k} onClick={() => setKycRange(k)} className={kx(k, kycRange)}>{k}</button>
              ))}
            </div>
          } />
          <Bars data={kycData} height={120} ariaLabel={t.dash.kycTitle} />
          <div className="mt-2"><Legend items={kycData.map((d) => ({ label: d.label, color: d.color, count: d.value.toLocaleString() }))} /></div>
        </Card>

        <Card>
          <SectionHeader title={t.dash.amlTitle} actions={<ViewAll href="/compliance/aml" />} />
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {[
              { l: t.dash.amlGenerated, v: stats.alertsOpen, c: TONE_HEX.warn },
              { l: t.dash.amlResolved, v: p.alerts.filter((a) => a.status === 'RESOLVED').length, c: TONE_HEX.ok },
              { l: t.dash.amlEscalations, v: stats.alertsEscalated, c: TONE_HEX.critical },
              { l: t.dash.amlSuspiciousTrend, v: '↗', c: TONE_HEX.brand },
            ].map((s, i) => (
              <div key={i} className="kpc-inset px-3 py-2.5">
                <p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)] truncate">{s.l}</p>
                <p className="kpc-num text-[1.15rem] font-extrabold text-[var(--kpc-ink)] mt-0.5" style={{ color: s.c }}>{typeof s.v === 'number' ? s.v : s.v}</p>
              </div>
            ))}
          </div>
          <div className="kpc-inset p-3">
            <p className="text-[0.64rem] font-bold uppercase tracking-wider text-[var(--kpc-ink-3)] mb-1.5">{t.dash.amlEscalations} · 7d</p>
            <Sparkline values={[3, 5, 4, 7, 6, 9, 8]} color={TONE_HEX.critical} width={260} height={44} className="w-full" fill />
          </div>
        </Card>
      </div>

      {/* transaction monitoring + attention */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3">
          <SectionHeader title={t.dash.txnTitle} sub={`${t.dash.txnMonitored}: ${(totals.monitoredToday / 1000).toFixed(1)}k / 24h`} actions={<ViewAll href="/compliance/transaction-monitoring" label={t.common.viewAll} />} />
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="w-full max-w-[420px]">
              <Bars data={txDays.base.map((v, i) => ({ label: txDays.names[i], value: v }))} height={130} ariaLabel={t.dash.txnMonitored} />
              <div className="flex items-center justify-between mt-1">
                <Legend items={[{ label: t.dash.txnMonitored, color: TONE_HEX.brand }]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 w-full max-w-[260px]">
              <div className="kpc-inset px-3 py-2.5"><p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)]">{t.dash.txnFlagged}</p><p className="kpc-num text-[1.1rem] font-extrabold text-orange-600 dark:text-orange-400 mt-0.5">{txDays.flag[6]}</p></div>
              <div className="kpc-inset px-3 py-2.5"><p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)]">{t.dash.txnCleared}</p><p className="kpc-num text-[1.1rem] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{(txDays.base[6] - txDays.flag[6]).toLocaleString()}</p></div>
              <div className="col-span-2 kpc-inset px-3 py-2.5"><p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)]">{t.dash.txnSuspicious}</p><div className="mt-1"><Sparkline values={txDays.flag} color={TONE_HEX.critical} width={220} height={30} className="w-full" fill /></div></div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <SectionHeader title={t.dash.attnTitle} sub={t.dash.attnSub} />
          <div className="space-y-1.5">
            {attn.map((r) => (
              <Link key={r.id} href={r.href} className="flex items-center gap-3 rounded-xl border border-transparent hover:border-[rgba(13,148,136,0.35)] hover:bg-[rgba(13,148,136,0.05)] px-3 py-2.5 transition group">
                <span className={cxTone(r.tone)}><span className="w-2 h-2 rounded-full" style={{ background: TONE_HEX[r.tone] }} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.76rem] font-bold text-[var(--kpc-ink)] truncate">{r.text}</p>
                  <p className="text-[0.64rem] text-[var(--kpc-ink-3)] truncate">{r.sub}</p>
                </div>
                {r.badge && <Chip tone="warn" className="hidden sm:inline-flex">{r.badge}</Chip>}
                <ArrowRight className="w-3.5 h-3.5 text-[var(--kpc-ink-3)] group-hover:text-[var(--kpc-brand-ink)] shrink-0" />
              </Link>
            ))}
            {!attn.length && <p className="text-[0.72rem] text-[var(--kpc-ink-3)] py-6 text-center">{t.dash.attnEmpty}</p>}
          </div>
        </Card>
      </div>

      {/* activity + health */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <SectionHeader title={t.dash.recentTitle} sub={t.dash.recentSub} actions={<ViewAll href="/compliance/activity" />} />
          <div className="relative pl-5 space-y-0">
            {p.activity.slice(0, 7).map((a, i, arr) => (
              <div key={a.id} className="relative pb-3.5">
                {i < arr.length - 1 && <span className="absolute left-[-15px] top-4 bottom-0 w-px bg-[rgba(var(--kpc-ring),0.55)]" aria-hidden />}
                <div className="flex items-start gap-3 relative">
                  <span className={cxTone2(a.tone)}>{ACT_ICONS[a.type]}</span>
                  <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[0.76rem] font-bold text-[var(--kpc-ink)]">{a.headline}</span>
                    {a.href ? <Link href={a.href} className="text-[0.66rem] kpc-link truncate max-w-full">{a.sub}</Link> : <span className="text-[0.66rem] text-[var(--kpc-ink-3)] truncate">{a.sub}</span>}
                  </div>
                  <span className="kpc-mono text-[0.64rem] text-[var(--kpc-ink-3)] shrink-0">{p.fmtDT(a.at)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title={t.dash.healthTitle} sub={t.dash.healthSub} actions={<ViewAll href="/compliance/system-health" />} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {p.health.slice(0, 6).map((h) => (
              <div key={h.id} className="kpc-inset px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[0.72rem] font-bold text-[var(--kpc-ink)] truncate">{h.name}</p>
                  <p className="text-[0.6rem] text-[var(--kpc-ink-3)] uppercase tracking-wide font-bold">{h.category}</p>
                </div>
                <Chip tone={toneOfRisk(h.status)}>{h.status === 'OPERATIONAL' ? t.common.operational : h.status === 'DEGRADED' ? t.common.degraded : h.status === 'UNAVAILABLE' ? t.common.unavailable : t.common.unknown}</Chip>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function kx(k: string, cur: string) {
  return `px-1.5 py-0.5 rounded-md transition ${k === cur ? 'bg-teal-600 text-white' : 'hover:text-[var(--kpc-ink)]'}`;
}
function cxTone(tone: string) {
  return `w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${tone === 'critical' ? 'bg-rose-500/10' : tone === 'high' ? 'bg-orange-500/10' : tone === 'medium' ? 'bg-amber-500/10' : tone === 'ok' ? 'bg-emerald-500/10' : 'bg-sky-500/10'}`;
}
function cxTone2(tone: string) {
  const c = tone === 'CRITICAL' ? 'text-rose-500 bg-rose-500/10' : tone === 'HIGH' ? 'text-orange-500 bg-orange-500/10' : tone === 'MEDIUM' ? 'text-amber-500 bg-amber-500/10' : tone === 'OK' ? 'text-emerald-500 bg-emerald-500/10' : 'text-teal-500 bg-teal-500/10';
  return `w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-inset ring-[rgba(var(--kpc-ring),0.5)] ${c}`;
}
const ACT_ICONS: Record<string, React.ReactNode> = {
  KYC: <UserCheck className="w-3.5 h-3.5" />, KYB: <Building2 className="w-3.5 h-3.5" />, AML: <ShieldAlert className="w-3.5 h-3.5" />, SCREENING: <Fingerprint className="w-3.5 h-3.5" />, CASE: <FolderSearch className="w-3.5 h-3.5" />,
  RESTRICTION: <Lock className="w-3.5 h-3.5" />, SYSTEM: <Activity className="w-3.5 h-3.5" />, REPORT: <FileBarChart2 className="w-3.5 h-3.5" />, APPROVAL: <CheckSquare className="w-3.5 h-3.5" />,
};
