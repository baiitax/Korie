-- =============================================================================
-- 20260910 — FX SWAP FEED MIRROR
--
-- post_customer_fx_swap() writes ledger_transactions/ledger_entries and
-- customer_fx_swaps, but not customer_transactions — so the 20260910000041
-- mirror missed the NGN<->XOF corridor entirely (the corridor the cross-
-- border scenario exists to watch). This trigger feeds swaps into the
-- monitoring table as FX_CONVERSION rows, derived only from real swaps.
-- =============================================================================

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
    idempotency_key, type, status, amount, fee, net_amount, currency,
    source_currency, destination_currency, exchange_rate,
    narration, metadata
  ) values (
    v_org, new.from_wallet_id, new.ledger_transaction_id, new.reference,
    'FXSW-' || new.id::text,
    new.idempotency_key,
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

drop trigger if exists trg_mirror_customer_fx_swap on public.customer_fx_swaps;
create trigger trg_mirror_customer_fx_swap
  after insert on public.customer_fx_swaps
  for each row execute function public.mirror_customer_fx_swap();
