"use client";

// =============================================================================
// File: src/components/support/SupportOpsProvider.tsx
// Description: KoriePay Support — client state for the support shell (§67).
//
// Holds ONLY client state: the acting officer (sandbox switcher), toast
// notifications, online status. No business logic — every rule lives on the
// server; this provider just wires requests and renders server answers.
//
// Replaces the old SupportContext (which hydrated mock data into React).
// =============================================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/ui/LanguageContext";
import { useTheme } from "@/components/ui/ThemeContext";
import { supportOps, SupportOfficerDto, DEFAULT_SUPPORT_OFFICER } from "@/services/supportOpsClient";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface SupportOpsContextType {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: "en" | "fr" | "ha";
  setLang: (l: "en" | "fr" | "ha") => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  officers: SupportOfficerDto[];
  activeOfficer: SupportOfficerDto | null;
  setActiveOfficerId: (id: string) => void;
  isOnline: boolean;
  toasts: Toast[];
  toast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: number) => void;
}

const SupportOpsContext = createContext<SupportOpsContextType | undefined>(undefined);

const OFFICER_STORAGE_KEY = "koriepay_support_officer";

export function SupportOpsProvider({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [officers, setOfficers] = useState<SupportOfficerDto[]>([]);
  const [activeOfficerId, setActiveOfficerIdState] = useState<string>(DEFAULT_SUPPORT_OFFICER);
  const [isOnline, setIsOnline] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Online/offline detection drives the disabled-state UI (§102).
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Load the roster once. The roster is the source for capabilities — the
  // UI only ever REFLECTS what the server allowed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await supportOps.officers();
      if (cancelled) return;
      if (res && !("__supportError" in (res as object))) {
        setOfficers((res as { items: SupportOfficerDto[] }).items);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(OFFICER_STORAGE_KEY);
      if (stored) setActiveOfficerIdState(stored);
    } catch {
      /* private mode */
    }
  }, []);

  const setActiveOfficerId = useCallback((id: string) => {
    setActiveOfficerIdState(id);
    try {
      window.localStorage.setItem(OFFICER_STORAGE_KEY, id);
    } catch {
      /* private mode */
    }
  }, []);

  const activeOfficer = useMemo(
    () => officers.find((o) => o.id === activeOfficerId) ?? officers[0] ?? null,
    [officers, activeOfficerId],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    window.setTimeout(() => dismissToast(id), 4200);
  }, [dismissToast]);

  const value = useMemo<SupportOpsContextType>(
    () => ({
      t,
      lang: language as "en" | "fr" | "ha",
      setLang: (l) => setLanguage(l),
      theme,
      setTheme: (next) => setTheme(next as "light" | "dark"),
      officers,
      activeOfficer,
      setActiveOfficerId,
      isOnline,
      toasts,
      toast,
      dismissToast,
    }),
    [t, language, setLanguage, theme, setTheme, officers, activeOfficer, setActiveOfficerId, isOnline, toasts, toast, dismissToast],
  );

  return <SupportOpsContext.Provider value={value}>{children}</SupportOpsContext.Provider>;
}

export function useSupportOps(): SupportOpsContextType {
  const ctx = useContext(SupportOpsContext);
  if (!ctx) throw new Error("useSupportOps must be used inside <SupportOpsProvider>");
  return ctx;
}
