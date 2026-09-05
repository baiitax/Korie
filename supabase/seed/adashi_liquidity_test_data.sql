-- =============================================================================
-- KORIEPAY TIER-1 FINANCIAL PLATFORM: ADASHI & LIQUIDITY TEST SEED DATA
-- Seed File: supabase/seed/adashi_liquidity_test_data.sql
-- Description: Complete synthetic seed data for Nigeria (NGN) & Niger Republic (XOF)
-- Warning: ALL DATA IN THIS FILE IS SYNTHETIC TEST DATA (is_test_data = true)
-- =============================================================================

BEGIN;

-- 1. SEED CENTRAL LIQUIDITY POOLS
INSERT INTO liquidity.pools (id, pool_code, pool_name, pool_type, legal_entity_code, country_code, currency, status, description, is_test_data)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'KP-NG-LIQUIDITY', 'KoriePay Nigeria Central Treasury Pool', 'CENTRAL', 'KP-NG', 'NG', 'NGN', 'ACTIVE', 'Primary treasury pool for Nigeria operations', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'KP-NE-LIQUIDITY', 'KoriePay Niger Central Treasury Pool', 'CENTRAL', 'KP-NE', 'NE', 'XOF', 'ACTIVE', 'Primary treasury pool for Niger Republic operations', TRUE),
  ('33333333-3333-3333-3333-333333333333', 'KP-NG-ADASHI-RESERVE', 'KoriePay Nigeria Adashi Reserve Pool', 'ADASHI', 'KP-NG', 'NG', 'NGN', 'ACTIVE', 'Dedicated liquidity reserve for Adashi cycle payouts', TRUE),
  ('44444444-4444-4444-4444-444444444444', 'KP-NE-ADASHI-RESERVE', 'KoriePay Niger Adashi Reserve Pool', 'ADASHI', 'KP-NE', 'NE', 'XOF', 'ACTIVE', 'Dedicated liquidity reserve for Niger Tontine payouts', TRUE)
ON CONFLICT (pool_code) DO NOTHING;

-- 2. SEED LIQUIDITY POSITIONS
INSERT INTO liquidity.positions (pool_id, currency, current_confirmed, available, reserved, restricted, pending_settlement, in_transit, expected_inflow, committed_outflow, projected)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'NGN', 500000000.00, 350000000.00, 75000000.00, 25000000.00, 30000000.00, 20000000.00, 50000000.00, 15000000.00, 385000000.00),
  ('22222222-2222-2222-2222-222222222222', 'XOF', 500000000.00, 350000000.00, 75000000.00, 25000000.00, 30000000.00, 20000000.00, 50000000.00, 15000000.00, 385000000.00),
  ('33333333-3333-3333-3333-333333333333', 'NGN', 10000000.00, 8300000.00, 1700000.00, 0.00, 0.00, 0.00, 2500000.00, 1700000.00, 9100000.00),
  ('44444444-4444-4444-4444-444444444444', 'XOF', 10000000.00, 9300000.00, 700000.00, 0.00, 0.00, 0.00, 1500000.00, 700000.00, 10100000.00)
ON CONFLICT (pool_id) DO NOTHING;

-- 3. SEED BANK LIQUIDITY ACCOUNTS (Configurable Provider Nodes)
INSERT INTO liquidity.pool_accounts (id, pool_id, provider_id, account_identifier, account_name, account_type, currency, country_code, legal_entity_code, is_primary, is_test_data)
SELECT 
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  bp.id,
  'TEST-NG-PROVIDUS-001',
  'Providus Bank NG - Operational Clearing Vault',
  'COMMERCIAL_CHECKING',
  'NGN',
  'NG',
  'KP-NG',
  TRUE,
  TRUE
FROM liquidity.banking_providers bp WHERE bp.provider_code = 'PROVIDUS_NG'
ON CONFLICT (account_identifier) DO NOTHING;

