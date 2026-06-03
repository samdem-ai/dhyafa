-- ===========================================================================
-- M3 — reviews, messaging, notifications RPCs.
-- All SECURITY DEFINER + search_path=public; each enforces caller identity so
-- they are safe to grant to `authenticated`. They converge on the same tables
-- the triggers (reviews_refresh_property_rating, messages_bump_conversation)
-- already maintain.
-- ===========================================================================

-- Helper: does the caller control this host_profile (owner or active staff)?
create or replace function public.is_host_member(p_host_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.host_profiles hp
    where hp.id = p_host_profile_id
      and (
        hp.owner_id = auth.uid()
        or exists (
          select 1 from public.hotel_staff hs
          where hs.host_profile_id = hp.id and hs.user_id = auth.uid()
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- submit_review — guest reviews their own COMPLETED booking (one per booking).
-- overall is computed from the provided category scores when not supplied.
-- ---------------------------------------------------------------------------
create or replace function public.submit_review(
  p_booking_id     uuid,
  p_cleanliness    smallint,
  p_accuracy       smallint,
  p_communication  smallint,
  p_location       smallint,
  p_value          smallint,
  p_checkin        smallint,
  p_comment        text default null,
  p_overall        smallint default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b       public.bookings%rowtype;
  v_overall smallint;
  v_id      uuid;
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
  if v_b.status <> 'completed' then
    raise exception 'NOT_COMPLETED: reviews allowed only after a completed stay (status=%)', v_b.status
      using errcode = '22023';
  end if;
  if exists (select 1 from public.reviews where booking_id = p_booking_id) then
    raise exception 'ALREADY_REVIEWED' using errcode = '23505';
  end if;

  v_overall := coalesce(
    p_overall,
    round(
      ( coalesce(p_cleanliness,0) + coalesce(p_accuracy,0) + coalesce(p_communication,0)
      + coalesce(p_location,0) + coalesce(p_value,0) + coalesce(p_checkin,0) )::numeric
      / nullif(
          (p_cleanliness is not null)::int + (p_accuracy is not null)::int
        + (p_communication is not null)::int + (p_location is not null)::int
        + (p_value is not null)::int + (p_checkin is not null)::int, 0)
    )::smallint
  );
  if v_overall is null or v_overall < 1 or v_overall > 5 then
    raise exception 'INVALID_SCORES: provide at least one category score' using errcode = '22023';
  end if;

  insert into public.reviews (
    booking_id, property_id, author_id, target, status, overall,
    cleanliness, accuracy, communication, location, value, checkin,
    comment_text, published_at
  ) values (
    p_booking_id, v_b.property_id, auth.uid(), 'property', 'published', v_overall,
    p_cleanliness, p_accuracy, p_communication, p_location, p_value, p_checkin,
    nullif(btrim(coalesce(p_comment,'')), ''), now()
  )
  returning id into v_id;

  -- Notify the host owner.
  insert into public.notifications (user_id, type, title_ar, title_fr, title_en, data)
  select hp.owner_id, 'review_received',
         'تقييم جديد', 'Nouvel avis', 'New review',
         jsonb_build_object('review_id', v_id, 'property_id', v_b.property_id, 'booking_id', v_b.id)
  from public.host_profiles hp where hp.id = v_b.host_profile_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- host_reply_review — one public reply per review by the property's host/staff.
-- ---------------------------------------------------------------------------
create or replace function public.host_reply_review(p_review_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r   public.reviews%rowtype;
  v_hp  uuid;
  v_id  uuid;
begin
  select * into v_r from public.reviews where id = p_review_id;
  if v_r.id is null then
    raise exception 'REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;
  select host_profile_id into v_hp from public.bookings where id = v_r.booking_id;
  if not public.is_host_member(v_hp) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if btrim(coalesce(p_body,'')) = '' then
    raise exception 'EMPTY_BODY' using errcode = '22023';
  end if;

  insert into public.review_replies (review_id, host_profile_id, author_id, body)
  values (p_review_id, v_hp, auth.uid(), btrim(p_body))
  returning id into v_id;

  insert into public.notifications (user_id, type, title_ar, title_fr, title_en, data)
  values (v_r.author_id, 'review_reply',
          'رد المضيف على تقييمك', 'L''hôte a répondu à votre avis', 'The host replied to your review',
          jsonb_build_object('review_id', p_review_id, 'reply_id', v_id));

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- report_review — routes an abusive/fake review to admin via a dispute row.
-- ---------------------------------------------------------------------------
create or replace function public.report_review(p_review_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r  public.reviews%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  select * into v_r from public.reviews where id = p_review_id;
  if v_r.id is null then raise exception 'REVIEW_NOT_FOUND' using errcode='P0002'; end if;

  insert into public.disputes (booking_id, opened_by, against, category, status, description)
  values (v_r.booking_id, auth.uid(), v_r.author_id, 'other', 'open',
          'Reported review ' || p_review_id::text || ': ' || coalesce(p_reason,''))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_or_create_conversation — one conversation per booking; caller must be a
-- participant (guest or host member). Returns the conversation id.
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_conversation(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b   public.bookings%rowtype;
  v_id  uuid;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if v_b.id is null then raise exception 'BOOKING_NOT_FOUND' using errcode='P0002'; end if;
  if v_b.guest_id <> auth.uid() and not public.is_host_member(v_b.host_profile_id) then
    raise exception 'NOT_AUTHORIZED' using errcode='42501';
  end if;

  select id into v_id from public.conversations where booking_id = p_booking_id;
  if v_id is null then
    insert into public.conversations (kind, property_id, booking_id, guest_id, host_profile_id)
    values ('booking', v_b.property_id, v_b.id, v_b.guest_id, v_b.host_profile_id)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- send_message — participant posts a message; notifies the other party.
-- ---------------------------------------------------------------------------
create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c        public.conversations%rowtype;
  v_is_guest boolean;
  v_id       uuid;
  v_other    uuid;
begin
  if btrim(coalesce(p_body,'')) = '' then raise exception 'EMPTY_BODY' using errcode='22023'; end if;
  select * into v_c from public.conversations where id = p_conversation_id;
  if v_c.id is null then raise exception 'CONVERSATION_NOT_FOUND' using errcode='P0002'; end if;

  v_is_guest := (v_c.guest_id = auth.uid());
  if not v_is_guest and not public.is_host_member(v_c.host_profile_id) then
    raise exception 'NOT_AUTHORIZED' using errcode='42501';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, auth.uid(), btrim(p_body))
  returning id into v_id;

  -- Recipient: if guest sent, notify host owner; else notify guest.
  if v_is_guest then
    select owner_id into v_other from public.host_profiles where id = v_c.host_profile_id;
  else
    v_other := v_c.guest_id;
  end if;

  if v_other is not null and v_other <> auth.uid() then
    insert into public.notifications (user_id, type, title_ar, title_fr, title_en, data)
    values (v_other, 'message_received',
            'رسالة جديدة', 'Nouveau message', 'New message',
            jsonb_build_object('conversation_id', p_conversation_id, 'message_id', v_id));
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_notifications_read — mark the caller's notifications read (all or some).
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  update public.notifications
     set read_at = now()
   where user_id = auth.uid()
     and read_at is null
     and (p_ids is null or id = any(p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

grant execute on function public.is_host_member(uuid) to authenticated;
grant execute on function public.submit_review(uuid, smallint, smallint, smallint, smallint, smallint, smallint, text, smallint) to authenticated;
grant execute on function public.host_reply_review(uuid, text) to authenticated;
grant execute on function public.report_review(uuid, text) to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
