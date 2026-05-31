# Build Milestones — MVP-first ordering for the full platform

> Scope is **full platform**, but the order is **vertical-MVP-first** so every milestone is independently demoable. If time runs short, stopping after **M3** still leaves a coherent defense (discover → book → pay → review, with host listing + admin approval). Source of truth for all schema/enum/RLS names: [`10-canonical-spec.md`](10-canonical-spec.md).

## Critical path

```
M0 Foundations ─► M1 Listing+Moderation ─► M2 Discovery+Booking+Payment ─► M3 Reviews+Msg+Notif
                                                                              │
                              M4 Host depth ◄───────────────────────────────┘
                                   │
                              M5 Hotel dashboard ─► M6 Admin depth ─► M7 Polish/RTL QA/merch
```

M0→M3 is the spec's MVP loop (§13). M4→M7 layers the rest (§14). Each milestone ends with a **demoable** state.

---

## M0 — Foundations *(no user-visible feature; everything depends on it)*
**Build**
- Monorepo: pnpm workspaces + Turborepo; `apps/customer` (Expo), `apps/admin` (Next.js), `apps/hotel` (Next.js); `packages/design-tokens`, `packages/types`, `packages/i18n`, `packages/api-client`; `supabase/` (migrations, seed, functions).
- Supabase project; migrations `0001_schema` + `0002_enums` + RLS policies + `set_updated_at()` / audit triggers. Generated TS types → `packages/types`.
- Seed: **69 wilayas** + communes, property types, amenities, cancellation policies, `platform_settings` (commission_bps=1000, geo_fuzz_meters=400), demo users for every role.
- `packages/design-tokens` (color/type/space/radii/shadow/motion) consumed by Tailwind (web) + an RN theme. Fonts: Fraunces (display) + Plus Jakarta Sans (body) + IBM Plex Sans Arabic.
- `packages/i18n`: i18next AR/FR/EN bundles + RTL plumbing (Expo `I18nManager.forceRTL` + `reloadAsync`; Next.js `dir="rtl"`). Language switcher persisted per user.
- Auth: email signup/login + role mapping (`profiles` + `user_roles`, JWT custom-claims hook).

**Exit criteria:** all three apps boot; a seeded user logs in; language toggles AR↔FR with layout mirroring; `supabase db reset` rebuilds schema+seed idempotently. → covers deliverables: shared backend+schema, RLS, design system + AR/FR/EN RTL (partial), seed data.

## M1 — Listing creation + admin moderation
**Build**
- Host mode (mobile) listing wizard: type → location map pin → photos (Storage upload, EXIF GPS stripped) → title/description (AR/FR/EN) → amenities → house rules → check-in/out → pricing → availability → cancellation tier → instant-book toggle → **submit (`draft`→`pending`)**.
- Admin dashboard (minimal): auth + **listing moderation queue** (approve → `approved`, reject → `rejected` with `rejection_reason`); writes `audit_log`; fires notification.

**Exit criteria:** a host submits a listing; admin approves; it becomes publicly queryable. → deliverable: listing approval flow, host mode (partial), admin (partial).

## M2 — Discovery + booking + payment *(the core loop)*
**Build**
- Customer: home rails + **search** (destination/dates/guests; filters: price/type/rating/amenities/free-cancel/instant-book; sort) + **List↔Map** with price pins + "search this area".
- Property detail: gallery (blur-up), amenities, house rules, reviews placeholder, availability calendar, room-type selection (hotels), **sticky booking widget** (price breakdown DZD). Geo shown fuzzed pre-booking.
- Booking: `create-booking` Edge Function (effective-availability re-check + advisory lock → `bookings` + `inventory_holds`, price snapshot); guest details/special requests; instant-book → `awaiting_payment`, request-to-book → `requested` → host accept.
- **Payment (Chargily sandbox):** `payments-create-checkout` Edge Function → hosted page (Edahabia/CIB) → `chargily-webhook` (signature verify + idempotent `webhook_events` dedupe) → txn `paid` → booking `confirmed` → hold captured. `expire_holds` cron.
- Trips list (Upcoming/Completed/Cancelled) + confirmation w/ reference.

