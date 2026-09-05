'use client';

/**
 * React bindings for the compliance data layer.
 *
 * `useComplianceResource` gives a screen one object that already answers the
 * seven questions every compliance page must document: loading, ready, empty,
 * error, unauthorized, unavailable, and where the rows came from. A page that
 * forgets a state cannot get away with it, because it renders `<StateView>`
 * with the envelope rather than mapping over an array it hopes is there.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { loadComplianceResource, type LoadOptions } from './service';
import { getDemoVersion, subscribeDemo } from './demo/store';
import { getJurisdiction, subscribeJurisdiction } from './jurisdiction';
import type {
  ComplianceMutationResult,
  ComplianceResource,
  ComplianceResourceKey,
  ComplianceResourceMap,
} from './types';
import { runLiveAction, runDemoAction, type LiveActionKey } from './mutations';

function emptyEnvelope<K extends ComplianceResourceKey>(): ComplianceResource<ComplianceResourceMap[K]> {
  return {
    status: 'ready',
    data: [],
    total: 0,
    source: 'live',
    demoFallback: false,
    latencyMs: 0,
  };
}

export interface UseComplianceResourceResult<K extends ComplianceResourceKey> {
  resource: ComplianceResource<ComplianceResourceMap[K]>;
  isLoading: boolean;
  /** True on a reload after a first successful load (drives inline spinners). */
  isRefreshing: boolean;
  reload: () => void;
}

export function useComplianceResource<K extends ComplianceResourceKey>(
  key: K,
  opts: Omit<LoadOptions, 'signal'> = {},
): UseComplianceResourceResult<K> {
  const [resource, setResource] = useState<ComplianceResource<ComplianceResourceMap[K]>>(emptyEnvelope<K>);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const demoVersion = useSyncExternalStore(subscribeDemo, getDemoVersion, getDemoVersion);
  // A jurisdiction change must refetch, not just re-filter locally cached rows.
  const jurisdiction = useSyncExternalStore(subscribeJurisdiction, getJurisdiction, () => 'ALL' as const);
  const controllerRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(false);
  const signature = JSON.stringify([key, opts.query ?? {}, opts.id ?? '']);

  useEffect(() => {
    let cancelled = false;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (hasLoadedRef.current) setIsRefreshing(true);
    setIsLoading(true);

    loadComplianceResource(key, { ...opts, signal: controller.signal })
      .then((next) => {
        if (cancelled || controller.signal.aborted) return;
        hasLoadedRef.current = true;
        setResource(next);
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        setResource({
          ...emptyEnvelope<K>(),
          status: 'error',
          error: {
            code: 'CLIENT_RUNTIME_ERROR',
            message: err instanceof Error ? err.message : 'The screen could not read this data.',
          },
        });
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        setIsRefreshing(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, nonce, demoVersion, jurisdiction]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { resource, isLoading, isRefreshing, reload };
}

/* ── actions ──────────────────────────────────────────────────────────────── */

export type ActionStatus = 'idle' | 'pending' | 'success' | 'error';

export interface UseComplianceActionResult {
  status: ActionStatus;
  /** Show the spinner only if the wait is real (§ loading rules). */
  showPending: boolean;
  result?: ComplianceMutationResult;
  run: (fn: () => Promise<ComplianceMutationResult<any>>) => Promise<ComplianceMutationResult>;
  runLive: (key: LiveActionKey, id: string, body: Record<string, unknown>) => Promise<ComplianceMutationResult>;
  reset: () => void;
}

export function useComplianceAction(): UseComplianceActionResult {
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [result, setResult] = useState<ComplianceMutationResult | undefined>(undefined);
  const [showPending, setShowPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const run = useCallback(async (fn: () => Promise<ComplianceMutationResult<any>>) => {
    setStatus('pending');
    setResult(undefined);
    const timer = setTimeout(() => setShowPending(true), 300);
    try {
      const out = await fn();
      if (!mounted.current) return out;
      setResult(out);
      setStatus(out.ok ? 'success' : 'error');
      return out;
    } catch (err: any) {
      const out: ComplianceMutationResult = {
        ok: false,
        recorded: false,
        source: 'live',
        error: {
          code: 'ACTION_RUNTIME_ERROR',
          message: err instanceof Error ? err.message : 'The action could not be completed.',
        },
      };
      if (mounted.current) {
        setResult(out);
        setStatus('error');
      }
      return out;
    } finally {
      clearTimeout(timer);
      if (mounted.current) setShowPending(false);
    }
  }, []);

  const runLive = useCallback(
    (key: LiveActionKey, id: string, body: Record<string, unknown>) => run(() => runLiveAction(key, id, body)),
    [run],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(undefined);
  }, []);

  return { status, showPending, result, run, runLive, reset };
}

export { runDemoAction, runLiveAction };
export type { ComplianceMutationResult };

/**
 * A short-lived confirmation that clears itself, so "Demo only · not recorded"
 * stays on screen just long enough to be read and then disappears.
 */
export function useAutoClearingFeedback(ms = 6000) {
  const [message, setMessage] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback(
    (tone: 'success' | 'info' | 'error', text: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage({ tone, text });
      timer.current = setTimeout(() => setMessage(null), ms);
    },
    [ms],
  );
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(null);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { message, show, clear };
}
