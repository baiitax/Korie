-- =============================================================================
-- 20260910 — OPERATIONAL TRANSACTION FEED
--
-- The plant had no fuel: `transactions` — the table the AML monitoring
-- scenarios are defined against — stayed at 0 rows because no flow ever
-- wrote to it. The transfer and agency flows persist their own ledgers
-- (customer_transactions, agency_transactions) and stop there.
--
-- This migration makes every real money movement automatically reach the
-- monitoring feed:
--   * AFTER INSERT triggers mirror customer_transactions and
--     agency_transactions into `transactions` (never fabricating rows —
--     derived strictly from real user-initiated activity);
--   * `transactions.aml_evaluated_at` marks what the monitoring sweep has
--     already processed, so sweeps are incremental and idempotent.
--
-- The triggers are SECURITY DEFINER so they keep working regardless of the
-- caller's role (the RLS lockdown of 20260910000040 denies direct writes).
-- =============================================================================

-- Marker column: set by the monitoring sweep once a transaction has been
-- evaluated against the active scenarios.
alter table public.transactions
  add column if not exists aml_evaluated_at timestamptz;

-- -------------------------------------------------------------------------------
-- customer_transactions -> transactions
-- -------------------------------------------------------------------------------
create or replace function public.mirror_customer_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.wallets where id = new.wallet_id;

  -- Idempotent: one feed row per source row, ever.
  if exists (select 1 from public.transactions
             where external_reference = 'CCTX-' || new.id::text) then
    return new;
  end if;

  insert into public.transactions (
    org_id, wallet_id, ledger_transaction_id, reference, external_reference,
    idempotency_key, type, status, amount, fee, net_amount, currency,
    source_currency, destination_currency, exchange_rate,
    recipient_name, recipient_bank, recipient_account,
    provider_code, narration, metadata
  ) values (
    v_org, new.wallet_id, new.ledger_transaction_id, new.reference,
    'CCTX-' || new.id::text,
    new.idempotency_key,
    case new.transaction_type
      when 'TRANSFER_NIP'             then 'NIP_OUTWARD_TRANSFER'
      when 'TRANSFER_CROSS_BORDER'    then 'CROSS_BORDER_TRANSFER'
      else 'WALLET_TRANSFER'
    end,
    case new.status
      when 'COMPLETED'  then 'SUCCESSFUL'
      when 'PROCESSING'  then 'PROCESSING'
      when 'FAILED'      then 'FAILED'
      when 'REVERSED'    then 'REVERSED'
      when 'CANCELLED'   then 'CANCELLED'
      when 'DISPUTED'    then 'DISPUTED'
      else 'PENDING'
    end,
    new.amount, new.fee, new.amount, new.currency,
    new.currency, new.destination_currency, new.exchange_rate,
    new.recipient_name, new.recipient_bank, new.recipient_account,
    new.provider_name, new.narration,
    jsonb_build_object(
      'source', 'customer_transactions',
      'customer_transaction_id', new.id,
      'customer_id', new.customer_id
    )
  );
  return new;
end $$;

drop trigger if exists trg_mirror_customer_transaction on public.customer_transactions;
create trigger trg_mirror_customer_transaction
  after insert on public.customer_transactions
  for each row execute function public.mirror_customer_transaction();

-- -------------------------------------------------------------------------------
-- agency_transactions -> transactions
-- -------------------------------------------------------------------------------
create or replace function public.mirror_agency_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.agents where id = new.agent_id;

  if exists (select 1 from public.transactions
             where external_reference = 'AGTX-' || new.id::text) then
    return new;
  end if;

  insert into public.transactions (
    org_id, ledger_transaction_id, reference, external_reference,
    idempotency_key, type, status, amount, fee, net_amount, currency,
    source_currency, destination_currency,
    recipient_name, recipient_account, recipient_bank,
    provider_code, narration, metadata
  ) values (
    v_org, new.ledger_transaction_id, new.reference,
    'AGTX-' || new.id::text,
    new.idempotency_key,
    case new.transaction_type
      when 'CASH_IN'  then 'AGENCY_CASH_IN'
      when 'CASH_OUT' then 'AGENCY_CASH_OUT'
      else 'AGENCY_CASH_IN'
    end,
    case new.status
      when 'COMPLETED'  then 'SUCCESSFUL'
      when 'PROCESSING'  then 'PROCESSING'
      when 'FAILED'      then 'FAILED'
      when 'REVERSED'    then 'REVERSED'
      when 'CANCELLED'   then 'CANCELLED'
      when 'DISPUTED'    then 'DISPUTED'
      else 'PENDING'
    end,
    new.amount, new.customer_fee, new.amount, new.currency,
    new.currency, null,
    new.recipient_name, new.recipient_account, new.recipient_bank,
    new.provider_name,
    'Agency ' || lower(new.transaction_type),
    jsonb_build_object(
      'source', 'agency_transactions',
      'agency_transaction_id', new.id,
      'customer_id', new.customer_id,
      'agent_id', new.agent_id
    )
  );
  return new;
end $$;

drop trigger if exists trg_mirror_agency_transaction on public.agency_transactions;
create trigger trg_mirror_agency_transaction
  after insert on public.agency_transactions
  for each row execute function public.mirror_agency_transaction();
