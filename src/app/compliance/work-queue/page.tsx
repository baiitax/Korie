'use client';

/**
 * Work queue — this route now forwards to /compliance/tasks.
 *
 * The old screen rendered the legacy mock store's queue. The live work queue
 * is derived on /compliance/tasks from the real alert, case, obligation and
 * approval queues, so the route forwards there instead of keeping a second,
 * mock-backed copy of the same list.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkQueueRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/compliance/tasks');
  }, [router]);
  return (
    <div className="grid min-h-[40vh] place-items-center" role="status" aria-live="polite">
      <p className="text-[12.5px] font-semibold text-[var(--foreground-muted)]">Redirecting to the live work queue…</p>
    </div>
  );
}
