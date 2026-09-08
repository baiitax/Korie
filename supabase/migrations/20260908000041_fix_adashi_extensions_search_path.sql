-- Fix: adashi.generate_adashi_allocation, public.post_adashi_contribution and
-- public.post_adashi_contribution_agent_collect call gen_random_bytes()/digest(),
-- which live in the `extensions` schema on this Supabase project (pgcrypto is
-- installed there, not in public/pg_catalog). Each of these three functions
-- declares its own `SET search_path` for hardening, but none of them included
-- `extensions`, so every call failed with
-- "function gen_random_bytes(integer) does not exist" /
-- "function digest(text, unknown) does not exist" the moment it reached that
-- line — discovered live while running generate_adashi_allocation() during
-- Adashi rotation testing. This migration only widens each function's fixed
-- search_path to include `extensions`; it does not change any function body
-- or business logic.

ALTER FUNCTION adashi.generate_adashi_allocation(p_group_id uuid, p_actor_id uuid, p_seed_salt text)
  SET search_path = adashi, liquidity, public, extensions;

ALTER FUNCTION public.post_adashi_contribution(p_obligation_id uuid, p_customer_id uuid, p_wallet_id uuid, p_idempotency_key character varying, p_payment_reference character varying)
  SET search_path = public, adashi, liquidity, extensions;

ALTER FUNCTION public.post_adashi_contribution_agent_collect(p_obligation_id uuid, p_agent_id uuid, p_idempotency_key character varying, p_payment_reference character varying)
  SET search_path = public, adashi, liquidity, extensions;
