'use client';

/**
 * Compliance console primitives: the only place layout geometry, chips,
 * severity and field chrome are defined for this portal. Pages compose these
 * instead of writing classes, which is what keeps ~35 screens visually related
 * and contrast-checked once rather than 35 times.
 */

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Circle,
  Clock3,
  Info,
  OctagonAlert,
  ShieldAlert,
} from 'lucide-react';
import type { ComplianceSource } from '@/services/compliance/types';

/* ── Provenance: what is this data? ──────────────────────────────────────── */

export interface ProvenanceLike {
  source?: ComplianceSource;
  demoFallback?: boolean;
  derived?: boolean;
  latencyMs?: number;
  requestId?: string;
}

export type ProvenanceTone = 'live' | 'derived' | 'demo';

export function provenanceTone(resource?: ProvenanceLike | null): ProvenanceTone {
  if (!resource) return 'live';
  if (resource.source === 'demo' || resource.demoFallback) return 'demo';
  if (resource.derived) return 'derived';
  return 'live';
}

const PROV_TEXT: Record<ProvenanceTone, string> = {
  live: 'Live system',
  derived: 'Computed from live queues',
  demo: 'Demo data',
};

const PROV_EXPLAIN: Record<ProvenanceTone, string> = {
  live: 'Served by the KoriePay compliance service for this session.',
  derived:
    'Calculated here from the live alert, case and obligation queues. No numbers are stored or typed by hand.',
  demo:
    "These rows come from the portal's demonstration set. They are not produced by the ledger, the AML engine or the identity service, they reset on reload, and nothing submitted here is recorded.",
};

/**
 * Provenance is a first-class element, not a footnote: an officer deciding a
 * case must be able to see, without reading a paragraph, whether the queue in
 * front of them is the real one.
 */
export const Provenance: React.FC<{
  resource?: ProvenanceLike | null;
  /** Extra explanation for the tooltip, e.g. which endpoint answered. */
  detail?: string;
  className?: string;
}> = ({ resource, detail, className }) => {
  const tone = provenanceTone(resource ?? undefined);
  const title = [PROV_EXPLAIN[tone], detail, resource?.requestId ? `Request ${resource.requestId}` : null]
    .filter(Boolean)
    .join(' — ');
  return (
    <span className={`cmp-prov ${className ?? ''}`} data-source={tone} title={title}>
      <span aria-hidden="true">{tone === 'live' ? '●' : tone === 'derived' ? '∑' : '◌'}</span>
      <span>{PROV_TEXT[tone]}</span>
      <span className="sr-only">{PROV_EXPLAIN[tone]}</span>
    </span>
  );
};

/* ── Page frame ───────────────────────────────────────────────────────────── */

