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
import { useLanguage } from "../ui/LanguageContext";
import { ThemeToggle } from "../ui/ThemeToggle";

export const Footer: React.FC = () => {
  const { openModal } = useCountry();
  const { theme } = useTheme();
  const { t } = useLanguage();
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
                {t("public.footer.site.newsletterStripBadge")}
              </span>
              <span className="text-xs text-[var(--footer-muted)]">{t("public.footer.site.newsletterStripCorridor")}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--footer-fg)]">
              {t("public.footer.site.newsletterStripHeading")}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--footer-muted)] mt-1">
              {t("public.footer.site.newsletterStripBody")}
            </p>
          </div>

          <form onSubmit={handleNewsletterSubmit} className="w-full lg:w-auto flex-1 max-w-md">
            {newsletterSubscribed ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t("public.footer.site.subscribedThank")}</span>
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
                    placeholder={t("public.footer.site.newsletterPlaceholder")}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-strong)] text-xs text-[var(--footer-fg)] placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={subscribing}
                  className="px-5 py-2.5 rounded-xl btn-korie-primary text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>{t("public.footer.site.subscribe")}</span>
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
              {t("public.footer.site.tagline")}
            </p>

            <div className="pt-2 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-[var(--footer-muted)]">
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t("public.footer.site.nigeriaHq")}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--footer-muted)]">
                <Globe2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{t("public.footer.site.nigerOps")}</span>
              </div>
            </div>
            {/* Live Uptime Status */}
            <div className="pt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-mono text-[var(--footer-fg)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("public.footer.site.networkStatus")}</span>
              <span className="text-emerald-400 font-bold">{t("public.footer.site.networkValue")}</span>
            </div>
          </div>

          {/* Solutions Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--footer-fg)]">
              {t("public.footer.site.solutionsHeading")}
            </div>
            <ul className="space-y-2 text-xs text-[var(--footer-muted)]">
              <li>
                <Link href="/solutions/agency-banking" className="hover:text-emerald-400 transition-colors">
                  {t("public.footer.site.solutionsAgency")}
                </Link>
              </li>
              <li>
                <Link href="/solutions/bdc-fx" className="hover:text-amber-400 transition-colors">
                  {t("public.footer.site.solutionsFx")}
                </Link>
              </li>
              <li>
                <Link href="/solutions/customers" className="hover:text-teal-400 transition-colors">
                  {t("public.footer.site.solutionsWallet")}
                </Link>
              </li>
              <li>
                <Link href="/solutions/business" className="hover:text-blue-400 transition-colors">
                  {t("public.footer.site.solutionsBusiness")}
                </Link>
              </li>
              <li>
                <Link href="/solutions/merchant" className="hover:text-orange-400 transition-colors">
                  {t("public.footer.site.solutionsMerchant")}
                </Link>
              </li>
              <li>
                <Link href="/solutions/payments" className="hover:text-emerald-400 transition-colors">
                  {t("public.footer.site.solutionsRails")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Markets Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--footer-fg)]">
              {t("public.footer.site.marketsHeading")}
            </div>
            <ul className="space-y-2 text-xs text-[var(--footer-muted)]">
              <li>
                <Link href="/nigeria" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>{t("public.footer.site.marketNigeria")}</span>
                </Link>
              </li>
              <li>
                <Link href="/niger-republic" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                  <span>{t("public.footer.site.marketNiger")}</span>
                </Link>
              </li>
              <li>
                <Link href="/solutions/payments" className="hover:text-[var(--footer-fg)] transition-colors">
                  {t("public.footer.site.corridorKanoMaradi")}
                </Link>
              </li>
              <li>
                <Link href="/solutions/payments" className="hover:text-[var(--footer-fg)] transition-colors">
                  {t("public.footer.site.corridorLagosNiamey")}
                </Link>
              </li>
              <li>
                <Link href="/solutions/payments" className="hover:text-[var(--footer-fg)] transition-colors">
                  {t("public.footer.site.corridorSokotoBirni")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Infrastructure Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--footer-fg)]">
              {t("public.footer.site.infraHeading")}
            </div>
            <ul className="space-y-2 text-xs text-[var(--footer-muted)]">
              <li>
                <Link href="/technology" className="hover:text-teal-400 transition-colors">
                  {t("public.footer.site.infraEngine")}
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-emerald-400 transition-colors">
                  {t("public.footer.site.infraSecurity")}
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-indigo-400 transition-colors">
                  {t("public.footer.site.infraDev")}
                </Link>
              </li>
              <li>
                <Link href="/partners" className="hover:text-yellow-400 transition-colors">
                  {t("public.footer.site.infraPartners")}
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-[var(--footer-fg)] transition-colors">
                  {t("public.footer.site.infraDocs")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--footer-fg)]">
              {t("public.footer.site.companyHeading")}
            </div>
            <ul className="space-y-2 text-xs text-[var(--footer-muted)]">
              <li>
                <Link href="/about" className="hover:text-[var(--footer-fg)] transition-colors">
                  {t("public.footer.site.companyAbout")}
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-[var(--footer-fg)] transition-colors flex items-center gap-1">
                  <span>{t("public.footer.site.companyCareers")}</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-1 rounded">{t("public.footer.site.hiring")}</span>
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[var(--footer-fg)] transition-colors">
                  {t("public.footer.site.companyFaq")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[var(--footer-fg)] transition-colors">
                  {t("public.footer.site.companyContact")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[var(--footer-fg)] transition-colors">
                  {t("public.footer.site.companyPrivacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[var(--footer-fg)] transition-colors">
                  {t("public.footer.site.companyTerms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Regulatory & Institutional Notice */}
        <div className="py-6 border-b border-[var(--border)] text-[11px] text-[var(--footer-muted)] leading-relaxed space-y-2">
          <p>
            <strong className="text-[var(--footer-fg)]">{t("public.footer.site.noticeLabel")}</strong> {t("public.footer.site.noticeBody")}
          </p>
          <p className="text-[var(--footer-muted)]">
            Hausa: <span dangerouslySetInnerHTML={{ __html: t("public.footer.site.hausaLine") }} />
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--footer-muted)]">
          <div className="flex items-center gap-2">
            <span>{t("public.footer.site.copyright", { year: new Date().getFullYear() })}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={replayPreloader}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--footer-muted)] hover:text-emerald-400 transition-colors"
              title="Replay Brand Experience"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t("public.footer.site.replayIntro")}</span>
            </button>
            <ThemeToggle className="items-center p-1.5 bg-[var(--surface-2)] border border-[var(--border)]" />
            <Link href="/privacy" className="hover:text-[var(--footer-fg)] transition-colors">
              {t("public.footer.site.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-[var(--footer-fg)] transition-colors">
              {t("public.footer.site.terms")}
            </Link>
            <Link href="/security" className="hover:text-[var(--footer-fg)] transition-colors">
              {t("public.footer.site.infraSecurity")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
