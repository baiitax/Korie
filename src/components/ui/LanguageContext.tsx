"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { translate } from "@/locales";
import { SupportedLanguage } from "@/types/customer";

/**
 * KoriePay Global Language Provider.
 *
 * A single source of truth for the platform language (English / Hausa /
 * Français). The preference is persisted and restored on the next visit,
 * falling back to the browser language and finally to English.
 *
 * It exposes `t(key, params?)`, which resolves from the shared KoriePay
 * translation dictionaries (with English fallback), so user-facing chrome
 * (navigation, footer, auth) is localised consistently.
 */

export type PlatformLanguage = SupportedLanguage;

const STORAGE_KEY = "koriepay_lang";
const SUPPORTED: PlatformLanguage[] = ["en", "ha", "fr"];

interface LanguageContextType {
  language: PlatformLanguage;
  setLanguage: (lang: PlatformLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLanguage(): PlatformLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED as string[]).includes(stored)) {
      return stored as PlatformLanguage;
    }
  } catch {
    /* ignore */
  }
  try {
    const browser = navigator.language?.slice(0, 2).toLowerCase();
    if (browser === "ha" || browser === "fr") return browser as PlatformLanguage;
  } catch {
    /* ignore */
  }
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<PlatformLanguage>("en");

  useEffect(() => {
    setLanguage(getInitialLanguage());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = language;
  }, [language]);

  const setLanguageSafe = useCallback((next: PlatformLanguage) => {
    setLanguage(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: setLanguageSafe, t, isRtl: false }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
