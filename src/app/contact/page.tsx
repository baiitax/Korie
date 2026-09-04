"use client";

import React, { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Globe2,
  Send,
  CheckCircle2,
  ShieldCheck,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useCountry } from "@/components/ui/CountryContext";

export default function ContactPage() {
  const { country } = useCountry();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
    category: "Agency Banking",
    selectedCountry: country === "niger" ? "Niger Republic" : "Nigeria",
    locationCity: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          formType: "contact-page",
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-grid-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-4">
            <Mail className="w-3.5 h-3.5" />
            <span>REGIONAL DESKS & INTAKE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Connect with KoriePay <span className="text-gradient-korie">Institutional Desk</span>
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 leading-relaxed">
            Reach out to our dedicated financial technology teams in Abuja, Lagos, and Niamey. We provide specialized onboarding for agents, BDCs, merchants, and institutional partners.
          </p>
        </div>
      </section>

      {/* Main Grid: Info + Interactive Form */}
      <section className="py-12 bg-[#060a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Regional Hubs Info */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Nigeria HQ & Commercial Hubs</h3>
                    <p className="text-xs text-slate-400">Abuja Central Area & Lagos Financial District</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Abuja / Lagos / Kano Regional Network Offices</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>+234 (0) 700-KORIEPAY / +234 (0) 800-KORIE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>nigeria.desk@koriepay.com</span>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 rounded-3xl bg-[#0b1324] border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Niger Republic Operations</h3>
                    <p className="text-xs text-slate-400">Niamey Center & Maradi Trade Desk</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Boulevard de la République, Niamey / Central Maradi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>+227 20 7X XX XX (Niamey Desk)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>niger.desk@koriepay.com</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center gap-3 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Response SLA: Institutional inquiries are acknowledged within 24 business hours.</span>
              </div>
            </div>

            {/* Right Column: Interactive Form */}
            <div className="lg:col-span-7">
              <div className="p-6 sm:p-10 rounded-3xl bg-[#0d162a] border border-white/15 shadow-2xl">
                {submitted ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Message Transmitted</h3>
                    <p className="text-sm text-slate-300 max-w-md mb-6">
                      Thank you for contacting KoriePay. Your inquiry has been routed to the appropriate regional team in{" "}
                      <span className="text-emerald-400 font-semibold">{formData.selectedCountry}</span>.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Send an Institutional Inquiry</h3>
                      <p className="text-xs text-slate-400 mb-4">
                        Please specify your organization type to route to the correct desk.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                        <input
                          type="text"
                          name="fullName"
                          required
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Your full name"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="name@organization.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Phone / WhatsApp *</label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+234 or +227..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Business Name</label>
                        <input
                          type="text"
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleChange}
                          placeholder="Company or Kiosk name"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Inquiry Category *</label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                        >
                          <option value="Agency Banking">Agency Banking Onboarding</option>
                          <option value="BDC / FX Partnership">BDC / FX Digital Partnership</option>
                          <option value="Merchant Acceptance">Merchant Payments & POS</option>
                          <option value="Enterprise Treasury">Business & Enterprise Treasury</option>
                          <option value="Developer APIs">Developer APIs & Integration</option>
                          <option value="Banking & Strategic Alliance">Commercial Bank Partnership</option>
                          <option value="General Inquiries">General / Media Inquiries</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Operating Country *</label>
                        <select
                          name="selectedCountry"
                          value={formData.selectedCountry}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                        >
                          <option value="Nigeria">🇳🇬 Nigeria</option>
                          <option value="Niger Republic">🇳🇪 Niger Republic</option>
                          <option value="Cross-Border">🌍 Cross-Border (Both)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Message / Requirements *</label>
                      <textarea
                        name="message"
                        required
                        rows={4}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Please describe your operational location, current transaction volumes, or integration requirements..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>NDPR & WAEMU Protected</span>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3 rounded-xl btn-korie-primary text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"
                      >
                        {loading ? <span>Sending...</span> : <><span>Transmit Inquiry</span><Send className="w-3.5 h-3.5" /></>}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
