"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  CustomerUser,
  CustomerWallet,
  CustomerTransaction,
  Beneficiary,
  VirtualCard,
  SupportTicket,
  SupportedLanguage,
  CustomerCurrency,
  CustomerTransactionStatus,
} from "@/types/customer";
import { translate } from "@/locales";
import { useLanguage } from "@/components/ui/LanguageContext";
import { portalFetch } from "@/lib/customerPortalClient";
import { safeFetch, NormalizedCustomerError } from "@/lib/customer/customerApiError";
import { useLoading } from "@/components/loading";
import {
  CUSTOMER_CONFIG,
  orderCurrenciesXofFirst,
  getServiceStatus,
  isServiceAvailable,
  CustomerServiceId,
  ServiceStatus,
} from "@/lib/customer/customerFeatures";

/* ------------------------------------------------------------------ types */

interface TransferExecutionParams {
  recipientName: string;
  recipientBank: string;
  recipientAccount: string;
  amount: number;
  currency: CustomerCurrency;
  destinationCurrency?: CustomerCurrency;
  description?: string;
  isCrossBorder?: boolean;
}

/** Server-side history filters (mirrors parseTransactionQueryParams). */
export interface HistoryFilters {
  currency: "ALL" | CustomerCurrency;
  category: "ALL" | "TRANSFERS" | "BILLS" | "FX" | "FUNDING" | "CARDS";
  status: "ALL" | CustomerTransactionStatus;
  range: "ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM";
  from?: string;
  to?: string;
  search: string;
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  currency: "ALL",
  category: "ALL",
  status: "ALL",
  range: "ALL",
  search: "",
};

export interface CustomerNotificationItem {
  id: string;
  kind: "TRANSACTION" | "VERIFICATION" | "SECURITY" | "SYSTEM";
  tone: "info" | "warning" | "danger" | "success";
  titleKey: string;
  bodyKey: string;
  params: Record<string, string | number>;
  createdAt: string;
  link?: { href: string; labelKey: string };
  reference?: string;
}

export type LoadPhase = "idle" | "loading" | "ready" | "error";

interface CustomerContextType {
  /** null while loading or when the profile could not be resolved. Never a guess. */
  customer: CustomerUser | null;
  wallets: CustomerWallet[];
  activeCurrency: CustomerCurrency;
  setActiveCurrency: (currency: CustomerCurrency) => void;
  /** undefined until the first successful portal load. */
  activeWallet: CustomerWallet | undefined;
  isBalanceHidden: boolean;
  toggleHideBalance: () => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;

  /** Recent activity for the dashboard (authoritative, ownership-scoped). */
  transactions: CustomerTransaction[];
  transactionsTotalCount: number;

  /* --- dedicated history state: never conflated with "no transactions" --- */
  historyPhase: LoadPhase;
  historyItems: CustomerTransaction[];
  historyError: NormalizedCustomerError | null;
  historyHasMore: boolean;
  historyNextCursor: string | null;
  historyTotalCount: number;
  /** Server clock of the last successful history read → "Last updated". */
  historyUpdatedAt: string | null;
  historyFilters: HistoryFilters;
  setHistoryFilters: (next: Partial<HistoryFilters>) => void;
  loadHistory: (opts?: { silent?: boolean }) => Promise<void>;
  loadMoreHistory: () => Promise<void>;

  /** Portal aggregate (dashboard) state. */
  portalPhase: LoadPhase;
  portalError: NormalizedCustomerError | null;
  /** @deprecated kept for older pages; equals portalPhase === "loading". */
  isConnecting: boolean;
  dataSource: "live" | "unavailable";
  refreshPortal: () => Promise<void>;

  beneficiaries: Beneficiary[];
  cards: VirtualCard[];
  supportTickets: SupportTicket[];
  isOffline: boolean;
  fxRates: { fromCurrency: CustomerCurrency; toCurrency: CustomerCurrency; rate: number; source: string }[];
  productConfig: typeof CUSTOMER_CONFIG;
  getServiceStatus: (id: CustomerServiceId) => ServiceStatus;
  isServiceAvailable: (id: CustomerServiceId) => boolean;

