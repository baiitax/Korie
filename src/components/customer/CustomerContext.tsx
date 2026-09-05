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
} from "@/types/customer";
import {
  CURRENT_CUSTOMER,
  CUSTOMER_WALLETS,
  CUSTOMER_TRANSACTIONS,
  CUSTOMER_BENEFICIARIES,
  CUSTOMER_CARDS,
  CUSTOMER_SUPPORT_TICKETS,
} from "@/services/customerDataService";
import { translate } from "@/locales";
import { portalFetch } from "@/lib/customerPortalClient";

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

interface CustomerContextType {
  customer: CustomerUser;
  wallets: CustomerWallet[];
  activeCurrency: CustomerCurrency;
  setActiveCurrency: (currency: CustomerCurrency) => void;
  activeWallet: CustomerWallet;
  isBalanceHidden: boolean;
  toggleHideBalance: () => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  transactions: CustomerTransaction[];
  beneficiaries: Beneficiary[];
  cards: VirtualCard[];
  supportTickets: SupportTicket[];
  isOffline: boolean;
  /** "live" when data was loaded from the engine-backed portal API; "demo" when
   * the app fell back to the seeded local catalog (e.g. static preview/offline). */
  dataSource: "live" | "demo";
  isConnecting: boolean;
  /** Engine execution rates (match the rate applied on cross-border transfer). */
  fxRates: { fromCurrency: CustomerCurrency; toCurrency: CustomerCurrency; rate: number; source: string }[];

  // Modals & Sheets
  isReceiptModalOpen: boolean;
  selectedReceiptTx: CustomerTransaction | null;
  openReceipt: (tx: CustomerTransaction) => void;
  closeReceipt: () => void;

  isDisputeModalOpen: boolean;
  disputeTx: CustomerTransaction | null;
  openDispute: (tx: CustomerTransaction) => void;
  closeDispute: () => void;
  submitDispute: (category: string, description: string) => Promise<string>;

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
  saveBeneficiary: (beneficiary: Omit<Beneficiary, "id">) => void;
  deleteBeneficiary: (id: string) => void;
  notificationsCount: number;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser>(CURRENT_CUSTOMER);
  const [wallets, setWallets] = useState<CustomerWallet[]>(CUSTOMER_WALLETS);
  const [activeCurrency, setActiveCurrency] = useState<CustomerCurrency>("NGN");
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [transactions, setTransactions] = useState<CustomerTransaction[]>(CUSTOMER_TRANSACTIONS);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(CUSTOMER_BENEFICIARIES);
  const [cards, setCards] = useState<VirtualCard[]>(CUSTOMER_CARDS);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(CUSTOMER_SUPPORT_TICKETS);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(3);
  const [dataSource, setDataSource] = useState<"live" | "demo">("demo");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [fxRates, setFxRates] = useState<
    { fromCurrency: CustomerCurrency; toCurrency: CustomerCurrency; rate: number; source: string }[]
  >([]);
  const hydrated = useRef(false);

  // Modals state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<CustomerTransaction | null>(null);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState<boolean>(false);
  const [disputeTx, setDisputeTx] = useState<CustomerTransaction | null>(null);

  // Hydrate customer data from the live portal API (engine-backed). Falls back
  // to the seeded catalog only if the API is unreachable (offline/static).
  const loadPortal = useCallback(async (signal?: AbortSignal) => {
    if (typeof window === "undefined") return;
    setIsConnecting(true);
    try {
      const res = await portalFetch("/api/customer/portal", { signal });
      if (!res.ok) throw new Error("portal unavailable");
      const json = await res.json();
      const portal = json?.data?.portal;
      if (!portal) throw new Error("no portal data");
      setCustomer(portal.customer);
      setWallets(portal.wallets.length ? portal.wallets : CUSTOMER_WALLETS);
      setTransactions(portal.transactions?.length ? portal.transactions : CUSTOMER_TRANSACTIONS);
      setBeneficiaries(portal.beneficiaries?.length ? portal.beneficiaries : CUSTOMER_BENEFICIARIES);
      setCards(portal.cards?.length ? portal.cards : CUSTOMER_CARDS);
      setSupportTickets(portal.supportTickets?.length ? portal.supportTickets : CUSTOMER_SUPPORT_TICKETS);
      setFxRates(portal.fxRates || []);
      setActiveCurrency(portal.wallets?.[0]?.currency || "NGN");
      setDataSource("live");
    } catch {
      // Keep seeded catalog; mark as demo. Never block the UI for a data load.
      setDataSource("demo");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Initialize from LocalStorage + Network Listener + first data load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("koriepay_customer_lang") as SupportedLanguage;
      if (savedLang && (savedLang === "en" || savedLang === "ha" || savedLang === "fr")) {
        setLanguageState(savedLang);
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
        loadPortal();
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [loadPortal]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
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

  const activeWallet = wallets.find((w) => w.currency === activeCurrency) || wallets[0];

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

  const submitDispute = async (category: string, description: string): Promise<string> => {
    const ticketId = `KP-DISP-${Math.floor(10000 + Math.random() * 90000)}`;
    const newTicket: SupportTicket = {
      id: `tick-${Date.now()}`,
      ticketNumber: ticketId,
      subject: `Claim on Tx: ${disputeTx?.reference || "Dispute"}`,
      category: "TRANSACTION_DISPUTE",
      transactionReference: disputeTx?.reference,
      status: "OPEN",
      priority: "HIGH",
      description,
      lastReplyBy: "System Dispatcher",
      lastReplyAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      messages: [
        { id: `msg-${Date.now()}`, sender: "CUSTOMER", senderName: customer.fullName, message: description, timestamp: "Just now" },
      ],
    };
    setSupportTickets((prev) => [newTicket, ...prev]);
    closeDispute();
    return ticketId;
  };

  const toggleCardFreeze = (cardId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status: c.status === "ACTIVE" ? "FROZEN" : "ACTIVE" } : c)));
  };

