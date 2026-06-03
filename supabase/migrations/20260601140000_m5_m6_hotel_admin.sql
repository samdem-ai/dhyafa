-- ===========================================================================
-- M5 (hotel dashboard) + M6 (admin) DB layer.
--   add_hotel_staff       — hotel owner adds an existing user as reception/manager
--   set_availability_range— bulk close/open + price-override + min-stay over a range
--   run_payouts           — admin generates per-host payouts for a period (idempotent)
-- All SECURITY DEFINER + search_path=public, caller-identity guarded.
-- ===========================================================================

create or replace function public.add_hotel_staff(p_user_id uuid, p_staff_role staff_role)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hp uuid;
  v_id uuid;
begin
  select id into v_hp from public.host_profiles where owner_id = auth.uid();
  if v_hp is null then
    raise exception 'NOT_A_HOST' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'CANNOT_ADD_SELF' using errcode = '22023';
  end if;

  insert into public.hotel_staff (host_profile_id, user_id, staff_role, is_active, accepted_at)
  values (v_hp, p_user_id, p_staff_role, true, now())
  on conflict (host_profile_id, user_id)
    do update set staff_role = excluded.staff_role, is_active = true, updated_at = now()
  returning id into v_id;

  insert into public.user_roles (user_id, role)
  values (p_user_id, 'hotel_staff')
  on conflict (user_id, role) do nothing;

  return v_id;
end;
$$;

create or replace function public.set_availability_range(
  p_room_type_id      uuid,
  p_from              date,
  p_to                date,                 -- exclusive
  p_is_closed         boolean  default null,
  p_price_override_dzd integer default null,
  p_min_stay          smallint default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pid   uuid;
  v_units smallint;
  v_d     date;
  v_n     integer := 0;
begin
  if p_to <= p_from then
    raise exception 'INVALID_RANGE' using errcode = '22023';
  end if;
  select property_id, inventory_count into v_pid, v_units
    from public.room_types where id = p_room_type_id;
  if v_pid is null then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.can_act_on_property(v_pid, 'reception') then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  v_d := p_from;
  while v_d < p_to loop
    insert into public.availability (room_type_id, date, units_open, is_closed, price_override_dzd, min_stay)
    values (p_room_type_id, v_d, coalesce(v_units, 1), coalesce(p_is_closed, false), p_price_override_dzd, p_min_stay)
    on conflict (room_type_id, date) do update set
      is_closed          = coalesce(p_is_closed, public.availability.is_closed),
      price_override_dzd = coalesce(p_price_override_dzd, public.availability.price_override_dzd),
      min_stay           = coalesce(p_min_stay, public.availability.min_stay),
      updated_at         = now();
    v_n := v_n + 1;
    v_d := v_d + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function public.run_payouts(p_period_start date, p_period_end date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer := 0;
begin
  if not (public.has_role('admin') or public.has_role('super_admin')) then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
  if p_period_end < p_period_start then
    raise exception 'INVALID_PERIOD' using errcode = '22023';
  end if;

  insert into public.payouts (
    host_profile_id, status, gross_dzd, commission_amount_dzd, net_dzd,
    period_start, period_end, method, reference
  )
  select b.host_profile_id, 'pending',
         sum(b.total_dzd), sum(b.commission_amount_dzd), sum(b.host_payout_dzd),
         p_period_start, p_period_end, 'ccp',
         'PO-' || to_char(p_period_start, 'YYYYMM')
  from public.bookings b
  where b.status in ('confirmed', 'checked_in', 'completed')
    and b.check_out >= p_period_start
    and b.check_out <= p_period_end
    and not exists (
      select 1 from public.payouts po
      where po.host_profile_id = b.host_profile_id
        and po.period_start = p_period_start
        and po.period_end = p_period_end
    )
  group by b.host_profile_id;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

grant execute on function public.add_hotel_staff(uuid, staff_role) to authenticated;
grant execute on function public.set_availability_range(uuid, date, date, boolean, integer, smallint) to authenticated;
grant execute on function public.run_payouts(date, date) to authenticated;
