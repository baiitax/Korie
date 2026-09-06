"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApiFetch } from "@/lib/admin/adminSession";

/**
 * Client data hooks for the admin portal. Every admin page reads the real
 * database through /api/admin/data/* (adminAuth-gated, registry-whitelisted)
 * — never inline arrays, never the in-memory engine.
 */

export interface AdminResourceError {
  kind: "unauthenticated" | "forbidden" | "backend" | "not-found" | "query" | "network" | "session";
  message: string;
}

export interface UseAdminResourceOptions {
  q?: string;
  filters?: Record<string, string | undefined>;
  limit?: number;
  offset?: number;
  /** Skip fetching (e.g. while a parent hasn't resolved an id). */
  paused?: boolean;
}

function classify(status: number, code?: string): AdminResourceError["kind"] {
  if (status === 401) return code === "ADMIN_BACKEND_NOT_CONFIGURED" ? "backend" : "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 503) return "backend";
  if (status === 404) return "not-found";
  return "query";
}

async function readError(res: Response): Promise<AdminResourceError> {
  try {
    const body = await res.json();
    const code = body?.error?.code;
    return { kind: classify(res.status, code), message: body?.error?.message ?? res.statusText };
  } catch {
    return { kind: classify(res.status), message: res.statusText || `Request failed (${res.status})` };
  }
}

export interface AdminResourceResult<T> {
  rows: T[];
  count: number;
  loading: boolean;
  error: AdminResourceError | null;
  refresh: () => void;
}

export function useAdminResource<T = Record<string, unknown>>(
  resource: string,
  options: UseAdminResourceOptions = {},
): AdminResourceResult<T> {
  const { q, filters, limit = 100, offset = 0, paused = false } = options;

  const filterKey = useMemo(
    () =>
      JSON.stringify(
        Object.entries(filters ?? {})
          .filter(([, v]) => v !== undefined && v !== "" && v !== "ALL")
          .sort(([a], [b]) => a.localeCompare(b)),
      ),
    [filters],
  );

  const [rows, setRows] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(!paused);
  const [error, setError] = useState<AdminResourceError | null>(null);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set("limit", String(limit));
        sp.set("offset", String(offset));
        if (q && q.trim()) sp.set("q", q.trim());
        const parsedFilters: Record<string, string> = JSON.parse(filterKey || "{}");
        for (const [k, v] of Object.entries(parsedFilters)) sp.set(k, v);

        const res = await adminApiFetch(`/api/admin/data/${resource}?${sp.toString()}`);
        if (cancelled || !mounted.current) return;
        if (!res.ok) {
          const err = await readError(res);
          setError(err);
          setRows([]);
          setCount(0);
          return;
        }
        const body = await res.json();
        if (cancelled || !mounted.current) return;
        setRows(body.rows ?? []);
        setCount(body.count ?? 0);
        setError(null);
      } catch (e) {
        if (cancelled || !mounted.current) return;
        const message = e instanceof Error ? e.message : "Network error";
        setError(
          message === "ADMIN_SESSION_UNAVAILABLE"
            ? { kind: "session", message: "Admin session unavailable — please sign in again." }
            : { kind: "network", message },
        );
        setRows([]);
        setCount(0);
      } finally {
        if (!cancelled && mounted.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resource, q, filterKey, limit, offset, paused, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { rows, count, loading, error, refresh };
}

export function useAdminRecord<T = Record<string, unknown>>(
  resource: string,
  id: string | null,
): { record: T | null; loading: boolean; error: AdminResourceError | null; refresh: () => void } {
  const [record, setRecord] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<AdminResourceError | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) {
      setRecord(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await adminApiFetch(`/api/admin/data/${resource}/${id}`);
        if (cancelled) return;
        if (!res.ok) {
          setError(await readError(res));
          setRecord(null);
          return;
        }
        const body = await res.json();
        setError(null);
        setRecord(body.record ?? null);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Network error";
        setError(
          message === "ADMIN_SESSION_UNAVAILABLE"
            ? { kind: "session", message: "Admin session unavailable — please sign in again." }
            : { kind: "network", message },
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resource, id, tick]);

  return { record, loading, error, refresh: () => setTick((t) => t + 1) };
}

export async function mutateAdminRecord(
  resource: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ ok: true; record: Record<string, unknown> } | { ok: false; message: string }> {
  try {
    const res = await adminApiFetch(`/api/admin/data/${resource}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, message: body?.error?.message ?? `Update failed (${res.status}).` };
    }
    return { ok: true, record: body.record };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Network error" };
  }
}
