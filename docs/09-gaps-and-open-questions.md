# Gaps, Contradictions & Open Questions

> Produced by an adversarial critic agent reviewing all 8 subsystem designs together. **Resolve the open questions before building.**

## Contradictions between subsystems

### data-model vs payments / admin-dashboard / host-experience / design-system-i18n
- **Issue:** Money unit conflict. data-model stores every monetary column as `*_minor bigint` in DZD centimes (×100). ALL other docs use whole-dinar `integer`: payments explicitly writes 'DZD integer minor-units? — No' and uses `amount_dzd integer`; admin says 'minor unit not used'; host-experience 'integer dinars (no centimes)'; design-system pins `maximumFractionDigits:0`. data-model is alone. Column NAMES also differ (`base_price_minor` vs `base_price_dzd`), so generated `packages/types` cannot satisfy both.
- **Fix:** Pick ONE. DZD has no subunit in circulation → standardize on whole-dinar `integer amount_dzd` (matches 4 docs + Chargily, which takes whole-dinar amount). Rewrite data-model money columns and regenerate types as the single source.

### data-model vs payments
- **Issue:** Duplicate, conflicting enum definitions. Both docs `create type payment_method` with DIFFERENT members: data-model `('chargily_edahabia','chargily_cib','baridi_pay')` vs payments `('edahabia','cib','baridi_qr')`. data-model defines `payment_status` (8 members incl. processing/partially_refunded/expired); payments defines `txn_status` (5 members). payments also adds `payment_provider`,`txn_kind`,`hold_status` not in data-model. Two CREATE TYPE statements for the same name = migration failure.
- **Fix:** One enum catalog owned by data-model. Decide method naming (`edahabia/cib/baridi_qr` is cleaner; provider tracked in separate `payment_provider` column). Delete payments' redefinitions; payments consumes data-model enums.

### data-model vs payments / customer-app / host-experience / auth-rls
- **Issue:** Booking state machine is undefined and mutually contradictory. data-model `booking_status enum ('pending','confirmed','cancelled','completed')` — only 4 states. But payments uses `awaiting_payment`,`payment_expired`,`requested`,`accepted`; customer-app inserts `pending_payment`; host-experience uses `pending_host`,`declined`; auth-rls references `no_show` and `check_in`/`check_out` transitions. None of these extra states exist in the enum. Five docs assume five different lifecycles.
- **Fix:** Define one canonical booking_status enum + transition table covering request-to-book (requested→accepted/declined), payment (awaiting_payment→confirmed/expired), stay (checked_in→completed), and no_show. Put it in data-model; every other doc references it verbatim.

### data-model vs payments vs auth-rls
- **Issue:** Three incompatible inventory-hold/double-booking models. data-model: advisory lock + increment `availability.units_booked` per date (mutates availability) + exclusion constraint for single-unit. payments §6: explicitly 'decremented logically via holds, NOT by mutating availability rows', effective = units − sum(active holds), via a dedicated `inventory_hold` table. auth-rls: 'decrement/insert a held availability span with TTL'. data-model has NO `inventory_hold` table; payments+auth-rls require one.
- **Fix:** Choose one concurrency model. Either (a) data-model's counter-on-availability (no hold table) or (b) payments' separate inventory_hold table (availability never mutated for holds). Reconcile create_booking RPC accordingly; only one can be the schema of record.

### data-model vs auth-rls
- **Issue:** Core identity & role tables renamed. data-model `app_user` + `user_role_grant`; auth-rls `profiles` + `user_roles`. RLS policies, the custom-access-token-hook, and `api-client` all reference the auth-rls names, which do not exist in data-model. auth-rls master-table policy also targets `public.wilayas` (plural) but data-model table is `wilaya` (singular) — policy binds to a non-existent relation.
- **Fix:** Unify table names (one of profiles/app_user, one of user_roles/user_role_grant) and singular-vs-plural convention across ALL tables (booking/bookings, transaction/transactions, review/reviews, property_image/property_photos). Regenerate types so call sites compile.

