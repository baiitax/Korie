"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
import {
  CURRENT_MERCHANT,
  MERCHANT_BRANCHES,
  MERCHANT_STAFF,
  MERCHANT_PAYMENTS,
  MERCHANT_PAYMENT_LINKS,
  MERCHANT_INVOICES,
  MERCHANT_CUSTOMERS_CRM,
  MERCHANT_SETTLEMENTS,
  MERCHANT_DISPUTES,
  MERCHANT_API_KEYS,
  MERCHANT_WEBHOOKS,
} from "@/services/merchantDataService";
import { translateMerchant } from "@/locales/merchant";

interface MerchantContextType {
  merchant: MerchantOrganization;
  branches: MerchantBranch[];
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

  // Modal open states
  isReceiveModalOpen: boolean;
  setIsReceiveModalOpen: (open: boolean) => void;
  isCreateLinkModalOpen: boolean;
  setIsCreateLinkModalOpen: (open: boolean) => void;
  isCreateInvoiceModalOpen: boolean;
  setIsCreateInvoiceModalOpen: (open: boolean) => void;

  // Actions
  createPaymentLink: (data: {
    title: string;
    description: string;
    type: "SINGLE" | "REUSABLE" | "SUBSCRIPTION";
    amount?: number;
    redirectUrl?: string;
  }) => MerchantPaymentLink;

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
  }) => MerchantInvoice;

  refundTransaction: (txId: string, reason: string) => void;
  markInvoicePaid: (invoiceId: string) => void;
  rotateApiKey: (keyId: string) => void;

  notificationsCount: number;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [merchant, setMerchant] = useState<MerchantOrganization>(CURRENT_MERCHANT);
  const [branches, setBranches] = useState<MerchantBranch[]>(MERCHANT_BRANCHES);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [currency, setCurrency] = useState<MerchantCurrency>("NGN");
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [transactions, setTransactions] = useState<MerchantPaymentTransaction[]>(MERCHANT_PAYMENTS);
  const [paymentLinks, setPaymentLinks] = useState<MerchantPaymentLink[]>(MERCHANT_PAYMENT_LINKS);
  const [invoices, setInvoices] = useState<MerchantInvoice[]>(MERCHANT_INVOICES);
  const [customers, setCustomers] = useState<MerchantCustomerCRM[]>(MERCHANT_CUSTOMERS_CRM);
  const [settlementBatches, setSettlementBatches] = useState<MerchantSettlementBatch[]>(MERCHANT_SETTLEMENTS);
  const [disputes, setDisputes] = useState<MerchantDisputeRecord[]>(MERCHANT_DISPUTES);
  const [staff, setStaff] = useState<MerchantStaffUser[]>(MERCHANT_STAFF);
  const [apiKeys, setApiKeys] = useState<MerchantApiKey[]>(MERCHANT_API_KEYS);
  const [webhooks, setWebhooks] = useState<MerchantWebhookEndpoint[]>(MERCHANT_WEBHOOKS);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(3);

  // Modals state
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isCreateLinkModalOpen, setIsCreateLinkModalOpen] = useState(false);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("koriepay_merchant_lang") as SupportedLanguage;
      if (savedLang) {
        setLanguageState(savedLang);
      }
      const savedHide = localStorage.getItem("koriepay_merchant_hide_balance");
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
      localStorage.setItem("koriepay_merchant_lang", lang);
    }
  };

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("koriepay_merchant_hide_balance", String(next));
      }
      return next;
    });
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    return translateMerchant(language, key, params);
  };

  const formatCurrency = (amount: number): string => {
    if (merchant.currency === "XOF") {
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

  const createPaymentLink = (data: {
    title: string;
    description: string;
    type: "SINGLE" | "REUSABLE" | "SUBSCRIPTION";
    amount?: number;
    redirectUrl?: string;
  }): MerchantPaymentLink => {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newLink: MerchantPaymentLink = {
      id: `lnk-${Date.now()}`,
      title: data.title,
      description: data.description,
      slug,
      url: `https://pay.koriepay.com/m/${slug}-${Math.floor(100 + Math.random() * 900)}`,
      amount: data.amount,
      currency: merchant.currency,
      type: data.type,
      status: "ACTIVE",
      totalCollected: 0,
      successfulPaymentsCount: 0,
      redirectUrl: data.redirectUrl,
      createdAt: new Date().toISOString(),
    };

    setPaymentLinks((prev) => [newLink, ...prev]);
    return newLink;
  };

  const createInvoice = (data: {
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
  }): MerchantInvoice => {
    const invNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInv: MerchantInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNum,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      items: data.items,
      subtotal: data.subtotal,
      tax: data.tax,
      discount: data.discount,
      total: data.total,
      currency: merchant.currency,
      dueDate: data.dueDate,
      status: "SENT",
      virtualAccountNuban: "9928193820",
      virtualAccountBank: "Providus Bank",
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInv, ...prev]);
    return newInv;
  };

  const refundTransaction = (txId: string, reason: string) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === txId
          ? {
              ...tx,
              status: "REFUNDED",
              narration: `Refunded: ${reason}`,
            }
          : tx
      )
    );
  };

  const markInvoicePaid = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: "PAID",
              paidAt: new Date().toISOString(),
            }
          : inv
      )
    );
  };

  const rotateApiKey = (keyId: string) => {
    setApiKeys((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? {
              ...k,
              secretKeyMasked: `kp_live_${Math.random().toString(36).substring(2, 10)}••••••••`,
              lastUsedAt: new Date().toISOString(),
            }
          : k
      )
    );
  };

  return (
    <MerchantContext.Provider
      value={{
        merchant,
        branches,
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
        notificationsCount,
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