INSERT INTO liquidity.pool_accounts (id, pool_id, provider_id, account_identifier, account_name, account_type, currency, country_code, legal_entity_code, is_primary, is_test_data)
SELECT 
  '66666666-6666-6666-6666-666666666666',
  '22222222-2222-2222-2222-222222222222',
  bp.id,
  'TEST-NE-KORIS-001',
  'Coris Bank NE - Operational Settlement Vault',
  'COMMERCIAL_CHECKING',
  'XOF',
  'NE',
  'KP-NE',
  TRUE,
  TRUE
FROM liquidity.banking_providers bp WHERE bp.provider_code = 'KORIS_NE'
ON CONFLICT (account_identifier) DO NOTHING;

-- 4. SEED ADASHI PRODUCTS
INSERT INTO adashi.products (id, product_code, product_name, description, default_currency, country_code, minimum_members, maximum_members, contribution_frequency, contribution_amount, cycle_duration_days, grace_period_hours, platform_fee_percent, agent_commission_percent, payout_maker_checker_threshold)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ADA-NGN-WK-10K', 'Weekly Market Trader Circle (NGN)', 'High-turnover weekly savings for verified Nigerian merchants', 'NGN', 'NG', 5, 20, 'WEEKLY', 10000.00, 7, 48, 1.00, 0.50, 200000.00),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ADA-NGN-MO-50K', 'Monthly Executive Builder (NGN)', 'Structured monthly savings pool for salary earners & businesses', 'NGN', 'NG', 5, 12, 'MONTHLY', 50000.00, 30, 72, 1.50, 0.50, 500000.00),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ADA-XOF-WK-10K', 'Cercle Tontine Hebdo Niamey (XOF)', 'Rotating micro-savings collective for Grand Marché de Niamey', 'XOF', 'NE', 5, 20, 'WEEKLY', 10000.00, 7, 48, 1.00, 0.50, 200000.00),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'ADA-XOF-MO-25K', 'Tontine Mensuelle Solidarité (XOF)', 'Monthly cooperative savings for artisans & trade associations in Niger', 'XOF', 'NE', 4, 10, 'MONTHLY', 25000.00, 30, 72, 1.25, 0.50, 250000.00)
ON CONFLICT (product_code) DO NOTHING;