### data-model vs host-experience vs admin-dashboard
- **Issue:** Commission representation conflicts three ways: data-model `commission_rate_bps int default 1000` (basis points = 10%); payments `commission_rate numeric(5,4)` 0.1200 + prose '12%'; admin `platform_settings.commission_pct` + `commission_ledger`. Default rate itself differs (10% vs 12%). Also cancellation policy: data-model `property.cancellation_tier` is an ENUM column + `cancellation_policy_def` table; host-experience/admin use `cancellation_policy_id` FK.
- **Fix:** Owner picks one commission % and one storage form (recommend a `platform_settings` row + per-host override column, single unit). Pick enum-tier OR FK for cancellation, not both.

### auth-rls vs host-experience
- **Issue:** Two different hotel-staff data models with incompatible RLS. auth-rls `hotel_staff(user_id, property_id, capability)` — PK per (user,property), scoped to ONE property. host-experience `host_team_members(member_user_id, role, property_ids uuid[] NULL=all)` — array scoping + `auth_host_can_access(property_id, min_role)` helper. data-model has yet a third: `hotel_staff(host_profile_id, user_id, staff_role)` scoped to host_profile, not property. The three RLS schemes cannot coexist.
- **Fix:** Choose one staff table + one scoping rule (per-property rows vs property_ids[] array). Define the single helper function and capability matrix once; all dashboards consume it.

### data-model vs auth-rls vs host-experience
- **Issue:** Review-reply modeled three ways: data-model `review.host_reply`/`host_reply_at` columns inline on the review; auth-rls 'separate `review_replies` table, not by editing the review'; host-experience `review_responses` table + `rpc_host_reply_review`. The RLS doc forbids the exact mechanism (inline column) the data model ships.
- **Fix:** Decide inline column vs separate replies table. If reply must be immutable/audited separately (auth-rls intent), drop the inline columns and define one replies table of record.

### customer-app vs data-model
- **Issue:** Wishlists UI with no backing schema. customer-app ships full Wishlists feature (named collections, cover collage, share, WishlistDetail by `wishlistId`). data-model only has flat `favorite(user_id, property_id)` PK — no collection entity, no name, no cover, no membership join. The screens reference fields/tables the model lacks.
- **Fix:** Either downgrade UI to single flat favorites list (cheapest for solo) or add `wishlist` + `wishlist_item` tables. Reconcile before building WishlistDetailScreen.

### repo-tooling-seed vs design-system-i18n vs customer-app
- **Issue:** Font stack contradicts the 'single source of truth' design system. design-system mandates Plus Jakarta Sans (Latin) + IBM Plex Sans Arabic and explicitly BANS Inter/Roboto. repo-tooling ships `assets/fonts/ # Cairo (AR), Inter (FR/EN)` — uses the banned Latin face and a different Arabic face. customer-app hedges 'IBM Plex Sans Arabic (or Cairo/Tajawal)'. The claimed shared tokens are not actually shared.
- **Fix:** Lock the two families in `packages/design-tokens`, delete Inter/Cairo from repo assets, and have Expo + both Next apps import the same font tokens.

### payments vs data-model
- **Issue:** Cancellation refund logic hardcoded vs table-driven. payments §7 hardcodes Flexible 100%≥024h / Moderate 50%≥5d / Strict 0%. data-model defines `cancellation_policy_def(refund_full_until_hours, refund_partial_pct, ...)` as an editable, localized table 'drives refund math in code'. payments ignores that table and bakes constants, so editing the table would have no effect.
- **Fix:** Make the refund engine read `cancellation_policy_def`; remove hardcoded tiers from payments, or declare the table read-only seed and document that constants are authoritative.

### auth-rls vs payments / admin-dashboard / repo-tooling-seed
- **Issue:** Chargily base host inconsistent. payments/admin/repo use `https://pay.chargily.net/api/v2` (and test `/test/api/v2`). auth-rls calls `POST https://api.chargily.com/v2/checkouts`. customer-app shows checkout_url on `pay.chargily.dz`. Three different hostnames for the same gateway; auth-rls's `api.chargily.com` is not the documented API base.
- **Fix:** Standardize on the documented `pay.chargily.net/{test/}api/v2`; correct auth-rls. Keep base URL in one shared `_shared/chargily.ts` constant.

