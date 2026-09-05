'use client';
import React, { useMemo, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, PageHead, useBoot, PageSkel, EmptyState } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator } from '@/components/compliance/workspaces/helpers';

const LISTS: { key: string; short: string; kind: string }[] = [
  { key: 'UNSC_CONSOLIDATED', short: 'UN', kind: 'SANCTIONS' }, { key: 'OFAC_SDN', short: 'US', kind: 'SANCTIONS' },
  { key: 'EU_CONSOLIDATED', short: 'EU', kind: 'SANCTIONS' }, { key: 'UK_HMT', short: 'UK', kind: 'SANCTIONS' },
  { key: 'INTERPOL_RED_NOTICE', short: 'INT', kind: 'SANCTIONS' }, { key: 'WAEMU_BL', short: 'WAEMU', kind: 'SANCTIONS' },
  { key: 'NIGERIA_CBN', short: 'NG', kind: 'SANCTIONS' }, { key: 'NIGER_MIC', short: 'NE', kind: 'SANCTIONS' },
  { key: 'FOREIGN_PEP', short: 'PEP', kind: 'PEP' }, { key: 'DOMESTIC_PEP', short: 'dPEP', kind: 'PEP' },
];
export default function WatchlistsPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(380);
  const rows = useMemo(() => LISTS.map((l) => ({
    ...l, name: l.key.replace(/_/g, ' ').toLowerCase(),
    enrolled: l.kind === 'PEP' ? 4 : 2,
    updatedAt: '2025-06-01T04:00:00Z', status: 'ACTIVE',
  })), []);
  const pg = usePaging(rows, 10);
  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={ListChecks} title={t.wlP.title} sub={t.wlP.subtitle} />
      <Card flat pad={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="kpc-tbl" aria-label={t.wlP.title}>
            <thead><tr><th>{t.wlP.list}</th><th>{t.wlP.jurisdiction}</th><th>{t.wlP.records}</th><th>{t.wlP.lastUpdated}</th><th>{t.common.status}</th></tr></thead>
            <tbody>
              {pg.slice.map((l) => (
                <tr key={l.key} className="hover:bg-[rgba(var(--kpc-ring),0.35)]">
                  <td><span className="text-[0.76rem] font-extrabold text-[var(--kpc-ink)]">{l.name}</span></td>
                  <td><span className="kpc-chip tone-dim">{l.short === 'PEP' ? 'PEP' : l.short}</span></td>
                  <td><span className="kpc-mono text-[0.72rem] font-bold text-[var(--kpc-ink-2)]">{l.enrolled} {t.wlP.demoRec}</span></td>
                  <td><span className="text-[0.68rem] text-[var(--kpc-ink-3)]">{p.fmtDT(l.updatedAt)}</span></td>
                  <td><span className="kpc-chip tone-ok">{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!pg.slice.length && <EmptyState title={t.common.noResults} />}
        <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
