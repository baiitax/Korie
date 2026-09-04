"use client";

import React, { useState } from "react";
import Link from "next/link";
import KorieLogo from "../brand/KorieLogo";
import {
  ShieldCheck,
  CheckCircle2,
  Globe2,
  Mail,
  Send,
  Building2,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { useCountry } from "../ui/CountryContext";
import { useTheme } from "../ui/ThemeContext";
import { ThemeToggle } from "../ui/ThemeToggle";

export const Footer: React.FC = () => {
  const { openModal } = useCountry();
  const { theme } = useTheme();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setSubscribing(true);
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      setNewsletterSubscribed(true);
      setNewsletterEmail("");
    } catch {
      setNewsletterSubscribed(true);
    } finally {
      setSubscribing(false);
    }
  };

  const replayPreloader = () => {
    sessionStorage.removeItem("koriepay_loaded");
    window.location.reload();
  };

  return (
    <footer className="relative bg-[var(--footer-bg)] text-[var(--footer-fg)] border-t border-[var(--border)] overflow-hidden kp-ambient">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Footer Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        {/* Top Newsletter & Ecosystem Strip */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[var(--footer-surface)] border border-[var(--border)] mb-14 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Institutional Briefings
              </span>
              <span className="text-xs text-[var(--footer-muted)]">Nigeria ↔ Niger Republic</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--footer-fg)]">
              Stay Informed on Cross-Border Fintech & Infrastructure
            </h3>
            <p className="text-xs sm:text-sm text-[var(--footer-muted)] mt-1">
              Receive quarterly insights on agency banking expansion, BDC digitisation, and West African financial rails.
            </p>
          </div>

          <form onSubmit={handleNewsletterSubmit} className="w-full lg:w-auto flex-1 max-w-md">
            {newsletterSubscribed ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Thank you. You have been added to our institutional briefing list.</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--footer-muted)]" />
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter official email address..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-strong)] text-xs text-[var(--footer-fg)] placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={subscribing}
                  className="px-5 py-2.5 rounded-xl btn-korie-primary text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>Subscribe</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Multi-column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 pb-12 border-b border-[var(--border)]">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <KorieLogo variant="full" theme={theme === "light" ? "light" : "dark"} height={36} />
            <p className="text-xs text-[var(--footer-muted)] leading-relaxed max-w-sm">
              Tier-1 financial technology infrastructure powering Agency Banking, BDC/FX operations, and digital commerce across the interconnected markets of Nigeria and Niger Republic.
            </p>
            <div className="pt-2 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-[var(--footer-muted)]">
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Nigeria HQ: Abuja & Lagos Commercial Centers</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--footer-muted)]">
                <Globe2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Niger Republic Operations: Niamey & Maradi Trade Corridors</span>
              </div>
            </div>
            {/* Live Uptime Status */}
            <div className="pt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-mono text-[var(--footer-fg)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Network Status:</span>
              <span className="text-emerald-400 font-bold">99.98% Operational</span>
            </div>
          </div>

          {/* Solutions Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--footer-fg)]">Solutions</div>
            <ul className="space-y-2 text-xs text-[var(--footer-muted)]">
              <li>
                <Link href="/solutions/agency-banking" className="hover:text-emerald-400 transition-colors">
                  Agency Banking
                </Link>
              </li>
              <li>
                <Link href="/solutions/bdc-fx" className="hover:text-amber-400 transition-colors">
                  BDC / FX Digital
                </Link>
              </li>
              <li>
                <Link href="/solutions/customers" className="hover:text-teal-400 transition-colors">
                  Customer Wallet
                </Link>
              </li>
              <li>
                <Link href="/solutions/business" className="hover:text-blue-400 transition-colors">
                  Business Accounts
                </Link>
              </li>
              <li>
                <Link href="/solutions/merchant" className="hover:text-orange-400 transition-colors">
                  Merchant POS & QR
                </Link>
              </li>
              <li>
                <Link href="/solutions/payments" className="hover:text-emerald-400 transition-colors">
                  Cross-Border Rails
                </Link>
              </li>
            </ul>
          </div>

          {/* Markets Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--footer-fg)]">Markets</div>
            <ul className="space-y-2 text-xs text-[var(--footer-muted)]">
              <li>
                <Link href="/nigeria" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>🇳🇬 Nigeria (NGN)</span>
                </Link>
              </li>
              <li>
                <Link href="/niger-republic" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                  <span>🇳🇪 Niger Rep. (XOF)</span>
                </Link>
              </li>
              <li>
                <Link href="/solutions/payments" className="hover:text-[var(--footer-fg)] transition-colors">
                  Kano ↔ Maradi Corridor
                </Link>
              </li>
              <li>
                <Link href="/solutions/payments" className="hover:text-[var(--footer-fg)] transition-colors">
                  Lagos ↔ Niamey Corridor
                </Link>
              </li>
              <li>
                <Link href="/solutions/payments" className="hover:text-[var(--footer-fg)] transition-colors">
                  Sokoto ↔ Birni Corridor
                </Link>
              </li>
            </ul>
          </div>

          {/* Infrastructure Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--footer-fg)]">Infrastructure</div>
            <ul className="space-y-2 text-xs text-[var(--footer-muted)]">
              <li>
                <Link href="/technology" className="hover:text-teal-400 transition-colors">
                  Technology Engine
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-emerald-400 transition-colors">
                  Security Architecture
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-indigo-400 transition-colors">
                  Developer APIs
                </Link>
              </li>
              <li>
                <Link href="/partners" className="hover:text-yellow-400 transition-colors">
                  Banking Partners
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-[var(--footer-fg)] transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--footer-fg)]">Company</div>
            <ul className="space-y-2 text-xs text-[var(--footer-muted)]">
              <li>
                <Link href="/about" className="hover:text-[var(--footer-fg)] transition-colors">
                  About KoriePay
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-[var(--footer-fg)] transition-colors flex items-center gap-1">
                  <span>Careers</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-1 rounded">Hiring</span>
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[var(--footer-fg)] transition-colors">
                  FAQ Desk
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[var(--footer-fg)] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[var(--footer-fg)] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[var(--footer-fg)] transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Regulatory & Institutional Notice */}
        <div className="py-6 border-b border-[var(--border)] text-[11px] text-[var(--footer-muted)] leading-relaxed space-y-2">
          <p>
            <strong className="text-[var(--footer-fg)]">Regulatory & Institutional Notice:</strong> KoriePay is a financial technology infrastructure provider operating in partnership with licensed commercial banks, mobile money operators, and authorized Bureau De Change networks across the Federal Republic of Nigeria and the Republic of Niger. KoriePay technology facilitates transaction routing, terminal management, digital wallets, and automated settlements in strict compliance with applicable central banking frameworks and data privacy standards (NDPR / WAEMU).
          </p>
          <p className="text-[var(--footer-muted)]">
            Hausa: <span className="text-[var(--footer-fg)] italic">&ldquo;Kudinka, Hannunka&rdquo;</span> — Your Money, in Your Hands. Built for inclusive cross-border African commerce.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--footer-muted)]">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} KoriePay Technologies Limited. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={replayPreloader}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--footer-muted)] hover:text-emerald-400 transition-colors"
              title="Replay Brand Experience"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Replay Intro</span>
            </button>
            <ThemeToggle className="items-center p-1.5 bg-[var(--surface-2)] border border-[var(--border)]" />
            <Link href="/privacy" className="hover:text-[var(--footer-fg)] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--footer-fg)] transition-colors">
              Terms
            </Link>
            <Link href="/security" className="hover:text-[var(--footer-fg)] transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