### customer-app vs data-model / auth-rls
- **Issue:** Geo-privacy contradiction. customer-app PropertyLocationScreen shows 'approximate radius until booked', but data-model exposes exact `lat/lng/geo` on `property` and the public read RLS (auth-rls `prop_public_read`) returns all columns to anon. No column-level masking or fuzzed-coordinate field exists, so exact address coordinates leak to unauthenticated users.
- **Fix:** Add a derived fuzzed coordinate (or a view that rounds geo) for anon/unbooked reads, or restrict precise lat/lng via a column-masking view. Decide privacy radius.

## Gaps vs spec deliverables

| Severity | Area | Missing |
|---|---|---|
| 🔴 HIGH | Sandbox-tested payment webhooks (deliverable: 'payments with sandbox-tested webhooks') | No doc demonstrates an actual Chargily TEST-mode end-to-end webhook test. payments has reconcile + test base URL; repo lists only a unit test of the HMAC helper and 'mock Chargily by pointing create-checkout at a stub', with real e2e marked 'optional, 1 flow'. Local webhook delivery depends on an ngrok/cloudflared tunnel (fragile during a live defense). 'Sandbox-tested' is asserted, not shown. |
| 🔴 HIGH | Backing schema for admin dashboard + home rails | admin-dashboard and customer-app reference tables that data-model never defines: `platform_settings`, `commission_ledger`, `featured_collections`, `collection_items`, `promo_banners`, `home_rails`/`discovery_rails`, plus analytics MVs `mv_daily_metrics`,`mv_conversion_funnel`,`mv_top_destinations`,`mv_host_performance`,`mv_revenue_by_period`,`host_analytics_daily`. Admin KPIs, promo banners, featured collections, and home rails are unbuildable as written. |
| 🔴 HIGH | Baridi Pay real integration | All docs concur Algerie Poste exposes no public API, so v1 is manual/attended reconciliation (host/staff or admin confirms, or CSV import). This is a genuine capability gap for a core Algerian rail — 'payment' for Baridi is human-in-the-loop, not automated. Acceptable for v1 only if the owner agrees. |
| 🔴 HIGH | Phone OTP provider for +213 (auth deliverable) | auth-rls flags Algerian A2P SMS as operator-gated (Mobilis/Djezzy/Ooredoo) and proposes Twilio Verify with a WhatsApp fallback, but no provider is confirmed to actually deliver to +213, and none is provisioned. Phone verification gates host onboarding — if SMS doesn't land, M1 stalls. |
| 🟠 MED | Audit log of record | auth-rls and admin-dashboard each define `audit_log` with DIFFERENT columns (auth-rls: actor_id/action/target_type/metadata; admin: actor_role/before/after/ip/user_agent/reason_code). data-model defines only `property_review_log`. No single canonical audit table. |
| 🟠 MED | Wishlist collections schema | customer-app Wishlists feature has no collection/membership tables in data-model (only flat `favorite`). See contradictions; counts as a deliverable gap for the customer app's stated UI. |
| 🟠 MED | Spec literal '58 wilayas' vs reality 69 | data-model correctly notes Algeria expanded to 69 wilayas (Nov 2025) and models `is_active` to ship 58 now. repo seeds 58. This satisfies the spec literally but a defense examiner may read hardcoded '58' as outdated; the 11 new wilayas are modeled-but-not-seeded. Minor correctness/optics risk. |
| 🟠 MED | Mobile design-token consumption | design-system claims one shared `packages/design-tokens` feeding RN + web, but customer-app never imports it (calls the RN theme layer 'implementation-agnostic', lists only Zustand stores). No proof tokens reach the Expo app; 'nothing hand-copied' is unverified. |
| 🟠 MED | Reception capability mismatch | host-experience capability matrix lets reception 'Accept/decline/modify reservations'; auth-rls only grants reception `check_in`/`check_out` (host/manager do confirm/reject). The RLS as written forbids a host-dashboard action the matrix promises. |
| 🟠 MED | Chargily stable event id for idempotency | payments + data-model dedupe webhooks on `provider_event_id` ('Chargily event id'), but neither verifies Chargily Pay v2 actually sends a stable per-event id in the webhook body (docs describe a `signature` header + checkout payload, event types checkout.paid/failed/canceled). If no event id exists, the unique-constraint dedupe key is unfounded. |
| 🟡 LOW | Storage bucket name + path convention | Bucket named `property-photos` (auth-rls) vs `listing-photos` (host-experience, repo-tooling). Folder path `{owner_id}/{property_id}/...` (auth-rls) vs `{host}/{property}/` (host-experience). Storage RLS keys off path segment, so a mismatch breaks upload policies. |

