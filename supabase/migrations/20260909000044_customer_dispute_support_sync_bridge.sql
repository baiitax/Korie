-- ============================================================================
-- Customer support: sync-bridge from public.customer_disputes to
-- public.support_tickets / public.support_disputes.
--
-- Before this migration, a customer-filed dispute (POST
-- /api/customer/portal/disputes) only ever wrote to customer_disputes.
-- Nothing in the support portal (support_tickets, support_disputes) ever
-- read that table, so a customer's dispute was invisible to every support
-- officer — it sat in a queue nobody worked. This migration adds the
-- linkage columns the application-level bridge (see
-- src/lib/support/customerDisputeBridge.ts) uses to mirror a customer
-- dispute into a real, working support ticket (and, when it references a
-- specific transaction with a claimed amount, a real support_disputes row
-- too) the moment it is filed — plus a self-healing retry path for any
-- dispute the bridge failed to sync on first attempt.
-- ============================================================================

ALTER TABLE public.customer_disputes
  ADD COLUMN IF NOT EXISTS synced_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS synced_dispute_id UUID REFERENCES public.support_disputes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Cheap lookup for the retry sweep: "give me the disputes that still need a
-- support-side record" without a sequential scan of the whole table.
CREATE INDEX IF NOT EXISTS idx_customer_disputes_sync_pending
  ON public.customer_disputes(created_at)
  WHERE sync_status <> 'SYNCED';

-- The bridge acts as a real, auditable support officer — every ticket/
-- dispute/event it writes carries this identity in actor_id/actor_name/
-- created_by_officer_id, exactly like a human officer's actions, so the
-- support audit trail always shows who (or what) actually created a record.
-- It has no auth_user_id: nobody signs in as it, and it is intentionally
-- given no elevated capabilities (create_ticket/create_dispute only, via
-- the same TIER_1_JUNIOR grant every junior officer has — see
-- SupportPermissions.ts) so a compromised or buggy bridge could not decide
-- disputes or move money on its own.
INSERT INTO public.support_officers (
  org_id, officer_code, full_name, email, role, tier, jurisdiction,
  languages, max_capacity, status
)
SELECT
  o.id, 'OFF-SYS-BRIDGE', 'Customer Dispute Sync Bridge', 'system.dispute-bridge@koriepay.internal',
  'TIER_1_JUNIOR', 'TIER_0_AUTOMATION', 'CROSS_BORDER',
  ARRAY['en', 'fr', 'ha']::VARCHAR(8)[], 0, 'ONLINE'
FROM public.organizations o
ORDER BY o.created_at ASC
LIMIT 1
ON CONFLICT (email) DO NOTHING;

-- max_capacity = 0 deliberately excludes it from pickAutoAssignee's normal
-- "least-loaded officer" pool — it must never be auto-assigned a human's
-- ticket; it only ever appears as the creator of the mirrored record.
