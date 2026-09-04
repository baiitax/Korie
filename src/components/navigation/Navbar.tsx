"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCountry } from "../ui/CountryContext";
import { useTheme } from "../ui/ThemeContext";
import { ThemeToggle } from "../ui/ThemeToggle";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { useLanguage } from "../ui/LanguageContext";
import { UserMenu } from "../auth/UserMenu";
import { useAuth } from "../auth/AuthContext";
import KorieLogo from "../brand/KorieLogo";
import {
  ChevronDown,
  Building2,
  Repeat2,
  Users,
  Briefcase,
  CreditCard,
  Globe2,
  Code2,
  ShieldCheck,
  Search,
  Menu,
  X,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers,
  HelpCircle,
  BookOpen,
  LogOut,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { country, setCountry, openModal, setIsSearchOpen } = useCountry();
  const { theme } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { t } = useLanguage();
  const LANG_OPTIONS: { code: "en" | "fr" | "ha"; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "fr", label: "FR" },
    { code: "ha", label: "HA" },
  ];
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "glass-nav py-3"
            : "bg-gradient-to-b from-[var(--nav-bg)] to-transparent py-4 sm:py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <KorieLogo
                variant="full"
                theme={theme === "light" ? "light" : "dark"}
                height={34}
                className="transform transition-transform hover:scale-[1.02]"
              />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {/* Solutions Mega Menu */}
              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown("solutions")}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    activeDropdown === "solutions" || pathname?.startsWith("/solutions")
                      ? "text-[var(--brand-primary-active)] bg-[var(--brand-soft-strong)]"
                      : "text-[var(--nav-fg)] hover:text-[var(--nav-fg)] hover:bg-[var(--surface-2)]"
                  }`}
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === "solutions"}
                  aria-current={pathname?.startsWith("/solutions") ? "page" : undefined}
                >
                  {t("public.nav.solutions")}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeDropdown === "solutions" ? "rotate-180 text-[var(--brand-primary)]" : "text-[var(--nav-muted)]"
                    }`}
                  />
                </button>

                {/* Dropdown panel */}
                {activeDropdown === "solutions" && (
                  <div className="absolute top-full left-0 w-[580px] p-4 glass-03 rounded-2xl animate-fadeIn">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/solutions/agency-banking"
                        className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-emerald-500/20 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-[var(--brand-primary-active)] transition-colors">
                              {t("public.nav.menu.agencyTitle")}
                            </span>
                            <span className="block text-[10px] text-[var(--nav-muted)]">
                              {t("public.nav.menu.agencyDesc")}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/solutions/bdc-fx"
                        className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-amber-500/20 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                            <Repeat2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-amber-400 transition-colors">
                              {t("public.nav.menu.fxdTitle")}
                            </span>
                            <span className="block text-[10px] text-[var(--nav-muted)]">
                              {t("public.nav.menu.fxdDesc")}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/solutions/customers"
                        className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-teal-500/20 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-teal-400 transition-colors">
                              {t("public.nav.menu.customersTitle")}
                            </span>
                            <span className="block text-[10px] text-[var(--nav-muted)]">
                              {t("public.nav.menu.customersDesc")}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/solutions/business"
                        className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-blue-500/20 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-slate-950 transition-colors">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-blue-400 transition-colors">
                              {t("public.nav.menu.businessTitle")}
                            </span>
                            <span className="block text-[10px] text-[var(--nav-muted)]">
                              {t("public.nav.menu.businessDesc")}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/solutions/merchant"
                        className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-orange-500/20 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-slate-950 transition-colors">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-orange-400 transition-colors">
                              {t("public.nav.menu.merchantTitle")}
                            </span>
                            <span className="block text-[10px] text-[var(--nav-muted)]">
                              {t("public.nav.menu.merchantDesc")}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/solutions/payments"
                        className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-emerald-500/20 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                            <Globe2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-[var(--brand-primary-active)] transition-colors">
                              {t("public.nav.menu.railsTitle")}
                            </span>
                            <span className="block text-[10px] text-[var(--nav-muted)]">
                              {t("public.nav.menu.railsDesc")}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] text-[var(--nav-fg)]">
                          {t("public.nav.menu.connectivityQ")}
                        </span>
                      </div>
                      <Link
                        href="/solutions"
                        className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary-active)] font-semibold flex items-center gap-1"
                      >
                        {t("public.nav.menu.viewAll")} <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Markets */}
              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown("markets")}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    activeDropdown === "markets" || pathname === "/nigeria" || pathname === "/niger-republic"
                      ? "text-[var(--brand-primary-active)] bg-[var(--brand-soft-strong)]"
                      : "text-[var(--nav-fg)] hover:text-[var(--nav-fg)] hover:bg-[var(--surface-2)]"
                  }`}
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === "markets"}
                  aria-current={pathname === "/nigeria" || pathname === "/niger-republic" ? "page" : undefined}
                >
                  {t("public.nav.markets")}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeDropdown === "markets" ? "rotate-180 text-[var(--brand-primary)]" : "text-[var(--nav-muted)]"
                    }`}
                  />
                </button>

                {activeDropdown === "markets" && (
                  <div className="absolute top-full left-0 w-[420px] p-3 glass-03 rounded-2xl animate-fadeIn">
                    <Link
                      href="/nigeria"
                      className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-emerald-500/20 transition-all flex items-start gap-3 group"
                    >
                      <div className="text-xl">🇳🇬</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-[var(--brand-primary-active)]">
                            {t("public.nav.menu.nigeriaTitle")}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded">
                            {t("public.nav.menu.nigeriaBadge")}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--nav-muted)] mt-0.5">
                          {t("public.nav.menu.nigeriaDesc")}
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/niger-republic"
                      className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-amber-500/20 transition-all flex items-start gap-3 group mt-1"
                    >
                      <div className="text-xl">🇳🇪</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-amber-400">
                            {t("public.nav.menu.nigerTitle")}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/10 text-amber-400 rounded">
                            {t("public.nav.menu.nigerBadge")}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--nav-muted)] mt-0.5">
                          {t("public.nav.menu.nigerDesc")}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Technology & Security */}
              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown("tech")}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    activeDropdown === "tech" || pathname === "/technology" || pathname === "/security" || pathname === "/developers"
                      ? "text-[var(--brand-primary-active)] bg-[var(--brand-soft-strong)]"
                      : "text-[var(--nav-fg)] hover:text-[var(--nav-fg)] hover:bg-[var(--surface-2)]"
                  }`}
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === "tech"}
                  aria-current={pathname === "/technology" || pathname === "/security" || pathname === "/developers" ? "page" : undefined}
                >
                  {t("public.nav.technology")}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeDropdown === "tech" ? "rotate-180 text-[var(--brand-primary)]" : "text-[var(--nav-muted)]"
                    }`}
                  />
                </button>

                {activeDropdown === "tech" && (
                  <div className="absolute top-full left-0 w-[420px] p-3 glass-03 rounded-2xl animate-fadeIn">
                    <Link
                      href="/technology"
                      className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-teal-500/20 transition-all flex items-start gap-3 group"
                    >
                      <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-teal-400">
                          {t("public.nav.menu.infraTitle")}
                        </span>
                        <p className="text-[11px] text-[var(--nav-muted)] mt-0.5">
                          {t("public.nav.menu.infraDesc")}
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/security"
                      className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-emerald-500/20 transition-all flex items-start gap-3 group mt-1"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-[var(--brand-primary-active)]">
                          {t("public.nav.menu.securityTitle")}
                        </span>
                        <p className="text-[11px] text-[var(--nav-muted)] mt-0.5">
                          {t("public.nav.menu.securityDesc")}
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/developers"
                      className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-indigo-500/20 transition-all flex items-start gap-3 group mt-1"
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-slate-950 transition-colors">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-indigo-400">
                          {t("public.nav.menu.devTitle")}
                        </span>
                        <p className="text-[11px] text-[var(--nav-muted)] mt-0.5">
                          {t("public.nav.menu.devDesc")}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Company */}
              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown("company")}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    activeDropdown === "company" ||
                    pathname === "/about" ||
                    pathname === "/partners" ||
                    pathname === "/careers" ||
                    pathname === "/resources" ||
                    pathname === "/faq"
                      ? "text-[var(--brand-primary-active)] bg-[var(--brand-soft-strong)]"
                      : "text-[var(--nav-fg)] hover:text-[var(--nav-fg)] hover:bg-[var(--surface-2)]"
                  }`}
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === "company"}
                  aria-current={
                    pathname === "/about" || pathname === "/partners" || pathname === "/careers" || pathname === "/resources" || pathname === "/faq"
                      ? "page"
                      : undefined
                  }
                >
                  {t("public.nav.company")}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeDropdown === "company" ? "rotate-180 text-[var(--brand-primary)]" : "text-[var(--nav-muted)]"
                    }`}
                  />
                </button>

                {activeDropdown === "company" && (
                  <div className="absolute top-full right-0 w-[420px] p-3 glass-03 rounded-2xl animate-fadeIn">
                    <Link
                      href="/about"
                      className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-slate-500/20 transition-all flex items-start gap-3 group"
                    >
                      <div className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--nav-fg)] group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-[var(--brand-primary-active)]">
                          {t("public.nav.menu.aboutTitle")}
                        </span>
                        <p className="text-[11px] text-[var(--nav-muted)] mt-0.5">
                          {t("public.nav.menu.aboutDesc")}
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/partners"
                      className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-amber-500/20 transition-all flex items-start gap-3 group mt-1"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-amber-400">
                          {t("public.nav.menu.partnersTitle")}
                        </span>
                        <p className="text-[11px] text-[var(--nav-muted)] mt-0.5">
                          {t("public.nav.menu.partnersDesc")}
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/resources"
                      className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-teal-500/20 transition-all flex items-start gap-3 group mt-1"
                    >
                      <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-teal-400">
                          {t("public.nav.menu.resourcesTitle")}
                        </span>
                        <p className="text-[11px] text-[var(--nav-muted)] mt-0.5">
                          {t("public.nav.menu.resourcesDesc")}
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/faq"
                      className="p-3 rounded-xl hover:bg-[var(--surface-2)] border border-transparent hover:border-purple-500/20 transition-all flex items-start gap-3 group mt-1"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-slate-950 transition-colors">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--nav-fg)] group-hover:text-purple-400">
                          {t("public.nav.menu.faqTitle")}
                        </span>
                        <p className="text-[11px] text-[var(--nav-muted)] mt-0.5">
                          {t("public.nav.menu.faqDesc")}
                        </p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Direct Contact Link */}
              <Link
                href="/contact"
                aria-current={pathname === "/contact" ? "page" : undefined}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  pathname === "/contact"
                    ? "text-[var(--brand-primary-active)] bg-[var(--brand-soft-strong)]"
                    : "text-[var(--nav-fg)] hover:text-[var(--nav-fg)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {t("public.nav.contact")}
              </Link>
            </nav>

            {/* Right Action Bar */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--nav-muted)] hover:text-[var(--nav-fg)] hover:border-[var(--border-strong)] transition-all text-xs"
                title="Search (Cmd+K)"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline text-[11px]">Search</span>
                <kbd className="hidden md:inline px-1 py-0.5 text-[9px] font-mono bg-[var(--surface-2)] text-[var(--nav-muted)] rounded border border-[var(--border)]">
                  ⌘K
                </kbd>
              </button>

              {/* Country Selector Toggle */}
              <div className="hidden sm:flex items-center p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs">
                <button
                  onClick={() => setCountry("nigeria")}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    country === "nigeria"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-[var(--nav-muted)] hover:text-[var(--nav-fg)]"
                  }`}
                  title="Filter context for Nigeria (NGN ₦)"
                >
                  🇳🇬 NG
                </button>
                <button
                  onClick={() => setCountry("niger")}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    country === "niger"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-[var(--nav-muted)] hover:text-[var(--nav-fg)]"
                  }`}
                  title="Filter context for Niger Republic (XOF CFA)"
                >
                  🇳🇪 NE
                </button>
                <button
                  onClick={() => setCountry("cross-border")}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    country === "cross-border"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "text-[var(--nav-muted)] hover:text-[var(--nav-fg)]"
                  }`}
                  title="Cross-border corridor overview"
                >
                  🌍 {t("public.nav.menu.bothShort")}
                </button>
              </div>

              {/* Language Switcher (EN / HA / FR) — persistent, instantly accessible */}
              <LanguageSwitcher compact className="flex" />

              {/* Day / Night Theme Toggle */}
              <ThemeToggle className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--nav-muted)] hover:text-[var(--nav-fg)] hover:border-[var(--border-strong)]" />

              {/* Login / Account Menu */}
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => openModal("login")}
                  className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-[var(--nav-fg)] hover:text-[var(--nav-fg)] hover:bg-[var(--surface-2)] rounded-xl border border-transparent hover:border-[var(--border)] transition-colors"
                >
                  {t("public.nav.login")}
                </button>
              )}

              {/* Primary CTA */}
              <button
                onClick={() => openModal("agent")}
                data-open-agent
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl btn-korie-primary text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
              >
                <span>{t("public.nav.getStarted")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--nav-fg)] hover:text-[var(--nav-fg)] hover:border-[var(--border-strong)] transition-colors"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden pt-20 pb-8 px-4 glass-modal overflow-y-auto animate-fadeIn">
          <div className="max-w-md mx-auto space-y-6">
            {/* Country Selector in Mobile */}
            <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-[11px] font-semibold text-[var(--nav-muted)] uppercase tracking-wider mb-2">
                {t("public.nav.menu.corridorHeading")}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCountry("nigeria")}
                  className={`p-2 rounded-xl text-xs font-medium text-center transition-all ${
                    country === "nigeria"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-[var(--surface-2)] text-[var(--nav-muted)]"
                  }`}
                >
                  🇳🇬 {t("public.nav.menu.nigeriaShort")}
                </button>
                <button
                  onClick={() => setCountry("niger")}
                  className={`p-2 rounded-xl text-xs font-medium text-center transition-all ${
                    country === "niger"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-[var(--surface-2)] text-[var(--nav-muted)]"
                  }`}
                >
                  🇳🇪 {t("public.nav.menu.nigerShort")}
                </button>
                <button
                  onClick={() => setCountry("cross-border")}
                  className={`p-2 rounded-xl text-xs font-medium text-center transition-all ${
                    country === "cross-border"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-[var(--surface-2)] text-[var(--nav-muted)]"
                  }`}
                >
                  🌍 {t("public.nav.menu.bothShort")}
                </button>
              </div>
            </div>

            {/* Language Selector (EN / FR / HA) — accessible on mobile/tablet */}
            <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-[11px] font-semibold text-[var(--nav-muted)] uppercase tracking-wider mb-2">
                {t("public.nav.menu.languageHeading")}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => setLanguage(opt.code)}
                    aria-pressed={language === opt.code}
                    className={`min-h-[44px] rounded-xl text-xs font-semibold text-center transition-all ${
                      language === opt.code
                        ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)] border border-[var(--accent-border)]"
                        : "bg-[var(--surface-2)] text-[var(--nav-muted)] hover:text-[var(--nav-fg)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Solutions List */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-[var(--nav-muted)] uppercase tracking-wider px-3 mb-2">
                {t("public.nav.menu.solutionsHeading")}
              </div>
              <Link
                href="/solutions/agency-banking"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] text-[var(--nav-fg)]"
              >
                <Building2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-sm font-semibold text-[var(--nav-fg)]">{t("public.nav.menu.agencyTitle")}</div>
                  {t("public.nav.menu.agencyDrawerDesc")}
                </div>
              </Link>
              <Link
                href="/solutions/bdc-fx"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] text-[var(--nav-fg)]"
              >
                <Repeat2 className="w-5 h-5 text-amber-400" />
                <div>
                  {t("public.nav.menu.fxDrawerTitle")}
                  {t("public.nav.menu.fxDrawerDesc")}
                </div>
              </Link>
              <Link
                href="/solutions/customers"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] text-[var(--nav-fg)]"
              >
                <Users className="w-5 h-5 text-teal-400" />
                <div>
                  <div className="text-sm font-semibold text-[var(--nav-fg)]">{t("public.nav.menu.customersTitle")}</div>
                  {t("public.nav.menu.customersDrawerDesc")}
                </div>
              </Link>
              <Link
                href="/solutions/business"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] text-[var(--nav-fg)]"
              >
                <Briefcase className="w-5 h-5 text-blue-400" />
                <div>
                  {t("public.nav.menu.businessDrawerTitle")}
                  {t("public.nav.menu.businessDrawerDesc")}
                </div>
              </Link>
              <Link
                href="/solutions/merchant"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] text-[var(--nav-fg)]"
              >
                <CreditCard className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-sm font-semibold text-[var(--nav-fg)]">{t("public.nav.menu.merchantTitle")}</div>
                  {t("public.nav.menu.merchantDrawerDesc")}
                </div>
              </Link>
              <Link
                href="/solutions/payments"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-2)] text-[var(--nav-fg)]"
              >
                <Globe2 className="w-4 h-4 text-emerald-400" />
                <div>
                  {t("public.nav.menu.railsDrawerTitle")}
                  <div className="text-xs text-[var(--nav-muted)]">{t("public.nav.menu.railsDesc")}</div>
                </div>
              </Link>
            </div>

            {/* Markets & Infrastructure */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-[var(--nav-muted)] uppercase tracking-wider px-3 mb-2">
                {t("public.nav.menu.marketsHeading")}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/nigeria"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-500/30 text-xs font-semibold text-[var(--nav-fg)]"
                >
                  🇳🇬 {t("public.nav.menu.nigeriaDrawerLabel")}
                </Link>
                <Link
                  href="/niger-republic"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500/30 text-xs font-semibold text-[var(--nav-fg)]"
                >
                  🇳🇪 {t("public.nav.menu.nigerDrawerLabel")}
                </Link>
                <Link
                  href="/technology"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-teal-500/30 text-xs font-semibold text-[var(--nav-fg)]"
                >
                  ⚙️ {t("public.nav.menu.techDrawerLabel")}
                </Link>
                <Link
                  href="/security"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-500/30 text-xs font-semibold text-[var(--nav-fg)]"
                >
                  🔒 {t("public.nav.menu.securityDrawerLabel")}
                </Link>
                <Link
                  href="/developers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-indigo-500/30 text-xs font-semibold text-[var(--nav-fg)]"
                >
                  💻 {t("public.nav.menu.devDrawerLabel")}
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-slate-500/30 text-xs font-semibold text-[var(--nav-fg)]"
                >
                  🏢 {t("public.nav.menu.aboutTitle")}
                </Link>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openModal("login");
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--surface-2)] text-[var(--nav-fg)] font-semibold text-xs border border-[var(--border)]"
              >
                <span>
                  {isAuthenticated ? t("public.nav.menu.dashboardLabel") : t("public.nav.menu.signInPortal")}
                </span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openModal("agent");
                }}
                className="w-full py-3.5 rounded-xl btn-korie-primary text-slate-950 font-bold text-xs"
              >
                {t("public.nav.menu.becomeAgent")}
              </button>

              {/* Day / Night + Logout */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <ThemeToggle className="flex items-center justify-center gap-1.5 py-3.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--nav-muted)] hover:text-[var(--nav-fg)]" label />
                {isAuthenticated && (
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      try {
                        await fetch("/api/auth/logout", { method: "POST" });
                      } catch { /* noop */ }
                      await logout();
                    }}
                    className="flex items-center justify-center gap-1.5 py-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("public.nav.menu.logOut")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