## Open questions — decide before building

1. Money unit: store whole-dinar integer (DZD has no circulating subunit; matches Chargily + 4 of 5 docs) or centimes bigint (data-model)? Pick one before any migration — it touches every money column and generated types.
2. Baridi Pay: accept manual/attended reconciliation for v1 (no public API exists), or descope Baridi entirely and ship Chargily-only? Affects payment-method enum, dashboards, and demo story.
3. Phone-OTP provider for Algeria: confirm and provision a route that actually delivers to +213 (Twilio Verify? Vonage? WhatsApp-only?) before M1 — or relax host gating to email-only verification for the defense.
4. Commission: what exact % (docs say 10% vs 12%), and stored as basis points, numeric rate, or a platform_settings row with per-host override? Single representation needed.
5. Cancellation tiers: confirm exact refund thresholds (Flexible/Moderate/Strict hours+%) and whether the service fee is non-refundable; and decide enum-tier vs FK + whether the cancellation_policy_def table is authoritative or just seed.
6. Wilaya count: seed 58 (spec) or all 69 (current reality, Nov 2025) for the defense? If 58, prepare to explain the discrepancy to examiners.
7. Booking lifecycle: ratify ONE state machine (request-to-book + instant-book + payment-expiry + no_show + check-in/out) since 5 docs assume 5 different sets.
8. Inventory concurrency: counter-on-availability (data-model) vs separate inventory_hold table (payments/auth-rls)? Determines the create_booking RPC and whether an inventory_hold table exists.
9. Hotel staff model: single hotel_staff table scoped per-property (auth-rls) vs host_team_members with property_ids[] array (host-experience) vs hotel_staff scoped to host_profile (data-model)? One must win.
10. Geo privacy: should exact lat/lng be masked/fuzzed for anon and pre-booking users, and at what radius? Currently exact coordinates are world-readable.
11. Host-mode toggle UX: confirm lazy-create of host_profile on first toggle and a hard root navigator swap (guest↔host) as the single agreed pattern.
12. Featured collections / home rails / promo banners: are these in v1 scope? If yes, the supporting tables must be added to the data model; if no, cut the admin content screens and customer home-rails merchandising.

## Top risks (solo student, diploma timeline)

- Scope overload for a solo student: 3 frontends (Expo customer+host, Next admin, Next hotel) + ~30 tables + Chargily/Baridi + RLS + 3-language full RTL across M0–M7. Each of payments, hotel dashboard, and admin alone is a sizable project; finishing all to defense quality is the central risk. Cut to a vertical MVP (discover→book→Chargily→confirm + admin approve) and stub the rest.
- Integration debt from un-reconciled designs: the 8 docs are NOT one schema. Money unit, duplicate/conflicting enums, undefined booking states, table-name drift (app_user/profiles, booking/bookings, property_image/property_photos), and three staff models will surface as compile errors and RLS failures the moment they meet in one Supabase project. There is no canonical schema yet — produce one before coding M0.
- Payment reality: Chargily sandbox is doable, but Baridi has no API (manual only) and local webhook testing needs a public tunnel that is fragile in a live demo. The 'sandbox-tested webhooks' deliverable is currently only mocked. Risk of a payment flow that can't be shown working on defense day — pre-record a sandbox run as backup.
- RTL/i18n polish across three apps: Arabic-default with mirrored layouts, Arabic font, Saturday-week, bidi-isolated prices, and Expo's forceRTL+reloadAsync restart quirk is a large QA surface that is easy to leave half-done. Budget explicit RTL QA time; examiners will test the language toggle live.
- Time sinks underestimated: EAS native build (Mapbox is not Expo-Go-compatible), pgTAP RLS suite, type-gen CI gate, and webhook idempotency/reconciliation each consume days. Combined with the reconciliation work above, the M0–M7 plan is optimistic for one person; protect the MVP loop and treat M5–M7 as stretch.

