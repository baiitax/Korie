'use client';
import React, { useMemo, useState } from 'react';
import { Lock, CheckCircle2, Unlock, Search } from 'lucide-react';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { Card, Chip, PageHead, Input, Select, Modal, KeyVal, EmptyState, Avatar, toneOfRisk } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

export default function RestrictionsPage() {
  const c = useCompliance();
  const { restrictions, approveAccountRestriction, liftAccountRestriction, formatDate, selectedJurisdiction } = c;
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [liftTarget, setLiftTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const rows = useMemo(() => restrictions
    .filter((r) => (status === 'ALL' ? true : r.status === status))
    .filter((r) => { const sj = selectedJurisdiction as string; return sj === 'ALL' ? true : r.jurisdiction === sj; })
    .filter((r) => !q.trim() || `${r.targetEntityName} ${r.id} ${r.reason}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1)), [restrictions, status, q, selectedJurisdiction]);
  const pg = usePaging(rows, 7);
  const active = restrictions.find((r) => r.id === liftTarget);
  const tone = (s: string) => (s === 'ACTIVE' ? 'ok' : s === 'LIFTED' ? 'dim' : s.includes('PENDING') ? 'warn' : 'high') as 'ok' | 'dim' | 'warn' | 'high';
  return (
    <div>
      <PageHead icon={Lock} title="Account Restrictions" sub="Maker/checker restriction desk — freezes, spending limits and court orders across NE and NG." />
      <Card flat className="mb-4 p-3">
        <div className="flex flex-col xl:flex-row gap-2.5">
          <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder="Search restrictions…" className="!text-[0.78rem]" wrapClass="flex-1 min-w-[220px]" icon={<Search className="w-4 h-4" />} aria-label="Search restrictions" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); pg.reset(); }} aria-label="Status filter">
            <option value="ALL">All statuses</option>
            {['ACTIVE', 'PENDING_MAKER_CHECKER', 'LIFTED'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pg.slice.map((r) => (
          <div key={r.id} className="kpc-card p-4 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="kpc-mono text-[0.68rem] font-extrabold text-[var(--kpc-brand-ink)]">{r.id}</span>
              <Chip tone={tone(r.status)}>{r.status.replace(/_/g, ' ')}</Chip>
            </div>
            <p className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)] truncate">{r.targetEntityName}</p>
            <p className="text-[0.62rem] kpc-mono text-[var(--kpc-ink-3)]">{r.targetEntityType} · {r.targetEntityId}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <Chip tone="warn">{r.restrictionType.replace(/_/g, ' ')}</Chip>
              {r.limitAmount != null && <Chip tone="dim" className="kpc-mono">{c.formatCurrency(r.limitAmount)}</Chip>}
              {(r.jurisdiction as string) !== 'ALL' && <Chip tone="dim">{r.jurisdiction === 'NE' ? '🇳🇪' : '🇳🇬'} {r.jurisdiction}</Chip>}
            </div>
            <p className="text-[0.7rem] text-[var(--kpc-ink-2)] mt-2.5 flex-1 leading-relaxed">{r.reason}{r.courtOrderReference ? ` · Court ref ${r.courtOrderReference}` : ''}</p>
            <KeyVal k="Applied" v={`${formatDate(r.appliedAt)} · ${r.makerOfficerName}`} />
            {r.status !== 'LIFTED' && (
              <div className="flex gap-2 mt-2">
                {(r.approvalStatus === 'PENDING_APPROVAL' || r.status === 'PENDING_MAKER_CHECKER') && (
                  <button onClick={() => approveAccountRestriction(r.id)} className="kpc-btn kpc-btn-ok kpc-btn-sm flex-1"><CheckCircle2 className="w-3.5 h-3.5" /> Approve (checker)</button>
                )}
                <button onClick={() => setLiftTarget(r.id)} className="kpc-btn kpc-btn-outline kpc-btn-sm flex-1"><Unlock className="w-3.5 h-3.5" /> Lift</button>
              </div>
            )}
          </div>
        ))}
        {!pg.slice.length && <div className="md:col-span-2 xl:col-span-3"><Card><EmptyState title="No restrictions match the current filters." /></Card></div>}
      </div>
      <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
      <Modal open={!!active} onClose={() => { setLiftTarget(null); setReason(''); }} title={`Lift restriction — ${active?.id}`}
        footer={<><button onClick={() => { setLiftTarget(null); setReason(''); }} className="kpc-btn kpc-btn-ghost">Cancel</button>
          <button disabled={!reason.trim()} onClick={() => { if (active) liftAccountRestriction(active.id, reason.trim()); setLiftTarget(null); setReason(''); }} className="kpc-btn kpc-btn-primary">Confirm lift</button></>}>
        {active && <div className="mb-3"><KeyVal k="Entity" v={active.targetEntityName} /><KeyVal k="Type" v={active.restrictionType.replace(/_/g, ' ')} /><p className="text-[0.7rem] text-[var(--kpc-ink-3)] font-semibold">A reason is mandatory — it is written to the audit log.</p></div>}
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lift reason (audit logged)…" className="kpc-input !leading-relaxed resize-none" />
      </Modal>
    </div>
  );
}
