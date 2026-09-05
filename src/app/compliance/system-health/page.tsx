'use client';
import React, { useMemo, useState } from 'react';
import { HeartPulse, CheckCircle2, AlertTriangle, XCircle, RefreshCcw } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Select, useBoot, PageSkel, EmptyState } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

export default function SystemHealthPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(380);
  const [cat, setCat] = useState('ALL');
  const rows = useMemo(() => p.health
    .filter((h) => (cat === 'ALL' ? true : h.category === cat))
    .sort((a, b) => (a.status === 'OPERATIONAL' ? 1 : 0) - (b.status === 'OPERATIONAL' ? 1 : 0) || (a.lastCheckAt < b.lastCheckAt ? -1 : 1)), [p.health, cat]);
  const pg = usePaging(rows, 9);
  const summary = useMemo(() => {
    const allOperational = p.health.every((h) => h.status === 'OPERATIONAL');
    const hasError = p.health.some((h) => h.status === 'UNAVAILABLE');
    const degraded = p.health.some((h) => h.status === 'DEGRADED');
    return { allOperational, hasError, degraded };
  }, [p.health]);
  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={HeartPulse} title={t.hthP.title} sub={t.hthP.subtitle} />
      <div className={`flex items-center gap-3 mb-4 rounded-xl border px-4 py-3 ${summary.hasError ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400' : summary.degraded ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
        {summary.hasError ? <XCircle className="w-5 h-5" /> : summary.degraded ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
        <div><p className="text-[0.82rem] font-extrabold">{summary.allOperational ? t.hthP.summaryOperational : summary.degraded ? t.hthP.summaryDegraded : t.common.degraded}</p>
        <p className="text-[0.64rem] font-semibold opacity-80">{t.hthP.refreshNote}</p></div>
        <button onClick={() => p.pushToast('info', t.hthP.refreshNote, undefined, false)} className="kpc-btn kpc-btn-ghost kpc-btn-sm ml-auto shrink-0"><RefreshCcw className="w-3.5 h-3.5" /> Refresh</button>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <Select value={cat} onChange={(e) => { setCat(e.target.value); pg.reset(); }} className="!w-64" aria-label={t.hthP.category}>
          <option value="ALL">{t.common.all}</option>
          {p.health.reduce<string[]>((acc, h) => (acc.includes(h.category) ? acc : [...acc, h.category]), []).map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {pg.slice.map((h) => (
          <div key={h.id} className="kpc-card p-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{h.name}</p>
              <Chip tone={h.status === 'OPERATIONAL' ? 'ok' : h.status === 'DEGRADED' ? 'warn' : h.status === 'UNAVAILABLE' ? 'critical' : 'dim'}>{h.status.replace(/_/g, ' ')}</Chip>
            </div>
            <p className="text-[0.66rem] font-semibold text-[var(--kpc-ink-3)] uppercase tracking-wide">{h.category}</p>
            {h.detail && <p className="text-[0.68rem] text-[var(--kpc-ink-2)] mt-2">{h.detail}</p>}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {h.latencyMs != null && <Chip tone="dim" className="kpc-mono">{h.latencyMs} ms</Chip>}
              <span className="text-[0.62rem] font-semibold text-[var(--kpc-ink-3)] self-center">{t.hthP.lastCheck} <Age iso={h.lastCheckAt} rel={p.relTime} /></span>
            </div>
          </div>
        ))}
        {!pg.slice.length && <div className="md:col-span-2 2xl:col-span-3"><Card><EmptyState title={t.common.noResults} /></Card></div>}
      </div>
      <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
    </div>
  );
}
