"use client";

import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  Search,
  ChevronDown,
  Building2,
  Repeat2,
  Users,
  CreditCard,
  Code2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useCountry } from "@/components/ui/CountryContext";
import CTASection from "@/components/sections/CTASection";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export default function FAQPage() {
  const { openModal } = useCountry();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "faq-1": true,
  });

  const faqs: FAQItem[] = [
    {
      id: "faq-1",
      category: "General",
      question: "What is KoriePay?",
      answer:
        "KoriePay is Tier-1 financial technology infrastructure connecting agents, BDC/FX operators, customers, merchants, and businesses across the interconnected markets of Nigeria and Niger Republic. As expressed in our Hausa brand slogan 'Kudinka, Hannunka' (Your Money, in Your Hands), we build accessible, scalable digital rails for everyday African commerce.",
    },
    {
      id: "faq-2",
      category: "General",
      question: "How does KoriePay bridge Nigeria and Niger Republic?",
      answer:
        "KoriePay provides a unified transaction core that bridges the Nigerian interbank network (via NIBSS/NIP) and the Francophone West African economic zone (WAEMU). This enables real-time currency conversion and bilateral clearing between Nigerian Naira (NGN ₦) and West African CFA Franc (XOF CFA) across vital corridors like Kano ↔ Maradi, Katsina ↔ Dan-Issa, and Lagos ↔ Niamey.",
    },
    {
      id: "faq-3",
      category: "Agency Banking",
      question: "How do I become a verified KoriePay banking agent?",
      answer:
        "To become an agent, click 'Become an Agent' or fill out our online registration form. You will need a valid government-issued ID (NIN, National ID, or Voter's Card in Nigeria; Carte Nationale d'Identité or Passport in Niger), proof of physical retail business address, and initial float capital. Our regional field onboarding team verifies applications within 24 business hours.",
    },
    {
      id: "faq-4",
      category: "Agency Banking",
      question: "When are agent commissions paid?",
      answer:
        "Commissions on KoriePay are settled instantly in real time into your Agent Treasury Wallet. There is no waiting for end-of-week or end-of-month reconciliations. You can track every commission breakdown on your terminal or app.",
    },
    {
      id: "faq-5",
      category: "BDC & FX",
      question: "What capabilities does KoriePay provide for Bureau De Change operators?",
      answer:
        "KoriePay provides digital treasury management, real-time rate & spread engines, multi-currency customer ledgers, automated AML transaction threshold logging, and bilateral cross-border settlement rails. This allows licensed BDCs to execute large-scale currency transactions without the security hazards of moving physical bulk cash.",
    },
    {
      id: "faq-6",
      category: "Customers",
      question: "Is there a fee for transferring money to other KoriePay users?",
      answer:
        "Transfers between KoriePay wallet users are completely free. Interbank transfers to external commercial banks and cross-border corridor transfers carry low, transparent flat processing fees shown before confirmation.",
    },
    {
      id: "faq-7",
      category: "Merchants",
      question: "How do merchant settlements work for daily sales?",
      answer:
        "Merchants can choose between instant settlement (credited directly to their KoriePay Business Wallet) or automated next-morning (T+1) sweeping into their commercial bank account in Nigeria or Niger Republic.",
    },
    {
      id: "faq-8",
      category: "Developers",
      question: "How do I obtain API sandbox credentials?",
      answer:
        "You can request sandbox credentials directly on our Developer page. Our developer portal provides test API keys, comprehensive REST documentation, webhook simulators, and official SDKs for Node.js, Python, and Go.",
    },
    {
      id: "faq-9",
      category: "Security",
      question: "How does KoriePay protect customer funds and transaction data?",
      answer:
        "KoriePay employs end-to-end TLS 1.3 encryption, AES-256 at-rest storage, mandatory biometric authentication, real-time geographic anomaly heuristics, and strict adherence to the Nigeria Data Protection Regulation (NDPR) and regional WAEMU data governance standards.",
    },
  ];

  const categories = ["All", "General", "Agency Banking", "BDC & FX", "Customers", "Merchants", "Developers", "Security"];

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [faqs, activeCategory, searchQuery]);

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>KNOWLEDGE & SUPPORT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Frequently Asked <span className="text-gradient-korie">Questions</span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
            Clear answers about KoriePay&apos;s infrastructure, agency onboarding, BDC partnerships, settlement timelines, and security protocols.
          </p>

          {/* Search bar */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword, topic, or question..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900 border border-white/15 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Category Pills & FAQ List */}
      <section className="py-12 bg-[#060a14] relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Accordion List */}
          <div className="space-y-4">
            {filteredFaqs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No matching questions found for &ldquo;{searchQuery}&rdquo;. Try another search term or contact our support desk directly.
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = !!openItems[faq.id];
                return (
                  <div
                    key={faq.id}
                    className="p-5 sm:p-6 rounded-2xl bg-[#0b1324] border border-white/10 transition-all"
                  >
                    <button
                      onClick={() => toggleItem(faq.id)}
                      className="w-full flex items-center justify-between text-left gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-white/5">
                          {faq.category}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-white">
                          {faq.question}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-emerald-400" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-4 pt-4 border-t border-white/5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
