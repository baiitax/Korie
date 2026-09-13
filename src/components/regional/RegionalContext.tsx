"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { SupportedLanguage } from "@/types/customer";
import { translateRegional } from "@/locales/regional";
import { regionalApiFetch } from "@/lib/regional/regionalSession";

export interface RegionalManager {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  country: "NG" | "NE";
  territories: string[];
  status: string;
}

interface RegionalContextType {
  manager: RegionalManager | null;
  managerError: string | null;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (dateString?: string | null) => string;
  signOut: () => Promise<void>;
}

const RegionalContext = createContext<RegionalContextType | undefined>(undefined);

export function RegionalProvider({ children }: { children: React.ReactNode }) {
  const [manager, setManager] = useState<RegionalManager | null>(null);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem("koriepay.regional.lang")) as SupportedLanguage | null;
    if (stored && ["en", "fr", "ha"].includes(stored)) setLanguageState(stored);
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") window.localStorage.setItem("koriepay.regional.lang", lang);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/session");
        const json = await res.json();
        if (!res.ok || !json?.payload?.manager) {
          if (!cancelled) setManagerError(json?.error?.message || "SESSION_FAILED");
          return;
        }
        if (!cancelled) setManager(json.payload.manager);
      } catch {
        if (!cancelled) setManagerError("REGIONAL_SESSION_UNAVAILABLE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translateRegional(language, key, params),
    [language],
  );

  const formatCurrency = useCallback((amount: number, currency: string) => {
    const abs = Math.abs(amount);
    const formatted = new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-NG", {
      maximumFractionDigits: currency === "XOF" ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(abs);
    if (currency === "NGN") return `${amount < 0 ? "−" : ""}₦${formatted}`;
    if (currency === "XOF") return `${amount < 0 ? "−" : ""}CFA ${formatted}`;
    return `${amount < 0 ? "−" : ""}${formatted} ${currency}`;
  }, [language]);

  const formatDate = useCallback(
    (dateString?: string | null) => {
      if (!dateString) return "—";
      try {
        return new Date(dateString).toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "—";
      }
    },
    [language],
  );

  const signOut = useCallback(async () => {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    await getSupabaseBrowserClient().auth.signOut();
    if (typeof window !== "undefined") window.location.href = "/login";
  }, []);

  return (
    <RegionalContext.Provider
      value={{ manager, managerError, language, setLanguage, t, formatCurrency, formatDate, signOut }}
    >
      {children}
    </RegionalContext.Provider>
  );
}

export function useRegional() {
  const ctx = useContext(RegionalContext);
  if (!ctx) throw new Error("useRegional must be used inside RegionalProvider");
  return ctx;
}
