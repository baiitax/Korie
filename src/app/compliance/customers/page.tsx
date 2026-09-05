'use client';

/* Customer compliance list — XOF customers first (Niger primary), NGN second. */
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search as SearchIcon, Download, UserCheck } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, CkTable, Col, Chip, PageHead, Input, Select, Seg, useBoot, PageSkel, Avatar, toneOfRisk } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';


export default function CustomersPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(450);
  const [q, setQ] = useState('');
  const [risk, setRisk] = useState('ALL');
  const [ver, setVer] = useState('ALL');
  const [country, setCountry] = useState('ALL');
  const [acct, setAcct] = useState('ALL');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return p.customers
      .filter((c) => {
        if (risk !== 'ALL' && c.riskLevel !== risk) return false;
        if (ver !== 'ALL' && c.verificationStatus !== ver) return false;
        if (country !== 'ALL' && c.country !== country) return false;
        if (acct !== 'ALL' && c.accountStatus !== acct) return false;
        if (query) {
          const hay = `${c.firstName} ${c.lastName} ${c.id} ${c.city} ${c.occupation ?? ''}`.toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.currency === b.currency ? 0 : a.currency === 'XOF' ? -1 : 1));
  }, [p.customers, q, risk, ver, country, acct]);

  const fmtId = (id: string) => id.replace('KP-', '');
  const pg = usePaging(filtered, 9);
  const cols: Col<(typeof filtered)[number]>[] = [
    {
      key: 'c', header: t.common.customer, sortVal: (r) => `${r.lastName}`,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={`${c.firstName} ${c.lastName}`} size={30} />
          <div className="min-w-0">
            <button onClick={() => router.push(`/compliance/customers/${fmtId(c.id)}`)} className="block text-[0.78rem] font-bold text-[var(--kpc-ink)] truncate max-w-[190px] hover:text-[var(--kpc-brand-ink)]">{c.firstName} {c.lastName}</button>
            <span className="block text-[0.64rem] kpc-mono text-[var(--kpc-ink-3)]">{c.id} · {c.city}</span>
          </div>
        </div>
      ),
    },
    { key: 'ccy', header: t.common.currency, render: (c) => <Chip tone={c.currency === 'XOF' ? 'brand' : 'info'}>{c.currency}</Chip> },
    { key: 'ctry', header: t.common.country, render: (c) => <span className="text-[0.72rem] font-bold text-[var(--kpc-ink-2)]">{c.country === 'NE' ? '🇳🇪 Niger' : '🇳🇬 Nigeria'}</span> },
    { key: 'ver', header: t.common.verification, sortVal: (r) => r.verificationStatus, render: (c) => <Chip tone={toneOfRisk(c.verificationStatus)}>{verLabel(c.verificationStatus, t)}</Chip> },
    { key: 'risk', header: t.common.risk, sortVal: (r) => r.riskScore, render: (c) => <Chip tone={toneOfRisk(c.riskLevel)}>{c.riskLevel} · {c.riskScore}</Chip> },
    { key: 'flags', header: t.common.alerts, render: (c) => (c.openAlerts + c.openCases + c.sanctionsMatches + c.pepMatches > 0 ? <Chip tone={c.sanctionsMatches + c.pepMatches > 0 ? 'critical' : 'warn'}>{c.openAlerts}a {c.openCases}c{c.sanctionsMatches + c.pepMatches ? ` ${c.sanctionsMatches + c.pepMatches}m` : ''}</Chip> : <span className="text-[0.66rem] text-[var(--kpc-ink-3)] font-semibold">—</span>) },
    { key: 'acct', header: t.custD.accountStatusLabel, render: (c) => <Chip tone={toneOfRisk(c.accountStatus)}>{acctLabel(c.accountStatus, t)}</Chip> },
    { key: 'last', header: t.common.lastActivity, sortVal: (r) => r.lastActivityAt, render: (c) => <Age iso={c.lastActivityAt} rel={p.relTime} /> },
  ];

  if (!ready) return <PageSkel />;

  return (
    <div>
      <PageHead icon={Users} title={t.cust.title} sub={t.cust.subtitle} actions={
        <button onClick={() => p.pushToast('info', t.common.export, `${filtered.length} rows · CSV (demo)`, true)} className="kpc-btn kpc-btn-outline"><Download className="w-4 h-4" /> {t.common.export}</button>
      } />
      <Card flat className="mb-4 p-3">
        <div className="flex flex-col lg:flex-row gap-2.5">
          <Input icon={<SearchIcon className="w-3.5 h-3.5" />} placeholder={t.cust.searchPlaceholder} value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} className="!text-[0.78rem]" wrapClass="flex-1 min-w-[220px]" aria-label={t.common.search} />
          <Select value={risk} onChange={(e) => { setRisk(e.target.value); pg.reset(); }} aria-label={t.common.risk}>{['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((v) => <option key={v} value={v}>{v === 'ALL' ? `${t.common.filter} — ${t.common.risk}` : v}</option>)}</Select>
          <Select value={ver} onChange={(e) => { setVer(e.target.value); pg.reset(); }} aria-label={t.common.verification}>{['ALL', 'VERIFIED', 'PENDING', 'IN_REVIEW', 'REJECTED', 'EXPIRED'].map((v) => <option key={v} value={v}>{v === 'ALL' ? `${t.common.filter} — ${t.common.verification}` : v}</option>)}</Select>
          <Select value={country} onChange={(e) => { setCountry(e.target.value); pg.reset(); }} aria-label={t.common.country}>
            <option value="ALL">{t.common.filter} — {t.common.country}</option>
            <option value="NE">{t.common.niger} 🇳🇪</option>
            <option value="NG">{t.common.nigeria} 🇳🇬</option>
          </Select>
          <Select value={acct} onChange={(e) => { setAcct(e.target.value); pg.reset(); }} aria-label={t.custD.accountStatusLabel}>
            <option value="ALL">{t.common.filter} — {t.custD.accountStatusLabel}</option>
            {['ACTIVE', 'DORMANT', 'FROZEN', 'RESTRICTED'].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          {(q || risk !== 'ALL' || ver !== 'ALL' || country !== 'ALL' || acct !== 'ALL') && (
            <button onClick={() => { setQ(''); setRisk('ALL'); setVer('ALL'); setCountry('ALL'); setAcct('ALL'); pg.reset(); }} className="kpc-btn kpc-btn-ghost">{t.common.clearFilters}</button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          <Seg ariaLabel="Customer segments" options={[
            { value: 'ALL', label: `${t.common.all} (${filtered.length})` },
            { value: 'HIGH', label: t.common.highRisk },
            { value: 'CRITICAL', label: t.common.criticalRisk },
          ]} value={risk === 'HIGH' || risk === 'CRITICAL' ? risk : 'ALL'} onChange={(v) => setRisk(v)} />
          <span className="text-[0.64rem] text-[var(--kpc-ink-3)] font-semibold flex items-center gap-1.5"><UserCheck className="w-3 h-3" /> XOF-first ordering · sample data</span>
        </div>
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.cust.title} cols={cols} rows={pg.slice} rowKey={(r) => r.id} onRow={(r) => router.push(`/compliance/customers/${fmtId(r.id)}`)} dense />
        <Paginator {...pg} total={filtered.length} setPage={(n) => pg.setPage(n)} />
      </Card>
    </div>
  );
}

function verLabel(v: string, t: Record<string, any>) {
  const map: Record<string, string> = { VERIFIED: t.kycCommon.verified, PENDING: t.kycCommon.pending, IN_REVIEW: t.kycCommon.inReview, REJECTED: t.kycCommon.rejected, EXPIRED: t.kycCommon.expired, INFORMATION_REQUESTED: t.kycCommon.informationRequested, NOT_STARTED: '—' };
  return map[v] ?? v;
}
function acctLabel(v: string, t: Record<string, any>) {
  const map: Record<string, string> = { ACTIVE: t.common.active, DORMANT: t.common.dormant, FROZEN: t.common.frozen, RESTRICTED: t.common.restricted };
  return map[v] ?? v;
}
