"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type CountryMode = "nigeria" | "niger" | "cross-border";
export type LanguageMode = "en" | "fr";

export interface LeadModalState {
  isOpen: boolean;
  type: "agent" | "bdc" | "merchant" | "business" | "developer" | "contact" | "login" | null;
  defaultCategory?: string;
}

interface CountryContextType {
  country: CountryMode;
  setCountry: (country: CountryMode) => void;
  language: LanguageMode;
  setLanguage: (lang: LanguageMode) => void;
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
  modalState: LeadModalState;
  openModal: (type: LeadModalState["type"], defaultCategory?: string) => void;
  closeModal: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = useState<CountryMode>("cross-border");
  const [language, setLanguage] = useState<LanguageMode>("en");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [modalState, setModalState] = useState<LeadModalState>({
    isOpen: false,
    type: null,
  });

  // Keyboard shortcut Cmd+K or Ctrl+K for quick search
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

  const openModal = (type: LeadModalState["type"], defaultCategory?: string) => {
    setModalState({
      isOpen: true,
      type,
      defaultCategory,
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: null,
    });
  };

  const currency = 
    country === "nigeria"
      ? { code: "NGN", symbol: "₦", name: "Nigerian Naira" }
      : country === "niger"
      ? { code: "XOF", symbol: "CFA", name: "West African CFA Franc" }
      : { code: "NGN/XOF", symbol: "₦/CFA", name: "Multi-Currency Corridor" };

  return (
    <CountryContext.Provider
      value={{
        country,
        setCountry,
        language,
        setLanguage,
        currency,
        modalState,
        openModal,
        closeModal,
        isSearchOpen,
        setIsSearchOpen,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error("useCountry must be used within a CountryProvider");
  }
  return context;
}