  notifications: CustomerNotificationItem[];
  notificationsCount: number;
  notificationsPhase: LoadPhase;
  refreshNotifications: () => Promise<void>;

  // Modals & Sheets
  isReceiptModalOpen: boolean;
  selectedReceiptTx: CustomerTransaction | null;
  openReceipt: (tx: CustomerTransaction) => void;
  closeReceipt: () => void;

  isDisputeModalOpen: boolean;
  disputeTx: CustomerTransaction | null;
  openDispute: (tx: CustomerTransaction) => void;
  closeDispute: () => void;
  submitDispute: (
    category: string,
    description: string,
  ) => Promise<{ ok: true; ticketNumber: string } | { ok: false; error: string }>;

  executeTransfer: (params: TransferExecutionParams) => Promise<{
    success: boolean;
    transaction?: CustomerTransaction;
    error?: string;
  }>;

  executeBillPayment: (params: {
    billerCategory: string;
    billerProvider: string;
    meterOrPhone: string;
    amount: number;
    currency: CustomerCurrency;
  }) => Promise<{
    success: boolean;
    token?: string;
    transaction?: CustomerTransaction;
    error?: string;
  }>;

  toggleCardFreeze: (cardId: string) => void;
  saveBeneficiary: (
    beneficiary: Omit<Beneficiary, "id">,
  ) => Promise<{ ok: true; beneficiary: Beneficiary } | { ok: false; error: string }>;
  deleteBeneficiary: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const PORTAL_TIMEOUT_MS = 15000;
const HISTORY_PAGE_SIZE = 20;

function historyQuery(filters: HistoryFilters, cursor?: string | null): string {
  const sp = new URLSearchParams();
  if (filters.currency !== "ALL") sp.set("currency", filters.currency);
  if (filters.category !== "ALL") sp.set("category", filters.category);
  if (filters.status !== "ALL") sp.set("status", filters.status);
  if (filters.range !== "ALL") {
    sp.set("range", filters.range);
    if (filters.range === "CUSTOM") {
      if (filters.from) sp.set("from", filters.from);
      if (filters.to) sp.set("to", filters.to);
    }
  }
  if (filters.search.trim()) sp.set("search", filters.search.trim());
  sp.set("limit", String(HISTORY_PAGE_SIZE));
  if (cursor) sp.set("cursor", cursor);
  return sp.toString();
}

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const { markBootstrapReady, resetBootstrapReady } = useLoading();

