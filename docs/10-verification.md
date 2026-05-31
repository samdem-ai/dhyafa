# Canonical Spec — Verification

> Output of the adversarial verifier that checked `10-canonical-spec.md` against the 13 original contradictions and the 5 locked decisions.

**Verdict:** `clean`

## Locked decisions applied

| Decision | Applied |
|---|---|
| Full-platform scope | ✅ |
| Chargily-only v1 (Baridi deferred/reserved) | ✅ |
| Commission 10% in bps + per-host override | ✅ |
| 69 wilayas, data-driven | ✅ |
| Money = integer DZD | ✅ |

## Contradictions resolved

| Topic | Resolved | Note |
|---|---|---|
| money | ✅ | §1 + §6: every monetary column is integer with _dzd suffix and check(>=0); explicit bans 'No centimes, no *_minor, no bigint, no numeric rates for money'. Canonical money-name list enumerated (base_price_dzd ... net_dzd). Single decisive answer; kills data-model's *_minor bigint centimes. host_payout_dzd vs net_dzd are distinct columns (txn payout vs payout-aggregate), not a conflict. |
| enums | ✅ | §2: 'every create type appears exactly once, in migration 0002_enums. No subsystem re-declares a type.' payment_method defined once as ('edahabia','cib','baridi_qr'); single transaction_status (8 members), transaction_kind, payment_provider, hold_status. Resolves the duplicate/conflicting payment_method + txn_status CREATE TYPE collision. Volatile lists (notifications.type, amenities.category) intentionally text+check, stated explicitly — not a hedge. |
| booking-states | ✅ | §3: ONE booking_status enum (requested,declined,awaiting_payment,confirmed,checked_in,completed,cancelled,no_show,expired) + full transition table + legacy-term mapping (accepted→awaiting_payment, pending/pending_host→requested, pending_payment→awaiting_payment, payment_expired→expired) + mermaid. No leftover 'accepted'/'pending*' states in the enum or any table. Reception correctly limited to checked_in/completed/no_show (not accept/decline), matching auth-rls and resolving the reception-capability gap. |
| inventory | ✅ | §4.5 + §5: single inventory_holds TTL table; 'availability rows are never mutated for transient holds'; units_booked removed; effective_units formula given. Explicitly 'replaces the data-model advisory-lock + units_booked counter and the held-availability-span idea'. The pg_advisory_xact_lock in create_booking is used only to serialize the effective-availability check, not as a competing hold model — internally consistent. Single-unit exclusion constraint is a backstop, not a second model. |
| table-names | ✅ | §1 old→canonical mapping table is exhaustive (app_user→profiles, user_role_grant→user_roles, booking→bookings, property_image→property_photos, wilaya→wilayas, etc.). Convention fixed: plural snake_case. RLS §7 references only canonical plural names. No residual singular table references found in the spec. |
| commission | ✅ | §4.13 + §6: ONE representation — basis points integer. platform_settings.commission_bps default 1000 (10%) + nullable host_profiles.commission_bps_override; effective = coalesce(override, default), snapshotted to bookings.commission_bps and transactions.commission_bps. Explicit 'No commission_pct, no commission_ledger, no numeric rate'. Resolves 10%-vs-12% and bps-vs-numeric-vs-ledger three-way split; 10% confirmed. |
| cancellation | ✅ | §4.3 + §6: cancellation_policies table is 'Authoritative — drives the refund engine'; quote_refund() reads it; '(table-driven, no hardcoded constants)' and 'Editing cancellation_policies changes refund behavior immediately'. Enum-vs-FK reconciled by making cancellation_tier the enum PK of cancellation_policies and using it as the FK column on properties/bookings — one representation, not both. Seeds documented (flexible 24h, moderate 50%/120h, strict 0%), service fee non-refundable in all tiers. |
| staff | ✅ | §4.2 + §7: single hotel_staff scoped to host_profile_id (covers all that host's properties); staff_role enum('reception','manager'). Explicit 'the per-property and property_ids[] variants are dropped'. Single capability helper can_act_on_property(p_property_id, p_min_role). Resolves the three-way auth-rls(per-property) / host-experience(property_ids[]) / data-model(host_profile) split. Old 'owner' staff-role value correctly dropped (owner = host_profile.owner_id). |
| wishlists | ✅ | §4.10: wishlists + wishlist_items base tables (named lists, cover, default partial-unique). favorites is redefined as a compatibility VIEW over wishlist_items where is_default — not a competing base table. Heart-toggle semantics defined. Resolves the flat-favorite-vs-collections gap with wishlists as storage of record. |
| fonts | ✅ | §10: locked to Plus Jakarta Sans (Latin) + IBM Plex Sans Arabic, with Fraunces for display headlines; 'Inter, Roboto, Cairo, Tajawal, Arial, system-ui are BANNED'; single packages/design-tokens consumed by Expo + both Next apps. The 'or Cairo/Tajawal' hedge is explicitly corrected. Decisive, no competing alternatives. Minor: adds a third family (Fraunces) beyond the 00-decisions 'two families' wording — an expansion, not a hedge. |
| chargily-url | ✅ | §8: one shared constant CHARGILY_BASE in _shared/chargily.ts (pay.chargily.net/api/v2 live, /test/api/v2 test). Explicitly 'corrects the auth-rls api.chargily.com/v2 reference and the pay.chargily.dz host (that is only the hosted-checkout page domain ... never the API base)'. Single decisive source; resolves the three-hostname conflict. |
| geo-privacy | ✅ | §9 + §4.4: properties carries geo (exact) and geo_fuzzed (~400m, trigger-maintained). Public reads go through properties_public view that omits geo/lat/lng/address_line. Exact coords readable only via base-table SELECT policy requiring a caller booking in confirmed/checked_in/completed (or staff/reception). EXIF GPS stripped on upload. Closes the anon-leak; radius decided (platform_settings.geo_fuzz_meters=400). |
| audit-log | ✅ | §4.12: single audit_log, explicitly 'union of both proposals' — has actor_role/before/after/ip/user_agent/reason_code (admin) plus action/target_type/target_id/reason (auth-rls). Append-only, SECURITY DEFINER-only writes, reject trigger on update/delete. Absorbs old property_review_log via action 'listing.*' (also stated in §1 mapping). One canonical table. |

## Remaining issues

- MINOR/forward-ref: §11 says 'reserve availability.source' for v2 iCal sync, but the §4.5 availability table definition does NOT include a source column. Either add the reserved nullable column or drop the §11 mention; as written it references a column it didn't define.
- COSMETIC: §4.13 calls property_review_stats both 'non-materialized derived data' and 'MV (materialized view)' in the same sentence — contradictory terminology. The object is otherwise fully specified (columns + consumer), so it is not an undefined reference, just sloppy wording.
- COSMETIC: bookings.status column DEFAULT is 'awaiting_payment', but request-to-book bookings must enter at 'requested' (§3). Reconciled in practice because inserts are RPC-only (§5 step 5 sets status explicitly: instant_book ? awaiting_payment : requested), so the default is a dead fallback — worth aligning to avoid confusion.
- SCOPE-NOTE (not a contradiction): fonts were locked as 'two families' in 00-decisions but the canonical spec names three (adds Fraunces for display). It is a single decisive, non-competing stack, but technically broader than the locked wording — confirm Fraunces is intended.
- NON-CONTRADICTION carry-overs the spec intentionally leaves as v1 gaps (documented in §10/§11, consistent with locked decisions, NOT hedges): Chargily refunds + bank/CCP payouts are operator-driven in v1; phone OTP for +213 is best-effort with email as the hard gate; live webhook delivery needs a tunnel (pre-recorded run kept as backup); Chargily per-event id has a deterministic sha256 fallback if absent. All are decisively scoped, not left as competing definitions.

## Post-review resolution (2026-05-31)

The 3 concrete nits were fixed in `10-canonical-spec.md`; the rest are accepted as-is:

| # | Nit | Action |
|---|---|---|
| 1 | `availability.source` referenced by §11 but not defined | **Fixed** — added `source text not null default 'manual'` (reserved for v2 iCal/channel sync) to the `availability` table. |
| 2 | `property_review_stats` called both "non-materialized" and "MV" | **Fixed** — reworded to "materialized view" (it is the 6th MV, refreshed by `analytics-refresh`). |
| 3 | `bookings.status` default `awaiting_payment` is a dead fallback | **Fixed** — removed the column default; the booking RPC sets status explicitly (`awaiting_payment` instant-book / `requested` request-to-book). |
| 4 | Fonts: 3 families (Fraunces display + Plus Jakarta Sans body + IBM Plex Sans Arabic) vs "two families" wording | **Accepted** — a display + body + Arabic trio is the intended, correct pairing for the "Warm Mediterranean editorial" direction; the "two families" phrasing was imprecise. |
| 5 | v1 operator-driven gaps (Chargily refunds, CCP/bank payouts, phone OTP best-effort, webhook tunnel, event-id fallback) | **Accepted** — intentional, documented v1 scope, consistent with locked decisions. |

