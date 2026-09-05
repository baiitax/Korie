'use client';
import { Users, ArrowLeftRight, ShieldCheck } from 'lucide-react';
import { useCompliancePortal } from '@/components/compliance/CompliancePortalContext';
import { Card, Chip, PageHead, Avatar, useBoot, PageSkel, KeyVal } from '@/components/compliance/ui/Ck';
import { Age } from '@/components/compliance/workspaces/helpers';

const JUR: Record<string, string> = { NE: '🇳🇪 Niger Republic (BCEAO/CENTIF)', NG: '🇳🇬 Nigeria (CBN/NFIU)', CROSS_BORDER: '🌍 Cross-border desk', ALL: '🌍 Cross-border central' };
export default function TeamPage() {
  const p = useCompliancePortal();
  const { ready } = useBoot(360);
  if (!ready) return <PageSkel />;
  const mask = (e: string) => e.replace(/^(.).+@/, '$1•••••@');
  return (
    <div>
      <PageHead icon={Users} title="Compliance Team & RBAC" sub="Officer roles, dual-control levels and jurisdictional assignments (view-only in demo; RBAC is enforced server-side)." />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {p.officers.map((o) => {
          const active = p.currentOfficer.id === o.id;
          return (
            <div key={o.id} className={`kpc-card p-4 flex flex-col ${active ? 'ring-1 ring-teal-500/40 border-teal-500/40' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <Avatar name={o.fullName} size={44} />
                <div className="flex flex-col items-end gap-1">
                  <Chip tone={o.status === 'ACTIVE' ? 'ok' : 'warn'}>{o.status}</Chip>
                  <span className="kpc-mono text-[0.6rem] font-extrabold text-[var(--kpc-ink-3)]">{o.id}</span>
                </div>
              </div>
              <p className="text-[0.9rem] font-extrabold text-[var(--kpc-ink)] leading-tight">{o.fullName}</p>
              <p className="text-[0.7rem] font-extrabold text-[var(--kpc-brand-ink)] mt-0.5 uppercase tracking-wide">{o.role.replace(/_/g, ' ')}</p>
              <div className="mt-3 space-y-1.5">
                <KeyVal k="Email" v={mask(o.email)} />
                <KeyVal k="Station" v={JUR[o.jurisdiction] ?? o.jurisdiction} />
                {o.assignedCasesCount != null && <KeyVal k="Assigned cases" v={String(o.assignedCasesCount)} />}
                {o.lastActiveAt && <KeyVal k="Last active" v={<Age iso={o.lastActiveAt} rel={p.relTime} />} />}
              </div>
              <div className="mt-4 pt-3 border-t border-[rgba(var(--kpc-ring),0.4)]">
                {active ? (
                  <div className="flex items-center justify-center gap-2 text-[0.7rem] font-extrabold text-teal-600 dark:text-teal-400 py-2 rounded-lg bg-teal-500/10 border border-teal-500/25"><ShieldCheck className="w-4 h-4" /> ACTIVE SESSION — YOU</div>
                ) : (
                  <button onClick={() => p.setCurrentOfficer(o)} className="kpc-btn kpc-btn-outline kpc-btn-sm w-full"><ArrowLeftRight className="w-3.5 h-3.5" /> Switch session to this officer</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Card flat className="mt-4 p-3 text-[0.66rem] font-semibold text-[var(--kpc-ink-3)]">Demo: session switching updates the active officer used for audit attribution inside this browser only. Role permissions remain view-only — real authorization stays on the backend.</Card>
    </div>
  );
}
