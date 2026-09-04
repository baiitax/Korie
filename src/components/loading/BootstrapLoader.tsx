"use client";

import { useEffect } from "react";
import { useLoading } from "./LoadingContext";

/**
 * Drives the brief, NON-blocking bootstrap brand reveal (first entry in a
 * session only). It delegates to the central LoadingProvider so the visual is
 * identical to every other full-screen load. `sessionStorage` is the guard so
 * same-session navigation never re-triggers it. It auto-hides — it is never
 * sticky and never claims progress.
 */
export const BootstrapLoader: React.FC = () => {
  const { showFullScreen, hideFullScreen } = useLoading();

  useEffect(() => {
    let done = false;
    try {
      if (sessionStorage.getItem("koriepay_loaded")) return;
    } catch {
      /* ignore */
    }

    // Defer one frame so the providers/layout hydrate cleanly (no flash).
    const start = requestAnimationFrame(() => showFullScreen({ kind: "bootstrap", sticky: false }));

    const finish = setTimeout(() => {
      hideFullScreen();
      try {
        sessionStorage.setItem("koriepay_loaded", "true");
      } catch {
        /* ignore */
      }
      done = true;
    }, 1100);

    return () => {
      cancelAnimationFrame(start);
      clearTimeout(finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default BootstrapLoader;
