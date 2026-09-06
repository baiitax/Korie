"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { adminApiFetch, signOutAdmin } from "@/lib/admin/adminSession";
import type { AdminOverviewPayload } from "@/lib/admin/overviewData";

/**
 * AdminDataGateway — the single client-side source of admin session + live
 * overview state. The rail (badges), command bar (system status) and the
 * dashboard (everything) read from here, so the whole shell moves between
 * checking / unauthenticated / forbidden / backend-unavailable / ready
 * together, and no component invents its own numbers.
 */

export type AdminSessionPhase =
  | "checking"
  | "unauthenticated"
  | "forbidden"
  | "backend-unavailable"
  | "ready";

export interface AdminIdentity {
  userId: string;
  orgId: string;
  role: string;
  email?: string;
}

interface AdminDataState {
  phase: AdminSessionPhase;
  identity: AdminIdentity | null;
  overview: AdminOverviewPayload | null;
  overviewError: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataState | undefined>(undefined);

export function useAdminData(): AdminDataState {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData must be used inside AdminDataGateway");
  return ctx;
}

export function AdminDataGateway({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AdminSessionPhase>("checking");
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setOverviewError(null);
    try {
      const res = await adminApiFetch("/api/admin/overview");
      if (res.status === 401) {
        setPhase("unauthenticated");
        setOverview(null);
        return;
      }
      if (res.status === 403) {
        setPhase("forbidden");
        setOverview(null);
        return;
      }
      if (res.status === 503) {
        setPhase("backend-unavailable");
        setOverview(null);
        return;
      }
      if (!res.ok) {
        setOverviewError(`Overview request failed (${res.status}).`);
        return;
      }
      const json = await res.json();
      setOverview(json?.data ?? null);
      setPhase("ready");
    } catch (e) {
      if (e instanceof Error && e.message === "ADMIN_SESSION_UNAVAILABLE") {
        setPhase("unauthenticated");
      } else {
        setOverviewError(e instanceof Error ? e.message : "Overview request failed.");
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminApiFetch("/api/admin/session");
        if (cancelled) return;
        if (res.status === 401) {
          setPhase("unauthenticated");
          return;
        }
        if (res.status === 403) {
          setPhase("forbidden");
          return;
        }
        if (res.status === 503) {
          setPhase("backend-unavailable");
          return;
        }
        if (!res.ok) {
          setPhase("unauthenticated");
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        setIdentity(json?.data ?? null);
        await refresh();
      } catch {
        if (!cancelled) setPhase("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    await signOutAdmin();
    setPhase("unauthenticated");
    setIdentity(null);
    setOverview(null);
  }, []);

  return (
    <AdminDataContext.Provider value={{ phase, identity, overview, overviewError, refresh, logout }}>
      {children}
    </AdminDataContext.Provider>
  );
}