-- 5. SEED SYNTHETIC NIGERIAN ADASHI GROUPS (5 Active, 2 Completed, 2 Defaults, 1 Payout Exception)
INSERT INTO adashi.groups (id, public_reference, product_id, creator_id, creator_role, assigned_agent_id, legal_entity_code, country_code, currency, name, description, contribution_amount, frequency, target_members, current_members_count, total_cycles, current_cycle_number, total_pool_volume, escrow_vault_account_id, status, is_test_data)
VALUES
  -- 5 Active Groups (NG)
  ('a1111111-1111-1111-1111-111111111111', 'ADA-NG-2026-001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Balogun Textile Guild Circle 1', 'Weekly market trader circle in Balogun', 10000.00, 'WEEKLY', 6, 6, 6, 2, 60000.00, 'ESCROW_VAULT_NGN_01', 'ACTIVE', TRUE),
  ('a2222222-2222-2222-2222-222222222222', 'ADA-NG-2026-002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Idumota Electronics Circle', 'Weekly trader collective in Idumota', 20000.00, 'WEEKLY', 5, 5, 5, 1, 100000.00, 'ESCROW_VAULT_NGN_01', 'ACTIVE', TRUE),
  ('a3333333-3333-3333-3333-333333333333', 'ADA-NG-2026-003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Wuse Tech Professionals Ajo', 'Monthly professional savings collective', 50000.00, 'MONTHLY', 5, 5, 5, 1, 250000.00, 'ESCROW_VAULT_NGN_01', 'ACTIVE', TRUE),
  ('a4444444-4444-4444-4444-444444444444', 'ADA-NG-2026-004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Kano Kurmi Spice Circle', 'Weekly spice trader circle', 10000.00, 'WEEKLY', 6, 6, 6, 1, 60000.00, 'ESCROW_VAULT_NGN_01', 'ACTIVE', TRUE),
  ('a5555555-5555-5555-5555-555555555555', 'ADA-NG-2026-005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Onitsha Main Market Union', 'High turnover commercial savings', 50000.00, 'WEEKLY', 10, 10, 10, 3, 500000.00, 'ESCROW_VAULT_NGN_01', 'ACTIVE', TRUE),
  
  -- 2 Completed Groups (NG)
  ('a6666666-6666-6666-6666-666666666666', 'ADA-NG-2026-006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Alaba Traders Alpha 2026', 'Completed weekly circle', 10000.00, 'WEEKLY', 5, 5, 5, 5, 50000.00, 'ESCROW_VAULT_NGN_01', 'COMPLETED', TRUE),
  ('a7777777-7777-7777-7777-777777777777', 'ADA-NG-2026-007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Garki Executive Ajo Cohort', 'Completed monthly builder circle', 50000.00, 'MONTHLY', 4, 4, 4, 4, 200000.00, 'ESCROW_VAULT_NGN_01', 'COMPLETED', TRUE),

  -- 2 Groups with Defaults (NG)
  ('a8888888-8888-8888-8888-888888888888', 'ADA-NG-2026-008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Ikeja Computer Village Group', 'Circle undergoing default mediation', 20000.00, 'WEEKLY', 5, 5, 5, 2, 100000.00, 'ESCROW_VAULT_NGN_01', 'DEFAULT_REVIEW', TRUE),
  ('a9999999-9999-9999-9999-999999999999', 'ADA-NG-2026-009', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Victoria Island Salary Ajo', 'Circle with active lien recovery', 50000.00, 'MONTHLY', 6, 6, 6, 3, 300000.00, 'ESCROW_VAULT_NGN_01', 'DEFAULT_REVIEW', TRUE),

  -- 1 Group with Payout Exception (NG)
  ('a0000000-0000-0000-0000-000000000000', 'ADA-NG-2026-010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'AGENT', '99999999-9999-9999-9999-999999999999', 'KP-NG', 'NG', 'NGN', 'Maitama Business Guild Ajo', 'Group held for AML review before payout release', 50000.00, 'WEEKLY', 10, 10, 10, 4, 500000.00, 'ESCROW_VAULT_NGN_01', 'PAYOUT_HOLD', TRUE)
ON CONFLICT (public_reference) DO NOTHING;

-- 6. SEED SYNTHETIC NIGER REPUBLIC GROUPS (3 Active, 1 Completed, 1 Contribution Failure)
INSERT INTO adashi.groups (id, public_reference, product_id, creator_id, creator_role, assigned_agent_id, legal_entity_code, country_code, currency, name, description, contribution_amount, frequency, target_members, current_members_count, total_cycles, current_cycle_number, total_pool_volume, escrow_vault_account_id, status, is_test_data)
VALUES
  -- 3 Active Groups (NE)
  ('b1111111-1111-1111-1111-111111111111', 'ADA-NE-2026-001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', 'AGENT', '88888888-8888-8888-8888-888888888888', 'KP-NE', 'NE', 'XOF', 'Tontine Grand Marché Niamey', 'Cercle hebdomadaire commerçants Niamey', 10000.00, 'WEEKLY', 5, 5, 5, 2, 50000.00, 'ESCROW_VAULT_XOF_01', 'ACTIVE', TRUE),
  ('b2222222-2222-2222-2222-222222222222', 'ADA-NE-2026-002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', 'AGENT', '88888888-8888-8888-8888-888888888888', 'KP-NE', 'NE', 'XOF', 'Cercle Artisans Maradi', 'Tontine hebdomadaire maroquiniers Maradi', 10000.00, 'WEEKLY', 5, 5, 5, 1, 50000.00, 'ESCROW_VAULT_XOF_01', 'ACTIVE', TRUE),
  ('b3333333-3333-3333-3333-333333333333', 'ADA-NE-2026-003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888', 'AGENT', '88888888-8888-8888-8888-888888888888', 'KP-NE', 'NE', 'XOF', 'Tontine Solidarité Zinder', 'Épargne mensuelle coopérative agricole', 25000.00, 'MONTHLY', 4, 4, 4, 1, 100000.00, 'ESCROW_VAULT_XOF_01', 'ACTIVE', TRUE),

  -- 1 Completed Group (NE)
  ('b4444444-4444-4444-4444-444444444444', 'ADA-NE-2026-004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', 'AGENT', '88888888-8888-8888-8888-888888888888', 'KP-NE', 'NE', 'XOF', 'Tontine Katako Niamey Cohorte 1', 'Cercle clôturé sans défaut', 10000.00, 'WEEKLY', 5, 5, 5, 5, 50000.00, 'ESCROW_VAULT_XOF_01', 'COMPLETED', TRUE),

  -- 1 Group with Contribution Failures (NE)
  ('b5555555-5555-5555-5555-555555555555', 'ADA-NE-2026-005', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888', 'AGENT', '88888888-8888-8888-8888-888888888888', 'KP-NE', 'NE', 'XOF', 'Cercle Commerçants Tahoua', 'Groupe avec rejets de prélèvements automatiques', 25000.00, 'MONTHLY', 4, 4, 4, 2, 100000.00, 'ESCROW_VAULT_XOF_01', 'DEFAULT_REVIEW', TRUE)
ON CONFLICT (public_reference) DO NOTHING;

-- 7. SEED LIQUIDITY RESERVATIONS (Tied to Adashi Cycles)
INSERT INTO liquidity.reservations (id, reservation_reference, pool_id, legal_entity_code, currency, reserved_amount, used_amount, remaining_amount, source_domain, source_reference, reason, status, starts_at, expires_at, created_by, is_test_data)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'RES-NGN-20260904-001', '33333333-3333-3333-3333-333333333333', 'KP-NG', 'NGN', 60000.00, 0.00, 60000.00, 'ADASHI', 'ADA-NG-2026-001:CYCLE-2', 'Liquidity reservation for Balogun Textile Guild Cycle 2 Payout', 'ACTIVE', NOW(), NOW() + INTERVAL '7 days', '99999999-9999-9999-9999-999999999999', TRUE),
  ('c2222222-2222-2222-2222-222222222222', 'RES-NGN-20260904-002', '33333333-3333-3333-3333-333333333333', 'KP-NG', 'NGN', 100000.00, 0.00, 100000.00, 'ADASHI', 'ADA-NG-2026-002:CYCLE-1', 'Liquidity reservation for Idumota Electronics Cycle 1 Payout', 'ACTIVE', NOW(), NOW() + INTERVAL '7 days', '99999999-9999-9999-9999-999999999999', TRUE),
  ('c3333333-3333-3333-3333-333333333333', 'RES-NGN-20260904-003', '33333333-3333-3333-3333-333333333333', 'KP-NG', 'NGN', 250000.00, 0.00, 250000.00, 'ADASHI', 'ADA-NG-2026-003:CYCLE-1', 'Liquidity reservation for Wuse Tech Professionals Cycle 1 Payout', 'ACTIVE', NOW(), NOW() + INTERVAL '30 days', '99999999-9999-9999-9999-999999999999', TRUE),
  ('c4444444-4444-4444-4444-444444444444', 'RES-XOF-20260904-001', '44444444-4444-4444-4444-444444444444', 'KP-NE', 'XOF', 50000.00, 0.00, 50000.00, 'ADASHI', 'ADA-NE-2026-001:CYCLE-2', 'Liquidity reservation for Tontine Grand Marché Cycle 2 Payout', 'ACTIVE', NOW(), NOW() + INTERVAL '7 days', '88888888-8888-8888-8888-888888888888', TRUE),
  ('c5555555-5555-5555-5555-555555555555', 'RES-XOF-20260904-002', '44444444-4444-4444-4444-444444444444', 'KP-NE', 'XOF', 100000.00, 0.00, 100000.00, 'ADASHI', 'ADA-NE-2026-003:CYCLE-1', 'Liquidity reservation for Tontine Solidarité Zinder Cycle 1 Payout', 'ACTIVE', NOW(), NOW() + INTERVAL '30 days', '88888888-8888-8888-8888-888888888888', TRUE)
ON CONFLICT (reservation_reference) DO NOTHING;

COMMIT;
