-- ============================================================================
-- 20260531120300_rls.sql
-- Dyafa (دافة) — Row-Level Security: force RLS + policies (§7 / doc 02).
-- Helper predicates (auth.has_role / is_staff / my_host_id / can_act_on_property)
-- are defined in the functions migration.
-- Admin/super_admin get a `for all using(auth.is_staff())` bypass per table.
-- ============================================================================

-- Force RLS so even the table owner is subject to policies.
alter table public.wilayas               force row level security;
alter table public.communes              force row level security;
alter table public.property_types        force row level security;
alter table public.amenities             force row level security;
alter table public.cancellation_policies force row level security;
alter table public.profiles              force row level security;
alter table public.user_roles            force row level security;
alter table public.host_profiles         force row level security;
alter table public.hotel_staff           force row level security;
alter table public.properties            force row level security;
alter table public.room_types            force row level security;
alter table public.property_photos       force row level security;
alter table public.property_amenities    force row level security;
alter table public.room_amenities        force row level security;
alter table public.availability          force row level security;
alter table public.rate_plans            force row level security;
alter table public.bookings              force row level security;
alter table public.inventory_holds       force row level security;
alter table public.transactions          force row level security;
alter table public.webhook_events        force row level security;
alter table public.payouts               force row level security;
alter table public.payout_items          force row level security;
alter table public.reviews               force row level security;
alter table public.review_replies        force row level security;
alter table public.conversations         force row level security;
alter table public.messages              force row level security;
alter table public.wishlists             force row level security;
alter table public.wishlist_items        force row level security;
alter table public.featured_collections  force row level security;
alter table public.collection_items      force row level security;
alter table public.promo_banners         force row level security;
alter table public.home_rails            force row level security;
alter table public.disputes              force row level security;
alter table public.dispute_messages      force row level security;
alter table public.notifications         force row level security;
alter table public.audit_log             force row level security;
alter table public.platform_settings     force row level security;

-- ===========================================================================
-- Master / lookup tables — public read; writes super_admin only.
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['wilayas','communes','property_types','amenities','cancellation_policies']
  loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true);',
                   t || '_public_read', t);
    execute format($f$create policy %I on public.%I for all to authenticated
                       using (auth.has_role('super_admin')) with check (auth.has_role('super_admin'));$f$,
                   t || '_admin_write', t);
  end loop;
end$$;

-- ===========================================================================
-- profiles — self read/update; admin all.
-- ===========================================================================
create policy profiles_self_select on public.profiles
  for select to authenticated using (id = auth.uid() or auth.is_staff());
create policy profiles_self_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());
-- The JWT hook (supabase_auth_admin) does not read profiles, but grant SELECT for safety.
create policy profiles_auth_admin_read on public.profiles
  as permissive for select to supabase_auth_admin using (true);

-- ===========================================================================
-- user_roles — self read; writes via RPC (super_admin); auth_admin reads for hook.
-- ===========================================================================
create policy user_roles_self_select on public.user_roles
  for select to authenticated using (user_id = auth.uid() or auth.is_staff());
create policy user_roles_auth_admin_read on public.user_roles
  as permissive for select to supabase_auth_admin using (true);
-- No client INSERT/UPDATE/DELETE policy: grant_role() (definer) is the only writer.

-- ===========================================================================
-- host_profiles — self/owner + admin; update owner; auth_admin reads for hook.
-- ===========================================================================
create policy host_profiles_self_select on public.host_profiles
  for select to authenticated using (owner_id = auth.uid() or auth.is_staff());
create policy host_profiles_owner_insert on public.host_profiles
  for insert to authenticated with check (owner_id = auth.uid());
create policy host_profiles_owner_update on public.host_profiles
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy host_profiles_admin_all on public.host_profiles
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());
create policy host_profiles_auth_admin_read on public.host_profiles
  as permissive for select to supabase_auth_admin using (true);

