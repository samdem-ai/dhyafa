-- ===========================================================================
-- DEV/DEMO payment simulation.
-- Lets the customer app close the book -> paid -> confirmed loop locally WITHOUT
-- Chargily keys or a reachable edge runtime. It mints a pending transaction for
-- the caller's own awaiting_payment booking, then routes through the SAME
-- apply_payment_event() the real Chargily webhook uses — so dev and prod converge.
--
-- PRODUCTION: revoke/drop this. Guarded to the booking owner + awaiting_payment.
-- ===========================================================================

create or replace function public.dev_simulate_payment(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b   public.bookings%rowtype;
  v_ref text;
  v_res text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_b from public.bookings where id = p_booking_id;
  if v_b.id is null then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_b.guest_id <> auth.uid() then
    raise exception 'NOT_YOUR_BOOKING' using errcode = '42501';
  end if;
  if v_b.status <> 'awaiting_payment' then
    raise exception 'NOT_AWAITING_PAYMENT: status=%', v_b.status using errcode = '22023';
  end if;

  v_ref := 'DEV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

  insert into public.transactions (
    booking_id, kind, method, provider, status, amount_dzd,
    commission_bps, commission_amount_dzd, currency,
    provider_ref, provider_payment_method, idempotency_key, raw_payload
  ) values (
    v_b.id, 'payment', 'edahabia', 'chargily', 'pending', v_b.total_dzd,
    v_b.commission_bps, v_b.commission_amount_dzd, 'DZD',
    v_ref, 'edahabia', v_ref, jsonb_build_object('dev_simulated', true)
  );

  -- Same confirm path as the real webhook.
  v_res := public.apply_payment_event('chargily', v_ref, 'paid', v_b.total_dzd, 0, 'devevt-' || v_ref);
  return v_res;  -- expect 'applied'
end;
$$;

grant execute on function public.dev_simulate_payment(uuid) to authenticated;

comment on function public.dev_simulate_payment(uuid) is
  'DEV/DEMO ONLY: simulates a successful Chargily payment for the caller''s own awaiting_payment booking, routing through apply_payment_event. Revoke/drop in production.';
