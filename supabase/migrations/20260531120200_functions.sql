-- ============================================================================
-- 20260531120200_functions.sql
-- Dyafa (دافة) — Helper functions, JWT hook, and RPCs (§5/§6/§7/§8 of spec).
-- SECURITY DEFINER + pinned search_path on privileged logic.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Shared: set_updated_at()  (BEFORE UPDATE trigger fn; wired in triggers migration)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- JWT helper predicates (auth schema, SECURITY DEFINER, search_path='', stable)
-- Read claims injected by custom_access_token_hook: app_roles text[], host_id uuid.
-- ---------------------------------------------------------------------------
create or replace function auth.has_role(r text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_roles' ? r, false);
$$;

create or replace function auth.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.has_role('admin') or auth.has_role('super_admin');
$$;

create or replace function auth.my_host_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'host_id', 'null')::uuid;
$$;

-- Single capability helper consumed by all dashboards (§7).
-- True if caller owns the property's host_profile, OR is an active hotel_staff row
-- for that host_profile whose staff_role >= p_min_role (manager > reception).
create or replace function auth.can_act_on_property(p_property_id uuid, p_min_role staff_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties pr
    where pr.id = p_property_id
      and (
        -- Owner of the host_profile that owns the property.
        pr.host_profile_id = auth.my_host_id()
        -- OR active staff for that host_profile with sufficient capability.
        or exists (
          select 1
          from public.hotel_staff hs
          where hs.host_profile_id = pr.host_profile_id
            and hs.user_id = auth.uid()
            and hs.is_active
            and (
              p_min_role = 'reception'                       -- reception OR manager qualifies
              or (p_min_role = 'manager' and hs.staff_role = 'manager')
            )
        )
      )
  );
$$;

