/**
 * Formatting for compliance screens.
 *
 * Deliberately separate from the customer portal's formatter: an officer reads
 * both currencies in the same table, so the currency code stays visible next to
 * the symbol and the digits are always tabular. XOF is rendered first when a
 * list is sorted by money, NGN second — the group's convention.
 */

const SYMBOLS: Record<string, string> = {
  NGN: '\u20a6',
  XOF: 'CFA',
  USD: '$',
  EUR: '\u20ac',
  GBP: '\u00a3',
};

function localeOf(locale?: string): string {
  if (locale === 'fr') return 'fr-FR';
  if (locale === 'ha') return 'ha-Latn-NG';
  return 'en-US';
}

export interface FormatOptions {
  locale?: string;
  /** Officers compare figures, so cents are shown only when they exist. */
  compact?: boolean;
}

export function formatMoney(
  amount: number | undefined | null,
  currency = 'NGN',
  options: FormatOptions = {},
): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) return NOT_REPORTED;
  const code = String(currency || 'NGN').toUpperCase();
  const symbol = SYMBOLS[code] ?? `${code} `;
  const hasDecimals = Math.abs(amount % 1) > 0.000001;
  const body = new Intl.NumberFormat(localeOf(options.locale), {
    minimumFractionDigits: hasDecimals && !options.compact ? 2 : 0,
    maximumFractionDigits: hasDecimals && !options.compact ? 2 : 0,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  const prefix = code === 'XOF' ? '' : symbol;
  const suffix = code === 'XOF' ? ` ${SYMBOLS.XOF}` : '';
  return `${sign}${prefix}${body}${suffix}`;
}

/** The ledger and treasury engines speak minor units; screens should not. */
export function fromMinor(minor: number | undefined | null): number | undefined {
  if (typeof minor !== 'number' || !Number.isFinite(minor)) return undefined;
  return minor / 100;
}

export function formatNumber(value: number | undefined | null, options: FormatOptions = {}): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return NOT_REPORTED;
  return new Intl.NumberFormat(localeOf(options.locale)).format(value);
}

export const NOT_REPORTED = 'Not reported';

const DATE_TIME: Record<string, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: 'short' },
  day: { day: '2-digit', month: 'short', year: 'numeric' },
  full: { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

export function formatDate(iso: string | undefined | null, style: keyof typeof DATE_TIME = 'full', options: FormatOptions = {}): string {
  if (!iso) return NOT_REPORTED;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return String(iso);
  return new Intl.DateTimeFormat(localeOf(options.locale), {
    ...DATE_TIME[style],
    timeZone: 'Africa/Lagos',
    hour12: false,
  }).format(new Date(t));
}

export function formatRelative(iso: string | undefined | null, options: FormatOptions = {}): string {
  if (!iso) return NOT_REPORTED;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return String(iso);
  const diffMinutes = Math.round((t - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(localeOf(options.locale), { numeric: 'auto' });
  const abs = Math.abs(diffMinutes);
  if (abs < 60) return rtf.format(diffMinutes, 'minute');
  if (abs < 60 * 36) return rtf.format(Math.round(diffMinutes / 60), 'hour');
  if (abs < 60 * 24 * 400) return rtf.format(Math.round(diffMinutes / (60 * 24)), 'day');
  return rtf.format(Math.round(diffMinutes / (60 * 24 * 30)), 'month');
}

/** Enum → words. `P0_CRITICAL` becomes "P0 critical", not "P0 Critical". */
export function humanizeEnum(value: string | undefined | null): string {
  if (!value) return NOT_REPORTED;
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b([A-Za-z])([A-Z]+)\b/g, (_, a: string, b: string) => a + b.toLowerCase())
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

export function titleCase(value: string | undefined | null): string {
  if (!value) return NOT_REPORTED;
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Masked identifiers stay masked; the portal never reconstructs a NIN/BVN. */
export function maskIdentifier(raw: string | undefined | null): string {
  if (!raw) return NOT_REPORTED;
  const value = String(raw).trim();
  if (value.length <= 4) return '\u2022\u2022\u2022\u2022';
  return `${'\u2022'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

/** Used by the sweep and by the "quote this id" affordances. */
export function shortRef(value: string | undefined | null): string {
  if (!value) return NOT_REPORTED;
  const v = String(value);
  return v.length <= 22 ? v : `${v.slice(0, 10)}\u2026${v.slice(-8)}`;
}

export function sumBy<T>(rows: T[], pick: (row: T) => number | undefined): number {
  return rows.reduce((total, row) => {
    const value = pick(row);
    return Number.isFinite(value) ? total + (value as number) : total;
  }, 0);
}
