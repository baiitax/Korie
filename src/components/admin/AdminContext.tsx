"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CountryCode } from "@/types/admin";

/** Drawer type: legacy entity names or a resource name from the registry. */
export type EntityDrawerType = string;

export interface DrawerEntityPayload {
  type: EntityDrawerType;
  data: unknown;
}

interface AdminContextType {
  countryFilter: CountryCode;
  setCountryFilter: (country: CountryCode) => void;
  activeDrawer: DrawerEntityPayload | null;
  openDrawer: (type: EntityDrawerType, data: unknown) => void;
  closeDrawer: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

/**
 * Admin UI context — navigation/search/record-drawer state only. No data
 * lives here: every number shown in the portal is fetched from the
 * database through /api/admin/data/* (the old fake "notificationsCount"
 * and maker-checker modal were removed with the statics rebuild).
 */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [countryFilter, setCountryFilter] = useState<CountryCode>("GLOBAL");
  const [activeDrawer, setActiveDrawer] = useState<DrawerEntityPayload | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

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

  return (
    <AdminContext.Provider
      value={{
        countryFilter,
        setCountryFilter,
        activeDrawer,
        openDrawer,
        closeDrawer,
        isSearchOpen,
        setIsSearchOpen,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return ctx;
}
