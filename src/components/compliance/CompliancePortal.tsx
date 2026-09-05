'use client';

/**
 * Portal-wide state for the compliance console.
 *
 * Deliberately small: jurisdiction scope, the shared queue counters that drive
 * the rail badges, the notification list, the search palette's open state, and
 * the session actor. It holds *no* record data — the old version of this file
 * seeded the entire portal from `MOCK_*` constants and every page read from it,
 * which is how "approve this KYC" became a React setState that wrote nothing.
 * Screens now load their own rows through `@/services/compliance` and get real
 * loading, empty, error and authorisation states with them.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/components/ui/LanguageContext';
import { useComplianceResource } from '@/services/compliance/hooks';
import { complianceMode, demoAllowed } from '@/services/compliance/service';
import {
  getJurisdiction,
  initJurisdiction,
  setJurisdiction as setJurisdictionScope,
  subscribeJurisdiction,
  type JurisdictionFilter,
} from '@/services/compliance/jurisdiction';
import { loadComplianceSession, type ComplianceSessionView } from '@/services/compliance/session';
import { useSyncExternalStore } from 'react';
import type { DashboardSummary, NotificationRow } from '@/services/compliance/types';

const READ_KEY = 'kp_compliance_notifications_read_at';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface CompliancePortalValue {
  t: Translate;
  locale: string;
  jurisdiction: JurisdictionFilter;
  setJurisdiction: (next: JurisdictionFilter) => void;
  mode: 'live' | 'demo';
  demoEnabled: boolean;
  /** Live counts for the rail badges; `null` until the first read lands. */
  summary: DashboardSummary | null;
  /** Provenance of the counters above, so a badge can say where it came from. */
  summaryProvenance: { source: 'live' | 'demo'; demoFallback: boolean; derived: boolean; latencyMs: number } | null;
  summaryLoading: boolean;
  summaryError: boolean;
  refreshSummary: () => void;
  notifications: NotificationRow[];
  notificationsLoading: boolean;
  unreadCount: number;
  markNotificationsRead: () => void;
  session: ComplianceSessionView | null;
  sessionLoading: boolean;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  /** Jurisdiction is also readable through the service; pages rarely need it. */
  format: {
    money: (value: number | undefined | null, currency?: string) => string;
    date: (iso: string | undefined | null) => string;
    relative: (iso: string | undefined | null) => string;
  };
}

const CompliancePortalContext = createContext<CompliancePortalValue | null>(null);

export const CompliancePortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, language } = useLanguage();
  const jurisdiction = useSyncExternalStore(subscribeJurisdiction, getJurisdiction, () => 'ALL' as JurisdictionFilter);
  const [hydrated, setHydrated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [readAt, setReadAt] = useState<number>(0);

  useEffect(() => {
    setHydrated(true);
    initJurisdiction();
    try {
      const stored = window.localStorage.getItem(READ_KEY);
      if (stored) setReadAt(Number(stored) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const { resource: dashboardResource, isLoading: summaryLoading, reload: refreshSummary } =
    useComplianceResource('dashboard');
  const { resource: notificationsResource } = useComplianceResource('notifications');
  const [session, setSession] = useState<ComplianceSessionView | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadComplianceSession()
      .then((next) => {
        if (!cancelled) setSession(next);
      })
      .catch(() => {
        if (!cancelled) setSession({ roles: [], unavailableReason: 'NETWORK' });
      })
      .finally(() => {
        if (!cancelled) setSessionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const notifications = notificationsResource.data;
  const unreadCount = useMemo(() => {
    if (!notifications.length) return 0;
    return notifications.filter((n) => {
      const at = Date.parse(n.at);
      if (Number.isNaN(at)) return true;
      return at > readAt;
    }).length;
  }, [notifications, readAt]);

  const markNotificationsRead = useCallback(() => {
    const now = Date.now();
    setReadAt(now);
    try {
      window.localStorage.setItem(READ_KEY, String(now));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<CompliancePortalValue>(
    () => ({
      t,
      locale: language,
      jurisdiction: hydrated ? jurisdiction : 'ALL',
      setJurisdiction: (next) => setJurisdictionScope(next),
      mode: complianceMode(),
      demoEnabled: demoAllowed(),
      summary: dashboardResource.data[0] ?? null,
      summaryProvenance: {
        source: dashboardResource.source,
        demoFallback: dashboardResource.demoFallback,
        derived: true,
        latencyMs: dashboardResource.latencyMs,
      },
      summaryLoading,
      summaryError: dashboardResource.status === 'error' || dashboardResource.status === 'unauthorized',
      refreshSummary,
      notifications,
      notificationsLoading: notificationsResource.status === 'ready' ? false : !notifications.length,
      unreadCount,
      markNotificationsRead,
      session,
      sessionLoading,
      searchOpen,
      setSearchOpen,
      format: {
        money: (v, c) => formatMoneyValue(v, c, language),
        date: (iso) => formatDateValue(iso, language),
        relative: (iso) => formatRelativeValue(iso, language),
      },
    }),
    [
      t,
      language,
      hydrated,
      jurisdiction,
      dashboardResource,
      summaryLoading,
      refreshSummary,
      notifications,
      notificationsResource.status,
      unreadCount,
      markNotificationsRead,
      session,
      sessionLoading,
      searchOpen,
    ],
  );

  return <CompliancePortalContext.Provider value={value}>{children}</CompliancePortalContext.Provider>;
};

export function useCompliancePortal(): CompliancePortalValue {
  const ctx = useContext(CompliancePortalContext);
  if (!ctx) throw new Error('useCompliancePortal must be used inside CompliancePortalProvider');
  return ctx;
}

/* Local re-imports kept at the bottom to avoid a circular module graph with the
   kit (the kit is allowed to read the portal context, not the reverse). */
import { formatMoney, formatDate, formatRelative } from '@/services/compliance/format';

function formatMoneyValue(value: number | undefined | null, currency: string | undefined, locale: string): string {
  return formatMoney(value, currency, { locale });
}
function formatDateValue(iso: string | undefined | null, locale: string): string {
  return formatDate(iso, 'full', { locale });
}
function formatRelativeValue(iso: string | undefined | null, locale: string): string {
  return formatRelative(iso, { locale });
}
