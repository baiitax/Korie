"use client";

// =============================================================================
// File: src/components/support/SupportOpsProvider.tsx
// Description: KoriePay Support — client state for the support shell (§67).
//
// Holds ONLY client state: the signed-in officer's own profile (resolved
// server-side from the real Supabase session — never client-asserted),
// toast notifications, online status. No business logic — every rule lives
// on the server; this provider just wires requests and renders server
// answers.
//
// Auth model: exactly one officer is signed in per browser session (real
// Supabase Auth, see src/lib/support/officerSession.ts). There is no
// sandbox officer-switcher anymore — if nobody is signed in, or the signed
// in account has no matching support_officers row, the user is redirected
// to /support/login.
// =============================================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/ui/LanguageContext";
import { useTheme } from "@/components/ui/ThemeContext";
import { supportOps, SupportOfficerDto, isSupportApiError } from "@/services/supportOpsClient";
import { getSupportOfficerAccessToken, signOutSupportOfficer } from "@/lib/support/officerSession";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

type SessionState = "loading" | "authenticated" | "unauthenticated";

interface SupportOpsContextType {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: "en" | "fr" | "ha";
  setLang: (l: "en" | "fr" | "ha") => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  officers: SupportOfficerDto[];
  activeOfficer: SupportOfficerDto | null;
  sessionState: SessionState;
  signOut: () => Promise<void>;
  isOnline: boolean;
  toasts: Toast[];
  toast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: number) => void;
}

const SupportOpsContext = createContext<SupportOpsContextType | undefined>(undefined);

export function SupportOpsProvider({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [officers, setOfficers] = useState<SupportOfficerDto[]>([]);
  const [activeOfficer, setActiveOfficer] = useState<SupportOfficerDto | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>("loading");
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

  // Resolve the real, signed-in officer once per mount (and once more if the
  // pathname changes into /support from outside it). If there is no valid
  // Supabase session, or the account has no support_officers row, redirect
  // to /support/login — there is no client fallback identity.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getSupportOfficerAccessToken();
      if (!token) {
        if (!cancelled) {
          setSessionState("unauthenticated");
          if (pathname !== "/support/login") router.replace("/support/login");
        }
        return;
      }

      const res = await supportOps.officers();
      if (cancelled) return;

      if (isSupportApiError(res)) {
        setSessionState("unauthenticated");
        if (pathname !== "/support/login") router.replace("/support/login");
        return;
      }

      setOfficers(res.items);
      // The roster endpoint returns every officer (for assignment pickers);
      // the signed-in officer's own row is the one whose email matches the
      // Supabase auth email on this session. We resolve it via /api/support
      // itself rather than decoding the token client-side.
      const meRes = await supportOps.me();
      if (cancelled) return;
      if (isSupportApiError(meRes)) {
        setSessionState("unauthenticated");
        if (pathname !== "/support/login") router.replace("/support/login");
        return;
      }
      setActiveOfficer(meRes.officer);
      setSessionState("authenticated");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await signOutSupportOfficer();
    setActiveOfficer(null);
    setOfficers([]);
    setSessionState("unauthenticated");
    router.replace("/support/login");
  }, [router]);

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
      sessionState,
      signOut,
      isOnline,
      toasts,
      toast,
      dismissToast,
    }),
    [t, language, setLanguage, theme, setTheme, officers, activeOfficer, sessionState, signOut, isOnline, toasts, toast, dismissToast],
  );

  return <SupportOpsContext.Provider value={value}>{children}</SupportOpsContext.Provider>;
}

export function useSupportOps(): SupportOpsContextType {
  const ctx = useContext(SupportOpsContext);
  if (!ctx) throw new Error("useSupportOps must be used inside <SupportOpsProvider>");
  return ctx;
}
