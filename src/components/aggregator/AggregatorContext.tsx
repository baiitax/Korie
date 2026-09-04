"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
import {
  CURRENT_AGGREGATOR,
  AGGREGATED_AGENTS,
  AGGREGATED_MERCHANTS,
  AGGREGATED_TERRITORIES,
  AGGREGATOR_TRANSACTIONS,
  AGGREGATOR_LIQUIDITY,
  AGGREGATOR_COMMISSIONS,
  AGGREGATOR_SETTLEMENTS,
  AGGREGATOR_RECONCILIATION,
  AGGREGATOR_EXCEPTIONS,
  AGGREGATOR_RISK_ALERTS,
  AGGREGATOR_COMPLIANCE_QUEUE,
  AGGREGATOR_SERVICES,
  AGGREGATOR_TEAM,
  AGGREGATOR_TARGETS,
} from "@/services/aggregatorDataService";
import { translateAggregator } from "@/locales/aggregator";

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
    pin: string
  ) => Promise<{ success: boolean; error?: string; reference?: string }>;

  isInvestigateDrawerOpen: boolean;
  selectedTxForInvestigation: AggregatorTransaction | null;
  openTransactionInvestigation: (tx: AggregatorTransaction) => void;
  closeTransactionInvestigation: () => void;

  acknowledgeRiskAlert: (alertId: string) => void;
  resolveException: (exceptionId: string, notes: string) => void;
  onboardAgent: (agentData: Partial<AggregatedAgent>) => AggregatedAgent;

  isOffline: boolean;
  notificationsCount: number;
}

const AggregatorContext = createContext<AggregatorContextType | undefined>(undefined);