-- text overload (spec names can_act_on_property(uuid, staff_role/text)).
create or replace function auth.can_act_on_property(p_property_id uuid, p_min_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.can_act_on_property(p_property_id, p_min_role::public.staff_role);
$$;

-- ---------------------------------------------------------------------------
-- Custom Access Token Hook — injects app_roles[] + host_id (doc 02 / §7)
-- ---------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  uid    uuid := (event ->> 'user_id')::uuid;
  roles  text[];
  hp_id  uuid;
begin
  select array_agg(role::text) into roles
  from public.user_roles
  where user_id = uid;

  select id into hp_id
  from public.host_profiles
  where owner_id = uid;

  claims := event -> 'claims';
  -- Default to ['guest'] so every authenticated session has at least the guest role.
  claims := jsonb_set(claims, '{app_roles}', to_jsonb(coalesce(roles, array['guest']::text[])));
  claims := jsonb_set(claims, '{host_id}',   coalesce(to_jsonb(hp_id), 'null'::jsonb));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- GoTrue (supabase_auth_admin) must execute the hook and read the source tables.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on public.user_roles, public.host_profiles to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Pricing helper: resolve nightly price for a room_type on a date (§4.5 order).
-- availability.price_override > matching rate_plan (by priority) > weekend > base.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_nightly_price_dzd(p_room_type_id uuid, p_date date)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_override   integer;
  v_base       integer;
  v_weekend    integer;
  v_plan_price integer;
  v_is_weekend boolean;
begin
  -- 1. availability override
  select a.price_override_dzd into v_override
  from public.availability a
  where a.room_type_id = p_room_type_id and a.date = p_date;
  if v_override is not null then
    return v_override;
  end if;

  select rt.base_price_dzd, rt.weekend_price_dzd
    into v_base, v_weekend
  from public.room_types rt
  where rt.id = p_room_type_id;

  -- 2. matching active rate_plan, highest priority wins.
  select coalesce(
           rp.price_dzd,
           case
             when rp.adjust_type = 'absolute' then greatest(v_base + coalesce(rp.adjust_value_dzd,0), 0)
             when rp.adjust_type = 'percent'  then greatest(round(v_base * (100 + coalesce(rp.adjust_value_dzd,0)) / 100.0)::int, 0)
             else v_base
           end)
    into v_plan_price
  from public.rate_plans rp
  where rp.room_type_id = p_room_type_id
    and rp.is_active
    and (rp.date_start is null or p_date >= rp.date_start)
    and (rp.date_end   is null or p_date <= rp.date_end)
  order by rp.priority desc
  limit 1;
  if v_plan_price is not null then
    return v_plan_price;
  end if;

  -- 3. weekend price (Fri/Sat in Algeria) when set.
  v_is_weekend := extract(isodow from p_date) in (5, 6);  -- 5=Fri, 6=Sat
  if v_is_weekend and v_weekend is not null then
    return v_weekend;
  end if;

  -- 4. base
  return coalesce(v_base, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Effective availability (§5): units_open − confirmed booking-units − active holds.
-- ---------------------------------------------------------------------------
create or replace function public.effective_units(p_room_type_id uuid, p_date date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(
      (select a.units_open from public.availability a
        where a.room_type_id = p_room_type_id and a.date = p_date),
      (select rt.inventory_count from public.room_types rt where rt.id = p_room_type_id),
      0
    )
    - coalesce((
        select sum(b.units)::int
        from public.bookings b
        where b.room_type_id = p_room_type_id
          and b.status in ('confirmed','checked_in','completed')
          and b.stay_range @> p_date
      ), 0)
    - coalesce((
        select sum(h.units)::int
        from public.inventory_holds h
        where h.room_type_id = p_room_type_id
          and h.status = 'held'
          and h.expires_at > now()
          and p_date >= h.date_from and p_date < h.date_to
      ), 0);
$$;

-- ---------------------------------------------------------------------------
-- create_booking RPC (§5): advisory lock + effective-availability re-check +
-- price snapshot + bookings insert + inventory_holds insert. One transaction.
-- ---------------------------------------------------------------------------
create or replace function public.create_booking(
  p_property_id  uuid,
  p_room_type_id uuid,
  p_check_in     date,
  p_check_out    date,
  p_adults       smallint default 1,
  p_children     smallint default 0,
  p_units        smallint default 1,
  p_special_requests text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest_id        uuid := auth.uid();
  v_host_profile_id uuid;
  v_listing_kind    listing_kind;
  v_instant_book    boolean;
  v_cancellation    cancellation_tier;
  v_commission_bps  int;
  v_settings        public.platform_settings%rowtype;
  v_room            public.room_types%rowtype;
  v_d               date;
  v_eff             integer;
  v_is_closed       boolean;
  v_cta             boolean;
  v_ctd             boolean;
  v_nightly_total   integer := 0;
  v_extra_fee       integer := 0;
  v_taxable         integer;
  v_service_fee     integer := 0;
  v_commission_amt  integer;
  v_total           integer;
  v_host_payout     integer;
  v_status          booking_status;
  v_expires_at      timestamptz;
  v_payment_deadline timestamptz;
  v_booking_id      uuid;
  v_code            text;
begin
  if v_guest_id is null then
    raise exception 'AUTH_REQUIRED: must be authenticated to book' using errcode = '28000';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'INVALID_RANGE: check_out must be after check_in' using errcode = '22023';
  end if;
  if p_units < 1 then
    raise exception 'INVALID_UNITS: units must be >= 1' using errcode = '22023';
  end if;

  select * into v_settings from public.platform_settings where id = 1;

  -- Resolve property/host facts.
  select pr.host_profile_id, pr.listing_kind, pr.instant_book, pr.cancellation_tier,
         coalesce(hp.commission_bps_override, v_settings.commission_bps)
    into v_host_profile_id, v_listing_kind, v_instant_book, v_cancellation, v_commission_bps
  from public.properties pr
  join public.host_profiles hp on hp.id = pr.host_profile_id
  where pr.id = p_property_id
    and pr.status = 'approved'
    and pr.deleted_at is null;

  if v_host_profile_id is null then
    raise exception 'PROPERTY_UNAVAILABLE: property not found or not bookable' using errcode = 'P0002';
  end if;

  select * into v_room from public.room_types rt
   where rt.id = p_room_type_id and rt.property_id = p_property_id and rt.is_active;
  if v_room.id is null then
    raise exception 'ROOM_TYPE_UNAVAILABLE: room type not found for property' using errcode = 'P0002';
  end if;

  -- Occupancy guard.
  if (p_adults + p_children) > (v_room.max_occupancy * p_units) then
    raise exception 'OCCUPANCY_EXCEEDED: guests exceed room capacity' using errcode = '22023';
  end if;

  -- (2) transaction-level advisory lock keyed on room_type_id → race-free re-check.
  perform pg_advisory_xact_lock(hashtextextended(p_room_type_id::text, 0));

  -- (3) per-night closed + effective availability check; (4) accumulate price snapshot.
  v_d := p_check_in;
  while v_d < p_check_out loop
    select a.is_closed, a.closed_to_arrival, a.closed_to_departure
      into v_is_closed, v_cta, v_ctd
    from public.availability a
    where a.room_type_id = p_room_type_id and a.date = v_d;

    if coalesce(v_is_closed, false) then
      raise exception 'DATE_CLOSED: % is not available', v_d using errcode = '23514';
    end if;
    if v_d = p_check_in and coalesce(v_cta, false) then
      raise exception 'CLOSED_TO_ARRIVAL: arrival not allowed on %', v_d using errcode = '23514';
    end if;

    v_eff := public.effective_units(p_room_type_id, v_d);
    if v_eff < p_units then
      raise exception 'NO_AVAILABILITY: insufficient units on % (need %, have %)', v_d, p_units, v_eff
        using errcode = '23514';
    end if;

    v_nightly_total := v_nightly_total + public.resolve_nightly_price_dzd(p_room_type_id, v_d);
    v_d := v_d + 1;
  end loop;

  -- closed_to_departure checked on the checkout date.
  select a.closed_to_departure into v_ctd
    from public.availability a
   where a.room_type_id = p_room_type_id and a.date = p_check_out;
  if coalesce(v_ctd, false) then
    raise exception 'CLOSED_TO_DEPARTURE: departure not allowed on %', p_check_out using errcode = '23514';
  end if;

  v_nightly_total := v_nightly_total * p_units;

  -- Extra-guest fee: charged per guest beyond base_occupancy per night.
  if v_room.base_occupancy is not null and (p_adults + p_children) > (v_room.base_occupancy * p_units) then
    v_extra_fee := v_room.extra_guest_fee_dzd
                 * ((p_adults + p_children) - (v_room.base_occupancy * p_units))
                 * (p_check_out - p_check_in);
  end if;

  -- (4) money snapshot. taxable base = nightly + cleaning + extra-guest (commission base).
  v_taxable        := v_nightly_total + (v_room.cleaning_fee_dzd * p_units) + v_extra_fee;
  v_service_fee    := 0;  -- guest-side platform fee (0 in v1; placeholder for future)
  v_commission_amt := round(v_taxable * v_commission_bps / 10000.0)::int;
  v_total          := v_taxable + v_service_fee;
  v_host_payout    := v_taxable - v_commission_amt;

  -- (5) status + deadlines.
  if v_instant_book then
    v_status           := 'awaiting_payment';
    v_expires_at       := now() + make_interval(mins => v_settings.payment_window_minutes);
    v_payment_deadline := v_expires_at;
  else
    v_status           := 'requested';
    v_expires_at       := now() + make_interval(hours => v_settings.request_expiry_hours);
    v_payment_deadline := null;
  end if;

  v_code := 'BK-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  -- (5) insert booking.
  insert into public.bookings (
    code, property_id, room_type_id, guest_id, host_profile_id,
    check_in, check_out, adults, children, units, status,
    nightly_subtotal_dzd, cleaning_fee_dzd, extra_guest_fee_dzd, discount_dzd,
    service_fee_dzd, total_dzd, commission_bps, commission_amount_dzd, host_payout_dzd,
    cancellation_tier, payment_deadline, special_requests, is_single_unit
  ) values (
    v_code, p_property_id, p_room_type_id, v_guest_id, v_host_profile_id,
    p_check_in, p_check_out, p_adults, p_children, p_units, v_status,
    v_nightly_total, v_room.cleaning_fee_dzd * p_units, v_extra_fee, 0,
    v_service_fee, v_total, v_commission_bps, v_commission_amt, v_host_payout,
    v_cancellation, v_payment_deadline, p_special_requests, (v_room.inventory_count = 1)
  )
  returning id into v_booking_id;

  -- (6) insert inventory hold for the span.
  insert into public.inventory_holds (booking_id, room_type_id, date_from, date_to, units, status, expires_at)
  values (v_booking_id, p_room_type_id, p_check_in, p_check_out, p_units, 'held', v_expires_at);

  -- (7) return booking id.
  return v_booking_id;
end;
$$;

revoke execute on function public.create_booking(uuid,uuid,date,date,smallint,smallint,smallint,text) from anon;
grant  execute on function public.create_booking(uuid,uuid,date,date,smallint,smallint,smallint,text) to authenticated;

-- ---------------------------------------------------------------------------
-- accept_booking_request (§3): requested → awaiting_payment (host/manager).
-- Sets payment_deadline = now()+request payment window; refreshes hold expiry.
-- ---------------------------------------------------------------------------
create or replace function public.accept_booking_request(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking  public.bookings%rowtype;
  v_settings public.platform_settings%rowtype;
  v_deadline timestamptz;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'NOT_FOUND: booking %', p_booking_id using errcode = 'P0002';
  end if;
  if not (auth.can_act_on_property(v_booking.property_id, 'manager'::public.staff_role) or auth.is_staff()) then
    raise exception 'FORBIDDEN: only host/manager may accept' using errcode = '42501';
  end if;
  if v_booking.status <> 'requested' then
    raise exception 'ILLEGAL_TRANSITION: booking is % not requested', v_booking.status using errcode = '23514';
  end if;

  select * into v_settings from public.platform_settings where id = 1;
  v_deadline := now() + make_interval(mins => v_settings.payment_window_minutes);

  update public.bookings
     set status = 'awaiting_payment',
         payment_deadline = v_deadline
   where id = p_booking_id;

  update public.inventory_holds
     set expires_at = v_deadline
   where booking_id = p_booking_id and status = 'held';
end;
$$;

grant execute on function public.accept_booking_request(uuid) to authenticated;

-- decline_booking_request: requested → declined (host/manager). Releases hold.
create or replace function public.decline_booking_request(p_booking_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if not (auth.can_act_on_property(v_booking.property_id, 'manager'::public.staff_role) or auth.is_staff()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_booking.status <> 'requested' then
    raise exception 'ILLEGAL_TRANSITION: booking is %', v_booking.status using errcode = '23514';
  end if;

  update public.bookings
     set status = 'declined', cancellation_reason = p_reason
   where id = p_booking_id;
  update public.inventory_holds set status = 'released'
   where booking_id = p_booking_id and status = 'held';
end;
$$;

grant execute on function public.decline_booking_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- quote_refund (§6): table-driven refund quote from cancellation_policies.
-- Returns refund amount in whole DZD for the booking, given now().
-- ---------------------------------------------------------------------------
create or replace function public.quote_refund(p_booking_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_booking   public.bookings%rowtype;
  v_policy    public.cancellation_policies%rowtype;
  v_checkin_at timestamptz;
  v_hours_before numeric;
  v_refundable integer;
  v_refund    integer := 0;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'NOT_FOUND: booking %', p_booking_id using errcode = 'P0002';
  end if;

  select * into v_policy from public.cancellation_policies where tier = v_booking.cancellation_tier;

  -- Refundable base = total − service_fee (service fee never refundable).
  v_refundable := greatest(v_booking.total_dzd - v_booking.service_fee_dzd, 0);

  -- check_in at the property's checkin_time (fallback midnight) → hours before.
  v_checkin_at := (v_booking.check_in::timestamp
                   + coalesce((select checkin_time from public.properties where id = v_booking.property_id), '00:00'))
                   at time zone 'UTC';
  v_hours_before := extract(epoch from (v_checkin_at - now())) / 3600.0;

  if v_hours_before >= v_policy.refund_full_until_hours then
    v_refund := v_refundable;                                   -- 100%
  elsif v_policy.partial_until_hours is not null
        and v_hours_before >= v_policy.partial_until_hours then
    v_refund := round(v_refundable * v_policy.refund_partial_pct / 100.0)::int;  -- partial
  else
    v_refund := 0;
  end if;

  return v_refund;
end;
$$;

grant execute on function public.quote_refund(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_booking (§3/§6): guest (within window) or host/manager cancels.
-- requested/awaiting_payment → cancelled (release hold, no refund engine).
-- confirmed → cancelled (run refund engine; cancel-with-refund needs manager if host-side).
-- Writes a refund transaction; stamps booking.refund_amount_dzd.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking   public.bookings%rowtype;
  v_uid       uuid := auth.uid();
  v_is_guest  boolean;
  v_is_host_mgr boolean;
  v_is_admin  boolean := auth.is_staff();
  v_refund    integer := 0;
  v_parent_txn public.transactions%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'NOT_FOUND: booking %', p_booking_id using errcode = 'P0002';
  end if;

  v_is_guest    := (v_booking.guest_id = v_uid);
  v_is_host_mgr := auth.can_act_on_property(v_booking.property_id, 'manager'::public.staff_role);

  if not (v_is_guest or v_is_host_mgr or v_is_admin) then
    raise exception 'FORBIDDEN: not permitted to cancel this booking' using errcode = '42501';
  end if;

  if v_booking.status in ('requested','awaiting_payment') then
    -- Pre-payment: simple cancel, release hold, no money moved.
    update public.bookings
       set status = 'cancelled', cancelled_by = v_uid, cancellation_reason = p_reason,
           cancelled_at = now()
     where id = p_booking_id;
    update public.inventory_holds set status = 'released'
     where booking_id = p_booking_id and status = 'held';
    return 0;

  elsif v_booking.status = 'confirmed' then
    -- Refund engine. Host/manager cancelling a confirmed booking requires manager capability
    -- (guests may cancel their own; reception cannot reach here).
    v_refund := public.quote_refund(p_booking_id);

    update public.bookings
       set status = 'cancelled', cancelled_by = v_uid, cancellation_reason = p_reason,
           cancelled_at = now(), refund_amount_dzd = v_refund
     where id = p_booking_id;

    -- Release the (already-captured) inventory by marking holds released.
    update public.inventory_holds set status = 'released'
     where booking_id = p_booking_id and status in ('held','captured');

    -- Record refund transaction + adjust the parent payment transaction.
    select * into v_parent_txn from public.transactions
      where booking_id = p_booking_id and kind = 'payment' and status = 'paid'
      order by created_at desc limit 1;

    if v_refund > 0 and v_parent_txn.id is not null then
      insert into public.transactions (
        booking_id, kind, method, provider, status, amount_dzd,
        commission_bps, commission_amount_dzd, currency
      ) values (
        p_booking_id, 'refund', v_parent_txn.method, v_parent_txn.provider, 'pending', v_refund,
        v_booking.commission_bps, 0, 'DZD'
      );

      update public.transactions
         set refunded_dzd = refunded_dzd + v_refund,
             status = case when (refunded_dzd + v_refund) >= amount_dzd
                           then 'refunded' else 'partially_refunded' end
       where id = v_parent_txn.id;
    end if;

    return v_refund;
  else
    raise exception 'ILLEGAL_TRANSITION: cannot cancel a booking in status %', v_booking.status
      using errcode = '23514';
  end if;
end;
$$;

grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- expire_holds (§5): held → expired past expires_at; bookings → expired;
-- pending payment txns → expired. Run by pg_cron / payments-reconcile.
-- ---------------------------------------------------------------------------
create or replace function public.expire_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  with expired_holds as (
    update public.inventory_holds h
       set status = 'expired'
     where h.status = 'held'
       and h.expires_at <= now()
    returning h.booking_id
  ),
  expired_bookings as (
    update public.bookings b
       set status = 'expired'
     where b.id in (select booking_id from expired_holds)
       and b.status in ('requested','awaiting_payment')
    returning b.id
  )
  update public.transactions t
     set status = 'expired'
   where t.booking_id in (select id from expired_bookings)
     and t.status in ('pending','processing');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.expire_holds() to service_role;

-- ---------------------------------------------------------------------------
-- complete_stays (§3): checked_in / past-checkout confirmed → completed.
-- ---------------------------------------------------------------------------
create or replace function public.complete_stays()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  update public.bookings b
     set status = 'completed', completed_at = now()
   where b.status = 'checked_in'
     and b.check_out <= current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.complete_stays() to service_role;

-- ---------------------------------------------------------------------------
-- apply_payment_event (§8): atomic webhook apply — capture hold + confirm booking.
-- Called by the payments-webhook-chargily Edge Function (service role).
-- Terminal/out-of-order guard: paid wins a late failed/canceled.
-- ---------------------------------------------------------------------------
create or replace function public.apply_payment_event(
  p_provider     payment_provider,
  p_provider_ref text,
  p_kind         text,            -- 'paid' | 'failed' | 'canceled'
  p_amount_dzd   integer default null,
  p_gateway_fee_dzd integer default 0,
  p_event_id     text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_txn     public.transactions%rowtype;
  v_booking public.bookings%rowtype;
begin
  -- Lock the transaction by (provider, provider_ref).
  select * into v_txn from public.transactions
    where provider = p_provider and provider_ref = p_provider_ref
    for update;

  if v_txn.id is null then
    return 'ignored';  -- no matching transaction
  end if;

  -- Terminal guard: paid/refunded states are not overwritten by a late failed/canceled.
  if v_txn.status in ('paid','refunded','partially_refunded')
     and p_kind in ('failed','canceled') then
    return 'stale';
  end if;

  if p_kind = 'paid' then
    update public.transactions
       set status = 'paid',
           paid_at = now(),
           gateway_fee_dzd = coalesce(p_gateway_fee_dzd, 0),
           host_payout_dzd = amount_dzd - commission_amount_dzd - coalesce(p_gateway_fee_dzd, 0),
           provider_status = 'paid'
     where id = v_txn.id;

    -- Capture the hold; confirm the booking.
    if v_txn.booking_id is not null then
      update public.inventory_holds
         set status = 'captured'
       where booking_id = v_txn.booking_id and status = 'held';

      update public.bookings
         set status = 'confirmed', confirmed_at = now()
       where id = v_txn.booking_id and status = 'awaiting_payment';

      select * into v_booking from public.bookings where id = v_txn.booking_id;

      insert into public.notifications (user_id, type, title_ar, title_fr, title_en, data)
      values (
        v_booking.guest_id, 'booking_confirmed',
        'تم تأكيد حجزك', 'Votre réservation est confirmée', 'Your booking is confirmed',
        jsonb_build_object('booking_id', v_booking.id, 'code', v_booking.code)
      );
    end if;

    return 'applied';

  elsif p_kind in ('failed','canceled') then
    update public.transactions
       set status = case when p_kind = 'failed' then 'failed' else 'expired' end,
           provider_status = p_kind
     where id = v_txn.id;

    if v_txn.booking_id is not null then
      update public.inventory_holds set status = 'released'
       where booking_id = v_txn.booking_id and status = 'held';
      update public.bookings set status = 'expired'
       where id = v_txn.booking_id and status = 'awaiting_payment';
    end if;

    return 'applied';
  end if;

  return 'ignored';
end;
$$;

grant execute on function public.apply_payment_event(payment_provider,text,text,integer,integer,text) to service_role;

-- ---------------------------------------------------------------------------
-- Role grant helper (super_admin only) — writes user_roles + audit (§5 doc 02).
-- ---------------------------------------------------------------------------
create or replace function public.grant_role(p_user_id uuid, p_role app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not auth.has_role('super_admin') then
    raise exception 'FORBIDDEN: super_admin only' using errcode = '42501';
  end if;
  insert into public.user_roles (user_id, role, granted_by)
  values (p_user_id, p_role, auth.uid())
  on conflict (user_id, role) do nothing;

  insert into public.audit_log (actor_id, actor_role, action, target_type, target_id, after)
  values (auth.uid(), 'super_admin', 'user.grant_role', 'profiles', p_user_id,
          jsonb_build_object('role', p_role));
end;
$$;

grant execute on function public.grant_role(uuid, app_role) to authenticated;