-- ===========================================================================
-- hotel_staff — owning host manages; staff read own row; admin bypass.
-- ===========================================================================
create policy hotel_staff_owner_select on public.hotel_staff
  for select to authenticated
  using (host_profile_id = auth.my_host_id() or user_id = auth.uid() or auth.is_staff());
create policy hotel_staff_owner_insert on public.hotel_staff
  for insert to authenticated with check (host_profile_id = auth.my_host_id());
create policy hotel_staff_owner_update on public.hotel_staff
  for update to authenticated
  using (host_profile_id = auth.my_host_id()) with check (host_profile_id = auth.my_host_id());
create policy hotel_staff_owner_delete on public.hotel_staff
  for delete to authenticated using (host_profile_id = auth.my_host_id());
create policy hotel_staff_admin_all on public.hotel_staff
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

-- ===========================================================================
-- properties — public sees approved (via view, but base policy also allows it);
-- host/staff manage; status changes are RPC-only (column guard in triggers).
-- Base-table exact-geo read is gated to staff / staff-of-host / confirmed-booking guest (§9).
-- ===========================================================================
-- Public/guest read of publicly visible listings (geo-masked exposure is via the view).
create policy properties_public_read on public.properties
  for select to anon, authenticated
  using (status = 'approved' and deleted_at is null);
-- Host / staff / admin read all own (any status).
create policy properties_host_read on public.properties
  for select to authenticated
  using (auth.can_act_on_property(id, 'reception'::staff_role) or auth.is_staff());
-- Guest with a confirmed booking may read the row (exact geo path, §9).
create policy properties_booked_guest_read on public.properties
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.property_id = properties.id
      and b.guest_id = auth.uid()
      and b.status in ('confirmed','checked_in','completed')
  ));
create policy properties_host_insert on public.properties
  for insert to authenticated
  with check (
    host_profile_id = auth.my_host_id()
    and (auth.has_role('host_individual') or auth.has_role('host_hotel'))
  );
create policy properties_host_update on public.properties
  for update to authenticated
  using (auth.can_act_on_property(id, 'manager'::staff_role) and status <> 'suspended')
  with check (auth.can_act_on_property(id, 'manager'::staff_role));
create policy properties_owner_delete on public.properties
  for delete to authenticated
  using (host_profile_id = auth.my_host_id() and status = 'draft');
create policy properties_admin_all on public.properties
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

-- §9 geo privacy — defense in depth. RLS is row-level and cannot mask columns by
-- row condition, so exact-coordinate columns are protected with COLUMN privileges:
-- `anon` is denied SELECT on the exact geo + street address entirely and must browse
-- via the public.properties_public view (which exposes only geo_fuzzed + ~3dp coords).
-- The base row-read policy above stays so RLS chaining from child tables and the
-- security_invoker view keep working for approved listings.
-- NOTE (M0 limitation / TODO): for `authenticated` users we keep column SELECT so that
-- a confirmed-booking guest (and the host/staff) can read the exact pin via the base
-- table per §9; truly hiding exact geo from *pre-booking authenticated* users requires
-- column-masking (e.g. a SECURITY DEFINER accessor or PG column-level RLS) — apps MUST
-- read public.properties_public pre-booking. Revoke from anon is the hard guarantee.
revoke select (geo, lat, lng, address_line) on public.properties from anon;
-- Re-grant the non-sensitive columns to anon (revoking specific columns above does not
-- drop the table-level grant, but we make the intent explicit and future-proof).
grant select (
  id, host_profile_id, property_type_id, listing_kind,
  title_ar, title_fr, title_en, description_ar, description_fr, description_en,
  status, wilaya_code, commune_id, geo_fuzzed, cancellation_tier,
  checkin_time, checkout_time, house_rules_ar, house_rules_fr, house_rules_en,
  instant_book, currency, min_nights, max_nights, cover_photo_path,
  rating_avg, review_count, submitted_at, approved_at, published_at,
  created_at, updated_at
) on public.properties to anon;

