I now have a complete picture of the backend. Producing the inventory.

# Dyafa Backend Inventory (for admin + hotel dashboard rework)

Source: `supabase/migrations/*.sql` + `packages/types/src/database.types.ts`. Auth model: JWT custom claims `app_roles text[]` + `host_id uuid` injected by `custom_access_token_hook`; helper predicates `has_role(r)`, `is_staff()` (=admin/super_admin), `my_host_id()`, `can_act_on_property(prop, min_role)`, `is_host_member(host_id)`.

## Tables (grouped) + key columns

**Identity / roles**
- `profiles` — `id`(=auth.uid), `display_name`, `full_name`, `phone_e164`, `phone_verified_at`, `avatar_path`, `preferred_locale`, `default_wilaya_code`, `is_active`, `created_at`. (Mirror of auth.users; created by `handle_new_user` trigger.)
- `user_roles` — `user_id`, `role` (`app_role`), `granted_by`, `granted_at`. Write only via `grant_role` RPC.
- `host_profiles` — `id`, `owner_id`, `kind` (individual/hotel), `display_name`, `legal_name`, `nif`, `rc_number`, `id_doc_path/type`, `identity_status`, `payout_status` (both `verification_status`), `payout_method`, `payout_rib`, `commission_bps_override`, `bio_*`.
- `hotel_staff` — `host_profile_id`, `user_id`, `staff_role` (reception/manager), `is_active`, `invite_token`, `invited_at`, `accepted_at`. (Invite token column exists but no invite-accept RPC.)

**Property / inventory**
- `properties` — `id`, `host_profile_id`, `property_type_id`, `listing_kind`, `title_*`/`description_*`/`house_rules_*`, `status` (draft/pending/approved/rejected/suspended), `wilaya_code`, `commune_id`, `address_line`, `lat/lng/geo/geo_fuzzed`, `cancellation_tier`, `instant_book`, `min/max_nights`, `checkin/checkout_time`, `cover_photo_path`, `rating_avg`, `review_count`, `submitted_at`, `approved_at`, `published_at`, `reviewed_by`, `rejection_reason`/`rejection_note`, `deleted_at`.
- `room_types` — `property_id`, `name_*`, `base_price_dzd`, `weekend_price_dzd`, `cleaning_fee_dzd`, `extra_guest_fee_dzd`, `inventory_count`, `base_occupancy`, `max_occupancy`, `max_adults/children`, `bed_config`(jsonb), `size_sqm`, `is_active`, `is_default`, `sort_order`.
- `availability` — per `(room_type_id, date)`: `units_open`, `is_closed`, `closed_to_arrival/departure`, `min_stay`, `max_stay`, `price_override_dzd`, `source`.
- `rate_plans` — `room_type_id`, `kind`, `price_dzd` or `adjust_type`/`adjust_value_dzd`, `weekday_mask`, `date_start/end`, `min_nights_threshold`, `priority`, `is_active`.
- `property_photos` (`storage_path`, `is_cover`, `sort_order`, `room_type_id`, `alt_*`), `property_amenities`, `room_amenities`, `amenities`, `property_types`.

**Booking / payments**
- `bookings` — `code`, `property_id`, `room_type_id`, `guest_id`, `host_profile_id`, `status` (`booking_status`), `check_in/out`, `nights`, `stay_range`, `adults/children/units`, money snapshot (`nightly_subtotal_dzd`, `cleaning_fee_dzd`, `extra_guest_fee_dzd`, `discount_dzd`, `service_fee_dzd`, `total_dzd`, `commission_bps`, `commission_amount_dzd`, `host_payout_dzd`, `refund_amount_dzd`), `cancellation_tier`, lifecycle stamps (`confirmed_at`, `checked_in_at`, `completed_at`, `cancelled_at/by`, `cancellation_reason`), `payment_deadline`, `special_requests`.
- `inventory_holds` — `booking_id`, `room_type_id`, `date_from/to`, `units`, `status` (`hold_status`), `expires_at`. No client access.
- `transactions` — `booking_id`, `kind` (payment/refund/payout/chargeback), `method`, `provider`, `status`, `amount_dzd`, `commission_*`, `gateway_fee_dzd`, `host_payout_dzd`, `refunded_dzd`, `provider_ref`, `provider_status`, `checkout_url`, `expires_at`, `paid_at`, `idempotency_key`, `raw_payload`.
- `webhook_events` — provider event log (`signature_ok`, `processed_at`, `process_result`).
- `payouts` — `host_profile_id`, `status` (`payout_status`), `gross_dzd`, `commission_amount_dzd`, `net_dzd`, `period_start/end`, `method`, `destination_rib`, `reference`, `statement_path`, `paid_at`, `failure_reason`. `payout_items` (`payout_id`, `booking_id`, `net_dzd`).

