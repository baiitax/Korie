'use client';
import React, { useMemo, useState } from 'react';
import { FileBarChart2, FileDown, Play } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Select, useBoot, PageSkel, Modal, EmptyState, KeyVal } from '@/components/compliance/ui/Ck';
import { usePaging, Paginator } from '@/components/compliance/workspaces/helpers';

export default function ReportsPage() {
  const p = useCompliancePortal();
  const { t } = p;
  const { ready } = useBoot(380);
  const [kind, setKind] = useState('ALL');
  const [preview, setPreview] = useState<string | null>(null);
  const rows = useMemo(() => {
    const sorted = [...p.reports].sort((a, b) => String(a.lastGeneratedAt ?? '').localeCompare(String(b.lastGeneratedAt ?? '')) * -1);
    return kind === 'ALL' ? sorted : sorted.filter((r) => r.kind === kind);
  }, [p.reports, kind]);
  const pg = usePaging(rows, 9);
  if (!ready) return <PageSkel />;
  const kinds = p.reports.reduce<string[]>((acc, r) => (acc.includes(r.kind) ? acc : [...acc, r.kind]), []);
  const active = p.reports.find((r) => r.id === preview);
  return (
    <div>
      <PageHead icon={FileBarChart2} title={t.rptP.title} sub={t.rptP.subtitle} />
      <div className="mb-4 flex items-center gap-3">
        <Select value={kind} onChange={(e) => { setKind(e.target.value); pg.reset(); }} className="!w-56" aria-label={t.intP.kind}>
          <option value="ALL">{t.common.all}</option>
          {kinds.map((k) => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
        </Select>
        <p className="text-[0.62rem] text-[var(--kpc-ink-3)] font-semibold">XOF-first sample · {rows.length} report definitions</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {pg.slice.map((r) => (
          <div key={r.id} className="kpc-card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="kpc-mono text-[0.7rem] font-extrabold text-[var(--kpc-brand-ink)]">{r.id}</span>
              <Chip tone={r.status === 'READY' ? 'ok' : r.status === 'SCHEDULED' ? 'warn' : 'dim'}>{r.status.replace(/_/g, ' ')}</Chip>
            </div>
            <p className="text-[0.8rem] font-extrabold text-[var(--kpc-ink)]">{r.title}</p>
            <p className="text-[0.68rem] text-[var(--kpc-ink-3)] mt-1 flex-1 leading-relaxed">{r.description}</p>
            <div className="flex items-center gap-2 mt-3 text-[0.62rem] font-bold text-[var(--kpc-ink-3)]">
              <span className="kpc-chip tone-dim">{r.cadence}</span>
              <span>{r.formats.join(' · ')}</span>
            </div>
            <KeyVal k={t.rptP.lastGenerated} v={r.lastGeneratedAt ? p.relTime(r.lastGeneratedAt) : t.rptP.never} />
            <div className="flex gap-2 mt-2">
              <button onClick={() => { p.generateReport(r.id); }} className="kpc-btn kpc-btn-primary kpc-btn-sm flex-1"><Play className="w-3.5 h-3.5" /> {t.rptP.generate}</button>
              <button onClick={() => setPreview(r.id)} className="kpc-btn kpc-btn-outline kpc-btn-sm flex-1"><FileDown className="w-3.5 h-3.5" /> {t.rptP.preview}</button>
            </div>
          </div>
        ))}
        {!pg.slice.length && <div className="md:col-span-2 2xl:col-span-3"><Card><EmptyState title={t.common.noResults} /></Card></div>}
      </div>
      <Paginator {...pg} total={rows.length} setPage={pg.setPage} />
      <Modal open={!!active} onClose={() => setPreview(null)} title={t.rptP.previewTitle}
        footer={<button onClick={() => { p.pushToast('info', t.rptP.exportCsv, `${active?.id} (demo export)`, true); }} className="kpc-btn kpc-btn-primary">{t.rptP.exportCsv}</button>}>
        {active && <div className="kpc-inset p-4 rounded-xl"><KeyVal k={t.common.title} v={active.title} /><KeyVal k={t.rptP.cadence} v={active.cadence} /><KeyVal k={t.rptP.lastGenerated} v={active.lastGeneratedAt ? p.fmtDT(active.lastGeneratedAt) : t.rptP.never} />
          <p className="text-[0.72rem] font-semibold text-[var(--kpc-ink-2)] mt-2">{active.description}</p>
          <p className="text-[0.64rem] text-[var(--kpc-ink-3)] mt-3">{t.rptP.previewNote}</p></div>}
      </Modal>
    </div>
  );
}
