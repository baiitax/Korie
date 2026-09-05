'use client';

/**
 * Modal and drawer behaviour for the compliance console (§ modal + drawer
 * rules): one scrim, one close control, focus moved in and returned on exit,
 * Escape to dismiss, background scroll frozen while open, and the panel
 * rendered into `document.body` so it can never be clipped by a scrolling
 * container. Both are provenance-aware: a form that only writes to demo data
 * says so inside the dialog, not in a footnote.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useOverlayBehaviour(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      restoreRef.current?.focus({ preventScroll: true });
    };
  }, [open, onClose, mounted]);

  return { panelRef, mounted };
}

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeLabel: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, description, size = 'md', closeLabel, footer, children }) => {
  const { panelRef, mounted } = useOverlayBehaviour(open, onClose);
  if (!open || !mounted) return null;
  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)]">
      <div className="absolute inset-0 bg-[rgba(8,14,24,0.44)] backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-hidden rounded-t-[18px] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-xl)] sm:inset-auto sm:left-1/2 sm:top-[6vh] sm:w-[min(100% - 24px,720px)] sm:-translate-x-1/2 sm:rounded-[16px] sm:border"
        style={{ maxWidth: size === 'sm' ? 440 : size === 'lg' ? 760 : 600 }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cmp-modal-title"
          className="flex max-h-[92vh] flex-col"
        >
          <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div className="min-w-0">
              <h2 id="cmp-modal-title" className="text-[15px] font-bold text-[var(--foreground)]">
                {title}
              </h2>
              {description ? (
                <p id="cmp-modal-desc" className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--foreground-muted)]">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="cmp-btn cmp-btn--icon cmp-btn--ghost flex-none"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">{children}</div>
          {footer ? (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/**
 * Right-hand drawer for investigation context. On small screens it becomes a
 * bottom sheet, because a 560px panel anchored to the right of a 360px viewport
 * is just a modal that is harder to reach.
 */
export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  closeLabel: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, eyebrow, closeLabel, actions, footer, children }) => {
  const { panelRef, mounted } = useOverlayBehaviour(open, onClose);
  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-drawer)]">
      <div className="cmp-scrim absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={title} className="cmp-drawer">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            {eyebrow ? <div className="mb-1 flex flex-wrap items-center gap-1.5">{eyebrow}</div> : null}
            <h2 className="truncate text-[15px] font-bold text-[var(--foreground)]">{title}</h2>
            {subtitle ? <div className="mt-0.5 text-[12.5px] text-[var(--foreground-muted)]">{subtitle}</div> : null}
          </div>
          <div className="flex flex-none items-center gap-1.5">
            {actions}
            <button type="button" onClick={onClose} aria-label={closeLabel} className="cmp-btn cmp-btn--icon cmp-btn--ghost">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

/**
 * Drawer/modal state that lives in the URL (`?panel=evidence`), so a panel can
 * be pasted into a case note and reopened exactly as it was.
 */
export function useUrlPanel(param = 'panel') {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(param);

  const setOpen = useCallback(
    (value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(param, value);
      else next.delete(param);
      const query = next.toString();
      router.replace(`${window.location.pathname}${query ? `?${query}` : ''}`, { scroll: false });
    },
    [param, router, searchParams],
  );

  return { value: current, open: (v: string) => setOpen(v), close: () => setOpen(null), isActive: (v: string) => current === v };
}
