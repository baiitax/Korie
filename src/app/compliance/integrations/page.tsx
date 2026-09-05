'use client';
import React, { useMemo, useState } from 'react';
import { Plug2 } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Select, useBoot, PageSkel, EmptyState } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

export default function IntegrationsPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(380);
  const [status, setStatus] = useState('ALL');
  const rows = useMemo(() => p.integrations
    .filter((i) => (status === 'ALL' ? true : i.status === status))
    .sort((a, b) => (a.status === 'CONNECTED' ? -1 : 1) - (b.status === 'CONNECTED' ? -1 : 1) || (a.lastSyncAt < b.lastSyncAt ? 1 : -1)), [p.integrations, status]);
  const pg = usePaging(rows, 8);
  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={Plug2} title={t.intP.title} sub={t.intP.subtitle} />
      <div className="mb-4 flex items-center gap-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); pg.reset(); }} className="!w-56" aria-label={t.intP.statusCol}>
          <option value="ALL">{t.common.all}</option>
          {['CONNECTED', 'DEGRADED', 'PAUSED', 'ERROR'].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <span className="text-[0.62rem] text-[var(--kpc-ink-3)] font-semibold">{t.common.demoNote}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {pg.slice.map((i) => (
          <div key={i.id} className="kpc-card p-4 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[0.82rem] font-extrabold text-[var(--kpc-ink)]">{i.provider}</p>
              <Chip tone={i.status === 'CONNECTED' ? 'ok' : i.status === 'DEGRADED' ? 'warn' : i.status === 'ERROR' ? 'critical' : 'dim'}>{i.status}</Chip>
            </div>
            <p className="text-[0.7rem] text-[var(--kpc-ink-2)]">{i.purpose}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <Chip tone="dim">{i.kind}</Chip>
              <Chip tone="dim">{i.country.replace('+', ' + ')}</Chip>
              <Chip tone="dim" className="kpc-mono">{i.authMode}</Chip>
              {i.latencyMs != null && <Chip tone={i.latencyMs < 500 ? 'ok' : i.latencyMs < 1200 ? 'warn' : 'high'}>{i.latencyMs} ms</Chip>}
            </div>
            <div className="mt-auto pt-3 text-[0.62rem] font-semibold text-[var(--kpc-ink-3)]">
              <p>{t.intP.lastSync} <Age iso={i.lastSyncAt} rel={p.relTime} /></p>
              <p className="kpc-mono mt-0.5">POST {i.webhookPath}</p>
            </div>
          </div>
        ))}
        {!pg.slice.length && <div className="md:col-span-2 2xl:col-span-3"><Card><EmptyState title={t.common.noResults} /></Card></div>}
      </div>
      <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
    </div>
  );
}
