'use client';
import React, { useMemo, useState } from 'react';
import { History, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Input, Select, useBoot, PageSkel, EmptyState, KeyVal } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

export default function AuditPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(400);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('ALL');
  const [result, setResult] = useState('ALL');
  const [openId, setOpenId] = useState<string | null>(null);

  const actions = useMemo(() => { const m: Record<string, boolean> = {}; p.audit.forEach((a) => (m[a.action] = true)); return Object.keys(m).sort(); }, [p.audit]);
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...p.audit]
      .filter((a) => (action === 'ALL' ? true : a.action === action))
      .filter((a) => (result === 'ALL' ? true : a.result === result))
      .filter((a) => !query || `${a.id} ${a.officerName} ${a.resource} ${a.resourceId} ${a.detail ?? ''}`.toLowerCase().includes(query))
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [p.audit, q, action, result]);
  const pg = usePaging(rows, 12);
  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={History} title={t.audP.title} sub={t.audP.subtitle} actions={<button onClick={() => p.pushToast('info', t.common.export, `${t.audP.exportNote} (CSV blocked in demo)`, true)} className="kpc-btn kpc-btn-outline"><Download className="w-4 h-4" /> {t.common.export}</button>} />
      <Card flat className="mb-4 p-3">
        <div className="flex flex-col xl:flex-row gap-2.5">
          <Input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder={`${t.audP.title} — ${t.common.search}`} className="!text-[0.78rem]" wrapClass="flex-1 min-w-[220px]" aria-label={t.common.search} />
          <Select value={action} onChange={(e) => { setAction(e.target.value); pg.reset(); }} aria-label={t.audP.actionCol}>
            <option value="ALL">{t.common.filter} — {t.audP.actionCol}</option>
            {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </Select>
          <Select value={result} onChange={(e) => { setResult(e.target.value); pg.reset(); }} aria-label={t.audP.resultCol}>
            <option value="ALL">{t.common.filter} — {t.audP.resultCol}</option>
            {['SUCCESS', 'FAILED', 'BLOCKED'].map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
      </Card>
      <Card flat pad={false} className="overflow-hidden">
        <div className="divide-y divide-[rgba(var(--kpc-ring),0.3)]">
          {pg.slice.map((a) => (
            <div key={a.id}>
              <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[rgba(var(--kpc-ring),0.25)]">
                <span className="kpc-mono text-[0.66rem] font-extrabold text-[var(--kpc-brand-ink)] w-20 shrink-0">{a.id}</span>
                <Chip tone={a.result === 'SUCCESS' ? 'ok' : a.result === 'BLOCKED' ? 'high' : 'critical'} className="shrink-0">{a.result}</Chip>
                <span className="text-[0.72rem] font-bold text-[var(--kpc-ink)] flex-1 truncate"><span className="kpc-mono text-[0.64rem] text-[var(--kpc-ink-3)]">{a.action}</span> — {a.resource.replace(/_/g, ' ')}</span>
                <span className="text-[0.66rem] font-semibold text-[var(--kpc-ink-2)] hidden md:block w-32 truncate">{a.officerName}</span>
                <span className="hidden lg:block w-40"><Age iso={a.at} rel={p.relTime} /></span>
                {openId === a.id ? <ChevronUp className="w-4 h-4 text-[var(--kpc-ink-3)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--kpc-ink-3)] shrink-0" />}
              </button>
              {openId === a.id && (
                <div className="px-4 pb-4 pt-1 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 kpc-inset mx-4 mb-3 p-3 rounded-lg">
                  <KeyVal k={t.audP.officerCol} v={`${a.officerName} (${a.officerRole.replace(/_/g, ' ')})`} />
                  <KeyVal k={t.audP.resourceCol} v={a.resource.replace(/_/g, ' ')} />
                  <KeyVal k={t.audP.resourceId} v={<span className="kpc-mono">{a.resourceId}</span>} />
                  <KeyVal k={t.audP.dateCol} v={p.fmtDT(a.at)} />
                  <KeyVal k={t.audP.sessionCol} v={<span className="kpc-mono">{a.sessionMasked}</span>} />
                  <KeyVal k={t.audP.details} v={a.detail ?? '—'} />
                </div>
              )}
            </div>
          ))}
        </div>
        {!pg.slice.length && <EmptyState title={t.audP.noAudit} />}
        <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
