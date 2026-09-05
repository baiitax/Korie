"use client";

import { useEffect, useRef, useState } from "react";
import { useLoading } from "./LoadingContext";

/**
 * Branded boot overlay, tied to REAL completion — not to a timer.
 *
 * The previous version dismissed itself after a fixed 1100 ms regardless of
 * whether the app had loaded anything, which is exactly the "loader lies about
 * app state" defect this rebuild removes: on a slow portal fetch the brand
 * screen vanished into an empty shell, and on a fast one it lingered.
 *
 * Rules now:
 *   • exits only once `bootstrapReady` (first authoritative data load resolved,
 *     success OR failure — an error screen is a legitimate hand-off);
 *   • MIN_VISIBLE_MS floors the display so a 60 ms load cannot strobe;
 *   • HARD_CAP_MS is the safety valve: no loader may be infinite. If data
 *     never arrives we hand off to the page's own error state rather than
 *     trapping the customer behind a spinner.
 *   • sessionStorage guard keeps it to first entry in the session.
 */
const MIN_VISIBLE_MS = 700;
const HARD_CAP_MS = 9000;

export const BootstrapLoader: React.FC = () => {
  const { showFullScreen, hideFullScreen, markBootstrapReady, bootstrapReady } = useLoading();
  const [armed, setArmed] = useState(false);
  const shownAt = useRef(0);
  const closed = useRef(false);

  // Decide once, on mount, whether this session shows the brand reveal.
  useEffect(() => {
    let wanted = false;
    try {
      wanted = !sessionStorage.getItem("koriepay_loaded");
    } catch {
      wanted = false;
    }
    if (!wanted) return;
    // The gate is a customer-portal affordance: it waits for the portal's first
    // authoritative load. On any other surface there is no such signal, so it
    // must not hold the screen — hand off after the floor instead of idling to
    // the safety cap.
    if (!window.location.pathname.startsWith("/customer")) {
      setArmed(true);
      shownAt.current = Date.now();
      markBootstrapReady();
      return;
    }
    setArmed(true);
    const raf = requestAnimationFrame(() => {
      shownAt.current = Date.now();
      showFullScreen({ kind: "bootstrap", sticky: true });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety valve runs from mount, independent of data state.
  useEffect(() => {
    if (!armed) return;
    const cap = setTimeout(close, HARD_CAP_MS);
    return () => clearTimeout(cap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);

  useEffect(() => {
    if (!armed || !bootstrapReady) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
    const timer = setTimeout(close, wait);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, bootstrapReady]);

  function close() {
    if (closed.current) return;
    closed.current = true;
    hideFullScreen();
    markBootstrapReady();
    try {
      sessionStorage.setItem("koriepay_loaded", "true");
    } catch {
      /* ignore */
    }
  }

  return null;
};

export default BootstrapLoader;
