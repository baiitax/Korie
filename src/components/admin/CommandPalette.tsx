"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "./AdminContext";

/**
 * CommandPalette — the Ctrl/Cmd+K global navigator.
 *
 * Static destination list (routes that exist) + typed commands. Search hits
 * filter destinations by label; Enter navigates. Escape closes (the keydown
 * handler is registered by AdminContext). This is navigation only — it does
 * not query live records yet; wiring server-side record search (customer by
 * phone, transaction by reference) is a later phase and will be added behind
 * this same surface.
 */

interface PaletteEntry {
  label: string;
  hint: string;
  href: string;
}

const DESTINATIONS: PaletteEntry[] = [
  { label: "Dashboard", hint: "Command center", href: "/admin" },
  { label: "Transactions", hint: "Operations", href: "/admin/transactions" },
  { label: "Transfers (NIP/CFA)", hint: "Operations", href: "/admin/transfers" },
  { label: "Customers", hint: "Operations", href: "/admin/customers" },
  { label: "KYC / KYB Review", hint: "Compliance queue", href: "/admin/kyc" },
  { label: "Agents & POS", hint: "Agency", href: "/admin/agents" },
  { label: "Merchants", hint: "Agency", href: "/admin/merchants" },
  { label: "BDC / FX Desks", hint: "Agency", href: "/admin/bdc" },
  { label: "Adashi / Ajo (ROSCA)", hint: "Customers", href: "/admin/adashi" },
  { label: "Wallets Control", hint: "Finance", href: "/admin/wallets" },
  { label: "Immutable Ledger", hint: "Finance", href: "/admin/ledger" },
  { label: "Settlements", hint: "Finance", href: "/admin/settlements" },
  { label: "Reconciliation", hint: "Finance", href: "/admin/reconciliation" },
  { label: "Treasury & Liquidity", hint: "Finance", href: "/admin/treasury" },
  { label: "FX Rates Engine", hint: "Finance", href: "/admin/fx" },
  { label: "Risk & Fraud Monitor", hint: "Compliance", href: "/admin/risk" },
  { label: "Compliance Console", hint: "Compliance", href: "/admin/compliance" },
  { label: "Disputes & Claims", hint: "Support", href: "/admin/disputes" },
  { label: "Banking Nodes", hint: "Infrastructure", href: "/admin/banking-nodes" },
  { label: "System Health", hint: "Infrastructure", href: "/admin/system-health" },
  { label: "APIs & Logs", hint: "Infrastructure", href: "/admin/apis" },
  { label: "Webhooks Dispatcher", hint: "Infrastructure", href: "/admin/webhooks" },
  { label: "Support Tickets", hint: "Support", href: "/admin/support" },
  { label: "Security & Sessions", hint: "Security", href: "/admin/security" },
  { label: "Immutable Audit Log", hint: "Security", href: "/admin/audit" },
  { label: "Team & Roles", hint: "Security", href: "/admin/team" },
  { label: "AI & Decision Intel", hint: "Intelligence", href: "/admin/intelligence" },
  { label: "Reports Builder", hint: "Intelligence", href: "/admin/reports" },
  { label: "Platform Settings", hint: "System", href: "/admin/settings" },
];

export const CommandPalette: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen } = useAdmin();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DESTINATIONS.slice(0, 10);
    return DESTINATIONS.filter((d) => `${d.label} ${d.hint}`.toLowerCase().includes(q)).slice(0, 10);
  }, [query]);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery("");
      setCursor(0);
      // Focus after the dialog mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const go = (href: string) => {
    setIsSearchOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsSearchOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[cursor];
      if (hit) go(hit.href);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[var(--z-modal,50)] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSearchOpen(false);
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search destinations — transactions, KYC, reconciliation…"
            aria-label="Search admin destinations"
            className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)]"
          />
          <kbd className="rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--foreground-muted)]">
            ESC
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-[var(--foreground-muted)]">
              No destination matches “{query}”. Record search (customers, transactions by reference) arrives with the
              data phases.
            </li>
          )}
          {results.map((d, i) => (
            <li key={d.href} role="option" aria-selected={i === cursor}>
              <button
                type="button"
                onClick={() => go(d.href)}
                onMouseEnter={() => setCursor(i)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors ${
                  i === cursor ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]" : "text-[var(--foreground)]"
                }`}
              >
                <span className="font-semibold">{d.label}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--foreground-muted)]">
                  {d.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
