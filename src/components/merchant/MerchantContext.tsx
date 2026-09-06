"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MerchantOrganization,
  MerchantBranch,
  MerchantStaffUser,
  MerchantPaymentTransaction,
  MerchantPaymentLink,
  MerchantInvoice,
  MerchantCustomerCRM,
  MerchantSettlementBatch,
  MerchantDisputeRecord,
  MerchantApiKey,
  MerchantWebhookEndpoint,
  MerchantCurrency,
} from "@/types/merchant";
import { SupportedLanguage } from "@/types/customer";
import { translateMerchant } from "@/locales/merchant";
import { merchantApiFetch, getMerchantAccessToken } from "@/lib/merchant/merchantSession";

/**
 * Real, Supabase-backed Merchant Portal state. Replaces the fixture-driven
 * context (CURRENT_MERCHANT / MERCHANT_* arrays from merchantDataService)
 * with live fetches against /api/v1/merchant/*, following the exact same
 * pattern as AgentContext.tsx: every field the UI renders comes from a real
 * database row, a freshly self-registered PENDING business simply starts
 * with zero balances/empty lists until real activity occurs — nothing here
 * fabricates numbers.
 */

const EMPTY_MERCHANT: MerchantOrganization = {
  id: "",
  businessName: "",
  tradingName: "",
  merchantCode: "",
  cacNumber: "",
  tinNumber: "",
  email: "",
  phone: "",
  country: "NG",
  currency: "NGN",
  category: "",
  tier: "TIER_1",
  kybStatus: "PENDING",
  availableBalance: 0,
  pendingSettlement: 0,
  totalGrossSalesToday: 0,
  totalGrossVolume: 0,
  settlementBank: "",
  settlementAccountMasked: "",
  activeQRCodesCount: 0,
  activePOSCount: 0,
  branchesCount: 0,
  createdAt: new Date().toISOString(),
};