  const saveBeneficiary = (ben: Omit<Beneficiary, "id">) => {
    setBeneficiaries((prev) => [{ ...ben, id: `ben-${Date.now()}` }, ...prev]);
  };
  const deleteBeneficiary = (id: string) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  };

  const executeTransfer = async (
    params: TransferExecutionParams
  ): Promise<{ success: boolean; transaction?: CustomerTransaction; error?: string }> => {
    if (isOffline) {
      return { success: false, error: "Network connection offline. Transfer blocked for safety." };
    }

    // Invalid / short-circuit client validation.
    if (!params.amount || params.amount <= 0) return { success: false, error: "Enter a valid amount." };
    const sourceWallet = wallets.find((w) => w.currency === params.currency);
    if (!sourceWallet) return { success: false, error: "Source wallet not found." };

    try {
      const res = await portalFetch("/api/customer/portal/transfer", {
        method: "POST",
        body: JSON.stringify({ ...params }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json?.error?.message || "Transfer could not be completed. Please try again." };
      }
      const tx = json?.data?.transaction;
      if (!tx) return { success: false, error: "No transaction returned from the server." };

      // Authority: reflect the server-returned transaction and refresh balances.
      setTransactions((prev) => [tx, ...prev]);
      await loadPortal();
      return { success: true, transaction: tx };
    } catch (e: any) {
      return { success: false, error: "Transfer could not be completed. Please check your connection and try again." };
    }
  };

  const executeBillPayment = async (params: {
    billerCategory: string;
    billerProvider: string;
    meterOrPhone: string;
    amount: number;
    currency: CustomerCurrency;
  }): Promise<{ success: boolean; token?: string; transaction?: CustomerTransaction; error?: string }> => {
    if (isOffline) return { success: false, error: "Network connection offline." };
    const sourceWallet = wallets.find((w) => w.currency === params.currency);
    if (!sourceWallet || sourceWallet.availableBalance < params.amount) {
      return { success: false, error: "Insufficient balance for bill payment." };
    }

    const isElectricity = params.billerCategory === "ELECTRICITY";
    const totalDebit = params.amount + (isElectricity ? 100 : 0);
    const generatedToken = isElectricity
      ? `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
      : undefined;

    setWallets((prev) =>
      prev.map((w) =>
        w.currency === params.currency
          ? { ...w, availableBalance: w.availableBalance - totalDebit, ledgerBalance: w.ledgerBalance - totalDebit, dailySpent: w.dailySpent + totalDebit }
          : w
      )
    );

    const newTx: CustomerTransaction = {
      id: `tx-bill-${Date.now()}`,
      reference: `KP-2026-BILL-${Math.floor(10000 + Math.random() * 90000)}`,
      type: isElectricity ? "BILL_ELECTRICITY" : "BILL_AIRTIME",
      title: `${params.billerProvider} Payment`,
      description: `Bill settlement for ${params.meterOrPhone}`,
      amount: params.amount,
      fee: isElectricity ? 100 : 0,
      totalAmount: totalDebit,
      currency: params.currency,
      direction: "OUTWARD",
      status: "SUCCESSFUL",
      billerCategory: params.billerCategory,
      billerProvider: params.billerProvider,
      billerCustomerToken: generatedToken,
      category: "BILLS",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      timeline: [
        { title: "Bill Payment Dispatched", description: "Direct Provider Gateway Vending", timestamp: "Just now", status: "COMPLETED" },
        { title: "Receipt Generated", description: generatedToken ? `Token: ${generatedToken}` : "Delivered to device", timestamp: "Just now", status: "COMPLETED" },
      ],
    };
    setTransactions((prev) => [newTx, ...prev]);
    return { success: true, token: generatedToken, transaction: newTx };
  };

  return (
    <CustomerContext.Provider
      value={{
        customer,
        wallets,
        activeCurrency,
        setActiveCurrency,
        activeWallet,
        isBalanceHidden,
        toggleHideBalance,
        language,
        setLanguage,
        t,
        transactions,
        beneficiaries,
        cards,
        supportTickets,
        isOffline,
        dataSource,
        isConnecting,
        fxRates,
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
        notificationsCount,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) throw new Error("useCustomer must be used within a CustomerProvider");
  return context;
}