-- ===========================================================================
-- room_types — read via parent visibility; write manager (reception can't edit pricing).
-- ===========================================================================
create policy room_types_public_read on public.room_types
  for select to anon, authenticated
  using (exists (select 1 from public.properties p
                 where p.id = property_id and p.status = 'approved' and p.deleted_at is null));
create policy room_types_staff_read on public.room_types
  for select to authenticated
  using (auth.can_act_on_property(property_id, 'reception'::staff_role) or auth.is_staff());
create policy room_types_manager_write on public.room_types
  for all to authenticated
  using (auth.can_act_on_property(property_id, 'manager'::staff_role))
  with check (auth.can_act_on_property(property_id, 'manager'::staff_role));

-- ===========================================================================
-- availability — read via parent; write reception (block/unblock dates, not pricing).
-- ===========================================================================
create policy availability_public_read on public.availability
  for select to anon, authenticated
  using (exists (select 1 from public.properties p
                 join public.room_types rt on rt.id = availability.room_type_id
                 where p.id = rt.property_id and p.status = 'approved' and p.deleted_at is null));
create policy availability_reception_write on public.availability
  for all to authenticated
  using (exists (select 1 from public.room_types rt
                 where rt.id = availability.room_type_id
                   and auth.can_act_on_property(rt.property_id, 'reception'::staff_role)))
  with check (exists (select 1 from public.room_types rt
                 where rt.id = availability.room_type_id
                   and auth.can_act_on_property(rt.property_id, 'reception'::staff_role)));
create policy availability_admin_all on public.availability
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

-- ===========================================================================
-- rate_plans — read via parent; write manager.
-- ===========================================================================
create policy rate_plans_public_read on public.rate_plans
  for select to anon, authenticated
  using (exists (select 1 from public.properties p
                 join public.room_types rt on rt.id = rate_plans.room_type_id
                 where p.id = rt.property_id and p.status = 'approved' and p.deleted_at is null));
create policy rate_plans_manager_write on public.rate_plans
  for all to authenticated
  using (exists (select 1 from public.room_types rt
                 where rt.id = rate_plans.room_type_id
                   and auth.can_act_on_property(rt.property_id, 'manager'::staff_role)))
  with check (exists (select 1 from public.room_types rt
                 where rt.id = rate_plans.room_type_id
                   and auth.can_act_on_property(rt.property_id, 'manager'::staff_role)));

-- ===========================================================================
-- property_photos / property_amenities / room_amenities — write manager; read via parent.
-- ===========================================================================
create policy property_photos_public_read on public.property_photos
  for select to anon, authenticated
  using (exists (select 1 from public.properties p
                 where p.id = property_id and p.status = 'approved' and p.deleted_at is null)
         or auth.can_act_on_property(property_id, 'reception'::staff_role) or auth.is_staff());
create policy property_photos_manager_write on public.property_photos
  for all to authenticated
  using (auth.can_act_on_property(property_id, 'manager'::staff_role))
  with check (auth.can_act_on_property(property_id, 'manager'::staff_role));

create policy property_amenities_public_read on public.property_amenities
  for select to anon, authenticated
  using (exists (select 1 from public.properties p
                 where p.id = property_id and p.status = 'approved' and p.deleted_at is null)
         or auth.can_act_on_property(property_id, 'reception'::staff_role) or auth.is_staff());
create policy property_amenities_manager_write on public.property_amenities
  for all to authenticated
  using (auth.can_act_on_property(property_id, 'manager'::staff_role))
  with check (auth.can_act_on_property(property_id, 'manager'::staff_role));

create policy room_amenities_public_read on public.room_amenities
  for select to anon, authenticated
  using (exists (select 1 from public.room_types rt
                 join public.properties p on p.id = rt.property_id
                 where rt.id = room_amenities.room_type_id
                   and p.status = 'approved' and p.deleted_at is null)
         or exists (select 1 from public.room_types rt
                 where rt.id = room_amenities.room_type_id
                   and (auth.can_act_on_property(rt.property_id, 'reception'::staff_role) or auth.is_staff())));
create policy room_amenities_manager_write on public.room_amenities
  for all to authenticated
  using (exists (select 1 from public.room_types rt
                 where rt.id = room_amenities.room_type_id
                   and auth.can_act_on_property(rt.property_id, 'manager'::staff_role)))
  with check (exists (select 1 from public.room_types rt
                 where rt.id = room_amenities.room_type_id
                   and auth.can_act_on_property(rt.property_id, 'manager'::staff_role)));

-- ===========================================================================
-- bookings — guest or property reception read; INSERT blocked (RPC only);
-- UPDATE trigger-guarded (transition logic in triggers); admin bypass.
-- ===========================================================================
create policy bookings_select on public.bookings
  for select to authenticated
  using (guest_id = auth.uid()
         or auth.can_act_on_property(property_id, 'reception'::staff_role)
         or auth.is_staff());
create policy bookings_no_client_insert on public.bookings
  for insert to authenticated with check (false);   -- create_booking RPC only
create policy bookings_update on public.bookings
  for update to authenticated
  using (guest_id = auth.uid()
         or auth.can_act_on_property(property_id, 'reception'::staff_role)
         or auth.is_staff())
  with check (guest_id = auth.uid()
         or auth.can_act_on_property(property_id, 'reception'::staff_role)
         or auth.is_staff());
create policy bookings_admin_all on public.bookings
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

-- ===========================================================================
-- inventory_holds — no client access (managed by RPC / service role); admin read.
-- ===========================================================================
create policy inventory_holds_admin_read on public.inventory_holds
  for select to authenticated using (auth.is_staff());
-- No client write policy; create_booking/expire_holds run as definer.

-- ===========================================================================
-- transactions / webhook_events / payouts / payout_items — client writes blocked.
-- SELECT: guest sees own booking's txns; host/manager see own properties' financials;
-- reception excluded.
-- ===========================================================================
create policy transactions_select on public.transactions
  for select to authenticated
  using (
    exists (select 1 from public.bookings b
            where b.id = transactions.booking_id and b.guest_id = auth.uid())
    or exists (select 1 from public.bookings b
            where b.id = transactions.booking_id
              and auth.can_act_on_property(b.property_id, 'manager'::staff_role))
    or auth.is_staff()
  );
create policy transactions_no_client_write on public.transactions
  for insert to authenticated with check (false);

create policy webhook_events_admin_read on public.webhook_events
  for select to authenticated using (auth.is_staff());

create policy payouts_select on public.payouts
  for select to authenticated
  using (host_profile_id = auth.my_host_id() or auth.is_staff());
create policy payouts_no_client_write on public.payouts
  for insert to authenticated with check (false);

create policy payout_items_select on public.payout_items
  for select to authenticated
  using (exists (select 1 from public.payouts p
                 where p.id = payout_items.payout_id
                   and (p.host_profile_id = auth.my_host_id() or auth.is_staff())));

-- ===========================================================================
-- reviews — public read for approved properties; guest insert w/ completed booking;
-- author update/delete; admin bypass.
-- ===========================================================================
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using ((status = 'published' and deleted_at is null
          and exists (select 1 from public.properties p
                      where p.id = reviews.property_id and p.status = 'approved'))
         or author_id = auth.uid()
         or auth.is_staff());
create policy reviews_guest_insert on public.reviews
  for insert to authenticated
  with check (author_id = auth.uid()
              and exists (select 1 from public.bookings b
                          where b.id = booking_id
                            and b.guest_id = auth.uid()
                            and b.status = 'completed'));
create policy reviews_author_update on public.reviews
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy reviews_author_delete on public.reviews
  for delete to authenticated using (author_id = auth.uid());
create policy reviews_admin_all on public.reviews
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

-- ===========================================================================
-- review_replies — host/manager insert/update (one per review); public read.
-- ===========================================================================
create policy review_replies_public_read on public.review_replies
  for select to anon, authenticated using (true);
create policy review_replies_host_insert on public.review_replies
  for insert to authenticated
  with check (host_profile_id = auth.my_host_id()
              and exists (select 1 from public.reviews r
                          join public.properties p on p.id = r.property_id
                          where r.id = review_id
                            and auth.can_act_on_property(p.id, 'manager'::staff_role)));
create policy review_replies_host_update on public.review_replies
  for update to authenticated
  using (host_profile_id = auth.my_host_id())
  with check (host_profile_id = auth.my_host_id());
create policy review_replies_admin_all on public.review_replies
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

-- ===========================================================================
-- conversations / messages — participant-scoped.
-- ===========================================================================
create policy conversations_select on public.conversations
  for select to authenticated
  using (guest_id = auth.uid()
         or host_profile_id = auth.my_host_id()
         or exists (select 1 from public.hotel_staff hs
                    where hs.host_profile_id = conversations.host_profile_id
                      and hs.user_id = auth.uid() and hs.is_active)
         or auth.is_staff());
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check (guest_id = auth.uid() or host_profile_id = auth.my_host_id());
create policy conversations_update on public.conversations
  for update to authenticated
  using (guest_id = auth.uid() or host_profile_id = auth.my_host_id())
  with check (guest_id = auth.uid() or host_profile_id = auth.my_host_id());

create policy messages_select on public.messages
  for select to authenticated
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id
                   and (c.guest_id = auth.uid()
                        or c.host_profile_id = auth.my_host_id()
                        or exists (select 1 from public.hotel_staff hs
                                   where hs.host_profile_id = c.host_profile_id
                                     and hs.user_id = auth.uid() and hs.is_active)
                        or auth.is_staff())));