export const PageHead: React.FC<{
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  resource?: ProvenanceLike | null;
  detail?: string;
  /** "Back to queue" style link rendered above the title on mobile too. */
  back?: { href: string; label: string };
  eyebrow?: string;
}> = ({ title, description, actions, resource, detail, back, eyebrow }) => (
  <div className="cmp-page-head">
    <div className="min-w-0">
      {back ? (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          {back.label}
        </Link>
      ) : eyebrow ? (
        <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">{eyebrow}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h1 className="cmp-page-title">{title}</h1>
        {resource ? <Provenance resource={resource} detail={detail} /> : null}
      </div>
      {description ? <p className="cmp-page-sub">{description}</p> : null}
    </div>
    {actions ? <div className="cmp-page-actions">{actions}</div> : null}
  </div>
);

export const Panel: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  footnote?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, actions, footnote, flush, className, children }) => (
  <section className={`cmp-card ${flush ? 'cmp-card--flush' : ''} ${className ?? ''}`}>
    {title || actions ? (
      <header className="cmp-card__head">
        <div className="min-w-0">
          <div className="cmp-card__title">{title}</div>
          {subtitle ? <div className="cmp-cell-muted mt-0.5">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </header>
    ) : null}
    <div className="cmp-card__body">{children}</div>
    {footnote ? (
      <footer className="border-t border-[var(--border)] px-3.5 py-2 text-[11.5px] text-[var(--muted)]">
        {footnote}
      </footer>
    ) : null}
  </section>
);

/* ── Chips ───────────────────────────────────────────────────────────────── */

export type ChipTone = 'neutral' | 'critical' | 'high' | 'medium' | 'low' | 'clear';

const CHIP_ICON: Record<ChipTone, React.ComponentType<{ className?: string }>> = {
  neutral: Circle,
  critical: OctagonAlert,
  high: ShieldAlert,
  medium: AlertCircle,
  low: Info,
  clear: CheckCircle2,
};

export const Chip: React.FC<{ tone?: ChipTone; icon?: React.ReactNode; children: React.ReactNode; title?: string }> = ({
  tone = 'neutral',
  icon,
  children,
  title,
}) => {
  const Icon = CHIP_ICON[tone];
  return (
    <span className="cmp-chip" data-tone={tone} title={title}>
      {icon ?? <Icon aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};

const SEVERITY_TONE: Record<string, ChipTone> = {
  CRITICAL: 'critical',
  P0_CRITICAL: 'critical',
  HIGH: 'high',
  P1_HIGH: 'high',
  URGENT: 'high',
  MEDIUM: 'medium',
  P2_MEDIUM: 'medium',
  LOW: 'low',
  P3_LOW: 'low',
  VERY_LOW: 'low',
};

const STATUS_TONE: Record<string, ChipTone> = {
  NEW: 'high',
  QUEUED: 'medium',
  ASSIGNED: 'medium',
  IN_REVIEW: 'medium',
  UNDER_REVIEW: 'medium',
  INVESTIGATING: 'medium',
  ESCALATED: 'critical',
  POTENTIAL_MATCH: 'critical',
  CONFIRMED_MATCH: 'critical',
  PENDING: 'medium',
  PENDING_MAKER_CHECKER: 'medium',
  PENDING_DECISION: 'high',
  PENDING_MLRO_APPROVAL: 'high',
  DECISION_PENDING: 'high',
  ACTION_PENDING: 'high',
  INFORMATION_REQUESTED: 'low',
  WAITING_FOR_INFO: 'low',
  REQUIRES_INFO: 'low',
  INFORMATION_REQUEST: 'low',
  OVERDUE: 'critical',
  DUE_SOON: 'high',
  IMBALANCE_DETECTED: 'critical',
  SAFE_MODE: 'critical',
  DEGRADED: 'high',
  DISCONNECTED: 'critical',
  OFFLINE: 'critical',
  ACTIVE: 'clear',
  CONNECTED: 'clear',
  VERIFIED: 'clear',
  OPERATIONAL: 'clear',
  HEALTHY: 'clear',
  ACCEPTED: 'clear',
  ACKNOWLEDGED: 'clear',
  SUBMITTED: 'clear',
  RESOLVED: 'clear',
  CLOSED: 'neutral',
  DISMISSED: 'neutral',
  FALSE_POSITIVE: 'neutral',
  REJECTED: 'neutral',
  LIFTED: 'neutral',
  ARCHIVED: 'neutral',
  NOT_STARTED: 'low',
  EXPIRED: 'high',
  RESTRICTED: 'high',
  SUSPENDED: 'high',
  BLOCKED: 'high',
  HOLD: 'high',
  FLAG: 'medium',
  PASS: 'clear',
};

export function toneForSeverity(value?: string | null): ChipTone {
  return SEVERITY_TONE[String(value ?? '').toUpperCase()] ?? 'neutral';
}

export function toneForStatus(value?: string | null): ChipTone {
  return STATUS_TONE[String(value ?? '').toUpperCase()] ?? 'neutral';
}

/**
 * `label` must be the translated words for the state; the enum is only used to
 * pick the tone, never shown raw. Colour always travels with an icon and text.
 */
export const StatusChip: React.FC<{ status?: string | null; label: string; severity?: boolean; title?: string }> = ({
  status,
  label,
  severity,
  title,
}) => <Chip tone={severity ? toneForSeverity(status) : toneForStatus(status)} title={title}>{label}</Chip>;

/* ── KPI ─────────────────────────────────────────────────────────────────── */

export const Kpi: React.FC<{
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: 'neutral' | 'attention' | 'critical';
  icon?: React.ReactNode;
  href?: string;
  resource?: ProvenanceLike | null;
}> = ({ label, value, note, tone = 'neutral', icon, href, resource }) => {
  const body = (
    <>
      <div className="cmp-kpi__label">
        {icon ? <span className="text-[var(--muted)]">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="cmp-kpi__value tabular">{value}</div>
      {note ? <div className="cmp-kpi__note">{note}</div> : null}
      {resource ? <Provenance resource={resource} /> : null}
    </>
  );
  const className = `cmp-kpi ${href ? 'transition hover:border-[var(--border-strong)]' : ''}`;
  if (href) {
    return (
      <Link href={href} className={className} data-tone={tone}>
        {body}
      </Link>
    );
  }
  return (
    <div className={className} data-tone={tone}>
      {body}
    </div>
  );
};

/* ── Fields ──────────────────────────────────────────────────────────────── */

const fieldClass =
  'w-full min-h-[38px] rounded-[var(--cmp-radius-sm)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-disabled)]';

export const Field: React.FC<{
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, error, required, className, children }) => (
  <div className={`flex flex-col gap-1 ${className ?? ''}`}>
    <label htmlFor={htmlFor} className="text-[11.5px] font-bold text-[var(--foreground-muted)]">
      {label}
      {required ? <span className="text-[var(--sev-critical)]"> *</span> : null}
    </label>
    {children}
    {error ? (
      <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--sev-critical)]">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        {error}
      </p>
    ) : hint ? (
      <p className="text-[11.5px] text-[var(--muted)]">{hint}</p>
    ) : null}
  </div>
);

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }> = ({
  invalid,
  className,
  ...rest
}) => (
  <input
    {...rest}
    aria-invalid={invalid || undefined}
    className={`${fieldClass} ${invalid ? 'border-[var(--sev-critical)]' : ''} ${className ?? ''}`}
  />
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }> = ({
  invalid,
  className,
  ...rest
}) => (
  <textarea
    {...rest}
    aria-invalid={invalid || undefined}
    className={`${fieldClass} min-h-[84px] py-2 ${invalid ? 'border-[var(--sev-critical)]' : ''} ${className ?? ''}`}
  />
);

