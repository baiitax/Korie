-- =============================================================================
-- 20260910 — FIX MIRROR TRIGGERS: audit id columns are NOT NULL
--
-- transactions.idempotency_key / request_id / correlation_id are NOT NULL
-- with no default. The 41/42 mirror functions set idempotency_key only, so
-- the INSERT failed and rolled back the entire money-movement transaction
-- (proven live: a real transfer returned TRANSFER_FAILED). This migration
-- replaces all three trigger functions with corrected bodies.
-- =============================================================================

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

  if exists (select 1 from public.transactions
             where external_reference = 'CCTX-' || new.id::text) then
    return new;
  end if;

  insert into public.transactions (
    org_id, wallet_id, ledger_transaction_id, reference, external_reference,
    idempotency_key, request_id, correlation_id,
    type, status, amount, fee, net_amount, currency,
    source_currency, destination_currency, exchange_rate,
    recipient_name, recipient_bank, recipient_account,
    provider_code, narration, metadata
  ) values (
    v_org, new.wallet_id, new.ledger_transaction_id, new.reference,
    'CCTX-' || new.id::text,
    coalesce(new.idempotency_key, 'MIRROR-CCTX-' || new.id::text),
    'mirror-cctx-' || new.id::text,
    'mirror-cctx-' || new.id::text,
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
    idempotency_key, request_id, correlation_id,
    type, status, amount, fee, net_amount, currency,
    source_currency, destination_currency,
    recipient_name, recipient_account, recipient_bank,
    provider_code, narration, metadata
  ) values (
    v_org, new.ledger_transaction_id, new.reference,
    'AGTX-' || new.id::text,
    coalesce(new.idempotency_key, 'MIRROR-AGTX-' || new.id::text),
    'mirror-agtx-' || new.id::text,
    'mirror-agtx-' || new.id::text,
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

create or replace function public.mirror_customer_fx_swap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.wallets where id = new.from_wallet_id;

  if exists (select 1 from public.transactions
             where external_reference = 'FXSW-' || new.id::text) then
    return new;
  end if;

  insert into public.transactions (
    org_id, wallet_id, ledger_transaction_id, reference, external_reference,
    idempotency_key, request_id, correlation_id,
    type, status, amount, fee, net_amount, currency,
    source_currency, destination_currency, exchange_rate,
    narration, metadata
  ) values (
    v_org, new.from_wallet_id, new.ledger_transaction_id, new.reference,
    'FXSW-' || new.id::text,
    coalesce(new.idempotency_key, 'MIRROR-FXSW-' || new.id::text),
    'mirror-fxsw-' || new.id::text,
    'mirror-fxsw-' || new.id::text,
    'FX_CONVERSION',
    case new.status
      when 'COMPLETED'  then 'SUCCESSFUL'
      when 'FAILED'      then 'FAILED'
      when 'REVERSED'    then 'REVERSED'
      else 'PENDING'
    end,
    new.from_amount, new.fee, new.from_amount - new.fee, new.from_currency,
    new.from_currency, new.to_currency, new.exchange_rate,
    'FX wallet swap ' || new.from_currency || ' to ' || new.to_currency,
    jsonb_build_object(
      'source', 'customer_fx_swaps',
      'customer_fx_swap_id', new.id,
      'customer_id', new.customer_id,
      'kyc_tier_at_swap', new.kyc_tier_at_swap
    )
  );
  return new;
end $$;

-- new SECURITY DEFINER bodies: re-assert the function lockdown
revoke execute on all functions in schema public from public, anon, authenticated;