create policy messages_insert on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid()
              and exists (select 1 from public.conversations c
                          where c.id = conversation_id
                            and (c.guest_id = auth.uid()
                                 or c.host_profile_id = auth.my_host_id()
                                 or exists (select 1 from public.hotel_staff hs
                                            where hs.host_profile_id = c.host_profile_id
                                              and hs.user_id = auth.uid() and hs.is_active))));
-- Sender may soft-flag (read_at / deleted_at) own conversation membership; no hard delete.
create policy messages_update on public.messages
  for update to authenticated
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id
                   and (c.guest_id = auth.uid() or c.host_profile_id = auth.my_host_id()
                        or exists (select 1 from public.hotel_staff hs
                                   where hs.host_profile_id = c.host_profile_id
                                     and hs.user_id = auth.uid() and hs.is_active))))
  with check (true);

-- ===========================================================================
-- wishlists / wishlist_items — per user.
-- ===========================================================================
create policy wishlists_owner_all on public.wishlists
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wishlist_items_owner_all on public.wishlist_items
  for all to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

-- ===========================================================================
-- Merchandising — public read where active/in-window; writes admin only.
-- ===========================================================================
create policy featured_collections_public_read on public.featured_collections
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
         or auth.is_staff());
create policy featured_collections_admin_write on public.featured_collections
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

