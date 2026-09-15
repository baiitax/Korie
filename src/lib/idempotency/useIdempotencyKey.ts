"use client";

import { useCallback, useRef } from "react";

/**
 * Stable per-attempt idempotency key.
 *
 * The bug this fixes: every money-movement call site in the app was
 * generating a *fresh* `crypto.randomUUID()` / `Date.now()`-based key
 * inline, on every function call. The backend's `UNIQUE(owner_id,
 * idempotency_key)` dedup (see e.g. `post_customer_transfer`,
 * `post_agency_cash_transaction`) is genuinely solid — but it can only
 * catch a duplicate if the *same* key is presented twice. A fresh key
 * per call means a double-click, a re-opened PIN modal, or a user
 * manually retrying after a perceived failure/timeout sails straight
 * past that protection and can post two real, separate financial
 * transactions for what the user experienced as one attempt.
 *
 * `useIdempotencyKey` mints a key once per *attempt* and hands back the
 * same value on every subsequent call until `reset()` is invoked (call
 * `reset()` only after a terminal outcome — success, explicit
 * cancellation, or the user restarting the flow with different
 * parameters). Backed by a ref, not state, so it never triggers a
 * re-render and is safe to read from event handlers and effects alike.
 */
export function useIdempotencyKey(prefix: string) {
  const keyRef = useRef<string | null>(null);

  const getKey = useCallback((): string => {
    if (!keyRef.current) {
      const random =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      keyRef.current = `${prefix}-${random}`;
    }
    return keyRef.current;
  }, [prefix]);

  const reset = useCallback(() => {
    keyRef.current = null;
  }, []);

  return { getKey, reset };
}

/**
 * Same contract as `useIdempotencyKey`, but keyed by an arbitrary string
 * (e.g. an obligation id) so a page dealing with several independent
 * pending actions at once — like a list of Adashi obligations, each with
 * its own "Pay" button — doesn't share one key across unrelated items.
 */
export function useIdempotencyKeyMap(prefix: string) {
  const keysRef = useRef<Map<string, string>>(new Map());

  const getKey = useCallback(
    (id: string): string => {
      const existing = keysRef.current.get(id);
      if (existing) return existing;
      const random =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const key = `${prefix}-${id}-${random}`;
      keysRef.current.set(id, key);
      return key;
    },
    [prefix],
  );

  const reset = useCallback((id: string) => {
    keysRef.current.delete(id);
  }, []);

  return { getKey, reset };
}
