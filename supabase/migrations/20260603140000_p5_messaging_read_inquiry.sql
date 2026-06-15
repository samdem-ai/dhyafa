-- =====================================================================
-- P5 messaging: mark-conversation-read + pre-booking inquiry start.
--
-- The schema already has messages.read_at and a send_message(conversation_id,
-- body) RPC that requires an EXISTING conversation. The mobile rework needs two
-- more capabilities:
--   1. mark_conversation_read — clear the unread badge when a thread is opened
--      (set read_at on the *other* party's messages; mirrors mark_notifications_read).
--   2. start_inquiry — let a guest message a host about a property BEFORE booking
--      (kind='inquiry'). Find-or-create the (guest, host, property) inquiry thread,
--      post the first message, notify the host. send_message handles replies after.
-- Both SECURITY DEFINER with explicit membership checks (RLS is bypassed).
-- =====================================================================

-- ---------------------------------------------------------------------
-- mark_conversation_read: mark the counterparty's unread messages as read.
-- Returns the number of messages newly marked read.
-- ---------------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c     public.conversations%rowtype;
  v_count integer;
begin
  select * into v_c from public.conversations where id = p_conversation_id;
  if v_c.id is null then raise exception 'CONVERSATION_NOT_FOUND' using errcode='P0002'; end if;

  if not (v_c.guest_id = auth.uid() or public.is_host_member(v_c.host_profile_id)) then
    raise exception 'NOT_AUTHORIZED' using errcode='42501';
  end if;

  update public.messages
     set read_at = now()
   where conversation_id = p_conversation_id
     and read_at is null
     and sender_id <> auth.uid();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- start_inquiry: guest -> host pre-booking question about a property.
-- Find-or-create the inquiry conversation for (guest=auth.uid, property's host,
-- property), post the first message, notify the host owner. Returns conv id.
-- ---------------------------------------------------------------------
create or replace function public.start_inquiry(p_property_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p       public.properties%rowtype;
  v_guest   uuid := auth.uid();
  v_conv    uuid;
  v_msg     uuid;
  v_owner   uuid;
begin
  if v_guest is null then raise exception 'NOT_AUTHENTICATED' using errcode='42501'; end if;
  if btrim(coalesce(p_body,'')) = '' then raise exception 'EMPTY_BODY' using errcode='22023'; end if;

  select * into v_p from public.properties where id = p_property_id;
  if v_p.id is null then raise exception 'PROPERTY_NOT_FOUND' using errcode='P0002'; end if;
  if v_p.status <> 'approved' then
    raise exception 'PROPERTY_NOT_AVAILABLE: %', v_p.status using errcode='22023';
  end if;

  -- A host inquiring about their own listing is meaningless.
  if public.is_host_member(v_p.host_profile_id) then
    raise exception 'OWN_PROPERTY' using errcode='42501';
  end if;

  -- Reuse the most recent open inquiry thread for this (guest, host, property).
  select id into v_conv
    from public.conversations
   where kind = 'inquiry'
     and guest_id = v_guest
     and host_profile_id = v_p.host_profile_id
     and property_id = p_property_id
   order by created_at desc
   limit 1;

  if v_conv is null then
    insert into public.conversations (kind, property_id, guest_id, host_profile_id, last_message_at)
    values ('inquiry', p_property_id, v_guest, v_p.host_profile_id, now())
    returning id into v_conv;
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conv, v_guest, btrim(p_body))
  returning id into v_msg;

  update public.conversations set last_message_at = now() where id = v_conv;

  -- Notify the host owner (mirror send_message's notification shape).
  select owner_id into v_owner from public.host_profiles where id = v_p.host_profile_id;
  if v_owner is not null and v_owner <> v_guest then
    insert into public.notifications (user_id, type, title_ar, title_fr, title_en, data)
    values (v_owner, 'message_received',
            'استفسار جديد', 'Nouvelle demande', 'New inquiry',
            jsonb_build_object('conversation_id', v_conv, 'message_id', v_msg, 'property_id', p_property_id));
  end if;

  return v_conv;
end;
$$;

-- ---------------------------------------------------------------------
-- toggle_wishlist: add/remove a property from the user's default wishlist.
-- Find-or-creates the default wishlist (avoids a client multi-step race), then
-- toggles membership. Returns true if the property is now saved, false if removed.
-- ---------------------------------------------------------------------
create or replace function public.toggle_wishlist(p_property_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_wl    uuid;
  v_p     uuid;
  v_saved boolean;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode='42501'; end if;

  select id into v_p from public.properties where id = p_property_id;
  if v_p is null then raise exception 'PROPERTY_NOT_FOUND' using errcode='P0002'; end if;

  -- Find-or-create the user's default wishlist.
  select id into v_wl from public.wishlists where user_id = v_user and is_default limit 1;
  if v_wl is null then
    insert into public.wishlists (user_id, name, is_default)
    values (v_user, 'Saved', true)
    returning id into v_wl;
  end if;

  if exists (select 1 from public.wishlist_items where wishlist_id = v_wl and property_id = p_property_id) then
    delete from public.wishlist_items where wishlist_id = v_wl and property_id = p_property_id;
    v_saved := false;
  else
    insert into public.wishlist_items (wishlist_id, property_id) values (v_wl, p_property_id);
    v_saved := true;
  end if;

  return v_saved;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.start_inquiry(uuid, text) to authenticated;
grant execute on function public.toggle_wishlist(uuid) to authenticated;
