"use client";

// =============================================================================
// Agent portal context — v2 (customer-portal discipline).
// ---------------------------------------------------------------------------
// Everything on screen comes from /api/agent/* (engine truth), fetched with a
// bearer credential and normalized error states. Client state only holds
// preferences (language, hide-balance) and modal UI. There are no mock
// constants here — the previous context imported agentDataService mocks.
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SupportedLanguage } from "@/types/customer";
import { getPortalBearer } from "@/lib/customerPortalClient";
import { AgentPortalOperationType, AgentPortalSummary } from "@/types/agentPortal";

export type AgentLoadPhase = "loading" | "ready" | "error";

export interface AgentPortalContextValue {
  phase: AgentLoadPhase;
  errorMessage: string;
  refreshedAt: string | null;
  summary: AgentPortalSummary | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;

  // Preferences (local)
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  isBalanceHidden: boolean;
  toggleHideBalance: () => void;

  // Money operations (BFF-backed, idempotent)
  executeOperation: (params: {
    kind: "CASH_IN" | "CASH_OUT" | "TRANSFER_NIP";
    amount: number;
    customerName?: string;
    customerPhone?: string;
    customerAccount?: string;
    customerBank?: string;
  }) => Promise<{ success: boolean; operation?: AgentPortalOperationType; code?: string; message?: string }>;

  submitDailyCashCount: (denominations: Record<string, number>) => Promise<{
    success: boolean;
    message?: string;
  }>;

  sweepFloat: () => Promise<{ success: boolean; message?: string }>;

  submitTicket: (params: {
    category: string;
    description: string;
    disputedAmount: number;
    transactionReference?: string;
    customerName?: string;
    customerPhone?: string;
  }) => Promise<{ success: boolean; message?: string }>;

  onboardCustomer: (params: { fullName: string; phone: string; email: string }) => Promise<{
    success: boolean;
    message?: string;
  }>;

  toggleBookmark: (customerKey: string) => Promise<{ bookmarked: boolean }>;

  // Receipt modal
  isReceiptOpen: boolean;
  selectedReceipt: AgentPortalOperationType | null;
  openReceipt: (op: AgentPortalOperationType) => void;
  closeReceipt: () => void;
}

const AgentPortalContext = createContext<AgentPortalContextValue | undefined>(undefined);

interface OperationOutcome {
  success: boolean;
  operation?: AgentPortalOperationType;
  code?: string;
  message?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<{ ok: boolean; data: T; status: number; message?: string }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: getPortalBearer(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    const data = (payload as any)?.data;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: undefined as never,
        message: (payload as any)?.error?.message || `Request failed (${res.status})`,
      };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (err: any) {
    return { ok: false, status: 0, data: undefined as never, message: err?.message || "Network error" };
  }
}

export function AgentPortalProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AgentLoadPhase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [summary, setSummary] = useState<AgentPortalSummary | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<AgentPortalOperationType | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("koriepay_agent_lang") as SupportedLanguage | null;
    if (saved) setLanguageState(saved);
    const savedHide = localStorage.getItem("koriepay_agent_hide_balance");
    if (savedHide) setIsBalanceHidden(savedHide === "true");
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setPhase((p) => (p === "ready" ? p : "loading"));
    try {
      const res = await fetch("/api/agent/portal", {
        headers: { Authorization: getPortalBearer(), Accept: "application/json" },
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((payload as any)?.error?.message || "Could not load your agency portal.");
      }
      setSummary((payload as any)?.data as AgentPortalSummary);
      setRefreshedAt(new Date().toISOString());
      setPhase("ready");
      setErrorMessage("");
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not load your agency portal.");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") localStorage.setItem("koriepay_agent_lang", lang);
  };

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem("koriepay_agent_hide_balance", String(next));
      return next;
    });
  };

  const executeOperation: AgentPortalContextValue["executeOperation"] = async (params) => {
    const idempotencyKey = `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const outcome: OperationOutcome = await (
      await postJson<OperationOutcome>("/api/agent/operations", {
        kind: params.kind,
        amount: params.amount,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        customerAccount: params.customerAccount,
        customerBank: params.customerBank,
        idempotencyKey,
      })
    ).data;
    if (outcome.success) {
      await refresh({ silent: true });
      return { success: true, operation: outcome.operation, code: outcome.code };
    }
    return { success: false, code: outcome.code, message: outcome.message };
  };

  const submitDailyCashCount: AgentPortalContextValue["submitDailyCashCount"] = async (denominations) => {
    const res = await postJson<{ reconciliation: unknown }>("/api/agent/reconciliations", { denominations });
    if (res.ok) {
      await refresh({ silent: true });
      return { success: true };
    }
    return { success: false, message: res.message };
  };

  const sweepFloat: AgentPortalContextValue["sweepFloat"] = async () => {
    const res = await postJson<{ settlement: unknown }>("/api/agent/float/sweep", {});
    if (res.ok) {
      await refresh({ silent: true });
      return { success: true };
    }
    return { success: false, message: res.message };
  };

  const submitTicket: AgentPortalContextValue["submitTicket"] = async (params) => {
    const res = await postJson<{ ticket: unknown }>("/api/agent/support-tickets", params);
    if (res.ok) {
      await refresh({ silent: true });
      return { success: true };
    }
    return { success: false, message: res.message };
  };

  const onboardCustomer: AgentPortalContextValue["onboardCustomer"] = async (params) => {
    const res = await postJson<{ customer: unknown }>("/api/agent/customers/onboard", params);
    if (res.ok) {
      await refresh({ silent: true });
      return { success: true };
    }
    return { success: false, message: res.message };
  };

  const toggleBookmark: AgentPortalContextValue["toggleBookmark"] = async (customerKey) => {
    const res = await postJson<{ bookmarked: boolean }>("/api/agent/customers/bookmark", { customerKey });
    if (res.ok) return res.data;
    return { bookmarked: false };
  };

  const openReceipt = (op: AgentPortalOperationType) => {
    setSelectedReceipt(op);
    setIsReceiptOpen(true);
  };
  const closeReceipt = () => {
    setIsReceiptOpen(false);
    setSelectedReceipt(null);
  };

  return (
    <AgentPortalContext.Provider
      value={{
        phase,
        errorMessage,
        refreshedAt,
        summary,
        refresh,
        language,
        setLanguage,
        isBalanceHidden,
        toggleHideBalance,
        executeOperation,
        submitDailyCashCount,
        sweepFloat,
        submitTicket,
        onboardCustomer,
        toggleBookmark,
        isReceiptOpen,
        selectedReceipt,
        openReceipt,
        closeReceipt,
      }}
    >
      {children}
    </AgentPortalContext.Provider>
  );
}

export function useAgentPortal(): AgentPortalContextValue {
  const ctx = useContext(AgentPortalContext);
  if (!ctx) throw new Error("useAgentPortal must be used within AgentPortalProvider");
  return ctx;
}
