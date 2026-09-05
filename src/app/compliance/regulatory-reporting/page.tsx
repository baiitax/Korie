'use client';
import React, { useMemo, useState } from 'react';
import { FileCheck2, Send, Search } from 'lucide-react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { Card, Chip, PageHead, Input, Select, Modal, KeyVal, EmptyState } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

export default function RegulatoryReportingPage() {
  const c = useCompliance();
  const { regulatoryReports, submitRegulatoryReport, formatCurrency, formatDate, selectedJurisdiction } = c;
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const rows = useMemo(() => regulatoryReports
    .filter((r) => (status === 'ALL' ? true : r.filingStatus === status))
    .filter((r) => (selectedJurisdiction === 'ALL' ? true : r.jurisdiction.includes(selectedJurisdiction)))
    .filter((r) => !q.trim() || `${r.regulator} ${r.reportType} ${r.reportingPeriod} ${r.id}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => ((b.createdAt ?? '') < (a.createdAt ?? '') ? -1 : 1)), [regulatoryReports, status, q, selectedJurisdiction]);
  const pg = usePaging(rows, 7);
  const active = regulatoryReports.find((r) => r.id === confirmId);
  const tone = (s: string) => (['SUBMITTED', 'ACCEPTED', 'ACKNOWLEDGED'].includes(s) ? 'ok' : s === 'REJECTED' ? 'critical' : s === 'READY_FOR_SUBMISSION' ? 'warn' : 'dim') as 'ok' | 'critical' | 'warn' | 'dim';
  const canSubmit = (s: string) => ['READY_FOR_SUBMISSION', 'PENDING_MLRO_APPROVAL', 'DRAFT'].includes(s);
  return (
    <div>
      <PageHead icon={FileCheck2} title="Regulatory Reporting" sub="STR/CTR and statutory returns to CBN, NFIU, BCEAO and CENTIF — XOF-first sample data." />
      <Card flat className="mb-4 p-3">
        <div className="flex flex-col xl:flex-row gap-2.5">
          <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder="Search filings…" className="!text-[0.78rem]" wrapClass="flex-1 min-w-[220px]" icon={<Search className="w-4 h-4" />} aria-label="Search filings" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); pg.reset(); }} aria-label="Status filter">
            <option value="ALL">All statuses</option>
            {['DRAFT', 'PENDING_MLRO_APPROVAL', 'READY_FOR_SUBMISSION', 'SUBMITTED', 'ACCEPTED', 'ACKNOWLEDGED', 'REJECTED'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pg.slice.map((r) => (
          <div key={r.id} className="kpc-card p-4 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <Chip tone="dim">{r.regulator}</Chip>
              <Chip tone={tone(r.filingStatus)}>{r.filingStatus.replace(/_/g, ' ')}</Chip>
            </div>
            <p className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{r.reportType.replace(/_/g, ' ')}</p>
            <p className="text-[0.64rem] kpc-mono text-[var(--kpc-ink-3)]">{r.id} · {r.jurisdiction.replace(/_/g, ' ')}</p>
            <div className="grid grid-cols-2 gap-x-6 mt-3">
              <KeyVal k="Period" v={r.reportingPeriod} />
              <KeyVal k="Txns" v={String(r.includedTransactionCount)} />
              <KeyVal k="Value" v={formatCurrency(r.totalValueReported, r.currency)} strong />
            </div>
            <p className="text-[0.62rem] text-[var(--kpc-ink-3)] mt-2">Prepared: {r.preparedBy ?? '—'} · {r.submissionDate ? formatDate(r.submissionDate) : formatDate(r.createdAt ?? '')}</p>
            <div className="mt-auto pt-2">
              {r.acknowledgementRef && <p className="kpc-mono text-[0.62rem] font-bold text-[var(--kpc-ink-3)] mb-2">Ref {r.acknowledgementRef}</p>}
              {canSubmit(r.filingStatus) && <button onClick={() => setConfirmId(r.id)} className="kpc-btn kpc-btn-primary kpc-btn-sm w-full"><Send className="w-3.5 h-3.5" /> Submit filing (demo)</button>}
            </div>
          </div>
        ))}
        {!pg.slice.length && <div className="md:col-span-2 xl:col-span-3"><Card><EmptyState title="No filings match the current filters." /></Card></div>}
      </div>
      <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
      <Modal open={!!active} onClose={() => setConfirmId(null)} title={`Submit filing — ${active?.id}`}
        footer={<><button onClick={() => setConfirmId(null)} className="kpc-btn kpc-btn-ghost">Cancel</button>
          <button onClick={() => { if (active) submitRegulatoryReport(active.id); setConfirmId(null); }} className="kpc-btn kpc-btn-primary">Submit</button></>}>
        {active && <p className="text-[0.74rem] text-[var(--kpc-ink-2)]">File <b>{active.reportType.replace(/_/g, ' ')}</b> for period <b>{active.reportingPeriod}</b> to <b>{active.regulator}</b>? An acknowledgement reference is generated and the event is audit-logged. Demo mode: the regulator channel is simulated.</p>}
      </Modal>
    </div>
  );
}