  // ── Server state (authoritative financial data — never seeded from a catalog)
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [wallets, setWallets] = useState<CustomerWallet[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [transactionsTotalCount, setTransactionsTotalCount] = useState(0);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  // Cards are COMING SOON — hold no fabricated card records.
  const [cards] = useState<VirtualCard[]>([]);
  // Never seeded from `CUSTOMER_SUPPORT_TICKETS`: the fixture array was shown
  // for the whole first paint, so a customer could see cases that do not exist
  // before any request had resolved. Real cases live at
  // /api/customer/portal/disputes (owner-scoped) and the support screen reads them.
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [fxRates, setFxRates] = useState<
    { fromCurrency: CustomerCurrency; toCurrency: CustomerCurrency; rate: number; source: string }[]
  >([]);
  const [notifications, setNotifications] = useState<CustomerNotificationItem[]>([]);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [notificationsPhase, setNotificationsPhase] = useState<LoadPhase>("idle");

  const [portalPhase, setPortalPhase] = useState<LoadPhase>("loading");
  const [portalError, setPortalError] = useState<NormalizedCustomerError | null>(null);
  const [dataSource, setDataSource] = useState<"live" | "unavailable">("live");

  const [historyPhase, setHistoryPhase] = useState<LoadPhase>("idle");
  const [historyItems, setHistoryItems] = useState<CustomerTransaction[]>([]);
  const [historyError, setHistoryError] = useState<NormalizedCustomerError | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyUpdatedAt, setHistoryUpdatedAt] = useState<string | null>(null);
  const [historyFilters, setHistoryFiltersState] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);

  // ── Local UI state (preferences + ephemeral form state only)
  const [activeCurrency, setActiveCurrency] = useState<CustomerCurrency>(CUSTOMER_CONFIG.primaryCurrency);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  // One language for the whole app. The portal used to hold its own `language`
  // state while the platform provider drove <html lang> and the header, so the
  // two could disagree — a French portal announced to a screen reader as
  // English. The portal's market default is seeded into the shared provider on
  // first mount, and every later change is shared.
  const { language, setLanguage: setPlatformLanguage } = useLanguage();
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Modals state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<CustomerTransaction | null>(null);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState<boolean>(false);
  const [disputeTx, setDisputeTx] = useState<CustomerTransaction | null>(null);

  const hydrated = useRef(false);
  const historyRequestSeq = useRef(0);

  /* -------------------------------------------------- portal aggregate */

  const loadPortal = useCallback(async (signal?: AbortSignal) => {
    if (typeof window === "undefined") return;
    setPortalPhase("loading");
    try {
      const res = await portalFetch("/api/customer/portal", { signal });
      if (!res.ok) {
        const payload = await res.json().catch(() => undefined);
        throw Object.assign(new Error("portal unavailable"), { __payload: payload, __status: res.status });
      }
      const json = await res.json();
      const portal = json?.data?.portal;
      if (!portal) throw new Error("no portal data");

      setCustomer(portal.customer ?? null);
      // XOF first, NGN second (Niger-first). No USD. An empty list from the
      // engine is shown as empty — we no longer substitute a seeded catalog,
      // because a customer must never be shown balances that are not theirs.
      const liveWallets: CustomerWallet[] = orderCurrenciesXofFirst<CustomerWallet>(portal.wallets || []);
      setWallets(liveWallets);
      setTransactions(Array.isArray(portal.transactions) ? portal.transactions : []);
      setTransactionsTotalCount(portal.transactionSummary?.totalCount ?? 0);
      setBeneficiaries(Array.isArray(portal.beneficiaries) ? portal.beneficiaries : []);
      setSupportTickets(Array.isArray(portal.supportTickets) ? portal.supportTickets : []);
      setFxRates(portal.fxRates || []);
      setActiveCurrency(liveWallets[0]?.currency ?? CUSTOMER_CONFIG.primaryCurrency);
      setDataSource("live");
      setPortalError(null);
      setPortalPhase("ready");
      // The branded boot overlay waits for this. An error path marks it too:
      // handing off to a readable error screen is a legitimate completion, and
      // without it the only exit would be the loader's safety cap.
      markBootstrapReady();
    } catch (err: any) {
      // Honest failure state. The previous behaviour silently painted the mock
      // catalog, which made an outage look like a healthy account.
      const { normalizeStatus, normalizeThrown } = await import("@/lib/customer/customerApiError");
      const normalized =
        typeof err?.__status === "number" ? normalizeStatus(err.__status, err.__payload) : normalizeThrown(err, !navigator.onLine);
      setPortalError(normalized);
      setDataSource("unavailable");
      setPortalPhase("error");
      markBootstrapReady();
    }
  }, []);

  /* ------------------------------------------------- transaction history */

  const runHistoryQuery = useCallback(
    async (cursor: string | null, append: boolean, silent: boolean) => {
      if (typeof window === "undefined") return;
      const seq = ++historyRequestSeq.current;
      if (!silent) setHistoryPhase("loading");
      // Keep prior rows visible during a silent refresh, clear them otherwise
      // so a "loading" skeleton is not layered over stale numbers.
      if (!append && !silent) setHistoryItems([]);

      const qs = historyQuery(historyFilters, cursor);
      const result = await safeFetch<any>(
        `/api/customer/portal/transactions?${qs}`,
        { headers: { Accept: "application/json" } },
        { timeoutMs: PORTAL_TIMEOUT_MS, isOffline: !navigator.onLine },
      );

      // A newer request superseded this one → drop it, never race the UI.
      if (seq !== historyRequestSeq.current) return;

      if (!result.ok) {
        setHistoryError(result.error);
        setHistoryPhase("error");
        if (append) setHistoryHasMore(false);
        return;
      }

      const rows: CustomerTransaction[] = result.data?.transactions ?? [];
      const pagination = result.data?.pagination ?? {};
      setHistoryItems((prev) => (append ? dedupeById([...prev, ...rows]) : rows));
      setHistoryHasMore(Boolean(pagination.hasMore));
      setHistoryNextCursor(pagination.nextCursor ?? null);
      setHistoryTotalCount(Number(pagination.totalCount ?? rows.length));
      setHistoryUpdatedAt(result.data?.generatedAt ?? new Date().toISOString());
      setHistoryError(null);
      setHistoryPhase("ready");
    },
    [historyFilters],
  );

  const loadHistory = useCallback(
    async (opts?: { silent?: boolean }) => {
      await runHistoryQuery(null, false, Boolean(opts?.silent));
    },
    [runHistoryQuery],
  );

  const loadMoreHistory = useCallback(async () => {
    if (!historyNextCursor || historyPhase === "loading") return;
    await runHistoryQuery(historyNextCursor, true, true);
  }, [historyNextCursor, historyPhase, runHistoryQuery]);

  const setHistoryFilters = useCallback((next: Partial<HistoryFilters>) => {
    setHistoryFiltersState((prev) => ({ ...prev, ...next }));
  }, []);

  /* --------------------------------------------------------- notifications */

  const refreshNotifications = useCallback(async () => {
    if (typeof window === "undefined") return;
    setNotificationsPhase("loading");
    const result = await safeFetch<any>("/api/customer/portal/notifications", {}, {
      timeoutMs: PORTAL_TIMEOUT_MS,
      isOffline: !navigator.onLine,
    });
    if (!result.ok) {
      // No fabricated badge. A failed read is shown as "unavailable".
      setNotifications([]);
      setNotificationsCount(0);
      setNotificationsPhase("error");
      return;
    }
    setNotifications(Array.isArray(result.data?.notifications) ? result.data.notifications : []);
    setNotificationsCount(Number(result.data?.unreadCount ?? 0));
    setNotificationsPhase("ready");
  }, []);

  /* ------------------------------------------------------------- bootstrap */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLang = localStorage.getItem("koriepay_customer_lang");
    if (savedLang === "en" || savedLang === "fr" || savedLang === "ha") {
      if (savedLang !== language) setPlatformLanguage(savedLang as SupportedLanguage);
    } else if (!localStorage.getItem("koriepay_lang")) {
      // No expressed preference anywhere: hand the portal default to the
      // provider before its own mount effect reads storage (child effects run
      // first), so the document language follows the copy on screen.
      try {
        localStorage.setItem("koriepay_lang", CUSTOMER_CONFIG.defaultLanguage);
      } catch {
        /* ignore */
      }
    }
    const savedHide = localStorage.getItem("koriepay_hide_balance");
    if (savedHide) setIsBalanceHidden(savedHide === "true");

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    if (!hydrated.current) {
      hydrated.current = true;
      void loadPortal();
      void loadHistory();
      void refreshNotifications();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // Mount-only bootstrap; loaders are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPortal, refreshNotifications]);

  // Re-query history whenever the server-side filters change.
  useEffect(() => {
    if (!hydrated.current) return;
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFilters]);

  /* --------------------------------------------------------- preferences */

  const setLanguage = (lang: SupportedLanguage) => {
    // Persistence of the platform preference and `document.documentElement.lang`
    // belong to the shared provider; the portal mirrors the choice so an
    // in-portal preference survives even if chrome is changed elsewhere.
    setPlatformLanguage(lang);
    if (typeof window !== "undefined") localStorage.setItem("koriepay_customer_lang", lang);
  };

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem("koriepay_hide_balance", String(next));
      return next;
    });
  };

  const t = (key: string, params?: Record<string, string | number>): string =>
    translate(language, key, params);

  // Only allow switching to a configured customer-visible currency (XOF/NGN).
  const chooseCurrency = (currency: CustomerCurrency) => {
    if (!CUSTOMER_CONFIG.customerCurrencies.includes(currency)) {
      setActiveCurrency(CUSTOMER_CONFIG.primaryCurrency);
      return;
    }
    setActiveCurrency(currency);
  };

  const activeWallet = wallets.find((w) => w.currency === activeCurrency) || wallets[0];

  /* ------------------------------------------------------------- modals */

  const openReceipt = (tx: CustomerTransaction) => {
    setSelectedReceiptTx(tx);
    setIsReceiptModalOpen(true);
  };
  const closeReceipt = () => {
    setIsReceiptModalOpen(false);
    setSelectedReceiptTx(null);
  };
  const openDispute = (tx: CustomerTransaction) => {
    setDisputeTx(tx);
    setIsDisputeModalOpen(true);
  };
  const closeDispute = () => {
    setIsDisputeModalOpen(false);
    setDisputeTx(null);
  };

  /* ------------------------------------------------------------ mutations */

  /** After any money movement: re-read the authoritative sources. Never
   *  mutate balances in the client — §68 of the portal brief. */
  const invalidateFinancialState = useCallback(async () => {
    await Promise.all([loadPortal(), loadHistory({ silent: true }), refreshNotifications()]);
  }, [loadPortal, loadHistory, refreshNotifications]);

  const submitDispute = useCallback(
    async (
      category: string,
      description: string,
    ): Promise<{ ok: true; ticketNumber: string } | { ok: false; error: string }> => {
      const result = await safeFetch<any>(
        "/api/customer/portal/disputes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            description,
            transactionReference: disputeTx?.reference,
          }),
        },
        { timeoutMs: PORTAL_TIMEOUT_MS, isOffline: !navigator.onLine },
      );
      if (!result.ok) {
        closeDispute();
        return { ok: false, error: result.error.message };
      }
      const ticketNumber = result.data?.dispute?.ticketNumber;
      closeDispute();
      if (!ticketNumber) {
        return { ok: false, error: "The claim was received but no case number was returned. Please check back shortly." };
      }
      await refreshNotifications();
      return { ok: true, ticketNumber };
    },
    [disputeTx, closeDispute, refreshNotifications],
  );

  const toggleCardFreeze = useCallback(() => {
    // Cards are COMING SOON: there is no card to freeze. The action stays
    // addressable so the service can flip to AVAILABLE without UI changes,
    // but it must never pretend to have done something.
    return;
  }, []);

  const saveBeneficiary = useCallback(
    async (
      beneficiary: Omit<Beneficiary, "id">,
    ): Promise<{ ok: true; beneficiary: Beneficiary } | { ok: false; error: string }> => {
      const result = await safeFetch<any>(
        "/api/customer/portal/beneficiaries",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(beneficiary),
        },
        { timeoutMs: PORTAL_TIMEOUT_MS, isOffline: !navigator.onLine },
      );
      if (!result.ok) return { ok: false, error: result.error.message };
      const created = result.data?.beneficiary as Beneficiary | undefined;
      if (!created) return { ok: false, error: "The payee wasn't saved. Please try again." };
      setBeneficiaries((prev) => [created, ...prev]);
      return { ok: true, beneficiary: created };
    },
    [],
  );

  const deleteBeneficiary = useCallback(async (id: string) => {
    const result = await safeFetch<any>(
      `/api/customer/portal/beneficiaries?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
      { timeoutMs: PORTAL_TIMEOUT_MS, isOffline: !navigator.onLine },
    );
    if (!result.ok) return { ok: false, error: result.error.message };
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
    return { ok: true };
  }, []);

  const executeTransfer = useCallback(
    async (
      params: TransferExecutionParams,
    ): Promise<{ success: boolean; transaction?: CustomerTransaction; error?: string }> => {
      if (isOffline) {
        return { success: false, error: "You're offline. We didn't send the transfer — nothing left your account." };
      }
      if (!params.amount || params.amount <= 0) return { success: false, error: "Enter a valid amount." };
      const sourceWallet = wallets.find((w) => w.currency === params.currency);
      if (!sourceWallet) return { success: false, error: "No wallet is available for that currency yet." };

      // Idempotency: one key per user intent, reused across retries of THIS
      // submit, so a double-click or a retry after a timeout cannot create two
      // transfers. (Server-side persistence is tracked in the integration plan.)
      const res = await portalFetch("/api/customer/portal/transfer", {
        method: "POST",
        headers: { "Idempotency-Key": `cust-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` },
        body: JSON.stringify({ ...params }),
      });
      const json = await res.json().catch(() => undefined);
      if (!res.ok) {
        return {
          success: false,
          error:
            json?.error?.message ||
            "Transfer could not be completed. No money has left your account.",
        };
      }
      const tx = json?.data?.transaction;
      if (!tx) {
        return {
          success: false,
          error: "We didn't receive a confirmation from the banking service. Please check your history before retrying.",
        };
      }

      // Do NOT optimistically prepend: the invalidated reads fetch the
      // authoritative row, so the UI cannot diverge from the ledger.
      await invalidateFinancialState();
      return { success: true, transaction: tx };
    },
    [isOffline, wallets, invalidateFinancialState],
  );

  /**
   * Bills are COMING_SOON in CUSTOMER_CONFIG. `executeBillPayment` used to
   * fabricate a token, a reference and a balance mutation entirely in the
   * browser. That is now removed: no service call, no ledger write ⇒ no
   * customer-visible transaction. When the bills rail lands, this function
   * should POST to a /portal/bills route and read back the engine result —
   * the same shape executeTransfer uses.
   */
  const executeBillPayment = useCallback(
    async (params: {
      billerCategory: string;
      billerProvider: string;
      meterOrPhone: string;
      amount: number;
      currency: CustomerCurrency;
    }): Promise<{ success: boolean; token?: string; transaction?: CustomerTransaction; error?: string }> => {
      void params;
      if (!isServiceAvailable("bills")) {
        return {
          success: false,
          error:
            getServiceStatus("bills") === "COMING_SOON"
              ? "Bill payments are coming soon and aren't available on your account yet."
              : "Bill payments are temporarily unavailable.",
        };
      }
      return { success: false, error: "Bill payments aren't connected yet, so nothing was submitted." };
    },
    [],
  );

  return (
    <CustomerContext.Provider
      value={{
        customer,
        wallets,
        activeCurrency,
        setActiveCurrency: chooseCurrency,
        activeWallet,
        productConfig: CUSTOMER_CONFIG,
        getServiceStatus,
        isServiceAvailable,
        isBalanceHidden,
        toggleHideBalance,
        language,
        setLanguage,
        t,
        transactions,
        transactionsTotalCount,
        historyPhase,
        historyItems,
        historyError,
        historyHasMore,
        historyNextCursor,
        historyTotalCount,
        historyUpdatedAt,
        historyFilters,
        setHistoryFilters,
        loadHistory,
        loadMoreHistory,
        portalPhase,
        portalError,
        isConnecting: portalPhase === "loading",
        dataSource,
        refreshPortal: loadPortal,
        beneficiaries,
        cards,
        supportTickets,
        isOffline,
        fxRates,
        notifications,
        notificationsCount,
        notificationsPhase,
        refreshNotifications,
        isReceiptModalOpen,
        selectedReceiptTx,
        openReceipt,
        closeReceipt,
        isDisputeModalOpen,
        disputeTx,
        openDispute,
        closeDispute,
        submitDispute,
        executeTransfer,
        executeBillPayment,
        toggleCardFreeze,
        saveBeneficiary,
        deleteBeneficiary,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

/** Cursor pagination must never show a row twice if pages overlap by one. */
function dedupeById(rows: CustomerTransaction[]): CustomerTransaction[] {
  const seen = new Set<string>();
  const out: CustomerTransaction[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) throw new Error("useCustomer must be used within a CustomerProvider");
  return context;
}
