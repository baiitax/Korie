"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AgentUser,
  AgentLiquidity,
  AgentCustomer,
  AgencyTransaction,
  DailyCashReconciliation,
  AgentTerminalInfo,
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
  calculateAgentCommission,
} from "@/services/agentDataService";
import { translateAgency } from "@/locales/agency";
import { agencyApiFetch, getAgentAccessToken } from "@/lib/agency/agentSession";
import { useAgentRealtime } from "@/lib/agency/useAgentRealtime";

/**
 * Maps the wire shape returned by /api/v1/agency/cash-in|cash-out|transactions
 * into the frontend's AgencyTransaction type. This is the ONLY place that
 * translates backend-confirmed data into UI state for these two flows —
 * nothing here invents amounts, fees, commissions, or a SUCCESSFUL status.
 */
function mapApiTransaction(tx: any, terminalId: string): AgencyTransaction {
  const titleByType: Record<string, string> = {
    CASH_IN: "Customer Cash-In Deposit",
    CASH_OUT: "Customer Cash-Out Withdrawal",
    TRANSFER_NIP: `Transfer to ${tx.recipient_name || "recipient"}`,
    TRANSFER_CROSS_BORDER: `Cross-Border Transfer to ${tx.recipient_name || "recipient"}`,
  };

  return {
    id: tx.id,
    reference: tx.reference,
    type: tx.type,
    title: titleByType[tx.type] || tx.type,
    amount: tx.amount,
    customerFee: tx.customer_fee,
    agentCommission: tx.agent_commission,
    totalAmount: tx.type === "CASH_OUT" || tx.type === "TRANSFER_NIP" || tx.type === "TRANSFER_CROSS_BORDER" ? tx.amount + tx.customer_fee : tx.amount,
    currency: tx.currency,
    status: tx.status,
    customerName: tx.customer_name || tx.recipient_name,
    customerPhone: tx.customer_phone || undefined,
    customerAccount: tx.customer_account || tx.recipient_account || undefined,
    customerBank: tx.customer_bank || tx.recipient_bank || undefined,
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
  isCustomersLoading: boolean;
  refreshCustomers: () => Promise<void>;
  transactions: AgencyTransaction[];
  terminal: AgentTerminalInfo | null;
  isTerminalLoading: boolean;
  reconciliations: DailyCashReconciliation[];
  isReconciliationsLoading: boolean;
  refreshReconciliations: () => Promise<void>;
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
    error?: string;
  }>;

  // Float Top-Up Requests
  floatTopUpRequests: FloatTopUpRequest[];
  isFloatTopUpLoading: boolean;
  refreshFloatTopUpRequests: () => Promise<void>;
  submitFloatTopUpRequest: (params: {
    amount: number;
    method: FloatTopUpMethod;
    proofReference?: string;
  }) => Promise<{ success: boolean; request?: FloatTopUpRequest; error?: string }>;

  // Sub-Agent / Team Management (SUPER_AGENT tier)
  subAgents: SubAgent[];
  floatAllocations: FloatAllocationRecord[];
  isSubAgentsLoading: boolean;
  refreshSubAgents: () => Promise<void>;
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
  const router = useRouter();
  const [agent, setAgent] = useState<AgentUser>(CURRENT_AGENT);
  const [liquidity, setLiquidity] = useState<AgentLiquidity>(INITIAL_LIQUIDITY);
  const [currency, setCurrency] = useState<AgentCurrency>("NGN");
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  const [language, setLanguageState] = useState<SupportedLanguage>("ha");
  const [receiptLanguage, setReceiptLanguage] = useState<SupportedLanguage>("ha");
  const [customers, setCustomers] = useState<AgentCustomer[]>([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<AgencyTransaction[]>([]);
  const [terminal, setTerminal] = useState<AgentTerminalInfo | null>(null);
  const [isTerminalLoading, setIsTerminalLoading] = useState<boolean>(true);
  const [reconciliations, setReconciliations] = useState<DailyCashReconciliation[]>([]);
  const [isReconciliationsLoading, setIsReconciliationsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(0);
  const [isLiquidityLoading, setIsLiquidityLoading] = useState<boolean>(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState<boolean>(true);
  const [realAgentId, setRealAgentId] = useState<string | null>(null);
  const [ledgerAccountIds, setLedgerAccountIds] = useState<string[]>([]);
  const [floatTopUpRequests, setFloatTopUpRequests] = useState<FloatTopUpRequest[]>([]);
  const [isFloatTopUpLoading, setIsFloatTopUpLoading] = useState<boolean>(true);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [floatAllocations, setFloatAllocations] = useState<FloatAllocationRecord[]>([]);
  const [isSubAgentsLoading, setIsSubAgentsLoading] = useState<boolean>(true);

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
        // The API returns every transaction type recorded for this agent
        // (cash-in/out and transfers), so it fully replaces local state.
        const mapped: AgencyTransaction[] = json.data.transactions.map((tx: any) =>
          mapApiTransaction(tx, terminal?.terminalId || agent.terminalId)
        );
        setTransactions(
          mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      }
    } catch {
      // leave existing transaction list as-is on network failure
    } finally {
      setIsTransactionsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminal?.terminalId, agent.terminalId]);

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

  // Loads the agent's real customer directory (public.agency_customers),
  // auto-populated by every SUCCESSFUL cash-in/cash-out. An empty list for a
  // brand new agent is correct and expected — never backfilled with fixtures.
  const refreshCustomers = React.useCallback(async () => {
    try {
      const res = await agencyApiFetch("/api/v1/agency/customers");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setCustomers(
          (json.data.customers || []).map((c: any) => ({
            id: c.id,
            fullName: c.full_name,
            phone: c.phone,
            accountNumberMasked: c.account_number_masked || "",
            bankName: c.bank_name || "",
            bankCode: c.bank_code || "",
            kycTier: c.kyc_tier,
            isVerified: c.is_verified,
            totalTransactionsCount: c.total_transactions_count,
            lastActivityDate: c.last_activity_at || "",
          }))
        );
      }
    } catch {
      // leave prior known-good list as-is on network failure
    } finally {
      setIsCustomersLoading(false);
    }
  }, []);

  // Loads the agent's real assigned terminal (public.agent_terminals).
  const refreshTerminal = React.useCallback(async () => {
    try {
      const res = await agencyApiFetch("/api/v1/agency/terminal");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        const d = json.data;
        setTerminal({
          terminalId: d.terminal_id,
          model: d.model,
          serialNumber: d.serial_number || "",
          status: d.status,
          batteryLevel: 0,
          networkType: d.network_type,
          signalStrength: 0,
          lastSyncTime: d.last_sync_at,
          appVersion: d.app_version,
        });
      }
    } catch {
      // leave prior known-good terminal state as-is on network failure
    } finally {
      setIsTerminalLoading(false);
    }
  }, []);

  // Loads the agent's real end-of-day reconciliation history
  // (public.agent_cash_reconciliations).
  const refreshReconciliations = React.useCallback(async () => {
    try {
      const res = await agencyApiFetch("/api/v1/agency/reconciliation");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setReconciliations(
          (json.data.reconciliations || []).map((r: any) => ({
            id: r.id,
            reconciliationDate: r.reconciliation_date,
            openingCash: r.opening_cash,
            todayCashIn: r.today_cash_in,
            todayCashOut: r.today_cash_out,
            expectedClosingCash: r.expected_closing_cash,
            actualPhysicalCash: r.actual_physical_cash,
            difference: r.difference,
            status: r.status,
            notes: r.notes,
            submittedAt: r.submitted_at,
          }))
        );
      }
    } catch {
      // leave prior known-good history as-is on network failure
    } finally {
      setIsReconciliationsLoading(false);
    }
  }, []);

  // Loads the agent's real float top-up request history
  // (public.agent_float_topup_requests).
  const refreshFloatTopUpRequests = React.useCallback(async () => {
    try {
      const res = await agencyApiFetch("/api/v1/agency/float-topup");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setFloatTopUpRequests(
          (json.data.requests || []).map((r: any) => ({
            id: r.id,
            agentId: realAgentId || "",
            amount: r.amount,
            currency: r.currency,
            method: r.method,
            proofReference: r.proof_reference || undefined,
            status: r.status,
            requestedAt: r.requested_at,
            reviewedAt: r.reviewed_at || undefined,
            notes: r.notes || undefined,
          }))
        );
      }
    } catch {
      // leave prior known-good list as-is on network failure
    } finally {
      setIsFloatTopUpLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realAgentId]);

  // Loads the SUPER_AGENT's real downline (public.agents where
  // supervisor_agent_id = this agent) plus real float allocation history.
  // Non-super-agent tiers correctly get an empty list from the API.
  const refreshSubAgents = React.useCallback(async () => {
    try {
      const res = await agencyApiFetch("/api/v1/agency/sub-agents");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setSubAgents(
          (json.data.sub_agents || []).map((s: any) => ({
            id: s.id,
            agentCode: s.agent_code,
            agentName: s.agent_name,
            businessName: s.business_name,
            phone: s.phone,
            country: s.country,
            cityOrLGA: s.city_or_lga || "",
            status: s.status,
            walletFloat: s.wallet_float,
            cashInHand: s.cash_in_hand,
            currency: s.currency,
            cashThresholdMin: s.cash_threshold_min,
            health: s.health,
            dailyCashLimit: s.daily_cash_limit,
            dailyCashSpent: 0,
            todayTransactionCount: s.today_transaction_count,
            todayVolume: s.today_volume,
            onboardedAt: s.onboarded_at,
            lastActiveAt: s.onboarded_at,
          }))
        );
        setFloatAllocations(
          (json.data.allocations || []).map((a: any) => ({
            id: a.id,
            subAgentId: "",
            subAgentName: a.sub_agent_name,
            direction: a.direction,
            amount: a.amount,
            currency: a.currency,
            timestamp: a.timestamp,
            note: a.note || undefined,
          }))
        );
      }
    } catch {
      // leave prior known-good list as-is on network failure
    } finally {
      setIsSubAgentsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getAgentAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }
      refreshLiquidity();
      refreshTransactions();
      refreshProfile();
      refreshNotifications();
      refreshCustomers();
      refreshTerminal();
      refreshReconciliations();
      refreshFloatTopUpRequests();
      refreshSubAgents();
    })();
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

      const newTx = mapApiTransaction(json.data, terminal?.terminalId || agent.terminalId);
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

      const newTx = mapApiTransaction(json.data, terminal?.terminalId || agent.terminalId);
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
        terminalId: terminal?.terminalId || agent.terminalId,
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

  // Submits today's real end-of-day cash reconciliation via
  // POST /api/v1/agency/reconciliation, which derives opening cash and
  // today's cash movement server-side from the ledger — the client never
  // fabricates an opening balance or a reviewer name.
  const submitReconciliation = async (actualPhysicalCash: number, notes?: string) => {
    if (isOffline) {
      return { success: false, error: "Offline network. Please reconnect to submit a reconciliation." };
    }
    try {
      const res = await agencyApiFetch("/api/v1/agency/reconciliation", {
        method: "POST",
        body: JSON.stringify({ actual_physical_cash: actualPhysicalCash, notes }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        return { success: false, error: json?.error?.message || "Could not submit reconciliation." };
      }
      const d = json.data;
      const record: DailyCashReconciliation = {
        id: d.id,
        reconciliationDate: d.reconciliation_date,
        openingCash: d.opening_cash,
        todayCashIn: d.today_cash_in,
        todayCashOut: d.today_cash_out,
        expectedClosingCash: d.expected_closing_cash,
        actualPhysicalCash: d.actual_physical_cash,
        difference: d.difference,
        status: d.status,
        notes: d.notes,
        submittedAt: d.submitted_at,
      };
      setReconciliations((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);
      closeReconciliation();
      return { success: true, record };
    } catch {
      return { success: false, error: "Could not reach the server. Please try again." };
    }
  };

  // FLOAT TOP-UP: agent submits a request via POST /api/v1/agency/float-topup.
  // It enters a real PENDING row — the wallet is only credited later when a
  // treasury reviewer calls approve_agent_float_topup() server-side.
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
    try {
      const res = await agencyApiFetch("/api/v1/agency/float-topup", {
        method: "POST",
        body: JSON.stringify({ amount: params.amount, method: params.method, proof_reference: params.proofReference }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        return { success: false, error: json?.error?.message || "Could not submit float top-up request." };
      }
      const d = json.data;
      const request: FloatTopUpRequest = {
        id: d.id,
        agentId: realAgentId || agent.id,
        amount: d.amount,
        currency: d.currency,
        method: d.method,
        proofReference: params.proofReference,
        status: d.status,
        requestedAt: d.requested_at,
      };
      setFloatTopUpRequests((prev) => [request, ...prev]);
      return { success: true, request };
    } catch {
      return { success: false, error: "Could not reach the server. Please try again." };
    }
  };

  // SUB-AGENT FLOAT ALLOCATION / RECLAIM: both move real float between two
  // agents' own WALLET_FLOAT ledger accounts via
  // POST /api/v1/agency/sub-agents/float -> public.transfer_agent_float(),
  // atomically and server-side. The client never edits a balance directly;
  // it always re-fetches the confirmed state afterward.
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
    try {
      const res = await agencyApiFetch("/api/v1/agency/sub-agents/float", {
        method: "POST",
        body: JSON.stringify({ sub_agent_id: params.subAgentId, direction: "ALLOCATE", amount: params.amount, note: params.note }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        return { success: false, error: json?.error?.message || "Could not allocate float." };
      }
      await Promise.all([refreshLiquidity(), refreshSubAgents()]);
      return { success: true };
    } catch {
      return { success: false, error: "Could not reach the server. Please try again." };
    }
  };

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
    try {
      const res = await agencyApiFetch("/api/v1/agency/sub-agents/float", {
        method: "POST",
        body: JSON.stringify({ sub_agent_id: params.subAgentId, direction: "RECLAIM", amount: params.amount, note: params.note }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        return { success: false, error: json?.error?.message || "Could not reclaim float." };
      }
      await Promise.all([refreshLiquidity(), refreshSubAgents()]);
      return { success: true };
    } catch {
      return { success: false, error: "Could not reach the server. Please try again." };
    }
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
        isCustomersLoading,
        refreshCustomers,
        transactions,
        terminal,
        isTerminalLoading,
        reconciliations,
        isReconciliationsLoading,
        refreshReconciliations,
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
        isFloatTopUpLoading,
        refreshFloatTopUpRequests,
        submitFloatTopUpRequest,
        subAgents,
        floatAllocations,
        isSubAgentsLoading,
        refreshSubAgents,
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