export const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...rest }) => (
  <select {...rest} className={`${fieldClass} pr-7 ${className ?? ''}`}>
    {children}
  </select>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'primary' | 'danger' | 'ghost';
    pending?: boolean;
    icon?: React.ReactNode;
  }
> = ({ variant = 'default', pending, icon, children, className, disabled, ...rest }) => (
  <button
    {...rest}
    type={rest.type ?? 'button'}
    disabled={disabled || pending}
    aria-busy={pending || undefined}
    data-variant={variant === 'default' ? undefined : variant}
    className={`cmp-btn ${className ?? ''}`}
  >
    {pending ? <Spinner label="Working" /> : icon}
    {children}
  </button>
);

export const Spinner: React.FC<{ label?: string; className?: string }> = ({ label, className }) => (
  <span
    role={label ? 'status' : undefined}
    className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ''}`}
  >
    {label ? <span className="sr-only">{label}</span> : null}
  </span>
);

/* ── Detail tabs ─────────────────────────────────────────────────────────── */

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  /** Marks a tab whose data source is not connected, without hiding it. */
  badge?: React.ReactNode;
}

/**
 * Tabs are deep-linkable (`/compliance/cases/alt-01#evidence`) because an
 * officer pastes those links into case notes. Roving focus follows the ARIA
 * authoring pattern so arrow keys move between tabs, not past them.
 */
export const DetailTabs: React.FC<{
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}> = ({ tabs, value, onChange, ariaLabel }) => {
  const listRef = useRef<HTMLDivElement | null>(null);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.findIndex((t) => t.id === value);
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
      onChange(tabs[next].id);
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[next]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : tabs.length - 1;
      onChange(tabs[target].id);
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus();
    }
  };

  return (
    <div className="cmp-tabs" role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} ref={listRef}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={value === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={value === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          className="cmp-tab"
        >
          {tab.label}
          {typeof tab.count === 'number' ? <span className="ml-1.5 tabular text-[11px] opacity-80">{tab.count}</span> : null}
          {tab.badge ? <span className="ml-1.5">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  );
};

/** Keeps `#hash` and the selected tab in sync, both directions. */
export function useHashTab(ids: string[], fallback: string): [string, (id: string) => void] {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return fallback;
    const hash = window.location.hash.replace('#', '');
    return ids.includes(hash) ? hash : fallback;
  });

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (ids.includes(hash)) setValue(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('|')]);

  const select = (id: string) => {
    setValue(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
    }
  };

  return [value, select];
}

