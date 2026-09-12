"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AggregatorOrganization,
  AggregatedAgent,
  AggregatedMerchant,
  AggregatedTerritory,
  AggregatorTransaction,
  AggregatorLiquidityPosition,
  AggregatorCommissionSummary,
  AggregatorSettlementRecord,
  AggregatorReconciliationRecord,
  AggregatorExceptionRecord,
  AggregatorRiskAlert,
  AggregatorComplianceRecord,
  AggregatorServiceHealth,
  AggregatorTeamMember,
  AggregatorTarget,
  AggregatorCountry,
  AggregatorCurrency,
} from "@/types/aggregator";
import { SupportedLanguage } from "@/types/customer";
import { translateAggregator } from "@/locales/aggregator";
import { aggregatorApiFetch, getAggregatorAccessToken } from "@/lib/aggregator/aggregatorSession";

export interface AggregatorNotification {
  id: string;
  category: string;
  severity: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface AggregatorDevice {
  id: string;
  deviceLabel: string;
  ipAddress: string;
  firstSeenAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
  status: string;
}

export interface AggregatorAuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  result: string;
  reason?: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
}

export interface AggregatorApiKey {
  id: string;
  keyName: string;
  publicKey: string;
  secretKeyMasked: string;
  environment: "SANDBOX" | "PRODUCTION";
  status: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface AggregatorSupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  channel: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

export interface AggregatorSupportSummary {
  totalTickets: number;
  openTickets: number;
  criticalOrUrgent: number;
}

export interface AggregatorOperationsSnapshot {
  failedTransactions: {
    id: string;
    reference: string;
    type: string;
    amount: number;
    currency: string;
    failureReason: string;
    agentName: string;
    createdAt: string;
  }[];
  openExceptions: any[];
  openRiskAlerts: any[];
}

const EMPTY_AGGREGATOR: AggregatorOrganization = {
  id: "",
  name: "",
  code: "",
  rcNumber: "",
  country: "NG",
  currency: "NGN",
  tier: "TIER_2_REGIONAL_AGGREGATOR",
  status: "REVIEW",
  territoriesCovered: [],
  headquarters: "",
  contactEmail: "",
  contactPhone: "",
  walletBalance: 0,
  availableLiquidity: 0,
  escrowBalance: 0,
  pendingCommissions: 0,
  settledCommissionsThisMonth: 0,
  totalNetworkTPVToday: 0,
  totalNetworkTPVMonth: 0,
  totalNetworkTransactionsToday: 0,
  activeAgentsCount: 0,
  inactiveAgentsCount: 0,
  activeMerchantsCount: 0,
  inactiveMerchantsCount: 0,
  settlementBank: "",
  settlementAccountMasked: "—",
  providerNodeNG: "Awaiting Provider",
  providerNodeNE: "Awaiting Provider",
  createdAt: "",
};

const EMPTY_LIQUIDITY: AggregatorLiquidityPosition = {
  aggregatorMainWallet: 0,
  aggregatorReserveWallet: 0,
  totalAgentFloatLiquidity: 0,
  totalMerchantSettlementFloat: 0,
  estimatedCashInNetworkDrawer: 0,
  networkLiquidityHealth: "HEALTHY",
  agentsUnderMinimumThresholdCount: 0,
  agentsRequiringFloatCount: 0,
};

const EMPTY_COMMISSIONS: AggregatorCommissionSummary = {
  todayEarned: 0,
  thisWeekEarned: 0,
  thisMonthEarned: 0,
  pendingClearance: 0,
  approvedForPayout: 0,
  settledToBank: 0,
  lifetimeTotal: 0,
  byService: [],
};

interface AggregatorContextType {
  aggregator: AggregatorOrganization;
  agents: AggregatedAgent[];
  merchants: AggregatedMerchant[];
  territories: AggregatedTerritory[];
  transactions: AggregatorTransaction[];
  liquidity: AggregatorLiquidityPosition;
  commissions: AggregatorCommissionSummary;
  settlements: AggregatorSettlementRecord[];
  reconciliations: AggregatorReconciliationRecord[];
  exceptions: AggregatorExceptionRecord[];
  riskAlerts: AggregatorRiskAlert[];
  complianceRecords: AggregatorComplianceRecord[];
  services: AggregatorServiceHealth[];
  team: AggregatorTeamMember[];
  targets: AggregatorTarget[];
  notifications: AggregatorNotification[];
  devices: AggregatorDevice[];
  auditLog: AggregatorAuditEntry[];
  apiKeys: AggregatorApiKey[];
  supportTickets: AggregatorSupportTicket[];
  supportSummary: AggregatorSupportSummary;
  operations: AggregatorOperationsSnapshot;

