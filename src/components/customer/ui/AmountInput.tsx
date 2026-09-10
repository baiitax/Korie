"use client";

import React from "react";

/**
 * AmountInput — a money field that formats as the customer types.
 *
 * Directly requested by dashboard review: after any additional zero while
 * counting in thousands or millions, a comma must appear — `1000000`
 * displays as `1,000,000` while it is being typed.
 *
 * The component is a controlled wrapper: `value` and `onChange` speak the
 * CLEAN numeric string (`"199950"`, `"199950.5"`); the comma grouping exists
 * only in what is rendered. Callers' `parseFloat(value)` therefore keep
 * working untouched — a comma can never leak into a numeric parse.
 *
 * Rules:
 *  • digits and at most one decimal point, max 2 decimal places;
 *  • integer groups are comma-separated (en) as the user types;
 *  • leading zeros collapse (`007` → `7`);
 *  • `inputMode="decimal"` keeps the numeric keypad on phones while the
 *    field itself stays `type="text"` so the commas are legal content.
 */

export function cleanAmountInput(raw: string): string {
  let s = raw.replace(/[^\d.]/g, "");
  const first = s.indexOf(".");
  if (first !== -1) {
    s = s.slice(0, first + 1) + s.slice(first + 1).replace(/\./g, "");
  }
  const [int, dec] = s.split(".");
  const cleanedInt = (int || "").replace(/^0+(?=\d)/, "");
  if (dec !== undefined) return `${cleanedInt || "0"}.${dec.slice(0, 2)}`;
  return cleanedInt;
}

export function formatAmountInput(clean: string): string {
  if (!clean) return "";
  const [int, dec] = clean.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

interface AmountInputProps {
  /** Clean numeric string — the same format the caller keeps in state. */
  value: string;
  /** Receives the next CLEAN numeric string (commas stripped). */
  onChange: (next: string) => void;
  /** Currency symbol rendered inside the field, e.g. "₦" or "CFA". */
  symbol?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  symbol,
  placeholder = "0.00",
  className = "",
  inputClassName = "",
  id,
  required,
  disabled,
  "aria-label": ariaLabel,
}) => {
  const field = (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={formatAmountInput(value)}
      onChange={(e) => onChange(cleanAmountInput(e.target.value))}
      className={`w-full py-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xl font-bold font-mono tabular text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent disabled:opacity-50 ${symbol ? "pl-12" : "px-4"} ${inputClassName}`}
    />
  );

  if (!symbol) return <div className={className}>{field}</div>;

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-4 top-3.5 text-lg font-bold text-[var(--foreground-muted)] font-mono pointer-events-none">
        {symbol}
      </span>
      {field}
    </div>
  );
};

export default AmountInput;
