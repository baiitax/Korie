"use client";

import React from "react";
import { Building2, Repeat2, Users, Briefcase, Quote, CheckCircle2 } from "lucide-react";

export const TestimonialsStories: React.FC = () => {
  const stories = [
    {
      name: "Alhaji Garba Sani",
      role: "Super Agent & Retail Distributor",
      location: "Kano Commercial District, Nigeria 🇳🇬",
      quote:
        "Before KoriePay, cash handling and network downtime on POS terminals caused significant business loss. With KoriePay's high transaction completion rate and instant commission settlement, my store processes over 200 daily customer transactions without fail.",
      category: "Agency Banking Network",
      icon: <Building2 className="w-4 h-4 text-emerald-400" />,
      tag: "Agent Operator",
    },
    {
      name: "Mamadou Oumarou",
      role: "Cross-Border Commodity Merchant",
      location: "Maradi Central Market, Niger Republic 🇳🇪",
      quote:
        "Our grain trade between Maradi and Kano requires fast currency conversion and reliable receipts. KoriePay allows our partners in Nigeria to pay in Naira while we settle locally in CFA Franc within minutes. It has eliminated the danger of traveling with bags of cash across the border.",
      category: "Cross-Border Trade",
      icon: <Repeat2 className="w-4 h-4 text-amber-400" />,
      tag: "BDC & Commerce",
    },
    {
      name: "Amina Bello & Partners",
      role: "Fintech Product Lead & SME Operator",
      location: "Abuja & Lagos, Nigeria 🇳🇬",
      quote:
        "Integrating KoriePay's developer APIs into our logistics application took less than 48 hours. The webhooks are rock solid, and having unified multi-currency capabilities for Nigeria and Niger opened up instant regional expansion for us.",
      category: "Enterprise Developer",
      icon: <Briefcase className="w-4 h-4 text-teal-400" />,
      tag: "Business Integration",
    },
  ];

  return (
    <section className="py-20 lg:py-28 relative bg-[#070c18] text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-white/10 text-xs font-mono text-emerald-400 mb-3">
            <span>REGIONAL VOICES</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Trusted by Agents, Merchants & Operators Across the Sahel
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            Real stories from the people on the ground driving daily commerce between Nigeria and Niger Republic.
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stories.map((s, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-3xl bg-[#0b1324] border border-white/10 shadow-xl flex flex-col justify-between hover:border-emerald-500/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-800 border border-white/5">{s.icon}</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase">
                      {s.tag}
                    </span>
                  </div>
                  <Quote className="w-6 h-6 text-slate-700" />
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic mb-6">
                  &ldquo;{s.quote}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="text-sm font-bold text-white">{s.name}</div>
                <div className="text-xs text-slate-400">{s.role}</div>
                <div className="text-[11px] font-mono text-amber-400/90 mt-1">{s.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsStories;
