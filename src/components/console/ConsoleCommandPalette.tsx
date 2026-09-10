'use client';

/**
 * KoriePay — shared console command palette (⌘K), admin design language.
 * Searches the portal's navigation destinations plus any records the portal
 * passes in (tickets, payments, cases …). Honest by construction: it only
 * shows what the caller supplies, and says so when nothing matches.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpRight } from 'lucide-react';

export interface PaletteItem {
  label: string;
  sub?: string;
  href: string;
}

export interface PaletteGroup {
  title: string;
  items: PaletteItem[];
}

interface ConsoleCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  placeholder: string;
  groups: PaletteGroup[];
  emptyText?: string;
}

export const ConsoleCommandPalette: React.FC<ConsoleCommandPaletteProps> = ({
  open,
  onClose,
  placeholder,
  groups,
  emptyText = 'No matches.',
}) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setSel(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out: { group: string; label: string; sub?: string; href: string }[] = [];
    for (const g of groups) {
      for (const it of g.items) {
        if (
          !query ||
          it.label.toLowerCase().includes(query) ||
          (it.sub || '').toLowerCase().includes(query) ||
          it.href.toLowerCase().includes(query)
        ) {
          out.push({ group: g.title, ...it });
        }
      }
    }
    return out.slice(0, 40);
  }, [q, groups]);

  if (!open) return null;

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    }
    if (e.key === 'Enter' && results[sel]) go(results[sel].href);
  };

  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[10vh] px-3">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-slate-950/50 backdrop-blur-[2px]"
      />
      <div
        className="relative w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden"
        role="dialog"
        aria-label={placeholder}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border)]">
          <Search className="w-4 h-4 text-[var(--foreground-muted)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] outline-none"
          />
          <kbd className="text-[10px] font-mono font-bold border border-[var(--border)] rounded px-1 py-0.5 text-[var(--foreground-muted)]">
            ESC
          </kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto py-1.5">
          {results.length === 0 && (
            <div className="px-5 py-8 text-center text-xs text-[var(--foreground-muted)]">
              {emptyText} “{q}”
            </div>
          )}
          {results.map((r, i) => {
            const showHeader = r.group !== lastGroup;
            lastGroup = r.group;
            return (
              <React.Fragment key={r.href + r.label}>
                {showHeader && (
                  <div className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                    {r.group}
                  </div>
                )}
                <button
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(r.href)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                    i === sel ? 'bg-[var(--surface-elevated)]' : ''
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-[var(--foreground)] truncate">{r.label}</span>
                    {r.sub && (
                      <span className="block text-[10px] font-mono text-[var(--foreground-muted)] truncate">{r.sub}</span>
                    )}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConsoleCommandPalette;
