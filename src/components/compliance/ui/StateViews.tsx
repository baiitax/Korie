'use client';

/**
 * The five non-happy states, once.
 *
 * Every compliance page renders through `ResourceState`, so "loading", "empty",
 * "error", "not authorised" and "no backend here" look and behave the same
 * everywhere — and a page cannot silently collapse them into a zero.
 */

import React from 'react';
import {
  AlertCircle,
  Inbox,
  Lock,
  PlugZap,
  RefreshCw,
  Search,
  ServerOff,
} from 'lucide-react';
import type { ComplianceIssue, ComplianceResource } from '@/services/compliance/types';
import { Button } from './Primitives';

/** 30 blocks on a cold load is intentional: it shows the real shape of the page. */
export const SectionSkeleton: React.FC<{ rows?: number; label: string; variant?: 'table' | 'cards' | 'detail' }> = ({
  rows = 6,
  label,
  variant = 'table',
}) => {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-2.5">
      <span className="sr-only">{label}</span>
      {variant === 'cards' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="cmp-kpi">
              <div className="cmp-skeleton-line" style={{ width: '55%', height: 10 }} />
              <div className="cmp-skeleton-line mt-2" style={{ width: '38%', height: 26 }} />
              <div className="cmp-skeleton-line mt-2" style={{ width: '70%', height: 10 }} />
            </div>
          ))}
        </div>
      ) : variant === 'detail' ? (
        <div className="space-y-3">
          <div className="cmp-skeleton-line" style={{ width: '40%', height: 22 }} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cmp-skeleton-line" style={{ height: 40 }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="cmp-skeleton-line" style={{ height: 38 }} />
          ))}
        </div>
      )}
    </div>
  );
};

export const StateCard: React.FC<{
  icon: React.ReactNode;
  tone?: 'neutral' | 'danger' | 'warning';
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ icon, tone = 'neutral', title, children, actions }) => (
  <div
    className={`cmp-card flex flex-col items-start gap-2.5 p-4 ${
      tone === 'danger'
        ? 'border-[var(--sev-critical-border)] bg-[var(--sev-critical-soft)]'
        : tone === 'warning'
          ? 'border-[var(--sev-medium-soft)] bg-[var(--sev-medium-soft)]'
          : ''
    }`}
  >
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)]"
        style={tone === 'danger' ? { color: 'var(--sev-critical)' } : tone === 'warning' ? { color: 'var(--sev-medium)' } : undefined}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-[14px] font-bold text-[var(--foreground)]">{title}</h3>
        {children ? <div className="mt-1 space-y-1.5 text-[12.5px] leading-relaxed text-[var(--foreground-muted)]">{children}</div> : null}
        {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  </div>
);

export const LoadingBlock: React.FC<{ label: string; rows?: number; variant?: 'table' | 'cards' | 'detail' }> = ({
  label,
  rows,
  variant,
}) => <SectionSkeleton label={label} rows={rows} variant={variant} />;

