"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  CustomerUser,
  CustomerWallet,
  CustomerTransaction,
  Beneficiary,
  VirtualCard,
  SupportTicket,
  SupportedLanguage,
  CustomerCurrency,
  CustomerCountry,
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

  // Modals state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<CustomerTransaction | null>(null);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState<boolean>(false);
  const [disputeTx, setDisputeTx] = useState<CustomerTransaction | null>(null);

  // Initialize from LocalStorage and Network Listener
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("koriepay_customer_lang") as SupportedLanguage;
      if (savedLang && (savedLang === "en" || savedLang === "ha" || savedLang === "fr")) {
        setLanguageState(savedLang);
      }
      const savedHide = localStorage.getItem("koriepay_hide_balance");
      if (savedHide) {
        setIsBalanceHidden(savedHide === "true");
      }

      // Offline detection
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      setIsOffline(!navigator.onLine);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("koriepay_customer_lang", lang);
    }
  };

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("koriepay_hide_balance", String(next));
      }
      return next;
    });
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    return translate(language, key, params);
  };

  const activeWallet =
    wallets.find((w) => w.currency === activeCurrency) || wallets[0];

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
        {
          id: `msg-${Date.now()}`,
          sender: "CUSTOMER",
          senderName: customer.fullName,
          message: description,
          timestamp: "Just now",
        },
      ],
    };
    setSupportTickets((prev) => [newTicket, ...prev]);
    closeDispute();
    return ticketId;
  };

  const toggleCardFreeze = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, status: c.status === "ACTIVE" ? "FROZEN" : "ACTIVE" }
          : c
      )
    );
  };

  const saveBeneficiary = (ben: Omit<Beneficiary, "id">) => {
    const newBen: Beneficiary = {
      ...ben,
      id: `ben-${Date.now()}`,
    };
    setBeneficiaries((prev) => [newBen, ...prev]);
  };

  const deleteBeneficiary = (id: string) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  };

  const executeTransfer = async (
    params: TransferExecutionParams
  ): Promise<{
    success: boolean;
    transaction?: CustomerTransaction;
    error?: string;
  }> => {
    if (isOffline) {
      return { success: false, error: "Network connection offline. Transfer blocked for safety." };
    }

    const sourceWallet = wallets.find((w) => w.currency === params.currency);
    if (!sourceWallet) {
      return { success: false, error: "Source wallet not found." };
    }

    const fee = params.isCrossBorder ? (params.currency === "NGN" ? 1250 : 500) : params.currency === "NGN" ? 50 : 25;
    const totalDebit = params.amount + fee;

    if (sourceWallet.availableBalance < totalDebit) {
      return { success: false, error: `Insufficient funds. Wallet balance: ${params.currency} ${sourceWallet.availableBalance.toLocaleString()}` };
    }

    if (sourceWallet.dailySpent + totalDebit > sourceWallet.dailyLimit) {
      return { success: false, error: "Daily limit exceeded for this tier level." };
    }

    // Deduct balance
    setWallets((prev) =>
      prev.map((w) =>
        w.currency === params.currency
          ? {
              ...w,
              availableBalance: w.availableBalance - totalDebit,
              ledgerBalance: w.ledgerBalance - totalDebit,
              dailySpent: w.dailySpent + totalDebit,
            }
          : w
      )
    );

    const txId = `tx-cust-${Date.now()}`;
    const txRef = `KP-2026-${params.isCrossBorder ? "XFER" : "NIP"}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newTx: CustomerTransaction = {
      id: txId,
      reference: txRef,
      providerReference: `PRV-${Math.floor(100000 + Math.random() * 900000)}`,
      type: params.isCrossBorder ? "TRANSFER_CROSS_BORDER" : "TRANSFER_NIP",
      title: `Transfer to ${params.recipientName}`,
      description: params.description || (params.isCrossBorder ? "Cross-border bilateral payment" : "Direct interbank transfer"),
      amount: params.amount,
      fee,
      totalAmount: totalDebit,
      currency: params.currency,
      direction: "OUTWARD",
      status: "SUCCESSFUL",
      recipientName: params.recipientName,
      recipientBank: params.recipientBank,
      recipientAccount: params.recipientAccount,
      senderName: customer.fullName,
      senderBank: sourceWallet.bankName,
      category: "TRANSFERS",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      timeline: [
        { title: "Transfer Initiated", description: "Authenticated via 4-Digit Security PIN", timestamp: "Just now", status: "COMPLETED" },
        { title: "Banking Rail Authorization", description: `Dispatched to ${sourceWallet.bankName}`, timestamp: "Just now", status: "COMPLETED" },
        { title: "Cleared & Settled", description: `Delivered to ${params.recipientName}`, timestamp: "Just now", status: "COMPLETED" },
      ],
    };

    setTransactions((prev) => [newTx, ...prev]);

    return { success: true, transaction: newTx };
  };

  const executeBillPayment = async (params: {
    billerCategory: string;
    billerProvider: string;
    meterOrPhone: string;
    amount: number;
    currency: CustomerCurrency;
  }): Promise<{
    success: boolean;
    token?: string;
    transaction?: CustomerTransaction;
    error?: string;
  }> => {
    if (isOffline) {
      return { success: false, error: "Network connection offline." };
    }

    const sourceWallet = wallets.find((w) => w.currency === params.currency);
    if (!sourceWallet || sourceWallet.availableBalance < params.amount) {
      return { success: false, error: "Insufficient balance for bill payment." };
    }

    const fee = params.billerCategory === "ELECTRICITY" ? 100 : 0;
    const totalDebit = params.amount + fee;

    setWallets((prev) =>
      prev.map((w) =>
        w.currency === params.currency
          ? {
              ...w,
              availableBalance: w.availableBalance - totalDebit,
              ledgerBalance: w.ledgerBalance - totalDebit,
              dailySpent: w.dailySpent + totalDebit,
            }
          : w
      )
    );

    const isElectricity = params.billerCategory === "ELECTRICITY";
    const generatedToken = isElectricity
      ? `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
      : undefined;

    const newTx: CustomerTransaction = {
      id: `tx-bill-${Date.now()}`,
      reference: `KP-2026-BILL-${Math.floor(10000 + Math.random() * 90000)}`,
      type: isElectricity ? "BILL_ELECTRICITY" : "BILL_AIRTIME",
      title: `${params.billerProvider} Payment`,
      description: `Bill settlement for ${params.meterOrPhone}`,
      amount: params.amount,
      fee,
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

    return {
      success: true,
      token: generatedToken,
      transaction: newTx,
    };
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
  if (!context) {
    throw new Error("useCustomer must be used within a CustomerProvider");
  }
  return context;
}
