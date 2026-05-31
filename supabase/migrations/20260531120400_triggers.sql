-- ============================================================================
-- 20260531120400_triggers.sql
-- Dyafa (دافة) — Triggers: updated_at, booking transition guard (§3),
-- audit_log append-only guard, geo/geo_fuzzed maintenance, rating denormalization,
-- host-verification gate on property approval (§10).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at on every mutable table (set_updated_at() defined in functions migration).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','host_profiles','hotel_staff','properties','room_types','availability',
    'bookings','transactions','payouts','reviews','review_replies','wishlists',
    'featured_collections','promo_banners','home_rails','disputes','platform_settings'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at();',
      'trg_set_updated_at_' || t, t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- properties: geo / geo_fuzzed maintenance from lat/lng (§9).
-- geo = exact point; geo_fuzzed = lat/lng snapped to a coarse grid (~400m default).
-- ---------------------------------------------------------------------------
-- search_path includes `extensions` so PostGIS functions/types resolve unqualified
-- (Supabase installs PostGIS in the `extensions` schema). `public` is included for
-- platform_settings. Not pinned to '' because PostGIS is not relocatable to public.
create or replace function public.properties_maintain_geo()
returns trigger
language plpgsql
security definer
set search_path = extensions, public
as $$
declare
  v_fuzz_m   int;
  v_grid_deg numeric;
  v_flat     numeric;
  v_flng     numeric;
begin
  if new.lat is null or new.lng is null then
    new.geo := null;
    new.geo_fuzzed := null;
    return new;
  end if;

  new.geo := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;

  -- Fuzz: round to a grid roughly geo_fuzz_meters wide. 1 deg lat ~= 111_320 m.
  select geo_fuzz_meters into v_fuzz_m from public.platform_settings where id = 1;
  v_fuzz_m := coalesce(v_fuzz_m, 400);
  v_grid_deg := v_fuzz_m / 111320.0;
  if v_grid_deg <= 0 then
    v_grid_deg := 0.0036;  -- ~400m fallback
  end if;

  v_flat := round((new.lat / v_grid_deg)) * v_grid_deg;
  v_flng := round((new.lng / v_grid_deg)) * v_grid_deg;
  new.geo_fuzzed := ST_SetSRID(ST_MakePoint(v_flng, v_flat), 4326)::geography;

  return new;
end;
$$;

create trigger trg_properties_maintain_geo
  before insert or update of lat, lng on public.properties
  for each row execute function public.properties_maintain_geo();

-- ---------------------------------------------------------------------------
-- bookings: maintain is_single_unit from room_types.inventory_count (backstop for
-- the single-unit exclusion constraint; the create_booking RPC also sets it).
-- ---------------------------------------------------------------------------
create or replace function public.bookings_set_single_unit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select (rt.inventory_count = 1) into new.is_single_unit
  from public.room_types rt
  where rt.id = new.room_type_id;
  new.is_single_unit := coalesce(new.is_single_unit, false);
  return new;
end;
$$;

create trigger trg_bookings_set_single_unit
  before insert on public.bookings
  for each row execute function public.bookings_set_single_unit();

-- ---------------------------------------------------------------------------
-- bookings: status-transition guard (§3). Illegal transitions raise.
-- Allowed map below mirrors the §3 transition table. INSERT entry states are
-- restricted to requested / awaiting_payment (set by create_booking RPC).
-- ---------------------------------------------------------------------------
create or replace function public.bookings_guard_transition()
returns trigger
language plpgsql
as $$
declare
  ok boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status not in ('requested','awaiting_payment') then
      raise exception 'ILLEGAL_INITIAL_STATE: bookings must start as requested or awaiting_payment, got %', new.status
        using errcode = '23514';
    end if;
    return new;
  end if;

  -- UPDATE: if status unchanged, allow (other column edits handled by RLS).
  if new.status = old.status then
    return new;
  end if;

  ok := case old.status
    when 'requested'        then new.status in ('awaiting_payment','declined','expired','cancelled')
    when 'awaiting_payment' then new.status in ('confirmed','expired','cancelled')
    when 'confirmed'        then new.status in ('checked_in','cancelled','no_show')
    when 'checked_in'       then new.status in ('completed','cancelled')
    else false   -- declined / expired / cancelled / no_show / completed are terminal
  end;

  if not ok then
    raise exception 'ILLEGAL_TRANSITION: % -> % is not permitted', old.status, new.status
      using errcode = '23514';
  end if;

  -- Stamp lifecycle timestamps to match the new state.
  if new.status = 'confirmed'  and new.confirmed_at  is null then new.confirmed_at  := now(); end if;
  if new.status = 'checked_in' and new.checked_in_at is null then new.checked_in_at := now(); end if;
  if new.status = 'completed'  and new.completed_at  is null then new.completed_at  := now(); end if;
  if new.status in ('cancelled','declined','expired','no_show') and new.cancelled_at is null then
    new.cancelled_at := now();
  end if;

  return new;
