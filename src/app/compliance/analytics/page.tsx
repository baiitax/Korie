'use client';
import React, { useMemo } from 'react';
import { BarChart3, Percent, Timer, ShieldAlert, Clock3 } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, PageHead, useBoot, PageSkel, Kpi, Chip, EmptyState } from '@/components/compliance/ui/Ck';
import { Donut, Bars, HBarRows, TONE_HEX } from '@/components/compliance/ui/charts';

export default function AnalyticsPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(480);

  const d = useMemo(() => {
    const by = <T,>(rows: T[], key: (r: T) => string) => {
      const m: Record<string, number> = {};
      rows.forEach((r) => (m[key(r)] = (m[key(r)] ?? 0) + 1));
      return m;
    };
    const risk = by(p.customers, (c) => c.riskLevel);
    const kycStatus = by(p.kyc, (k) => k.status);
    const aml = p.alerts.filter((a) => a.kind === 'AML');
    const closedAlerts = aml.filter((a) => a.status === 'RESOLVED' || a.status === 'DISMISSED');
    const resH = closedAlerts.length ? Math.round(closedAlerts.reduce((s, a) => s + (Date.now() - new Date(a.triggeredAt).getTime()) / 36e5, 0) / closedAlerts.length) : 0;
    const kycClosed = p.kyc.filter((k) => k.status === 'VERIFIED' || k.status === 'REJECTED');
    const kycHours = kycClosed.length ? Math.round(kycClosed.reduce((s, k) => s + (new Date(k.updatedAt).getTime() - new Date(k.submittedAt).getTime()) / 36e5, 0) / kycClosed.length * 10) / 10 : 0;
    const casesOpen = p.cases.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED');
    const casesOverdue = casesOpen.filter((c) => new Date(c.deadlineSla).getTime() < Date.now());
    const alerts14 = Array.from({ length: 14 }, (_, i) => {
      const day = new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10);
      return { label: day.slice(8), value: p.alerts.filter((a) => a.triggeredAt.slice(0, 10) === day).length };
    });
    const approvalsAll = p.approvals;
    return { risk, kycStatus, aml, resH, kycHours, casesOpen, casesOverdue, alerts14, approvalsAll };
  }, [p.customers, p.kyc, p.alerts, p.cases, p.approvals]);

  if (!ready) return <PageSkel />;
  const kycTotal = Object.values(d.kycStatus).reduce((a, b) => a + b, 0) || 1;
  const riskTotal = Object.values(d.risk).reduce((a, b) => a + b, 0) || 1;
  const caseTotal = d.casesOpen.length + p.cases.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length || 1;
  const slaPct = caseTotal ? Math.round(((caseTotal - d.casesOpen.length) / caseTotal) * 100) : 0;
  return (
    <div>
      <PageHead icon={BarChart3} title={t.anaP.title} sub={t.anaP.subtitle} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi icon={Percent} label={t.anaP.kycConversion} value={Math.round(((d.kycStatus.VERIFIED ?? 0) / kycTotal) * 100) + '%'} sub={`${d.kycStatus.VERIFIED ?? 0} / ${kycTotal}`} />
        <Kpi icon={Timer} label={t.anaP.verTime} value={`${d.kycHours}h`} sub={t.anaP.trend} />
        <Kpi icon={ShieldAlert} label={t.anaP.alertRate} value={`${d.aml.length ? Math.round((d.aml.length / Math.max(p.txns.length, 1)) * 1000) : 0}‰`} sub={`${d.aml.length} ${t.amlP.title.toLowerCase()} / ${p.txns.length} ${t.txnP.title.toLowerCase()}`} />
        <Kpi icon={Clock3} label={t.anaP.alertResTime} value={`${d.resH}h`} sub={t.anaP.trend} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Card>
          <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.anaP.riskDistribution}</h3>
          <div className="flex items-center gap-5">
            <Donut size={150} thickness={18}
              segs={(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((k, i) => ({ label: k, value: d.risk[k] ?? 0, color: [TONE_HEX.low, TONE_HEX.medium, TONE_HEX.high, TONE_HEX.critical][i] }))}
              centerTop={<span className="text-[1.1rem]">{riskTotal}</span>} centerSub={`${t.common.customer}s`} />
            <div className="flex-1 min-w-0 space-y-1.5">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((k) => <div key={k} className="flex items-center gap-2 text-[0.68rem] font-bold"><span className="w-2 h-2 rounded-full" style={{ background: { LOW: TONE_HEX.low, MEDIUM: TONE_HEX.medium, HIGH: TONE_HEX.high, CRITICAL: TONE_HEX.critical }[k] }} />{k}<span className="ml-auto kpc-num">{d.risk[k] ?? 0}</span></div>)}
            </div>
          </div>
          <p className="text-[0.6rem] text-[var(--kpc-ink-3)] mt-3">{t.common.demoNote}</p>
        </Card>
        <Card>
          <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.anaP.kycConversion}</h3>
          <Bars height={140} data={Object.entries(d.kycStatus).map(([k, v]) => ({ label: k.replace(/_/g, ' ').slice(0, 5), value: v, color: k === 'VERIFIED' ? TONE_HEX.ok : k === 'REJECTED' || k === 'EXPIRED' ? TONE_HEX.critical : TONE_HEX.warn }))} ariaLabel={t.anaP.kycConversion} />
        </Card>
        <Card>
          <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.anaP.caseRes}</h3>
          <HBarRows rows={[
            { label: t.caseP.title, value: caseTotal, count: String(caseTotal), pct: 100, color: TONE_HEX.dim },
            { label: t.common.open, value: d.casesOpen.length, count: String(d.casesOpen.length), pct: Math.round((d.casesOpen.length / caseTotal) * 100), color: TONE_HEX.warn },
            { label: `${t.common.sla} ✓`, value: slaPct, count: slaPct + '%', pct: slaPct, color: TONE_HEX.ok },
          ]} />
          <p className="text-[0.6rem] text-[var(--kpc-ink-3)] mt-3">{t.anaP.slaCompliance}: {caseTotal ? Math.round(((caseTotal - d.casesOpen.length) / caseTotal) * 100) : 0}%</p>
        </Card>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.anaP.alertsByDay}</h3>
          <Bars height={130} data={d.alerts14} ariaLabel={t.anaP.alertsByDay} />
          <p className="text-[0.6rem] text-[var(--kpc-ink-3)] mt-2">14 days · {t.common.all} kinds</p>
        </Card>
        <Card>
          <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.anaP.approvalsByType}</h3>
          <div className="space-y-1.5">
            {Object.entries(d.approvalsAll.reduce<Record<string, number>>((m, a) => { m[a.status] = (m[a.status] ?? 0) + 1; return m; }, {})).map(([k, v]) => <div key={k} className="flex items-center gap-2 text-[0.7rem] font-bold"><Chip tone={k === 'APPROVED' ? 'ok' : k === 'DENIED' ? 'critical' : 'warn'}>{k}</Chip><span className="ml-auto kpc-num">{v}</span></div>)}
            {!d.approvalsAll.length && <EmptyState title={t.common.noResults} />}
          </div>
          <p className="text-[0.6rem] text-[var(--kpc-ink-3)] mt-3">{t.aprP.title} — {t.common.demoNote}</p>
        </Card>
        <Card>
          <h3 className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] mb-3">{t.anaP.screeningMatches}</h3>
          <HBarRows rows={(['SANCTIONS', 'PEP'] as const).map((k) => {
            const list = p.matches.filter((m) => m.kind === k);
            const pending = list.filter((m) => m.status === 'POTENTIAL_MATCH' || m.status === 'UNDER_REVIEW').length;
            return { label: k, value: list.length, count: `${pending} ${t.common.pending}`, pct: list.length ? Math.round((pending / list.length) * 100) : 0, color: k === 'SANCTIONS' ? TONE_HEX.critical : TONE_HEX.info };
          })} />
          <p className="text-[0.6rem] text-[var(--kpc-ink-3)] mt-3">{t.statuses.open} reviews by list</p>
        </Card>
      </div>
    </div>
  );
}