**Reviews / messaging / disputes / notifications**
- `reviews` — `booking_id`(unique), `property_id`, `author_id`, `overall` + 6 categories (`cleanliness`, `accuracy`, `communication`, `location`, `value`, `checkin`), `comment_text`, `status` (pending/published/hidden/removed), `published_at`, `deleted_at`. `review_replies` (one per review).
- `conversations` (`kind`, `booking_id`, `guest_id`, `host_profile_id`, `last_message_at`) + `messages` (`body`, `attachment_path`, `read_at`, `deleted_at`).
- `disputes` (`booking_id`, `opened_by`, `against`, `category`, `status`, `description`, `resolution_note`, `resolved_by/at`, `refund_amount_dzd`) + `dispute_messages`.
- `notifications` — `user_id`, `type`(text), `title_*`/`body_*`, `data`(jsonb), `read_at`, `sent_push`.

**Platform / merchandising / audit / geo**
- `platform_settings` (singleton id=1) — `commission_bps`, `payment_window_minutes`, `request_expiry_hours`, `payout_period`, `payout_hold_hours`, `geo_fuzz_meters`, `feature_flags`(jsonb).
- `audit_log` — `actor_id`, `actor_role`, `action`, `target_type/id`, `before`/`after`(jsonb), `reason`/`reason_code`, `ip`, `user_agent`. Append-only (UPDATE/DELETE blocked by trigger).
- Merchandising: `featured_collections` + `collection_items`, `home_rails`, `promo_banners`.
- Geo lookups: `wilayas` (code 1..69, `name_*`, `lat/lng`), `communes`, `cancellation_policies`.

## RPCs relevant to admin/hotel

