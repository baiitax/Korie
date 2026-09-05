"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
} from "react";
import { useLanguage } from "@/components/ui/LanguageContext";
import KpayFullScreenLoader from "./KpayFullScreenLoader";
import KpayTransactionLoader, {
  TransactionStatus,
  KpayTransactionSummaryItem,
} from "./KpayTransactionLoader";

/**
 * KoriePay Global Loading Experience.
 *
 * A single, centralised loading manager. Instead of each page inventing its
 * own spinner, surfaces request a "blocking" experience here:
 *
 *   - Full screen  → application bootstrap / auth resolution / security op
 *   - Transaction  → a real financial operation, driven by AUTHORITATIVE
 *                    backend status (never a fake success).
 *
 * Everything else (route progress, inline, skeletons, buttons) is composed
 * from the shared `Kpay*` primitives so the whole ecosystem speaks one
 * loading design language.
 */

export type LoadingContextType =
  | "public"
  | "customer"
  | "agency"
  | "merchant"
  | "aggregator"
  | "compliance"
  | "support"
  | "developer"
  | "admin"
  | "auth"
  | "transaction";

export type FullScreenKind = "bootstrap" | "auth" | "security" | "custom";

export interface FullScreenOptions {
  kind?: FullScreenKind;
  /** Context overrides the human message. */
  message?: string;
  /** Tagline shown under the message (public brand loader). */
  tagline?: string;
  /** When true the loader stays until explicitly hidden. */
  sticky?: boolean;
}

export interface TransactionOptions {
  context?: LoadingContextType;
  title: string;
  amount?: string;
  recipient?: string;
  summary?: KpayTransactionSummaryItem[];
  /** Real, authoritative status from the backend/provider. */
  status: TransactionStatus;
  /** Long-running / provider wait messaging. */
  providerWait?: boolean;
  onCheckStatus?: () => void;
}

interface LoadingManager {
  /** Full-screen blocking overlays. */
  fullScreen: FullScreenOptions | null;
  showFullScreen: (opts?: FullScreenOptions) => void;
  hideFullScreen: () => void;

  /**
   * Whether the first authoritative data load has resolved. The branded
   * bootstrap overlay waits for this so a customer never sees an
   * "empty" shell for a beat and then a jump-cut to data — and so the
   * overlay is never dismissed while the app is still loading.
   */
  bootstrapReady: boolean;
  markBootstrapReady: () => void;
  /** Re-arm (e.g. after sign-out) so the next session's bootstrap waits again. */
  resetBootstrapReady: () => void;

  /** Financial transaction overlay (real state only). */
  transaction: TransactionOptions | null;
  beginTransaction: (opts: TransactionOptions) => void;
  updateTransactionStatus: (status: TransactionStatus) => void;
  endTransaction: () => void;
}

const LoadingContext = createContext<LoadingManager | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  const [fullScreen, setFullScreen] = useState<FullScreenOptions | null>(null);
  const [transaction, setTransaction] = useState<TransactionOptions | null>(null);
  const [bootstrapReady, setBootstrapReady] = useState(false);

  const markBootstrapReady = useCallback(() => setBootstrapReady(true), []);
  const resetBootstrapReady = useCallback(() => setBootstrapReady(false), []);

  // Refs so callbacks never go stale.
  const fullScreenRef = useRef<FullScreenOptions | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  const showFullScreen = useCallback((opts?: FullScreenOptions) => {
    const next: FullScreenOptions = {
      kind: "bootstrap",
      ...(opts || {}),
      sticky: opts?.sticky ?? false,
    };
    fullScreenRef.current = next;
    setFullScreen(next);
  }, []);

  const hideFullScreen = useCallback(() => {
    fullScreenRef.current = null;
    setFullScreen(null);
  }, []);

  const beginTransaction = useCallback((opts: TransactionOptions) => {
    setTransaction(opts);
  }, []);

  const updateTransactionStatus = useCallback((status: TransactionStatus) => {
    setTransaction((prev) => (prev ? { ...prev, status } : prev));
  }, []);

  const endTransaction = useCallback(() => {
    setTransaction(null);
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        fullScreen,
        showFullScreen,
        hideFullScreen,
        bootstrapReady,
        markBootstrapReady,
        resetBootstrapReady,
        transaction,
        beginTransaction,
        updateTransactionStatus,
        endTransaction,
      }}
    >
      {children}

      {/* Global overlays live behind the app, driven purely by real state. */}
      <KpayFullScreenLoader
        open={!!fullScreen}
        options={fullScreen || undefined}
        onHidden={hideFullScreen}
        t={t}
      />
      <KpayTransactionLoader
        open={!!transaction}
        options={transaction || undefined}
        onClose={endTransaction}
        t={t}
      />
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingManager {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return ctx;
}
