'use client';

/* Customer compliance profile — 11-tab workspace. */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User, ShieldCheck, FileText, Wallet, ArrowRightLeft, Gauge, Bell, FolderSearch,
  Fingerprint, History, Lock, Building2, AlertTriangle, FileSearch, ChevronRight, Eye, BadgeCheck,
} from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, Tabs, KeyVal, PageHead, Avatar, Modal, Input, EmptyState, useBoot, PageSkel, toneOfRisk, Col, CkTable, StatusDot } from '@/components/compliance/ui/Ck';
import { Sparkline } from '@/components/compliance/ui/charts';
import { Money, Age, useNowTick, DemoStrip, chipTxt } from './helpers';

const TABS = ['overview', 'identity', 'verification', 'documents', 'accounts', 'transactions', 'risk', 'alerts', 'cases', 'screening', 'audit'] as const;
type Tab = (typeof TABS)[number];

export function CustomerWorkspace({ id, initialTab }: { id: string; initialTab?: Tab }) {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(400);
  useNowTick(30_000);
  const [tab, setTab] = useState<Tab>(initialTab ?? 'overview');
  const [docView, setDocView] = useState<string | null>(null);
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState('');
  const [restrBusy, setRestrBusy] = useState(false);

  const customer = p.customerById(`KP-${id}`);
  const kyc = p.kyc.filter((k) => k.customerId === customer?.id);
  const txns = useMemo(() => (customer ? p.customerTxns(customer.id) : []), [customer, p]);
  const alerts = useMemo(() => (customer ? p.customerAlerts(customer.id) : []), [customer, p]);
  const matches = p.matches.filter((m) => m.customerId === customer?.id);
  const cases = p.cases.filter((c) => c.customerId === customer?.id);
  const doc = customer?.documents.find((d) => d.id === docView);

  const riskColors: Record<string, string> = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#e11d48' };
  const riskColor = customer ? riskColors[customer.riskLevel] ?? '#0d9488' : '#0d9488';
  const tabItems = TABS.map((tb) => ({
    value: tb,
    label: t.custD[`tabs${tb.charAt(0).toUpperCase()}${tb.slice(1)}` as keyof typeof t.custD] as string,
    count: tb === 'documents' ? customer?.documents.length : tb === 'transactions' ? txns.length : tb === 'alerts' ? alerts.length : tb === 'cases' ? cases.length : tb === 'screening' ? matches.length : undefined,
  }));

  if (!ready || !customer) {
    if (!ready) return <PageSkel />;
    return (
      <Card className="mt-4"><EmptyState title="Customer not found" body={`No compliance profile for KP-${id} in the demo dataset.`} action={<Link href="/compliance/customers" className="kpc-btn kpc-btn-primary">{t.cust.title}</Link>} /></Card>
    );
  }
  const full = `${customer.firstName} ${customer.lastName}`;

  const doRestriction = () => {
    if (!restrictionReason.trim() || restrBusy) return;
    setRestrBusy(true);
    window.setTimeout(() => {
      p.requestRestriction(customer.id, restrictionReason.trim());
      setRestrictionOpen(false);
      setRestrictionReason('');
      setRestrBusy(false);
    }, 350);
  };

  return (
    <div>
      {/* header */}
      <PageHead
        icon={Building2}
        title={<span className="flex items-center gap-2 flex-wrap">{full}<Chip tone="dim" className="kpc-mono">{customer.id}</Chip></span>}
        sub={`${customer.country === 'NE' ? '🇳🇪' : '🇳🇬'} ${customer.country === 'NE' ? t.common.niger : t.common.nigeria} · ${customer.city} · ${customer.occupation ?? ''}`}
        actions={
          <>
            <button onClick={() => setRestrictionOpen(true)} className="kpc-btn kpc-btn-outline"><Lock className="w-4 h-4" /> {t.custD.restrictionBtn}</button>
            <Link href={`/compliance/customers`} className="kpc-btn kpc-btn-ghost">{t.common.back}</Link>
          </>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-4">
        <MiniStat label={t.common.verification} value={chipTxt(customer.verificationStatus, t)} tone={toneOfRisk(customer.verificationStatus)} />
        <MiniStat label={t.custD.riskScore} value={`${customer.riskScore}/100`} tone={toneOfRisk(customer.riskLevel)} />
        <MiniStat label={t.custD.accountStatusLabel} value={chipTxt(customer.accountStatus, t)} tone={toneOfRisk(customer.accountStatus)} />
        <MiniStat label={t.common.currency} value={customer.currency === 'XOF' ? 'XOF (CFA)' : 'NGN (₦)'} tone="brand" />
        <MiniStat label={t.cust.alertsOpen} value={String(alerts.filter((a) => a.status !== 'RESOLVED' && a.status !== 'DISMISSED').length)} tone="high" />
        <MiniStat label={t.common.open} value={String(cases.filter((c) => c.status !== 'RESOLVED').length)} tone="warn" />
      </div>

      <Tabs items={tabItems} value={tab} onChange={(v) => setTab(v as Tab)} className="mb-4" />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card>
            <CardTitle icon={User} title={t.custD.sectionContact} />
            <div className="mt-1">
              <KeyVal k={t.common.customerId} v={customer.id} mono strong />
              <KeyVal k={t.common.country} v={customer.country === 'NE' ? `${t.common.niger} 🇳🇪` : `${t.common.nigeria} 🇳🇬`} />
              <KeyVal k={t.cust.city} v={customer.city} />
              <KeyVal k={t.custD.occupation} v={customer.occupation ?? '—'} />
              <KeyVal k="Phone" v={customer.phoneMasked} mono />
              <KeyVal k="Email" v={customer.emailMasked} mono />
              <KeyVal k={t.custD.since} v={p.fmtDay(customer.customerSince)} />
              <KeyVal k={t.custD.lastSeen} v={p.relTime(customer.lastActivityAt)} strong />
            </div>
          </Card>
          <Card>
            <CardTitle icon={Gauge} title={t.custD.sectionRisk} />
            <div className="flex items-end justify-between mt-3">
              <div>
                <div className="text-[1.7rem] font-extrabold kpc-num" style={{ color: riskColor }}>{customer.riskScore}</div>
                <Chip tone={toneOfRisk(customer.riskLevel)} className="mt-1">{customer.riskLevel}</Chip>
              </div>
              <div className="h-2 flex-1 ml-4 rounded-full bg-[rgba(var(--kpc-ring),0.4)] overflow-hidden self-center">
                <div className="h-full rounded-full transition-all" style={{ width: `${customer.riskScore}%`, background: riskColor }} />
              </div>
            </div>
            <div className="mt-3 kpc-inset p-3">
              <p className="text-[0.64rem] font-bold uppercase tracking-wider text-[var(--kpc-ink-3)] mb-1">{t.common.trend}</p>
              <Sparkline values={[30, 42, customer.riskScore - 8, customer.riskScore + 4, customer.riskScore]} color={riskColor} width={260} height={34} className="w-full" fill />
            </div>
            <div className="mt-3 space-y-1.5">
              {alerts.filter((a) => a.status === 'OPEN').slice(0, 3).map((a) => (
                <Link key={a.id} href={`/compliance/alerts/${a.id}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-[rgba(13,148,136,0.05)] text-[0.72rem] font-semibold text-[var(--kpc-ink-2)]">
                  <AlertTriangle className={a.severity === 'CRITICAL' ? 'text-rose-500 w-3.5 h-3.5' : 'text-amber-500 w-3.5 h-3.5'} /> <span className="truncate flex-1">{a.title}</span>
                </Link>
              ))}
              {!alerts.filter((a) => a.status === 'OPEN').length && <p className="text-[0.7rem] text-[var(--kpc-ink-3)]">{t.dash.attnEmpty}</p>}
            </div>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardTitle icon={Wallet} title={t.custD.sectionAccount} actions={<Link href={`/compliance/customers/${customer.id.replace('KP-', '')}`} onClick={() => setTab('accounts')} className="text-[0.66rem] kpc-link">→</Link>} />
              <div className="mt-1">
                {customer.accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-[rgba(var(--kpc-ring),0.35)] last:border-0">
                    <div>
                      <p className="text-[0.74rem] font-bold text-[var(--kpc-ink)]">{a.label}</p>
                      <p className="text-[0.62rem] kpc-mono text-[var(--kpc-ink-3)]">{a.id}</p>
                    </div>
                    <div className="text-right">
                      <Money amount={a.balance} currency={a.currency} fmt={p.fmtMoney} strong />
                      <p className="mt-0.5"><Chip tone={toneOfRisk(a.status)}>{chipTxt(a.status, t)}</Chip></p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[0.64rem] text-[var(--kpc-ink-3)] mt-2 flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> {t.custD.restrictHint}</p>
            </Card>
            <Card>
              <CardTitle icon={FileSearch} title={t.common.screening} />
              <div className="mt-2 space-y-1.5">
                {matches.slice(0, 3).map((m) => (
                  <Link key={m.id} href={m.kind === 'PEP' ? `/compliance/pep/${m.id}` : `/compliance/sanctions/${m.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.7rem] font-semibold hover:bg-[rgba(13,148,136,0.05)] text-[var(--kpc-ink-2)]">
                    <Fingerprint className="w-3.5 h-3.5 text-[var(--kpc-ink-3)]" /> {m.listName} <span className="ml-auto"><Chip tone={toneOfRisk(m.status)}>{m.status.replace(/_/g, ' ')}</Chip></span>
                  </Link>
                ))}
                {!matches.length && <p className="text-[0.7rem] text-[var(--kpc-ink-3)]">{t.custD.noDataTab}</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'identity' && (
        <Card>
          <CardTitle icon={User} title={t.custD.tabsIdentity} />
          <div className="grid grid-cols-1 md:grid-cols-2 mt-2 gap-x-10">
            <div>
              <KeyVal k={t.common.customer} v={full} strong />
              <KeyVal k={t.custD.kycLevel} v={customer.kycTier.replace('_', ' ')} />
              <KeyVal k="National ID" v={customer.idNumberMasked} mono />
              <KeyVal k="Phone" v={customer.phoneMasked} mono />
            </div>
            <div>
              <KeyVal k="Email" v={customer.emailMasked} mono />
              <KeyVal k={t.common.country} v={customer.country === 'NE' ? t.common.niger : t.common.nigeria} />
              <KeyVal k={t.cust.city} v={customer.city} />
              <KeyVal k={t.custD.since} v={p.fmtDay(customer.customerSince)} />
            </div>
          </div>
          <div className="kpc-inset p-3 mt-3 text-[0.68rem] text-[var(--kpc-ink-3)] font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> {t.audP.subtitle}
          </div>
        </Card>
      )}

      {tab === 'verification' && (
        <div className="space-y-4">
          {kyc.map((k) => (
            <Card key={k.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="kpc-mono text-[0.72rem] font-extrabold text-[var(--kpc-brand-ink)]">{k.id}</span>
                  <Chip tone={toneOfRisk(k.status)}>{chipTxt(k.status, t)}</Chip>
                  <Chip tone="dim">{k.tier.replace('_', ' ')}</Chip>
                </div>
                <Link href={`/compliance/kyc/${k.id.replace('KYC-', '')}`} className="kpc-btn kpc-btn-outline kpc-btn-sm">{t.common.view}</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <KeyVal k={t.common.submitted} v={p.fmtDT(k.submittedAt)} />
                <KeyVal k={t.common.risk} v={`${k.riskScore}/100 ${k.riskLevel}`} strong />
                <KeyVal k="NIN / CNI" v={k.ninMasked ?? '—'} mono />
                <KeyVal k={t.common.reviewer} v={k.reviewerName ?? '—'} />
              </div>
              {k.decisionReason && <p className="text-[0.7rem] text-[var(--kpc-ink-2)] mt-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{k.decisionReason}</p>}
            </Card>
          ))}
          {!kyc.length && <Card><EmptyState title={t.custD.noDataTab} body={`${full} has no KYC application in the sample set.`} action={<Link href="/compliance/kyc" className="kpc-btn kpc-btn-primary">{t.kycP.title}</Link>} /></Card>}
        </div>
      )}

      {tab === 'documents' && (
        <Card flat pad={false} className="overflow-hidden">
          <CkTable
            aria-label={t.custD.tabsDocuments}
            cols={[
              { key: 'd', header: t.common.documents, render: (d) => <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-[var(--kpc-ink-3)]" /><div><p className="text-[0.76rem] font-bold text-[var(--kpc-ink)]">{d.docType}</p><span className="text-[0.62rem] kpc-mono text-[var(--kpc-ink-3)]">{d.refMasked}</span></div></div> },
              { key: 'cat', header: t.intP.kind, render: (d) => <span className="text-[0.7rem] font-bold text-[var(--kpc-ink-2)]">{d.category}</span> },
              { key: 'st', header: t.common.status, render: (d) => <Chip tone={toneOfRisk(d.status)}>{chipTxt(d.status, t)}</Chip> },
              { key: 'met', header: 'Method', render: (d) => <span className="text-[0.68rem] font-bold text-[var(--kpc-ink-3)]">{d.method}</span> },
              { key: 'sc', header: t.sancP.matchScore, render: (d) => (d.score != null ? <span className="kpc-mono text-[0.7rem] font-extrabold text-[var(--kpc-ink)]">{d.score}%</span> : '—') },
              { key: 'act', header: t.common.actions, render: (d) => <button onClick={() => setDocView(d.id)} className="kpc-btn kpc-btn-outline kpc-btn-sm"><Eye className="w-3.5 h-3.5" /> Preview</button> },
            ]}
            rows={customer.documents}
            rowKey={(d) => d.id}
          />
        </Card>
      )}

      {tab === 'accounts' && (
        <Card>
          <CardTitle icon={Wallet} title={t.custD.sectionAccount} />
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {customer.accounts.map((a) => (
              <div key={a.id} className="kpc-inset p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-[var(--kpc-brand-ink)]" /><p className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{a.label}</p></div>
                  <Chip tone={toneOfRisk(a.status)}>{chipTxt(a.status, t)}</Chip>
                </div>
                <p className="kpc-mono text-[0.66rem] text-[var(--kpc-ink-3)] mt-1">{a.id} · {a.kind.replace(/_/g, ' ')}</p>
                <p className="text-[1.15rem] font-extrabold kpc-num text-[var(--kpc-ink)] mt-2"><Money amount={a.balance} currency={a.currency} fmt={p.fmtMoney} /></p>
                <p className="text-[0.62rem] text-[var(--kpc-ink-3)] mt-1">Opened {p.fmtDay(a.openedAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'transactions' && (
        <Card flat pad={false} className="overflow-hidden">
          <CkTable
            aria-label={t.custD.tabsTransactions}
            onRow={(x) => router.push(`/compliance/transaction-monitoring/${x.id.replace('TXN-', '')}`)}
            cols={[
              { key: 'id', header: t.txnP.txnId, render: (x) => <span className="kpc-mono text-[0.7rem] font-extrabold text-[var(--kpc-brand-ink)]">{x.id}</span> },
              { key: 'dir', header: t.txnP.direction, render: (x) => <Chip tone={x.direction === 'IN' ? 'ok' : 'info'}>{x.direction}</Chip> },
              { key: 'am', header: t.common.amount, render: (x) => <Money amount={x.amount} currency={x.currency} fmt={p.fmtMoney} strong /> },
              { key: 'ch', header: t.common.channel, render: (x) => <span className="text-[0.68rem] font-bold text-[var(--kpc-ink-2)]">{x.channel.replace(/_/g, ' ')}</span> },
              { key: 'risk', header: t.txnP.riskScore, render: (x) => <Chip tone={toneOfRisk(x.riskLevel)}>{x.riskScore}</Chip> },
              { key: 'dec', header: t.txnP.decision, render: (x) => <Chip tone={toneOfRisk(x.decision)}>{x.decision}</Chip> },
              { key: 'st', header: t.common.status, render: (x) => <Chip tone={toneOfRisk(x.status)}>{chipTxt(x.status, t)}</Chip> },
              { key: 'ts', header: t.common.timestamp, render: (x) => <Age iso={x.timestamp} rel={p.relTime} /> },
            ]}
            rows={[...txns].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))}
            rowKey={(x) => x.id}
          />
          {!txns.length && <EmptyState title={t.custD.noDataTab} />}
        </Card>
      )}

      {tab === 'risk' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card>
            <CardTitle icon={Gauge} title={t.riskP.distribution} />
            <div className="mt-3"><KeyVal k={t.common.risk} v={`${customer.riskLevel} (${customer.riskScore}/100)`} strong /><KeyVal k={t.common.total} v={txns.length} /><KeyVal k={t.txnP.suspicious} v={txns.filter((x) => x.decision !== 'PASS').length} /><KeyVal k={t.custD.openItems} v={alerts.filter((a) => a.status !== 'RESOLVED' && a.status !== 'DISMISSED').length} /></div>
          </Card>
          <Card className="xl:col-span-2">
            <CardTitle icon={AlertTriangle} title={t.riskP.fraudAlerts} />
            <div className="mt-2 space-y-1.5">
              {alerts.map((a) => (
                <Link key={a.id} href={`/compliance/alerts/${a.id}`} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[rgba(13,148,136,0.05)] border border-transparent hover:border-[rgba(13,148,136,0.3)]">
                  <StatusDot tone={toneOfRisk(a.severity) as never} />
                  <span className="flex-1 text-[0.74rem] font-semibold text-[var(--kpc-ink)] truncate">{a.title}</span>
                  <span className="text-[0.62rem] kpc-mono text-[var(--kpc-ink-3)]">{a.id}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--kpc-ink-3)]" />
                </Link>
              ))}
              {!alerts.length && <EmptyState title={t.custD.noDataTab} body={t.dash.attnEmpty} />}
            </div>
          </Card>
        </div>
      )}

      {tab === 'alerts' && (
        <Card flat pad={false} className="overflow-hidden">
          <CkTable
            aria-label={t.custD.tabsAlerts}
            onRow={(a) => router.push(`/compliance/alerts/${a.id}`)}
            cols={[
              { key: 'sev', header: t.alrtP.severity, render: (a) => <Chip tone={toneOfRisk(a.severity)}>{a.severity}</Chip> },
              { key: 'title', header: t.alrtP.customerName, render: (a) => <p className="text-[0.74rem] font-bold text-[var(--kpc-ink)] max-w-[300px] truncate">{a.title}</p> },
              { key: 'kind', header: t.alrtP.kind, render: (a) => <span className="text-[0.66rem] font-bold text-[var(--kpc-ink-3)]">{a.kind}</span> },
              { key: 'st', header: t.common.status, render: (a) => <Chip tone={toneOfRisk(a.status)}>{chipTxt(a.status, t)}</Chip> },
              { key: 'id', header: t.common.customerId, render: (a) => <span className="kpc-mono text-[0.66rem] text-[var(--kpc-ink-3)]">{a.id}</span> },
              { key: 'ts', header: t.alrtP.age, render: (a) => <Age iso={a.triggeredAt} rel={p.relTime} /> },
            ]}
            rows={alerts}
            rowKey={(a) => a.id}
          />
          {!alerts.length && <EmptyState title={t.custD.noDataTab} />}
        </Card>
      )}

      {tab === 'cases' && (
        <Card flat pad={false} className="overflow-hidden">
          <CkTable
            aria-label={t.custD.tabsCases}
            onRow={(c) => router.push(`/compliance/cases/${c.caseNumber}`)}
            cols={[
              { key: 'num', header: t.cases.caseNumber, render: (c) => <span className="kpc-mono text-[0.72rem] font-extrabold text-[var(--kpc-brand-ink)]">{c.caseNumber}</span> },
              { key: 'title', header: t.common.title, render: (c) => <p className="text-[0.74rem] font-bold text-[var(--kpc-ink)] max-w-[280px] truncate">{c.title}</p> },
              { key: 'type', header: t.cases.caseType, render: (c) => <span className="text-[0.66rem] font-bold text-[var(--kpc-ink-3)]">{c.caseType.replace(/_/g, ' ')}</span> },
              { key: 'risk', header: t.common.risk, render: (c) => <Chip tone={toneOfRisk(c.riskLevel)}>{c.riskLevel}</Chip> },
              { key: 'st', header: t.common.status, render: (c) => <Chip tone={toneOfRisk(c.status)}>{chipTxt(c.status, t)}</Chip> },
            ]}
            rows={cases}
            rowKey={(c) => c.id}
          />
          {!cases.length && <EmptyState title={t.custD.noDataTab} />}
        </Card>
      )}

      {tab === 'screening' && (
        <Card>
          <CardTitle icon={Fingerprint} title={t.custD.tabsScreening} />
          <div className="mt-2 space-y-2">
            {matches.map((m) => (
              <div key={m.id} className="kpc-inset p-3.5 flex flex-wrap items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center"><Fingerprint className="w-4.5 h-4.5" style={{ width: 17, height: 17 }} /></span>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[0.76rem] font-bold text-[var(--kpc-ink)]">{m.listName}</p>
                  <p className="text-[0.64rem] text-[var(--kpc-ink-3)]">{m.matchedFields.join(' · ')}</p>
                </div>
                <span className="kpc-mono text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{m.score}%</span>
                <Chip tone={toneOfRisk(m.status)}>{m.status.replace(/_/g, ' ')}</Chip>
                <Link href={m.kind === 'PEP' ? `/compliance/pep/${m.id}` : `/compliance/sanctions/${m.id}`} className="kpc-btn kpc-btn-outline kpc-btn-sm">{t.common.view}</Link>
              </div>
            ))}
            {!matches.length && <EmptyState title={t.custD.noDataTab} body={customer.screeningClean ? 'No sanctions or PEP matches for this customer.' : undefined} />}
          </div>
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <CardTitle icon={History} title={t.custD.tabsAudit} />
          <p className="text-[0.7rem] text-[var(--kpc-ink-3)] mb-3">{t.audP.subtitle}</p>
          {p.audit.filter((a) => a.resourceId === customer.id || (a.detail ?? '').includes(customer.id)).slice(0, 10).map((a) => (
            <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-[rgba(var(--kpc-ring),0.35)] last:border-0">
              <span className="w-6 h-6 rounded-lg bg-[rgba(var(--kpc-ring),0.5)] flex items-center justify-center text-[var(--kpc-ink-3)]"><History className="w-3.5 h-3.5" /></span>
              <div className="flex-1">
                <p className="text-[0.74rem] font-bold text-[var(--kpc-ink)]">{a.action.replace(/_/g, ' ')}</p>
                <p className="text-[0.64rem] text-[var(--kpc-ink-3)]">{a.officerName} · {p.fmtDT(a.at)}</p>
              </div>
              <Chip tone={toneOfRisk(a.result)}>{a.result}</Chip>
            </div>
          ))}
          {!p.audit.filter((a) => a.resourceId === customer.id).length && <EmptyState title={t.custD.noDataTab} body="Actions taken on this profile are recorded here once made in this session." />}
        </Card>
      )}

      {/* document preview modal */}
      <Modal open={!!doc} onClose={() => setDocView(null)} title={t.kycD.documentViewer} width="max-w-3xl">
        {doc && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border-2 border-dashed border-[rgba(var(--kpc-ring),0.9)] bg-[var(--kpc-bg-2)] aspect-[3/4] flex flex-col items-center justify-center text-[var(--kpc-ink-3)] relative overflow-hidden">
              <FileText className="w-10 h-10 mb-2" style={{ width: 38, height: 38 }} />
              <p className="text-[0.72rem] font-bold">Secure document frame</p>
              <p className="text-[0.6rem] px-6 text-center mt-1">{t.kycD.noDoc} — documents render through the KYC provider's secure viewer.</p>
              <span className="absolute top-2 right-2"><Chip tone="ok"><BadgeCheck className="w-3 h-3" /> {t.common.sample}</Chip></span>
            </div>
            <div>
              <CardTitle icon={FileText} title={t.kycD.docMeta} />
              <div className="mt-1">
                <KeyVal k={t.common.type} v={doc.docType} strong />
                <KeyVal k={t.common.customerId} v={customer.id} mono />
                <KeyVal k="Reference" v={doc.refMasked} mono />
                <KeyVal k={t.common.status} v={<Chip tone={toneOfRisk(doc.status)}>{chipTxt(doc.status, t)}</Chip>} />
                <KeyVal k="Method" v={doc.method} />
                {doc.score != null && <KeyVal k={t.kycD.matchAuto} v={<span className="kpc-num font-extrabold">{doc.score}%</span>} strong />}
                {doc.verifiedAt && <KeyVal k={t.common.verified} v={p.fmtDT(doc.verifiedAt)} />}
              </div>
              {doc.notes && <p className="text-[0.68rem] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 mt-3">{doc.notes}</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* restriction request modal */}
      <Modal open={restrictionOpen} onClose={() => setRestrictionOpen(false)} title={t.custD.restrictionTitle}
        footer={<>
          <button onClick={() => setRestrictionOpen(false)} className="kpc-btn kpc-btn-ghost">{t.common.cancel}</button>
          <button disabled={!restrictionReason.trim() || restrBusy} onClick={doRestriction} className="kpc-btn kpc-btn-danger"><Lock className="w-4 h-4" /> {restrBusy ? '…' : t.common.request}</button>
        </>}>
        <p className="text-[0.74rem] text-[var(--kpc-ink-2)] mb-3">{t.custD.restrictionBody}</p>
        <label className="block text-[0.68rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)] mb-1.5" htmlFor="restr-reason">{t.escP.resolveBody}</label>
        <Input id="restr-reason" value={restrictionReason} onChange={(e) => setRestrictionReason(e.target.value)} placeholder="e.g. Sanctions confirmation pending — restrict outbound transfers…" />
      </Modal>
      <DemoStrip t={t} />
    </div>
  );
}

function CardTitle({ icon: Icon, title, actions }: { icon: React.ComponentType<{ className?: string }>; title: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1">
      <h3 className="text-[0.78rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink)] flex items-center gap-2">{Icon && <Icon className="w-4 h-4 text-[var(--kpc-brand-ink)]" />}{title}</h3>
      {actions}
    </div>
  );
}
const MINI_DOT: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#e11d48', ok: '#10b981', warn: '#f59e0b', info: '#0ea5e9', dim: '#94a3b8', brand: '#14b8a6' };
function MiniStat({ label, value, tone }: { label: React.ReactNode; value: React.ReactNode; tone?: string }) {
  return (
    <Card flat className="p-3">
      <p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--kpc-ink-3)] truncate">{label}</p>
      <div className="flex items-center justify-between mt-1.5 gap-1">
        <p className="kpc-num text-[1.05rem] font-extrabold text-[var(--kpc-ink)] truncate">{value}</p>
        {tone && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: MINI_DOT[tone] ?? '#94a3b8' }} />}
      </div>
    </Card>
  );
}
