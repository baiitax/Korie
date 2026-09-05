"use client";

import React, { useEffect, useState } from "react";
import { useCustomer } from "../CustomerContext";

/**
 * CustomerGreeting — the top of every mobile page's hierarchy (§4 / §6 / §7).
 *
 *     Good morning, Ibrahim
 *     Your finances at a glance
 *
 * Three things this deliberately does not do:
 *  • it never invents a name. While the profile is loading it renders the
 *    skeleton line, because "Good morning, Customer" is a placeholder pretending
 *    to be personalisation;
 *  • no weather, no quotes, no "how are you today" filler. The directive's §4
 *    rhythm is greeting → balance → actions, and every extra line between them
 *    pushes the money down the screen;
 *  • no emoji in a banking header. The reference uses an avatar; the avatar is
 *    already in the header, so this stays two lines of text.
 *
 * The time of day is read once per mount and only used to pick between the three
 * existing translations — it is never used to render an unformatted date.
 */
export const CustomerGreeting: React.FC<{
  trailing?: React.ReactNode;
  /** Pages that already show the name in the header can drop the subtitle. */
  compact?: boolean;
  className?: string;
}> = ({ trailing, compact = false, className = "" }) => {
  const { customer, t } = useCustomer();
  // The server clock is not the customer's clock. Reading the hour at render
  // time is the classic hydration mismatch (SSR says "Good morning", the
  // browser says "Good afternoon") and React pays for it by re-rendering the
  // subtree. Read it after mount; the neutral afternoon copy holds the line.
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    setHour(new Date().getHours());
  }, []);
  const resolvedHour = hour ?? 12;
  const greetingKey =
    resolvedHour < 12
      ? "dashboard.greetingMorning"
      : resolvedHour < 17
        ? "dashboard.greetingAfternoon"
        : "dashboard.greetingEvening";

  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-2xl">
          {customer ? (
            <>
              {t(greetingKey)}, {customer.firstName}
            </>
          ) : (
            <span className="inline-block h-6 w-44 animate-pulse rounded-lg bg-[var(--surface-3)] align-middle" />
          )}
        </h1>
        {!compact && (
          <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">{t("customer.dashboard.greetingSub")}</p>
        )}
      </div>
      {trailing}
    </div>
  );
};

export default CustomerGreeting;
