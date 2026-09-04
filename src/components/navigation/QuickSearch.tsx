"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCountry } from "../ui/CountryContext";
import {
  Search,
  X,
  ArrowRight,
  Building2,
  Users,
  Repeat2,
  ShieldCheck,
  Code2,
  Globe2,
  FileText,
  CreditCard,
  Briefcase,
  HelpCircle,
} from "lucide-react";

interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: "Solutions" | "Markets" | "Infrastructure" | "Resources" | "Company";
  href?: string;
  modalType?: "agent" | "bdc" | "merchant" | "business" | "developer" | "contact";
  icon: React.ReactNode;
}

export const QuickSearch: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, openModal } = useCountry();
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isSearchOpen]);

  const items: SearchItem[] = [
    {
      id: "sol-agency",
      title: "Agency Banking Infrastructure",
      description: "Last-mile cash-in, cash-out, agent wallet, POS terminals, and commission ledger.",
      category: "Solutions",
      href: "/solutions/agency-banking",
      icon: <Building2 className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: "sol-bdc",
      title: "BDC & FX Digital Liquidity",
      description: "Digital treasury, rate management, settlement rails, and cross-border corridors.",
      category: "Solutions",
      href: "/solutions/bdc-fx",
      icon: <Repeat2 className="w-4 h-4 text-amber-400" />,
    },
    {
      id: "sol-cust",
      title: "Customer Digital Wallet",
      description: "Instant transfers, bill payments, savings, QR checkout, and biometric security.",
      category: "Solutions",
      href: "/solutions/customers",
      icon: <Users className="w-4 h-4 text-teal-400" />,
    },
    {
      id: "sol-biz",
      title: "Business & Corporate Accounts",
      description: "Multi-user permissions, bulk transfers, automated payroll, and financial reporting.",
      category: "Solutions",
      href: "/solutions/business",
      icon: <Briefcase className="w-4 h-4 text-blue-400" />,
    },
    {
      id: "sol-merch",
      title: "Merchant Payment Acceptance",
      description: "Dynamic QR, checkout widgets, payment links, and automated daily settlements.",
      category: "Solutions",
      href: "/solutions/merchant",
      icon: <CreditCard className="w-4 h-4 text-orange-400" />,
    },
    {
      id: "sol-pay",
      title: "Cross-Border Payments (NGN ↔ XOF)",
      description: "Sub-second corridor routing between Nigeria and Niger Republic with transparent rates.",
      category: "Solutions",
      href: "/solutions/payments",
      icon: <Globe2 className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: "mkt-ng",
      title: "Nigeria Market Infrastructure",
      description: "36 States + FCT Abuja network, NIBSS integration, and interbank settlement.",
      category: "Markets",
      href: "/nigeria",
      icon: <Globe2 className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: "mkt-ne",
      title: "Niger Republic Market Infrastructure",
      description: "Niamey, Maradi, Zinder trade nodes, CFA Franc (XOF) rails, and regional liquidity.",
      category: "Markets",
      href: "/niger-republic",
      icon: <Globe2 className="w-4 h-4 text-amber-400" />,
    },
    {
      id: "infra-tech",
      title: "Technology & Microservices Engine",
      description: "High-throughput transaction architecture, 99.98% uptime, and distributed telemetry.",
      category: "Infrastructure",
      href: "/technology",
      icon: <Code2 className="w-4 h-4 text-teal-400" />,
    },
    {
      id: "infra-sec",
      title: "Security & Risk Architecture",
      description: "Multi-factor authentication, end-to-end encryption, NDPR compliance, and fraud monitoring.",
      category: "Infrastructure",
      href: "/security",
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: "infra-dev",
      title: "Developer Platform & API Explorer",
      description: "REST APIs, webhooks, cURL / Node / Python SDKs, and sandbox testing environment.",
      category: "Infrastructure",
      href: "/developers",
      icon: <Code2 className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: "comp-about",
      title: "About KoriePay & Corporate Narrative",
      description: "Mission, vision, leadership, and cross-border connectivity across West Africa.",
      category: "Company",
      href: "/about",
      icon: <Building2 className="w-4 h-4 text-slate-300" />,
    },
    {
      id: "comp-partners",
      title: "Strategic Partners & Financial Institutions",
      description: "Partner with KoriePay across banking, BDC associations, and aggregators.",
      category: "Company",
      href: "/partners",
      icon: <Briefcase className="w-4 h-4 text-yellow-400" />,
    },
    {
      id: "comp-contact",
      title: "Contact & Regional Support Desks",
      description: "Inquire about Agency Banking, BDC partnerships, enterprise APIs, or media.",
      category: "Company",
      href: "/contact",
      icon: <HelpCircle className="w-4 h-4 text-blue-400" />,
    },
    {
      id: "comp-faq",
      title: "Frequently Asked Questions",
      description: "Answers regarding fees, onboarding, agent licensing, and cross-border settlements.",
      category: "Resources",
      href: "/faq",
      icon: <FileText className="w-4 h-4 text-purple-400" />,
    },
  ];

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8);
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-[#0d1527] border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 bg-slate-900/50">
          <Search className="w-5 h-5 text-emerald-400 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search solutions, corridors, API docs, agents, BDC..."
            className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-white/5">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No results found for &ldquo;{query}&rdquo;. Try searching for &ldquo;Agency Banking&rdquo;, &ldquo;BDC&rdquo;, or &ldquo;Nigeria&rdquo;.
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setIsSearchOpen(false);
                  if (item.href) router.push(item.href);
                  if (item.modalType) openModal(item.modalType);
                }}
                className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-slate-800/80 border border-white/5 shrink-0 group-hover:border-emerald-500/30">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all self-center" />
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-t border-white/5 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-white/10">Esc</kbd> to close
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-white/10">↵</kbd> to select
            </span>
          </div>
          <span className="text-emerald-400 font-medium">KoriePay Unified Search</span>
        </div>
      </div>
    </div>
  );
};

export default QuickSearch;
