"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageContext";

interface PortalFooterProps {
  portal: string;
  /** Optional custom additional links e.g. for technical portals. */
  links?: { label: string; href: string }[];
  version?: string;
}

/**
 * Compact, purpose-built footer for authenticated portals.
 *
 * Authenticated banking/operations dashboards do not need the large
 * marketing footer from the public website. This provides a slim,
 * informative bar with essential legal/security links and the portal
 * identity, so internal surfaces remain unobtrusive.
 */
export const PortalFooter: React.FC<PortalFooterProps> = ({
  portal,
  links = [],
  version,
}) => {
  const { t } = useLanguage();

  const defaultLinks = [
    { label: t("public.footer.support") || "Support", href: `/${portal}/support` },
    { label: "Security", href: "/security" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ];
  const shownLinks = links.length ? links : defaultLinks;

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--footer-bg)] px-4 sm:px-6 py-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-xs text-[var(--footer-muted)] sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--footer-fg)]">KORIEPAY</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-semibold uppercase">
            {portal}
          </span>
          <span className="hidden sm:inline text-[var(--footer-muted)]">
            © {new Date().getFullYear()} KoriePay Technologies Limited.
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {shownLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-[var(--footer-fg)]"
            >
              {l.label}
            </Link>
          ))}
          {version && (
            <span className="font-mono text-[10px] text-[var(--footer-muted)]">
              v{version}
            </span>
          )}
        </nav>
      </div>
    </footer>
  );
};

export default PortalFooter;
