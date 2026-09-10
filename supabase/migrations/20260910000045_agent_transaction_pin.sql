-- ==============================================================================
-- KORIEPAY — AGENT TRANSACTION PIN (Settings: "change login details and PIN")
-- Migration: 20260910000045_agent_transaction_pin.sql
-- ==============================================================================
--
-- The Agent Settings page previously offered no way for an agent to change
-- their own login credentials or set/change a transaction PIN — there was
-- no PIN concept for agents anywhere in this codebase. This migration adds
-- a real, server-hashed transaction PIN column to public.agents.
--
-- The PIN is stored as a salted SHA-256 hash (pin_hash + pin_salt), never in
-- plaintext, verified only server-side in
-- src/app/api/v1/agency/settings/pin/route.ts. Login-credential changes
-- (email/password) are handled separately via Supabase Auth's own
-- auth.updateUser() from the authenticated agent's browser session — no
-- password material ever needs to be stored in public.agents.
-- ==============================================================================

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_salt TEXT,
  ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.agents.pin_hash IS
  'Salted SHA-256 hash of the agent transaction PIN. Never plaintext. Set/changed via POST /api/v1/agency/settings/pin.';
COMMENT ON COLUMN public.agents.pin_salt IS
  'Per-agent random salt (hex) used to hash pin_hash. Regenerated on every PIN change.';
