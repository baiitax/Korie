"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  AgentUser,
  AgentLiquidity,
  AgentCustomer,
  AgencyTransaction,
  DailyCashReconciliation,
  AgentTerminalInfo,
  AgencyRiskAlert,
  AgentCurrency,
} from "@/types/agent";
import { SupportedLanguage } from "@/types/customer";
import {
  CURRENT_AGENT,
  INITIAL_LIQUIDITY,
  AGENT_CUSTOMERS,
  AGENCY_TRANSACTIONS,
  DAILY_RECONCILIATIONS,
  ACTIVE_TERMINAL,
  AGENCY_ALERTS,
  calculateAgentCommission,
} from "@/services/agentDataService";
import { translateAgency } from "@/locales/agency";

interface CashInExecutionParams {
  customerName: string;
  customerAccount: string;
  customerBank: string;
  customerPhone?: string;
  amount: number;
}

interface CashOutExecutionParams {
  customerName: string;
  customerAccount: string;
  customerBank: string;
  customerPhone?: string;
  amount: number;
}

interface AgentContextType {
  agent: AgentUser;
  liquidity: AgentLiquidity;
  currency: AgentCurrency;
  setCurrency: (c: AgentCurrency) => void;
  isBalanceHidden: boolean;
  toggleHideBalance: () => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  customers: AgentCustomer[];
  transactions: AgencyTransaction[];
  terminal: AgentTerminalInfo;
  alerts: AgencyRiskAlert[];
  reconciliations: DailyCashReconciliation[];
  isOffline: boolean;

  // Modals & Sheets
  isReceiptModalOpen: boolean;
  selectedReceiptTx: AgencyTransaction | null;
  receiptLanguage: SupportedLanguage;
  setReceiptLanguage: (lang: SupportedLanguage) => void;
  openReceipt: (tx: AgencyTransaction) => void;
  closeReceipt: () => void;

  isReconciliationModalOpen: boolean;
  openReconciliation: () => void;
  closeReconciliation: () => void;

  // Operations
  executeCashIn: (params: CashInExecutionParams) => Promise<{
    success: boolean;
    transaction?: AgencyTransaction;
    error?: string;
  }>;

  executeCashOut: (params: CashOutExecutionParams) => Promise<{
    success: boolean;
    transaction?: AgencyTransaction;
    error?: string;
  }>;

  executeTransfer: (params: {
    recipientName: string;
    recipientBank: string;
    recipientAccount: string;
    amount: number;
  }) => Promise<{
    success: boolean;
    transaction?: AgencyTransaction;
    error?: string;
  }>;

  submitReconciliation: (actualPhysicalCash: number, notes?: string) => Promise<{
    success: boolean;
    record?: DailyCashReconciliation;
  }>;

  notificationsCount: number;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [agent, setAgent] = useState<AgentUser>(CURRENT_AGENT);
  const [liquidity, setLiquidity] = useState<AgentLiquidity>(INITIAL_LIQUIDITY);
  const [currency, setCurrency] = useState<AgentCurrency>("NGN");
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  const [language, setLanguageState] = useState<SupportedLanguage>("ha");
  const [receiptLanguage, setReceiptLanguage] = useState<SupportedLanguage>("ha");
  const [customers, setCustomers] = useState<AgentCustomer[]>(AGENT_CUSTOMERS);
  const [transactions, setTransactions] = useState<AgencyTransaction[]>(AGENCY_TRANSACTIONS);
  const [terminal, setTerminal] = useState<AgentTerminalInfo>(ACTIVE_TERMINAL);
  const [alerts, setAlerts] = useState<AgencyRiskAlert[]>(AGENCY_ALERTS);
  const [reconciliations, setReconciliations] = useState<DailyCashReconciliation[]>(DAILY_RECONCILIATIONS);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(2);