end;
$$;

create trigger trg_bookings_guard_transition
  before insert or update on public.bookings
  for each row execute function public.bookings_guard_transition();

-- ---------------------------------------------------------------------------
-- properties: block status → 'approved' unless owning host identity_status='verified' (§10).
-- ---------------------------------------------------------------------------
create or replace function public.properties_guard_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity verification_status;
begin
  if tg_op = 'UPDATE' and new.status = 'approved' and old.status <> 'approved' then
    select identity_status into v_identity
    from public.host_profiles where id = new.host_profile_id;
    if v_identity is distinct from 'verified' then
      raise exception 'HOST_NOT_VERIFIED: cannot approve listing until host identity is verified'
        using errcode = '23514';
    end if;
    if new.approved_at is null then new.approved_at := now(); end if;
    if new.published_at is null then new.published_at := now(); end if;
  end if;
  if tg_op = 'UPDATE' and new.status = 'pending' and old.status = 'draft' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_properties_guard_approval
  before update on public.properties
  for each row execute function public.properties_guard_approval();

-- ---------------------------------------------------------------------------
-- payouts: block creation unless owning host payout_status='verified' (§10 / doc 02).
-- ---------------------------------------------------------------------------
create or replace function public.payouts_guard_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payout verification_status;
begin
  select payout_status into v_payout from public.host_profiles where id = new.host_profile_id;
  if v_payout is distinct from 'verified' then
    raise exception 'PAYOUT_NOT_VERIFIED: host payout account is not verified' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_payouts_guard_verified
  before insert on public.payouts
  for each row execute function public.payouts_guard_verified();

-- ---------------------------------------------------------------------------
-- audit_log: append-only. Block UPDATE and DELETE from every path.
-- ---------------------------------------------------------------------------
create or replace function public.audit_log_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AUDIT_LOG_IMMUTABLE: audit_log is append-only (% blocked)', tg_op
    using errcode = '0A000';
end;
$$;

create trigger trg_audit_log_no_update
  before update on public.audit_log
  for each row execute function public.audit_log_block_mutation();
create trigger trg_audit_log_no_delete
  before delete on public.audit_log
  for each row execute function public.audit_log_block_mutation();

-- ---------------------------------------------------------------------------
-- reviews: maintain properties.rating_avg / review_count denormalization.
-- Recompute from published, non-deleted reviews for the property.
-- ---------------------------------------------------------------------------
create or replace function public.reviews_refresh_property_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property_id uuid := coalesce(new.property_id, old.property_id);
  v_avg numeric(3,2);
  v_cnt int;
begin
  select round(avg(overall)::numeric, 2), count(*)
    into v_avg, v_cnt
  from public.reviews
  where property_id = v_property_id
    and status = 'published'
    and deleted_at is null;

  update public.properties
     set rating_avg = coalesce(v_avg, 0),
         review_count = coalesce(v_cnt, 0)
   where id = v_property_id;

  return null;  -- AFTER trigger
end;
$$;

create trigger trg_reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_refresh_property_rating();

-- ---------------------------------------------------------------------------
-- reviews: set published_at when a review transitions to published.
-- ---------------------------------------------------------------------------
create or replace function public.reviews_stamp_published()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and (old.status is distinct from 'published') and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_reviews_stamp_published
  before update on public.reviews
  for each row execute function public.reviews_stamp_published();

-- ---------------------------------------------------------------------------
-- conversations: bump last_message_at when a message is inserted.
-- ---------------------------------------------------------------------------
create or replace function public.messages_bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return null;
end;
$$;

create trigger trg_messages_bump_conversation
  after insert on public.messages
  for each row execute function public.messages_bump_conversation();