create policy collection_items_public_read on public.collection_items
  for select to anon, authenticated using (true);
create policy collection_items_admin_write on public.collection_items
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

create policy promo_banners_public_read on public.promo_banners
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
         or auth.is_staff());
create policy promo_banners_admin_write on public.promo_banners
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

create policy home_rails_public_read on public.home_rails
  for select to anon, authenticated using (is_active or auth.is_staff());
create policy home_rails_admin_write on public.home_rails
  for all to authenticated using (auth.is_staff()) with check (auth.is_staff());

-- ===========================================================================
-- disputes / dispute_messages — connected parties insert; opener+admin read;
-- update admin only.
-- ===========================================================================
create policy disputes_insert on public.disputes
  for insert to authenticated with check (opened_by = auth.uid());
create policy disputes_select on public.disputes
  for select to authenticated using (opened_by = auth.uid() or auth.is_staff());
create policy disputes_admin_update on public.disputes
  for update to authenticated using (auth.is_staff()) with check (auth.is_staff());

create policy dispute_messages_insert on public.dispute_messages
  for insert to authenticated
  with check (sender_id = auth.uid()
              and exists (select 1 from public.disputes d
                          where d.id = dispute_id
                            and (d.opened_by = auth.uid() or auth.is_staff())));
create policy dispute_messages_select on public.dispute_messages
  for select to authenticated
  using (exists (select 1 from public.disputes d
                 where d.id = dispute_id and (d.opened_by = auth.uid() or auth.is_staff())));

