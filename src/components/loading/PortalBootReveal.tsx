"use client";

import React, { useEffect, useRef, useState } from "react";
import PortalPreloader, { PortalLoadingContext } from "./PortalPreloader";

const MIN_VISIBLE_MS = 550;

/**
 * First-entrance brand reveal for portals that have no real session/data
 * signal to gate on (Aggregator, Developer — both still run on client-only
 * demo state with no backend fetch, so there is nothing authoritative to
 * wait for). Unlike a fabricated "loading your data…" spinner, this never
 * claims work is in flight beyond the brief transition itself: it is the
 * same honest pattern the original app bootstrap used before the customer
 * portal moved to a real backend signal (see BootstrapLoader) — a short,
 * capped, once-per-session brand hand-off, not a disguised fake wait.
 *
 * Shown once per browser session per portal (sessionStorage-gated), so
 * repeat navigation within the same session never re-shows it.
 */
export const PortalBootReveal: React.FC<{
  context: PortalLoadingContext;
  children: React.ReactNode;
}> = ({ context, children }) => {
  const storageKey = `koriepay_boot_${context}`;
  const [revealed, setRevealed] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = !!sessionStorage.getItem(storageKey);
    } catch {
      alreadySeen = false;
    }
    if (alreadySeen) {
      setRevealed(true);
      return;
    }
    shownAt.current = Date.now();
    const timer = setTimeout(() => {
      setRevealed(true);
      try {
        sessionStorage.setItem(storageKey, "true");
      } catch {
        /* private mode */
      }
    }, MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!revealed) {
    return <PortalPreloader context={context} />;
  }

  return <>{children}</>;
};

export default PortalBootReveal;