  // Loading flags
  isBootstrapping: boolean;
  isAgentsLoading: boolean;
  isMerchantsLoading: boolean;
  isTransactionsLoading: boolean;
  isTerritoriesLoading: boolean;
  isLiquidityLoading: boolean;

  // Refreshers
  refreshAggregator: () => Promise<void>;
  refreshAgents: () => Promise<void>;
  refreshMerchants: () => Promise<void>;
  refreshTerritories: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshLiquidity: () => Promise<void>;
  refreshCommissions: () => Promise<void>;
  refreshSettlements: () => Promise<void>;
  refreshReconciliations: () => Promise<void>;
  refreshExceptions: () => Promise<void>;
  refreshRiskAlerts: () => Promise<void>;
  refreshCompliance: () => Promise<void>;
  refreshServices: () => Promise<void>;
  refreshTeam: () => Promise<void>;
  refreshTargets: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshAuditLog: () => Promise<void>;
  refreshApiKeys: () => Promise<void>;
  refreshSupportTickets: () => Promise<void>;
  refreshOperations: () => Promise<void>;

  // Scopes & Filters
  selectedCountry: AggregatorCountry | "ALL";
  setSelectedCountry: (c: AggregatorCountry | "ALL") => void;
  selectedTerritoryId: string;
  setSelectedTerritoryId: (id: string) => void;
  isBalanceHidden: boolean;
  toggleHideBalance: () => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number, overrideCurrency?: AggregatorCurrency) => string;
  formatDate: (dateString?: string) => string;

  // Actions & Modals
  isLiquidityModalOpen: boolean;
  selectedAgentForLiquidity: AggregatedAgent | null;
  openLiquidityModal: (agentId?: string) => void;
  closeLiquidityModal: () => void;
  executeFloatRebalance: (
    agentId: string,
    amount: number,
    note?: string
  ) => Promise<{ success: boolean; error?: string; reference?: string }>;

  isInvestigateDrawerOpen: boolean;
  selectedTxForInvestigation: AggregatorTransaction | null;
  openTransactionInvestigation: (tx: AggregatorTransaction) => void;
  closeTransactionInvestigation: () => void;

