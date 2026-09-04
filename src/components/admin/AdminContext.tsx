"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CountryCode, MakerCheckerRequest } from "@/types/admin";

export type EntityDrawerType = "TRANSACTION" | "CUSTOMER" | "AGENT" | "MERCHANT" | "BDC" | "RECONCILIATION" | "LEDGER";

export interface DrawerEntityPayload {
  type: EntityDrawerType;
  data: unknown;
}

interface AdminContextType {
  countryFilter: CountryCode;
  setCountryFilter: (country: CountryCode) => void;
  environment: "PRODUCTION" | "SANDBOX";
  setEnvironment: (env: "PRODUCTION" | "SANDBOX") => void;
  isRealtimeActive: boolean;
  setIsRealtimeActive: (active: boolean) => void;
  activeDrawer: DrawerEntityPayload | null;
  openDrawer: (type: EntityDrawerType, data: unknown) => void;
  closeDrawer: () => void;
  makerCheckerModal: {
    isOpen: boolean;
    request?: MakerCheckerRequest;
  };
  openMakerChecker: (request: MakerCheckerRequest) => void;
  closeMakerChecker: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  notificationsCount: number;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [countryFilter, setCountryFilter] = useState<CountryCode>("GLOBAL");
  const [environment, setEnvironment] = useState<"PRODUCTION" | "SANDBOX">("PRODUCTION");
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const [activeDrawer, setActiveDrawer] = useState<DrawerEntityPayload | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [notificationsCount, setNotificationsCount] = useState<number>(4);
  const [makerCheckerModal, setMakerCheckerModal] = useState<{
    isOpen: boolean;
    request?: MakerCheckerRequest;
  }>({
    isOpen: false,
  });

  // Global Admin shortcut Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openDrawer = (type: EntityDrawerType, data: unknown) => {
    setActiveDrawer({ type, data });
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
  };

  const openMakerChecker = (request: MakerCheckerRequest) => {
    setMakerCheckerModal({
      isOpen: true,
      request,
    });
  };

  const closeMakerChecker = () => {
    setMakerCheckerModal({
      isOpen: false,
      request: undefined,
    });
  };

  return (
    <AdminContext.Provider
      value={{
        countryFilter,
        setCountryFilter,
        environment,
        setEnvironment,
        isRealtimeActive,
        setIsRealtimeActive,
        activeDrawer,
        openDrawer,
        closeDrawer,
        makerCheckerModal,
        openMakerChecker,
        closeMakerChecker,
        isSearchOpen,
        setIsSearchOpen,
        notificationsCount,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
