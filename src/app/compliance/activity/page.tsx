'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity as ActivityIcon, UserCheck, Building2, ShieldAlert, Fingerprint, FileSearch, Lock, Settings2, FileBarChart2 } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Tabs, useBoot, PageSkel, EmptyState, Avatar } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator, Age } from '@/components/compliance/workspaces/helpers';

const TABS = ['ALL', 'KYC', 'KYB', 'AML', 'SCREENING', 'CASE', 'RESTRICTION', 'SYSTEM', 'REPORT', 'APPROVAL'] as const;
const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  KYC: UserCheck, KYB: Building2, AML: ShieldAlert, SCREENING: Fingerprint, CASE: FileSearch, RESTRICTION: Lock, SYSTEM: Settings2, REPORT: FileBarChart2, APPROVAL: Settings2,
};
export default function ActivityPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(380);
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const rows = useMemo(() => [...p.activity]
    .filter((a) => (tab === 'ALL' ? true : a.type === tab))
    .sort((a, b) => (a.at < b.at ? 1 : -1)), [p.activity, tab]);
  const pg = usePaging(rows, 15);
  if (!ready) return <PageSkel />;
  return (
    <div>
      <PageHead icon={ActivityIcon} title={t.nav.activity} sub={t.audP.subtitle} />
      <Tabs className="mb-4 overflow-x-auto" items={TABS.map((s) => ({ value: s, label: s === 'ALL' ? t.common.all : s.replace(/_/g, ' '), count: s === 'ALL' ? p.activity.length : p.activity.filter((a) => a.type === s).length }))} value={tab} onChange={(v) => setTab(v as typeof tab)} />
      <Card flat pad={false} className="overflow-hidden">
        <div className="divide-y divide-[rgba(var(--kpc-ring),0.3)]">
          {pg.slice.map((a) => {
            const Icon = ICON[a.type] ?? Settings2;
            return (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.tone === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' : a.tone === 'HIGH' ? 'bg-orange-500/10 text-orange-500' : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'}`}><Icon className="w-4 h-4" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.74rem] font-bold text-[var(--kpc-ink)] leading-snug">{a.headline}</p>
                  <p className="text-[0.64rem] text-[var(--kpc-ink-3)] truncate">{a.sub}</p>
                  <p className="text-[0.6rem] font-semibold text-[var(--kpc-ink-3)] mt-1 flex items-center gap-1.5"><Avatar name={a.actorName} size={16} />{a.actorName}{a.actorRole ? ` · ${a.actorRole}` : ''} · {p.fmtDT(a.at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Chip tone={a.tone === 'OK' ? 'ok' : a.tone === 'CRITICAL' ? 'critical' : a.tone === 'HIGH' ? 'high' : 'warn'}>{a.tone}</Chip>
                  {a.href && <Link href={a.href} className="kpc-btn kpc-btn-ghost kpc-btn-sm">{t.common.open}</Link>}
                </div>
              </div>
            );
          })}
        </div>
        {!pg.slice.length && <EmptyState title={t.common.noResults} />}
        <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
      </Card>
    </div>
  );
}