interface MerchantContextType {
  merchant: MerchantOrganization;
  merchantStatus: "PENDING" | "ACTIVE" | "SUSPENDED" | "RESTRICTED" | "DEACTIVATED";
  isLoadingProfile: boolean;
  branches: MerchantBranch[];
  totalActiveTerminals: number;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  currency: MerchantCurrency;
  setCurrency: (c: MerchantCurrency) => void;
  isBalanceHidden: boolean;
  toggleHideBalance: () => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString?: string) => string;

  transactions: MerchantPaymentTransaction[];
  paymentLinks: MerchantPaymentLink[];
  invoices: MerchantInvoice[];
  customers: MerchantCustomerCRM[];
  settlementBatches: MerchantSettlementBatch[];
  disputes: MerchantDisputeRecord[];
  staff: MerchantStaffUser[];
  apiKeys: MerchantApiKey[];
  webhooks: MerchantWebhookEndpoint[];
  isOffline: boolean;

  isReceiveModalOpen: boolean;
  setIsReceiveModalOpen: (open: boolean) => void;
  isCreateLinkModalOpen: boolean;
  setIsCreateLinkModalOpen: (open: boolean) => void;
  isCreateInvoiceModalOpen: boolean;
  setIsCreateInvoiceModalOpen: (open: boolean) => void;

  createPaymentLink: (data: {
    title: string;
    description: string;
    type: "SINGLE" | "REUSABLE" | "SUBSCRIPTION";
    amount?: number;
    redirectUrl?: string;
  }) => Promise<MerchantPaymentLink | null>;

  createInvoice: (data: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    items: any[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    dueDate: string;
    notes?: string;
  }) => Promise<MerchantInvoice | null>;

  refundTransaction: (txId: string, reason: string) => Promise<boolean>;
  markInvoicePaid: (invoiceId: string) => Promise<boolean>;
  rotateApiKey: (keyId: string) => Promise<{ secretKey: string } | null>;
  runSettlement: (currency?: string) => Promise<{ ok: boolean; message: string }>;

  notificationsCount: number;
  refreshAll: () => Promise<void>;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantOrganization>(EMPTY_MERCHANT);
  const [merchantStatus, setMerchantStatus] = useState<MerchantContextType["merchantStatus"]>("PENDING");
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [branches, setBranches] = useState<MerchantBranch[]>([]);
  const [totalActiveTerminals, setTotalActiveTerminals] = useState<number>(0);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [currency, setCurrency] = useState<MerchantCurrency>("NGN");
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [transactions, setTransactions] = useState<MerchantPaymentTransaction[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<MerchantPaymentLink[]>([]);
  const [invoices, setInvoices] = useState<MerchantInvoice[]>([]);
  const [customers, setCustomers] = useState<MerchantCustomerCRM[]>([]);
  const [settlementBatches, setSettlementBatches] = useState<MerchantSettlementBatch[]>([]);
  const [disputes, setDisputes] = useState<MerchantDisputeRecord[]>([]);
  const [staff, setStaff] = useState<MerchantStaffUser[]>([]);
  const [apiKeys, setApiKeys] = useState<MerchantApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<MerchantWebhookEndpoint[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(0);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isCreateLinkModalOpen, setIsCreateLinkModalOpen] = useState(false);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/me");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        const d = json.data;
        setMerchant({
          id: d.id,
          businessName: d.businessName,
          tradingName: d.tradingName,
          merchantCode: d.merchantCode,
          cacNumber: d.cacNumber || "",
          tinNumber: d.tinNumber || "",
          email: d.email,
          phone: d.phone,
          country: d.country,
          currency: d.currency,
          category: d.category,
          tier: d.tier,
          kybStatus: d.kybStatus,
          availableBalance: d.availableBalance,
          pendingSettlement: d.pendingSettlement,
          totalGrossSalesToday: d.totalGrossSalesToday,
          totalGrossVolume: d.totalGrossVolume,
          settlementBank: d.settlementBank || "Not yet configured",
          settlementAccountMasked: d.settlementAccountMasked || "—",
          registeredAddress: d.registeredAddress || undefined,
          registeredCity: d.registeredCity || undefined,
          registeredState: d.registeredState || undefined,
          activeQRCodesCount: 0,
          activePOSCount: 0,
          branchesCount: d.branchesCount,
          createdAt: d.createdAt,
        });
        setMerchantStatus(d.status);
        setCurrency(d.currency);
      } else if (res.status === 401 || res.status === 403) {
        router.push("/login");
      }
    } catch {
      // leave prior known-good state on network failure
    } finally {
      setIsLoadingProfile(false);
    }
  }, [router]);

  const refreshBranches = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/branches");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setBranches(json.data.branches);
        setTotalActiveTerminals(json.data.totalActiveTerminals || 0);
      }
    } catch {}
  }, []);

  const refreshTransactions = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/transactions?limit=100");
      const json = await res.json();
      if (res.ok && json.status === "success") setTransactions(json.data.transactions);
    } catch {}
  }, []);

  const refreshPaymentLinks = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/payment-links");
      const json = await res.json();
      if (res.ok && json.status === "success") setPaymentLinks(json.data.paymentLinks);
    } catch {}
  }, []);

  const refreshInvoices = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/invoices");
      const json = await res.json();
      if (res.ok && json.status === "success") setInvoices(json.data.invoices);
    } catch {}
  }, []);

  const refreshCustomers = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/customers");
      const json = await res.json();
      if (res.ok && json.status === "success") setCustomers(json.data.customers);
    } catch {}
  }, []);

  const refreshSettlements = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/settlements");
      const json = await res.json();
      if (res.ok && json.status === "success") setSettlementBatches(json.data.settlements);
    } catch {}
  }, []);

  const refreshDisputes = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/disputes");
      const json = await res.json();
      if (res.ok && json.status === "success") setDisputes(json.data.disputes);
    } catch {}
  }, []);

  const refreshStaff = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/staff");
      const json = await res.json();
      if (res.ok && json.status === "success") setStaff(json.data.staff);
    } catch {}
  }, []);

  const refreshApiKeys = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/keys");
      const json = await res.json();
      if (res.ok && json.status === "success") setApiKeys(json.data.apiKeys);
    } catch {}
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/notifications?limit=30");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setNotificationsCount((json.data.notifications || []).filter((n: any) => !n.is_read).length);
      }
    } catch {}
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshProfile(),
      refreshBranches(),
      refreshTransactions(),
      refreshPaymentLinks(),
      refreshInvoices(),
      refreshCustomers(),
      refreshSettlements(),
      refreshDisputes(),
      refreshStaff(),
      refreshApiKeys(),
      refreshNotifications(),
    ]);
  }, [
    refreshProfile,
    refreshBranches,
    refreshTransactions,
    refreshPaymentLinks,
    refreshInvoices,
    refreshCustomers,
    refreshSettlements,
    refreshDisputes,
    refreshStaff,
    refreshApiKeys,
    refreshNotifications,
  ]);

  useEffect(() => {
    (async () => {
      const token = await getMerchantAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }
      refreshAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("koriepay_merchant_lang") as SupportedLanguage;
      if (savedLang) setLanguageState(savedLang);
      const savedHide = localStorage.getItem("koriepay_merchant_hide_balance");
      if (savedHide) setIsBalanceHidden(savedHide === "true");

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
    if (typeof window !== "undefined") localStorage.setItem("koriepay_merchant_lang", lang);
  };

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem("koriepay_merchant_hide_balance", String(next));
      return next;
    });
  };

  const t = (key: string, params?: Record<string, string | number>): string => translateMerchant(language, key, params);

  const formatCurrency = (amount: number): string => {
    if (merchant.currency === "XOF") {
      return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
    }
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

  const createPaymentLink: MerchantContextType["createPaymentLink"] = async (data) => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/payment-links", { method: "POST", body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return null;
      const link: MerchantPaymentLink = json.data;
      setPaymentLinks((prev) => [link, ...prev]);
      return link;
    } catch {
      return null;
    }
  };

  const createInvoice: MerchantContextType["createInvoice"] = async (data) => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/invoices", { method: "POST", body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return null;
      const inv: MerchantInvoice = json.data;
      setInvoices((prev) => [inv, ...prev]);
      return inv;
    } catch {
      return null;
    }
  };

  const refundTransaction = async (txId: string, reason: string): Promise<boolean> => {
    try {
      const res = await merchantApiFetch(`/api/v1/merchant/transactions/${txId}/refund`, { method: "POST", body: JSON.stringify({ reason }) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return false;
      setTransactions((prev) => prev.map((tx) => (tx.id === txId ? { ...tx, status: "REFUNDED", narration: `Refunded: ${reason}` } : tx)));
      return true;
    } catch {
      return false;
    }
  };

  const markInvoicePaid = async (invoiceId: string): Promise<boolean> => {
    try {
      const res = await merchantApiFetch(`/api/v1/merchant/invoices/${invoiceId}/mark-paid`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return false;
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: "PAID", paidAmount: json.data.paidAmount, paidAt: json.data.paidAt } : inv))
      );
      return true;
    } catch {
      return false;
    }
  };

  const rotateApiKey = async (_keyId: string): Promise<{ secretKey: string } | null> => {
    // "Rotate" issues a fresh sandbox key (production key issuance requires
    // an ACTIVE, KYB-verified merchant — see /api/v1/merchant/keys).
    try {
      const res = await merchantApiFetch("/api/v1/merchant/keys", { method: "POST", body: JSON.stringify({ environment: "SANDBOX" }) });
      const json = await res.json();
      if (!res.ok || json.status !== "success") return null;
      await refreshApiKeys();
      return { secretKey: json.data.secretKey };
    } catch {
      return null;
    }
  };

  const runSettlement = async (currency?: string): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/settlements/run", {
        method: "POST",
        body: JSON.stringify({ currency: currency || merchant.currency }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        return { ok: false, message: json?.error?.message || json?.message || "Could not run settlement." };
      }
      await refreshSettlements();
      return { ok: true, message: `Settlement batch ${json.data.batchReference} created for ${json.data.transactionCount} transaction(s).` };
    } catch {
      return { ok: false, message: "Network error running settlement." };
    }
  };

  return (
    <MerchantContext.Provider
      value={{
        merchant,
        merchantStatus,
        isLoadingProfile,
        branches,
        totalActiveTerminals,
        selectedBranchId,
        setSelectedBranchId,
        currency,
        setCurrency,
        isBalanceHidden,
        toggleHideBalance,
        language,
        setLanguage,
        t,
        formatCurrency,
        formatDate,
        transactions,
        paymentLinks,
        invoices,
        customers,
        settlementBatches,
        disputes,
        staff,
        apiKeys,
        webhooks,
        isOffline,
        isReceiveModalOpen,
        setIsReceiveModalOpen,
        isCreateLinkModalOpen,
        setIsCreateLinkModalOpen,
        isCreateInvoiceModalOpen,
        setIsCreateInvoiceModalOpen,
        createPaymentLink,
        createInvoice,
        refundTransaction,
        markInvoicePaid,
        rotateApiKey,
        runSettlement,
        notificationsCount,
        refreshAll,
      }}
    >
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const context = useContext(MerchantContext);
  if (!context) {
    throw new Error("useMerchant must be used within a MerchantProvider");
  }
  return context;
}
