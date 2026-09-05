'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSearch, Download } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Input, Select, useBoot, PageSkel, CkTable, Col, EmptyState, Avatar, toneOfRisk } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Money, Age, chipTxt } from '@/components/compliance/workspaces/helpers';

export default function CasesPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const router = useRouter();
  const { ready } = useBoot(400);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [priority, setPriority] = useState('ALL');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return p.cases
      .filter((c) => (status === 'ALL' ? true : status === 'OPEN' ? !['RESOLVED', 'CLOSED'].includes(c.status) : c.status === status))
      .filter((c) => (priority === 'ALL' ? true : c.priority === priority))
      .filter((c) => !query || `${c.caseNumber} ${c.title} ${c.customerName ?? ''}`.toLowerCase().includes(query))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [p.cases, q, status, priority]);
  const pg = usePaging(filtered, 9);

  const cols: Col<(typeof filtered)[number]>[] = [
    { key: 'num', header: t.caseP.caseId, render: (c) => (
      <div className="min-w-0"><button onClick={() => router.push(`/compliance/cases/${c.caseNumber}`)} className="block kpc-mono text-[0.72rem] font-extrabold text-[var(--kpc-brand-ink)] hover:underline">{c.caseNumber}</button><span className="text-[0.6rem] text-[var(--kpc-ink-3)]">{c.caseType.replace(/_/g, ' ')}</span></div> ) },
    { key: 'title', header: t.common.title, render: (c) => <p className="text-[0.74rem] font-bold text-[var(--kpc-ink)] max-w-[260px] truncate">{c.title}</p> },
    { key: 'cust', header: t.caseP.target, render: (c) => c.customerId ? <button onClick={(e) => { e.stopPropagation(); if (c.customerId) router.push(`/compliance/customers/${c.customerId.replace('KP-', '')}`); }} className="text-[0.7rem] font-bold text-[var(--kpc-ink-2)] hover:text-[var(--kpc-brand-ink)] max-w-[140px] block truncate">{c.customerName}</button> : <span className="text-[var(--kpc-ink-3)]">—</span> },
    { key: 'risk', header: t.common.risk, render: (c) => <Chip tone={toneOfRisk(c.riskLevel)}>{c.riskLevel}</Chip> },
    { key: 'pr', header: t.caseP.priorityCol, render: (c) => <Chip tone={c.priority === 'URGENT' ? 'critical' : c.priority === 'HIGH' ? 'high' : c.priority === 'MEDIUM' ? 'medium' : 'low'}>{c.priority}</Chip> },
    { key: 'alerts', header: t.caseP.linkedAlert, render: (c) => c.relatedAlertIds.length ? <span className="kpc-mono text-[0.64rem] font-bold text-[var(--kpc-ink-3)]">{c.relatedAlertIds.length}</span> : <span className="text-[var(--kpc-ink-3)]">—</span> },
    { key: 'of', header: t.caseP.officerCol, render: (c) => <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-[var(--kpc-ink-2)]"><Avatar name={c.assignedOfficerName} size={20} /><span className="truncate max-w-[110px]">{c.assignedOfficerName}</span></span> },
    { key: 'sla', header: t.common.sla, sortVal: (r) => r.deadlineSla, render: (c) => <Age iso={c.deadlineSla} rel={p.relTime} /> },
    { key: 'st', header: t.common.status, render: (c) => <Chip tone={toneOfRisk(c.status)}>{chipTxt(c.status, t)}</Chip> },
    { key: 'upd', header: t.caseP.updatedCol, sortVal: (r) => r.updatedAt, render: (c) => <Age iso={c.updatedAt} rel={p.relTime} /> },
  ];

  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={FileSearch} title={t.caseP.title} sub={t.caseP.subtitle} actions={<button onClick={() => p.pushToast('info', t.common.export, `${filtered.length} rows (demo)`, true)} className="kpc-btn kpc-btn-outline"><Download className="w-4 h-4" /> {t.common.export}</button>} />
      <Card flat className="mb-4 p-3">
        <div className="flex flex-col xl:flex-row gap-2.5">
          <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder={`${t.caseP.title} — ${t.common.search}`} className="!text-[0.78rem]" wrapClass="flex-1 min-w-[220px]" aria-label={t.common.search} />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); pg.reset(); }} aria-label={t.common.status}>
            <option value="OPEN">{t.invP.active}</option>
            {['ALL', 'ASSIGNED', 'UNDER_REVIEW', 'WAITING_FOR_INFO', 'ESCALATED', 'PENDING_DECISION', 'RESOLVED', 'REOPENED'].map((v) => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
          </Select>
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); pg.reset(); }} aria-label={t.caseP.priorityCol}>
            <option value="ALL">{t.common.filter} — {t.caseP.priorityCol}</option>
            {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </div>
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <CkTable aria-label={t.caseP.title} cols={cols} rows={pg.slice} rowKey={(c) => c.id} onRow={(c) => router.push(`/compliance/cases/${c.caseNumber}`)} dense />
        {!pg.slice.length && <EmptyState title={t.caseP.empty} />}
        <Paginator {...pg} total={filtered.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