  // Modals
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<AgencyTransaction | null>(null);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("koriepay_agent_lang") as SupportedLanguage;
      if (savedLang) {
        setLanguageState(savedLang);
        setReceiptLanguage(savedLang);
      }
      const savedHide = localStorage.getItem("koriepay_agent_hide_balance");
      if (savedHide) {
        setIsBalanceHidden(savedHide === "true");
      }

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
      localStorage.setItem("koriepay_agent_lang", lang);
    }
  };

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("koriepay_agent_hide_balance", String(next));
      }
      return next;
    });
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    return translateAgency(language, key, params);
  };

  const openReceipt = (tx: AgencyTransaction) => {
    setSelectedReceiptTx(tx);
    setIsReceiptModalOpen(true);
  };

  const closeReceipt = () => {
    setIsReceiptModalOpen(false);
    setSelectedReceiptTx(null);
  };

  const openReconciliation = () => setIsReconciliationModalOpen(true);
  const closeReconciliation = () => setIsReconciliationModalOpen(false);

  // CASH-IN: Agent collects cash (+CashInHand), debits wallet float (-WalletFloat), credits customer bank
  const executeCashIn = async (params: CashInExecutionParams) => {
    if (isOffline) {
      return { success: false, error: "Offline network. Transaction blocked for safety." };
    }

    if (liquidity.walletFloat < params.amount) {
      return { success: false, error: "Insufficient wallet float balance. Please fund float." };
    }

    const { customerFee, agentCommission } = calculateAgentCommission("CASH_IN", params.amount);

    // Update float state
    setLiquidity((prev) => {
      const newWalletFloat = prev.walletFloat - params.amount;
      const newCash = prev.cashInHand + params.amount;
      const newTotal = newWalletFloat + newCash;
      const health = newCash < prev.cashThresholdMin ? "LOW" : "HEALTHY";

      return {
        ...prev,
        walletFloat: newWalletFloat,
        cashInHand: newCash,
        totalLiquidity: newTotal,
        todayCashInVolume: prev.todayCashInVolume + params.amount,
        health,
      };
    });

    setAgent((prev) => ({
      ...prev,
      commissionBalance: prev.commissionBalance + agentCommission,
      dailyCashSpent: prev.dailyCashSpent + params.amount,
    }));

    const txId = `ag-tx-${Date.now()}`;
    const newTx: AgencyTransaction = {
      id: txId,
      reference: `KP-2026-CSHIN-${Math.floor(10000 + Math.random() * 90000)}`,
      providerReference: `PRV-INW-${Math.floor(100000 + Math.random() * 900000)}`,
      type: "CASH_IN",
      title: "Customer Cash-In Deposit",
      amount: params.amount,
      customerFee,
      agentCommission,
      totalAmount: params.amount,
      currency: "NGN",
      status: "SUCCESSFUL",
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerAccount: params.customerAccount,
      customerBank: params.customerBank,
      terminalId: terminal.terminalId,
      agentId: agent.id,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    return { success: true, transaction: newTx };
  };

  // CASH-OUT: Customer account is debited, agent wallet float is credited (+WalletFloat), agent dispenses cash (-CashInHand)
  const executeCashOut = async (params: CashOutExecutionParams) => {
    if (isOffline) {
      return { success: false, error: "Offline network. Transaction blocked for safety." };
    }

    if (liquidity.cashInHand < params.amount) {
      return {
        success: false,
        error: `Insufficient physical cash in hand. Available physical cash: ₦${liquidity.cashInHand.toLocaleString()}`,
      };
    }

    const { customerFee, agentCommission } = calculateAgentCommission("CASH_OUT", params.amount);

    // Update float state
    setLiquidity((prev) => {
      const newWalletFloat = prev.walletFloat + params.amount;
      const newCash = prev.cashInHand - params.amount;
      const newTotal = newWalletFloat + newCash;
      const health = newCash < prev.cashThresholdMin ? "LOW" : "HEALTHY";

      return {
        ...prev,
        walletFloat: newWalletFloat,
        cashInHand: newCash,
        totalLiquidity: newTotal,
        todayCashOutVolume: prev.todayCashOutVolume + params.amount,
        health,
      };
    });

    setAgent((prev) => ({
      ...prev,
      commissionBalance: prev.commissionBalance + agentCommission,
      dailyCashSpent: prev.dailyCashSpent + params.amount,
    }));

    const txId = `ag-tx-${Date.now()}`;
    const newTx: AgencyTransaction = {
      id: txId,
      reference: `KP-2026-CSHOUT-${Math.floor(10000 + Math.random() * 90000)}`,
      providerReference: `PRV-OUT-${Math.floor(100000 + Math.random() * 900000)}`,
      type: "CASH_OUT",
      title: "Customer Cash-Out Withdrawal",
      amount: params.amount,
      customerFee,
      agentCommission,
      totalAmount: params.amount + customerFee,
      currency: "NGN",
      status: "SUCCESSFUL",
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerAccount: params.customerAccount,
      customerBank: params.customerBank,
      terminalId: terminal.terminalId,
      agentId: agent.id,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    return { success: true, transaction: newTx };
  };

  const executeTransfer = async (params: {
    recipientName: string;
    recipientBank: string;
    recipientAccount: string;
    amount: number;
  }) => {
    if (isOffline) {
      return { success: false, error: "Network offline." };
    }

    if (liquidity.walletFloat < params.amount + 50) {
      return { success: false, error: "Insufficient wallet float." };
    }

    const { customerFee, agentCommission } = calculateAgentCommission("TRANSFER_NIP", params.amount);

    setLiquidity((prev) => ({
      ...prev,
      walletFloat: prev.walletFloat - (params.amount + 50),
      totalLiquidity: prev.totalLiquidity - 50,
    }));

    setAgent((prev) => ({
      ...prev,
      commissionBalance: prev.commissionBalance + agentCommission,
    }));

    const newTx: AgencyTransaction = {
      id: `ag-tx-${Date.now()}`,
      reference: `KP-2026-XFER-${Math.floor(10000 + Math.random() * 90000)}`,
      type: "TRANSFER_NIP",
      title: `Transfer to ${params.recipientName}`,
      amount: params.amount,
      customerFee,
      agentCommission,
      totalAmount: params.amount + customerFee,
      currency: "NGN",
      status: "SUCCESSFUL",
      customerName: params.recipientName,
      customerAccount: params.recipientAccount,
      customerBank: params.recipientBank,
      terminalId: terminal.terminalId,
      agentId: agent.id,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    return { success: true, transaction: newTx };
  };

  const submitReconciliation = async (actualPhysicalCash: number, notes?: string) => {
    const openingCash = 500000;
    const expectedClosingCash = openingCash + liquidity.todayCashInVolume - liquidity.todayCashOutVolume;
    const difference = actualPhysicalCash - expectedClosingCash;
    const status = difference === 0 ? "BALANCED" : "DISCREPANCY";

    const record: DailyCashReconciliation = {
      id: `rec-${Date.now()}`,
      reconciliationDate: new Date().toISOString().slice(0, 10),
      openingCash,
      todayCashIn: liquidity.todayCashInVolume,
      todayCashOut: liquidity.todayCashOutVolume,
      expectedClosingCash,
      actualPhysicalCash,
      difference,
      status: status === "BALANCED" ? "APPROVED" : "DISCREPANCY",
      notes: notes || (status === "BALANCED" ? "Vault balanced with internal ledger." : "Cash variance recorded for supervisor review."),
      submittedAt: new Date().toISOString(),
      reviewedBy: "Kano Central Agency Lead",
    };

    setReconciliations((prev) => [record, ...prev]);
    closeReconciliation();

    return { success: true, record };
  };

  return (
    <AgentContext.Provider
      value={{
        agent,
        liquidity,
        currency,
        setCurrency,
        isBalanceHidden,
        toggleHideBalance,
        language,
        setLanguage,
        t,
        customers,
        transactions,
        terminal,
        alerts,
        reconciliations,
        isOffline,
        isReceiptModalOpen,
        selectedReceiptTx,
        receiptLanguage,
        setReceiptLanguage,
        openReceipt,
        closeReceipt,
        isReconciliationModalOpen,
        openReconciliation,
        closeReconciliation,
        executeCashIn,
        executeCashOut,
        executeTransfer,
        submitReconciliation,
        notificationsCount,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