/* ── Key/value detail ────────────────────────────────────────────────────── */

export const KeyList: React.FC<{
  items: { term: string; value: React.ReactNode; mono?: boolean; span?: boolean }[];
}> = ({ items }) => (
  <dl className="cmp-dl">
    {items.map((item) => (
      <div key={item.term} className={item.span ? 'sm:col-span-2' : undefined}>
        <dt className="cmp-dl__term">{item.term}</dt>
        <dd className={`cmp-dl__value ${item.mono ? 'cmp-ref' : ''}`}>{item.value}</dd>
      </div>
    ))}
  </dl>
);

export const RefLink: React.FC<{ href: string; label: string; children: React.ReactNode }> = ({ href, label, children }) => (
  <Link href={href} className="cmp-ref underline decoration-[var(--brand-border)] underline-offset-2 hover:text-[var(--brand-primary)]" aria-label={label}>
    {children}
  </Link>
);

export const SlaDue: React.FC<{ dueAt?: string; breached: boolean; overdueLabel: string; dueLabel: string }> = ({
  dueAt,
  breached,
  overdueLabel,
  dueLabel,
}) => {
  if (!dueAt) return <span className="cmp-cell-muted">{'\u2014'}</span>;
  return (
    <Chip tone={breached ? 'critical' : 'neutral'} icon={<Clock3 className="h-3 w-3" aria-hidden="true" />}>
      {breached ? overdueLabel : `${dueLabel} ${new Date(dueAt).toISOString().slice(0, 10)}`}
    </Chip>
  );
};

/* ── Sort affordance shared by table headers ─────────────────────────────── */

export const SortGlyph: React.FC<{ direction: 'asc' | 'desc' | null }> = ({ direction }) =>
  direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" aria-hidden="true" />
  ) : direction === 'desc' ? (
    <ArrowDown className="h-3 w-3" aria-hidden="true"
    />
  ) : (
    <ArrowUpDown className="h-3 w-3 opacity-45" aria-hidden="true" />
  );

/* ── Data-source disclosure ──────────────────────────────────────────────── */

/**
 * Every page carries its own data sheet: which section reads which endpoint,
 * what a failure means, and whether anything is demo-only. §84 asks for that
 * documentation; publishing it inside the product (instead of only in a
 * markdown file nobody opens) is what makes an officer or an auditor able to
 * check the claim without asking a developer.
 */
export const SourceNotes: React.FC<{
  title: string;
  rows: { section: string; source: string; note?: string; mode?: 'live' | 'demo' | 'none' }[];
}> = ({ title, rows }) => (
  <details className="cmp-card overflow-hidden">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-[12.5px] font-bold text-[var(--foreground)]">
      <span className="flex items-center gap-2">
        <Info className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden="true" />
        {title}
      </span>
      <span className="text-[11px] font-semibold text-[var(--muted)]">{rows.length}</span>
    </summary>
    <div className="border-t border-[var(--border)] p-3">
      <ul className="divide-y divide-[var(--border)]">
        {rows.map((row) => (
          <li key={row.section} className="grid gap-1 py-2 sm:grid-cols-[minmax(140px,1fr)_minmax(180px,1.4fr)] sm:gap-3">
            <span className="text-[12px] font-bold text-[var(--foreground)]">{row.section}</span>
            <span className="min-w-0">
              <span className="cmp-ref block break-all">{row.source}</span>
              {row.note ? <span className="mt-0.5 block text-[11.5px] text-[var(--foreground-muted)]">{row.note}</span> : null}
              {row.mode ? (
                <span className="mt-1 inline-block">
                  <Chip tone={row.mode === 'live' ? 'clear' : row.mode === 'demo' ? 'medium' : 'neutral'}>
                    {row.mode === 'live' ? 'Live' : row.mode === 'demo' ? 'Demo only' : 'No source'}
                  </Chip>
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </details>
);