**Exit criteria:** end-to-end **search → book → pay (sandbox) → confirmed → appears in Trips**, with a webhook flipping status. Pre-record this run as defense backup (webhook needs a public tunnel). → deliverables: customer app core, payments with sandbox-tested webhooks.

## M3 — Reviews + messaging + notifications
**Build**
- Reviews: prompt after `completed`; 6 category scores → `computed_overall`; one host reply (`review_replies`); report → admin. `property_review_stats` MV + denormalized `rating_avg`.
- Messaging: `conversations`/`messages` per booking, Realtime, RLS-authorized streams.
- Notifications: push (Expo) + in-app + email for booking/payment/message/review/check-in events; respects locale.

**Exit criteria:** completed booking → review visible on detail; guest↔host chat in realtime; notifications land. **← Defensible MVP stop-line.** → deliverables: reviews system, messaging, notifications.

## M4 — Host depth (mobile host mode)
**Build:** earnings (upcoming/paid payouts net of commission, per-booking breakdown), calendar (block/unblock, `price_override_dzd`, min/max stay), reservations (accept/decline/upcoming + guest details), reviews-received + respond, simple performance (views/bookings/occupancy). `payouts` data model populated.

**Exit criteria:** an individual host manages a live listing entirely from mobile. → deliverable: host mode (§7a) complete.

## M5 — Hotel web dashboard (Next.js)
**Build:** overview (today check-ins/outs, occupancy, revenue, pending actions); multi room-type management + per-type inventory; **rate & availability calendar with bulk edits** (`rate_plans`, seasonal/weekend, min-stay, close-outs across ranges); reservations list (filter/search, confirm/modify/cancel); messaging; reviews; analytics (occupancy, ADR, revenue, views→bookings, top room types); payouts (statements + commission breakdown); **staff accounts** (`hotel_staff`, reception vs manager via `can_act_on_property`).

**Exit criteria:** a hotel runs multi-room inventory + a scoped staff member acts within capability. → deliverable: hotel dashboard (§7b) complete.

## M6 — Admin depth
**Build:** KPI dashboard (GMV, commission revenue, active listings, new users, conversion; charts + time ranges backed by `mv_*`); user management (verify/suspend/ban + history); booking oversight (force-cancel/refund); payments/transactions + **payout management**; reviews moderation; **disputes** workflow (`disputes`/`dispute_messages`); CMS (property types, amenities, wilayas/communes, `featured_collections`/`collection_items`, `home_rails`, `promo_banners`); reports/export; audit-log viewer.

**Exit criteria:** admin can moderate, resolve a dispute, run a payout, and edit home merchandising. → deliverable: admin dashboard (§8) complete.

## M7 — Polish, RTL QA, merchandising, defense prep
**Build:** full RTL/i18n QA pass across all three apps (Arabic headings + dense UI, mirrored nav/icons/animation, bidi-isolated DZD prices, Saturday-first week); skeleton loaders + designed empty/error states everywhere; micro-interactions (favorite, booking confirm); map clustering; recently-viewed + price-drop favorites; loyalty/deals (nice-to-have); accessibility sweep (contrast, tap targets, focus, SR labels). Final demo seed + pre-recorded sandbox payment.

**Exit criteria:** anti-slop checklist (§12) green; demo script rehearsed. → deliverables: design system + full RTL complete; nice-to-haves as scope allows.

---

## Deferred to v2 (out of scope, by decision)
- **Baridi Pay automation** (no public Algérie Poste API; enum value `baridi_qr` reserved).
- **iCal / channel-manager sync** (`availability.source` + `ical_feeds` reserved).
- **Multi-room single booking** (`booking_groups` parent).
- Two-way reviews (host rates guest); multi-currency.

## Standing risk callouts
- **RTL is QA-heavy** — budget explicit time in M7; examiners will toggle language live.
- **Webhook tunnel is fragile** — keep the M2 pre-recorded sandbox run as backup.
- **EAS native build** needed for Mapbox (not Expo-Go compatible) — provision early in M2.
- **Phone OTP for +213** is best-effort; **email is the hard gate** for host go-live — don't let SMS block M1.