export function AggregatorProvider({ children }: { children: React.ReactNode }) {
  const [aggregator, setAggregator] = useState<AggregatorOrganization>(CURRENT_AGGREGATOR);
  const [agents, setAgents] = useState<AggregatedAgent[]>(AGGREGATED_AGENTS);
  const [merchants, setMerchants] = useState<AggregatedMerchant[]>(AGGREGATED_MERCHANTS);
  const [territories, setTerritories] = useState<AggregatedTerritory[]>(AGGREGATED_TERRITORIES);
  const [transactions, setTransactions] = useState<AggregatorTransaction[]>(AGGREGATOR_TRANSACTIONS);
  const [liquidity, setLiquidity] = useState<AggregatorLiquidityPosition>(AGGREGATOR_LIQUIDITY);
  const [commissions, setCommissions] = useState<AggregatorCommissionSummary>(AGGREGATOR_COMMISSIONS);
  const [settlements, setSettlements] = useState<AggregatorSettlementRecord[]>(AGGREGATOR_SETTLEMENTS);
  const [reconciliations, setReconciliations] = useState<AggregatorReconciliationRecord[]>(AGGREGATOR_RECONCILIATION);
  const [exceptions, setExceptions] = useState<AggregatorExceptionRecord[]>(AGGREGATOR_EXCEPTIONS);
  const [riskAlerts, setRiskAlerts] = useState<AggregatorRiskAlert[]>(AGGREGATOR_RISK_ALERTS);
  const [complianceRecords, setComplianceRecords] = useState<AggregatorComplianceRecord[]>(AGGREGATOR_COMPLIANCE_QUEUE);
  const [services, setServices] = useState<AggregatorServiceHealth[]>(AGGREGATOR_SERVICES);
  const [team, setTeam] = useState<AggregatorTeamMember[]>(AGGREGATOR_TEAM);
  const [targets, setTargets] = useState<AggregatorTarget[]>(AGGREGATOR_TARGETS);

  const [selectedCountry, setSelectedCountry] = useState<AggregatorCountry | "ALL">("NG");
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>("ALL");
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(4);

  // Modals state
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);
  const [selectedAgentForLiquidity, setSelectedAgentForLiquidity] = useState<AggregatedAgent | null>(null);
  const [isInvestigateDrawerOpen, setIsInvestigateDrawerOpen] = useState(false);
  const [selectedTxForInvestigation, setSelectedTxForInvestigation] = useState<AggregatorTransaction | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("koriepay_aggregator_lang") as SupportedLanguage;
      if (savedLang) {
        setLanguageState(savedLang);
      }
      const savedHide = localStorage.getItem("koriepay_aggregator_hide_balance");
      if (savedHide) {
        setIsBalanceHidden(savedHide === "true");
      }
      const savedCountry = localStorage.getItem("koriepay_aggregator_country") as AggregatorCountry | "ALL";
      if (savedCountry) {
        setSelectedCountry(savedCountry);
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
      localStorage.setItem("koriepay_aggregator_lang", lang);
    }
  };

  const handleSetCountry = (c: AggregatorCountry | "ALL") => {
    setSelectedCountry(c);
    if (typeof window !== "undefined") {
      localStorage.setItem("koriepay_aggregator_country", c);
    }
  };

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("koriepay_aggregator_hide_balance", String(next));
      }
      return next;
    });
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    return translateAggregator(language, key, params);
  };

  const formatCurrency = (amount: number, overrideCurrency?: AggregatorCurrency): string => {
    const cur = overrideCurrency || (selectedCountry === "NE" ? "XOF" : aggregator.currency);
    if (cur === "XOF") {
      return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
    }
    return `₦${Number(amount || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

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
    pin: string
  ): Promise<{ success: boolean; error?: string; reference?: string }> => {
    if (isOffline) {
      return { success: false, error: "Network offline. Float distribution requires an active banking node." };
    }
    if (amount <= 0 || amount > aggregator.availableLiquidity) {
      return { success: false, error: "Insufficient aggregator wallet liquidity available." };
    }

    const ref = `KP-FLOAT-${Date.now().toString().slice(-6)}`;

    // Debit aggregator main wallet
    setAggregator((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance - amount,
      availableLiquidity: prev.availableLiquidity - amount,
    }));

    // Credit agent float
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? {
              ...a,
              walletBalance: a.walletBalance + amount,
              totalLiquidity: a.totalLiquidity + amount,
              riskStatus: "LOW",
              status: "ACTIVE",
            }
          : a
      )
    );

    // Update liquidity position
    setLiquidity((prev) => ({
      ...prev,
      aggregatorMainWallet: prev.aggregatorMainWallet - amount,
      totalAgentFloatLiquidity: prev.totalAgentFloatLiquidity + amount,
      agentsUnderMinimumThresholdCount: Math.max(0, prev.agentsUnderMinimumThresholdCount - 1),
    }));

    closeLiquidityModal();
    return { success: true, reference: ref };
  };

  const openTransactionInvestigation = (tx: AggregatorTransaction) => {
    setSelectedTxForInvestigation(tx);
    setIsInvestigateDrawerOpen(true);
  };

  const closeTransactionInvestigation = () => {
    setIsInvestigateDrawerOpen(false);
    setSelectedTxForInvestigation(null);
  };

  const acknowledgeRiskAlert = (alertId: string) => {
    setRiskAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "ACKNOWLEDGED" } : a))
    );
  };

  const resolveException = (exceptionId: string, notes: string) => {
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId
          ? {
              ...e,
              currentState: "RESOLVED",
              description: `${e.description} | Resolved: ${notes}`,
            }
          : e
      )
    );
  };

  const onboardAgent = (data: Partial<AggregatedAgent>): AggregatedAgent => {
    const code = `AGT-KN-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAgt: AggregatedAgent = {
      id: `agt-${Date.now()}`,
      agentCode: code,
      fullName: data.fullName || "New Agency Partner",
      businessName: data.businessName || "New Agency Point",
      phone: data.phone || "+234 800 000 0000",
      email: data.email,
      country: data.country || "NG",
      state: data.state || "Kano State",
      lga: data.lga || "Kano Municipal",
      territoryId: data.territoryId || "ter-kn-01",
      territoryName: data.territoryName || "Kano North & Urban",
      branchName: data.branchName || "Regional Main Agency Hub",
      status: "ACTIVE",
      kycTier: data.kycTier || "TIER_2",
      kycStatus: "VERIFIED",
      walletBalance: 0,
      cashInDrawer: 0,
      totalLiquidity: 0,
      todayTransactionsCount: 0,
      todayVolume: 0,
      todayCommission: 0,
      monthlyVolume: 0,
      successRate: 100,
      posTerminalCount: 1,
      lastActiveAt: "Just now",
      riskStatus: "LOW",
      registeredAt: new Date().toISOString().split("T")[0],
    };

    setAgents((prev) => [newAgt, ...prev]);
    setAggregator((prev) => ({
      ...prev,
      activeAgentsCount: prev.activeAgentsCount + 1,
    }));

    return newAgt;
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
        isOffline,
        notificationsCount,
      }}
    >
      {children}
    </AggregatorContext.Provider>
  );
}

export function useAggregator() {
  const context = useContext(AggregatorContext);
  if (!context) {
    throw new Error("useAggregator must be used within an AggregatorProvider");
  }
  return context;
}