export const ErrorState: React.FC<{
  error?: ComplianceIssue;
  onRetry?: () => void;
  retryLabel: string;
  title?: string;
}> = ({ error, onRetry, retryLabel, title = 'This queue could not be read' }) => (
  <StateCard
    icon={<AlertCircle className="h-4 w-4" />}
    tone="danger"
    title={title}
    actions={
      onRetry ? (
        <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null
    }
  >
    <p>{error?.message ?? 'The compliance service did not return a usable response.'}</p>
    {error?.hint ? <p className="text-[var(--muted)]">{error.hint}</p> : null}
    {error?.code ? (
      <p className="text-[11px] text-[var(--muted)]" title={error.code}>
        Reference <span className="cmp-ref">{error.code}</span>
      </p>
    ) : null}
  </StateCard>
);

export const UnauthorizedState: React.FC<{
  onRetry?: () => void;
  retryLabel: string;
  title: string;
  body?: string;
  hint?: string;
}> = ({ onRetry, retryLabel, title, body, hint }) => (
  <StateCard
    icon={<Lock className="h-4 w-4" />}
    tone="warning"
    title={title}
    actions={
      onRetry ? (
        <Button icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null
    }
  >
    <p>{body ?? 'Your session is valid but does not carry the scope for this data.'}</p>
    {hint ? <p className="text-[var(--muted)]">{hint}</p> : null}
  </StateCard>
);

export const UnavailableState: React.FC<{
  title: string;
  body: string;
  hint?: string;
  code?: string;
  action?: React.ReactNode;
}> = ({ title, body, hint, code, action }) => (
  <StateCard
    icon={<ServerOff className="h-4 w-4" />}
    title={title}
    actions={action ?? null}
  >
    <p>{body}</p>
    {hint ? <p className="text-[var(--muted)]">{hint}</p> : null}
    {code ? (
      <p className="text-[11px] text-[var(--muted)]" title={code}>
        {code}
      </p>
    ) : null}
  </StateCard>
);

export const EmptyState: React.FC<{
  title: string;
  body?: string;
  action?: React.ReactNode;
  /** When a filter produced nothing, say that rather than "no records". */
  filtered?: boolean;
  onClear?: () => void;
  clearLabel?: string;
}> = ({ title, body, action, filtered, onClear, clearLabel }) => (
  <StateCard
    icon={filtered ? <Search className="h-4 w-4" /> : <Inbox className="h-4 w-4" />}
    title={title}
    actions={
      <>
        {filtered && onClear && clearLabel ? <Button onClick={onClear}>{clearLabel}</Button> : null}
        {action}
      </>
    }
  >
    {body ? <p>{body}</p> : null}
  </StateCard>
);

export const InlineNotice: React.FC<{ tone?: 'neutral' | 'warning' | 'danger' | 'info'; icon?: React.ReactNode; children: React.ReactNode }> = ({
  tone = 'neutral',
  icon,
  children,
}) => (
  <div
    className="flex items-start gap-2 rounded-[var(--cmp-radius-sm)] border px-2.5 py-2 text-[12px]"
    style={{
      borderColor: tone === 'danger' ? 'var(--sev-critical-border)' : 'var(--border)',
      background:
        tone === 'danger' ? 'var(--sev-critical-soft)' : tone === 'warning' ? 'var(--sev-medium-soft)' : tone === 'info' ? 'var(--brand-soft)' : 'var(--surface-2)',
      color: 'var(--foreground-muted)',
    }}
  >
    <span className="mt-0.5 flex-none" aria-hidden="true">
      {icon ?? <PlugZap className="h-3.5 w-3.5" />}
    </span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

/**
 * The one decision point every page uses. `children` renders only when there is
 * something real to render, so an empty queue never becomes a blank card and a
 * 401 never becomes "0 alerts".
 */
export function ResourceState<K extends string, T>({
  resource,
  isLoading,
  loadingLabel,
  emptyTitle,
  emptyBody,
  filtered,
  onClearFilters,
  clearLabel,
  unauthorizedTitle,
  unauthorizedBody,
  unavailableTitle,
  unavailableBody,
  retryLabel,
  skeletonRows = 6,
  skeleton = 'table',
  onRetry,
  emptyAction,
  children,
}: {
  resource: ComplianceResource<T>;
  isLoading: boolean;
  loadingLabel: string;
  emptyTitle: string;
  emptyBody?: string;
  filtered?: boolean;
  onClearFilters?: () => void;
  clearLabel?: string;
  unauthorizedTitle?: string;
  unauthorizedBody?: string;
  unavailableTitle?: string;
  unavailableBody?: string;
  retryLabel: string;
  skeletonRows?: number;
  skeleton?: 'table' | 'cards' | 'detail';
  onRetry?: () => void;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) return <LoadingBlock label={loadingLabel} rows={skeletonRows} variant={skeleton} />;
  if (resource.status === 'error') return <ErrorState error={resource.error} onRetry={onRetry} retryLabel={retryLabel} />;
  if (resource.status === 'unauthorized')
    return (
      <UnauthorizedState
        title={unauthorizedTitle ?? 'Not authorised to view this queue'}
        body={unauthorizedBody}
        hint={resource.error?.hint}
        onRetry={onRetry}
        retryLabel={retryLabel}
      />
    );
  if (resource.status === 'unavailable')
    return (
      <UnavailableState
        title={unavailableTitle ?? 'This module is not connected'}
        body={unavailableBody ?? resource.error?.message ?? 'No backend serves this screen in this deployment.'}
        hint={resource.error?.hint}
        code={resource.error?.code}
        action={onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : undefined}
      />
    );
  if (resource.status === 'empty' || !resource.data.length)
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody ?? resource.error?.message}
        filtered={filtered}
        onClear={onClearFilters}
        clearLabel={clearLabel}
        action={emptyAction}
      />
    );
  return <>{children}</>;
}
