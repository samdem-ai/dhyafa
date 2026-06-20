-- ===========================================================================
-- Guest-facing availability reader (P9)
-- ---------------------------------------------------------------------------
-- The customer date picker needs to know which nights are unavailable BEFORE
-- the guest commits to a booking. Two kinds of unavailability:
--   1. host-blocked  → availability.is_closed (guests may already read this via
--                       the availability_public_read RLS policy)
--   2. sold out       → effective_units(room_type, date) <= 0, which depends on
--                       OTHER guests' bookings + active holds — rows a guest
--                       cannot read directly (bookings RLS scopes to own rows,
--                       inventory_holds has no client read).
--
-- This SECURITY DEFINER function returns, per date in the window, the closed
-- flag + remaining units (via the existing definer effective_units) + any price
-- override, WITHOUT leaking individual bookings. It only returns rows for an
-- APPROVED, non-deleted property (mirroring availability_public_read), so it is
-- safe to grant to anon + authenticated. The authoritative race-safe check
-- remains create_booking(); this is a UX pre-filter only.
-- ===========================================================================

create or replace function public.get_property_availability(
  p_room_type_id uuid,
  p_from date,
  p_to date
)
returns table (
  date date,
  is_closed boolean,
  units_left integer,
  price_override_dzd integer
)
language sql
stable
security definer
set search_path = public
as $$
  with rt as (
    -- Approval gate: empty (→ no rows) unless the room belongs to an approved,
    -- non-deleted property. This is what makes the function safe to expose.
    select rt.id
    from public.room_types rt
    join public.properties p on p.id = rt.property_id
    where rt.id = p_room_type_id
      and p.status = 'approved'
      and p.deleted_at is null
  ),
  days as (
    -- Clamp the window to a sane forward horizon (≤ ~13 months) to bound work.
    select d::date as date
    from generate_series(
      greatest(p_from, current_date),
      least(p_to, greatest(p_from, current_date) + 400),
      interval '1 day'
    ) as g(d)
  )
  select
    days.date,
    coalesce(a.is_closed, false) as is_closed,
    public.effective_units(p_room_type_id, days.date) as units_left,
    a.price_override_dzd
  from days
  cross join rt
  left join public.availability a
    on a.room_type_id = p_room_type_id and a.date = days.date
  order by days.date;
$$;

grant execute on function public.get_property_availability(uuid, date, date) to anon, authenticated;
