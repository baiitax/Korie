"use client";

/**
 * Merchant console — chrome aligned to the Super Admin console (master spec v1):
 * shared ConsoleShell (floating collapsible rail, glass top bar, mobile dock +
 * More sheet) with merchant-specific context (branch switcher, balance privacy,
 * language) carried in the standard slots.
 */
import React, { useState } from "react";
import Link from "next/link";
import { useMerchant } from "../MerchantContext";
import { useAuth } from "@/components/auth/AuthContext";
import ConsoleShell from "@/components/console/ConsoleShell";
import ConsoleTopBar from "@/components/console/ConsoleTopBar";
import ConsoleMobileNav from "@/components/console/ConsoleMobileNav";
import ConsoleCommandPalette from "@/components/console/ConsoleCommandPalette";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Users,
  Building2,
  FileSpreadsheet,
  BarChart3,
  Code2,
  LifeBuoy,
  Settings,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Coins,
  ArrowRightLeft,
  WifiOff,
} from "lucide-react";

export const MerchantShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    merchant,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    isBalanceHidden,
    toggleHideBalance,
    language,
    setLanguage,
    isOffline,
    t,
    notificationsCount,
    disputes,
    invoices,
    settlementBatches,
  } = useMerchant();
  const { logout } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const desktopNavGroups = [
    {
      title: "COMMAND CENTER",
      items: [{ label: "Executive Dashboard", href: "/merchant", icon: LayoutDashboard }],
    },
    {
      title: "COMMERCE & PAYMENTS",
      items: [
        { label: t("common.viewTransactions"), href: "/merchant/payments", icon: CreditCard },
        { label: t("common.createLink"), href: "/merchant/payment-links", icon: LinkIcon },
        { label: t("common.invoices"), href: "/merchant/invoices", icon: FileText },
        { label: t("common.customers"), href: "/merchant/customers", icon: Users },
      ],
    },
    {
      title: "FINANCIAL & SETTLEMENTS",
      items: [
        { label: "Merchant Wallet", href: "/merchant/wallet", icon: Coins },
        { label: t("common.settlements"), href: "/merchant/settlements", icon: FileSpreadsheet },
        { label: t("common.reconciliation"), href: "/merchant/reconciliation", icon: ArrowRightLeft },
        { label: t("common.analytics"), href: "/merchant/analytics", icon: BarChart3 },
        { label: t("common.reports"), href: "/merchant/reports", icon: FileSpreadsheet },
      ],
    },
    {
      title: "ORGANIZATION & APIS",
      items: [
        { label: t("common.branches"), href: "/merchant/branches", icon: Building2 },
        { label: t("common.team"), href: "/merchant/team", icon: Users },
        { label: t("common.developers"), href: "/merchant/developers", icon: Code2 },
        { label: t("common.support"), href: "/merchant/support", icon: LifeBuoy },
        { label: t("common.settings"), href: "/merchant/settings", icon: Settings },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    await logout();
  };

  const openDisputes = disputes.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW");
  const unpaidInvoices = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE");
  const pendingSettlements = settlementBatches.filter((b) => b.status === "PENDING" || b.status === "PROCESSING");

  const initials = (merchant.businessName || "M").trim().slice(0, 2).toUpperCase();

  return (
    <>
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Network: Checkout processing paused for connection safety.</span>
        </div>
      )}

      <ConsoleShell
        rail={{
          tone: "teal",
          word: "KoriePay Merchant",
          role: "MERCHANT OPS",
          storeKey: "korie_merchant_rail",
          settingsHref: "/merchant/settings",
          onLogout: handleLogout,
          groups: desktopNavGroups.map((g) => ({
            title: g.title,
            items: g.items.map((it) => ({ label: it.label, href: it.href, icon: it.icon })),
          })),
          primary: [
            "/merchant",
            "/merchant/payments",
            "/merchant/payment-links",
            "/merchant/invoices",
            "/merchant/customers",
            "/merchant/wallet",
            "/merchant/settlements",
            "/merchant/analytics",
            "/merchant/settings",
          ],
          context: (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                Active Store / Branch
              </p>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              >
                <option value="ALL">🏢 All Stores (HQ Summary)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>
          ),
          footer: (
            <div className="flex items-center justify-between gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 flex items-center justify-center text-[10px] font-extrabold">
                  {initials}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-[var(--foreground)] truncate">
                    {merchant.businessName}
                  </span>
                  <span className="block text-[9px] font-mono uppercase tracking-wide text-[var(--brand-primary)] truncate">
                    Providus • {merchant.settlementAccountMasked}
                  </span>
                </span>
              </span>
              <Link href="/" className="shrink-0 text-[9px] font-mono text-[var(--brand-primary)] hover:underline">
                Site ↗
              </Link>
            </div>
          ),
        }}
        topbar={
          <ConsoleTopBar
            searchPlaceholder="Search payments, invoices, customers (e.g. INV-2026)..."
            onSearch={() => setPaletteOpen(true)}
            statusChip={
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border bg-teal-500/10 text-teal-300 border-teal-500/30">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span>{merchant.tier}</span>
              </span>
            }
            extras={
              <>
                <button
                  onClick={toggleHideBalance}
                  className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition-colors"
                  title={isBalanceHidden ? "Show balances" : "Hide balances"}
                  aria-label={isBalanceHidden ? "Show balances" : "Hide balances"}
                >
                  {isBalanceHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold font-mono">
                  {(["en", "ha", "fr"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-2.5 py-1.5 rounded-lg uppercase transition-all ${
                        language === lang ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </>
            }
            notifications={{
              count: notificationsCount,
              title: "Merchant Alerts",
              emptyText: "No open disputes, unpaid invoices or pending settlements.",
              items: [
                ...openDisputes.slice(0, 2).map((d) => ({
                  id: d.id,
                  title: `Dispute ${d.id}`,
                  body: `${d.reason || "Chargeback"} · ₦${Number(d.amount || 0).toLocaleString()}`,
                  tone: "rose" as const,
                })),
                ...unpaidInvoices.slice(0, 2).map((i) => ({
                  id: i.id,
                  title: `Invoice ${i.invoiceNumber || i.id} ${i.status}`,
                  body: `${i.customerName || "Customer"} · ₦${Number(i.total || 0).toLocaleString()}`,
                  tone: "amber" as const,
                })),
                ...pendingSettlements.slice(0, 2).map((b) => ({
                  id: b.id,
                  title: `Settlement ${b.batchReference || b.id} pending`,
                  body: `₦${Number(b.netAmount || 0).toLocaleString()} · ${b.status}`,
                  tone: "sky" as const,
                })),
              ],
            }}
            user={{ name: merchant.businessName, role: merchant.tier }}
            onLogout={handleLogout}
          />
        }
        mobileNav={
          <ConsoleMobileNav
            dockItems={[
              { label: "Dashboard", href: "/merchant", icon: LayoutDashboard },
              { label: "Payments", href: "/merchant/payments", icon: CreditCard },
              { label: "Invoices", href: "/merchant/invoices", icon: FileText },
              { label: "Analytics", href: "/merchant/analytics", icon: BarChart3 },
            ]}
            groups={desktopNavGroups.map((g) => ({
              title: g.title,
              items: g.items.map((it) => ({ label: it.label, href: it.href, icon: it.icon })),
            }))}
            title="All Merchant Sections"
            subtitle="MERCHANT OPS · COMMERCE & SETTLEMENTS"
            onLogout={handleLogout}
          />
        }
        mainClassName="flex-1 w-full max-w-6xl mx-auto pb-28 lg:pb-10"
        overlays={
          <ConsoleCommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            placeholder="Jump to a merchant section, invoice or payment..."
            groups={[
              {
                title: "Merchant destinations",
                items: desktopNavGroups.flatMap((g) =>
                  g.items.map((it) => ({ label: it.label, sub: it.href, href: it.href })),
                ),
              },
              {
                title: "Invoices (live)",
                items: invoices.slice(0, 8).map((i) => ({
                  label: `${i.invoiceNumber || i.id} · ${i.customerName || "Customer"}`,
                  sub: `${i.status} · ₦${Number(i.total || 0).toLocaleString()}`,
                  href: "/merchant/invoices",
                })),
              },
            ]}
            emptyText="No merchant destination matches"
          />
        }
      >
        {children}
      </ConsoleShell>
    </>
  );
};

export default MerchantShell;
