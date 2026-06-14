-- =====================================================================
-- Host stay-lifecycle RPCs (front-desk): confirmed -> checked_in -> completed,
-- and confirmed -> no_show. The bookings_guard_transition trigger already permits
-- these status moves (and auto-stamps checked_in_at); these RPCs add host/staff
-- authorization (mirroring accept_booking_request) so hosts can run arrivals/
-- departures from the mobile app. check-in/out are reception-allowed; no-show is
-- manager-level (more consequential). Today only the admin cron complete_stays exists.
-- =====================================================================

create or replace function public.host_check_in(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_b public.bookings%rowtype;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if v_b.id is null then raise exception 'NOT_FOUND: booking %', p_booking_id using errcode = 'P0002'; end if;
  if not (public.can_act_on_property(v_b.property_id, 'reception'::public.staff_role) or public.is_staff()) then
    raise exception 'FORBIDDEN: only host/staff may check in' using errcode = '42501';
  end if;
  if v_b.status <> 'confirmed' then
    raise exception 'ILLEGAL_TRANSITION: booking is % not confirmed', v_b.status using errcode = '23514';
  end if;
  update public.bookings set status = 'checked_in', checked_in_at = now() where id = p_booking_id;
end;
$$;

create or replace function public.host_check_out(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_b public.bookings%rowtype;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if v_b.id is null then raise exception 'NOT_FOUND: booking %', p_booking_id using errcode = 'P0002'; end if;
  if not (public.can_act_on_property(v_b.property_id, 'reception'::public.staff_role) or public.is_staff()) then
    raise exception 'FORBIDDEN: only host/staff may check out' using errcode = '42501';
  end if;
  if v_b.status <> 'checked_in' then
    raise exception 'ILLEGAL_TRANSITION: booking is % not checked_in', v_b.status using errcode = '23514';
  end if;
  update public.bookings set status = 'completed', completed_at = now() where id = p_booking_id;
end;
$$;

create or replace function public.host_mark_no_show(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_b public.bookings%rowtype;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if v_b.id is null then raise exception 'NOT_FOUND: booking %', p_booking_id using errcode = 'P0002'; end if;
  if not (public.can_act_on_property(v_b.property_id, 'manager'::public.staff_role) or public.is_staff()) then
    raise exception 'FORBIDDEN: only manager/host may mark no-show' using errcode = '42501';
  end if;
  if v_b.status <> 'confirmed' then
    raise exception 'ILLEGAL_TRANSITION: booking is % not confirmed', v_b.status using errcode = '23514';
  end if;
  update public.bookings set status = 'no_show' where id = p_booking_id;
end;
$$;

grant execute on function public.host_check_in(uuid) to authenticated;
grant execute on function public.host_check_out(uuid) to authenticated;
grant execute on function public.host_mark_no_show(uuid) to authenticated;