| RPC | Purpose | Who may call |
|---|---|---|
| `become_host(display_name)` | Lazily create host_profile + grant `host_individual` | authenticated (self) |
| `submit_property_for_review(property_id)` | draft→pending; validates title/room/photo | authenticated, owner only |
| `add_hotel_staff(user_id, staff_role)` | Add existing user as reception/manager + grant `hotel_staff` | authenticated, **host owner only** (not staff) |
| `set_availability_range(room_type, from, to, is_closed?, price_override?, min_stay?)` | Bulk close/open + price/min-stay over a range (upsert per day) | authenticated, `can_act_on_property('reception')` |
| `accept_booking_request(booking_id)` | requested→awaiting_payment; sets deadline, refreshes hold | host/**manager** or admin |
| `decline_booking_request(booking_id, reason?)` | requested→declined; releases hold | host/**manager** or admin |
| `cancel_booking(booking_id, reason?)` → refund DZD | Cancel + run refund engine + refund txn | guest / host-manager / admin |
| `quote_refund(booking_id)` → DZD | Table-driven refund preview | authenticated |
| `submit_review(...)` / `host_reply_review(review_id, body)` / `report_review(review_id, reason)` | Guest review / host reply / route abuse to dispute | authenticated (identity-checked) |
| `get_or_create_conversation(booking_id)` / `send_message(conv_id, body)` / `mark_notifications_read(ids?)` | Messaging + notifications | authenticated (participant) |
| `run_payouts(period_start, period_end)` → count | Generate per-host payouts for a period (idempotent, status `pending`) | **admin/super_admin** |
| `grant_role(user_id, role)` | Write user_roles + audit | **super_admin** only |
| `refresh_analytics()` | REFRESH CONCURRENTLY all 6 MVs | **service_role** |
| `expire_holds()` / `complete_stays()` | Cron lifecycle sweeps | **service_role** |
| `apply_payment_event(...)` | Webhook apply: capture hold + confirm booking | **service_role** |
| `dev_simulate_payment(booking_id)` | DEV ONLY: fake Chargily paid loop | authenticated (own booking) — drop in prod |
| `resolve_nightly_price_dzd(rt, date)` / `effective_units(rt, date)` / `create_booking(...)` | Pricing/availability/booking (guest-facing) | authenticated |

## Analytics — materialized views

| MV | Grain | Exposes |
|---|---|---|
| `mv_daily_metrics` | per day | `bookings_count`, `gmv_dzd`, `commission_dzd`, `new_users`, `completed_bookings` |
| `mv_conversion_funnel` | per day | `listing_views` (**hardcoded 0 — no view tracking in v1**), `booking_starts`, `bookings_paid`, `conversion_pct` |
| `mv_top_destinations` | wilaya/commune × 30d & 90d | `bookings`, `gmv_dzd` |
| `mv_host_performance` | per host | `listings_active`, `bookings`, `gmv_dzd`, `avg_rating`, `cancellation_rate`, `response_rate` (the hotel-dashboard scorecard) |
| `mv_revenue_by_period` | day/week/month | `gmv_dzd`, `commission_dzd`, `host_net_dzd` |
| `property_review_stats` | per property | review_count + 6 category averages + `computed_overall` |

Note: all MVs are **non-realtime** (refresh via `refresh_analytics()` on cron). No RLS on MVs — they are global aggregates, so the **hotel dashboard cannot safely read `mv_*` directly without leaking other hosts' data** except `mv_host_performance` filtered by `my_host_id()` (FK relationship exists). Booking-detail dashboards must aggregate live tables under RLS.

## RLS reality — admin vs host

**Admin / super_admin** (role claim → `is_staff()` true): every table has a `for all using(is_staff())` bypass. Can read/write properties (all statuses incl. approve/reject/suspend by direct UPDATE), bookings, reviews (hide/remove by status), disputes (only path to UPDATE/resolve), host_profiles (incl. flip `identity_status`/`payout_status`), hotel_staff, merchandising, notifications-source. Read-only on `transactions`, `webhook_events`, `payouts`, `inventory_holds`, `audit_log` (no client INSERT — must go through service-role). super_admin-only: lookup-table writes, `platform_settings` UPDATE, `grant_role`.

**Host owner** (`my_host_id()`) — full read of own host_profile/properties (any status)/bookings/payouts; **manager** capability writes room_types, rate_plans, photos, amenities, properties (except suspended), accept/decline/cancel bookings, review replies; **reception** capability writes availability and reads bookings. Owner-only: manage `hotel_staff`, delete `draft` properties. **Hotel staff (reception)** is excluded from `transactions`/`payouts` reads and from pricing/room_type edits. Status changes are trigger-guarded: a host can never self-approve (`properties_guard_approval` requires `identity_status='verified'`, which only admin can set); payout creation requires `payout_status='verified'`.

## GAPS — backend additions a great admin/hotel dashboard needs

**Admin moderation (biggest gap — no RPCs exist; admin currently mutates tables raw with no audit):**
- No `approve_property` / `reject_property(reason, note)` / `suspend_property` RPC → add audited SECURITY DEFINER RPCs that set status + `reviewed_by` + write `audit_log`.
- No `verify_host_identity` / `set_payout_status` RPC → add admin RPC to flip `host_profiles.identity_status`/`payout_status` with audit + KYC-doc signed-URL accessor (`kyc-docs` is private; no RPC mints URLs).
- No `moderate_review(review_id, action)` (hide/remove/restore) RPC → add audited status-setter.
- No `resolve_dispute(dispute_id, resolution, refund?)` RPC → disputes can only be UPDATEd raw; add RPC that sets status/resolution + optional refund txn + audit.
- No generic audit writer → add `log_admin_action(...)` (or fold audit into each admin RPC) so the **admin "activity log" page has data** (currently only `grant_role` writes audit).
- No `mark_payout_paid(payout_id, reference, statement_path)` RPC → payouts get created by `run_payouts` but there's no transition-to-paid path; add audited RPC + payout transaction.

**Admin dashboard data gaps:**
- No platform KPI rollup RPC (today's GMV, pending-approval count, open-dispute count, awaiting-payment count) → add `admin_dashboard_summary()` returning a single jsonb scorecard (avoids N client queries).
- `mv_conversion_funnel.listing_views` is a hardcoded 0 and there is **no page-view / search event table** → add a `listing_views` (or `analytics_events`) table + ingest path so the funnel is real.
- No moderation queue view → add `admin_pending_properties` view (pending listings + host verification state joined) for the review queue.
- No user search/admin-suspend → `profiles.is_active` exists but no admin RPC to deactivate a user + cascade.

**Hotel dashboard data gaps:**
- Hotel KPIs can't read `mv_*` safely (no RLS) → add a `host_dashboard_summary()` SECURITY DEFINER RPC scoped to `my_host_id()` (occupancy %, ADR, RevPAR, arrivals/departures today, revenue MTD) — none of these aggregates exist today.
- No **occupancy / calendar grid** read RPC → dashboards must call `effective_units` per room-per-day in a loop; add `get_availability_grid(property_id, from, to)` returning per-day units/closed/price.
- No **check-in / check-out / no-show action** RPC → confirmed→checked_in→completed and confirmed→no_show transitions are only reachable by raw booking UPDATE (allowed by trigger but no guarded RPC/notification); add `check_in_booking` / `check_out_booking` / `mark_no_show` RPCs.
- No **arrivals/departures today** query helper → add view or RPC over bookings by `check_in`/`check_out` = today for the host.
- `hotel_staff.invite_token` column exists but there is **no invite-by-email / accept-invite flow** (`add_hotel_staff` requires the user to already exist by uuid) → add `invite_hotel_staff(email, role)` + `accept_staff_invite(token)`.
- No host-side payout statement generation/visibility beyond the raw row → add statement PDF path population in `run_payouts` or a `generate_payout_statement` RPC.
- Manual/offline booking creation by host (walk-ins) not supported → `create_booking` is guest-auth scoped; add `host_create_manual_booking(...)`.

**Cross-cutting:**
- No realtime on `conversations`/`disputes`/`payouts` (only messages/bookings/notifications/availability are in `supabase_realtime`) → add if dashboards want live inbox/dispute updates.
- `notifications.type` is free text with no enum/catalog → dashboards can't reliably filter/group; add a check-constraint enum or a `notification_types` table.
- `audit_log` has no admin-facing read pagination/index by action → existing indexes are by target and actor only; add `(action, created_at desc)` index for the activity feed.