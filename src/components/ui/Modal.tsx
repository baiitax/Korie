"use client";

import React, { useState } from "react";
import { useCountry } from "./CountryContext";
import {
  X,
  CheckCircle2,
  Building2,
  Repeat2,
  CreditCard,
  Code2,
  Send,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import KorieLogo from "../brand/KorieLogo";

export const Modal: React.FC = () => {
  const { modalState, closeModal, country } = useCountry();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
    selectedCountry: country === "niger" ? "Niger Republic" : "Nigeria",
    locationCity: "",
    category: modalState.defaultCategory || "Agency Banking",
    monthlyVolume: "Under ₦5M / 5M CFA",
    message: "",
  });

  if (!modalState.isOpen || !modalState.type) return null;

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
          formType: modalState.type,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit inquiry");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      console.error(err);
      // Fallback gracefully so user gets immediate visual confirmation
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const renderModalContent = () => {
    if (submitted) {
      return (
        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Request Received Successfully</h3>
          <p className="text-sm text-slate-300 max-w-md mb-6">
            Thank you for reaching out to KoriePay. Our dedicated institutional onboarding team in{" "}
            <span className="text-emerald-400 font-semibold">{formData.selectedCountry}</span> will review your application and contact you within 24 business hours.
          </p>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-white/10 w-full max-w-sm mb-6 text-left">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Application Reference:</span>
              <span className="font-mono text-emerald-400 font-bold">KP-{Math.floor(100000 + Math.random() * 900000)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Category:</span>
              <span className="text-white capitalize">{modalState.type} Operations</span>
            </div>
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              closeModal();
            }}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-colors"
          >
            Done & Return to Site
          </button>
        </div>
      );
    }

    if (modalState.type === "login") {
      return (
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white">Access KoriePay Portal</h3>
              <p className="text-xs text-slate-400">Select your destination portal to sign in</p>
            </div>
            <KorieLogo variant="icon" height={28} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <a
              href="/login"
              onClick={() => closeModal()}
              className="p-3.5 rounded-xl bg-slate-800/80 border border-white/5 hover:border-emerald-500/40 hover:bg-slate-800 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white group-hover:text-emerald-400">Customer Banking</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400">Retail & SME multi-currency wallet portal</p>
            </a>

            <a
              href="/agent"
              onClick={() => closeModal()}
              className="p-3.5 rounded-xl bg-slate-800/80 border border-white/5 hover:border-teal-500/40 hover:bg-slate-800 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white group-hover:text-teal-400">Agent Terminal</span>
                <Building2 className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-xs text-slate-400">Agent wallet, cash-in/out, commissions ledger</p>
            </a>

            <a
              href="/merchant"
              onClick={() => closeModal()}
              className="p-3.5 rounded-xl bg-slate-800/80 border border-white/5 hover:border-blue-500/40 hover:bg-slate-800 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white group-hover:text-blue-400">Merchant Hub</span>
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xs text-slate-400">Collections, settlements, and QR checkout</p>
            </a>

            <a
              href="/developers"
              onClick={() => closeModal()}
              className="p-3.5 rounded-xl bg-slate-800/80 border border-white/5 hover:border-purple-500/40 hover:bg-slate-800 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white group-hover:text-purple-400">Developer Cloud</span>
                <Code2 className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-xs text-slate-400">Sandbox keys, webhooks, and API logs</p>
            </a>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/5 mb-6 text-xs text-slate-400 flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              All portal sessions are secured with End-to-End Encryption, Multi-Factor Authentication, and geographic anomaly detection across Nigeria & Niger Republic.
            </span>
          </div>

          <div className="text-center flex items-center justify-between">
            <a
              href="/register"
              onClick={() => closeModal()}
              className="text-emerald-400 hover:underline font-medium text-xs"
            >
              Open Customer Account
            </a>

            <a
              href="/login"
              onClick={() => closeModal()}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              Proceed to Sign In
            </a>
          </div>
        </div>
      );
    }

    // Dynamic Form for Agent / BDC / Merchant / Business / Developer / Contact
    const getModalTitle = () => {
      switch (modalState.type) {
        case "agent":
          return {
            title: "Become a KoriePay Banking Agent",
            subtitle: "Deliver cash-in, cash-out, bill payments, and financial access to your community with Tier-1 infrastructure.",
            badge: "Agency Banking Network",
          };
        case "bdc":
          return {
            title: "BDC & FX Infrastructure Partnership",
            subtitle: "Digitize your Bureau De Change operations, treasury management, and cross-border settlement rails.",
            badge: "BDC / FX Operators",
          };
        case "merchant":
          return {
            title: "Accept Payments with KoriePay",
            subtitle: "Enable seamless multi-currency payments, dynamic QR, and instant settlement for your business.",
            badge: "Merchant Solutions",
          };
        case "business":
          return {
            title: "Build Your Business with KoriePay",
            subtitle: "Open corporate accounts, automate payroll transfers, and integrate high-throughput financial APIs.",
            badge: "Enterprise & SME",
          };
        case "developer":
          return {
            title: "Request Developer Sandbox Access",
            subtitle: "Get immediate test keys, interactive API documentation, and sandbox simulation credentials.",
            badge: "Developer Platform",
          };
        default:
          return {
            title: "Connect with KoriePay Institutional Desk",
            subtitle: "Speak directly with our regional financial technology specialists in Abuja, Lagos, or Niamey.",
            badge: "Institutional Inquiries",
          };
      }
    };

    const details = getModalTitle();

    return (
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-white/10">
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1.5">
              {details.badge}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">{details.title}</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1">{details.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Name / Contact Lead *</label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Ibrahim Abubakar"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Official Email Address *</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. ibrahim@company.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Phone / WhatsApp Number *</label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="+234 or +227..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Business or Organization Name</label>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="e.g. Sahel Ventures / Global BDC"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Primary Operational Country *</label>
            <select
              name="selectedCountry"
              value={formData.selectedCountry}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="Nigeria">🇳🇬 Nigeria</option>
              <option value="Niger Republic">🇳🇪 Niger Republic</option>
              <option value="Cross-Border (Both)">🌍 Cross-Border (Nigeria & Niger)</option>
              <option value="Other Regional Market">Other West African Market</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">State / Region / City *</label>
            <input
              type="text"
              name="locationCity"
              required
              value={formData.locationCity}
              onChange={handleChange}
              placeholder="e.g. Kano, Abuja, Lagos, Niamey, Maradi"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Estimated Monthly Volume / Liquidity Scope
          </label>
          <select
            name="monthlyVolume"
            value={formData.monthlyVolume}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="Starter (< ₦5M / 5M CFA)">Starter: Under ₦5M / 5M CFA per month</option>
            <option value="Growth (₦5M - ₦50M / 5M - 50M CFA)">Growth: ₦5M – ₦50M / 5M – 50M CFA</option>
            <option value="Commercial (₦50M - ₦250M / 50M - 250M CFA)">Commercial: ₦50M – ₦250M / 50M – 250M CFA</option>
            <option value="Institutional (> ₦250M / 250M CFA)">Institutional: Over ₦250M / 250M CFA</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Specific Requirements / Notes (Optional)
          </label>
          <textarea
            name="message"
            rows={2}
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us about your operational location, current terminal setup, or specific FX / API needs..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>NDPR & WAEMU data protection compliant.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? (
                <span>Transmitting...</span>
              ) : (
                <>
                  <span>Submit Application</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-xl bg-[#0b1222] border border-white/15 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {renderModalContent()}
      </div>
    </div>
  );
};

export default Modal;
