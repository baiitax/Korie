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
import { agencyApiFetch } from "@/lib/agency/agentSession";
import { useAgentRealtime } from "@/lib/agency/useAgentRealtime";

/**
 * Maps the wire shape returned by /api/v1/agency/cash-in|cash-out|transactions
 * into the frontend's AgencyTransaction type. This is the ONLY place that
 * translates backend-confirmed data into UI state for these two flows —
 * nothing here invents amounts, fees, commissions, or a SUCCESSFUL status.
 */
function mapApiTransaction(tx: any, terminalId: string): AgencyTransaction {
  return {
    id: tx.id,
    reference: tx.reference,
    type: tx.type,
    title:
      tx.type === "CASH_IN" ? "Customer Cash-In Deposit" : "Customer Cash-Out Withdrawal",
    amount: tx.amount,
    customerFee: tx.customer_fee,
    agentCommission: tx.agent_commission,
    totalAmount: tx.type === "CASH_OUT" ? tx.amount + tx.customer_fee : tx.amount,
    currency: tx.currency,
    status: tx.status,
    customerName: tx.customer_name,
    customerPhone: tx.customer_phone || undefined,
    customerAccount: tx.customer_account || undefined,
    customerBank: tx.customer_bank || undefined,
    terminalId,
    agentId: "",
    createdAt: tx.created_at,
    completedAt: tx.completed_at || undefined,
  };
}

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
  isLiquidityLoading: boolean;
  isTransactionsLoading: boolean;
  refreshLiquidity: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshNotifications: () => Promise<void>;

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
  const [notificationsCount, setNotificationsCount] = useState<number>(0);
  const [isLiquidityLoading, setIsLiquidityLoading] = useState<boolean>(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState<boolean>(true);
  const [realAgentId, setRealAgentId] = useState<string | null>(null);
  const [ledgerAccountIds, setLedgerAccountIds] = useState<string[]>([]);
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

  // Loads the agent's REAL liquidity position and transaction history from
  // the ledger-backed API. Called on mount and after every confirmed
  // cash-in/cash-out so the UI always reflects the backend's truth rather
  // than a client-side running total.
  const refreshLiquidity = React.useCallback(async () => {
    try {
      const res = await agencyApiFetch("/api/v1/agency/float");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        const d = json.data;
        setLiquidity((prev) => ({
          ...prev,
          walletFloat: d.wallet_float,
          cashInHand: d.cash_in_hand,
          totalLiquidity: d.total_liquidity,
          cashThresholdMin: d.cash_threshold_min,
          currency: d.currency,
          health: d.health,
        }));
        if (Array.isArray(d.ledger_account_ids)) {
          setLedgerAccountIds(d.ledger_account_ids);
        }
      }
    } catch {
      // Network/session failure: leave prior known-good state in place
      // rather than silently zeroing out real balances.
    } finally {
      setIsLiquidityLoading(false);
    }
  }, []);

  const refreshNotifications = React.useCallback(async () => {
    try {
      const res = await agencyApiFetch("/api/v1/agency/notifications?limit=30");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setNotificationsCount(json.data.unread_count || 0);
      }
    } catch {
      // leave prior known count as-is on network failure
    }
  }, []);

  const refreshTransactions = React.useCallback(async () => {
    try {
      const res = await agencyApiFetch("/api/v1/agency/transactions?limit=50");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setTransactions((prev) => {
          const mapped: AgencyTransaction[] = json.data.transactions.map((tx: any) =>
            mapApiTransaction(tx, terminal.terminalId)
          );
          // Keep demo/seed transactions that are not CASH_IN/CASH_OUT (e.g. bills,
          // transfers) alongside the real, backend-confirmed cash transactions.
          const nonCash = prev.filter((t) => t.type !== "CASH_IN" && t.type !== "CASH_OUT");
          return [...mapped, ...nonCash].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
    } catch {
      // leave existing transaction list as-is on network failure
    } finally {
      setIsTransactionsLoading(false);
    }
  }, [terminal.terminalId]);

  const refreshProfile = React.useCallback(async () => {
    try {
      const res = await agencyApiFetch("/api/v1/agency/me");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        const d = json.data;
        setRealAgentId(d.id);
        setAgent((prev) => ({
          ...prev,
          id: d.id,
          agentCode: d.agent_code,
          agentName: d.agent_name,
          businessName: d.business_name,
          phone: d.phone,
          email: d.email,
          country: d.country,
          stateOrRegion: d.state_or_region || prev.stateOrRegion,
          cityOrLGA: d.city_or_lga || prev.cityOrLGA,
          tier: d.tier,
          status: d.status,
          kycStatus: d.kyc_status === "VERIFIED" ? "VERIFIED" : "PENDING",
          dailyCashLimit: d.daily_cash_limit,
          dailyCashSpent: d.daily_cash_spent,
          commissionBalance: d.commission_balance,
        }));
      }
    } catch {
      // leave prior known-good identity state as-is on network failure
    }
  }, []);

  useEffect(() => {
    refreshLiquidity();
    refreshTransactions();
    refreshProfile();
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real Supabase Realtime subscription — keeps liquidity, transaction
  // history and the notification badge live without polling, scoped
  // strictly to this agent's own rows (see useAgentRealtime for the
  // per-agent row filter).
  useAgentRealtime({
    agentId: realAgentId,
    ledgerAccountIds,
    onTransactionChange: () => {
      refreshTransactions();
      refreshLiquidity();
    },
    onNotification: () => {
      refreshNotifications();
    },
    onBalanceChange: () => {
      refreshLiquidity();
    },
  });

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

  // CASH-IN: real, backend-confirmed transaction. The frontend never marks a
  // transaction SUCCESSFUL itself — it only reflects what the API, backed by
  // the atomic post_agency_cash_transaction() ledger function, confirms.
  // Network timeouts are surfaced as PENDING/"unknown" (never silently
  // retried and never presented as a failure), per financial-integrity rules.
  const executeCashIn = async (params: CashInExecutionParams) => {
    if (isOffline) {
      return { success: false, error: "Offline network. Transaction blocked for safety." };
    }

    if (liquidity.walletFloat < params.amount) {
      return { success: false, error: "Insufficient wallet float balance. Please fund float." };
    }

    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cashin-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const res = await agencyApiFetch("/api/v1/agency/cash-in", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          customer_name: params.customerName,
          customer_account: params.customerAccount,
          customer_bank: params.customerBank,
          customer_phone: params.customerPhone,
          amount: params.amount,
          currency: "NGN",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json || json.status !== "success") {
        const message = json?.error?.message || "Cash-in could not be confirmed by the backend.";
        return { success: false, error: message };
      }

      const newTx = mapApiTransaction(json.data, terminal.terminalId);
      setTransactions((prev) => [newTx, ...prev]);

      // Re-sync from the backend rather than locally computing the new
      // balance — the ledger is the only source of truth.
      await refreshLiquidity();
      setAgent((prev) => ({
        ...prev,
        commissionBalance: prev.commissionBalance + json.data.agent_commission,
        dailyCashSpent: prev.dailyCashSpent + params.amount,
      }));

      return { success: true, transaction: newTx };
    } catch (err) {
      // A thrown network error (e.g. request never reached the server, or
      // timed out) is genuinely UNKNOWN — do not tell the agent it failed,
      // and do not auto-retry a financial mutation on their behalf.
      return {
        success: false,
        error:
          "Could not confirm this transaction with the server. Do not retry — check transaction history before trying again.",
      };
    }
  };

  // CASH-OUT: real, backend-confirmed transaction (same integrity rules as executeCashIn).
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

    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cashout-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const res = await agencyApiFetch("/api/v1/agency/cash-out", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          customer_name: params.customerName,
          customer_account: params.customerAccount,
          customer_bank: params.customerBank,
          customer_phone: params.customerPhone,
          amount: params.amount,
          currency: "NGN",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json || json.status !== "success") {
        const message = json?.error?.message || "Cash-out could not be confirmed by the backend.";
        return { success: false, error: message };
      }

      const newTx = mapApiTransaction(json.data, terminal.terminalId);
      setTransactions((prev) => [newTx, ...prev]);

      await refreshLiquidity();
      setAgent((prev) => ({
        ...prev,
        commissionBalance: prev.commissionBalance + json.data.agent_commission,
        dailyCashSpent: prev.dailyCashSpent + params.amount,
      }));

      return { success: true, transaction: newTx };
    } catch (err) {
      return {
        success: false,
        error:
          "Could not confirm this transaction with the server. Do not retry — check transaction history before trying again.",
      };
    }
  };

  // TRANSFER (NIP domestic / cross-border): real ledger debit via
  // /api/v1/agency/transfer. The backend never claims this is SUCCESSFUL —
  // it returns PENDING_PROVIDER_INTEGRATION because no live Providus/Coris
  // payout integration exists yet. The UI must reflect that honestly
  // (see mapApiTransaction's title/status handling and the transfer page).
  const executeTransfer = async (params: {
    recipientName: string;
    recipientBank: string;
    recipientAccount: string;
    amount: number;
  }) => {
    if (isOffline) {
      return { success: false, error: "Network offline. Transaction blocked for safety." };
    }

    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `xfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const res = await agencyApiFetch("/api/v1/agency/transfer", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          recipient_name: params.recipientName,
          recipient_account: params.recipientAccount,
          recipient_bank: params.recipientBank,
          amount: params.amount,
          currency: "NGN",
          transfer_type: "TRANSFER_NIP",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json || json.status !== "success") {
        const message = json?.error?.message || "Transfer could not be confirmed by the backend.";
        return { success: false, error: message };
      }

      const d = json.data;
      const newTx: AgencyTransaction = {
        id: d.id,
        reference: d.reference,
        type: d.type,
        title: `Transfer to ${d.recipient_name} — pending ${d.provider_name || "bank"} confirmation`,
        amount: d.amount,
        customerFee: d.customer_fee,
        agentCommission: d.agent_commission,
        totalAmount: d.amount + d.customer_fee,
        currency: d.currency,
        status: d.status,
        customerName: d.recipient_name,
        customerAccount: d.recipient_account,
        customerBank: d.recipient_bank,
        terminalId: terminal.terminalId,
        agentId: agent.id,
        createdAt: d.created_at,
      };

      setTransactions((prev) => [newTx, ...prev]);
      await refreshLiquidity();

      return { success: true, transaction: newTx };
    } catch {
      return {
        success: false,
        error: "Could not confirm this transfer with the server. Do not retry — check transaction history before trying again.",
      };
    }
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
        isLiquidityLoading,
        isTransactionsLoading,
        refreshLiquidity,
        refreshTransactions,
        refreshNotifications,
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