  acknowledgeRiskAlert: (alertId: string) => Promise<void>;
  resolveException: (exceptionId: string, notes: string) => Promise<void>;
  onboardAgent: (agentData: Partial<AggregatedAgent> & { fullName: string; phone: string }) => Promise<{ success: boolean; error?: string }>;
  createTerritory: (data: { name: string; country: AggregatorCountry; stateOrRegion?: string; lgaOrCommune?: string; supervisorName?: string; hubAddress?: string; hubPhone?: string }) => Promise<{ success: boolean; error?: string }>;
  createTarget: (data: { title: string; metricType: string; targetValue: number; unit?: string; period?: string; deadline: string }) => Promise<{ success: boolean; error?: string }>;
  inviteTeamMember: (data: { fullName: string; email: string; role: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  runSettlement: (currency?: string) => Promise<{ success: boolean; error?: string; batchReference?: string }>;
  runReconciliation: () => Promise<{ success: boolean; error?: string }>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  revokeDevice: (id: string) => Promise<{ success: boolean; error?: string }>;
  issueApiKey: (data: { keyName?: string; environment: "SANDBOX" | "PRODUCTION" }) => Promise<{ success: boolean; error?: string; secretKey?: string; publicKey?: string }>;
  revokeApiKey: (id: string) => Promise<{ success: boolean; error?: string }>;
  submitSupportTicket: (data: { subject: string; description: string; category?: string; priority?: string }) => Promise<{ success: boolean; error?: string }>;

  isOffline: boolean;
  notificationsCount: number;
}

const AggregatorContext = createContext<AggregatorContextType | undefined>(undefined);

export function AggregatorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [aggregator, setAggregator] = useState<AggregatorOrganization>(EMPTY_AGGREGATOR);
  const [agents, setAgents] = useState<AggregatedAgent[]>([]);
  const [merchants, setMerchants] = useState<AggregatedMerchant[]>([]);
  const [territories, setTerritories] = useState<AggregatedTerritory[]>([]);
  const [transactions, setTransactions] = useState<AggregatorTransaction[]>([]);
  const [liquidity, setLiquidity] = useState<AggregatorLiquidityPosition>(EMPTY_LIQUIDITY);
  const [commissions, setCommissions] = useState<AggregatorCommissionSummary>(EMPTY_COMMISSIONS);
  const [settlements, setSettlements] = useState<AggregatorSettlementRecord[]>([]);
  const [reconciliations, setReconciliations] = useState<AggregatorReconciliationRecord[]>([]);
  const [exceptions, setExceptions] = useState<AggregatorExceptionRecord[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<AggregatorRiskAlert[]>([]);
  const [complianceRecords, setComplianceRecords] = useState<AggregatorComplianceRecord[]>([]);
  const [services, setServices] = useState<AggregatorServiceHealth[]>([]);
  const [team, setTeam] = useState<AggregatorTeamMember[]>([]);
  const [targets, setTargets] = useState<AggregatorTarget[]>([]);
  const [notifications, setNotifications] = useState<AggregatorNotification[]>([]);
  const [devices, setDevices] = useState<AggregatorDevice[]>([]);
  const [auditLog, setAuditLog] = useState<AggregatorAuditEntry[]>([]);
  const [apiKeys, setApiKeys] = useState<AggregatorApiKey[]>([]);
  const [supportTickets, setSupportTickets] = useState<AggregatorSupportTicket[]>([]);
  const [supportSummary, setSupportSummary] = useState<AggregatorSupportSummary>({ totalTickets: 0, openTickets: 0, criticalOrUrgent: 0 });
  const [operations, setOperations] = useState<AggregatorOperationsSnapshot>({ failedTransactions: [], openExceptions: [], openRiskAlerts: [] });

  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [isAgentsLoading, setIsAgentsLoading] = useState<boolean>(true);
  const [isMerchantsLoading, setIsMerchantsLoading] = useState<boolean>(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState<boolean>(true);
  const [isTerritoriesLoading, setIsTerritoriesLoading] = useState<boolean>(true);
  const [isLiquidityLoading, setIsLiquidityLoading] = useState<boolean>(true);

  const [selectedCountry, setSelectedCountry] = useState<AggregatorCountry | "ALL">("ALL");
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>("ALL");
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(0);

  // Modals state
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);
  const [selectedAgentForLiquidity, setSelectedAgentForLiquidity] = useState<AggregatedAgent | null>(null);
  const [isInvestigateDrawerOpen, setIsInvestigateDrawerOpen] = useState(false);
  const [selectedTxForInvestigation, setSelectedTxForInvestigation] = useState<AggregatorTransaction | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("koriepay_aggregator_lang") as SupportedLanguage;
      if (savedLang) setLanguageState(savedLang);
      const savedHide = localStorage.getItem("koriepay_aggregator_hide_balance");
      if (savedHide) setIsBalanceHidden(savedHide === "true");
      const savedCountry = localStorage.getItem("koriepay_aggregator_country") as AggregatorCountry | "ALL";
      if (savedCountry) setSelectedCountry(savedCountry);

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
    if (typeof window !== "undefined") localStorage.setItem("koriepay_aggregator_lang", lang);
  };

  const handleSetCountry = (c: AggregatorCountry | "ALL") => {
    setSelectedCountry(c);
    if (typeof window !== "undefined") localStorage.setItem("koriepay_aggregator_country", c);
  };

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem("koriepay_aggregator_hide_balance", String(next));
      return next;
    });
  };

  const t = (key: string, params?: Record<string, string | number>): string => translateAggregator(language, key, params);

  const formatCurrency = (amount: number, overrideCurrency?: AggregatorCurrency): string => {
    const cur = overrideCurrency || aggregator.currency || "NGN";
    if (cur === "XOF") return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
    return `₦${Number(amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateString;
    }
  };

  // ---- Refresh callbacks (per domain) ----

  const refreshAggregator = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/me");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        const d = json.data;
        setAggregator((prev) => ({
          ...prev,
          id: d.id,
          name: d.name,
          code: d.code,
          rcNumber: d.rcNumber || "",
          country: d.country,
          currency: d.currency,
          tier: d.tier === "TIER_1" ? "TIER_1_SUPER_AGGREGATOR" : "TIER_2_REGIONAL_AGGREGATOR",
          status: d.status,
          headquarters: d.headquarters || "",
          contactEmail: d.contactEmail,
          contactPhone: d.contactPhone,
          walletBalance: d.walletBalance,
          availableLiquidity: d.availableLiquidity,
          escrowBalance: d.escrowBalance,
          pendingCommissions: d.pendingCommissions,
          settledCommissionsThisMonth: d.settledCommissionsThisMonth,
          totalNetworkTPVToday: d.totalNetworkTPVToday,
          totalNetworkTPVMonth: d.totalNetworkTPVMonth,
          totalNetworkTransactionsToday: d.totalNetworkTransactionsToday,
          activeAgentsCount: d.activeAgentsCount,
          inactiveAgentsCount: d.inactiveAgentsCount,
          activeMerchantsCount: d.activeMerchantsCount,
          inactiveMerchantsCount: d.inactiveMerchantsCount,
          settlementBank: d.settlementBank,
          settlementAccountMasked: d.settlementAccountMasked,
          providerNodeNG: d.country === "NG" ? "Providus Bank Nigeria (Connected)" : prev.providerNodeNG,
          providerNodeNE: d.country === "NE" ? "Coris Bank Niger Republic (Connected)" : prev.providerNodeNE,
          createdAt: d.createdAt,
        }));
      }
    } catch {
      // leave prior known-good state on network failure
    }
  }, []);

  const refreshAgents = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/agents");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setAgents(json.data.agents || []);
      }
    } catch {
      // leave prior list as-is
    } finally {
      setIsAgentsLoading(false);
    }
  }, []);

  const refreshMerchants = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/merchants");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setMerchants(json.data.merchants || []);
      }
    } catch {
      // leave prior list as-is
    } finally {
      setIsMerchantsLoading(false);
    }
  }, []);

  const refreshTerritories = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/territories");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setTerritories(json.data.territories || []);
      }
    } catch {
      // leave prior list as-is
    } finally {
      setIsTerritoriesLoading(false);
    }
  }, []);

  const refreshTransactions = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/transactions?limit=150");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setTransactions((json.data.transactions || []).map((tx: any) => ({ ...tx, timeline: tx.timeline || buildFallbackTimeline(tx) })));
      }
    } catch {
      // leave prior list as-is
    } finally {
      setIsTransactionsLoading(false);
    }
  }, []);

  const refreshLiquidity = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/liquidity");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setLiquidity(json.data);
      }
    } catch {
      // leave prior state as-is
    } finally {
      setIsLiquidityLoading(false);
    }
  }, []);

  const refreshCommissions = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/commissions");
      const json = await res.json();
      if (res.ok && json.status === "success") setCommissions(json.data);
    } catch {
      // leave prior state as-is
    }
  }, []);

  const refreshSettlements = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/settlements");
      const json = await res.json();
      if (res.ok && json.status === "success") setSettlements(json.data.settlements || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshReconciliations = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/reconciliation");
      const json = await res.json();
      if (res.ok && json.status === "success") setReconciliations(json.data.reconciliations || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshExceptions = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/exceptions");
      const json = await res.json();
      if (res.ok && json.status === "success") setExceptions(json.data.exceptions || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshRiskAlerts = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/risk");
      const json = await res.json();
      if (res.ok && json.status === "success") setRiskAlerts(json.data.riskAlerts || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshCompliance = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/compliance");
      const json = await res.json();
      if (res.ok && json.status === "success") setComplianceRecords(json.data.complianceRecords || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshServices = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/services");
      const json = await res.json();
      if (res.ok && json.status === "success") setServices(json.data.services || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshTeam = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/team");
      const json = await res.json();
      if (res.ok && json.status === "success") setTeam(json.data.team || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshTargets = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/targets");
      const json = await res.json();
      if (res.ok && json.status === "success") setTargets(json.data.targets || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshNotifications = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/notifications");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setNotifications(json.data.notifications || []);
        setNotificationsCount(json.data.unreadCount || 0);
      }
    } catch {
      // leave prior state as-is
    }
  }, []);

  const refreshDevices = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/devices");
      const json = await res.json();
      if (res.ok && json.status === "success") setDevices(json.data.devices || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshAuditLog = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/audit?limit=150");
      const json = await res.json();
      if (res.ok && json.status === "success") setAuditLog(json.data.auditLog || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshApiKeys = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/keys");
      const json = await res.json();
      if (res.ok && json.status === "success") setApiKeys(json.data.apiKeys || []);
    } catch {
      // leave prior list as-is
    }
  }, []);

  const refreshSupportTickets = React.useCallback(async () => {
    try {
      const [ticketsRes, summaryRes] = await Promise.all([
        aggregatorApiFetch("/api/v1/aggregator/support/tickets"),
        aggregatorApiFetch("/api/v1/aggregator/support"),
      ]);
      const ticketsJson = await ticketsRes.json();
      const summaryJson = await summaryRes.json();
      if (ticketsRes.ok && ticketsJson.status === "success") setSupportTickets(ticketsJson.data.tickets || []);
      if (summaryRes.ok && summaryJson.status === "success") setSupportSummary(summaryJson.data);
    } catch {
      // leave prior state as-is
    }
  }, []);

  const refreshOperations = React.useCallback(async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/operations");
      const json = await res.json();
      if (res.ok && json.status === "success") setOperations(json.data);
    } catch {
      // leave prior state as-is
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getAggregatorAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }
      await Promise.all([
        refreshAggregator(),
        refreshAgents(),
        refreshMerchants(),
        refreshTerritories(),
        refreshTransactions(),
        refreshLiquidity(),
        refreshCommissions(),
        refreshSettlements(),
        refreshReconciliations(),
        refreshExceptions(),
        refreshRiskAlerts(),
        refreshCompliance(),
        refreshServices(),
        refreshTeam(),
        refreshTargets(),
        refreshNotifications(),
        refreshDevices(),
        refreshAuditLog(),
        refreshApiKeys(),
        refreshSupportTickets(),
        refreshOperations(),
      ]);
      setIsBootstrapping(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLiquidityModal = (agentId?: string) => {
    if (agentId) {
      const agt = agents.find((a) => a.id === agentId) || null;
      setSelectedAgentForLiquidity(agt);
    } else {
      setSelectedAgentForLiquidity(agents[0] || null);
    }
    setIsLiquidityModalOpen(true);
  };

  const closeLiquidityModal = () => {
    setIsLiquidityModalOpen(false);
    setSelectedAgentForLiquidity(null);
  };

  const executeFloatRebalance = async (
    agentId: string,
    amount: number,
    note?: string
  ): Promise<{ success: boolean; error?: string; reference?: string }> => {
    if (isOffline) {
      return { success: false, error: "Network offline. Float distribution requires an active banking node." };
    }
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/liquidity/dispatch", {
        method: "POST",
        body: JSON.stringify({ agentId, amount, note }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        return { success: false, error: json?.error?.message || "Could not dispatch float." };
      }
      await Promise.all([refreshLiquidity(), refreshAgents(), refreshAggregator()]);
      closeLiquidityModal();
      return { success: true, reference: json.data?.transactionReference || json.data?.reference };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const openTransactionInvestigation = (tx: AggregatorTransaction) => {
    setSelectedTxForInvestigation(tx);
    setIsInvestigateDrawerOpen(true);
  };

  const closeTransactionInvestigation = () => {
    setIsInvestigateDrawerOpen(false);
    setSelectedTxForInvestigation(null);
  };

  const acknowledgeRiskAlert = async (alertId: string) => {
    try {
      const res = await aggregatorApiFetch(`/api/v1/aggregator/risk/${alertId}/ack`, { method: "POST" });
      if (res.ok) {
        setRiskAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: "ACKNOWLEDGED" } : a)));
      }
    } catch {
      // no-op: leave alert state as-is on failure
    }
  };

  const resolveException = async (exceptionId: string, notes: string) => {
    try {
      const res = await aggregatorApiFetch(`/api/v1/aggregator/exceptions/${exceptionId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setExceptions((prev) =>
          prev.map((e) => (e.id === exceptionId ? { ...e, currentState: "RESOLVED", description: `${e.description} | Resolved: ${notes}` } : e))
        );
      }
    } catch {
      // no-op
    }
  };

  const onboardAgent = async (data: Partial<AggregatedAgent> & { fullName: string; phone: string }) => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/agents", {
        method: "POST",
        body: JSON.stringify({
          fullName: data.fullName,
          businessName: data.businessName,
          phone: data.phone,
          email: data.email,
          country: data.country || "NG",
          state: data.state,
          lga: data.lga,
          territoryId: data.territoryId,
          kycTier: data.kycTier,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        return { success: false, error: json?.error?.message || "Could not onboard agent." };
      }
      await Promise.all([refreshAgents(), refreshAggregator()]);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const createTerritory = async (data: { name: string; country: AggregatorCountry; stateOrRegion?: string; lgaOrCommune?: string; supervisorName?: string; hubAddress?: string; hubPhone?: string }) => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/territories", { method: "POST", body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, error: json?.error?.message || "Could not create territory." };
      await refreshTerritories();
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const createTarget = async (data: { title: string; metricType: string; targetValue: number; unit?: string; period?: string; deadline: string }) => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/targets", { method: "POST", body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, error: json?.error?.message || "Could not create target." };
      await refreshTargets();
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const inviteTeamMember = async (data: { fullName: string; email: string; role: string; phone?: string }) => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/team", { method: "POST", body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, error: json?.error?.message || "Could not invite team member." };
      await refreshTeam();
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const runSettlement = async (currency?: string) => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/settlements/run", { method: "POST", body: JSON.stringify({ currency }) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, error: json?.error?.message || "Could not run settlement." };
      await refreshSettlements();
      return { success: true, batchReference: json.data?.batchReference };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const runReconciliation = async () => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/reconciliation", { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, error: json?.error?.message || "Could not run reconciliation." };
      await refreshReconciliations();
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const res = await aggregatorApiFetch(`/api/v1/aggregator/notifications/${id}/read`, { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        setNotificationsCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // no-op
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => aggregatorApiFetch(`/api/v1/aggregator/notifications/${n.id}/read`, { method: "POST" }).catch(() => null)));
    await refreshNotifications();
  };

  const revokeDevice = async (id: string) => {
    try {
      const res = await aggregatorApiFetch(`/api/v1/aggregator/devices/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, error: json?.error?.message || "Could not revoke device." };
      await refreshDevices();
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const issueApiKey = async (data: { keyName?: string; environment: "SANDBOX" | "PRODUCTION" }) => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/keys", { method: "POST", body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, error: json?.error?.message || "Could not issue API key." };
      await refreshApiKeys();
      return { success: true, secretKey: json.data?.secretKey, publicKey: json.data?.publicKey };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const revokeApiKey = async (id: string) => {
    try {
      const res = await aggregatorApiFetch(`/api/v1/aggregator/keys/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, error: json?.error?.message || "Could not revoke API key." };
      await refreshApiKeys();
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const submitSupportTicket = async (data: { subject: string; description: string; category?: string; priority?: string }) => {
    try {
      const res = await aggregatorApiFetch("/api/v1/aggregator/support/tickets", { method: "POST", body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return { success: false, error: json?.error?.message || "Could not submit ticket." };
      await refreshSupportTickets();
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  return (
    <AggregatorContext.Provider
      value={{
        aggregator,
        agents,
        merchants,
        territories,
        transactions,
        liquidity,
        commissions,
        settlements,
        reconciliations,
        exceptions,
        riskAlerts,
        complianceRecords,
        services,
        team,
        targets,
        notifications,
        devices,
        auditLog,
        apiKeys,
        supportTickets,
        supportSummary,
        operations,
        isBootstrapping,
        isAgentsLoading,
        isMerchantsLoading,
        isTransactionsLoading,
        isTerritoriesLoading,
        isLiquidityLoading,
        refreshAggregator,
        refreshAgents,
        refreshMerchants,
        refreshTerritories,
        refreshTransactions,
        refreshLiquidity,
        refreshCommissions,
        refreshSettlements,
        refreshReconciliations,
        refreshExceptions,
        refreshRiskAlerts,
        refreshCompliance,
        refreshServices,
        refreshTeam,
        refreshTargets,
        refreshNotifications,
        refreshDevices,
        refreshAuditLog,
        refreshApiKeys,
        refreshSupportTickets,
        refreshOperations,
        selectedCountry,
        setSelectedCountry: handleSetCountry,
        selectedTerritoryId,
        setSelectedTerritoryId,
        isBalanceHidden,
        toggleHideBalance,
        language,
        setLanguage,
        t,
        formatCurrency,
        formatDate,
        isLiquidityModalOpen,
        selectedAgentForLiquidity,
        openLiquidityModal,
        closeLiquidityModal,
        executeFloatRebalance,
        isInvestigateDrawerOpen,
        selectedTxForInvestigation,
        openTransactionInvestigation,
        closeTransactionInvestigation,
        acknowledgeRiskAlert,
        resolveException,
        onboardAgent,
        createTerritory,
        createTarget,
        inviteTeamMember,
        runSettlement,
        runReconciliation,
        markNotificationRead,
        markAllNotificationsRead,
        revokeDevice,
        issueApiKey,
        revokeApiKey,
        submitSupportTicket,
        isOffline,
        notificationsCount,
      }}
    >
      {children}
    </AggregatorContext.Provider>
  );
}

function buildFallbackTimeline(tx: any) {
  const steps = [
    { stage: "CREATED", timestamp: tx.createdAt, status: "COMPLETED", description: "Transaction initiated by executing node." },
  ];
  if (tx.status === "SUCCESSFUL") {
    steps.push({ stage: "LEDGER_POSTED", timestamp: tx.createdAt, status: "COMPLETED", description: "Ledger entries posted; funds settled to destination." });
  } else if (tx.status === "FAILED") {
    steps.push({ stage: "PROCESSING", timestamp: tx.createdAt, status: "FAILED", description: tx.failureReason || "Transaction failed at provider node." });
  } else {
    steps.push({ stage: "PROCESSING", timestamp: tx.createdAt, status: "CURRENT", description: "Awaiting provider confirmation." });
  }
  return steps;
}

export function useAggregator() {
  const context = useContext(AggregatorContext);
  if (!context) {
    throw new Error("useAggregator must be used within an AggregatorProvider");
  }
  return context;
}