-- ===========================================================================
-- notifications — per-user read; update only read_at; inserts via definer/Edge.
-- ===========================================================================
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No client INSERT policy (triggers / Edge Functions write as definer/service role).

-- ===========================================================================
-- audit_log — staff read only; no client write (definer-only); reject trigger in triggers migration.
-- ===========================================================================
create policy audit_log_staff_read on public.audit_log
  for select to authenticated using (auth.is_staff());

-- ===========================================================================
-- platform_settings — authenticated read; super_admin update (audited).
-- ===========================================================================
create policy platform_settings_read on public.platform_settings
  for select to authenticated using (true);
create policy platform_settings_super_update on public.platform_settings
  for update to authenticated
  using (auth.has_role('super_admin')) with check (auth.has_role('super_admin'));

-- ===========================================================================
-- Realtime publication (§7): messages, bookings, notifications, availability.
-- RLS authorizes each streamed row against the subscriber's JWT.
-- ===========================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.bookings;
    alter publication supabase_realtime add table public.notifications;
    alter publication supabase_realtime add table public.availability;
  end if;
exception when duplicate_object then
  null;  -- tables already in publication (idempotent re-run)
end$$;

-- ===========================================================================
-- Storage buckets + storage.objects policies (§10).
-- Canonical buckets: listing-photos, avatars, kyc-docs, payout-statements.
-- The task asks for property-photos + avatars; spec §10 resolves the
-- listing-photos vs property-photos conflict in favor of `listing-photos`.
-- We create BOTH listing-photos (canonical) and property-photos (compat alias).
-- ===========================================================================
insert into storage.buckets (id, name, public)
values
  ('listing-photos',    'listing-photos',    true),
  ('property-photos',   'property-photos',   true),   -- compatibility alias
  ('avatars',           'avatars',           true),
  ('kyc-docs',          'kyc-docs',          false),
  ('payout-statements', 'payout-statements', false)
on conflict (id) do nothing;

-- listing-photos / property-photos: INSERT into own host folder (path[1] = my_host_id);
-- public SELECT.
create policy "listing photos public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('listing-photos','property-photos','avatars'));

create policy "listing photos host upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('listing-photos','property-photos')
    and (storage.foldername(name))[1] = auth.my_host_id()::text
    and (auth.has_role('host_individual') or auth.has_role('host_hotel') or auth.has_role('hotel_staff'))
  );
create policy "listing photos host update" on storage.objects
  for update to authenticated
  using (bucket_id in ('listing-photos','property-photos')
         and (storage.foldername(name))[1] = auth.my_host_id()::text);
create policy "listing photos host delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('listing-photos','property-photos')
         and (storage.foldername(name))[1] = auth.my_host_id()::text);

-- avatars: INSERT into own user folder (path[1] = uid). Public read covered above.
create policy "avatars own upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- kyc-docs: private. Upload to own folder; SELECT staff only (signed URL via admin RPC).
create policy "kyc upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kyc staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'kyc-docs' and auth.is_staff());

-- payout-statements: private. Written by service role; SELECT owner host / admin.
create policy "payout statements owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'payout-statements'
         and ((storage.foldername(name))[1] = auth.my_host_id()::text or auth.is_staff()));
