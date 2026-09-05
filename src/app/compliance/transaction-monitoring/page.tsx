'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, Download, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Input, Select, useBoot, PageSkel, CkTable, Col, toneOfRisk } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Money, Age, chipTxt } from '@/components/compliance/workspaces/helpers';

export default function TransactionMonitorPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(420);
  const [q, setQ] = useState('');
  const [ch, setCh] = useState('ALL');
  const [dec, setDec] = useState('ALL');
  const [minScore, setMinScore] = useState('ALL');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return p.txns
      .filter((x) => (ch === 'ALL' ? true : x.channel === ch))
      .filter((x) => (dec === 'ALL' ? true : x.decision === dec))
      .filter((x) => (minScore === 'ALL' ? true : x.riskScore >= Number(minScore)))
      .filter((x) => !query || `${x.id} ${x.customerName} ${x.counterpartyMasked}`.toLowerCase().includes(query))
      .sort((a, b) => (a.currency === b.currency ? (a.timestamp < b.timestamp ? 1 : -1) : a.currency === 'XOF' ? -1 : 1));
  }, [p.txns, q, ch, dec, minScore]);
  const pg = usePaging(filtered, 10);

  const cols: Col<(typeof filtered)[number]>[] = [
    { key: 'id', header: t.txnP.txnId, render: (x) => <span className="kpc-mono text-[0.7rem] font-extrabold text-[var(--kpc-brand-ink)]">{x.id}</span> },
    { key: 'c', header: t.common.customer, render: (x) => (
      <div className="min-w-0"><button onClick={() => router.push(`/compliance/customers/${x.customerId.replace('KP-', '')}`)} className="block text-[0.74rem] font-bold text-[var(--kpc-ink)] truncate max-w-[150px] hover:text-[var(--kpc-brand-ink)]">{x.customerName}</button><span className="block text-[0.6rem] kpc-mono text-[var(--kpc-ink-3)]">{x.customerId}</span></div> ) },
    { key: 'dir', header: t.txnP.direction, render: (x) => x.direction === 'IN' ? <ArrowDownLeft className="w-4 h-4 text-emerald-500" aria-label="In" /> : <ArrowUpRight className="w-4 h-4 text-sky-500" aria-label="Out" /> },
    { key: 'am', header: t.common.amount, sortVal: (r) => r.amount, render: (x) => <Money amount={x.amount} currency={x.currency} fmt={p.fmtMoney} strong /> },
    { key: 'ccy', header: t.common.currency, render: (x) => <Chip tone={x.currency === 'XOF' ? 'brand' : 'info'}>{x.currency}</Chip> },
    { key: 'cp', header: t.txnP.counterparty, render: (x) => <span className="text-[0.68rem] font-semibold text-[var(--kpc-ink-2)] truncate block max-w-[130px]">{x.counterpartyMasked}</span> },
    { key: 'ch', header: t.common.channel, render: (x) => <span className="text-[0.64rem] font-bold text-[var(--kpc-ink-3)]">{x.channel.replace(/_/g, ' ')}</span> },
    { key: 'risk', header: t.txnP.riskScore, sortVal: (r) => r.riskScore, render: (x) => <Chip tone={toneOfRisk(x.riskLevel)}>{x.riskScore}</Chip> },
    { key: 'rules', header: t.txnP.triggeredRules, render: (x) => x.rulesTriggered.length ? <span className="kpc-mono text-[0.62rem] font-bold text-orange-600 dark:text-orange-400">{x.rulesTriggered.length} · {x.rulesTriggered[0].code}</span> : <span className="text-[0.64rem] text-[var(--kpc-ink-3)]">—</span> },
    { key: 'dec', header: t.txnP.decision, render: (x) => <Chip tone={toneOfRisk(x.decision)}>{x.decision}</Chip> },
    { key: 'st', header: t.common.status, render: (x) => <Chip tone={toneOfRisk(x.status)}>{chipTxt(x.status, t)}</Chip> },
    { key: 'ts', header: t.common.timestamp, sortVal: (r) => r.timestamp, render: (x) => <Age iso={x.timestamp} rel={p.relTime} /> },
  ];

  const sums = useMemo(() => ({
    flagged: filtered.filter((x) => x.decision === 'FLAG').length,
    blocked: filtered.filter((x) => x.decision === 'BLOCK').length,
    cleared: filtered.filter((x) => x.decision === 'PASS').length,
    vol: filtered.reduce((a, x) => a + x.amount, 0),
  }), [filtered]);

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={Radio} title={t.txnP.title} sub={t.txnP.subtitle} actions={<button onClick={() => p.pushToast('info', t.common.export, `${filtered.length} rows · CSV (demo)`, true)} className="kpc-btn kpc-btn-outline"><Download className="w-4 h-4" /> {t.common.export}</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Mini label={t.txnP.volume} value={p.fmtMoneyShort(sums.vol, 'XOF')} tone="brand" />
        <Mini label={t.txnP.suspicious} value={sums.flagged} tone="warn" />
        <Mini label={t.txnP.blocked} value={sums.blocked} tone="critical" />
        <Mini label={t.txnP.cleared} value={sums.cleared} tone="ok" />
      </div>
      <Card flat className="mb-4 p-3">
        <div className="flex flex-col xl:flex-row gap-2.5">
          <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder={t.txnP.searchPlaceholder} className="!text-[0.78rem]" wrapClass="flex-1 min-w-[220px]" aria-label={t.common.search} />
          <Select value={ch} onChange={(e) => { setCh(e.target.value); pg.reset(); }} aria-label={t.common.channel}>
            <option value="ALL">{t.common.filter} — {t.common.channel}</option>
            {['CROSS_BORDER', 'WALLET_TRANSFER', 'AGENT_CASH_OUT', 'AGENT_CASH_IN', 'QR_PAYMENT', 'BILL_PAYMENT', 'FX_CONVERSION'].map((v) => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </Select>
          <Select value={dec} onChange={(e) => { setDec(e.target.value); pg.reset(); }} aria-label={t.txnP.decision}>
            <option value="ALL">{t.common.filter} — {t.txnP.decision}</option>
            {['PASS', 'FLAG', 'REVIEW', 'BLOCK'].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
          <Select value={minScore} onChange={(e) => { setMinScore(e.target.value); pg.reset(); }} aria-label={t.txnP.riskScore}>
            <option value="ALL">{t.common.filter} — {t.txnP.riskScore}</option>
            {['40', '60', '80'].map((v) => <option key={v} value={v}>Score ≥ {v}</option>)}
          </Select>
          <span className="text-[0.62rem] text-[var(--kpc-ink-3)] font-semibold self-center">XOF first · sample data</span>
        </div>
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.txnP.title} cols={cols} rows={pg.slice} rowKey={(x) => x.id} onRow={(x) => router.push(`/compliance/transaction-monitoring/${x.id.replace('TXN-', '')}`)} />
        <Paginator {...pg} total={filtered.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
function Mini({ label, value, tone }: { label: string; value: React.ReactNode; tone: 'brand' | 'warn' | 'critical' | 'ok' }) {
  return (
    <div className="kpc-card kpc-card-flat p-3.5 flex items-center justify-between">
      <div><p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)]">{label}</p><p className="kpc-num text-[1.2rem] font-extrabold text-[var(--kpc-ink)] mt-1">{value}</p></div>
      <span className={`w-2.5 h-2.5 rounded-full ${tone === 'brand' ? 'bg-teal-500' : tone === 'warn' ? 'bg-amber-500' : tone === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
    </div>
  );
}
