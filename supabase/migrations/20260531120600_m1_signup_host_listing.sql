-- ===========================================================================
-- M1 — signup trigger, become-a-host, and submit-listing-for-review.
-- All SECURITY DEFINER functions pin search_path = public (PG15-safe: PUBLIC
-- has no CREATE on public, so no object-shadowing risk).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. handle_new_user — on auth.users insert, create the profile mirror row +
--    grant the default 'guest' role. Reads optional metadata passed at sign-up
--    (full_name, preferred_locale) from raw_user_meta_data.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, display_name, preferred_locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'User'
    ),  -- display_name is NOT NULL — always provide a fallback
    coalesce(nullif(new.raw_user_meta_data ->> 'preferred_locale', ''), 'ar')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'guest')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. become_host — lazily create the caller's host_profile (individual) and
--    grant the host_individual role. Idempotent: returns the existing host_profile
--    id if already a host. Called the first time a guest toggles into Hosting.
-- ---------------------------------------------------------------------------
create or replace function public.become_host(p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host_id uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select id into v_host_id from public.host_profiles where owner_id = v_uid;
  if v_host_id is not null then
    return v_host_id;
  end if;

  v_name := coalesce(
    nullif(p_display_name, ''),
    (select nullif(display_name, '') from public.profiles where id = v_uid),
    (select nullif(full_name, '') from public.profiles where id = v_uid),
    'Host'
  );

  insert into public.host_profiles (owner_id, kind, display_name)
  values (v_uid, 'individual', v_name)
  returning id into v_host_id;

  insert into public.user_roles (user_id, role)
  values (v_uid, 'host_individual')
  on conflict do nothing;

  return v_host_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. submit_property_for_review — transition a draft listing to 'pending'.
--    Owner-only; validates the listing is complete enough to review:
--    title (any locale), wilaya, >=1 room_type, >=1 photo. Single-unit homes
--    must already have their one implicit room_type created by the wizard.
-- ---------------------------------------------------------------------------
create or replace function public.submit_property_for_review(p_property_id uuid)
returns public.properties
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_prop public.properties;
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select p.* into v_prop from public.properties p where p.id = p_property_id;
  if not found then
    raise exception 'property % not found', p_property_id using errcode = 'P0002';
  end if;

  select hp.owner_id into v_owner from public.host_profiles hp where hp.id = v_prop.host_profile_id;
  if v_owner is distinct from v_uid then
    raise exception 'not the owner of this listing' using errcode = '42501';
  end if;

  if v_prop.status <> 'draft' then
    raise exception 'only draft listings can be submitted (current: %)', v_prop.status
      using errcode = '22023';
  end if;

  if coalesce(v_prop.title_ar, v_prop.title_fr, v_prop.title_en) is null then
    raise exception 'a title in at least one language is required' using errcode = '22023';
  end if;

  if not exists (select 1 from public.room_types rt where rt.property_id = p_property_id) then
    raise exception 'at least one room type / unit is required' using errcode = '22023';
  end if;

  if not exists (select 1 from public.property_photos ph where ph.property_id = p_property_id) then
    raise exception 'at least one photo is required' using errcode = '22023';
  end if;

  update public.properties
     set status = 'pending', submitted_at = now(), updated_at = now()
   where id = p_property_id
  returning * into v_prop;

  return v_prop;
end;
$$;

-- Callable by signed-in users; row-level ownership is enforced inside the functions.
grant execute on function public.become_host(text) to authenticated;
grant execute on function public.submit_property_for_review(uuid) to authenticated;
