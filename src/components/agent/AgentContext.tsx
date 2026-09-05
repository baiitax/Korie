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
  FloatTopUpRequest,
  FloatTopUpMethod,
  SubAgent,
  FloatAllocationRecord,
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
  FLOAT_TOPUP_REQUESTS,
  SUB_AGENTS,
  FLOAT_ALLOCATIONS,
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

  // Float Top-Up Requests
  floatTopUpRequests: FloatTopUpRequest[];
  submitFloatTopUpRequest: (params: {
    amount: number;
    method: FloatTopUpMethod;
    proofReference?: string;
  }) => Promise<{ success: boolean; request?: FloatTopUpRequest; error?: string }>;

  // Sub-Agent / Team Management (SUPER_AGENT tier)
  subAgents: SubAgent[];
  floatAllocations: FloatAllocationRecord[];
  allocateFloatToSubAgent: (params: {
    subAgentId: string;
    amount: number;
    note?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  reclaimFloatFromSubAgent: (params: {
    subAgentId: string;
    amount: number;
    note?: string;
  }) => Promise<{ success: boolean; error?: string }>;

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
  const [floatTopUpRequests, setFloatTopUpRequests] = useState<FloatTopUpRequest[]>(FLOAT_TOPUP_REQUESTS);
  const [subAgents, setSubAgents] = useState<SubAgent[]>(SUB_AGENTS);
  const [floatAllocations, setFloatAllocations] = useState<FloatAllocationRecord[]>(FLOAT_ALLOCATIONS);

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

  // FLOAT TOP-UP: agent submits a request, it enters a PENDING approval queue
  // (does not instantly credit the wallet — a treasury reviewer must approve it).
  const submitFloatTopUpRequest = async (params: {
    amount: number;
    method: FloatTopUpMethod;
    proofReference?: string;
  }) => {
    if (isOffline) {
      return { success: false, error: "Offline network. Please reconnect to submit a top-up request." };
    }

    if (!params.amount || params.amount <= 0) {
      return { success: false, error: "Enter a valid top-up amount." };
    }

    const hasPending = floatTopUpRequests.some(
      (r) => r.agentId === agent.id && r.status === "PENDING"
    );
    if (hasPending) {
      return {
        success: false,
        error: "You already have a pending float top-up request awaiting review.",
      };
    }

    const request: FloatTopUpRequest = {
      id: `ftr-${Date.now()}`,
      agentId: agent.id,
      amount: params.amount,
      currency: liquidity.currency,
      method: params.method,
      proofReference: params.proofReference,
      status: "PENDING",
      requestedAt: new Date().toISOString(),
    };

    setFloatTopUpRequests((prev) => [request, ...prev]);

    return { success: true, request };
  };

  // SUB-AGENT FLOAT ALLOCATION: only meaningful for SUPER_AGENT tier agents.
  // Moves float from the super agent's own wallet float into a sub-agent's wallet.
  const allocateFloatToSubAgent = async (params: {
    subAgentId: string;
    amount: number;
    note?: string;
  }) => {
    if (agent.tier !== "SUPER_AGENT") {
      return { success: false, error: "Only Super Agents can allocate float to sub-agents." };
    }
    if (isOffline) {
      return { success: false, error: "Offline network. Float allocation blocked for safety." };
    }
    if (!params.amount || params.amount <= 0) {
      return { success: false, error: "Enter a valid allocation amount." };
    }
    if (liquidity.walletFloat < params.amount) {
      return { success: false, error: "Insufficient super-agent wallet float to allocate." };
    }

    const subAgent = subAgents.find((s) => s.id === params.subAgentId);
    if (!subAgent) {
      return { success: false, error: "Sub-agent not found." };
    }

    setLiquidity((prev) => ({
      ...prev,
      walletFloat: prev.walletFloat - params.amount,
      totalLiquidity: prev.totalLiquidity - params.amount,
    }));

    setSubAgents((prev) =>
      prev.map((s) =>
        s.id === params.subAgentId
          ? {
              ...s,
              walletFloat: s.walletFloat + params.amount,
              health: s.walletFloat + params.amount >= s.cashThresholdMin ? "HEALTHY" : s.health,
              status: s.status === "LOW_FLOAT" ? "ACTIVE" : s.status,
            }
          : s
      )
    );

    const record: FloatAllocationRecord = {
      id: `falc-${Date.now()}`,
      subAgentId: subAgent.id,
      subAgentName: subAgent.agentName,
      direction: "ALLOCATE",
      amount: params.amount,
      currency: liquidity.currency,
      timestamp: new Date().toISOString(),
      note: params.note,
    };
    setFloatAllocations((prev) => [record, ...prev]);

    return { success: true };
  };

  // SUB-AGENT FLOAT RECLAIM: pulls float back from a sub-agent into the super agent's wallet.
  const reclaimFloatFromSubAgent = async (params: {
    subAgentId: string;
    amount: number;
    note?: string;
  }) => {
    if (agent.tier !== "SUPER_AGENT") {
      return { success: false, error: "Only Super Agents can reclaim float from sub-agents." };
    }
    if (isOffline) {
      return { success: false, error: "Offline network. Float reclaim blocked for safety." };
    }
    if (!params.amount || params.amount <= 0) {
      return { success: false, error: "Enter a valid reclaim amount." };
    }

    const subAgent = subAgents.find((s) => s.id === params.subAgentId);
    if (!subAgent) {
      return { success: false, error: "Sub-agent not found." };
    }
    if (subAgent.walletFloat < params.amount) {
      return { success: false, error: "Sub-agent does not have enough float to reclaim that amount." };
    }

    setSubAgents((prev) =>
      prev.map((s) =>
        s.id === params.subAgentId
          ? {
              ...s,
              walletFloat: s.walletFloat - params.amount,
              health:
                s.walletFloat - params.amount < s.cashThresholdMin ? "LOW" : s.health,
              status:
                s.walletFloat - params.amount < s.cashThresholdMin && s.status === "ACTIVE"
                  ? "LOW_FLOAT"
                  : s.status,
            }
          : s
      )
    );

    setLiquidity((prev) => ({
      ...prev,
      walletFloat: prev.walletFloat + params.amount,
      totalLiquidity: prev.totalLiquidity + params.amount,
    }));

    const record: FloatAllocationRecord = {
      id: `falc-${Date.now()}`,
      subAgentId: subAgent.id,
      subAgentName: subAgent.agentName,
      direction: "RECLAIM",
      amount: params.amount,
      currency: liquidity.currency,
      timestamp: new Date().toISOString(),
      note: params.note,
    };
    setFloatAllocations((prev) => [record, ...prev]);

    return { success: true };
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
        floatTopUpRequests,
        submitFloatTopUpRequest,
        subAgents,
        floatAllocations,
        allocateFloatToSubAgent,
        reclaimFloatFromSubAgent,
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
